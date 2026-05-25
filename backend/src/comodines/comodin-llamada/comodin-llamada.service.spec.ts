import { Test, TestingModule } from '@nestjs/testing';
import { ComodinLlamadaService } from './comodin-llamada.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ComodinLlamadaService', () => {
  let service: ComodinLlamadaService;

  const mockPrismaService = {
    extendedClient: {
      rondas: {
        findFirst: jest.fn(),
      },
      participantes: {
        findMany: jest.fn(),
      },
    },
  };

  /**
   * Configura el módulo de pruebas con PrismaService mockeado
   * y valida la correcta inicialización de ComodinLlamadaService.
   * @author Carlos Patiño
   * @date 2026-05-24
   */

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComodinLlamadaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ComodinLlamadaService>(ComodinLlamadaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seleccionarConsultorAleatorio', () => {
    it('debería retornar null si no hay una ronda activa en estado jugando', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockPrismaService.extendedClient.rondas.findFirst.mockResolvedValue(null);

      const result = await service.seleccionarConsultorAleatorio('token-123');

      expect(result).toBeNull();
      expect(mockPrismaService.extendedClient.rondas.findFirst).toHaveBeenCalledWith({
        where: {
          sala: { tokenCompartido: 'token-123' },
          estado: 'jugando',
        },
        include: {
          participante: true,
        },
      });
      expect(mockPrismaService.extendedClient.participantes.findMany).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('debería retornar null si no hay candidatos a consultor (observadores online)', async () => {
      const mockRondaActiva = {
        salaId: 10,
        participante: { nickname: 'estudiante1' },
      };
      mockPrismaService.extendedClient.rondas.findFirst.mockResolvedValue(mockRondaActiva);
      mockPrismaService.extendedClient.participantes.findMany.mockResolvedValue([]);

      const result = await service.seleccionarConsultorAleatorio('token-123');

      expect(result).toBeNull();
      expect(mockPrismaService.extendedClient.rondas.findFirst).toHaveBeenCalledWith({
        where: {
          sala: { tokenCompartido: 'token-123' },
          estado: 'jugando',
        },
        include: {
          participante: true,
        },
      });
      expect(mockPrismaService.extendedClient.participantes.findMany).toHaveBeenCalledWith({
        where: {
          salaId: 10,
          isOnline: true,
          rol: 'observador',
          nickname: {
            not: 'estudiante1',
          },
        },
      });
    });

    it('debería seleccionar determinísticamente el primer candidato usando Math.random mockeado', async () => {
      const mockRondaActiva = {
        salaId: 10,
        participante: { nickname: 'estudiante1' },
      };
      const mockCandidatos = [
        { participanteId: 1, nickname: 'consultor1' },
        { participanteId: 2, nickname: 'consultor2' },
        { participanteId: 3, nickname: 'consultor3' },
      ];
      mockPrismaService.extendedClient.rondas.findFirst.mockResolvedValue(mockRondaActiva);
      mockPrismaService.extendedClient.participantes.findMany.mockResolvedValue(mockCandidatos);

      // Mockear Math.random para retornar 0.1 (selecciona índice 0: 0.1 * 3 = 0.3 -> floor es 0)
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = await service.seleccionarConsultorAleatorio('token-123');

      expect(result).toEqual(mockCandidatos[0]);
      expect(mathRandomSpy).toHaveBeenCalled();

      mathRandomSpy.mockRestore();
    });

    it('debería seleccionar determinísticamente el último candidato usando Math.random mockeado', async () => {
      const mockRondaActiva = {
        salaId: 10,
        participante: { nickname: 'estudiante1' },
      };
      const mockCandidatos = [
        { participanteId: 1, nickname: 'consultor1' },
        { participanteId: 2, nickname: 'consultor2' },
        { participanteId: 3, nickname: 'consultor3' },
      ];
      mockPrismaService.extendedClient.rondas.findFirst.mockResolvedValue(mockRondaActiva);
      mockPrismaService.extendedClient.participantes.findMany.mockResolvedValue(mockCandidatos);

      // Mockear Math.random para retornar 0.99 (selecciona índice 2: 0.99 * 3 = 2.97 -> floor es 2)
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = await service.seleccionarConsultorAleatorio('token-123');

      expect(result).toEqual(mockCandidatos[2]);
      expect(mathRandomSpy).toHaveBeenCalled();

      mathRandomSpy.mockRestore();
    });
  });
});
