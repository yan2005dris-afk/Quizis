import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import {
  ParticipanteInfo,
  ParticipantRequest,
  ParticipantRole,
} from '../../../core/common/types/auth-request.types';
import { PARTICIPANT_ROLES_KEY } from './participant-roles.decorator';

/**
 * Hybrid guard that authorizes a per-sala participant on a public REST endpoint.
 *
 * Resolution layers (in order):
 *   1. ADMIN BRANCH (JWT-bearing caller): if `Authorization: Bearer <token>` is
 *      present and verifies, the sala is looked up by `tokenCompartido` (= :salaId)
 *      and `sala.adminId === payload.sub` short-circuits to role='admin'. Any
 *      failure (no header, expired, invalid, sala not found, adminId mismatch)
 *      falls through to layer 2 — this guard NEVER returns 401 because the four
 *      target endpoints are public-by-design (joining participants don't carry JWT).
 *
 *   2. TOKENLESS BRANCH: reads `body.nickname`, looks up the sala by
 *      `tokenCompartido` then the participant by (salaId, nickname, deletedAt: null).
 *      Throws 400 for missing nickname, 404 for unknown participant (keeps status
 *      semantics from the current inline blocks — backward compatible).
 *
 *   3. ROLE CHECK: reads `@ParticipantRoles(...)` metadata. If missing → 403
 *      (fail-closed). If resolved role not in allowed set → 403.
 *
 * On success, attaches `request.participante = { role, participanteId?, userId? }`
 * so controllers / use-cases don't re-query.
 *
 * Logging: admin-branch failure → `logger.warn` (security telemetry). Tokenless
 * branch participant-not-found → silent (avoid log noise on typo'd nicknames).
 */
@Injectable()
export class ParticipantRoleGuard implements CanActivate {
  private readonly logger = new Logger(ParticipantRoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ParticipantRequest>();

    const tokenCompartido =
      this.readSalaIdFromParams(request) ?? this.readSalaIdFromBody(request);

    if (!tokenCompartido) {
      throw new ForbiddenException('salaId (tokenCompartido) requerido en URL');
    }

    const resolved: ParticipanteInfo | null = await this.tryResolveAdmin(
      request,
      tokenCompartido,
    );

    if (!resolved) {
      const tokenless = await this.resolveParticipant(request, tokenCompartido);
      request.participante = tokenless;
    } else {
      request.participante = resolved;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      PARTICIPANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Endpoint no tiene política de roles aplicada',
      );
    }

    if (!requiredRoles.includes(request.participante.role)) {
      throw new ForbiddenException(
        `Acceso denegado: rol ${request.participante.role} no está autorizado para este endpoint`,
      );
    }

    return true;
  }

  // ─── Layer 1: admin branch ─────────────────────────────────────
  private async tryResolveAdmin(
    request: ParticipantRequest,
    tokenCompartido: string,
  ): Promise<ParticipanteInfo | null> {
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    let payload: { sub?: number };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch (err) {
      this.logger.warn(
        `Admin branch: verifyAsync failed → falling through: ${(err as Error).message}`,
      );
      return null;
    }

    if (typeof payload.sub !== 'number') {
      this.logger.warn(
        `Admin branch: payload.sub is not a number (typeof=${typeof payload.sub}); sala=${tokenCompartido}`,
      );
      return null;
    }

    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
      select: { salaId: true, adminId: true },
    });

    if (!sala) {
      this.logger.warn(
        `Admin branch: sala not found for tokenCompartido (sub=${payload.sub})`,
      );
      return null;
    }

    if (sala.adminId !== payload.sub) {
      this.logger.warn(
        `Admin branch: usuario ${payload.sub} no es admin de la sala ${sala.salaId} (admin=${sala.adminId})`,
      );
      return null;
    }

    return { role: 'admin', userId: payload.sub };
  }

  // ─── Layer 2: tokenless branch ─────────────────────────────────
  private async resolveParticipant(
    request: ParticipantRequest,
    tokenCompartido: string,
  ): Promise<ParticipanteInfo> {
    const rawNickname = (request.body as { nickname?: string } | undefined)
      ?.nickname;
    if (!rawNickname || String(rawNickname).trim().length === 0) {
      throw new BadRequestException(
        'nickname es requerido para identificar al participante',
      );
    }
    const nickname = String(rawNickname).trim();

    const sala = await this.prisma.salas.findUnique({
      where: { tokenCompartido },
      select: { salaId: true },
    });
    if (!sala) throw new NotFoundException('Sala no encontrada');

    const participante = await this.prisma.participantes.findFirst({
      where: { salaId: sala.salaId, nickname, deletedAt: null },
      select: { participanteId: true, rol: true },
    });
    if (!participante) {
      throw new NotFoundException(
        'No eres participante de esta sala con ese nickname',
      );
    }

    const rol = participante.rol as ParticipantRole;
    if (rol !== 'estudiante' && rol !== 'observador') {
      // Defensive: DB schema allows 'admin' string but admin should never be a
      // participantes row. Treat as observador if a legacy row exists.
      this.logger.warn(
        `Participante ${participante.participanteId} tiene rol inesperado "${rol}" — tratando como observador`,
      );
      return {
        role: 'observador',
        participanteId: participante.participanteId,
      };
    }

    return { role: rol, participanteId: participante.participanteId };
  }

  private readSalaIdFromParams(
    request: ParticipantRequest,
  ): string | undefined {
    const raw = request.params?.salaId;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
    return undefined;
  }

  private readSalaIdFromBody(request: ParticipantRequest): string | undefined {
    const raw = (request.body as { salaId?: string } | undefined)?.salaId;
    return typeof raw === 'string' ? raw : undefined;
  }
}
