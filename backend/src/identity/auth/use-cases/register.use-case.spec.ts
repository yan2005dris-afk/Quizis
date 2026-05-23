import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RegisterUseCase } from './register.use-case';
import { UserService } from 'src/identity/users/user.service';
import { BadRequestException } from '@nestjs/common';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
            createUser: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should register a new user with required fields', async () => {
      userService.user.mockResolvedValue(null);
      userService.createUser.mockResolvedValue({
        usuarioId: 1,
        email: 'test@test.com',
        nombres: 'Juan',
        apellidos: 'Pérez',
        telefono: '+593991234567',
        avatar: null,
        rol: { rolId: 1, nombre: 'user' },
      });

      const result = await useCase.execute({
        email: 'test@test.com',
        nombres: 'Juan',
        apellidos: 'Pérez',
        telefono: '+593991234567',
      });

      expect(result.message).toBe('El registro fue exitoso');
      expect(userService.createUser).toHaveBeenCalledWith({
        email: 'test@test.com',
        nombres: 'Juan',
        apellidos: 'Pérez',
        telefono: '+593991234567',
      });
    });

    it('should throw BadRequestException if user exists', async () => {
      userService.user.mockResolvedValue({ usuarioId: 1 } as any);
      await expect(
        useCase.execute({
          email: 'test@test.com',
          nombres: 'Juan',
          apellidos: 'Pérez',
          telefono: '+593991234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if creation fails', async () => {
      userService.user.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(null as any);
      await expect(
        useCase.execute({
          email: 'test@test.com',
          nombres: 'Juan',
          apellidos: 'Pérez',
          telefono: '+593991234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass rolId when provided', async () => {
      userService.user.mockResolvedValue(null);
      userService.createUser.mockResolvedValue({
        usuarioId: 1,
        rol: { rolId: 2, nombre: 'admin' },
      } as any);

      await useCase.execute({
        email: 'admin@test.com',
        nombres: 'Admin',
        apellidos: 'User',
        telefono: '+593981234567',
        rolId: '2',
      });

      expect(userService.createUser).toHaveBeenCalledWith({
        email: 'admin@test.com',
        nombres: 'Admin',
        apellidos: 'User',
        telefono: '+593981234567',
        rolId: 2,
      });
    });
  });
});
