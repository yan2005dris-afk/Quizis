import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateConfiguracionSalaUseCase } from './update-configuracion-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('UpdateConfiguracionSalaUseCase', () => {
  let useCase: UpdateConfiguracionSalaUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn(), update: jest.fn() },
    preguntas: { count: jest.fn() },
    salaComodines: { upsert: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateConfiguracionSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<UpdateConfiguracionSalaUseCase>(
      UpdateConfiguracionSalaUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(1, { nombre: 'Nuevo' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if sala is in EN_VIVO state', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.EN_VIVO,
      bancoId: 1,
      deletedAt: null,
    });

    await expect(useCase.execute(1, { nombre: 'Nuevo' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if limitePreguntas exceeds banco capacity', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.BORRADOR,
      bancoId: 1,
      deletedAt: null,
    });
    mockPrisma.preguntas.count.mockResolvedValue(3);

    await expect(
      useCase.execute(1, { limitePreguntas: 10 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update sala successfully when in BORRADOR state', async () => {
    const updatedSala = {
      salaId: 1,
      adminId: 1,
      bancoId: 1,
      nombre: 'Sala Actualizada',
      tokenCompartido: 'token-1',
      estado: EstadoSala.BORRADOR,
      limitePreguntas: 5,
      createdAt: new Date(),
      comodines: [],
    };

    mockPrisma.salas.findUnique
      .mockResolvedValueOnce({
        salaId: 1,
        estado: EstadoSala.BORRADOR,
        bancoId: 1,
        deletedAt: null,
      })
      .mockResolvedValueOnce(updatedSala);
    mockPrisma.salas.update.mockResolvedValue({});

    const result = await useCase.execute(1, { nombre: 'Sala Actualizada' });

    expect(result.salaId).toBe(1);
    expect(result.nombre).toBe('Sala Actualizada');
    expect(result.comodines).toEqual([]);
  });
});
