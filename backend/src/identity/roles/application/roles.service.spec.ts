import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleApplicationService } from './role-application.service';
import { CreateRoleUseCase } from './use-cases/create-role.use-case';
import { AssignPermissionToRoleUseCase } from './use-cases/assign-permission-to-role.use-case';
import { RemovePermissionFromRoleUseCase } from './use-cases/remove-permission-from-role.use-case';

describe('RolesService', () => {
  let service: RolesService;
  let createUseCase: CreateRoleUseCase;
  let roleAppService: any;

  const mockUseCase = { execute: jest.fn() };

  const mockRoleAppService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RoleApplicationService, useValue: mockRoleAppService },
        { provide: CreateRoleUseCase, useValue: mockUseCase },
        { provide: AssignPermissionToRoleUseCase, useValue: mockUseCase },
        { provide: RemovePermissionFromRoleUseCase, useValue: mockUseCase },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    createUseCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
    roleAppService = module.get(RoleApplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate create to CreateRoleUseCase', async () => {
    const dto = { nombre: 'Role' } as any;
    await service.create(dto);
    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll to RoleApplicationService', async () => {
    mockRoleAppService.findAll.mockResolvedValue([
      { rolId: 1, nombre: 'Admin' },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([{ rolId: 1, nombre: 'Admin' }]);
    expect(mockRoleAppService.findAll).toHaveBeenCalled();
  });

  it('should throw NotFoundException in findOne if role does not exist', async () => {
    mockRoleAppService.findOne.mockRejectedValue(
      new NotFoundException('Rol no encontrado'),
    );

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('should return role with permissions in findOne if role is not deleted', async () => {
    const mockResult = {
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
    };

    mockRoleAppService.findOne.mockResolvedValue(mockResult);

    const result = await service.findOne(1);
    expect(result).toEqual(mockResult);
    expect(mockRoleAppService.findOne).toHaveBeenCalledWith(1);
  });

  it('should delegate update to RoleApplicationService', async () => {
    const updateDto = { nombre: 'Updated' } as any;
    mockRoleAppService.update.mockResolvedValue({
      rolId: 1,
      nombre: 'Updated',
      permisos: [],
    });

    const result = await service.update(1, updateDto);

    expect(result).toEqual({ rolId: 1, nombre: 'Updated', permisos: [] });
    expect(mockRoleAppService.update).toHaveBeenCalledWith(1, updateDto);
  });
});
