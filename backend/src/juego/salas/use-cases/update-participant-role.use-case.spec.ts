import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateParticipantRoleUseCase } from './update-participant-role.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('UpdateParticipantRoleUseCase', () => {
  let useCase: UpdateParticipantRoleUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateParticipantRoleUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<UpdateParticipantRoleUseCase>(
      UpdateParticipantRoleUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('token-1', 'Juan', 'estudiante'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if nickname starts with Host-', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'token-1',
    });

    await expect(
      useCase.execute('token-1', 'Host-admin', 'observador'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should demote other students to observador when assigning estudiante role', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const mockUpdate = jest.fn().mockResolvedValue({
      participanteId: 1,
      nickname: 'Juan',
      rol: 'estudiante',
      salaId: 1,
    });

    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'token-1',
    });
    mockPrisma.$transaction.mockImplementation(async (cb) =>
      cb({ participantes: { updateMany: mockUpdateMany, update: mockUpdate } }),
    );

    await useCase.execute('token-1', 'Juan', 'estudiante');

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        salaId: 1,
        deletedAt: null,
        rol: 'estudiante',
        nickname: { not: 'Juan' },
      },
      data: { rol: 'observador' },
    });
    expect(mockUpdate).toHaveBeenCalled();
  });
});
