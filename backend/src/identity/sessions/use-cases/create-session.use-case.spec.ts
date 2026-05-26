import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateSessionUseCase } from './create-session.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSessionUseCase,
        {
          provide: PrismaService,
          useValue: {
            sesiones: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateSessionUseCase>(CreateSessionUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a session', async () => {
    const data = {
      usuarioId: 1,
      hashRefreshToken: 'hash',
      expiraEn: new Date(),
    } as any;
    (prisma.sesiones.create as jest.Mock).mockResolvedValue({ id: 1, ...data });

    await useCase.execute(data);

    expect(prisma.sesiones.create).toHaveBeenCalledWith({ data });
  });
});
