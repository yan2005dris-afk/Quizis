import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../domain/repositories/session.repository';
import type {
  CreateSessionData,
  UpdateSessionData,
} from '../domain/repositories/session.repository';
import { CreateSessionUseCase } from './use-cases/create-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { UpdateSessionUseCase } from './use-cases/update-session.use-case';
import { RevokeSessionUseCase } from './use-cases/revoke-session.use-case';
import { ListSessionsByUserUseCase } from './use-cases/list-sessions-by-user.use-case';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly updateSessionUseCase: UpdateSessionUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly listSessionsByUserUseCase: ListSessionsByUserUseCase,
  ) {}

  async createSession(data: CreateSessionData) {
    return this.createSessionUseCase.execute(data);
  }

  async getSession(usuarioId: number, sesionId: string) {
    return this.getSessionUseCase.execute(usuarioId, sesionId);
  }

  async getSessionById(sesionId: string) {
    return this.sessionRepo.findById(sesionId);
  }

  async updateSession(sesionId: string, data: UpdateSessionData) {
    return this.updateSessionUseCase.execute(sesionId, data);
  }

  async revokeSession(sesionId: string) {
    return this.revokeSessionUseCase.execute(sesionId);
  }

  async listSessionsByUser(usuarioId: number) {
    return this.listSessionsByUserUseCase.execute(usuarioId);
  }
}
