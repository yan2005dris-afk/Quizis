import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from '../infrastructure/guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../infrastructure/common/guards/permissions.guard';
import { RequiredPermission } from '../../../infrastructure/common/decorators/require-permission.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { CookieOptions, Response } from 'express';
import type {
  LoginRequest,
  RefreshRequest,
} from './types/auth-controller.types';
import { REFRESH_TOKEN_MAX_AGE_MS } from 'src/infrastructure/config/app.constants';
import { CookieValue } from 'src/infrastructure/common/decorators/cookie-value.decorator';
import { RequiredStringPipe } from 'src/infrastructure/common/pipes/required-string.pipe';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registrar un nuevo usuario en el sistema.
   * Requiere autenticación JWT y permiso 'users:create'.
   */
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea un nuevo usuario en el sistema. Requiere permiso users:create.',
  })
  @ApiBody({ type: RegisterDto, description: 'Datos del usuario a registrar' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        usersId: 1,
        email: 'nuevo@jasrapo.com',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Sin permiso users:create',
  })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission('users', 'create')
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Iniciar sesión en el sistema.
   * Retorna un accessToken JWT y guarda un refreshToken en cookie.
   */
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al usuario y retorna un token de acceso JWT. El refreshToken se almacena en una cookie httpOnly.',
  })
  @ApiBody({
    type: LoginUserDto,
    description: 'Credenciales del usuario (email y contraseña)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        sid: 'session-id-123',
        sub: 1,
        email: 'admin@jasrapo.com',
        nombre: 'Admin',
        rolId: 1,
        nombreRol: 'Administrador',
        avatar: 'https://example.com/avatar.png',
        createdAt: '2024-01-15T10:30:00Z',
        expiresAt: '2024-01-15T11:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 401, description: 'Autenticación fallida' })
  @Post('/login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: LoginRequest,
    @CookieValue('refreshToken') existingRefreshTokenValue: unknown,
    @Res() res: Response,
  ) {
    const ip = req.ip ?? 'unknown';
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';
    const result = await this.authService.login(loginUserDto, ip, userAgent);

    // Solo guardar refreshToken en cookie, accessToken va en el payload
    const refreshCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.json({
      accessToken: result.accessToken,
      sid: result.sid,
      sub: result.sub,
      email: result.email,
      nombre: result.nombre,
      rolId: result.rolId,
      nombreRol: result.nombreRol,
      avatar: result.avatar,
      createdAt: result.accessTokenInfo.iatDate,
      expiresAt: result.accessTokenInfo.expDate,
    });
  }

  /**
   * Refrescar el token de acceso.
   * Usa el refreshToken de la cookie para generar un nuevo accessToken.
   */
  @ApiOperation({
    summary: 'Refrescar token de acceso',
    description:
      'Genera un nuevo token de acceso usando el refreshToken almacenado en cookies.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Token refrescado exitosamente',
    schema: {
      example: {
        message: 'Token refrescado correctamente',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @Req() req: RefreshRequest,
    @CookieValue('refreshToken', new RequiredStringPipe('refreshToken'))
    refreshToken: string,
    @Res() res: Response,
  ) {
    const { sessionsId, usersId, sub } = req.user;
    const ip = req.ip ?? 'unknown';
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

    // Usa usersId si existe, si no sub (por compatibilidad)
    const userId = typeof usersId !== 'undefined' ? usersId : sub;
    const tokens = await this.authService.refreshAccessToken(
      sessionsId,
      refreshToken,
      ip,
      userAgent,
      userId,
    );

    const refreshCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
    res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
    res.json({
      message: 'Token refrescado correctamente',
      accessToken: tokens.accessToken,
      createdAt: tokens.accessTokenInfo.iatDate,
      expiresAt: tokens.accessTokenInfo.expDate,
    });
  }

  /**
   * Cerrar sesión.
   * Elimina la sesión actual y limpia la cookie de refreshToken.
   */
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Cierra la sesión actual del usuario y elimina el refreshToken de la cookie.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Sesión cerrada correctamente',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  async logout(@Req() req: RefreshRequest, @Res() res: Response) {
    const { sessionsId } = req.user;

    // Marcar la sesión como revocada en BD
    await this.authService.logout(sessionsId);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Sesión cerrada correctamente' });
  }
}
