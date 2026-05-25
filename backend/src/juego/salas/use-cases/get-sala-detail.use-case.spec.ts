import { Test, TestingModule } from '@nestjs/testing';
import { GetSalaDetailUseCase } from './get-sala-detail.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { NotFoundException } from '@nestjs/common';

describe('GetSalaDetailUseCase', () => {
  let useCase: GetSalaDetailUseCase;
  let prisma: PrismaService;
  let cache: CacheService;

  const mockPrisma = {
    salas: {
      findUnique: jest.fn(),
    },
    preguntas: {
      findMany: jest.fn(),
    },
    respuestasRonda: {
      findMany: jest.fn(),
    },
  };

  const mockCache = {
    getOnlineParticipants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSalaDetailUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    useCase = module.get<GetSalaDetailUseCase>(GetSalaDetailUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);
  });

  it('should return sala details with ronda active', async () => {
    const sala = {
      salaId: 1,
      nombre: 'S1',
      tokenCompartido: 'T1',
      createdAt: new Date(),
      participantes: [{ nickname: 'User1', rol: 'jugador' }],
      rondas: [
        {
          rondaId: 10,
          numeroRonda: 1,
          estado: 'jugando',
          preguntaActualId: 100,
          preguntasAsignadas: [100],
        },
      ],
    };
    mockPrisma.salas.findUnique.mockResolvedValue(sala);
    mockPrisma.preguntas.findMany.mockResolvedValue([
      { preguntaId: 100, texto: 'Q1', opciones: [] },
    ]);
    mockPrisma.respuestasRonda.findMany.mockResolvedValue([]);
    mockCache.getOnlineParticipants.mockResolvedValue(['User1']);

    const result = await useCase.execute(1);

    expect(result.nombre).toBe('S1');
    expect(result.participantes[0].isOnline).toBe(true);
    expect(result.rondaActiva).toBeDefined();
    expect(result.rondaActiva?.preguntaActualId).toBe(100);
  });

  it('should throw NotFoundException if sala not found', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);
    await expect(useCase.execute(1)).rejects.toThrow(NotFoundException);
  });
});
