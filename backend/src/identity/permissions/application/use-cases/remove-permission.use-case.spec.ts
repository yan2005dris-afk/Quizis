import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RemovePermissionUseCase } from './remove-permission.use-case';
import { PermissionRepository } from '../../domain/repositories/permission.repository';

describe('RemovePermissionUseCase', () => {
  let useCase: RemovePermissionUseCase;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  beforeEach(async () => {
    const mockRepo = {
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemovePermissionUseCase,
        { provide: PermissionRepository, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<RemovePermissionUseCase>(RemovePermissionUseCase);
    permissionRepo = module.get(PermissionRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should soft delete a permission', async () => {
    const id = 1;
    const result = await useCase.execute(id);

    expect(permissionRepo.remove).toHaveBeenCalledWith(id);
    expect(result).toEqual({ deleted: true });
  });
});
