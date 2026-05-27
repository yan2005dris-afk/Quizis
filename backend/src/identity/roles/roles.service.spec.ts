import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateRoleUseCase } from './use-cases/create-role.use-case';
import { AssignPermissionToRoleUseCase } from './use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './use-cases/remove-permission-from-role.use-case';

describe('RolesService', () => {
  let service: RolesService;
  let createUseCase: CreateRoleUseCase;
  let prisma: PrismaService;

  const mockUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: {
            roles: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        { provide: CreateRoleUseCase, useValue: mockUseCase },
        { provide: AssignPermissionToRoleUseCase, useValue: mockUseCase },
        { provide: RemovePermissionFromRoleUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    createUseCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should delegate create to CreateRoleUseCase', async () => {
    const dto = { nombre: 'Role' } as any;
    await service.create(dto);
    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should filter deleted roles in findAll and exclude deletedAt', async () => {
    await service.findAll();
    expect(prisma.roles.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      select: {
        rolId: true,
        nombre: true,
      },
    });
  });

  it('should throw NotFoundException in findOne if role does not exist', async () => {
    (prisma.roles.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException in findOne if role is deleted', async () => {
    (prisma.roles.findUnique as jest.Mock).mockResolvedValue({
      rolId: 1,
      nombre: 'test',
      deletedAt: new Date(),
    });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });

  it('should return role with permissions in findOne if role is not deleted', async () => {
    (prisma.roles.findUnique as jest.Mock).mockResolvedValue({
      rolId: 1,
      nombre: 'test',
      deletedAt: null,
      rolPermisos: [
        {
          rolPermisoId: 1,
          permisoId: 10,
          permiso: {
            permisoId: 10,
            nombre: 'Consultar Clientes',
            descripcion: 'Permite consultar clientes',
            recurso: 'clientes',
            accion: 'read',
          },
        },
      ],
    });

    const result = await service.findOne(1);
    expect(result).toEqual({
      rolId: 1,
      nombre: 'test',
      permisos: [
        {
          rolPermisoId: 1,
          permisoId: 10,
          nombre: 'Consultar Clientes',
          descripcion: 'Permite consultar clientes',
          recurso: 'clientes',
          accion: 'read',
        },
      ],
    });
  });
});
