import { Injectable } from '@nestjs/common';
import {
  SessionRepository,
} from '../../domain/repositories/session.repository';
import type { UpdateSessionData } from '../../domain/repositories/session.repository';

@Injectable()
export class UpdateSessionUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(sesionId: string, data: UpdateSessionData) {
    return this.sessionRepo.update(sesionId, data);
  }
}
