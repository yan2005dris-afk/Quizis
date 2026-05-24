import { Test, TestingModule } from '@nestjs/testing';
import { RondasService } from './rondas.service';
import { InitRondaUseCase } from './use-cases/init-ronda.use-case';

describe('RondasService', () => {
  let service: RondasService;
  let useCase: InitRondaUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RondasService,
        {
          provide: InitRondaUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RondasService>(RondasService);
    useCase = module.get<InitRondaUseCase>(InitRondaUseCase);
  });

  it('should call InitRondaUseCase', async () => {
    const salaId = 1;
    const participanteId = 1;
    (useCase.execute as jest.Mock).mockResolvedValue({ ronda: {} });

    await service.initRonda(salaId, participanteId);
    expect(useCase.execute).toHaveBeenCalledWith(salaId, participanteId);
  });
});
