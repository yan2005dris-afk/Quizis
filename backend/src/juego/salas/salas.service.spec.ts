import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { EstadoSala } from './dto/update-estado-sala.dto';

describe('SalasService', () => {
  let service: SalasService;
  let createSalaUseCase: CreateSalaUseCase;
  let updateEstadoSalaUseCase: UpdateEstadoSalaUseCase;
  let validateTokenSalaUseCase: ValidateTokenSalaUseCase;
  let listBancosDisponiblesUseCase: ListBancosDisponiblesUseCase;

  const mockCreateSalaUseCase = {
    execute: jest.fn(),
  };

  const mockUpdateEstadoSalaUseCase = {
    execute: jest.fn(),
  };

  const mockValidateTokenSalaUseCase = {
    execute: jest.fn(),
  };

  const mockListBancosDisponiblesUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: CreateSalaUseCase, useValue: mockCreateSalaUseCase },
        {
          provide: UpdateEstadoSalaUseCase,
          useValue: mockUpdateEstadoSalaUseCase,
        },
        {
          provide: ValidateTokenSalaUseCase,
          useValue: mockValidateTokenSalaUseCase,
        },
        {
          provide: ListBancosDisponiblesUseCase,
          useValue: mockListBancosDisponiblesUseCase,
        },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
    createSalaUseCase = module.get<CreateSalaUseCase>(CreateSalaUseCase);
    updateEstadoSalaUseCase = module.get<UpdateEstadoSalaUseCase>(
      UpdateEstadoSalaUseCase,
    );
    validateTokenSalaUseCase = module.get<ValidateTokenSalaUseCase>(
      ValidateTokenSalaUseCase,
    );
    listBancosDisponiblesUseCase = module.get<ListBancosDisponiblesUseCase>(
      ListBancosDisponiblesUseCase,
    );
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería delegar la creación al CreateSalaUseCase', async () => {
      const dto = { bancoId: 1, nombre: 'Test' };
      const adminId = 1;
      const expectedResult = { salaId: 1, tokenInvitacion: 'jwt-123' };

      mockCreateSalaUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.create(dto, adminId);

      expect(result).toEqual(expectedResult);
      expect(createSalaUseCase.execute).toHaveBeenCalledWith(dto, adminId);
      expect(createSalaUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateEstado', () => {
    it('debería delegar la actualización al UpdateEstadoSalaUseCase', async () => {
      const updateDto = { estado: EstadoSala.ESPERANDO_ALUMNOS };
      const expectedResult = {
        salaId: 1,
        estado: EstadoSala.ESPERANDO_ALUMNOS,
      };

      mockUpdateEstadoSalaUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.updateEstado(1, updateDto);

      expect(result).toEqual(expectedResult);
      expect(updateEstadoSalaUseCase.execute).toHaveBeenCalledWith(
        1,
        updateDto,
      );
      expect(updateEstadoSalaUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateToken', () => {
    it('debería delegar la validación al ValidateTokenSalaUseCase', async () => {
      const token = 'jwt-token-to-validate';
      const expectedResult = { salaId: 1, nombre: 'Sala Test', estado: EstadoSala.BORRADOR };

      mockValidateTokenSalaUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.validateToken(token);

      expect(result).toEqual(expectedResult);
      expect(validateTokenSalaUseCase.execute).toHaveBeenCalledWith(token);
      expect(validateTokenSalaUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('listBancosDisponibles', () => {
    it('debería delegar el listado al ListBancosDisponiblesUseCase', async () => {
      const expectedResult = [{ bancoId: 1, nombre: 'Matemáticas', totalPreguntas: 5 }];

      mockListBancosDisponiblesUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.listBancosDisponibles();

      expect(result).toEqual(expectedResult);
      expect(listBancosDisponiblesUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
