import { Test, TestingModule } from '@nestjs/testing';
import { BancosService } from './bancos.service';
import { CreateBancoUseCase } from './use-cases/create-banco.use-case';
import { GetAllBancosUseCase } from './use-cases/get-all-bancos.use-case';
import { GetBancoUseCase } from './use-cases/get-banco.use-case';
import { UpdateBancoUseCase } from './use-cases/update-banco.use-case';
import { AddQuestionsUseCase } from './use-cases/add-questions.use-case';
import { UpdateQuestionUseCase } from './use-cases/update-question.use-case';

describe('BancosService', () => {
  let service: BancosService;
  let createUseCase: CreateBancoUseCase;
  let getAllUseCase: GetAllBancosUseCase;
  let getUseCase: GetBancoUseCase;
  let updateUseCase: UpdateBancoUseCase;
  let addQuestionsUseCase: AddQuestionsUseCase;
  let updateQuestionUseCase: UpdateQuestionUseCase;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BancosService,
        { provide: CreateBancoUseCase, useValue: mockUseCase },
        { provide: GetAllBancosUseCase, useValue: mockUseCase },
        { provide: GetBancoUseCase, useValue: mockUseCase },
        { provide: UpdateBancoUseCase, useValue: mockUseCase },
        { provide: AddQuestionsUseCase, useValue: mockUseCase },
        { provide: UpdateQuestionUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<BancosService>(BancosService);
    createUseCase = module.get<CreateBancoUseCase>(CreateBancoUseCase);
    getAllUseCase = module.get<GetAllBancosUseCase>(GetAllBancosUseCase);
    getUseCase = module.get<GetBancoUseCase>(GetBancoUseCase);
    updateUseCase = module.get<UpdateBancoUseCase>(UpdateBancoUseCase);
    addQuestionsUseCase = module.get<AddQuestionsUseCase>(AddQuestionsUseCase);
    updateQuestionUseCase = module.get<UpdateQuestionUseCase>(UpdateQuestionUseCase);
  });

  it('should call createUseCase', async () => {
    const dto = { nombre: 'Test' };
    await service.create(dto as any);
    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should call getAllUseCase', async () => {
    await service.findAll();
    expect(getAllUseCase.execute).toHaveBeenCalled();
  });

  it('should call getUseCase', async () => {
    await service.findOne(1);
    expect(getUseCase.execute).toHaveBeenCalledWith(1);
  });

  it('should call updateUseCase', async () => {
    const dto = { nombre: 'New' };
    await service.update(1, dto);
    expect(updateUseCase.execute).toHaveBeenCalledWith(1, dto);
  });

  it('should call addQuestionsUseCase', async () => {
    const questions = [{ texto: 'Q1' }];
    await service.crearPreguntas(1, questions);
    expect(addQuestionsUseCase.execute).toHaveBeenCalledWith(1, questions);
  });

  it('should call updateQuestionUseCase', async () => {
    const dto = { texto: 'Updated' };
    await service.updatePregunta(1, 1, dto as any);
    expect(updateQuestionUseCase.execute).toHaveBeenCalledWith(1, 1, dto);
  });
});
