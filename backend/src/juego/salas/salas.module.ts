import { Module } from '@nestjs/common';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';
import { ListAllSalasUseCase } from './use-cases/list-all-salas.use-case';
import { GetSalaLifelinesUseCase } from './use-cases/get-sala-lifelines.use-case';
import { RegenerateRoomTokenUseCase } from './use-cases/regenerate-room-token.use-case';
import { FinalizeRoomUseCase } from './use-cases/finalize-room.use-case';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './use-cases/get-sala-details.use-case';
import { UpdateConfiguracionSalaUseCase } from './use-cases/update-configuracion-sala.use-case';
import { JoinSalaUseCase } from './use-cases/join-sala.use-case';
import { GetInvitacionTokenUseCase } from './use-cases/get-invitacion-token.use-case';
import { UpdateParticipantRoleUseCase } from './use-cases/update-participant-role.use-case';
import { GetParticipantsWithRolesUseCase } from './use-cases/get-participants-with-roles.use-case';
import { RestartRoundUseCase } from './use-cases/restart-round.use-case';
import { AuthModule } from '../../identity/auth/auth.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [SalasController],
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
  ],
  exports: [SalasService],
})
export class SalasModule {}
