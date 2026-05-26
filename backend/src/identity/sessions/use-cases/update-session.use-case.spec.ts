import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateSessionUseCase } from './update-session.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('UpdateSessionUseCase', () => {
  let useCase: UpdateSessionUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSessionUseCase,
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

    useCase = module.get<UpdateSessionUseCase>(UpdateSessionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should update a session', async () => {
    const data = { direccionIp: '1.1.1.1' } as any;
    await useCase.execute('abc', data);

    expect(prisma.sesiones.update).toHaveBeenCalledWith({
      where: { sesionId: 'abc' },
      data,
    });
  });
});
