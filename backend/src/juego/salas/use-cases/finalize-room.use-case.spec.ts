import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinalizeRoomUseCase } from './finalize-room.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheUseCase } from 'src/infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { ChatCacheUseCase } from 'src/infrastructure/cache/use-cases/chat-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('FinalizeRoomUseCase', () => {
  let useCase: FinalizeRoomUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn(), update: jest.fn() },
    participantes: { upsert: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb: (tx: any) => unknown) =>
      cb({
        salas: { update: mockPrisma.salas.update },
        participantes: { upsert: mockPrisma.participantes.upsert },
      }),
    ),
  };

  const mockParticipantsCache = {
    getHistoricalParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    setRoomEnabled: jest.fn(),
    setRoomEstado: jest.fn(),
    getRoomEstado: jest.fn().mockResolvedValue(null),
  };

  const mockChatCache = {
    clearMessages: jest.fn(),
  };

  const mockSala = { salaId: 1, tokenCompartido: 'token-abc' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinalizeRoomUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParticipantsCacheUseCase, useValue: mockParticipantsCache },
        { provide: RoomStateCacheUseCase, useValue: mockRoomStateCache },
        { provide: ChatCacheUseCase, useValue: mockChatCache },
      ],
    }).compile();

    useCase = module.get<FinalizeRoomUseCase>(FinalizeRoomUseCase);
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.salas.update.mockResolvedValue(undefined);
    mockPrisma.participantes.upsert.mockResolvedValue(undefined);
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([
      'Juan',
      'Maria',
      'Host-Admin',
    ]);
    mockRoomStateCache.setRoomEnabled.mockResolvedValue(undefined);
    mockChatCache.clearMessages.mockResolvedValue(undefined);
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.participantes.upsert).not.toHaveBeenCalled();
  });

  it('happy path: persiste participantes reales y filtra Host-*', async () => {
    const result = await useCase.execute(1);

    expect(result.success).toBe(true);
    expect(mockPrisma.participantes.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.participantes.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ nickname: 'Host-Admin' }),
      }),
    );
  });

  it('retorna totalParticipantes correcto (excluye Host-*)', async () => {
    const result = await useCase.execute(1);

    expect(result.totalParticipantes).toBe(2);
  });

  it('estado en DB actualizado a FINALIZADO', async () => {
    await useCase.execute(1);

    expect(mockPrisma.salas.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: EstadoSala.FINALIZADO }),
      }),
    );
  });

  it('Redis: room deshabilitada en cache', async () => {
    await useCase.execute(1);

    expect(mockRoomStateCache.setRoomEnabled).toHaveBeenCalledWith(
      'token-abc',
      false,
    );
  });

  it('Redis: chat limpiado', async () => {
    await useCase.execute(1);

    expect(mockChatCache.clearMessages).toHaveBeenCalledWith('token-abc');
  });

  it('cache vacío → retorna 0 participantes, no llama upsert', async () => {
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([]);

    const result = await useCase.execute(1);

    expect(result.totalParticipantes).toBe(0);
    expect(mockPrisma.participantes.upsert).not.toHaveBeenCalled();
  });

  it('cache solo con Host-* → retorna 0 participantes reales', async () => {
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([
      'Host-Admin',
      'Host-Profesor',
    ]);

    const result = await useCase.execute(1);

    expect(result.totalParticipantes).toBe(0);
    expect(mockPrisma.participantes.upsert).not.toHaveBeenCalled();
  });
});
