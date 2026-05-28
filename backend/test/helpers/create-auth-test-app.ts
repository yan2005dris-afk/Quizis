import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { DatabaseModule } from 'src/infrastructure/database/prisma/prisma.module';
import { AuthModule } from 'src/identity/auth/auth.module';
import { GlobalExceptionFilter } from 'src/infrastructure/common/filters/global-exception.filter';
import { BigIntInterceptor } from 'src/infrastructure/common/interceptors/bigint.interceptor';
import { DecimalToNumberInterceptor } from 'src/infrastructure/common/interceptors/decimal-to-number.interceptor';

type CookieParserMiddleware = (
  req: unknown,
  res: unknown,
  next: () => void,
) => void;
type CookieParserFactory = () => CookieParserMiddleware;

// ─── Guard: requiere .env.test o vars de entorno explícitas (CI) ─────────────
// En local: debe existir backend/.env.test
// En CI: las vars llegan vía process.env (inyectadas por el workflow)
// Sin este check, ConfigModule podría cargar .env de dev silenciosamente.
import { existsSync } from 'fs';
import { resolve } from 'path';

const ENV_TEST_PATH = resolve(process.cwd(), '.env.test');
const hasEnvFile = existsSync(ENV_TEST_PATH);
const hasEnvVars = Boolean(process.env.DATABASE_URL && process.env.JWT_ACCESS_SECRET);

if (!hasEnvFile && !hasEnvVars) {
  throw new Error(
    `[create-auth-test-app] Falta configuración para integration tests.\n` +
      `  Local: crea backend/.env.test (ver backend/.env-example).\n` +
      `  CI: inyecta DATABASE_URL y JWT_ACCESS_SECRET como variables de entorno.\n` +
      `  No se usa .env como fallback para evitar correr tests contra la DB de desarrollo.`,
  );
}

/**
 * Crea una instancia de NestJS lista para integration tests de auth.
 *
 * Carga solo los módulos necesarios para auth — sin Redis, WebSockets ni Juego.
 * Solo lee .env.test — sin fallback a .env para evitar uso accidental de la DB de dev.
 */
export async function createAuthTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test'],
      }),
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
      DatabaseModule,
      AuthModule,
    ],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new BigIntInterceptor(),
    new DecimalToNumberInterceptor(),
  );

  const createCookieParser = cookieParser as unknown as CookieParserFactory;
  app.use(createCookieParser());

  await app.init();
  return app;
}
