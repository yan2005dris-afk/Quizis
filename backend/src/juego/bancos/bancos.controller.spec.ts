import { Test, TestingModule } from '@nestjs/testing';
import { BancosController } from './bancos.controller';
import { BancosService } from './bancos.service';

describe('BancosController', () => {
  let controller: BancosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BancosController],
      providers: [
        {
          provide: BancosService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ bancoId: 1 }),
          },
        },
      ],
    }).compile();

    controller = module.get<BancosController>(BancosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
