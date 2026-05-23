import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn(),
            users: jest.fn(),
            user: jest.fn(),
            updateUser: jest.fn(),
            softDeleteUser: jest.fn(),
            getEffectivePermissions: jest.fn(),
            findMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call userService.createUser with correct data', async () => {
      const createUserDto = {
        email: 'test@example.com',
        clave: 'password123',
      };
      const mockUser = { usuarioId: 1, email: 'test@example.com' };

      jest.spyOn(userService, 'createUser').mockResolvedValue(mockUser as any);

      const result = await controller.create(createUserDto as any);

      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should call userService.users with pagination params', async () => {
      const mockResult = { data: [], meta: {} };

      jest.spyOn(userService, 'users').mockResolvedValue(mockResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(userService.users).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call userService.user with correct id', async () => {
      const userId = 1;
      const mockUser = { usuarioId: userId, email: 'test@example.com' };

      jest.spyOn(userService, 'user').mockResolvedValue(mockUser as any);

      const result = await controller.findOne(userId);

      expect(userService.user).toHaveBeenCalledWith({ usuarioId: userId });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findMe', () => {
    it('should call userService.findMe with correct usersId', async () => {
      const usersId = 1;
      const mockProfile = {
        usuarioId: usersId,
        email: 'test@t.com',
        role: { nombre: 'admin' },
      };

      jest.spyOn(userService, 'findMe').mockResolvedValue(mockProfile as any);

      const result = await controller.findMe(usersId);

      expect(userService.findMe).toHaveBeenCalledWith(usersId);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateUser', () => {
    it('should call userService.updateUser with correct data', async () => {
      const userId = 1;
      const updateUserDto = {
        email: 'newemail@example.com',
        clave: 'secret',
        rolId: 2,
      };
      const mockUpdatedUser = {
        usuarioId: userId,
        email: 'newemail@example.com',
      };

      jest
        .spyOn(userService, 'updateUser')
        .mockResolvedValue(mockUpdatedUser as any);

      const result = await controller.updateUser(userId, updateUserDto);

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { usuarioId: userId },
        data: updateUserDto,
      });
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('remove', () => {
    it('should call userService.softDeleteUser with correct id', async () => {
      const userId = 1;
      const mockResult = { deleted: true };

      jest.spyOn(userService, 'softDeleteUser').mockResolvedValue(mockResult);

      const result = await controller.remove(userId);

      expect(userService.softDeleteUser).toHaveBeenCalledWith({
        usuarioId: userId,
      });
      expect(result).toEqual(mockResult);
    });
  });
});
