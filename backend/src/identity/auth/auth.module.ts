import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './application/auth.service';
import { AuthController } from './interfaces/auth.controller';
import { UserModule } from '../users/user.module';
import { SessionsModule } from '../sessions/sessions.module';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenStrategy } from './infrastructure/strategies/refresh.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../infrastructure/common/guards/permissions.guard';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshAccessTokenUseCase } from './application/use-cases/refresh-access-token.use-case';
import type { StringValue } from 'ms';
import { IdentityInfrastructureModule } from '../infrastructure/identity-infrastructure.module';

@Module({
  imports: [
    IdentityInfrastructureModule,
    forwardRef(() => UserModule),
    SessionsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>(
            'JWT_ACCESS_EXPIRES_IN',
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    RegisterUseCase,
    LogoutUseCase,
    LoginUseCase,
    RefreshAccessTokenUseCase,
  ],
  exports: [
    JwtModule,
    RegisterUseCase,
    LogoutUseCase,
    LoginUseCase,
    RefreshAccessTokenUseCase,
  ],
})
export class AuthModule {}
