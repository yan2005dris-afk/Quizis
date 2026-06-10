import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateConfiguracionSalaUseCase } from './update-configuracion-sala.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { EstadoSala } from '../../interfaces/dto/update-estado-sala.dto';

describe('UpdateConfiguracionSalaUseCase', () => {
  let useCase: UpdateConfiguracionSalaUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn(), update: jest.fn() },
    preguntas: { count: jest.fn() },
    salaComodines: { upsert: jest.fn() },
    participantes: { count: jest.fn() },
  };

  const mockSalaBorrador = {
    salaId: 1,
    adminId: 1,
    bancoId: 2,
    nombre: 'Sala Original',
    tokenCompartido: 'token-abc',
    estado: EstadoSala.BORRADOR,
    limitePreguntas: 10,
    createdAt: new Date(),
    deletedAt: null,
  };

  const mockSalaActualizada = {
    ...mockSalaBorrador,
    nombre: 'Sala Actualizada',
    limitePreguntas: 5,
    comodines: [
      {
        activo: true,
        comodin: {
          comodinId: 1,
          nombre: '50/50',
          descripcion: 'Elimina dos opciones',
        },
      },
    ],
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
    jest.clearAllMocks();

    mockPrisma.salas.findUnique
      .mockResolvedValueOnce(mockSalaBorrador)
      .mockResolvedValue({
        ...mockSalaActualizada,
        comodines: mockSalaActualizada.comodines,
      });
    mockPrisma.salas.update.mockResolvedValue(undefined);
    mockPrisma.preguntas.count.mockResolvedValue(20);
    mockPrisma.salaComodines.upsert.mockResolvedValue(undefined);
    mockPrisma.participantes.count.mockResolvedValue(0);
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockReset();
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999, { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sala soft-deleted → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockReset();
    mockPrisma.salas.findUnique.mockResolvedValue({
      ...mockSalaBorrador,
      deletedAt: new Date(),
    });

    await expect(useCase.execute(1, { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('estado BORRADOR → permite actualización', async () => {
    const result = await useCase.execute(1, { nombre: 'Sala Actualizada' });

    expect(mockPrisma.salas.update).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('estado ESPERANDO_ALUMNOS → también permite actualización', async () => {
    mockPrisma.salas.findUnique.mockReset();
    mockPrisma.salas.findUnique
      .mockResolvedValueOnce({
        ...mockSalaBorrador,
        estado: EstadoSala.ESPERANDO_ALUMNOS,
      })
      .mockResolvedValue({ ...mockSalaActualizada, comodines: [] });

    await useCase.execute(1, { nombre: 'X' });

    expect(mockPrisma.salas.update).toHaveBeenCalled();
  });

  it('estado EN_VIVO → BadRequestException', async () => {
    mockPrisma.salas.findUnique.mockReset();
    mockPrisma.salas.findUnique.mockResolvedValue({
      ...mockSalaBorrador,
      estado: EstadoSala.EN_VIVO,
    });

    await expect(useCase.execute(1, { nombre: 'X' })).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('estado FINALIZADO → BadRequestException', async () => {
    mockPrisma.salas.findUnique.mockReset();
    mockPrisma.salas.findUnique.mockResolvedValue({
      ...mockSalaBorrador,
      estado: EstadoSala.FINALIZADO,
    });

    await expect(useCase.execute(1, { limitePreguntas: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('limitePreguntas mayor que preguntas en banco → BadRequestException', async () => {
    mockPrisma.preguntas.count.mockResolvedValue(3);

    await expect(useCase.execute(1, { limitePreguntas: 10 })).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('limitePreguntas igual a preguntas en banco → permitido', async () => {
    mockPrisma.preguntas.count.mockResolvedValue(5);

    await useCase.execute(1, { limitePreguntas: 5 });

    expect(mockPrisma.salas.update).toHaveBeenCalled();
  });

  it('actualiza comodines con upsert por cada item', async () => {
    await useCase.execute(1, {
      comodines: [
        { comodinId: 1, activo: true },
        { comodinId: 2, activo: false },
      ],
    });

    expect(mockPrisma.salaComodines.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.salaComodines.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salaId_comodinId: { salaId: 1, comodinId: 1 } },
        update: { activo: true },
        create: { salaId: 1, comodinId: 1, activo: true },
      }),
    );
  });

  it('sin comodines en DTO → no llama salaComodines.upsert', async () => {
    await useCase.execute(1, { nombre: 'Solo nombre' });

    expect(mockPrisma.salaComodines.upsert).not.toHaveBeenCalled();
  });

  it('retorna sala actualizada con comodines mapeados', async () => {
    const result = await useCase.execute(1, { nombre: 'Sala Actualizada' });

    expect(result).toMatchObject({
      salaId: 1,
      nombre: 'Sala Actualizada',
      comodines: expect.arrayContaining([
        expect.objectContaining({ comodinId: 1, nombre: '50/50' }),
      ]),
    });
  });

  it('maxEstudiantes menor que estudiantes actuales → BadRequestException', async () => {
    mockPrisma.participantes.count.mockResolvedValue(5);

    await expect(useCase.execute(1, { maxEstudiantes: 3 })).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('maxEstudiantes igual a estudiantes actuales → permite actualización', async () => {
    mockPrisma.participantes.count.mockResolvedValue(5);

    await useCase.execute(1, { maxEstudiantes: 5 });

    expect(mockPrisma.salas.update).toHaveBeenCalled();
  });
});
