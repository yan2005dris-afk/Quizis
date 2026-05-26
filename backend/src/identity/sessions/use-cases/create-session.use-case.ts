import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class CreateSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: Prisma.SesionesCreateInput) {
    return this.prisma.sesiones.create({ data });
  }
}
