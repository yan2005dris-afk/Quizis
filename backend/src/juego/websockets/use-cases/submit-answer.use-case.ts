import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RoomStateCacheUseCase } from '../../../infrastructure/cache/use-cases/room-state-cache.use-case';
import { RecordAnswerUseCase } from '../../respuestas/use-cases/record-answer.use-case';

export interface AnswerPayload {
  tokenCompartido: string;
  rondaId: number;
  preguntaId: number;
  opcionId: number;
  comodinUsado?: string;
}

@Injectable()
export class SubmitAnswerUseCase {
  private readonly logger = new Logger(SubmitAnswerUseCase.name);

  constructor(
    private readonly cacheService: RoomStateCacheUseCase,
    private readonly recordAnswerUseCase: RecordAnswerUseCase,
  ) {}

  async execute(payload: AnswerPayload) {
    this.logger.log(
      `Procesando respuesta para sala ${payload.tokenCompartido}, pregunta ${payload.preguntaId}`,
    );

    // 1. Obtener la pregunta activa de Redis para validación ultra-rápida
    const activeQuestion = await this.cacheService.getActiveQuestion(
      payload.tokenCompartido,
    );

    if (!activeQuestion || activeQuestion.preguntaId !== payload.preguntaId) {
      throw new BadRequestException(
        'La pregunta no está activa o el ID no coincide.',
      );
    }

    // 2. Verificar estado en Redis
    const status = await this.cacheService.getQuestionStatus(
      payload.tokenCompartido,
    );
    if (status === 'answered') {
      throw new BadRequestException('Esta pregunta ya fue respondida.');
    }

    // 3. Validar si la opción es correcta
    const opcion = activeQuestion.opciones.find(
      (o: any) => o.opcionId === payload.opcionId,
    );
    if (!opcion) {
      throw new NotFoundException(
        'La opción seleccionada no pertenece a esta pregunta.',
      );
    }

    const esCorrecta = opcion.esCorrecta;

    // 4. Persistir en Base de Datos (Seguridad final)
    await this.recordAnswerUseCase.execute({
      rondaId: payload.rondaId,
      preguntaId: payload.preguntaId,
      opcionId: payload.opcionId,
      esCorrecta,
      comodinUsado: payload.comodinUsado ?? null,
    });

    // 5. Actualizar estado en Redis a 'answered'
    await this.cacheService.setQuestionStatus(
      payload.tokenCompartido,
      'answered',
    );

    this.logger.log(`Respuesta registrada. Correcta: ${esCorrecta}`);

    return {
      success: true,
      esCorrecta,
      message: esCorrecta ? '¡Respuesta correcta!' : 'Respuesta incorrecta.',
      feedback: esCorrecta
        ? activeQuestion.feedbackCorrecto
        : activeQuestion.feedbackIncorrecto,
    };
  }
}
