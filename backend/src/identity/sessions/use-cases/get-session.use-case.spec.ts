import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetSessionUseCase } from './get-session.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('GetSessionUseCase', () => {
  let useCase: GetSessionUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSessionUseCase,
        {
          provide: PrismaService,
          useValue: {
            sesiones: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<GetSessionUseCase>(GetSessionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find an active session', async () => {
    (prisma.sesiones.findFirst as jest.Mock).mockResolvedValue({
      sesionId: 'abc',
    });

    await useCase.execute(1, 'abc');

    expect(prisma.sesiones.findFirst).toHaveBeenCalledWith({
      where: {
        usuarioId: 1,
        sesionId: 'abc',
        revocado: false,
        expiraEn: { gt: expect.any(Date) },
      },
    });
  });
});
