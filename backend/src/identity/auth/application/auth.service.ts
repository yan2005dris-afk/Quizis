import { Injectable } from '@nestjs/common';
import { LoginUserDto } from '../interfaces/dto/login-user.dto';
import { RegisterDto } from '../interfaces/dto/register.dto';
import { RegisterUseCase } from './use-cases/register.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshAccessTokenUseCase } from './use-cases/refresh-access-token.use-case';

@Injectable()
export class AuthService {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshAccessTokenUseCase,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  async login(loginUserDto: LoginUserDto, ip?: string, userAgent?: string) {
    return this.loginUseCase.execute(loginUserDto, ip, userAgent);
  }

  async refreshAccessToken(
    sessionId: string,
    refreshToken: string,
    ip: string = 'unknown',
    userAgent: string = 'unknown',
    userId: number,
  ) {
    return this.refreshUseCase.execute(
      sessionId,
      refreshToken,
      ip,
      userAgent,
      userId,
    );
  }

  async logout(sessionId: string) {
    await this.logoutUseCase.execute(sessionId);
  }
}
