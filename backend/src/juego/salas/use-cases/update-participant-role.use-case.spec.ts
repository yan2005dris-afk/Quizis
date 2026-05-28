import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateParticipantRoleUseCase } from './update-participant-role.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

describe('UpdateParticipantRoleUseCase', () => {
  let useCase: UpdateParticipantRoleUseCase;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
    },
    participantes: {
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateParticipantRoleUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<UpdateParticipantRoleUseCase>(UpdateParticipantRoleUseCase);
    jest.clearAllMocks();

    // Default mock for $transaction: execute the callback with tx that has participantes
    mockPrisma.$transaction.mockImplementation(
      (cb: any) => cb({ participantes: mockPrisma.participantes }),
    );
  });

  it('should promote nickname to estudiante when under maxEstudiantes cap', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      maxEstudiantes: 3,
    });
    mockPrisma.participantes.count.mockResolvedValue(1); // only 1 current estudiante

    const result = { participanteId: 1, nickname: 'alice', rol: 'estudiante' };
    mockPrisma.participantes.update.mockResolvedValue(result);

    const response = await useCase.execute('TOKEN', 'alice', 'estudiante');

    expect(response).toEqual(result);
    expect(mockPrisma.participantes.count).toHaveBeenCalledWith({
      where: {
        salaId: 1,
        deletedAt: null,
        rol: 'estudiante',
        nickname: { not: 'alice' },
      },
    });
    // Should NOT call updateMany (no demotion)
    expect(mockPrisma.participantes.updateMany).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when at maxEstudiantes cap', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      maxEstudiantes: 2,
    });
    mockPrisma.participantes.count.mockResolvedValue(2); // already at cap (2 existing estudiantes)

    await expect(
      useCase.execute('TOKEN', 'alice', 'estudiante'),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.participantes.update).not.toHaveBeenCalled();
  });

  it('should allow role change to observador without cap check', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      maxEstudiantes: 1,
    });

    const result = { participanteId: 1, nickname: 'alice', rol: 'observador' };
    mockPrisma.participantes.update.mockResolvedValue(result);

    const response = await useCase.execute('TOKEN', 'alice', 'observador');

    expect(response).toEqual(result);
    // count should not be called for non-estudiante roles
    expect(mockPrisma.participantes.count).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('INVALID', 'alice', 'estudiante'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when promoting Host-nickname', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      maxEstudiantes: 5,
    });

    await expect(
      useCase.execute('TOKEN', 'Host-profe', 'estudiante'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow promotion when count < maxEstudiantes with exact boundary', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      tokenCompartido: 'TOKEN',
      maxEstudiantes: 3,
    });
    mockPrisma.participantes.count.mockResolvedValue(2); // 2 current, cap is 3 → OK

    const result = { participanteId: 1, nickname: 'bob', rol: 'estudiante' };
    mockPrisma.participantes.update.mockResolvedValue(result);

    const response = await useCase.execute('TOKEN', 'bob', 'estudiante');

    expect(response).toEqual(result);
    expect(mockPrisma.participantes.count).toHaveBeenCalled();
  });
});
