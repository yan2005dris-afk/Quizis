import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';
import type { CreateSessionData } from '../../domain/repositories/session.repository';

@Injectable()
export class CreateSessionUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(data: CreateSessionData) {
    return this.sessionRepo.create(data);
  }
}
