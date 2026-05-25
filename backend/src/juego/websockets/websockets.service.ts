import { Injectable } from '@nestjs/common';
import { JoinRoomUseCase } from './use-cases/join-room.use-case';
import { HandleDisconnectUseCase } from './use-cases/handle-disconnect.use-case';
import { ProcessAudienceVoteUseCase, VotePayload } from './use-cases/process-audience-vote.use-case';

@Injectable()
export class WebsocketsService {
  constructor(
    private readonly joinRoomUseCase: JoinRoomUseCase,
    private readonly handleDisconnectUseCase: HandleDisconnectUseCase,
    private readonly processAudienceVoteUseCase: ProcessAudienceVoteUseCase,
  ) {}

  async joinRoom(payload: { tokenCompartido: string; nombre: string; socketId: string }) {
    return this.joinRoomUseCase.execute(payload);
  }

  async handleDisconnect(info: { tokenCompartido: string; nickname: string; socketId: string }) {
    return this.handleDisconnectUseCase.execute(info);
  }

  async processVote(payload: VotePayload) {
    return this.processAudienceVoteUseCase.execute(payload);
  }
}
