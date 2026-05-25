import { Test, TestingModule } from '@nestjs/testing';
import { BancosService } from './bancos.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('BancosService', () => {
  let service: BancosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BancosService,
        {
          provide: PrismaService,
          useValue: {
            bancoPreguntas: {
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue({ bancoId: 1 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BancosService>(BancosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
