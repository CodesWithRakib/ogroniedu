import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseMetaInterceptor } from './common/interceptors/response-meta.interceptor';
import { isSwaggerEnabled } from './config/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:5000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: frontendOrigins.length === 1 ? frontendOrigins[0] : frontendOrigins,
    credentials: true,
  });

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Injects meta.requestId into success envelopes (never double-wraps)
  app.useGlobalInterceptors(new ResponseMetaInterceptor());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // OpenAPI Swagger Documentation (non-production only — SEC-6)
  // API contract: success {success:true,data,meta:{requestId,pagination?}},
  // errors {success:false,error:{code,message,details?},meta:{requestId}}.
  // See docs/architecture/api-contract-standard.md for the normative spec.
  const swaggerEnabled = isSwaggerEnabled();
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('OgroniEdu API')
      .setDescription(
        'Enterprise Tutoring Marketplace & Learning Management API for Bangladesh. ' +
          'Success envelope: {success:true, data, message?, meta:{requestId, pagination?}}. ' +
          'Error envelope: {success:false, error:{code,message,details?}, meta:{requestId}}. ' +
          'Collections use offset pagination (meta.pagination.strategy=offset) except chat/notification/audit feeds (cursor).',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Auth', 'Identity, Registration, Verification, Session Management & RBAC')
      .addTag('Health', 'Platform Health, Liveness & Readiness Probes')
      .addTag('Notifications', 'Centralized Real-Time Notification & In-App Alerts Engine')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`====================================================`);
  logger.log(` OgroniEdu API server running on: http://localhost:${port}`);
  if (swaggerEnabled) {
    logger.log(` Swagger documentation available at: http://localhost:${port}/api/docs`);
  }
  logger.log(` Health probes: http://localhost:${port}/health/live & /health/ready`);
  logger.log(` Socket.IO Gateway namespace: ws://localhost:${port}/notifications`);
  logger.log(`====================================================`);
}

bootstrap();
