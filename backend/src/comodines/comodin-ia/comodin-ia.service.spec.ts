import { Test, TestingModule } from '@nestjs/testing';
import { ComodinIaService } from './comodin-ia.service';
import { ConfigService } from '@nestjs/config';

describe('ComodinIaService', () => {
  let service: ComodinIaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinIaService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('fake-key') },
        },
      ],
    }).compile();

    service = module.get<ComodinIaService>(ComodinIaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
