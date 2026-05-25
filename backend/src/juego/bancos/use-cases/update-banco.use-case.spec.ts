import { Test, TestingModule } from '@nestjs/testing';
import { UpdateBancoUseCase } from './update-banco.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UpdateBancoUseCase', () => {
  let useCase: UpdateBancoUseCase;
  let prisma: PrismaService;

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
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should update a banco if found', async () => {
    const banco = { bancoId: 1, nombre: 'Old' };
    const dto = { nombre: 'New' };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(banco);
    mockPrisma.bancoPreguntas.update.mockResolvedValue({ ...banco, ...dto });

    const result = await useCase.execute(1, dto);

    expect(result.nombre).toBe('New');
    expect(mockPrisma.bancoPreguntas.update).toHaveBeenCalled();
  });

  it('should throw NotFoundException if banco not found', async () => {
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);
    await expect(useCase.execute(1, {})).rejects.toThrow(NotFoundException);
  });
});
