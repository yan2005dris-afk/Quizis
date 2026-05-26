import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateSessionUseCase } from './use-cases/create-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { UpdateSessionUseCase } from './use-cases/update-session.use-case';
import { RevokeSessionUseCase } from './use-cases/revoke-session.use-case';
import { ListSessionsByUserUseCase } from './use-cases/list-sessions-by-user.use-case';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly updateSessionUseCase: UpdateSessionUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly listSessionsByUserUseCase: ListSessionsByUserUseCase,
  ) {}

  async createSession(data: Prisma.SesionesCreateInput) {
    return this.createSessionUseCase.execute(data);
  }

  async getSession(usuarioId: number, sesionId: string) {
    return this.getSessionUseCase.execute(usuarioId, sesionId);
  }

  async getSessionById(sesionId: string) {
    return this.prisma.sesiones.findUnique({ where: { sesionId } });
  }

  async updateSession(sesionId: string, data: Prisma.SesionesUpdateInput) {
    return this.updateSessionUseCase.execute(sesionId, data);
  }

  async revokeSession(sesionId: string) {
    return this.revokeSessionUseCase.execute(sesionId);
  }

  async listSessionsByUser(usuarioId: number) {
    return this.listSessionsByUserUseCase.execute(usuarioId);
  }
}
