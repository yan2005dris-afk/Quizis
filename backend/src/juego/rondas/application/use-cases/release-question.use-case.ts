import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoomStateCacheService } from '../../../shared/room-state/room-state-cache.service';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';
import { GameEvents } from '../../../../core/common/events/game-events.types';

/**
 * Shape of the authoritative question stored in cache and forwarded to the
 * gateway. `opciones[i].esCorrecta` is the ONLY place where the correct flag
 * lives — it must never come from a client request, otherwise students can
 * see the answer before answering (sent in the pregunta_liberada broadcast).
 */
export interface ActiveQuestionAuthoritative {
  preguntaId: number;
  bancoId: number;
  texto: string;
  nivel: number;
  feedbackCorrecto: string | null;
  feedbackIncorrecto: string | null;
  opciones: Array<{
    opcionId: number;
    texto: string;
    esCorrecta: boolean;
  }>;
}

@Injectable()
export class ReleaseQuestionUseCase {
  private readonly logger = new Logger(ReleaseQuestionUseCase.name);

  constructor(
    private readonly cacheService: RoomStateCacheService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    tokenCompartido: string,
    preguntaId: number,
  ): Promise<{ success: true; preguntaId: number }> {
    this.logger.log(
      `Liberando pregunta para sala ${tokenCompartido}: ${preguntaId}`,
    );

    // 0. Guard against "current question still active" — only `null` (never
    //    released) or `answered` (previous one done) lets a new release through.
    const status = await this.cacheService.getQuestionStatus(tokenCompartido);
    if (status === 'released') {
      throw new BadRequestException(
        'No se puede liberar una nueva pregunta hasta que la actual sea respondida.',
      );
    }

    // 1. Load the authoritative question + options from the DB. The
    //    `esCorrecta` flag from the client request is intentionally NOT
    //    accepted here — the DB is the only source of truth.
    const preguntaDb = await this.prisma.preguntas.findFirst({
      where: { preguntaId, deletedAt: null },
      include: {
        opciones: {
          where: { deletedAt: null },
          orderBy: { opcionId: 'asc' },
        },
      },
    });

    if (!preguntaDb) {
      throw new NotFoundException(
        `Pregunta ${preguntaId} no encontrada o fue eliminada.`,
      );
    }
    if (preguntaDb.opciones.length === 0) {
      throw new BadRequestException(
        `Pregunta ${preguntaId} no tiene opciones cargadas.`,
      );
    }

    const preguntaAutoritativa: ActiveQuestionAuthoritative = {
      preguntaId: preguntaDb.preguntaId,
      bancoId: preguntaDb.bancoId,
      texto: preguntaDb.texto,
      nivel: preguntaDb.nivel,
      feedbackCorrecto: preguntaDb.feedbackCorrecto,
      feedbackIncorrecto: preguntaDb.feedbackIncorrecto,
      opciones: preguntaDb.opciones.map((o) => ({
        opcionId: o.opcionId,
        texto: o.texto,
        esCorrecta: o.esCorrecta,
      })),
    };

    // 2. Cache the authoritative version (with `esCorrecta`) so that
    //    SubmitAnswerWebsocket can grade correctly.
    await this.cacheService.setActiveQuestion(
      tokenCompartido,
      preguntaAutoritativa,
    );

    // 3. Emit the event with the authoritative version. The gateway
    //    SANITIZES (strips `esCorrecta`) before broadcasting to clients.
    this.eventEmitter.emit(GameEvents.RONDAS.PREGUNTA_LIBERADA, {
      tokenCompartido,
      pregunta: preguntaAutoritativa,
    });

    return { success: true, preguntaId };
  }
}
