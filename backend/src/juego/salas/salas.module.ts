import { Module } from '@nestjs/common';
import { SalasService } from './salas.service';
import { SalasController } from './salas.controller';
import { CreateSalaUseCase } from './use-cases/create-sala.use-case';
import { UpdateEstadoSalaUseCase } from './use-cases/update-estado-sala.use-case';
import { ValidateTokenSalaUseCase } from './use-cases/validate-token-sala.use-case';
import { ListBancosDisponiblesUseCase } from './use-cases/list-bancos-disponibles.use-case';
import { GetSalaDetailsUseCase } from './use-cases/get-sala-details.use-case';
import { UpdateConfiguracionSalaUseCase } from './use-cases/update-configuracion-sala.use-case';
import { AuthModule } from '../../identity/auth/auth.module';

/**
 * Módulo de Salas de Juego.
 *
 * Registra el controlador, el servicio fachada y los casos de uso
 * necesarios para la gestión completa del ciclo de vida de una sala:
 * creación con token JWT de invitación, validación de token,
 * selección aleatoria de preguntas y transición de estados.
 *
 * Importa AuthModule para reutilizar JwtModule (firma y verificación de JWT).
 */
@Module({
  imports: [AuthModule],
  controllers: [SalasController],
  providers: [
    SalasService,
    CreateSalaUseCase,
    UpdateEstadoSalaUseCase,
    ValidateTokenSalaUseCase,
    ListBancosDisponiblesUseCase,
    GetSalaDetailsUseCase,
    UpdateConfiguracionSalaUseCase,
  ],
})
export class SalasModule {}
