import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetSalaDetailsUseCase } from './get-sala-details.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheService } from 'src/juego/salas/cache/participants-cache.service';
import { RoomStateCacheService } from 'src/juego/salas/cache/room-state-cache.service';

describe('GetSalaDetailsUseCase', () => {
  let useCase: GetSalaDetailsUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
    preguntas: { findMany: jest.fn() },
    respuestasRonda: { findMany: jest.fn() },
  };

  const mockParticipantsCache = {
    getOnlineParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    getRoomEstado: jest.fn(),
  };

  const mockSala = {
    salaId: 1,
    adminId: 10,
    bancoId: 2,
    nombre: 'Sala Test',
    estado: 'BORRADOR',
    limitePreguntas: 10,
    tokenCompartido: 'token-abc',
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    participantes: [
      { participanteId: 1, nickname: 'Juan', rol: 'estudiante' },
      { participanteId: 2, nickname: 'Maria', rol: 'observador' },
    ],
    comodines: [
      {
        activo: true,
        comodin: {
          comodinId: 1,
          nombre: '50/50',
          descripcion: 'Elimina dos opciones',
          icono: '🎯',
        },
      },
    ],
    rondas: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSalaDetailsUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: RoomStateCacheService, useValue: mockRoomStateCache },
      ],
    }).compile();

    useCase = module.get<GetSalaDetailsUseCase>(GetSalaDetailsUseCase);
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.preguntas.findMany.mockResolvedValue([]);
    mockPrisma.respuestasRonda.findMany.mockResolvedValue([]);
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue([]);
    mockRoomStateCache.getRoomEstado.mockResolvedValue(null);
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
  });

  it('sala soft-deleted → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      ...mockSala,
      deletedAt: new Date(),
    });

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('busqueda por ID numérico usa salaId', async () => {
    await useCase.execute(1);

    expect(mockPrisma.salas.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { salaId: 1 } }),
    );
  });

  it('busqueda por token string usa tokenCompartido', async () => {
    await useCase.execute('token-abc');

    expect(mockPrisma.salas.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenCompartido: 'token-abc' } }),
    );
  });

  it('estado de Redis sobreescribe estado de DB', async () => {
    mockRoomStateCache.getRoomEstado.mockResolvedValue('ESPERANDO_ALUMNOS');

    const result = await useCase.execute(1);

    expect(result.estado).toBe('ESPERANDO_ALUMNOS');
  });

  it('usa estado de DB si Redis no tiene valor', async () => {
    mockRoomStateCache.getRoomEstado.mockResolvedValue(null);

    const result = await useCase.execute(1);

    expect(result.estado).toBe('BORRADOR');
  });

  it('isOnline se establece desde cache de participantes', async () => {
    mockParticipantsCache.getOnlineParticipants.mockResolvedValue(['Juan']);

    const result = await useCase.execute(1);

    const juan = result.participantes.find((p) => p.nickname === 'Juan');
    const maria = result.participantes.find((p) => p.nickname === 'Maria');
    expect(juan?.isOnline).toBe(true);
    expect(maria?.isOnline).toBe(false);
  });

  it('sin ronda activa → rondaActiva null', async () => {
    const result = await useCase.execute(1);

    expect(result.rondaActiva).toBeNull();
  });

  it('con ronda activa → historialPreguntas con opciones formateadas (A, B, C)', async () => {
    const salaConRonda = {
      ...mockSala,
      rondas: [
        {
          rondaId: 5,
          numeroRonda: 1,
          estado: 'jugando',
          fechaInicio: new Date('2024-01-01'),
          preguntaActualId: null,
          preguntasAsignadas: [101],
        },
      ],
    };
    mockPrisma.salas.findUnique.mockResolvedValue(salaConRonda);
    mockPrisma.preguntas.findMany.mockResolvedValue([
      {
        preguntaId: 101,
        texto: 'P1',
        nivel: 'facil',
        monto: 100,
        feedbackCorrecto: 'Bien',
        feedbackIncorrecto: 'Mal',
        opciones: [
          { opcionId: 1, texto: 'A', esCorrecta: true },
          { opcionId: 2, texto: 'B', esCorrecta: false },
          { opcionId: 3, texto: 'C', esCorrecta: false },
        ],
      },
    ]);

    const result = await useCase.execute(1);

    expect(result.rondaActiva).not.toBeNull();
    const p = result.rondaActiva!.historialPreguntas[0];
    expect(p.opciones[0].letra).toBe('A');
    expect(p.opciones[1].letra).toBe('B');
    expect(p.opciones[2].letra).toBe('C');
  });

  it('respuesta dada se incluye en historialPreguntas si existe', async () => {
    const salaConRonda = {
      ...mockSala,
      rondas: [
        {
          rondaId: 5,
          numeroRonda: 1,
          estado: 'jugando',
          fechaInicio: new Date(),
          preguntaActualId: null,
          preguntasAsignadas: [101],
        },
      ],
    };
    mockPrisma.salas.findUnique.mockResolvedValue(salaConRonda);
    mockPrisma.preguntas.findMany.mockResolvedValue([
      {
        preguntaId: 101,
        texto: 'P1',
        nivel: 'facil',
        monto: 100,
        feedbackCorrecto: 'Bien',
        feedbackIncorrecto: 'Mal',
        opciones: [{ opcionId: 1, texto: 'A', esCorrecta: true }],
      },
    ]);
    mockPrisma.respuestasRonda.findMany.mockResolvedValue([
      { preguntaId: 101, opcionId: 1, esCorrecta: true, rondaId: 5 },
    ]);

    const result = await useCase.execute(1);

    const p = result.rondaActiva!.historialPreguntas[0];
    expect(p.respuestaDada).toEqual({ opcionId: 1, esCorrecta: true });
  });

  it('retorna estructura base correcta de la sala', async () => {
    const result = await useCase.execute(1);

    expect(result).toMatchObject({
      salaId: 1,
      adminId: 10,
      bancoId: 2,
      nombre: 'Sala Test',
      totalParticipantes: 2,
    });
    expect(result.participantes).toHaveLength(2);
    expect(result.comodines).toHaveLength(1);
  });

  it('participantes soft-deleted excluidos (filtrado por Prisma where deletedAt: null)', async () => {
    // El filtro deletedAt: null se hace en Prisma — aquí verificamos que se pasa correctamente
    await useCase.execute(1);

    expect(mockPrisma.salas.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          participantes: expect.objectContaining({
            where: { deletedAt: null },
          }),
        }),
      }),
    );
  });
});
