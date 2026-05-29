import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { JoinSalaUseCase } from './join-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ValidateTokenSalaUseCase } from './validate-token-sala.use-case';

describe('JoinSalaUseCase', () => {
  let useCase: JoinSalaUseCase;

  const mockPrisma = {
    participantes: { upsert: jest.fn() },
  };

  const mockValidateToken = {
    execute: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockSalaInfo = {
    salaId: 1,
    nombre: 'Sala Test',
    tokenCompartido: 'token-abc',
  };

  const mockParticipante = {
    participanteId: 5,
    salaId: 1,
    nickname: 'Juan',
    rol: 'observador',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ValidateTokenSalaUseCase, useValue: mockValidateToken },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    useCase = module.get<JoinSalaUseCase>(JoinSalaUseCase);
    jest.clearAllMocks();

    mockValidateToken.execute.mockResolvedValue(mockSalaInfo);
    mockPrisma.participantes.upsert.mockResolvedValue(mockParticipante);
    mockJwtService.sign.mockReturnValue('session-jwt-token');
  });

  it('token inválido → excepción de ValidateTokenSalaUseCase', async () => {
    mockValidateToken.execute.mockRejectedValue(
      new UnauthorizedException('Token inválido'),
    );

    await expect(useCase.execute('bad-token', 'Juan')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPrisma.participantes.upsert).not.toHaveBeenCalled();
  });

  it('nuevo participante: upsert con rol observador por defecto', async () => {
    await useCase.execute('token-abc', 'Juan');

    expect(mockPrisma.participantes.upsert).toHaveBeenCalledWith({
      where: { salaId_nickname: { salaId: 1, nickname: 'Juan' } },
      create: { salaId: 1, nickname: 'Juan', rol: 'observador' },
      update: { deletedAt: null },
    });
  });

  it('participante que regresa: deletedAt null en el update', async () => {
    await useCase.execute('token-abc', 'Juan');

    expect(mockPrisma.participantes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { deletedAt: null },
      }),
    );
  });

  it('JWT generado con payload correcto (participanteId, salaId, nickname, rol)', async () => {
    await useCase.execute('token-abc', 'Juan');

    expect(mockJwtService.sign).toHaveBeenCalledWith(
      {
        participanteId: 5,
        salaId: 1,
        nickname: 'Juan',
        rol: 'observador',
      },
      expect.objectContaining({ expiresIn: '4h' }),
    );
  });

  it('retorna sessionToken, participante y sala', async () => {
    const result = await useCase.execute('token-abc', 'Juan');

    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe('session-jwt-token');
    expect(result.participante).toEqual({
      id: 5,
      nickname: 'Juan',
      rol: 'observador',
    });
    expect(result.sala).toEqual({
      id: 1,
      nombre: 'Sala Test',
      tokenCompartido: 'token-abc',
    });
  });

  it('usa clave compuesta salaId_nickname en el upsert', async () => {
    await useCase.execute('token-abc', 'Maria');

    expect(mockPrisma.participantes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salaId_nickname: { salaId: 1, nickname: 'Maria' } },
      }),
    );
  });
});
