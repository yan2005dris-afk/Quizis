import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinalizeRoomUseCase } from './finalize-room.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { ChatCacheUseCase } from '../../../infrastructure/cache/use-cases/chat-cache.use-case';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('FinalizeRoomUseCase', () => {
  let useCase: FinalizeRoomUseCase;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    participantes: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockParticipantsCache = {
    getHistoricalParticipants: jest.fn(),
  };

  const mockRoomStateCache = {
    setRoomEnabled: jest.fn(),
  };

  const mockChatCache = {
    clearMessages: jest.fn(),
  };

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

    // Default $transaction: execute callback
    mockPrisma.$transaction.mockImplementation(
      (cb: any) => cb(mockPrisma),
    );
  });

  it('should finalize a sala from EN_VIVO state', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      estado: EstadoSala.EN_VIVO,
    });
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue([
      'alice',
      'bob',
    ]);
    mockPrisma.participantes.upsert.mockResolvedValue({});

    const result = await useCase.execute(1);

    expect(result.success).toBe(true);
    expect(result.totalParticipantes).toBe(2);
    expect(mockPrisma.salas.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salaId: 1 },
        data: expect.objectContaining({
          estado: EstadoSala.FINALIZADO,
        }),
      }),
    );
    expect(mockRoomStateCache.setRoomEnabled).toHaveBeenCalledWith('TOKEN', false);
    expect(mockChatCache.clearMessages).toHaveBeenCalledWith('TOKEN');
  });

  it('should throw BadRequestException when sala is in BORRADOR state', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      estado: EstadoSala.BORRADOR,
    });

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when sala is already FINALIZADO (déjà-vu guard)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      estado: EstadoSala.FINALIZADO,
    });

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when sala is in ESPERANDO_ALUMNOS state', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });

    await expect(useCase.execute(1)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
  });

  it('should wrap mutations in $transaction', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      estado: EstadoSala.EN_VIVO,
    });
    mockParticipantsCache.getHistoricalParticipants.mockResolvedValue(['alice']);
    mockPrisma.participantes.upsert.mockResolvedValue({});

    await useCase.execute(1);

    // $transaction should have been called with a callback
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });
});
