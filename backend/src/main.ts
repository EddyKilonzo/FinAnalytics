import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Apply helmet to every route EXCEPT /api/docs (Swagger UI uses inline scripts)
  app.use((req: { path: string }, _res: unknown, next: () => void) => {
    if (req.path.startsWith('/api/docs')) return next();
    return (helmet() as (req: unknown, res: unknown, next: () => void) => void)(req, _res, next);
  });

  // CORS — tighten origin in production via CORS_ORIGIN env var
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  });

  // All routes prefixed /api/v1
  app.setGlobalPrefix('api/v1', {
    // Keep /api/docs unprefixed so Swagger is served at its own clean URL
    exclude: ['api/docs', 'api/docs/(.*)'],
  });

  // Validation — strip unknown fields, validate strictly, auto-transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Unified error shape for all exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // HTTP request/response logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FinAnalytics API')
    .setDescription(
      `**FinAnalytix** — Smart money management API for young Kenyans.\n\n` +
      `Track spending, budget by category, and save toward goals.\n\n` +
      `### Authentication\n` +
      `After signing in via \`POST /auth/login\` or \`POST /auth/signup\`, ` +
      `copy the \`accessToken\` from the response and click **Authorize** (top-right) ` +
      `to authenticate all protected endpoints.`,
    )
    .setVersion('1.0')
    .addServer(`http://localhost:${process.env.PORT ?? 3000}`, 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT access token obtained from /auth/login or /auth/signup',
      },
      'access-token',   // <— matches @ApiBearerAuth('access-token') on protected routes
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,   // keep token between page refreshes
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
    },
    customSiteTitle: 'FinAnalytics API Docs',
  });
  // ───────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`API       → http://localhost:${port}/api/v1`);
  logger.log(`Swagger   → http://localhost:${port}/api/docs`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Failed to start application',
    err instanceof Error ? err.stack : String(err),
  );
  process.exit(1);
});
