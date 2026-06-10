import { Injectable } from '@nestjs/common';
import { SessionsService } from '../../../sessions/application/sessions.service';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Revoca una sesión en BD (logout).
   */
  async execute(sessionId: string) {
    await this.sessionsService.revokeSession(sessionId);
  }
}
