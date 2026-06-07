import { Test, TestingModule } from '@nestjs/testing';
import { EvaluateConsensusUseCase } from './evaluate-consensus.use-case';
import { ConsensusCacheService } from 'src/juego/websockets/cache/consensus-cache.service';

describe('EvaluateConsensusUseCase', () => {
  let useCase: EvaluateConsensusUseCase;

  const mockConsensusCache = {
    getVotes: jest.fn(),
    getRequired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateConsensusUseCase,
        { provide: ConsensusCacheService, useValue: mockConsensusCache },
      ],
    }).compile();

    useCase = module.get<EvaluateConsensusUseCase>(EvaluateConsensusUseCase);
    jest.clearAllMocks();
  });

  // ─── single: required.size === 1 ──────────────────────────────────────────

  describe('single (un único estudiante requerido)', () => {
    it('retorna type single con winningOpcionId del único voto', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(new Set(['alice']));
      mockConsensusCache.getVotes.mockResolvedValue(new Map([['alice', 10]]));

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('single');
      if (result.type === 'single') {
        expect(result.winningOpcionId).toBe(10);
      }
    });

    it('retorna single incluso si votos y requeridos son el mismo estudiante', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(new Set(['bob']));
      mockConsensusCache.getVotes.mockResolvedValue(new Map([['bob', 42]]));

      const result = await useCase.execute('token-abc', 2);

      expect(result.type).toBe('single');
      if (result.type === 'single') {
        expect(result.winningOpcionId).toBe(42);
      }
    });
  });

  // ─── pending: no todos los requeridos han votado ──────────────────────────

  describe('pending (aún no votaron todos)', () => {
    it('retorna pending si algún requerido no ha votado', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob', 'charlie']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(new Map([['alice', 10]]));

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('pending');
      if (result.type === 'pending') {
        expect(result.votosRecibidos).toBe(1);
        expect(result.totalRequeridos).toBe(3);
      }
    });

    it('retorna pending cuando 2 de 4 han votado pero coinciden (quórum parcial)', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob', 'charlie', 'diana']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 10],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('pending');
      if (result.type === 'pending') {
        expect(result.votosRecibidos).toBe(2);
        expect(result.totalRequeridos).toBe(4);
      }
    });
  });

  // ─── majority: >50% de acuerdo ────────────────────────────────────────────

  describe('majority (mayoría estricta)', () => {
    it('retorna majority cuando 2 de 3 votan la misma opción (>50%)', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob', 'charlie']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 10],
          ['charlie', 11],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('majority');
      if (result.type === 'majority') {
        expect(result.winningOpcionId).toBe(10);
        expect(result.votosRecibidos).toBe(3);
        expect(result.totalRequeridos).toBe(3);
      }
    });

    it('retorna majority cuando todos votan la misma opción', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 10],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('majority');
      if (result.type === 'majority') {
        expect(result.winningOpcionId).toBe(10);
      }
    });
  });

  // ─── no-majority: sin mayoría ─────────────────────────────────────────────

  describe('no-majority (sin mayoría estricta)', () => {
    it('retorna no-majority cuando votos están repartidos 1/1/1', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob', 'charlie']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 11],
          ['charlie', 12],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('no-majority');
      if (result.type === 'no-majority') {
        expect(result.votosRecibidos).toBe(3);
        expect(result.totalRequeridos).toBe(3);
      }
    });

    it('retorna no-majority en empate exacto 50% (2 de 4) — NO es mayoría estricta', async () => {
      // 50% es NOT > 50%, so it should NOT be majority
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['alice', 'bob', 'charlie', 'diana']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['alice', 10],
          ['bob', 10],
          ['charlie', 11],
          ['diana', 11],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      expect(result.type).toBe('no-majority');
    });

    it('retorna no-majority cuando hay 2 opciones con 2 votos c/u (empate 50/50)', async () => {
      mockConsensusCache.getRequired.mockResolvedValue(
        new Set(['a', 'b', 'c', 'd']),
      );
      mockConsensusCache.getVotes.mockResolvedValue(
        new Map([
          ['a', 10],
          ['b', 10],
          ['c', 20],
          ['d', 20],
        ]),
      );

      const result = await useCase.execute('token-abc', 1);

      // 2/4 = 50%, which is NOT > 50%
      expect(result.type).toBe('no-majority');
    });
  });
});
