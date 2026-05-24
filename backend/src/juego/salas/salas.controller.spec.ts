import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';

describe('SalasController', () => {
  let controller: SalasController;

  const mockSalasService = {
    listarTodas: jest.fn().mockResolvedValue([
      {
        salaId: 1,
        nombre: 'Sala 1',
        estado: 'jugando',
        participantes: 5,
        creadoEn: new Date().toISOString(),
      },
    ]),
    obtenerPorId: jest.fn().mockResolvedValue({
      salaId: 1,
      nombre: 'Sala 1',
      estado: 'jugando',
      participantes: [],
      rondaActiva: null,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalasController],
      providers: [
        {
          provide: SalasService,
          useValue: mockSalasService,
        },
      ],
    }).compile();

    controller = module.get<SalasController>(SalasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listarTodas', () => {
    it('debe retornar un listado de salas', async () => {
      const result = await controller.listarTodas();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('salaId');
      expect(result[0]).toHaveProperty('nombre');
      expect(result[0]).toHaveProperty('estado');
      expect(result[0]).toHaveProperty('participantes');
    });
  });

  describe('obtenerPorId', () => {
    it('debe retornar una sala por ID', async () => {
      const result = await controller.obtenerPorId(1);
      expect(result).toHaveProperty('salaId', 1);
      expect(result).toHaveProperty('nombre', 'Sala 1');
      expect(mockSalasService.obtenerPorId).toHaveBeenCalledWith(1);
    });
  });
});
