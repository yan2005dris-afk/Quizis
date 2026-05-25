import { Test, TestingModule } from '@nestjs/testing';
import { ComodinLlamadaService } from './comodin-llamada.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

describe('ComodinLlamadaService', () => {
  let service: ComodinLlamadaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinLlamadaService,
        {
          provide: PrismaService,
          useValue: {
            extendedClient: {
              rondas: {
                findFirst: jest.fn(),
              },
              participantes: {
                findMany: jest.fn(),
              },
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOnlineParticipants: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<ComodinLlamadaService>(ComodinLlamadaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});