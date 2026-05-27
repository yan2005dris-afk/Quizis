import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ValidateTokenSalaUseCase } from './validate-token-sala.use-case';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JoinSalaUseCase {
  private readonly logger = new Logger(JoinSalaUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validateTokenUseCase: ValidateTokenSalaUseCase,
    private readonly jwtService: JwtService,
  ) {}

  async execute(token: string, nickname: string) {
    this.logger.log(`Intento de unión a sala con nickname: ${nickname}`);

    // 1. Validar el token de invitación
    const salaInfo = await this.validateTokenUseCase.execute(token);

    // 2. Registrar/Upsert al participante en la sala
    const participante = await this.prisma.participantes.upsert({
      where: {
        salaId_nickname: {
          salaId: salaInfo.salaId,
          nickname: nickname,
        },
      },
      create: {
        salaId: salaInfo.salaId,
        nickname: nickname,
        rol: 'observador', // Por defecto entran como observadores
      },
      update: {
        deletedAt: null, // Si se había ido y vuelve
      },
    });

    // 3. Generar un token de sesión de participante (JWT ligero)
    // Este token identifica a este participante específico en esta sala
    const payload = {
      participanteId: participante.participanteId,
      salaId: salaInfo.salaId,
      nickname: participante.nickname,
      rol: participante.rol,
    };

    const sessionToken = this.jwtService.sign(payload, {
      expiresIn: '4h', // Suficiente para una partida
    });

    return {
      success: true,
      sessionToken,
      participante: {
        id: participante.participanteId,
        nickname: participante.nickname,
        rol: participante.rol,
      },
      sala: {
        id: salaInfo.salaId,
        nombre: salaInfo.nombre,
        tokenCompartido: salaInfo.tokenCompartido,
      },
    };
  }
}
