import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/identity/users/user.module';
import { SessionsModule } from 'src/identity/sessions/sessions.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from '../../infrastructure/common/guards/permissions.guard';
import { RegisterUseCase } from './use-cases/register.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshAccessTokenUseCase } from './use-cases/refresh-access-token.use-case';
import type { StringValue } from 'ms';

@Module({
  imports: [
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
