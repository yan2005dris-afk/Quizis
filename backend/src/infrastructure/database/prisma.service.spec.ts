import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const postgresUpMsg =
    '[POSTGRES:UP] Conexion a PostgreSQL establecida correctamente';
  const postgresDownMsg = '[POSTGRES:DOWN] No se pudo conectar a PostgreSQL';

  const makeService = () => {
    const configService = {
      getOrThrow: jest
        .fn()
        .mockReturnValue('postgresql://user:pass@localhost:5432/db'),
    } as unknown as ConfigService;

    return new PrismaService(configService);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('logs POSTGRES:UP when connection succeeds', async () => {
    const service = makeService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(postgresUpMsg);
  });

  it('logs POSTGRES:DOWN and rethrows when connection fails', async () => {
    const service = makeService();
    const error = new Error('db down');

    jest.spyOn(service, '$connect').mockRejectedValue(error);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(service.onModuleInit()).rejects.toThrow(error);
    expect(errorSpy).toHaveBeenCalledWith(postgresDownMsg, error.stack);
  });
});
