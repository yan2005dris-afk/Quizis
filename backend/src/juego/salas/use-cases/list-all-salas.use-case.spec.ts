import { Test, TestingModule } from '@nestjs/testing';
import { ListAllSalasUseCase } from './list-all-salas.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

describe('ListAllSalasUseCase', () => {
  let useCase: ListAllSalasUseCase;

  const mockPrisma = {
    salas: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAllSalasUseCase,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    useCase = module.get<ListAllSalasUseCase>(ListAllSalasUseCase);
    jest.clearAllMocks();
  });

  it('should map BORRADOR to borrador', async () => {
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 1,
        nombre: 'S1',
        estado: 'BORRADOR',
        createdAt: new Date(),
        _count: { participantes: 0 },
      },
    ]);

    const result = await useCase.execute(1);
    expect(result[0].estado).toBe('borrador');
  });

  it('should map ESPERANDO_ALUMNOS to esperando', async () => {
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 2,
        nombre: 'S2',
        estado: 'ESPERANDO_ALUMNOS',
        createdAt: new Date(),
        _count: { participantes: 2 },
      },
    ]);

    const result = await useCase.execute(1);
    expect(result[0].estado).toBe('esperando');
  });

  it('should map EN_VIVO to jugando', async () => {
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 3,
        nombre: 'S3',
        estado: 'EN_VIVO',
        createdAt: new Date(),
        _count: { participantes: 3 },
      },
    ]);

    const result = await useCase.execute(1);
    expect(result[0].estado).toBe('jugando');
  });

  it('should map FINALIZADO to terminado', async () => {
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 4,
        nombre: 'S4',
        estado: 'FINALIZADO',
        createdAt: new Date(),
        _count: { participantes: 1 },
      },
    ]);

    const result = await useCase.execute(1);
    expect(result[0].estado).toBe('terminado');
  });

  it('should sort results: jugando → esperando → borrador → terminado', async () => {
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 1,
        nombre: 'Borrador',
        estado: 'BORRADOR',
        createdAt: new Date('2024-01-01'),
        _count: { participantes: 0 },
      },
      {
        salaId: 2,
        nombre: 'Jugando',
        estado: 'EN_VIVO',
        createdAt: new Date('2024-01-02'),
        _count: { participantes: 5 },
      },
      {
        salaId: 3,
        nombre: 'Esperando',
        estado: 'ESPERANDO_ALUMNOS',
        createdAt: new Date('2024-01-03'),
        _count: { participantes: 2 },
      },
      {
        salaId: 4,
        nombre: 'Terminado',
        estado: 'FINALIZADO',
        createdAt: new Date('2024-01-04'),
        _count: { participantes: 1 },
      },
    ]);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(4);
    expect(result[0].estado).toBe('jugando');
    expect(result[1].estado).toBe('esperando');
    expect(result[2].estado).toBe('borrador');
    expect(result[3].estado).toBe('terminado');
  });

  it('should include salaId, nombre, participantes, and creadoEn', async () => {
    const now = new Date();
    mockPrisma.salas.findMany.mockResolvedValue([
      {
        salaId: 1,
        nombre: 'S1',
        estado: 'EN_VIVO',
        createdAt: now,
        _count: { participantes: 5 },
      },
    ]);

    const result = await useCase.execute(1);

    expect(result[0]).toEqual({
      salaId: 1,
      nombre: 'S1',
      estado: 'jugando',
      participantes: 5,
      creadoEn: now.toISOString(),
    });
  });
});
