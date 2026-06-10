import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(usuarioId: number, sesionId: string) {
    const session = await this.sessionRepo.findByUserAndSession(
      usuarioId,
      sesionId,
    );
    if (!session || session.revocado || session.expiraEn < new Date()) {
      return null;
    }
    return session;
  }
}
