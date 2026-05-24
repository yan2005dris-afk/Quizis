import { Test, TestingModule } from '@nestjs/testing';
import { RondasController } from './rondas.controller';
import { RondasService } from './rondas.service';

describe('RondasController', () => {
  let controller: RondasController;
  let service: RondasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RondasController],
      providers: [
        {
          provide: RondasService,
          useValue: {
            initRonda: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RondasController>(RondasController);
    service = module.get<RondasService>(RondasService);
  });

  it('should call service.initRonda', async () => {
    const dto = { salaId: 1, participanteId: 1 };
    
    await controller.initRonda(dto);
    expect(service.initRonda).toHaveBeenCalledWith(dto.salaId, dto.participanteId);
  });
});
