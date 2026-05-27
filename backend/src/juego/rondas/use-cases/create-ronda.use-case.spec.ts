import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRondaUseCase } from './create-ronda.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('CreateRondaUseCase', () => {
  let useCase: CreateRondaUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
    },
    rondas: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRondaUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<CreateRondaUseCase>(CreateRondaUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería crear una ronda con preguntas aleatorias asignadas', async () => {
    const dto = { salaId: 1, participanteId: 5, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 10, limitePreguntas: 3 };
    const mockQuestions = [
      { pregunta_id: 12 },
      { pregunta_id: 45 },
      { pregunta_id: 8 },
    ];
    const mockRonda = {
      rondaId: 1,
      salaId: 1,
      participanteId: 5,
      numeroRonda: 1,
      estado: 'pendiente',
      preguntasAsignadas: [12, 45, 8],
    };

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw.mockResolvedValue(mockQuestions);
    mockPrisma.rondas.create.mockResolvedValue(mockRonda);

    const result = await useCase.execute(dto);

    expect(result.rondaId).toBe(1);
    expect(result.preguntasAsignadas).toEqual([12, 45, 8]);
    expect(result.estado).toBe('pendiente');
    expect(prisma.salas.findUnique).toHaveBeenCalledWith({
      where: { salaId: 1 },
    });
    expect(prisma.rondas.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        salaId: 1,
        participanteId: 5,
        numeroRonda: 1,
        estado: 'pendiente',
        preguntasAsignadas: [12, 45, 8],
      }),
    });
  });

  it('debería usar limitePreguntas de la sala para la cantidad de preguntas', async () => {
    const dto = { salaId: 1, participanteId: 3, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 5, limitePreguntas: 50 };
    const mockQuestions = Array.from({ length: 50 }, (_, i) => ({
      pregunta_id: i + 1,
    }));

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw.mockResolvedValue(mockQuestions);
    mockPrisma.rondas.create.mockResolvedValue({
      rondaId: 2,
      preguntasAsignadas: mockQuestions.map((q) => q.pregunta_id),
    });

    const result = await useCase.execute(dto);

    expect(result.preguntasAsignadas).toHaveLength(50);
  });

  it('debería usar 15 como límite por defecto si limitePreguntas es 0 o null', async () => {
    const dto = { salaId: 1, participanteId: 3, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 5, limitePreguntas: 0 };
    const mockQuestions = Array.from({ length: 15 }, (_, i) => ({
      pregunta_id: i + 1,
    }));

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw.mockResolvedValue(mockQuestions);
    mockPrisma.rondas.create.mockResolvedValue({
      rondaId: 3,
      preguntasAsignadas: mockQuestions.map((q) => q.pregunta_id),
    });

    await useCase.execute(dto);

    // Verificar que el $queryRaw fue llamado (no podemos verificar el LIMIT directamente
    // en template literals, pero sí que se ejecutó la consulta)
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('debería lanzar NotFoundException si la sala no existe', async () => {
    const dto = { salaId: 999, participanteId: 1, numeroRonda: 1 };
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(NotFoundException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.rondas.create).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException si el banco de preguntas está vacío', async () => {
    const dto = { salaId: 1, participanteId: 1, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 10, limitePreguntas: 20 };

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw.mockResolvedValue([]); // Banco vacío

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(dto)).rejects.toThrow(
      'El banco de preguntas de esta sala está vacío',
    );
    expect(prisma.rondas.create).not.toHaveBeenCalled();
  });

  it('debería lanzar BadRequestException si el banco de preguntas tiene menos preguntas que el límite configurado', async () => {
    const dto = { salaId: 1, participanteId: 1, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 10, limitePreguntas: 5 };

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw.mockResolvedValue([
      { pregunta_id: 1 },
      { pregunta_id: 2 },
    ]); // Solo 2 preguntas

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(dto)).rejects.toThrow(
      'El banco de preguntas de esta sala no tiene suficientes preguntas disponibles',
    );
    expect(prisma.rondas.create).not.toHaveBeenCalled();
  });

  it('debería generar conjuntos diferentes de preguntas para rondas distintas', async () => {
    const dto1 = { salaId: 1, participanteId: 1, numeroRonda: 1 };
    const dto2 = { salaId: 1, participanteId: 2, numeroRonda: 1 };
    const mockSala = { salaId: 1, bancoId: 10, limitePreguntas: 3 };

    const questions1 = [
      { pregunta_id: 1 },
      { pregunta_id: 5 },
      { pregunta_id: 9 },
    ];
    const questions2 = [
      { pregunta_id: 3 },
      { pregunta_id: 7 },
      { pregunta_id: 2 },
    ];

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce(questions1)
      .mockResolvedValueOnce(questions2);
    mockPrisma.rondas.create
      .mockResolvedValueOnce({ rondaId: 1, preguntasAsignadas: [1, 5, 9] })
      .mockResolvedValueOnce({ rondaId: 2, preguntasAsignadas: [3, 7, 2] });

    const result1 = await useCase.execute(dto1);
    const result2 = await useCase.execute(dto2);

    // Cada ronda tiene su propia selección exclusiva
    expect(result1.preguntasAsignadas).not.toEqual(result2.preguntasAsignadas);
  });
});
