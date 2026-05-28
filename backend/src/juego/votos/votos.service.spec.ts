import { Test, TestingModule } from '@nestjs/testing';
import { VotosService } from './votos.service';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';

describe('VotosService', () => {
  let service: VotosService;
  const mockRegisterUseCase = {
    execute: jest.fn(),
  };

  const mockGetVotesUseCase = {
    execute: jest.fn(),
  };

  const mockPersistUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotosService,
        {
          provide: RegisterVoteUseCase,
          useValue: mockRegisterUseCase,
        },
        {
          provide: GetVotesFromCacheUseCase,
          useValue: mockGetVotesUseCase,
        },
        {
          provide: PersistVotesUseCase,
          useValue: mockPersistUseCase,
        },
      ],
    }).compile();

    service = module.get<VotosService>(VotosService);

    jest.clearAllMocks();
  });

  describe('registrarVoto', () => {
    it('should call RegisterVoteUseCase with correct params', async () => {
      await service.registrarVoto(1, 2, 3, 4);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith(1, 2, 3, 4);

      expect(mockRegisterUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('obtenerVotosCache', () => {
    it('should call GetVotesFromCacheUseCase', async () => {
      await service.obtenerVotosCache(1, 2);

      expect(mockGetVotesUseCase.execute).toHaveBeenCalledWith(1, 2);

      expect(mockGetVotesUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistirVotos', () => {
    it('should call PersistVotesUseCase', async () => {
      await service.persistirVotos(1, 2);

      expect(mockPersistUseCase.execute).toHaveBeenCalledWith(1, 2);

      expect(mockPersistUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
