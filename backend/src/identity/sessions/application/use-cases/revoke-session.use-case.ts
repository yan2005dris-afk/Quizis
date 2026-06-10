import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';

@Injectable()
export class RevokeSessionUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(sesionId: string) {
    return this.sessionRepo.revoke(sesionId);
  }
}
