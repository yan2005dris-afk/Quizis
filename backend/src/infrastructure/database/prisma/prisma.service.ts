import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { createSoftDeleteExtension } from '../soft-delete.middleware.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect(); // Falla rápido si la DB no está disponible
      this.logger.log(
        '[POSTGRES:UP] Conexion a PostgreSQL establecida correctamente',
      );
    } catch (error) {
      const trace = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        '[POSTGRES:DOWN] No se pudo conectar a PostgreSQL',
        trace,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Limpia conexiones al cerrar
    this.logger.log('[POSTGRES:DOWN] Conexion a PostgreSQL cerrada');
  }

  // Middleware de soft delete - aplica a todos los modelos con deletedAt
  // Elimina la posibilidad de hacer delete físico
  get extendedClient() {
    return this.$extends(createSoftDeleteExtension() as any);
  }
}
