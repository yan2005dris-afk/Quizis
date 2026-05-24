import { Test, TestingModule } from '@nestjs/testing';
import { ComodinLlamadaService } from './comodin-llamada.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('ComodinLlamadaService', () => {
  let service: ComodinLlamadaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinLlamadaService,
        // Añadimos esta simulación para que no busque la BD real
        {
          provide: PrismaService,
          useValue: {}, 
        },
      ],
    }).compile();

    service = module.get<ComodinLlamadaService>(ComodinLlamadaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});