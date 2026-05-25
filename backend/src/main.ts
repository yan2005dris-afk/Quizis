import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './infrastructure/common/filters/global-exception.filter';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './infrastructure/common/filters/throttler-exception.filter';
import { BigIntInterceptor } from './infrastructure/common/interceptors/bigint.interceptor';
import { DecimalToNumberInterceptor } from './infrastructure/common/interceptors/decimal-to-number.interceptor';
import {
  TRUST_PROXY_HOPS,
  TRUST_PROXY_KEY,
} from './infrastructure/config/app.constants';

type ProxyAwareHttpApp = {
  set: (key: typeof TRUST_PROXY_KEY, value: number) => void;
};

type CookieParserMiddleware = (
  req: unknown,
  res: unknown,
  next: () => void,
) => void;

type CookieParserFactory = () => CookieParserMiddleware;

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix('api/v1');

  //Interceptor BigInt
  app.useGlobalInterceptors(new BigIntInterceptor());

  //Interceptor Decimal -> Number (para JSON)
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  // filtro para throttler
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  // Con Nginx como reverse proxy, la IP real del cliente viene en el
  // header X-Forwarded-For. "trust proxy = 1" le dice a Express que
  // confíe en un nivel de proxy y use ese header para req.ip.
  const httpInstance: unknown = app.getHttpAdapter().getInstance();
  if (httpInstance && typeof httpInstance === 'object') {
    const maybeSet = (httpInstance as { set?: unknown }).set;
    if (typeof maybeSet === 'function') {
      (httpInstance as ProxyAwareHttpApp).set(
        TRUST_PROXY_KEY,
        TRUST_PROXY_HOPS,
      );
    }
  }
  const createCookieParser = cookieParser as unknown as CookieParserFactory;
  app.use(createCookieParser());
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:4200',
  );

  app.enableCors({
    origin:
      corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro global de excepciones
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Quizis API')
    .setDescription(
      `
# Quizis — API REST

## 📋 Descripción
API RESTful para **Quizis**, una plataforma de quizzes en tiempo real estilo "¿Quién quiere ser millonario?".
El admin crea salas, sube bancos de preguntas y gestiona rondas. Los participantes entran sin cuenta,
solo con un nickname, a través de un link único de sala.

## 🔐 Autenticación
Solo el **admin** se autentica. Los participantes acceden sin registro:

1. **Login de admin**: \`POST /api/v1/auth/login\` con email y contraseña
2. **Access token**: Incluilo en el header → \`Authorization: Bearer <token>\`
3. **Refresh token**: \`POST /api/v1/auth/refresh\` — el refresh vive en una cookie httpOnly segura
4. **Participantes**: Entran con el link público de sala (\`/room/:token\`) y eligen un nickname

## 👥 Roles
| Rol | Descripción |
|-----|-------------|
| **Admin** | Crea la sala, sube preguntas, elige al encuestado, configura comodines |
| **Encuestado / Estudiante** | Juega la ronda: responde preguntas y usa comodines. Entra con link público |
| **Observador** | Ve la partida en vivo. Puede votar en el comodín "Pregunta al público" |

> Los participantes (estudiante y observadores) **no tienen cuenta**. Su identidad es el nickname elegido al unirse,
> asociado a su sesión WebSocket. El historial se guarda con el nickname para mantener trazabilidad.

## 🎮 Flujo del juego
\`\`\`
1. Admin se loguea y crea una sala
2. Admin sube el banco de preguntas (JSON)
3. Admin configura: límite de preguntas por ronda + comodines habilitados
4. Admin comparte el link único de sala (contiene token no predecible)
5. Los participantes entran, eligen nickname → se unen como observadores
6. Admin elige un estudiante de los observadores como encuestado
7. Comienza la ronda — el estudiante responde las N preguntas
8. El estudiante puede usar comodines durante su ronda
9. Al completar la ronda, el admin puede iniciar una nueva con otro estudiante
10. El proceso se repite hasta que el admin cierra la sala
\`\`\`

## 🃏 Comodines
| Comodín | Descripción |
|---------|-------------|
| **🗳️ Pregunta al público** | Los observadores conectados votan por una opción. La más votada se muestra como sugerencia |
| **🤖 Respuesta por IA** | El sistema consulta una IA externa y devuelve una respuesta sugerida |
| **📞 Llamada** | El estudiante elige un observador de la lista. Ese observador recibe una notificación y puede sugerir una respuesta |

## 📌 Convenciones

### Códigos de respuesta
| Código | Descripción |
|--------|-------------|
| 200 | Solicitud exitosa |
| 201 | Recurso creado |
| 400 | Datos inválidos |
| 401 | No autorizado (token inválido o expirado) |
| 403 | Prohibido (sin permisos) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (recurso duplicado) |
| 500 | Error interno del servidor |

### Tiempo real
Las salas activas usan **WebSockets** (Socket.io) con **Redis Pub/Sub** para mantener
estado efímero: participantes conectados, pregunta actual, votos del público.
    `,
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Token JWT del admin (obtenido en /auth/login)',
      in: 'header',
    })
    .addCookieAuth(
      'refreshToken',
      {
        description: 'Refresh token almacenado en cookie httpOnly (solo admin)',
        type: 'http',
      },
      'refresh-cookie',
    )
    .addTag('auth', 'Autenticación del admin (login, refresh, logout)')
    .addTag('users', 'Gestión de usuarios admin')
    .addTag('roles', 'Administración de roles')
    .addTag('permissions', 'Gestión de permisos')
    .addTag('salas', 'Gestión de salas de quiz')
    .addTag('bancos', 'Banco de preguntas')
    .addTag(
      'audience-votes',
      'Votos del público para el comodín "Pregunta al público"',
    )
    .addServer('http://localhost:3000', 'Desarrollo local')
    .setContact('Equipo Quizis', '', '')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  // Intentar cargar metadata del plugin de swagger (generado en build)
  // El plugin genera metadata.json que se carga como funcion
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const metadataFn = require('../metadata');
    if (typeof metadataFn === 'function') {
      await SwaggerModule.loadPluginMetadata(metadataFn);
    }
  } catch {
    // La metadata se genera durante el build con el plugin
    // Si no existe, se usa la documentacion manual con decorators
  }

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
      .swagger-ui .info .title { font-size: 40px }
    `,
    customSiteTitle: 'JASRAPO API Documentation',
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
