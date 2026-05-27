import { Injectable } from '@nestjs/common';
import { JoinRoomUseCase } from './use-cases/join-room.use-case';
import { HandleDisconnectUseCase } from './use-cases/handle-disconnect.use-case';
import {
  ProcessAudienceVoteUseCase,
  VotePayload,
} from './use-cases/process-audience-vote.use-case';
import { ReleaseQuestionUseCase } from './use-cases/release-question.use-case';
import {
  SubmitAnswerUseCase,
  AnswerPayload,
} from './use-cases/submit-answer.use-case';
import { ToggleRoomEnabledUseCase } from './use-cases/toggle-room-enabled.use-case';
import { SendMessageUseCase } from './use-cases/send-message.use-case';

@Injectable()
export class WebsocketsService {
  constructor(
    private readonly joinRoomUseCase: JoinRoomUseCase,
    private readonly handleDisconnectUseCase: HandleDisconnectUseCase,
    private readonly processAudienceVoteUseCase: ProcessAudienceVoteUseCase,
    private readonly releaseQuestionUseCase: ReleaseQuestionUseCase,
    private readonly submitAnswerUseCase: SubmitAnswerUseCase,
    private readonly toggleRoomEnabledUseCase: ToggleRoomEnabledUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
  ) {}

  async joinRoom(payload: {
    tokenCompartido: string;
    nombre: string;
    socketId: string;
  }) {
    return this.joinRoomUseCase.execute(payload);
  }

  async handleDisconnect(info: {
    tokenCompartido: string;
    nickname: string;
    socketId: string;
  }) {
    return this.handleDisconnectUseCase.execute(info);
  }

  async processVote(payload: VotePayload) {
    return this.processAudienceVoteUseCase.execute(payload);
  }

  async releaseQuestion(token: string, pregunta: any) {
    return this.releaseQuestionUseCase.execute(token, pregunta);
  }

  async submitAnswer(payload: AnswerPayload) {
    return this.submitAnswerUseCase.execute(payload);
  }

  async toggleRoomEnabled(token: string, enabled: boolean) {
    return this.toggleRoomEnabledUseCase.execute(token, enabled);
  }

  async sendMessage(payload: {
    tokenCompartido: string;
    nickname: string;
    texto: string;
    tipo: 'mensaje' | 'sugerencia';
  }) {
    return this.sendMessageUseCase.execute(payload);
  }
}
