import { Test } from '@nestjs/testing';
import { SalasService } from './salas.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('SalasService', () => {
  let service: SalasService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    salas: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
    prismaService = module.get<PrismaService>(PrismaService);

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

      expect(mockPrismaService.salas.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { participantes: true } } },
        orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('debe retornar lista vacía si no hay salas', async () => {
      mockPrismaService.salas.findMany.mockResolvedValue([]);

      const result = await service.listarTodas();

      expect(result).toEqual([]);
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
            isOnline: true,
          },
        ],
        rondas: [
          {
            rondaId: 1,
            numeroRonda: 1,
            estado: 'jugando',
            fechaInicio: new Date('2024-01-01T10:00:00'),
          },
        ],
      };
      mockPrismaService.salas.findUnique.mockResolvedValue(mockSala);

      const result = await service.obtenerPorId(1);

      expect(result).toHaveProperty('salaId', 1);
      expect(result).toHaveProperty('nombre', 'Sala 1');
      expect(result).toHaveProperty('estado', 'jugando');
      expect(result.participantes).toHaveLength(1);
      expect(result.participantes[0]).toHaveProperty('nickname', 'Juan');
      expect(result.rondaActiva).toBeDefined();
      expect(result.rondaActiva).toHaveProperty('rondaId', 1);
    });

    it('debe lanzar NotFoundException si la sala no existe', async () => {
      mockPrismaService.salas.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPorId(999)).rejects.toThrow(
        'Sala con ID 999 no encontrada',
      );
    });

    it('debe lanzar NotFoundException si la sala está eliminada', async () => {
      mockPrismaService.salas.findUnique.mockResolvedValue({
        salaId: 1,
        deletedAt: new Date(),
      });

      await expect(service.obtenerPorId(1)).rejects.toThrow(
        'Sala con ID 1 no encontrada',
      );
    });

    it('debe retornar rondaActiva null si no hay rondas en estado jugando', async () => {
      const mockSala = {
        salaId: 1,
        nombre: 'Sala 1',
        estado: 'esperando',
        limitePreguntas: 10,
        tokenCompartido: 'abc-123',
        createdAt: new Date('2024-01-01'),
        deletedAt: null,
        participantes: [],
        rondas: [],
      };
      mockPrismaService.salas.findUnique.mockResolvedValue(mockSala);

      const result = await service.obtenerPorId(1);

      expect(result.rondaActiva).toBeNull();
    });
  });
});
