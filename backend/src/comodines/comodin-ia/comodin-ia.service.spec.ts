import { Test, TestingModule } from '@nestjs/testing';
import { ComodinIaService } from './comodin-ia.service';

describe('ComodinIaService', () => {
  let service: ComodinIaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComodinIaService],
    }).compile();

    service = module.get<ComodinIaService>(ComodinIaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
