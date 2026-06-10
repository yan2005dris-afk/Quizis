import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserApplicationService } from './user-application.service';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { GetEffectivePermissionsUseCase } from './use-cases/get-effective-permissions.use-case';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userAppService: jest.Mocked<UserApplicationService>;
  let getEffectivePermissionsUseCase: jest.Mocked<GetEffectivePermissionsUseCase>;

  const mockGetEffectivePermissionsUseCase = {
    execute: jest.fn(),
  };

  const mockUserAppService = {
    findByUniqueInput: jest.fn(),
    findById: jest.fn(),
    findMe: jest.fn(),
    listUsers: jest.fn(),
    updateUser: jest.fn(),
    softDeleteUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserApplicationService, useValue: mockUserAppService },
        { provide: CreateUserUseCase, useValue: {} },
        {
          provide: GetEffectivePermissionsUseCase,
          useValue: mockGetEffectivePermissionsUseCase,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userAppService = module.get(UserApplicationService);
    getEffectivePermissionsUseCase = module.get(GetEffectivePermissionsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('user', () => {
    it('should return user with mapped permissions and roles', async () => {
      const mockResult = {
        usuarioId: 1,
        email: 'test@test.com',
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '123456',
        avatar: null,
        rol: { rolId: 1, nombre: 'admin' },
        permisosRol: [{ recurso: 'users', accion: 'write' }],
      };

      mockUserAppService.findByUniqueInput.mockResolvedValue(mockResult);

      const result = await service.user({ usuarioId: 1 });

      expect(result).toEqual(mockResult);
      expect(mockUserAppService.findByUniqueInput).toHaveBeenCalledWith({ usuarioId: 1 });
    });

    it('should return null if user not found', async () => {
      mockUserAppService.findByUniqueInput.mockResolvedValue(null);
      const result = await service.user({ usuarioId: 999 });
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUserAppService.updateUser.mockRejectedValue(
        new NotFoundException('Usuario no encontrado'),
      );

      await expect(
        service.updateUser({
          where: { usuarioId: 999 },
          data: { nombres: 'New Name' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is soft-deleted', async () => {
      mockUserAppService.updateUser.mockRejectedValue(
        new BadRequestException('No se puede modificar un usuario eliminado'),
      );

      await expect(
        service.updateUser({
          where: { usuarioId: 1 },
          data: { nombres: 'New Name' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if rolId is invalid', async () => {
      mockUserAppService.updateUser.mockRejectedValue(
        new NotFoundException('Rol no encontrado o eliminado'),
      );

      await expect(
        service.updateUser({
          where: { usuarioId: 1 },
          data: { rolId: 999 },
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
    it('should delegate to UserApplicationService.findMe', async () => {
      const mockProfile = {
        usuarioId: 1,
        email: 'test@test.com',
        nombre: 'John Doe',
        telefono: '123456',
        avatar: { url: 'avatar.png' },
        rol: { rolId: 1, nombre: 'admin' },
      };

      mockUserAppService.findMe.mockResolvedValue(mockProfile);

      const result = await service.findMe(1);

      expect(result).toEqual(mockProfile);
      expect(mockUserAppService.findMe).toHaveBeenCalledWith(1);
    });
  });
});
