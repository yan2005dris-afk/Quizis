import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FinalizeRoomUseCase } from './finalize-room.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { ParticipantsCacheService } from 'src/juego/shared/room-state/participants-cache.service';
import { RoomStateCacheService } from 'src/juego/shared/room-state/room-state-cache.service';
import { ChatCacheService } from 'src/juego/chat/infrastructure/cache/chat-cache.service';
import { EstadoSala } from '../../interfaces/dto/update-estado-sala.dto';

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
        { provide: ParticipantsCacheService, useValue: mockParticipantsCache },
        { provide: RoomStateCacheService, useValue: mockRoomStateCache },
        { provide: ChatCacheService, useValue: mockChatCache },
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

  it('doble finalización → BadRequestException', async () => {
    mockRoomStateCache.getRoomEstado.mockResolvedValue(EstadoSala.FINALIZADO);

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
