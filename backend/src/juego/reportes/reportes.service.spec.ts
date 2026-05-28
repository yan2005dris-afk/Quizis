import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

describe('ReportesService', () => {
  let service: ReportesService;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if sala does not exist', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(service.obtenerEstadisticas(1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if sala has no rondas', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Test',
      createdAt: new Date(),
      admin: { email: 'admin@test.com' },
      rondas: [],
    });

    await expect(service.obtenerEstadisticas(1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should calculate porcentajeAcierto correctly for a round', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Test',
      createdAt: new Date(),
      admin: { email: 'admin@test.com' },
      rondas: [
        {
          numeroRonda: 1,
          participante: { nickname: 'Juan' },
          respuestas: [
            { esCorrecta: true, comodinUsado: null, pregunta: { preguntaId: 1, texto: 'P1' }, opcion: { texto: 'A', esCorrecta: true } },
            { esCorrecta: true, comodinUsado: null, pregunta: { preguntaId: 2, texto: 'P2' }, opcion: { texto: 'B', esCorrecta: true } },
            { esCorrecta: true, comodinUsado: null, pregunta: { preguntaId: 3, texto: 'P3' }, opcion: { texto: 'C', esCorrecta: true } },
            { esCorrecta: false, comodinUsado: null, pregunta: { preguntaId: 4, texto: 'P4' }, opcion: { texto: 'D', esCorrecta: false } },
          ],
          votos: [],
        },
      ],
    });

    const result = await service.obtenerEstadisticas(1);

    expect(result.rondas[0].correctas).toBe(3);
    expect(result.rondas[0].incorrectas).toBe(1);
    expect(result.rondas[0].totalPreguntas).toBe(4);
    expect(result.rondas[0].porcentajeAcierto).toBe(75.0);
  });

  it('should calculate porcentajeVotosPublico only when comodinUsado is publico', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Test',
      createdAt: new Date(),
      admin: { email: 'admin@test.com' },
      rondas: [
        {
          numeroRonda: 1,
          participante: { nickname: 'Juan' },
          respuestas: [
            {
              esCorrecta: true,
              comodinUsado: 'publico',
              pregunta: { preguntaId: 10, texto: 'P1' },
              opcion: { texto: 'A', esCorrecta: true },
            },
          ],
          votos: [
            { preguntaId: 10, opcion: { esCorrecta: true } },
            { preguntaId: 10, opcion: { esCorrecta: true } },
            { preguntaId: 10, opcion: { esCorrecta: false } },
            { preguntaId: 10, opcion: { esCorrecta: false } },
          ],
        },
      ],
    });

    const result = await service.obtenerEstadisticas(1);

    expect(result.rondas[0].preguntas[0].porcentajeVotosPublico).toBe(50.0);
  });

  it('should aggregate multiple rounds and count unique participants', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue({
      salaId: 1,
      nombre: 'Sala Multi',
      createdAt: new Date(),
      admin: { email: 'admin@test.com' },
      rondas: [
        {
          numeroRonda: 1,
          participante: { nickname: 'Juan' },
          respuestas: [
            { esCorrecta: true, comodinUsado: null, pregunta: { preguntaId: 1, texto: 'P1' }, opcion: { texto: 'A', esCorrecta: true } },
          ],
          votos: [],
        },
        {
          numeroRonda: 2,
          participante: { nickname: 'Maria' },
          respuestas: [
            { esCorrecta: false, comodinUsado: null, pregunta: { preguntaId: 1, texto: 'P1' }, opcion: { texto: 'B', esCorrecta: false } },
            { esCorrecta: true, comodinUsado: null, pregunta: { preguntaId: 2, texto: 'P2' }, opcion: { texto: 'A', esCorrecta: true } },
          ],
          votos: [],
        },
      ],
    });

    const result = await service.obtenerEstadisticas(1);

    expect(result.resumenGeneral.totalRondas).toBe(2);
    expect(result.resumenGeneral.participantes).toHaveLength(2);
    expect(result.resumenGeneral.participantes).toContain('Juan');
    expect(result.resumenGeneral.participantes).toContain('Maria');
    expect(result.resumenGeneral.totalPreguntasRespondidas).toBe(3);
    expect(result.resumenGeneral.totalCorrectas).toBe(2);
    expect(result.resumenGeneral.totalIncorrectas).toBe(1);
    expect(result.resumenGeneral.porcentajeGlobal).toBe(66.67);
  });
});
