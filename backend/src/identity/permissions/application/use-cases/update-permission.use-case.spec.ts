import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdatePermissionUseCase } from './update-permission.use-case';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

describe('UpdatePermissionUseCase', () => {
  let useCase: UpdatePermissionUseCase;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      update: jest.fn(),
      findById: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePermissionUseCase,
        { provide: PermissionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<UpdatePermissionUseCase>(UpdatePermissionUseCase);
    permissionRepo = module.get(PermissionRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update a permission', async () => {
    const id = 1;
    const dto = {
      nombre: 'Test',
      descripcion: 'Test desc',
      recurso: 'test',
      accion: 'test',
    };
    const expectedResult = {
      permisoId: id,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      recurso: dto.recurso,
      accion: dto.accion,
    };
    permissionRepo.findById.mockResolvedValue(expectedResult as any);

    const result = await useCase.execute(id, dto);

    expect(permissionRepo.update).toHaveBeenCalledWith(id, dto);
    expect(result).toEqual(expectedResult);
  });
});
