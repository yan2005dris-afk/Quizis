import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

describe('CacheService (checkAndSetDuplicate)', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null), // Forzar fallback a memoria
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('debería registrar un valor nuevo y retornar true', async () => {
    const key = 'test:set';
    const val = 'user1';
    
    const result = await service.checkAndSetDuplicate(key, val, 60);
    expect(result).toBe(true);
  });

  it('debería detectar un duplicado y retornar false', async () => {
    const key = 'test:set';
    const val = 'user1';
    
    await service.checkAndSetDuplicate(key, val, 60);
    const result = await service.checkAndSetDuplicate(key, val, 60);
    
    expect(result).toBe(false);
  });

  it('debería permitir valores diferentes en la misma llave', async () => {
    const key = 'test:set';
    
    const res1 = await service.checkAndSetDuplicate(key, 'user1', 60);
    const res2 = await service.checkAndSetDuplicate(key, 'user2', 60);
    
    expect(res1).toBe(true);
    expect(res2).toBe(true);
  });
});
