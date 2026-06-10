import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from '../../../sessions/application/sessions.service';
import type {
  JwtRefreshPayload,
  RequestWithCookies,
} from '../../interfaces/types/JwtRequest.types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sessionsService: SessionsService,
  ) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Session invalida');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: RequestWithCookies | undefined) =>
          this.getRefreshToken(request),
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtRefreshPayload) {
    const { sub: usuarioId, sid: sesionId, email } = payload;
    if (!usuarioId || !sesionId) {
      throw new UnauthorizedException('Session invalida');
    }
    const session = await this.sessionsService.getSession(usuarioId, sesionId);
    if (!session || session.revocado || session.expiraEn < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    return { sub: usuarioId, sessionsId: sesionId, email };
  }

  private getRefreshToken(
    request: RequestWithCookies | undefined,
  ): string | null {
    const cookies = request?.cookies as unknown;
    if (!cookies || typeof cookies !== 'object') {
      return null;
    }

    const maybeToken = (cookies as Record<string, unknown>).refreshToken;
    return typeof maybeToken === 'string' ? maybeToken : null;
  }
}
