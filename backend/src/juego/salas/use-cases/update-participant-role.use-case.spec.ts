import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateParticipantRoleUseCase } from './update-participant-role.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('UpdateParticipantRoleUseCase', () => {
  let useCase: UpdateParticipantRoleUseCase;

  const mockTx = {
    participantes: {
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  };

  const mockSala = { salaId: 1, tokenCompartido: 'token-abc' };

  const mockParticipante = {
    participanteId: 5,
    salaId: 1,
    nickname: 'Juan',
    rol: 'observador',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
    );
    mockTx.participantes.updateMany.mockResolvedValue({ count: 0 });
    mockTx.participantes.update.mockResolvedValue(mockParticipante);
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('token-abc', 'Juan', 'observador'),
    ).rejects.toThrow(NotFoundException);
  });

  it('nickname con prefijo Host-* → BadRequestException', async () => {
    await expect(
      useCase.execute('token-abc', 'Host-Admin', 'observador'),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('cambio a observador → solo actualiza ese participante, sin demote', async () => {
    await useCase.execute('token-abc', 'Juan', 'observador');

    expect(mockTx.participantes.updateMany).not.toHaveBeenCalled();
    expect(mockTx.participantes.update).toHaveBeenCalledWith({
      where: { salaId_nickname: { salaId: 1, nickname: 'Juan' } },
      data: { rol: 'observador' },
    });
  });

  it('cambio a estudiante → demota otros estudiantes a observador primero', async () => {
    mockTx.participantes.update.mockResolvedValue({
      ...mockParticipante,
      rol: 'estudiante',
    });

    await useCase.execute('token-abc', 'Juan', 'estudiante');

    expect(mockTx.participantes.updateMany).toHaveBeenCalledWith({
      where: {
        salaId: 1,
        deletedAt: null,
        rol: 'estudiante',
        nickname: { not: 'Juan' },
      },
      data: { rol: 'observador' },
    });
    expect(mockTx.participantes.update).toHaveBeenCalledWith({
      where: { salaId_nickname: { salaId: 1, nickname: 'Juan' } },
      data: { rol: 'estudiante' },
    });
  });

  it('demote ocurre dentro de la misma transacción que el update', async () => {
    let updateManyCalledFirst = false;
    let updateCalledAfter = false;

    mockTx.participantes.updateMany.mockImplementation(() => {
      updateManyCalledFirst = true;
      return Promise.resolve({ count: 1 });
    });
    mockTx.participantes.update.mockImplementation(() => {
      updateCalledAfter = updateManyCalledFirst;
      return Promise.resolve({ ...mockParticipante, rol: 'estudiante' });
    });

    await useCase.execute('token-abc', 'Maria', 'estudiante');

    expect(updateCalledAfter).toBe(true);
  });

  it('retorna el participante actualizado', async () => {
    const updated = { ...mockParticipante, rol: 'estudiante' };
    mockTx.participantes.update.mockResolvedValue(updated);

    const result = await useCase.execute('token-abc', 'Juan', 'estudiante');

    expect(result).toEqual(updated);
  });

  it('busca sala por tokenCompartido', async () => {
    await useCase.execute('token-abc', 'Juan', 'observador');

    expect(mockPrisma.salas.findUnique).toHaveBeenCalledWith({
      where: { tokenCompartido: 'token-abc' },
    });
  });
});
