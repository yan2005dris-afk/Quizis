import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RestartRoundUseCase } from './restart-round.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { ParticipantsCacheUseCase } from 'src/infrastructure/cache/use-cases/participants-cache.use-case';

describe('RestartRoundUseCase', () => {
  let useCase: RestartRoundUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
    rondas: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    participantes: { findFirst: jest.fn(), upsert: jest.fn() },
    preguntas: { findMany: jest.fn() },
  };

  const mockRoomStateCache = {
    clearRoundState: jest.fn(),
    setRoomEstado: jest.fn(),
  };

  const mockParticipantsCache = {
    getHistoricalParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestartRoundUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RoomStateCacheUseCase, useValue: mockRoomStateCache },
        { provide: ParticipantsCacheUseCase, useValue: mockParticipantsCache },
      ],
    }).compile();

    useCase = module.get<RestartRoundUseCase>(RestartRoundUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if there are no participants', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'token-1',
      bancoId: 1,
      limitePreguntas: 5,
    });
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(null);
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([]);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
  });

  it('should close active round and create new one with incremented numero', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'token-1',
      bancoId: 1,
      limitePreguntas: 1,
    });
    mockPrisma.rondas.findFirst.mockResolvedValue({ rondaId: 5, numeroRonda: 2 });
    mockPrisma.rondas.update.mockResolvedValue({});
    mockPrisma.participantes.findFirst.mockResolvedValue({
      participanteId: 1,
      nickname: 'Juan',
      rol: 'estudiante',
    });
    mockPrisma.preguntas.findMany.mockResolvedValue([{
      preguntaId: 1,
      texto: '¿2+2?',
      nivel: 1,
      feedbackCorrecto: 'Bien',
      feedbackIncorrecto: 'Mal',
      opciones: [{ opcionId: 1, texto: '4', esCorrecta: true }],
    }]);
    mockPrisma.rondas.create.mockResolvedValue({
      rondaId: 6,
      numeroRonda: 3,
      estado: 'jugando',
      fechaInicio: new Date(),
    });
    mockRoomStateCache.clearRoundState.mockResolvedValue(undefined);
    mockRoomStateCache.setRoomEstado.mockResolvedValue(undefined);

    const result = await useCase.execute(1);

    expect(mockPrisma.rondas.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rondaId: 5 },
        data: expect.objectContaining({ estado: 'completado' }),
      }),
    );
    expect(mockPrisma.rondas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ numeroRonda: 3 }),
      }),
    );
    expect(result.estado).toBe('ESPERANDO_ALUMNOS');
    expect(result.rondaActiva.rondaId).toBe(6);
  });
});
