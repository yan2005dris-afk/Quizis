import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListSessionsByUserUseCase } from './list-sessions-by-user.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('ListSessionsByUserUseCase', () => {
  let useCase: ListSessionsByUserUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSessionsByUserUseCase,
        {
          provide: PrismaService,
          useValue: {
            sesiones: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<ListSessionsByUserUseCase>(ListSessionsByUserUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should list active sessions for user', async () => {
    (prisma.sesiones.findMany as jest.Mock).mockResolvedValue([]);

    await useCase.execute(1);

    expect(prisma.sesiones.findMany).toHaveBeenCalledWith({
      where: {
        usuarioId: 1,
        revocado: false,
        expiraEn: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
