import { Test, TestingModule } from '@nestjs/testing';
import { GetAllBancosUseCase } from './get-all-bancos.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

describe('GetAllBancosUseCase', () => {
  let useCase: GetAllBancosUseCase;

  const mockPrisma = {
    bancoPreguntas: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllBancosUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<GetAllBancosUseCase>(GetAllBancosUseCase);
  });

  it('should return bancos filtered by usuarioId', async () => {
    const bancos = [{ bancoId: 1, nombre: 'B1' }];
    const usuarioId = 1;
    mockPrisma.bancoPreguntas.findMany.mockResolvedValue(bancos);

    const result = await useCase.execute(usuarioId);

    expect(result).toEqual(bancos);
    expect(mockPrisma.bancoPreguntas.findMany).toHaveBeenCalledWith({
      where: { usuarioId, deletedAt: null },
      include: {
        _count: {
          select: { preguntas: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });
});
