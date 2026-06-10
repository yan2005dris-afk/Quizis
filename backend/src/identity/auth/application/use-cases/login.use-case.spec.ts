import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from '../../../sessions/application/sessions.service';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../users/domain/repositories/user.repository';

jest.mock('bcryptjs');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => 'test-uuid-1234-5678',
}));

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionsService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: UserRepository,
          useValue: {
            findByEmailIncludingDeleted: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createSession: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
    userRepo = module.get(UserRepository);
    jwtService = module.get(JwtService);
    sessionsService = module.get(SessionsService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create session with hashed refresh token', async () => {
      const mockUser = {
        usuarioId: 1,
        email: 'test@test.com',
        clave: 'hashed',
        deletedAt: null,
        nombres: 'Juan',
        apellidos: 'Perez',
        avatar: null,
        rolId: 1,
        rol: { nombre: 'admin', deletedAt: null },
      };

      userRepo.findByEmailIncludingDeleted.mockResolvedValue(mockUser as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jwtService.decode.mockReturnValue({
        iat: 100,
        exp: 200,
      });

      sessionsService.createSession.mockResolvedValue({} as any);

      await useCase.execute(
        {
          email: 'test@test.com',
          password: '123456',
        },
        '127.0.0.1',
        'Chrome',
      );

      expect(sessionsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sesionId: 'test-uuid-1234-5678',
          hashRefreshToken: 'hashed-refresh',
          direccionIp: '127.0.0.1',
          usuarioAgente: 'Chrome',
          revocado: false,
        }),
      );
    });

    it('should login successfully with minimal data retrieval', async () => {
      const loginDto = { email: 'test@jasrapo.com', password: 'Password123!' };

      // User data with merged profile fields
      const mockUser = {
        usuarioId: 1,
        email: 'test@jasrapo.com',
        clave: 'hashedPassword',
        deletedAt: null,
        nombres: 'Juan',
        apellidos: 'Pérez',
        avatar: { url: 'https://example.com/avatar.png', key: 'avatar.png' },
        rolId: 1,
        rol: { nombre: 'admin', deletedAt: null },
      };

      userRepo.findByEmailIncludingDeleted.mockResolvedValue(mockUser as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRefreshToken');

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jwtService.decode
        .mockReturnValueOnce({ iat: 1000, exp: 2000 })
        .mockReturnValueOnce({ iat: 1000, exp: 2000 });

      sessionsService.createSession.mockResolvedValue({} as any);

      const result = await useCase.execute(loginDto, '127.0.0.1', 'Chrome');

      expect(result).toMatchObject({
        sub: 1,
        email: 'test@jasrapo.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        nombre: 'Juan Pérez',
        avatar: 'avatar.png',
        rolId: 1,
        nombreRol: 'admin',
      });

      expect(sessionsService.createSession).toHaveBeenCalled();
      expect(userRepo.findByEmailIncludingDeleted).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);

      await expect(
        useCase.execute({ email: 'notfound@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is soft-deleted', async () => {
      userRepo.findByEmailIncludingDeleted.mockResolvedValue({
        usuarioId: 1,
        email: 'test@test.com',
        clave: 'hashed',
        deletedAt: new Date(),
      } as any);

      await expect(
        useCase.execute({ email: 'test@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password invalid', async () => {
      userRepo.findByEmailIncludingDeleted.mockResolvedValue({
        usuarioId: 1,
        email: 'test@test.com',
        clave: 'hashed',
        deletedAt: null,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        useCase.execute({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException when session creation fails', async () => {
      userRepo.findByEmailIncludingDeleted.mockResolvedValue({
        usuarioId: 1,
        email: 'test@test.com',
        clave: 'hashed',
        deletedAt: null,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

      sessionsService.createSession.mockRejectedValue(new Error('DB Error'));

      await expect(
        useCase.execute({ email: 'test@test.com', password: 'pass' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return null rolId and nombreRol when role is soft-deleted', async () => {
      const loginDto = { email: 'test@jasrapo.com', password: 'Password123!' };

      const mockUser = {
        usuarioId: 1,
        email: 'test@jasrapo.com',
        clave: 'hashedPassword',
        deletedAt: null,
        nombres: 'Juan',
        apellidos: 'Pérez',
        avatar: null,
        rolId: 1,
        rol: { nombre: 'admin', deletedAt: new Date() }, // Soft-deleted role
      };

      userRepo.findByEmailIncludingDeleted.mockResolvedValue(mockUser as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRefreshToken');

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jwtService.decode
        .mockReturnValueOnce({ iat: 1000, exp: 2000 })
        .mockReturnValueOnce({ iat: 1000, exp: 2000 });

      sessionsService.createSession.mockResolvedValue({} as any);

      const result = await useCase.execute(loginDto, '127.0.0.1', 'Chrome');

      expect(result).toMatchObject({
        sub: 1,
        email: 'test@jasrapo.com',
        rolId: null,
        nombreRol: null,
      });
    });
  });
});
