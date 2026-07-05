import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

// Domain Services
import { SalasService } from '../../salas/application/salas.service';
import { ChatService } from '../../chat/application/chat.service';
import { ComodinesService } from '../../comodines/application/comodines.service';

// WebSocket Use Cases
import { HandleJoinRoomWebsocket } from '../../salas/infrastructure/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from '../../salas/infrastructure/websockets/handle-disconnect.websocket';
import { ProcessAudienceVoteWebsocket } from '../../votos/infrastructure/websockets/process-audience-vote.websocket';
import { ActivateCallJokerWebsocket } from '../../comodines/infrastructure/websockets/activate-call-joker.websocket';
import { SendHintWebsocket } from '../../comodines/infrastructure/websockets/send-hint.websocket';

// Infrastructure / Common
import { GameEvents } from '../../../core/common/events/game-events.types';
import type { ConsensusEvaluatedEvent } from '../../../core/common/events/game-events.types';
import type { VotePayload } from '../../votos/infrastructure/websockets/process-audience-vote.websocket';

// WebSocket Infrastructure
import { RoomBroadcasterService } from './room-broadcaster.service';
import { SocketMapService } from './socket-map.service';
import { DistributedTimerService } from './distributed-timer.service';
import { createSocketIoRedisAdapter } from './redis-io-adapter.util';

type ParticipantInfo = {
  id: string;
  nombre: string;
  puntaje: number;
  rol: string;
};
type VoteDistribution = { total: number; [letra: string]: number };
type ConsensusInput = {
  type?: string;
  status?: string;
  votosRecibidos?: number;
  totalRequeridos?: number;
  winningOpcionId?: number;
  esCorrecta?: boolean | null;
  feedback?: string | null;
};

