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
    updateQuestionUseCase = module.get<UpdateQuestionUseCase>(
      UpdateQuestionUseCase,
    );
  });

  it('should call createUseCase', async () => {
    const dto = { nombre: 'Test' };
    const usuarioId = 1;
    await service.create(dto as any, usuarioId);
    expect(createUseCase.execute).toHaveBeenCalledWith(usuarioId, dto);
  });

  it('should call getAllUseCase', async () => {
    const usuarioId = 1;
    await service.findAll(usuarioId);
    expect(getAllUseCase.execute).toHaveBeenCalledWith(usuarioId);
  });

  it('should call getUseCase', async () => {
    const usuarioId = 1;
    await service.findOne(1, usuarioId);
    expect(getUseCase.execute).toHaveBeenCalledWith(1, usuarioId);
  });

  it('should call updateUseCase', async () => {
    const dto = { nombre: 'New' };
    const usuarioId = 1;
    await service.update(1, dto, usuarioId);
    expect(updateUseCase.execute).toHaveBeenCalledWith(1, dto, usuarioId);
  });

  it('should call addQuestionsUseCase', async () => {
    const questions = [{ texto: 'Q1' }];
    const usuarioId = 1;
    await service.crearPreguntas(1, questions, usuarioId);
    expect(addQuestionsUseCase.execute).toHaveBeenCalledWith(1, questions, usuarioId);
  });

  it('should call updateQuestionUseCase', async () => {
    const dto = { texto: 'Updated' };
    const usuarioId = 1;
    await service.updatePregunta(1, 1, dto as any, usuarioId);
    expect(updateQuestionUseCase.execute).toHaveBeenCalledWith(1, 1, dto, usuarioId);
  });
});
