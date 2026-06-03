import { Injectable, Logger } from '@nestjs/common';
import { ConsensusCacheUseCase } from '../../../infrastructure/cache/use-cases/consensus-cache.use-case';

export type ConsensusResult =
  | { type: 'pending'; votosRecibidos: number; totalRequeridos: number }
  | {
      type: 'majority';
      winningOpcionId: number;
      votosRecibidos: number;
      totalRequeridos: number;
    }
  | { type: 'no-majority'; votosRecibidos: number; totalRequeridos: number }
  | { type: 'single'; winningOpcionId: number };

@Injectable()
export class EvaluateConsensusUseCase {
  private readonly logger = new Logger(EvaluateConsensusUseCase.name);

  constructor(private readonly consensusCache: ConsensusCacheUseCase) {}

  async execute(token: string, preguntaId: number): Promise<ConsensusResult> {
    const [votes, required] = await Promise.all([
      this.consensusCache.getVotes(token, preguntaId),
      this.consensusCache.getRequired(token, preguntaId),
    ]);

    const totalRequeridos = required.size;
    const votosRecibidos = votes.size;

    this.logger.log(
      `Evaluando consenso — token: ${token}, preguntaId: ${preguntaId}, votos: ${votosRecibidos}/${totalRequeridos}`,
    );

    // Single-student short-circuit: required set has exactly 1 member
    if (totalRequeridos === 1) {
      const winningOpcionId = votes.values().next().value as number;
      return { type: 'single', winningOpcionId };
    }

    // Pending: at least one required voter has NOT voted yet
    for (const nickname of required) {
      if (!votes.has(nickname)) {
        return { type: 'pending', votosRecibidos, totalRequeridos };
      }
    }

    // All required voters have voted — count votes per opcionId
    const tallies = new Map<number, number>();
    for (const opcionId of votes.values()) {
      tallies.set(opcionId, (tallies.get(opcionId) ?? 0) + 1);
    }

    // Find opcionId with strictly more than 50% of totalRequeridos
    for (const [opcionId, count] of tallies) {
      if (count > totalRequeridos / 2) {
        this.logger.log(
          `Mayoría encontrada: opcionId=${opcionId} con ${count}/${totalRequeridos} votos`,
        );
        return {
          type: 'majority',
          winningOpcionId: opcionId,
          votosRecibidos,
          totalRequeridos,
        };
      }
    }

    // No single option has majority
    return { type: 'no-majority', votosRecibidos, totalRequeridos };
  }
}
