import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketsService } from './websockets.service';
import { JoinRoomUseCase } from './use-cases/join-room.use-case';
import { HandleDisconnectUseCase } from './use-cases/handle-disconnect.use-case';
import { ProcessAudienceVoteUseCase } from './use-cases/process-audience-vote.use-case';

describe('WebsocketsService', () => {
  let service: WebsocketsService;
  let joinRoomUseCase: JoinRoomUseCase;
  let handleDisconnectUseCase: HandleDisconnectUseCase;
  let processAudienceVoteUseCase: ProcessAudienceVoteUseCase;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketsService,
        { provide: JoinRoomUseCase, useValue: mockUseCase },
        { provide: HandleDisconnectUseCase, useValue: mockUseCase },
        { provide: ProcessAudienceVoteUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<WebsocketsService>(WebsocketsService);
    joinRoomUseCase = module.get<JoinRoomUseCase>(JoinRoomUseCase);
    handleDisconnectUseCase = module.get<HandleDisconnectUseCase>(
      HandleDisconnectUseCase,
    );
    processAudienceVoteUseCase = module.get<ProcessAudienceVoteUseCase>(
      ProcessAudienceVoteUseCase,
    );
  });

  it('should call joinRoomUseCase', async () => {
    const payload = { tokenCompartido: 'T1', nombre: 'U1', socketId: 'S1' };
    await service.joinRoom(payload);
    expect(joinRoomUseCase.execute).toHaveBeenCalledWith(payload);
  });

  it('should call handleDisconnectUseCase', async () => {
    const info = { tokenCompartido: 'T1', nickname: 'U1', socketId: 'S1' };
    await service.handleDisconnect(info);
    expect(handleDisconnectUseCase.execute).toHaveBeenCalledWith(info);
  });

  it('should call processAudienceVoteUseCase', async () => {
    const payload = { token: 'T1', participanteId: 1, opcionId: 2 } as any;
    await service.processVote(payload);
    expect(processAudienceVoteUseCase.execute).toHaveBeenCalledWith(payload);
  });
});
