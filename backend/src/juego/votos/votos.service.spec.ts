import { Test, TestingModule } from '@nestjs/testing';
import { VotosService } from './votos.service';
import { RegisterVoteUseCase } from './use-cases/register-vote.use-case';
import { GetVotesFromCacheUseCase } from './use-cases/get-votes-from-cache.use-case';
import { PersistVotesUseCase } from './use-cases/persist-votes.use-case';

describe('VotosService', () => {
  let service: VotosService;
  let registerUseCase: RegisterVoteUseCase;
  let getVotesUseCase: GetVotesFromCacheUseCase;
  let persistUseCase: PersistVotesUseCase;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotosService,
        { provide: RegisterVoteUseCase, useValue: mockUseCase },
        { provide: GetVotesFromCacheUseCase, useValue: mockUseCase },
        { provide: PersistVotesUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<VotosService>(VotosService);
    registerUseCase = module.get<RegisterVoteUseCase>(RegisterVoteUseCase);
    getVotesUseCase = module.get<GetVotesFromCacheUseCase>(GetVotesFromCacheUseCase);
    persistUseCase = module.get<PersistVotesUseCase>(PersistVotesUseCase);
  });

  it('should call registerUseCase', async () => {
    await service.registrarVoto(1, 2, 3, 4);
    expect(registerUseCase.execute).toHaveBeenCalledWith(1, 2, 3, 4);
  });

  it('should call getVotesUseCase', async () => {
    await service.obtenerVotosCache(1, 2);
    expect(getVotesUseCase.execute).toHaveBeenCalledWith(1, 2);
  });

  it('should call persistUseCase', async () => {
    await service.persistirVotos(1, 2);
    expect(persistUseCase.execute).toHaveBeenCalledWith(1, 2);
  });
});