@WebSocketGateway({ cors: { origin: '*' } })
export class JuegoGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(JuegoGateway.name);

  /**
   * Debounce de broadcast: acumula distribución y emite cada 500ms por sala.
   * Intentionally kept in-memory per design decision (cosmetic tradeoff).
   */
  private readonly pendingBroadcasts = new Map<
    string,
    { distribucion: VoteDistribution; timer: NodeJS.Timeout }
  >();

  private scheduleBroadcast(
    tokenCompartido: string,
    distribucion: VoteDistribution,
  ): void {
    const existing = this.pendingBroadcasts.get(tokenCompartido);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.roomBroadcaster.broadcastToRoom(
        tokenCompartido,
        'voto_recibido',
        distribucion,
      );
      this.pendingBroadcasts.delete(tokenCompartido);
    }, 500);

    this.pendingBroadcasts.set(tokenCompartido, { distribucion, timer });
  }

  private flushBroadcast(tokenCompartido: string): void {
    const pending = this.pendingBroadcasts.get(tokenCompartido);
    if (pending) {
      clearTimeout(pending.timer);
      this.roomBroadcaster.broadcastToRoom(
        tokenCompartido,
        'voto_recibido',
        pending.distribucion,
      );
      this.pendingBroadcasts.delete(tokenCompartido);
    }
  }

  constructor(
    private readonly salasService: SalasService,
    private readonly chatService: ChatService,
    private readonly comodinesService: ComodinesService,
    private readonly handleJoinRoom: HandleJoinRoomWebsocket,
    private readonly handleDisconnectWebsocket: HandleDisconnectWebsocket,
    private readonly processAudienceVote: ProcessAudienceVoteWebsocket,
    private readonly activateCallJokerWebsocket: ActivateCallJokerWebsocket,
    private readonly sendHintWebsocket: SendHintWebsocket,
    private readonly roomBroadcaster: RoomBroadcasterService,
    private readonly socketMapService: SocketMapService,
    private readonly distributedTimerService: DistributedTimerService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  afterInit(server: Server): void {
    // Initialize broadcaster before any client connects
    this.roomBroadcaster.setServer(server);

    // Attach Redis adapter for cross-instance pub/sub (uses a dedicated client pair)
    const adapter = createSocketIoRedisAdapter(process.env.REDIS_URL);
    if (adapter) {
      server.adapter(adapter);
      this.logger.log('Redis adapter attached to Socket.IO server');
    } else {
      this.logger.log('Running in single-instance mode (no Redis adapter)');
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const info = await this.socketMapService.get(client.id);
    if (info) {
      const result = await this.handleDisconnectWebsocket.execute({
        ...info,
        socketId: client.id,
      });
      await this.socketMapService.delete(client.id);

      // Stop timer if the room is now empty
      const remainingInRoom = await this.socketMapService.getRoomSize(
        info.tokenCompartido,
      );
      if (remainingInRoom === 0) {
        await this.distributedTimerService.detenerTimer(info.tokenCompartido);
      }

      const participantesDb = await this.salasService.getParticipantsWithRoles(
        info.tokenCompartido,
        result.participants,
      );
      this.roomBroadcaster.broadcastToRoom(
        result.tokenCompartido,
        'participantes',
        participantesDb,
      );
    } else {
      this.logger.log(`Cliente desconectado sin registro previo: ${client.id}`);
    }
  }

  // ─── Events Listeners ──────────────────────────────────────────────────────

  @OnEvent('comodin.ia.suggestion')
  handleIaSuggestionBroadcast(payload: {
    preguntaId: number;
    literal: string;
    explicacion: string;
    tokenCompartido: string;
  }) {
    this.roomBroadcaster.broadcastToRoom(
      payload.tokenCompartido,
      'ia_sugerencia_recibida',
      {
        preguntaId: payload.preguntaId,
        literal: payload.literal,
        explicacion: payload.explicacion,
      },
    );
  }

  @OnEvent(GameEvents.VOTOS.VOTO_PUBLICO_RECIBIDO)
  handlePublicoVoteBroadcast(payload: {
    tokenCompartido: string;
    resultado: any;
  }) {
    this.roomBroadcaster.broadcastToRoom(
      payload.tokenCompartido,
      'voto_recibido',
      payload.resultado,
    );
  }

  @OnEvent(GameEvents.VOTOS.CONSENSO_EVALUADO)
  handleConsensusEvaluated(event: ConsensusEvaluatedEvent) {
    void this.emitConsensusResult(
      event.tokenCompartido,
      event.preguntaId,
      event.result,
    );
  }

  /**
   * Fired by UpdateEstadoSalaUseCase when a room transitions to EN_VIVO.
   * Broadcasts `info_ronda` so the frontend updates the header ("Esperando
   * información de la ronda..." goes away) and the active-question state.
   */
  @OnEvent('sala.iniciada')
  handleSalaIniciada(payload: {
    tokenCompartido: string;
    infoRonda: { ronda: number; totalRondas: number; premio: string };
  }) {
    this.roomBroadcaster.broadcastToRoom(
      payload.tokenCompartido,
      'info_ronda',
      payload.infoRonda,
    );
    this.logger.log(
      `[SALA:INICIADA] Broadcast info_ronda for ${payload.tokenCompartido}`,
    );
  }

  // ─── Message Handlers ──────────────────────────────────────────────────────

  @SubscribeMessage('unirse_sala')
  async handleJoinRoomMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tokenCompartido: string; nombre: string },
  ) {
    const info = await this.handleJoinRoom.execute({
      ...payload,
      socketId: client.id,
    });

    void client.join(info.tokenCompartido);
    await this.socketMapService.set(client.id, {
      tokenCompartido: info.tokenCompartido,
      nickname: info.nickname,
    });

    const onlineNicknames = info.participants;
    const participantesDb = await this.salasService.getParticipantsWithRoles(
      info.tokenCompartido,
      onlineNicknames,
    );
    const yo = participantesDb.find(
      (p: ParticipantInfo) => p.nombre === info.nickname,
    );
    if (yo?.rol === 'estudiante') {
      const sala = await this.salasService.obtenerPorId(info.tokenCompartido);
      if (sala) {
        const onlineStudents = participantesDb.filter(
          (p: ParticipantInfo) =>
            p.rol === 'estudiante' && p.nombre !== info.nickname,
        ).length;
        if (onlineStudents >= sala.maxEstudiantes) {
          this.logger.log(
            `[JOIN] Cupo de estudiantes alcanzado. ${info.nickname} pasa a observador.`,
          );
          await this.salasService.updateParticipantRole(
            info.tokenCompartido,
            info.nickname,
            'observador',
            onlineNicknames,
          );
          const updatedList = await this.salasService.getParticipantsWithRoles(
            info.tokenCompartido,
            onlineNicknames,
          );
          this.roomBroadcaster.broadcastToRoom(
            info.tokenCompartido,
            'participantes',
            updatedList,
          );
          return;
        }
      }
    }

    this.roomBroadcaster.broadcastToRoom(
      info.tokenCompartido,
      'participantes',
      participantesDb,
    );

    const bloqueados = await this.salasService.getBlockedComodines(
      info.tokenCompartido,
    );
    client.emit('comodines_bloqueados', bloqueados);

    const mensajesChat = await this.chatService.getChatMessages(
      info.tokenCompartido,
    );
    if (mensajesChat.length > 0) {
      client.emit('mensaje_chat', mensajesChat);
    }
  }

  

  

  // Removed in N1 PR1 (sdd/quizis-rest-n1-mutations AC-N1-26):
  //   - handlePreguntaLiberada (pregunta_liberada) → REST POST /api/v1/salas/by-token/:salaId/preguntas/liberar

  

  

  

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async emitConsensusResult(
    token: string,
    preguntaId: number,
    result: ConsensusInput,
  ): Promise<void> {
    const type = result.type ?? result.status;
    switch (type) {
      case 'pending':
        this.roomBroadcaster.broadcastToRoom(token, 'voto_confirmado', {
          preguntaId,
          votosRecibidos: result.votosRecibidos,
          totalRequeridos: result.totalRequeridos,
        });
        break;

      case 'majority':
      case 'single':
        await this.distributedTimerService.detenerTimer(token);
        this.roomBroadcaster.broadcastToRoom(token, 'pregunta_respondida', {
          preguntaId,
          opcionId: result.winningOpcionId,
          esCorrecta: result.esCorrecta ?? null,
          feedback: result.feedback ?? null,
        });
        break;

      case 'no-majority':
        this.roomBroadcaster.broadcastToRoom(token, 'revoto_solicitado', {
          preguntaId,
          motivo: 'sin_mayoria',
        });
        break;
    }
  }

  /**
   * O(1) async reverse lookup delegated to SocketMapService.
   * MUST be awaited at every call site — returns Promise<string|undefined>.
   */
  private async findSocketId(
    nickname: string,
    tokenCompartido: string,
  ): Promise<string | undefined> {
    return this.socketMapService.findSocketId(nickname, tokenCompartido);
  }
}
