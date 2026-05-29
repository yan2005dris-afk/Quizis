import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EliminateOptions5050UseCase } from './eliminate-options-5050.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

describe('EliminateOptions5050UseCase', () => {
  let useCase: EliminateOptions5050UseCase;

  const mockPrisma = {
    preguntas: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EliminateOptions5050UseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<EliminateOptions5050UseCase>(EliminateOptions5050UseCase);
    jest.clearAllMocks();
  });

  it('should eliminate exactly 2 incorrect options when 3+ wrong options exist', async () => {
    const pregunta = {
      preguntaId: 1,
      opciones: [
        { opcionId: 1, esCorrecta: true },   // correcta
        { opcionId: 2, esCorrecta: false },  // incorrecta
        { opcionId: 3, esCorrecta: false },  // incorrecta
        { opcionId: 4, esCorrecta: false },  // incorrecta
      ],
    };
    mockPrisma.preguntas.findUnique.mockResolvedValue(pregunta);

    const result = await useCase.execute(1);

    expect(result.opcionesEliminadas).toHaveLength(2);
    // All eliminated should be incorrect (no correct opcionId=1)
    expect(result.opcionesEliminadas).not.toContain(1);
    // All should be valid opcionIds from the question
    result.opcionesEliminadas.forEach((id: number) => {
      expect([2, 3, 4]).toContain(id);
    });
  });

  it('should return empty array when fewer than 2 wrong options exist', async () => {
    const pregunta = {
      preguntaId: 2,
      opciones: [
        { opcionId: 1, esCorrecta: true },   // correcta
        { opcionId: 2, esCorrecta: false },  // only 1 wrong
      ],
    };
    mockPrisma.preguntas.findUnique.mockResolvedValue(pregunta);

    const result = await useCase.execute(2);

    expect(result.opcionesEliminadas).toEqual([]);
  });

  it('should return empty array when 0 wrong options exist', async () => {
    const pregunta = {
      preguntaId: 3,
      opciones: [
        { opcionId: 1, esCorrecta: true },
      ],
    };
    mockPrisma.preguntas.findUnique.mockResolvedValue(pregunta);

    const result = await useCase.execute(3);

    expect(result.opcionesEliminadas).toEqual([]);
  });

  it('should throw NotFoundException when pregunta does not exist', async () => {
    mockPrisma.preguntas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
  });

  it('should return 2 unique opcionIds even with many options', async () => {
    const pregunta = {
      preguntaId: 4,
      opciones: [
        { opcionId: 1, esCorrecta: true },   // correcta
        { opcionId: 2, esCorrecta: false },
        { opcionId: 3, esCorrecta: false },
        { opcionId: 4, esCorrecta: false },
        { opcionId: 5, esCorrecta: false },
        { opcionId: 6, esCorrecta: false },
      ],
    };
    mockPrisma.preguntas.findUnique.mockResolvedValue(pregunta);

    const result = await useCase.execute(4);

    expect(result.opcionesEliminadas).toHaveLength(2);
    expect(result.opcionesEliminadas[0]).not.toBe(result.opcionesEliminadas[1]);
    expect(result.opcionesEliminadas).not.toContain(1);
  });
});
