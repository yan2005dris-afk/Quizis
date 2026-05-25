import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './use-cases/get-sala-details.use-case';
import { UpdateConfiguracionSalaUseCase } from './use-cases/update-configuracion-sala.use-case';
import { EstadoSala } from './dto/update-estado-sala.dto';

describe('SalasService', () => {
  let service: SalasService;
  let createSalaUseCase: CreateSalaUseCase;
  let updateEstadoSalaUseCase: UpdateEstadoSalaUseCase;
  let validateTokenSalaUseCase: ValidateTokenSalaUseCase;
  let listBancosDisponiblesUseCase: ListBancosDisponiblesUseCase;
  let getSalaDetailsUseCase: GetSalaDetailsUseCase;
  let updateConfiguracionSalaUseCase: UpdateConfiguracionSalaUseCase;

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

  const mockGetSalaDetailsUseCase = {
    execute: jest.fn(),
  };

  const mockUpdateConfiguracionSalaUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        {
          provide: GetSalaDetailsUseCase,
          useValue: mockGetSalaDetailsUseCase,
        },
        {
          provide: UpdateConfiguracionSalaUseCase,
          useValue: mockUpdateConfiguracionSalaUseCase,
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
    getSalaDetailsUseCase = module.get<GetSalaDetailsUseCase>(
      GetSalaDetailsUseCase,
    );
    updateConfiguracionSalaUseCase = module.get<UpdateConfiguracionSalaUseCase>(
      UpdateConfiguracionSalaUseCase,
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
      const expectedResult = {
        salaId: 1,
        nombre: 'Sala Test',
        estado: EstadoSala.BORRADOR,
      };

      mockValidateTokenSalaUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.validateToken(token);

      expect(result).toEqual(expectedResult);
      expect(validateTokenSalaUseCase.execute).toHaveBeenCalledWith(token);
      expect(validateTokenSalaUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('listBancosDisponibles', () => {
    it('debería delegar el listado al ListBancosDisponiblesUseCase', async () => {
      const expectedResult = [
        { bancoId: 1, nombre: 'Matemáticas', totalPreguntas: 5 },
      ];

      mockListBancosDisponiblesUseCase.execute.mockResolvedValue(
        expectedResult,
      );

      const result = await service.listBancosDisponibles();

      expect(result).toEqual(expectedResult);
      expect(listBancosDisponiblesUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('debería delegar la obtención de detalles al GetSalaDetailsUseCase', async () => {
      const expectedResult = {
        salaId: 1,
        nombre: 'Sala Test',
        estado: 'BORRADOR',
        comodines: [],
      };

      mockGetSalaDetailsUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.findOne(1);

      expect(result).toEqual(expectedResult);
      expect(getSalaDetailsUseCase.execute).toHaveBeenCalledWith(1);
      expect(getSalaDetailsUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateConfiguracion', () => {
    it('debería delegar la actualización de configuración al UpdateConfiguracionSalaUseCase', async () => {
      const updateDto = { nombre: 'Sala Editada', limitePreguntas: 12 };
      const expectedResult = {
        salaId: 1,
        nombre: 'Sala Editada',
        limitePreguntas: 12,
        comodines: [],
      };

      mockUpdateConfiguracionSalaUseCase.execute.mockResolvedValue(
        expectedResult,
      );

      const result = await service.updateConfiguracion(1, updateDto);

      expect(result).toEqual(expectedResult);
      expect(updateConfiguracionSalaUseCase.execute).toHaveBeenCalledWith(
        1,
        updateDto,
      );
      expect(updateConfiguracionSalaUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
