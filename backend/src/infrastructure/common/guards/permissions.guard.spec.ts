import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should work when user.permisos is an array (FIXED BEHAVIOR)', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          user: {
            usersId: 1,
            permisos: [{ recurso: 'test', accion: 'read' }],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    reflector.get = jest
      .fn()
      .mockReturnValue({ recurso: 'test', accion: 'read' });

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException when user has no matching permissions', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          user: {
            usersId: 1,
            permisos: [{ recurso: 'other', accion: 'read' }],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    reflector.get = jest
      .fn()
      .mockReturnValue({ recurso: 'test', accion: 'read' });

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not identified', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockContext)).toThrow(
      'Usuario no identificado',
    );
  });

  it('should infer permissions when no decorator is present', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn().mockReturnValue({ name: 'ClientesController' }),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'POST',
          user: {
            usersId: 1,
            permisos: [{ recurso: 'clientes', accion: 'create' }],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    reflector.get = jest.fn().mockReturnValue(null);

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
