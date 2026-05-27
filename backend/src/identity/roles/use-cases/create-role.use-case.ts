import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(createRoleDto: CreateRoleDto) {
    const roleData = { nombre: createRoleDto.nombre };

    try {
      return await this.prisma.roles.create({ data: roleData });
    } catch (error: any) {
      if (this.isRolesIdUniqueConstraintError(error)) {
        await this.syncRolesIdSequence();
        return await this.prisma.roles.create({ data: roleData });
      }
      throw error;
    }
  }

  private isRolesIdUniqueConstraintError(error: any): boolean {
    if (!error || typeof error !== 'object') return false;
    if (error.code !== 'P2002') return false;
    const target = error.meta?.target;
    if (Array.isArray(target) && target.some((field) => field === 'roles_id'))
      return true;
    const driverFields =
      error.meta?.driverAdapterError?.cause?.constraint?.fields;
    if (
      Array.isArray(driverFields) &&
      driverFields.some((field) => field === 'roles_id')
    )
      return true;
    return false;
  }

  private async syncRolesIdSequence() {
    const sequenceResult = await this.prisma.$queryRaw<
      { seq: string | null }[]
    >`SELECT pg_get_serial_sequence('roles', 'rol_id') AS seq`;
    const sequenceName = sequenceResult[0]?.seq;
    if (!sequenceName) return;
    const escapedSequenceName = sequenceName.replace(/'/g, "''");
    await this.prisma.$executeRawUnsafe(
      `SELECT setval('${escapedSequenceName}', COALESCE((SELECT MAX(rol_id) FROM roles), 0) + 1, false)`,
    );
  }
}
