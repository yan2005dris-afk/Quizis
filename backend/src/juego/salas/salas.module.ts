import { Module } from '@nestjs/common';
import { SalasController } from './interfaces/salas.controller';
import { SalasByTokenController } from './interfaces/controllers/salas-by-token.controller';
import { SalasService } from './application/salas.service';
import { ListAllSalasUseCase } from './application/use-cases/list-all-salas.use-case';
import { GetSalaLifelinesUseCase } from './application/use-cases/get-sala-lifelines.use-case';
import { RegenerateRoomTokenUseCase } from './application/use-cases/regenerate-room-token.use-case';
import { FinalizeRoomUseCase } from './application/use-cases/finalize-room.use-case';
import { CreateSalaUseCase } from './application/use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './application/use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './application/use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './application/use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './application/use-cases/get-sala-details.use-case';
import { UpdateConfiguracionSalaUseCase } from './application/use-cases/update-configuracion-sala.use-case';
import { JoinSalaUseCase } from './application/use-cases/join-sala.use-case';
import { GetInvitacionTokenUseCase } from './application/use-cases/get-invitacion-token.use-case';
import { UpdateParticipantRoleUseCase } from './application/use-cases/update-participant-role.use-case';
import { GetParticipantsWithRolesUseCase } from './application/use-cases/get-participants-with-roles.use-case';
import { RestartRoundUseCase } from './application/use-cases/restart-round.use-case';
import { ReactivateRoomUseCase } from './application/use-cases/reactivate-room.use-case';
import { HandleJoinRoomWebsocket } from './infrastructure/websockets/handle-join-room.websocket';
import { HandleDisconnectWebsocket } from './infrastructure/websockets/handle-disconnect.websocket';
import { ToggleRoomEnabledWebsocket } from './infrastructure/websockets/toggle-room-enabled.websocket';
import { AuthModule } from '../../identity/auth/auth.module';
import { CacheModule } from '../../core/cache/cache.module';
import { ChatModule } from '../chat/chat.module';
import { RondasModule } from '../rondas/rondas.module';
import { RoomStateModule } from '../shared/room-state/room-state.module';
import { RoomBroadcastModule } from '../infrastructure/websockets/room-broadcast.module';

@Module({
  imports: [
    AuthModule,
    CacheModule,
    ChatModule,
    RondasModule,
    RoomStateModule,
    RoomBroadcastModule,
  ],
  controllers: [SalasController, SalasByTokenController],
  providers: [
    SalasService,
    ListAllSalasUseCase,
    GetSalaLifelinesUseCase,
    RegenerateRoomTokenUseCase,
    FinalizeRoomUseCase,
    CreateSalaUseCase,
    UpdateEstadoSalaUseCase,
    ValidateTokenSalaUseCase,
    ListBancosDisponiblesUseCase,
    GetSalaDetailsUseCase,
    UpdateConfiguracionSalaUseCase,
    JoinSalaUseCase,
    GetInvitacionTokenUseCase,
    UpdateParticipantRoleUseCase,
    GetParticipantsWithRolesUseCase,
    RestartRoundUseCase,
    ReactivateRoomUseCase,
    HandleJoinRoomWebsocket,
    HandleDisconnectWebsocket,
    ToggleRoomEnabledWebsocket,
  ],
  exports: [
    SalasService,
    HandleJoinRoomWebsocket,
    HandleDisconnectWebsocket,
    ToggleRoomEnabledWebsocket,
    RoomStateModule,
  ],
})
export class SalasModule {}
