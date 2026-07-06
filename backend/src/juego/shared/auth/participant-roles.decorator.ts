import { SetMetadata } from '@nestjs/common';
import type { ParticipantRole } from '../../../core/common/types/auth-request.types';

export const PARTICIPANT_ROLES_KEY = 'participantRoles';

/**
 * Marks a controller method (or class) with the set of participant roles allowed
 * to invoke it. Read by 'ParticipantRoleGuard' via 'Reflector.getAllAndOverride'.
 *
 * Method-level overrides class-level. If absent on either, 'ParticipantRoleGuard'
 * fails closed with 403 (defense in depth — never grant access without explicit policy).
 */
export const ParticipantRoles = (
  ...roles: ParticipantRole[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(PARTICIPANT_ROLES_KEY, roles);
