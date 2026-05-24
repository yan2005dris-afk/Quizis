import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateEstadoSalaUseCase } from './update-estado-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('UpdateEstadoSalaUseCase', () => {
  let useCase: UpdateEstadoSalaUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEstadoSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<UpdateEstadoSalaUseCase>(UpdateEstadoSalaUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería transicionar de BORRADOR a ESPERANDO_ALUMNOS', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.BORRADOR,
    });
    mockPrisma.salas.update.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });

    const result = await useCase.execute(1, {
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });

    expect(result.estado).toBe(EstadoSala.ESPERANDO_ALUMNOS);
    expect(prisma.salas.update).toHaveBeenCalledWith({
      where: { salaId: 1 },
      data: { estado: EstadoSala.ESPERANDO_ALUMNOS },
    });
  });

  it('debería transicionar de ESPERANDO_ALUMNOS a EN_VIVO', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });
    mockPrisma.salas.update.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.EN_VIVO,
    });

    const result = await useCase.execute(1, { estado: EstadoSala.EN_VIVO });

    expect(result.estado).toBe(EstadoSala.EN_VIVO);
  });

  it('debería transicionar de EN_VIVO a FINALIZADO', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.EN_VIVO,
    });
    mockPrisma.salas.update.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.FINALIZADO,
    });

    const result = await useCase.execute(1, { estado: EstadoSala.FINALIZADO });

    expect(result.estado).toBe(EstadoSala.FINALIZADO);
  });

  it('debería permitir retroceder de ESPERANDO_ALUMNOS a BORRADOR', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.ESPERANDO_ALUMNOS,
    });
    mockPrisma.salas.update.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.BORRADOR,
    });

    const result = await useCase.execute(1, { estado: EstadoSala.BORRADOR });

    expect(result.estado).toBe(EstadoSala.BORRADOR);
  });

  it('debería lanzar BadRequestException para transición inválida (BORRADOR → EN_VIVO)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.BORRADOR,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.EN_VIVO }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.salas.update).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException para transición inválida (BORRADOR → FINALIZADO)', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.BORRADOR,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.FINALIZADO }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería lanzar BadRequestException si FINALIZADO intenta transicionar a cualquier estado', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      estado: EstadoSala.FINALIZADO,
    });

    await expect(
      useCase.execute(1, { estado: EstadoSala.BORRADOR }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute(1, { estado: EstadoSala.EN_VIVO }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería lanzar NotFoundException si la sala no existe', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute(999, { estado: EstadoSala.ESPERANDO_ALUMNOS }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.salas.update).not.toHaveBeenCalled();
  });
});
