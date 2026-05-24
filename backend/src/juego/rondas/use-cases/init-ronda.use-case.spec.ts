import { Test, TestingModule } from '@nestjs/testing';
import { InitRondaUseCase } from './init-ronda.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InitRondaUseCase', () => {
  let useCase: InitRondaUseCase;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitRondaUseCase,
        {
          provide: PrismaService,
          useValue: {
            salas: { findUnique: jest.fn() },
            participantes: { findUnique: jest.fn() },
            rondas: { count: jest.fn(), create: jest.fn() },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<InitRondaUseCase>(InitRondaUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should initialize a round successfully', async () => {
    // Arrange
    const salaId = 1;
    const participanteId = 1;

    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue({
      salaId,
      bancoId: 10,
      limitePreguntas: 5,
      estado: 'esperando',
    });

    (prismaService.participantes.findUnique as jest.Mock).mockResolvedValue({
      participanteId,
      salaId, // Must match
    });

    // Mock RAW SQL
    (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
      { pregunta_id: 101 },
      { pregunta_id: 102 },
    ]);

    (prismaService.rondas.count as jest.Mock).mockResolvedValue(0); // 0 previous rounds
    
    const mockCreatedRonda = {
      rondaId: 1,
      salaId,
      participanteId,
      numeroRonda: 1,
      estado: 'pendiente',
      preguntasAsignadas: [101, 102],
    };
    (prismaService.rondas.create as jest.Mock).mockResolvedValue(mockCreatedRonda);

    // Act
    const result = await useCase.execute(salaId, participanteId);

    // Assert
    expect(result.ronda).toEqual(mockCreatedRonda);
    expect(result.totalPreguntasSeleccionadas).toBe(2);
    expect(prismaService.$queryRaw).toHaveBeenCalled();
    expect(prismaService.rondas.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        numeroRonda: 1,
        preguntasAsignadas: [101, 102],
      }),
    });
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(1, 1)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if sala is finalizado', async () => {
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue({
      salaId: 1,
      estado: 'finalizado',
    });

    await expect(useCase.execute(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if raw query returns empty', async () => {
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue({
      salaId: 1,
      bancoId: 10,
      limitePreguntas: 5,
      estado: 'esperando',
    });

    (prismaService.participantes.findUnique as jest.Mock).mockResolvedValue({
      participanteId: 1,
      salaId: 1,
    });

    // Simulate empty bank
    (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

    await expect(useCase.execute(1, 1)).rejects.toThrow(BadRequestException);
  });
});
