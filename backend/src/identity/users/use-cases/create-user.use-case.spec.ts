import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    roles: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    usuarios: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    prisma = module.get<PrismaService>(PrismaService);
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
    mockPrisma.roles.findFirst.mockResolvedValue({ rolId: 1, nombre: 'user' });
    mockPrisma.usuarios.create.mockResolvedValue({
      usuarioId: 1,
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
      rolId: 1,
      avatar: null,
    });

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
    expect(mockPrisma.roles.findFirst).toHaveBeenCalledWith({
      where: { nombre: 'user', deletedAt: null },
    });
  });

  it('should fail if default user role is soft-deleted', async () => {
    const dto = {
      email: 'test@example.com',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '0991234567',
    };
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
    mockPrisma.roles.findFirst.mockResolvedValue(null); // Filtered by deletedAt: null

    await expect(useCase.execute(dto)).rejects.toThrow(
      'No existe el rol por defecto "user".',
    );
    expect(mockPrisma.roles.findFirst).toHaveBeenCalledWith({
      where: { nombre: 'user', deletedAt: null },
    });
  });

  it('should use provided rolId when specified', async () => {
    const dto = {
      email: 'admin@example.com',
      nombres: 'Admin',
      apellidos: 'User',
      telefono: '0998765432',
      rolId: 2,
    };
    mockPrisma.roles.findUnique.mockResolvedValue({
      rolId: 2,
      nombre: 'admin',
      deletedAt: null,
    });
    mockPrisma.usuarios.create.mockResolvedValue({
      usuarioId: 2,
      email: 'admin@example.com',
      nombres: 'Admin',
      apellidos: 'User',
      telefono: '0998765432',
      rolId: 2,
      avatar: null,
    });

    const result = await useCase.execute(dto);

    expect(result.rol).toEqual({ rolId: 2, nombre: 'admin' });
    expect(mockPrisma.roles.findUnique).toHaveBeenCalledWith({
      where: { rolId: 2 },
    });
  });

  it('should throw error if default user role is missing', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
    mockPrisma.roles.findFirst.mockResolvedValue(null);
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
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
    mockPrisma.roles.findUnique.mockResolvedValue(null);
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

  it('should throw BadRequestException for invalid Ecuador phone', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
    await expect(
      useCase.execute({
        email: 't@t.com',
        nombres: 'Test',
        apellidos: 'User',
        telefono: '+5491155555555', // Teléfono argentino - inválido
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for empty nombres', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
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
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
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
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      email: 't@t.com',
      deletedAt: null,
    });
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
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      usuarioId: 1,
      email: 't@t.com',
      deletedAt: new Date('2024-01-01'),
    });
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
