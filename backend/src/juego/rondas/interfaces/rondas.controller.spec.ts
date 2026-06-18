import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RondasController } from './rondas.controller';
import { RondasService } from '../application/rondas.service';

describe('RondasController', () => {
  let controller: RondasController;
  let service: RondasService;

  const mockRondasService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RondasController],
      providers: [{ provide: RondasService, useValue: mockRondasService }],
    }).compile();

    controller = module.get<RondasController>(RondasController);
    service = module.get<RondasService>(RondasService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debería llamar a rondasService.create con el DTO', async () => {
      const dto = { salaId: 1, participanteId: 5, numeroRonda: 1 };
      const expectedRonda = {
        rondaId: 1,
        salaId: 1,
        participanteId: 5,
        numeroRonda: 1,
        estado: 'pendiente',
        preguntasAsignadas: [12, 45, 8],
      };

      mockRondasService.create.mockResolvedValue(expectedRonda);

      const result = await controller.create(dto);

      expect(result).toEqual(expectedRonda);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('debería propagar errores del servicio', async () => {
      const dto = { salaId: 999, participanteId: 1, numeroRonda: 1 };
      mockRondasService.create.mockRejectedValue(
        new Error('Sala no encontrada'),
      );

      await expect(controller.create(dto)).rejects.toThrow(
        'Sala no encontrada',
      );
    });
  });
});
