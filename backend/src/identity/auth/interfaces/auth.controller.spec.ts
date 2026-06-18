import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../application/auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue({
              accessToken: 'token',
              user: { usersId: 1 },
            }),
            login: jest.fn().mockResolvedValue({
              accessToken: 'token',
              refreshToken: 'refresh',
              user: { usersId: 1 },
            }),
            refreshAccessToken: jest.fn().mockResolvedValue({
              accessToken: 'newToken',
              refreshToken: 'newRefresh',
            }),
            logout: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<jest.Mocked<AuthService>>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set refreshToken cookie on login', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        sid: 'sid',
        sub: 1,
        email: 'test@test.com',
        nombre: 'Juan',
        rolId: 1,
        nombreRol: 'admin',
        avatar: null,
        accessTokenInfo: {
          iatDate: 'date',
          expDate: 'date',
        },
      } as any);

      const req: any = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Chrome',
        },
      };

      const res: any = {
        cookie: jest.fn(),
        json: jest.fn(),
      };

      await controller.login(
        {
          email: 'test@test.com',
          password: '123456',
        } as any,
        req,
        undefined,
        res,
      );

      expect(authService.login).toHaveBeenCalled();

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh',
        expect.any(Object),
      );

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear refreshToken cookie and call authService.logout', async () => {
      const req: any = {
        user: { sessionsId: 'session-id-123' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Chrome' },
      };
      const res: any = {
        clearCookie: jest.fn(),
        json: jest.fn(),
      };

      await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('session-id-123');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada correctamente',
      });
    });
  });
});
