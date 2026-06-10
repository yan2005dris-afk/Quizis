import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepo: jest.Mocked<UserRepository>;
  let roleRepo: jest.Mocked<RoleRepository>;

  const mockUserRepo = {
    findByEmailIncludingDeleted: jest.fn(),
    create: jest.fn(),
  };

  const mockRoleRepo = {
    findById: jest.fn(),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: RoleRepository, useValue: mockRoleRepo },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    userRepo = module.get(UserRepository);
    roleRepo = module.get(RoleRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create user with default role when rolId not provided', async () => {
    const dto = {
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
    };

    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue({
      rolId: 1,
      nombre: 'user',
      deletedAt: null,
    } as any);
    userRepo.create.mockResolvedValue({
      usuarioId: 1,
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
      rolId: 1,
      avatar: null,
    } as any);

    const result = await useCase.execute(dto);

    expect(result).toEqual({
      usuarioId: 1,
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
      avatar: null,
      rol: {
        rolId: 1,
        nombre: 'user',
      },
    });
    expect(roleRepo.findByName).toHaveBeenCalledWith('user');
  });

  it('should fail if default user role is soft-deleted', async () => {
    const dto = {
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
    };
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'No existe el rol por defecto "user".',
    );
    expect(roleRepo.findByName).toHaveBeenCalledWith('user');
  });

  it('should use provided rolId when specified', async () => {
    const dto = {
      email: 'admin@example.com',
      nombres: 'Admin',
      apellidos: 'User',
      telefono: '0998765432',
      rolId: 2,
    };
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findById.mockResolvedValue({
      rolId: 2,
      nombre: 'admin',
      deletedAt: null,
    } as any);
    userRepo.create.mockResolvedValue({
      usuarioId: 2,
      email: 'admin@example.com',
      nombres: 'Admin',
      apellidos: 'User',
      telefono: '0998765432',
      rolId: 2,
      avatar: null,
    } as any);

    const result = await useCase.execute(dto);

    expect(result.rol).toEqual({ rolId: 2, nombre: 'admin' });
    expect(roleRepo.findById).toHaveBeenCalledWith(2);
  });

  it('should throw error if default user role is missing', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '0991234567',
      }),
    ).rejects.toThrow('No existe el rol por defecto "user".');
  });

  it('should throw NotFoundException if provided rolId does not exist', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '0991234567',
        rolId: 999,
      }),
    ).rejects.toThrow('Rol no encontrado o eliminado');
  });

  it('should throw NotFoundException if provided rolId is soft-deleted', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findById.mockResolvedValue({
      rolId: 2,
      deletedAt: new Date(),
    } as any);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '0991234567',
        rolId: 2,
      }),
    ).rejects.toThrow('Rol no encontrado o eliminado');
  });

  it('should throw BadRequestException for invalid Ecuador phone', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '+5491155555555',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for empty nombres', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: '',
        apellidos: 'User',
        telefono: '0991234567',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for whitespace-only nombres', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: '   ',
        apellidos: 'User',
        telefono: '0991234567',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException if email already exists (active)', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue({
      usuarioId: 1,
      email: 't@t.com',
      deletedAt: null,
    } as any);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '0991234567',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException with specific message if email exists but deleted', async () => {
    userRepo.findByEmailIncludingDeleted.mockResolvedValue({
      usuarioId: 1,
      email: 't@t.com',
      deletedAt: new Date('2024-01-01'),
    } as any);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '0991234567',
      }),
    ).rejects.toThrow('pertenece a un usuario eliminado');
  });
});
