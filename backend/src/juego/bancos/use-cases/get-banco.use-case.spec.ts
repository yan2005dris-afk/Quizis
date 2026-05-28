import { Test, TestingModule } from '@nestjs/testing';
import { GetBancoUseCase } from './get-banco.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetBancoUseCase', () => {
  let useCase: GetBancoUseCase;

  const mockPrisma = {
    bancoPreguntas: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBancoUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<GetBancoUseCase>(GetBancoUseCase);
  });

  it('should return a banco if found and owned by user', async () => {
    const banco = { bancoId: 1, nombre: 'B1', usuarioId: 1, preguntas: [] };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(banco);

    const result = await useCase.execute(1, 1);

    expect(result).toEqual(banco);
    expect(mockPrisma.bancoPreguntas.findUnique).toHaveBeenCalledWith({
      where: { bancoId: 1 },
      include: {
        preguntas: {
          include: { opciones: true },
          orderBy: { preguntaId: 'asc' },
        },
      },
    });
  });

  it('should throw NotFoundException if banco not found', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1, 1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if banco belongs to another user', async () => {
    const banco = { bancoId: 1, nombre: 'B1', usuarioId: 2, preguntas: [] };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(banco);

    await expect(useCase.execute(1, 1)).rejects.toThrow(NotFoundException);
  });
});
