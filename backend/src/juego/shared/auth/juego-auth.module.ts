import { Module } from '@nestjs/common';
import { AuthModule } from '../../../identity/auth/auth.module';
import { ParticipantRoleGuard } from './participant-role.guard';

/**
 * Provides per-sala participant authorization for the 4 public REST endpoints
 * (chat, votos, respuestas, comodines). Re-exports `AuthModule` so that
 * `JwtService` (used by `ParticipantRoleGuard.tryResolveAdmin` for
 * `jwtService.verifyAsync`) is available to consumers.
 * ConfigService is global.
 *
 * Mounted by ChatModule, VotosModule (which wraps RespuestasModule), and
 * ComodinesModule via their `imports` array.
 */
@Module({
  imports: [AuthModule],
  providers: [ParticipantRoleGuard],
  exports: [ParticipantRoleGuard, AuthModule],
})
export class JuegoAuthModule {}
