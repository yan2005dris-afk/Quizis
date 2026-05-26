import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RondasService } from './rondas.service';
import { CreateRondaUseCase } from './use-cases/create-ronda.use-case';

describe('RondasService', () => {
  let service: RondasService;
  let createRondaUseCase: CreateRondaUseCase;

  const mockCreateRondaUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RondasService,
        { provide: CreateRondaUseCase, useValue: mockCreateRondaUseCase },
      ],
    }).compile();

    service = module.get<RondasService>(RondasService);
    createRondaUseCase = module.get<CreateRondaUseCase>(CreateRondaUseCase);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería delegar la creación al CreateRondaUseCase', async () => {
      const dto = { salaId: 1, participanteId: 5, numeroRonda: 1 };
      const expectedResult = {
        rondaId: 1,
        preguntasAsignadas: [12, 45, 8],
        estado: 'pendiente',
      };

      mockCreateRondaUseCase.execute.mockResolvedValue(expectedResult);

      const result = await service.create(dto);

      expect(result).toEqual(expectedResult);
      expect(createRondaUseCase.execute).toHaveBeenCalledWith(dto);
      expect(createRondaUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('debería propagar errores del UseCase', async () => {
      const dto = { salaId: 999, participanteId: 1, numeroRonda: 1 };
      mockCreateRondaUseCase.execute.mockRejectedValue(
        new Error('Sala no encontrada'),
      );

      await expect(service.create(dto)).rejects.toThrow('Sala no encontrada');
    });
  });
});
