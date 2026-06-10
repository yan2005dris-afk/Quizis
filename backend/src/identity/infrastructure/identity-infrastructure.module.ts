import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/prisma/prisma.module';
import { UserRepository } from '../users/domain/repositories/user.repository';
import { SessionRepository } from '../sessions/domain/repositories/session.repository';
import { RoleRepository } from '../roles/domain/repositories/role.repository';
import { PermissionRepository } from '../permissions/domain/repositories/permission.repository';
import { PrismaUserRepository } from '../users/infrastructure/persistence/prisma-user.repository';
import { PrismaSessionRepository } from '../sessions/infrastructure/persistence/prisma-session.repository';
import { PrismaRoleRepository } from '../roles/infrastructure/persistence/prisma-role.repository';
import { PrismaPermissionRepository } from '../permissions/infrastructure/persistence/prisma-permission.repository';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    { provide: PermissionRepository, useClass: PrismaPermissionRepository },
  ],
  exports: [
    UserRepository,
    SessionRepository,
    RoleRepository,
    PermissionRepository,
  ],
})
export class IdentityInfrastructureModule {}
