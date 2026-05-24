import { Test, TestingModule } from '@nestjs/testing';
import { ComodinLlamadaService } from './comodin-llamada.service';

describe('ComodinLlamadaService', () => {
  let service: ComodinLlamadaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComodinLlamadaService],
    }).compile();

    service = module.get<ComodinLlamadaService>(ComodinLlamadaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
