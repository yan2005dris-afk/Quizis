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
    participantes: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn().mockImplementation((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  };

  const mockSala = { salaId: 1, tokenCompartido: 'token-abc', maxEstudiantes: 30 };

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
    mockPrisma.participantes.count.mockResolvedValue(0);
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

  it('cambio a estudiante → verifica cupo antes de actualizar', async () => {
    mockPrisma.participantes.count.mockResolvedValue(0);
    mockTx.participantes.update.mockResolvedValue({
      ...mockParticipante,
      rol: 'estudiante',
    });

    await useCase.execute('token-abc', 'Juan', 'estudiante');

    expect(mockPrisma.participantes.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salaId: 1, rol: 'estudiante' }),
      }),
    );
    expect(mockTx.participantes.update).toHaveBeenCalledWith({
      where: { salaId_nickname: { salaId: 1, nickname: 'Juan' } },
      data: { rol: 'estudiante' },
    });
  });

  it('cupo de estudiantes lleno → BadRequestException', async () => {
    mockPrisma.participantes.count.mockResolvedValue(30);

    await expect(
      useCase.execute('token-abc', 'Juan', 'estudiante'),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

  it('onlineNicknames filtra el conteo a estudiantes online → permite promoción', async () => {
    mockPrisma.participantes.count.mockResolvedValue(0);
    mockTx.participantes.update.mockResolvedValue({
      ...mockParticipante,
      rol: 'estudiante',
    });

    await useCase.execute('token-abc', 'Juan', 'estudiante', ['Juan', 'Maria']);

    expect(mockPrisma.participantes.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nickname: { in: ['Juan', 'Maria'], not: 'Juan' },
        }),
      }),
    );
    expect(mockTx.participantes.update).toHaveBeenCalled();
  });
});
