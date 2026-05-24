import { Test, TestingModule } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { EstadoSala } from './dto/update-sala-estado.dto';

describe('SalasService', () => {
  let service: SalasService;
  let createUseCase: CreateSalaUseCase;
  let updateUseCase: UpdateEstadoSalaUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalasService,
        {
          provide: CreateSalaUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateEstadoSalaUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
    createUseCase = module.get<CreateSalaUseCase>(CreateSalaUseCase);
    updateUseCase = module.get<UpdateEstadoSalaUseCase>(UpdateEstadoSalaUseCase);
  });

  it('should call CreateSalaUseCase when creating a sala', async () => {
    const dto = { nombre: 'Test', bancoId: 1 };
    const adminId = 1;
    (createUseCase.execute as jest.Mock).mockResolvedValue({ id: 1, ...dto });

    await service.createSala(adminId, dto);
    expect(createUseCase.execute).toHaveBeenCalledWith(adminId, dto);
  });

  it('should call UpdateEstadoSalaUseCase when updating state', async () => {
    const salaId = 1;
    const nuevoEstado = EstadoSala.EN_VIVO;
    (updateUseCase.execute as jest.Mock).mockResolvedValue({ id: salaId, estado: nuevoEstado });

    await service.updateEstado(salaId, nuevoEstado);
    expect(updateUseCase.execute).toHaveBeenCalledWith(salaId, nuevoEstado);
  });
});
