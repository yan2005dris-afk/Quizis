import { Test, TestingModule } from '@nestjs/testing';
import { JoinRoomUseCase } from './join-room.use-case';
import { ParticipantsCacheUseCase } from '../../../infrastructure/cache/use-cases/participants-cache.use-case';

describe('JoinRoomUseCase', () => {
  let useCase: JoinRoomUseCase;
  let cache: ParticipantsCacheUseCase;

  const mockCache = {
    addParticipantOnline: jest.fn(),
    getOnlineParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRoomUseCase,
        { provide: ParticipantsCacheUseCase, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<JoinRoomUseCase>(JoinRoomUseCase);
    cache = module.get<ParticipantsCacheUseCase>(ParticipantsCacheUseCase);
  });

  it('should register participant as online', async () => {
    const payload = {
      tokenCompartido: 'T1',
      nombre: 'User1',
      socketId: 'S1',
    };

    mockCache.getOnlineParticipants.mockResolvedValue(['User1']);
    const result = await useCase.execute(payload);

    expect(result).toEqual({
      tokenCompartido: 'T1',
      nickname: 'User1',
      participants: ['User1'],
    });
    expect(cache.addParticipantOnline).toHaveBeenCalledWith('T1', 'User1');
  });
});
