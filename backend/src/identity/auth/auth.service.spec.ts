import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RegisterUseCase } from './use-cases/register.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshAccessTokenUseCase } from './use-cases/refresh-access-token.use-case';

describe('AuthService', () => {
  let service: AuthService;
  let registerUseCase: jest.Mocked<RegisterUseCase>;
  let loginUseCase: jest.Mocked<LoginUseCase>;
  let logoutUseCase: jest.Mocked<LogoutUseCase>;
  let refreshUseCase: jest.Mocked<RefreshAccessTokenUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: RegisterUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: LoginUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: LogoutUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RefreshAccessTokenUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    registerUseCase = module.get(RegisterUseCase);
    loginUseCase = module.get(LoginUseCase);
    logoutUseCase = module.get(LogoutUseCase);
    refreshUseCase = module.get(RefreshAccessTokenUseCase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to RegisterUseCase', async () => {
      const dto = {
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      } as any;
      await service.register(dto);
      expect(registerUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should delegate to LoginUseCase', async () => {
      const dto = { email: 'test@test.com', password: 'Password123!' };
      await service.login(dto, '127.0.0.1', 'UA');
      expect(loginUseCase.execute).toHaveBeenCalledWith(dto, '127.0.0.1', 'UA');
    });
  });

  describe('refreshAccessToken', () => {
    it('should delegate to RefreshAccessTokenUseCase', async () => {
      await service.refreshAccessToken('sid', 'rt', 'ip', 'ua', 1);
      expect(refreshUseCase.execute).toHaveBeenCalledWith(
        'sid',
        'rt',
        'ip',
        'ua',
        1,
      );
    });
  });

  describe('logout', () => {
    it('should delegate to LogoutUseCase', async () => {
      await service.logout('sid');
      expect(logoutUseCase.execute).toHaveBeenCalledWith('sid');
    });
  });
});
