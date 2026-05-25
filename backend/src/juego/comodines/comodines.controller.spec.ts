import { Test, TestingModule } from '@nestjs/testing';
import { ComodinesController } from './comodines.controller';
import { ComodinesService } from './comodines.service';

describe('ComodinesController', () => {
  let controller: ComodinesController;
  let service: ComodinesService;

  const mockComodinesService = {
    obtenerSugerenciaIa: jest.fn(),
    obtenerResultadosPublico: jest.fn(),
    seleccionarConsultorAleatorio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComodinesController],
      providers: [
        {
          provide: ComodinesService,
          useValue: mockComodinesService,
        },
      ],
    }).compile();

    controller = module.get<ComodinesController>(ComodinesController);
    service = module.get<ComodinesService>(ComodinesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('solicitarSugerenciaIa', () => {
    it('should call service.obtenerSugerenciaIa with correct params', async () => {
      const pregunta = '¿Cuál es la capital de Francia?';
      const expectedResult = { sugerencia: 'París' };
      mockComodinesService.obtenerSugerenciaIa.mockResolvedValue(expectedResult);

      const result = await controller.solicitarSugerenciaIa(pregunta);

      expect(service.obtenerSugerenciaIa).toHaveBeenCalledWith(pregunta);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('obtenerResultadosPublico', () => {
    it('should call service.obtenerResultadosPublico with correct params', async () => {
      const rondaId = 1;
      const preguntaId = 10;
      const expectedResult = { totalVotos: 10, resultados: { 1: 5, 2: 5 } };
      mockComodinesService.obtenerResultadosPublico.mockResolvedValue(expectedResult);

      const result = await controller.obtenerResultadosPublico(rondaId, preguntaId);

      expect(service.obtenerResultadosPublico).toHaveBeenCalledWith(rondaId, preguntaId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('seleccionarConsultor', () => {
    it('should call service.seleccionarConsultorAleatorio with correct params', async () => {
      const token = 'test-token';
      const expectedResult = { nickname: 'Consultor1' };
      mockComodinesService.seleccionarConsultorAleatorio.mockResolvedValue(expectedResult);

      const result = await controller.seleccionarConsultor(token);

      expect(service.seleccionarConsultorAleatorio).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedResult);
    });
  });
});
