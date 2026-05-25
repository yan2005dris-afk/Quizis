import { Test, TestingModule } from '@nestjs/testing';
import { JoinRoomUseCase } from './join-room.use-case';
import { CacheService } from '../../../infrastructure/cache/cache.service';

describe('JoinRoomUseCase', () => {
  let useCase: JoinRoomUseCase;
  let cache: CacheService;

  const mockCache = {
    addParticipantOnline: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRoomUseCase,
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<JoinRoomUseCase>(JoinRoomUseCase);
    cache = module.get<CacheService>(CacheService);
  });

  it('should register participant as online', async () => {
    const payload = {
      tokenCompartido: 'T1',
      nombre: 'User1',
      socketId: 'S1',
    };

    const result = await useCase.execute(payload);

    expect(result).toEqual({
      tokenCompartido: 'T1',
      nickname: 'User1',
    });
    expect(cache.addParticipantOnline).toHaveBeenCalledWith('T1', 'User1');
  });
});
