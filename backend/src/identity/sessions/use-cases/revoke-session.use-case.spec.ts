import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RevokeSessionUseCase } from './revoke-session.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('RevokeSessionUseCase', () => {
  let useCase: RevokeSessionUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokeSessionUseCase,
        {
          provide: PrismaService,
          useValue: {
            sesiones: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<RevokeSessionUseCase>(RevokeSessionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should revoke a session', async () => {
    await useCase.execute('abc');

    expect(prisma.sesiones.update).toHaveBeenCalledWith({
      where: { sesionId: 'abc' },
      data: { revocado: true },
    });
  });
});
