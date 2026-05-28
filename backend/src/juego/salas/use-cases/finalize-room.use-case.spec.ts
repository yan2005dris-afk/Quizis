import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinalizeRoomUseCase } from './finalize-room.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheUseCase } from 'src/infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from 'src/infrastructure/cache/use-cases/room-state-cache.use-case';
import { ChatCacheUseCase } from 'src/infrastructure/cache/use-cases/chat-cache.use-case';

describe('FinalizeRoomUseCase', () => {
  let useCase: FinalizeRoomUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn(), update: jest.fn() },
    participantes: { upsert: jest.fn() },
  };

  const mockParticipantsCache = { getHistoricalParticipants: jest.fn() };
  const mockRoomStateCache = { setRoomEnabled: jest.fn() };
  const mockChatCache = { clearMessages: jest.fn() };

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });

  it('should persist only real participants and skip Host- entries', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'token-1',
    });
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([
      'Host-admin',
      'Juan',
      'Maria',
    ]);
    mockPrisma.participantes.upsert.mockResolvedValue({});
    mockPrisma.salas.update.mockResolvedValue({});
    mockRoomStateCache.setRoomEnabled.mockResolvedValue(undefined);
    mockChatCache.clearMessages.mockResolvedValue(undefined);

    const result = await useCase.execute(1);

    expect(result.totalParticipantes).toBe(2);
    expect(mockPrisma.participantes.upsert).toHaveBeenCalledTimes(2);
    expect(mockRoomStateCache.setRoomEnabled).toHaveBeenCalledWith('token-1', false);
    expect(mockChatCache.clearMessages).toHaveBeenCalledWith('token-1');
  });
});
