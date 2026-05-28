import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RefreshAccessTokenUseCase } from './refresh-access-token.use-case';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from '../../sessions/sessions.service';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('RefreshAccessTokenUseCase', () => {
  let useCase: RefreshAccessTokenUseCase;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionsService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshAccessTokenUseCase,
        {
          provide: PrismaService,
          useValue: {
            usuarios: {
              findUnique: jest.fn(),
            },
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
            getSession: jest.fn(),
            updateSession: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<RefreshAccessTokenUseCase>(RefreshAccessTokenUseCase);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    sessionsService = module.get(SessionsService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should throw UnauthorizedException if session expired', async () => {
      sessionsService.getSession.mockResolvedValue({
        revocado: false,
        expiraEn: new Date(Date.now() - 1000),
      } as any);

      await expect(
        useCase.execute('sid', 'rt', 'ip', 'ua', 1),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh tokens successfully', async () => {
      const mockSession = {
        sesionId: 'sid',
        hashRefreshToken: 'hash',
        revocado: false,
        expiraEn: new Date(Date.now() + 100000),
      };

      sessionsService.getSession.mockResolvedValue(mockSession as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.usuarios.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
      });
      jwtService.signAsync.mockResolvedValue('new-token');
      jwtService.decode.mockReturnValue({ iat: 100, exp: 200 });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await useCase.execute('sid', 'rt', 'ip', 'ua', 1);

      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-token',
        accessTokenInfo: {
          iat: 100,
          exp: 200,
          iatDate: expect.any(String),
          expDate: expect.any(String),
        },
      });
      expect(sessionsService.updateSession).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if session not found', async () => {
      sessionsService.getSession.mockResolvedValue(null);
      await expect(useCase.execute('sid', 'rt', 'ip', 'ua', 1)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if session revoked', async () => {
      sessionsService.getSession.mockResolvedValue({ revocado: true } as any);
      await expect(useCase.execute('sid', 'rt', 'ip', 'ua', 1)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token invalid', async () => {
      sessionsService.getSession.mockResolvedValue({
        revocado: false,
        expiraEn: new Date(Date.now() + 1000),
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(useCase.execute('sid', 'rt', 'ip', 'ua', 1)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found in database', async () => {
      sessionsService.getSession.mockResolvedValue({
        revocado: false,
        expiraEn: new Date(Date.now() + 100000),
        hashRefreshToken: 'hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute('sid', 'rt', 'ip', 'ua', 1),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException when session update fails', async () => {
      sessionsService.getSession.mockResolvedValue({
        revocado: false,
        expiraEn: new Date(Date.now() + 100000),
        hashRefreshToken: 'hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.usuarios.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
      });
      jwtService.signAsync.mockResolvedValue('new-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      sessionsService.updateSession.mockRejectedValue(new Error('DB Error'));

      await expect(
        useCase.execute('sid', 'rt', 'ip', 'ua', 1),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
