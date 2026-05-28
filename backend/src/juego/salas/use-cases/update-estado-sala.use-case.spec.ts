import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateEstadoSalaUseCase } from './update-estado-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { ParticipantsCacheUseCase } from 'src/infrastructure/cache/use-cases/participants-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('UpdateEstadoSalaUseCase', () => {
  let useCase: UpdateEstadoSalaUseCase;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    preguntas: { findMany: jest.fn() },
    participantes: { findFirst: jest.fn(), upsert: jest.fn(), count: jest.fn() },
    rondas: { findFirst: jest.fn(), create: jest.fn() },
  };

  const mockRoomStateCache = {
    getRoomEstado: jest.fn().mockResolvedValue(undefined),
    setRoomEstado: jest.fn().mockResolvedValue(undefined),
  };

  const mockParticipantsCache = {
    getHistoricalParticipants: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEstadoSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RoomStateCacheUseCase, useValue: mockRoomStateCache },
        { provide: ParticipantsCacheUseCase, useValue: mockParticipantsCache },
      ],
    }).compile();

    useCase = module.get<UpdateEstadoSalaUseCase>(UpdateEstadoSalaUseCase);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería transicionar de BORRADOR a ESPERANDO_ALUMNOS', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.BORRADOR,
    });

    const result = await useCase.execute(1, {
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });

    expect(result.estado).toBe(EstadoSala.ESPERANDO_ALUMNOS);
    expect(mockRoomStateCache.setRoomEstado).toHaveBeenCalledWith(
      'T1',
      EstadoSala.ESPERANDO_ALUMNOS,
    );
  });

  it('debería transicionar de ESPERANDO_ALUMNOS a EN_VIVO con estudiantes y crear ronda', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      bancoId: 10,
      limitePreguntas: 5,
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });
    mockPrisma.participantes.count.mockResolvedValue(2);
    // ensureRondaActiva mocks
    mockPrisma.rondas.findFirst.mockResolvedValue(null);
    mockPrisma.participantes.findFirst.mockResolvedValue({
      participanteId: 1,
      nickname: 'TestStudent',
    });
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 1 }, { preguntaId: 2 }, { preguntaId: 3 },
    ]);
    mockPrisma.rondas.create.mockResolvedValue({ rondaId: 1 });

    const result = await useCase.execute(1, { estado: EstadoSala.EN_VIVO });

    expect(result.estado).toBe(EstadoSala.EN_VIVO);
    expect(mockRoomStateCache.setRoomEstado).toHaveBeenCalledWith(
      'T1',
      EstadoSala.EN_VIVO,
    );
    // ensureRondaActiva restored — creates round with questions
    expect(mockPrisma.rondas.findFirst).toHaveBeenCalled();
    expect(mockPrisma.preguntas.findMany).toHaveBeenCalled();
    expect(mockPrisma.rondas.create).toHaveBeenCalled();
  });

  it('debería rechazar EN_VIVO cuando no hay estudiantes (EN_VIVO guard)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });
    mockPrisma.participantes.count.mockResolvedValue(0);

    await expect(
      useCase.execute(1, { estado: EstadoSala.EN_VIVO }),
    ).rejects.toThrow(BadRequestException);

    expect(mockRoomStateCache.setRoomEstado).not.toHaveBeenCalled();
  });

  it('debería transicionar de EN_VIVO a FINALIZADO', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.EN_VIVO,
    });

    const result = await useCase.execute(1, { estado: EstadoSala.FINALIZADO });

    expect(result.estado).toBe(EstadoSala.FINALIZADO);
    expect(mockRoomStateCache.setRoomEstado).toHaveBeenCalledWith(
      'T1',
      EstadoSala.FINALIZADO,
    );
  });

  it('debería permitir retroceder de ESPERANDO_ALUMNOS a BORRADOR', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });

    const result = await useCase.execute(1, { estado: EstadoSala.BORRADOR });

    expect(result.estado).toBe(EstadoSala.BORRADOR);
    expect(mockRoomStateCache.setRoomEstado).toHaveBeenCalledWith(
      'T1',
      EstadoSala.BORRADOR,
    );
  });

  it('debería lanzar BadRequestException para transición inválida (BORRADOR → EN_VIVO)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.BORRADOR,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.EN_VIVO }),
    ).rejects.toThrow(BadRequestException);

    expect(mockRoomStateCache.setRoomEstado).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException para transición inválida (BORRADOR → FINALIZADO)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.BORRADOR,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.FINALIZADO }),
    ).rejects.toThrow(BadRequestException);

    expect(mockRoomStateCache.setRoomEstado).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException si FINALIZADO intenta transicionar a cualquier estado', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'T1',
      estado: EstadoSala.FINALIZADO,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.BORRADOR }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute(1, { estado: EstadoSala.EN_VIVO }),
    ).rejects.toThrow(BadRequestException);

    expect(mockRoomStateCache.setRoomEstado).not.toHaveBeenCalled();
  });

  it('debería lanzar NotFoundException si la sala no existe', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute(999, { estado: EstadoSala.ESPERANDO_ALUMNOS }),
    ).rejects.toThrow(NotFoundException);

    expect(mockRoomStateCache.setRoomEstado).not.toHaveBeenCalled();
  });
});
