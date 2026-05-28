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

/**
 * Crea una instancia de NestJS lista para integration tests de auth.
 *
 * Carga solo los módulos necesarios para auth — sin Redis, WebSockets ni Juego.
 * Env vars se leen de .env.test primero, luego .env como fallback.
 */
export async function createAuthTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
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
