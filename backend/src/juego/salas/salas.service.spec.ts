import { Test, TestingModule } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaDetailUseCase } from './use-cases/get-sala-detail.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';

describe('SalasService', () => {
  let service: SalasService;
  let listAllUseCase: ListAllSalasUseCase;
  let getDetailUseCase: GetSalaDetailUseCase;
  let getLifelinesUseCase: GetSalaLifelinesUseCase;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: ListAllSalasUseCase, useValue: mockUseCase },
        { provide: GetSalaDetailUseCase, useValue: mockUseCase },
        { provide: GetSalaLifelinesUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
    listAllUseCase = module.get<ListAllSalasUseCase>(ListAllSalasUseCase);
    getDetailUseCase = module.get<GetSalaDetailUseCase>(GetSalaDetailUseCase);
    getLifelinesUseCase = module.get<GetSalaLifelinesUseCase>(GetSalaLifelinesUseCase);
  });

  it('should call listAllUseCase', async () => {
    await service.listarTodas();
    expect(listAllUseCase.execute).toHaveBeenCalled();
  });

  it('should call getDetailUseCase', async () => {
    await service.obtenerPorId(1);
    expect(getDetailUseCase.execute).toHaveBeenCalledWith(1);
  });

  it('should call getLifelinesUseCase', async () => {
    await service.obtenerComodines(1);
    expect(getLifelinesUseCase.execute).toHaveBeenCalledWith(1);
  });
});
