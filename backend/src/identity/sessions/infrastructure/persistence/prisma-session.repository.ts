import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import type {
  SessionRecord,
  CreateSessionData,
  UpdateSessionData,
} from '../../domain/repositories/session.repository';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateSessionData): Promise<SessionRecord> {
    const session = await this.prisma.sesiones.create({ data: data as any });
    return session as unknown as SessionRecord;
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const session = await this.prisma.sesiones.findUnique({
      where: { sesionId: id },
      include: {
        usuario: { select: { usuarioId: true, email: true } },
      },
    });
    return session as unknown as SessionRecord | null;
  }

  async findByUserAndSession(
    usuarioId: number,
    sesionId: string,
  ): Promise<SessionRecord | null> {
    const session = await this.prisma.sesiones.findFirst({
      where: { sesionId, usuarioId },
    });
    return session as unknown as SessionRecord | null;
  }

  async update(id: string, data: UpdateSessionData): Promise<void> {
    await this.prisma.sesiones.update({
      where: { sesionId: id },
      data: data as any,
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.sesiones.update({
      where: { sesionId: id },
      data: { revocado: true },
    });
  }

  async listByUser(usuarioId: number): Promise<SessionRecord[]> {
    const sessions = await this.prisma.sesiones.findMany({
      where: { usuarioId, revocado: false },
      orderBy: { createdAt: 'desc' },
    });
    return sessions as unknown as SessionRecord[];
  }
}
