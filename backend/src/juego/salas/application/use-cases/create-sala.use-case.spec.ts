import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateSalaUseCase } from './create-sala.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { EstadoSala } from '../../interfaces/dto/update-estado-sala.dto';

describe('CreateSalaUseCase', () => {
  let useCase: CreateSalaUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    bancoPreguntas: {
      findUnique: jest.fn(),
    },
    preguntas: {
      findMany: jest.fn(),
    },
    salas: {
      create: jest.fn(),
    },
    comodines: {
      findMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<CreateSalaUseCase>(CreateSalaUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();

    // Default configuration mocks
    mockConfigService.getOrThrow.mockReturnValue('room-secret-key');
    mockConfigService.get.mockReturnValue('24h');
    mockPrisma.comodines.findMany.mockResolvedValue([
      { comodinId: 1 },
      { comodinId: 2 },
    ]);
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería crear una sala exitosamente con token JWT de invitación y preguntas al azar', async () => {
    const dto = { bancoId: 1, nombre: 'Clase de Calidad', limitePreguntas: 2 };
    const adminId = 1;

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 101 },
      { preguntaId: 102 },
      { preguntaId: 103 },
    ]);
    mockPrisma.salas.create.mockResolvedValue({
      salaId: 1,
      adminId: 1,
      bancoId: 1,
      nombre: 'Clase de Calidad',
      tokenCompartido: 'uuid-1234',
      limitePreguntas: 2,
      estado: EstadoSala.BORRADOR,
    });

    mockJwtService.signAsync.mockResolvedValue('jwt-invite-token');
    mockJwtService.decode.mockReturnValue({ exp: 1716584000 });

    const result = await useCase.execute(dto, adminId);

    expect(result.salaId).toBe(1);
    expect(result.tokenCompartido).toBe('uuid-1234');
    expect(result.tokenInvitacion).toBe('jwt-invite-token');
    expect(result.invitacionUrl).toBe('/room/jwt-invite-token');
    expect(result.preguntasSeleccionadas.length).toBe(2);
    expect(prisma.bancoPreguntas.findUnique).toHaveBeenCalledWith({
      where: { bancoId: 1 },
    });
    expect(prisma.preguntas.findMany).toHaveBeenCalledWith({
      where: { bancoId: 1, deletedAt: null },
      select: { preguntaId: true },
    });
  });

  it('debería usar limitePreguntas por defecto (15) si no se envía', async () => {
    const dto = { bancoId: 1, nombre: 'Sin límite explícito' };
    const adminId = 1;

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    // Mock enough questions (at least 15)
    const questions = Array.from({ length: 20 }, (_, i) => ({
      preguntaId: i + 1,
    }));
    mockPrisma.preguntas.findMany.mockResolvedValue(questions);

    mockPrisma.salas.create.mockResolvedValue({
      salaId: 2,
      limitePreguntas: 15,
      estado: EstadoSala.BORRADOR,
    });

    mockJwtService.signAsync.mockResolvedValue('jwt-token-15');
    mockJwtService.decode.mockReturnValue({ exp: 1716584000 });

    await useCase.execute(dto, adminId);

    expect(prisma.salas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ limitePreguntas: 15 }),
      }),
    );
  });

  it('debería lanzar NotFoundException si el banco no existe', async () => {
    const dto = { bancoId: 999, nombre: 'Banco inexistente' };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(dto, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.salas.create).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException si el banco no tiene suficientes preguntas', async () => {
    const dto = { bancoId: 1, nombre: 'Pocas preguntas', limitePreguntas: 10 };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 1 },
      { preguntaId: 2 },
    ]); // Only 2 questions, but 10 requested

    await expect(useCase.execute(dto, 1)).rejects.toThrow(BadRequestException);
    expect(prisma.salas.create).not.toHaveBeenCalled();
  });

  it('debería reintentar si hay colisión de tokenCompartido (P2002)', async () => {
    const dto = { bancoId: 1, nombre: 'Test colisión', limitePreguntas: 2 };
    const adminId = 1;
    const p2002Error = {
      code: 'P2002',
      meta: { target: ['token_compartido'] },
    };

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 1 },
      { preguntaId: 2 },
    ]);
    // Primera llamada falla con P2002, segunda tiene éxito
    mockPrisma.salas.create
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        salaId: 3,
        tokenCompartido: 'uuid-success',
        estado: EstadoSala.BORRADOR,
      });

    mockJwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await useCase.execute(dto, adminId);

    expect(result.salaId).toBe(3);
    expect(prisma.salas.create).toHaveBeenCalledTimes(2);
  });

  it('debería lanzar error si se agotan los reintentos de creación por colisión', async () => {
    const dto = { bancoId: 1, nombre: 'Test agotamiento', limitePreguntas: 2 };
    const p2002Error = {
      code: 'P2002',
      meta: { target: ['token_compartido'] },
    };

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 1 },
      { preguntaId: 2 },
    ]);
    // Simular 10 colisiones consecutivas
    mockPrisma.salas.create.mockRejectedValue(p2002Error);

    await expect(useCase.execute(dto, 1)).rejects.toThrow(
      'No se pudo generar un token único para la sala después de varios intentos',
    );
    expect(prisma.salas.create).toHaveBeenCalledTimes(10);
  });

  it('debería re-lanzar errores no relacionados con P2002', async () => {
    const dto = {
      bancoId: 1,
      nombre: 'Test error genérico',
      limitePreguntas: 2,
    };
    const genericError = new Error('Connection refused');

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 1 },
      { preguntaId: 2 },
    ]);
    mockPrisma.salas.create.mockRejectedValue(genericError);

    await expect(useCase.execute(dto, 1)).rejects.toThrow('Connection refused');
    expect(prisma.salas.create).toHaveBeenCalledTimes(1);
  });
});
