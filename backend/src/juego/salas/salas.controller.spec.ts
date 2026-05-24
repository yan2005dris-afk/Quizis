import { Test, TestingModule } from '@nestjs/testing';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';
import { EstadoSala } from './dto/update-sala-estado.dto';

describe('SalasController', () => {
  let controller: SalasController;
  let service: SalasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalasController],
      providers: [
        {
          provide: SalasService,
          useValue: {
            createSala: jest.fn(),
            updateEstado: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SalasController>(SalasController);
    service = module.get<SalasService>(SalasService);
  });

  it('should call service.createSala', async () => {
    const dto = { nombre: 'Test Sala', bancoId: 1 };
    const adminId = 1;
    
    await controller.create(adminId, dto);
    expect(service.createSala).toHaveBeenCalledWith(adminId, dto);
  });

  it('should call service.updateEstado', async () => {
    const salaId = 1;
    const dto = { estado: EstadoSala.ESPERANDO };
    
    await controller.updateEstado(salaId, dto);
    expect(service.updateEstado).toHaveBeenCalledWith(salaId, dto.estado);
  });
});
