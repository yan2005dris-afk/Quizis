import { Test, TestingModule } from '@nestjs/testing';
import { ComodinLlamadaService } from './comodin-llamada.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ComodinLlamadaService', () => {
  let service: ComodinLlamadaService;
  let prisma: PrismaService;

  /**
   * Ultimos cambios hechos:
   *
   * - Uso de transaction
   * - Validaciones adicionales
   * - Refactorizacion de codigo
   *
   * @author Carlos Patiño
   * @date 2026-05-24
   */

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
      ],
    }).compile();

    service = module.get<ComodinLlamadaService>(ComodinLlamadaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
