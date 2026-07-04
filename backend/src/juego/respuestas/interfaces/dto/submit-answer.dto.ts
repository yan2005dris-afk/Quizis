import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Body for `POST /api/v1/salas/:salaId/respuestas`.
 *
 * `nickname` is the per-sala identity of the student (from `participantes.nickname`).
 * The REST endpoint cannot derive this from the JWT alone because the JWT
 * payload contains `email` and `usuarioId` but not the nickname. The frontend
 * sends it explicitly. Server-side validation checks that the nickname
 * corresponds to a participant of the sala with rol='estudiante' before
 * processing.
 */
export class SubmitAnswerDto {
  @IsInt()
  @IsPositive()
  rondaId: number;

  @IsInt()
  @IsPositive()
  preguntaId: number;

  @IsInt()
  @IsPositive()
  opcionId: number;

  @IsString()
  @MaxLength(64)
  nickname: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  comodinUsado?: string;
}
