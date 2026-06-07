import { Test, TestingModule } from '@nestjs/testing';
import { SelectRandomConsultantUseCase } from './select-random-consultant.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ParticipantsCacheService } from '../../salas/cache/participants-cache.service';

describe('SelectRandomConsultantUseCase', () => {
  let useCase: SelectRandomConsultantUseCase;

  const mockPrismaService = {
    rondas: {
      findFirst: jest.fn(),
    },
    participantes: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    getOnlineParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SelectRandomConsultantUseCase,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ParticipantsCacheService, useValue: mockCacheService },
      ],
    }).compile();

    useCase = module.get<SelectRandomConsultantUseCase>(
      SelectRandomConsultantUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return null if no active round is found', async () => {
    mockPrismaService.rondas.findFirst.mockResolvedValue(null);

    const result = await useCase.execute('token');

    expect(result).toBeNull();
  });

  it('should return null if no online candidates are found', async () => {
    const mockRonda = {
      id: 1,
      salaId: 10,
      participante: { nickname: 'Player1' },
    };
    mockPrismaService.rondas.findFirst.mockResolvedValue(mockRonda);
    mockPrismaService.participantes.findMany.mockResolvedValue([
      { nickname: 'Player2' },
      { nickname: 'Player3' },
    ]);
    mockCacheService.getOnlineParticipants.mockResolvedValue([]); // No one online

    const result = await useCase.execute('token');

    expect(result).toBeNull();
  });

  it('should return a random online candidate', async () => {
    const mockRonda = {
      id: 1,
      salaId: 10,
      participante: { nickname: 'Player1' },
    };
    const mockCandidatos = [{ nickname: 'Player2' }, { nickname: 'Player3' }];
    mockPrismaService.rondas.findFirst.mockResolvedValue(mockRonda);
    mockPrismaService.participantes.findMany.mockResolvedValue(mockCandidatos);
    mockCacheService.getOnlineParticipants.mockResolvedValue(['Player2']); // Only Player2 is online

    const result = await useCase.execute('token');

    expect(result).toEqual({ nickname: 'Player2' });
  });

  it('should handle empty candidate list from database', async () => {
    const mockRonda = {
      id: 1,
      salaId: 10,
      participante: { nickname: 'Player1' },
    };
    mockPrismaService.rondas.findFirst.mockResolvedValue(mockRonda);
    mockPrismaService.participantes.findMany.mockResolvedValue([]);
    mockCacheService.getOnlineParticipants.mockResolvedValue(['Player2']);

    const result = await useCase.execute('token');

    expect(result).toBeNull();
  });
});
