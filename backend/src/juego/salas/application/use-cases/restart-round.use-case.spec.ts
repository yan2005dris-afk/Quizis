import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RestartRoundUseCase } from './restart-round.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { RoomStateCacheService } from 'src/juego/shared/room-state/room-state-cache.service';
import { ParticipantsCacheService } from 'src/juego/shared/room-state/participants-cache.service';
import { GameEvents } from 'src/core/common/events/game-events.types';

describe('RestartRoundUseCase', () => {
  let useCase: RestartRoundUseCase;
  let eventEmitter: { emit: jest.Mock };

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

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockSala = {
    salaId: 1,
    tokenCompartido: 'token-abc',
    bancoId: 5,
    limitePreguntas: 3,
  };

  const mockParticipante = {
    participanteId: 10,
    salaId: 1,
    nickname: 'Juan',
    rol: 'estudiante',
    deletedAt: null,
  };

  const mockPreguntas = [
    {
      preguntaId: 1,
      texto: 'P1',
      nivel: 'facil',
      feedbackCorrecto: 'Bien',
      feedbackIncorrecto: 'Mal',
      opciones: [
        { opcionId: 1, texto: 'A', esCorrecta: true },
        { opcionId: 2, texto: 'B', esCorrecta: false },
      ],
    },
    {
      preguntaId: 2,
      texto: 'P2',
      nivel: 'medio',
      feedbackCorrecto: 'Bien',
      feedbackIncorrecto: 'Mal',
      opciones: [
        { opcionId: 3, texto: 'A', esCorrecta: false },
        { opcionId: 4, texto: 'B', esCorrecta: true },
      ],
    },
  ];

  const mockNewRound = {
    rondaId: 2,
    salaId: 1,
    numeroRonda: 2,
    estado: 'jugando',
    fechaInicio: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestartRoundUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RoomStateCacheService, useValue: mockRoomStateCache },
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<RestartRoundUseCase>(RestartRoundUseCase);
    eventEmitter = module.get(EventEmitter2);
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.preguntas.findMany.mockResolvedValue(mockPreguntas);
    mockPrisma.rondas.create.mockResolvedValue(mockNewRound);
    mockRoomStateCache.clearRoundState.mockResolvedValue(undefined);
    mockRoomStateCache.setRoomEstado.mockResolvedValue(undefined);
    mockEventEmitter.emit.mockReturnValue(undefined);
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.rondas.create).not.toHaveBeenCalled();
  });

  it('happy path: ronda activa existe → se cierra y se crea la siguiente', async () => {
    const currentRound = {
      rondaId: 1,
      salaId: 1,
      numeroRonda: 1,
      estado: 'jugando',
    };
    mockPrisma.rondas.findFirst.mockResolvedValue(currentRound);
    mockPrisma.rondas.update.mockResolvedValue(undefined);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    const result = await useCase.execute(1);

    expect(mockPrisma.rondas.update).toHaveBeenCalledWith({
      where: { rondaId: 1 },
      data: expect.objectContaining({ estado: 'completado' }),
    });
    expect(result.estado).toBe('ESPERANDO_ALUMNOS');
    expect(result.rondaActiva.rondaId).toBe(2);
    expect(result.rondaActiva.numeroRonda).toBe(2);
  });

  it('sin ronda activa → crea ronda 1 sin cerrar ninguna', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);
    mockPrisma.rondas.create.mockResolvedValue({
      ...mockNewRound,
      rondaId: 1,
      numeroRonda: 1,
    });

    await useCase.execute(1);

    expect(mockPrisma.rondas.update).not.toHaveBeenCalled();
    expect(mockPrisma.rondas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ numeroRonda: 1 }),
      }),
    );
  });

  it('selección de participante: prioriza rol estudiante', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    await useCase.execute(1);

    expect(mockPrisma.participantes.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rol: 'estudiante' }),
      }),
    );
    expect(mockPrisma.rondas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ participanteId: 10 }),
      }),
    );
  });

  it('fallback: sin estudiante → usa cualquier participante activo', async () => {
    const observador = { ...mockParticipante, rol: 'observador' };
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(observador);

    await useCase.execute(1);

    expect(mockPrisma.rondas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ participanteId: 10 }),
      }),
    );
  });

  it('fallback: sin participante en DB → busca en cache (excluye Host-*)', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(null);
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([
      'Host-Admin',
      'Carlos',
    ]);
    mockPrisma.participantes.upsert.mockResolvedValue({
      ...mockParticipante,
      nickname: 'Carlos',
    });

    await useCase.execute(1);

    expect(
      mockParticipantsCache.getHistoricalParticipants,
    ).toHaveBeenCalledWith('token-abc');
    expect(mockPrisma.participantes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ nickname: 'Carlos' }),
      }),
    );
  });

  it('sin participantes en ningún lado → BadRequestException', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(null);
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([]);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.rondas.create).not.toHaveBeenCalled();
  });

  it('banco sin preguntas → BadRequestException', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);
    mockPrisma.preguntas.findMany.mockResolvedValue([]);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.rondas.create).not.toHaveBeenCalled();
  });

  it('Redis cleanup: llama clearRoundState y setRoomEstado → ESPERANDO_ALUMNOS', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    await useCase.execute(1);

    expect(mockRoomStateCache.clearRoundState).toHaveBeenCalledWith(
      'token-abc',
    );
    expect(mockRoomStateCache.setRoomEstado).toHaveBeenCalledWith(
      'token-abc',
      'ESPERANDO_ALUMNOS',
    );
  });

  it('preguntas formateadas con letras A, B, C, D', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    const result = await useCase.execute(1);

    const primera = result.rondaActiva.historialPreguntas[0];
    expect(primera.opciones[0].letra).toBe('A');
    expect(primera.opciones[1].letra).toBe('B');
    expect(primera.respuestaDada).toBeNull();
    expect(primera.feedbackCorrecto).toBe('Bien');
  });

  it('limitePreguntas de la sala controla cuántas preguntas se cargan', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    await useCase.execute(1);

    expect(mockPrisma.preguntas.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: mockSala.limitePreguntas }),
    );
  });

  it('nueva ronda tiene preguntaActualId null y preguntaActual null', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    const result = await useCase.execute(1);

    expect(result.rondaActiva.preguntaActualId).toBeNull();
    expect(result.rondaActiva.preguntaActual).toBeNull();
  });

  // ─── Broadcast event ─────────────────────────────────────────────

  it('emite GameEvents.RONDAS.RONDA_REINICIADA con el tokenCompartido de la sala', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    await useCase.execute(1);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      GameEvents.RONDAS.RONDA_REINICIADA,
      expect.objectContaining({
        tokenCompartido: 'token-abc',
        estado: 'ESPERANDO_ALUMNOS',
      }),
    );
  });

  it('CRÍTICO: el payload del evento NO incluye esCorrecta en historialPreguntas', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);

    await useCase.execute(1);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    const [, payload] = mockEventEmitter.emit.mock.calls[0];

    // The use-case's HTTP return keeps esCorrecta (legitimate admin caller),
    // but the broadcast payload must strip it (security fix).
    payload.rondaActiva.historialPreguntas.forEach((p: any) => {
      p.opciones.forEach((o: any) => {
        expect(o.esCorrecta).toBeUndefined();
      });
    });
  });

  it('NO emite evento si la sala no existe', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('NO emite evento si no hay participantes', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(null);
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([]);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('NO emite evento si el banco no tiene preguntas', async () => {
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue(mockParticipante);
    mockPrisma.preguntas.findMany.mockResolvedValue([]);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
