import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ValidateTokenSalaUseCase } from './validate-token-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('ValidateTokenSalaUseCase', () => {
  let useCase: ValidateTokenSalaUseCase;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateTokenSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<ValidateTokenSalaUseCase>(ValidateTokenSalaUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();

    mockConfigService.getOrThrow.mockReturnValue('room-secret-key');
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería retornar datos de la sala si el token es completamente válido', async () => {
    const token = 'valid-jwt-token';
    const payload = {
      sub: 'uuid-1234',
      salaId: 1,
      tipo: 'room_invite',
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Test',
      estado: EstadoSala.BORRADOR,
      tokenCompartido: 'uuid-1234',
      limitePreguntas: 15,
      createdAt: new Date(),
      deletedAt: null,
    });

    const result = await useCase.execute(token);

    expect(result).toEqual({
      salaId: 1,
      nombre: 'Sala Test',
      estado: EstadoSala.BORRADOR,
      limitePreguntas: 15,
      tokenCompartido: 'uuid-1234',
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
      secret: 'room-secret-key',
    });
    expect(prisma.salas.findUnique).toHaveBeenCalledWith({
      where: { tokenCompartido: 'uuid-1234' },
      select: {
        salaId: true,
        nombre: true,
        estado: true,
        tokenCompartido: true,
        limitePreguntas: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  });

  it('debería lanzar BadRequestException si la firma del JWT es inválida o expiró', async () => {
    const token = 'invalid-jwt-token';
    mockJwtService.verifyAsync.mockRejectedValue(
      new Error('Invalid signature'),
    );

    await expect(useCase.execute(token)).rejects.toThrow(BadRequestException);
    expect(prisma.salas.findUnique).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException si el tipo de token no es room_invite', async () => {
    const token = 'wrong-type-jwt-token';
    const payload = {
      sub: 'uuid-1234',
      salaId: 1,
      tipo: 'access_token', // wrong type
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);

    await expect(useCase.execute(token)).rejects.toThrow(
      'El token proporcionado no es un token de invitación a sala',
    );
    expect(prisma.salas.findUnique).not.toHaveBeenCalled();
  });

  it('debería lanzar NotFoundException si la sala no existe en BD', async () => {
    const token = 'valid-jwt-token';
    const payload = {
      sub: 'uuid-not-found',
      salaId: 1,
      tipo: 'room_invite',
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(token)).rejects.toThrow(NotFoundException);
  });

  it('debería lanzar NotFoundException si la sala está borrada (soft delete)', async () => {
    const token = 'valid-jwt-token';
    const payload = {
      sub: 'uuid-deleted',
      salaId: 1,
      tipo: 'room_invite',
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Borrada',
      estado: EstadoSala.BORRADOR,
      tokenCompartido: 'uuid-deleted',
      deletedAt: new Date(), // deleted
    });

    await expect(useCase.execute(token)).rejects.toThrow(NotFoundException);
  });

  it('debería lanzar BadRequestException si la sala ya está FINALIZADO', async () => {
    const token = 'valid-jwt-token';
    const payload = {
      sub: 'uuid-finished',
      salaId: 1,
      tipo: 'room_invite',
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);
    // Note: FINALIZADO rooms now allow access — admin can view reports
    // The frontend's `salaHabilitada` flag prevents new interactions
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Finalizada',
      estado: EstadoSala.FINALIZADO, // finished
      tokenCompartido: 'uuid-finished',
      deletedAt: null,
    });

    const result = await useCase.execute(token);
    expect(result.estado).toBe(EstadoSala.FINALIZADO);
  });
});
