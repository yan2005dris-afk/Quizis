import { Test, TestingModule } from '@nestjs/testing';
import { UpdateBancoUseCase } from './update-banco.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UpdateBancoUseCase', () => {
  let useCase: UpdateBancoUseCase;

  const mockPrisma = {
    bancoPreguntas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBancoUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<UpdateBancoUseCase>(UpdateBancoUseCase);
  });

  it('should update a banco if found and owned by user', async () => {
    const banco = { bancoId: 1, nombre: 'Old', usuarioId: 1 };
    const dto = { nombre: 'New' };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(banco);
    mockPrisma.bancoPreguntas.update.mockResolvedValue({ ...banco, ...dto });

    const result = await useCase.execute(1, dto, 1);

    expect(result.nombre).toBe('New');
    expect(mockPrisma.bancoPreguntas.update).toHaveBeenCalled();
  });

  it('should throw NotFoundException if banco not found', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);
    await expect(useCase.execute(1, {}, 1)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if banco belongs to another user', async () => {
    const banco = { bancoId: 1, nombre: 'Old', usuarioId: 2 };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(banco);
    await expect(useCase.execute(1, { nombre: 'New' }, 1)).rejects.toThrow(NotFoundException);
  });
});
