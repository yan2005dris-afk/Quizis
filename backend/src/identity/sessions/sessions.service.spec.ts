import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreateSessionUseCase } from './use-cases/create-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { UpdateSessionUseCase } from './use-cases/update-session.use-case';
import { RevokeSessionUseCase } from './use-cases/revoke-session.use-case';
import { ListSessionsByUserUseCase } from './use-cases/list-sessions-by-user.use-case';

describe('SessionsService', () => {
  let service: SessionsService;
  let createUseCase: CreateSessionUseCase;
  let getUseCase: GetSessionUseCase;
  let updateUseCase: UpdateSessionUseCase;
  let revokeUseCase: RevokeSessionUseCase;
  let listByUserUseCase: ListSessionsByUserUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: {
            sesiones: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: CreateSessionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetSessionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateSessionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RevokeSessionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListSessionsByUserUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    createUseCase = module.get<CreateSessionUseCase>(CreateSessionUseCase);
    getUseCase = module.get<GetSessionUseCase>(GetSessionUseCase);
    updateUseCase = module.get<UpdateSessionUseCase>(UpdateSessionUseCase);
    revokeUseCase = module.get<RevokeSessionUseCase>(RevokeSessionUseCase);
    listByUserUseCase = module.get<ListSessionsByUserUseCase>(
      ListSessionsByUserUseCase,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate createSession', async () => {
    const data = { usersId: 1 } as any;
    await service.createSession(data);
    expect(createUseCase.execute).toHaveBeenCalledWith(data);
  });

  it('should delegate getSession', async () => {
    await service.getSession(1, 'abc');
    expect(getUseCase.execute).toHaveBeenCalledWith(1, 'abc');
  });

  it('should directly call prisma for getSessionById', async () => {
    await service.getSessionById('abc');
    expect(prisma.sesiones.findUnique).toHaveBeenCalledWith({
      where: { sesionId: 'abc' },
    });
  });

  it('should delegate updateSession', async () => {
    const data = { ipAddress: '1.1.1.1' } as any;
    await service.updateSession('abc', data);
    expect(updateUseCase.execute).toHaveBeenCalledWith('abc', data);
  });

  it('should delegate revokeSession', async () => {
    await service.revokeSession('abc');
    expect(revokeUseCase.execute).toHaveBeenCalledWith('abc');
  });

  it('should delegate listSessionsByUser', async () => {
    await service.listSessionsByUser(1);
    expect(listByUserUseCase.execute).toHaveBeenCalledWith(1);
  });
});
