import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { GetEffectivePermissionsUseCase } from './use-cases/get-effective-permissions.use-case';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let getEffectivePermissionsUseCase: GetEffectivePermissionsUseCase;

  const mockPrismaService = {
    usuarios: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    roles: {
      findUnique: jest.fn(),
    },
    rolPermisos: {
      findMany: jest.fn(),
    },
  };

  const mockGetEffectivePermissionsUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CreateUserUseCase, useValue: {} },
        {
          provide: GetEffectivePermissionsUseCase,
          useValue: mockGetEffectivePermissionsUseCase,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    getEffectivePermissionsUseCase = module.get<GetEffectivePermissionsUseCase>(
      GetEffectivePermissionsUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('user', () => {
    it('should return user with mapped permissions and roles', async () => {
      const mockUser = {
        usuarioId: 1,
        email: 'test@test.com',
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '123456',
        avatar: null,
        rol: { rolId: 1, nombre: 'admin', deletedAt: null },
      };

      const mockRolePerms = [
        { permiso: { recurso: 'users', accion: 'write' } },
      ];

      mockPrismaService.usuarios.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rolPermisos.findMany.mockResolvedValue(mockRolePerms);

      const result = await service.user({ usuarioId: 1 });

      expect(result).toEqual({
        usuarioId: 1,
        email: 'test@test.com',
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '123456',
        avatar: null,
        rol: { rolId: 1, nombre: 'admin' },
        permisosRol: [{ recurso: 'users', accion: 'write' }],
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue(null);
      const result = await service.user({ usuarioId: 999 });
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {

    it('should throw NotFoundException if rolId is invalid (not found)', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue({
        usuarioId: 1,
        deletedAt: null,
      });
      mockPrismaService.roles.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser({
          where: { usuarioId: 1 },
          data: { rolId: 999 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if rolId is invalid (soft-deleted)', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue({
        usuarioId: 1,
        deletedAt: null,
      });
      mockPrismaService.roles.findUnique.mockResolvedValue({
        rolId: 2,
        deletedAt: new Date(),
      });

      await expect(
        service.updateUser({
          where: { usuarioId: 1 },
          data: { rolId: 2 },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should delegate to GetEffectivePermissionsUseCase and return wrapped response', async () => {
      const mockPerms = [{ recurso: 'test', accion: 'read' }];
      (getEffectivePermissionsUseCase.execute as jest.Mock).mockResolvedValue(
        mockPerms as any,
      );

      const result = await service.getEffectivePermissions(1);

      expect(result).toEqual({
        usuarioId: 1,
        permisos: mockPerms,
      });
      expect(getEffectivePermissionsUseCase.execute).toHaveBeenCalledWith(1);
    });
  });

  describe('findMe', () => {
    it('should return profile with rol info', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue({
        usuarioId: 1,
        email: 'test@test.com',
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '123456',
        avatar: { url: 'avatar.png' },
        rol: { rolId: 1, nombre: 'admin', deletedAt: null },
      });

      const result = await service.findMe(1);

      expect(result).toEqual({
        usuarioId: 1,
        email: 'test@test.com',
        nombre: 'John Doe',
        telefono: '123456',
        avatar: { url: 'avatar.png' },
        rol: { rolId: 1, nombre: 'admin' },
      });
    });

    it('should throw NotFoundException if profile user not found', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue(null);

      await expect(service.findMe(1)).rejects.toThrow(NotFoundException);
    });
  });
});
