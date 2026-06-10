import { Test, TestingModule } from '@nestjs/testing';
import { GetParticipantsWithRolesUseCase } from './get-participants-with-roles.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

describe('GetParticipantsWithRolesUseCase', () => {
  let useCase: GetParticipantsWithRolesUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
    participantes: { findMany: jest.fn() },
  };

  const mockSala = { salaId: 1, tokenCompartido: 'token-abc' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetParticipantsWithRolesUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<GetParticipantsWithRolesUseCase>(
      GetParticipantsWithRolesUseCase,
    );
    jest.clearAllMocks();
    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
  });

  it('sala no existe → todos con rol default', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    const result = await useCase.execute('token-xyz', ['Juan', 'Maria']);

    expect(result).toEqual([
      { id: 'Juan', nombre: 'Juan', puntaje: 0, rol: 'observador' },
      { id: 'Maria', nombre: 'Maria', puntaje: 0, rol: 'observador' },
    ]);
    expect(mockPrisma.participantes.findMany).not.toHaveBeenCalled();
  });

  it('sala no existe con Host-* → rol admin en default', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    const result = await useCase.execute('token-xyz', ['Host-Admin', 'Juan']);

    expect(result[0].rol).toBe('admin');
    expect(result[1].rol).toBe('observador');
  });

  it('todos los nicknames en DB → retorna con roles de DB', async () => {
    mockPrisma.participantes.findMany.mockResolvedValue([
      { nickname: 'Juan', rol: 'estudiante' },
      { nickname: 'Maria', rol: 'observador' },
    ]);

    const result = await useCase.execute('token-abc', ['Juan', 'Maria']);

    expect(result.find((p) => p.id === 'Juan')?.rol).toBe('estudiante');
    expect(result.find((p) => p.id === 'Maria')?.rol).toBe('observador');
  });

  it('nickname en DB + nickname no en DB → mix correcto', async () => {
    mockPrisma.participantes.findMany.mockResolvedValue([
      { nickname: 'Juan', rol: 'estudiante' },
    ]);

    const result = await useCase.execute('token-abc', ['Juan', 'Carlos']);

    expect(result.find((p) => p.id === 'Juan')?.rol).toBe('estudiante');
    expect(result.find((p) => p.id === 'Carlos')?.rol).toBe('observador');
  });

  it('Host-* siempre rol admin, aunque esté en DB', async () => {
    mockPrisma.participantes.findMany.mockResolvedValue([
      { nickname: 'Host-Admin', rol: 'observador' },
    ]);

    const result = await useCase.execute('token-abc', ['Host-Admin']);

    expect(result[0].rol).toBe('admin');
  });

  it('array vacío → retorna array vacío', async () => {
    mockPrisma.participantes.findMany.mockResolvedValue([]);

    const result = await useCase.execute('token-abc', []);

    expect(result).toEqual([]);
  });

  it('puntaje siempre es 0', async () => {
    mockPrisma.participantes.findMany.mockResolvedValue([
      { nickname: 'Juan', rol: 'estudiante' },
    ]);

    const result = await useCase.execute('token-abc', ['Juan']);

    expect(result[0].puntaje).toBe(0);
  });
});
