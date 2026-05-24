import { Test, TestingModule } from '@nestjs/testing';
import { ComodinPublicoService } from './comodin-publico.service';

describe('ComodinPublicoService', () => {
  let service: ComodinPublicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComodinPublicoService],
    }).compile();

    service = module.get<ComodinPublicoService>(ComodinPublicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
