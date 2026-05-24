import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';
import { EstadoSala } from './dto/update-estado-sala.dto';

describe('SalasController', () => {
  let controller: SalasController;
  let service: SalasService;

  const mockSalasService = {
    create: jest.fn(),
    updateEstado: jest.fn(),
    validateToken: jest.fn(),
    listBancosDisponibles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalasController],
      providers: [{ provide: SalasService, useValue: mockSalasService }],
    }).compile();

    controller = module.get<SalasController>(SalasController);
    service = module.get<SalasService>(SalasService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debería llamar a salasService.create con el DTO y adminId', async () => {
      const dto = { bancoId: 1, nombre: 'Clase Test', limitePreguntas: 10 };
      const adminId = 1;
      const expectedSala = {
        salaId: 1,
        tokenInvitacion: 'jwt-321',
        estado: EstadoSala.BORRADOR,
      };

      mockSalasService.create.mockResolvedValue(expectedSala);

      const result = await controller.create(dto, adminId);

      expect(result).toEqual(expectedSala);
      expect(service.create).toHaveBeenCalledWith(dto, adminId);
    });
  });

  describe('updateEstado', () => {
    it('debería llamar a salasService.updateEstado con el ID y DTO', async () => {
      const updateDto = { estado: EstadoSala.EN_VIVO };
      const expectedSala = { salaId: 5, estado: EstadoSala.EN_VIVO };

      mockSalasService.updateEstado.mockResolvedValue(expectedSala);

      const result = await controller.updateEstado(5, updateDto);

      expect(result).toEqual(expectedSala);
      expect(service.updateEstado).toHaveBeenCalledWith(5, updateDto);
    });
  });

  describe('validateToken', () => {
    it('debería llamar a salasService.validateToken con el token', async () => {
      const token = 'jwt-token-123';
      const expectedResult = { salaId: 1, nombre: 'Sala de Prueba', estado: EstadoSala.BORRADOR };

      mockSalasService.validateToken.mockResolvedValue(expectedResult);

      const result = await controller.validateToken(token);

      expect(result).toEqual(expectedResult);
      expect(service.validateToken).toHaveBeenCalledWith(token);
    });
  });

  describe('listBancosDisponibles', () => {
    it('debería llamar a salasService.listBancosDisponibles', async () => {
      const expectedResult = [{ bancoId: 1, nombre: 'Matemáticas', totalPreguntas: 5 }];

      mockSalasService.listBancosDisponibles.mockResolvedValue(expectedResult);

      const result = await controller.listBancosDisponibles();

      expect(result).toEqual(expectedResult);
      expect(service.listBancosDisponibles).toHaveBeenCalled();
    });
  });
});
