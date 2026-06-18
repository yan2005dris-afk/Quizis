import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { CreatePermissionUseCase } from './use-cases/create-permission.use-case';
import { FindAllPermissionsUseCase } from './use-cases/find-all-permissions.use-case';
import { FindOnePermissionUseCase } from './use-cases/find-one-permission.use-case';
import { UpdatePermissionUseCase } from './use-cases/update-permission.use-case';
import { RemovePermissionUseCase } from './use-cases/remove-permission.use-case';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let createUseCase: CreatePermissionUseCase;
  let findAllUseCase: FindAllPermissionsUseCase;
  let findOneUseCase: FindOnePermissionUseCase;
  let updateUseCase: UpdatePermissionUseCase;
  let removeUseCase: RemovePermissionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: CreatePermissionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindAllPermissionsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindOnePermissionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdatePermissionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RemovePermissionUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    createUseCase = module.get<CreatePermissionUseCase>(
      CreatePermissionUseCase,
    );
    findAllUseCase = module.get<FindAllPermissionsUseCase>(
      FindAllPermissionsUseCase,
    );
    findOneUseCase = module.get<FindOnePermissionUseCase>(
      FindOnePermissionUseCase,
    );
    updateUseCase = module.get<UpdatePermissionUseCase>(
      UpdatePermissionUseCase,
    );
    removeUseCase = module.get<RemovePermissionUseCase>(
      RemovePermissionUseCase,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate create to CreatePermissionUseCase', async () => {
    const dto = {
      nombre: 'test',
      descripcion: 'test',
      recurso: 'test',
      accion: 'test',
    } as any;
    await service.create(dto);
    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll to FindAllPermissionsUseCase', async () => {
    await service.findAll();
    expect(findAllUseCase.execute).toHaveBeenCalled();
  });

  it('should delegate findOne to FindOnePermissionUseCase', async () => {
    await service.findOne(1);
    expect(findOneUseCase.execute).toHaveBeenCalledWith(1);
  });

  it('should delegate update to UpdatePermissionUseCase', async () => {
    const dto = { nombre: 'updated' } as any;
    await service.update(1, dto);
    expect(updateUseCase.execute).toHaveBeenCalledWith(1, dto);
  });

  it('should delegate remove to RemovePermissionUseCase', async () => {
    await service.remove(1);
    expect(removeUseCase.execute).toHaveBeenCalledWith(1);
  });
});
