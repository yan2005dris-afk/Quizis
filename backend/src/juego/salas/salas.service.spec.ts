import { Test } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

describe('SalasService', () => {
  let service: SalasService;

  const mockPrismaService = {
    salas: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    preguntas: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    respuestasRonda: {
      findMany: jest.fn(),
    },
    salaComodines: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    getOnlineParticipants: jest.fn(),
    setParticipantOnline: jest.fn(),
    removeParticipantOnline: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);

    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listarTodas', () => {
    it('debe retornar lista de salas mapeadas a camelCase', async () => {
      const mockSalas = [
        {
          salaId: 1,
          nombre: 'Sala Test',
          estado: 'esperando',
          createdAt: new Date('2024-01-01'),
          _count: { participantes: 3 },
        },
        {
          salaId: 2,
          nombre: 'Sala Activa',
          estado: 'jugando',
          createdAt: new Date('2024-01-02'),
          _count: { participantes: 5 },
        },
      ];
      mockPrismaService.salas.findMany.mockResolvedValue(mockSalas);

      const result = await service.listarTodas();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        salaId: 1,
        nombre: 'Sala Test',
        estado: 'esperando',
        participantes: 3,
        creadoEn: '2024-01-01T00:00:00.000Z',
      });
      expect(result[1]).toEqual({
        salaId: 2,
        nombre: 'Sala Activa',
        estado: 'jugando',
        participantes: 5,
        creadoEn: '2024-01-02T00:00:00.000Z',
      });
    });
  });

  describe('obtenerPorId', () => {
    it('debe retornar una sala con participantes y ronda activa', async () => {
      const mockSala = {
        salaId: 1,
        nombre: 'Sala 1',
        estado: 'jugando',
        limitePreguntas: 10,
        tokenCompartido: 'abc-123',
        createdAt: new Date('2024-01-01'),
        deletedAt: null,
        participantes: [
          {
            participanteId: 1,
            nickname: 'Juan',
            rol: 'estudiante',
          },
        ],
        rondas: [
          {
            rondaId: 1,
            numeroRonda: 1,
            estado: 'jugando',
            fechaInicio: new Date('2024-01-01T10:00:00'),
            preguntaActualId: 10,
            preguntasAsignadas: [10, 11],
          },
        ],
      };
      const mockPreguntas = [
        {
          preguntaId: 10,
          texto: 'Pregunta 10',
          nivel: 1,
          monto: 100,
          opciones: [{ opcionId: 1, texto: 'Op 1' }],
        },
      ];
      const mockRespuestas = [
        {
          preguntaId: 10,
          opcionId: 1,
          esCorrecta: true,
        },
      ];

      mockCacheService.getOnlineParticipants.mockResolvedValue(['Juan']);
      mockPrismaService.salas.findUnique.mockResolvedValue(mockSala);
      mockPrismaService.preguntas.findMany.mockResolvedValue(mockPreguntas);
      mockPrismaService.respuestasRonda.findMany.mockResolvedValue(
        mockRespuestas,
      );

      const result = await service.obtenerPorId(1);

      expect(result).toHaveProperty('salaId', 1);
      expect(result.rondaActiva).toBeDefined();
      expect(result.rondaActiva?.historialPreguntas).toHaveLength(1);
    });

    it('debe lanzar NotFoundException si la sala no existe', async () => {
      mockPrismaService.salas.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPorId(999)).rejects.toThrow(
        'Sala con ID 999 no encontrada',
      );
    });
  });
});
