import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreateSalaUseCase } from './create-sala.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EstadoSala } from '../dto/update-estado-sala.dto';

describe('CreateSalaUseCase', () => {
  let useCase: CreateSalaUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    bancoPreguntas: {
      findUnique: jest.fn(),
    },
    salas: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSalaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<CreateSalaUseCase>(CreateSalaUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería crear una sala exitosamente con PIN generado', async () => {
    const dto = { bancoId: 1, nombre: 'Clase de Calidad', limitePreguntas: 20 };
    const adminId = 1;

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.salas.create.mockResolvedValue({
      salaId: 1,
      adminId: 1,
      bancoId: 1,
      nombre: 'Clase de Calidad',
      codigoPin: 'UPSE-742',
      limitePreguntas: 20,
      estado: EstadoSala.BORRADOR,
    });

    const result = await useCase.execute(dto, adminId);

    expect(result.salaId).toBe(1);
    expect(result.codigoPin).toMatch(/^UPSE-\d{3}$/);
    expect(result.estado).toBe(EstadoSala.BORRADOR);
    expect(prisma.bancoPreguntas.findUnique).toHaveBeenCalledWith({
      where: { bancoId: 1 },
    });
  });

  it('debería usar limitePreguntas por defecto (15) si no se envía', async () => {
    const dto = { bancoId: 1, nombre: 'Sin límite explícito' };
    const adminId = 1;

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.salas.create.mockResolvedValue({
      salaId: 2,
      limitePreguntas: 15,
      estado: EstadoSala.BORRADOR,
    });

    await useCase.execute(dto, adminId);

    expect(prisma.salas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ limitePreguntas: 15 }),
      }),
    );
  });

  it('debería lanzar NotFoundException si el banco no existe', async () => {
    const dto = { bancoId: 999, nombre: 'Banco inexistente' };
    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(dto, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.salas.create).not.toHaveBeenCalled();
  });

  it('debería reintentar si hay colisión de PIN (P2002)', async () => {
    const dto = { bancoId: 1, nombre: 'Test colisión' };
    const adminId = 1;
    const p2002Error = { code: 'P2002', meta: { target: ['codigo_pin'] } };

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    // Primera llamada falla con P2002, segunda tiene éxito
    mockPrisma.salas.create
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        salaId: 3,
        codigoPin: 'UPSE-555',
        estado: EstadoSala.BORRADOR,
      });

    const result = await useCase.execute(dto, adminId);

    expect(result.salaId).toBe(3);
    expect(prisma.salas.create).toHaveBeenCalledTimes(2);
  });

  it('debería lanzar error si se agotan los reintentos de PIN', async () => {
    const dto = { bancoId: 1, nombre: 'Test agotamiento' };
    const p2002Error = { code: 'P2002', meta: { target: ['codigo_pin'] } };

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    // Simular 10 colisiones consecutivas
    mockPrisma.salas.create.mockRejectedValue(p2002Error);

    await expect(useCase.execute(dto, 1)).rejects.toThrow(
      'No se pudo generar un PIN único para la sala después de varios intentos',
    );
    expect(prisma.salas.create).toHaveBeenCalledTimes(10);
  });

  it('debería re-lanzar errores no relacionados con P2002', async () => {
    const dto = { bancoId: 1, nombre: 'Test error genérico' };
    const genericError = new Error('Connection refused');

    mockPrisma.bancoPreguntas.findUnique.mockResolvedValue({ bancoId: 1 });
    mockPrisma.salas.create.mockRejectedValue(genericError);

    await expect(useCase.execute(dto, 1)).rejects.toThrow('Connection refused');
    expect(prisma.salas.create).toHaveBeenCalledTimes(1);
  });
});
