import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateConfiguracionSalaUseCase } from './update-configuracion-sala.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const createSalaBase = () => ({
  salaId: 1,
  adminId: 1,
  bancoId: 10,
  nombre: 'Sala',
  tokenCompartido: 'T1',
  estado: 'BORRADOR',
  limitePreguntas: 15,
  createdAt: new Date(),
  deletedAt: null,
  comodines: [],
});

describe('UpdateConfiguracionSalaUseCase', () => {
  let useCase: UpdateConfiguracionSalaUseCase;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    preguntas: {
      count: jest.fn(),
    },
    participantes: {
      count: jest.fn(),
    },
    salaComodines: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateConfiguracionSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<UpdateConfiguracionSalaUseCase>(UpdateConfiguracionSalaUseCase);
    jest.clearAllMocks();
  });

  it('should update maxEstudiantes when valid', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(createSalaBase());
    mockPrisma.salas.update.mockResolvedValue({ ...createSalaBase(), maxEstudiantes: 5 });

    await useCase.execute(1, { maxEstudiantes: 5 });

    expect(mockPrisma.salas.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salaId: 1 },
        data: expect.objectContaining({
          maxEstudiantes: 5,
        }),
      }),
    );
  });

  it('should throw BadRequestException when maxEstudiantes < current estudiantes count', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(createSalaBase());
    mockPrisma.participantes.count.mockResolvedValue(3);

    await expect(
      useCase.execute(1, { maxEstudiantes: 2 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should not update maxEstudiantes when not provided', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(createSalaBase());
    mockPrisma.salas.update.mockResolvedValue(createSalaBase());

    await useCase.execute(1, { nombre: 'Nuevo nombre' });

    const updateCall = mockPrisma.salas.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('maxEstudiantes');
  });

  it('should throw NotFoundException when sala is deleted', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      ...createSalaBase(),
      deletedAt: new Date(),
    });

    await expect(
      useCase.execute(1, { nombre: 'test' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should accept maxEstudiantes equal to current estudiantes count', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(createSalaBase());
    mockPrisma.participantes.count.mockResolvedValue(3);
    mockPrisma.salas.update.mockResolvedValue({ ...createSalaBase(), maxEstudiantes: 3 });

    const result = await useCase.execute(1, { maxEstudiantes: 3 });
    expect(result).toBeDefined();
  });
});
