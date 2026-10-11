import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseMetaInterceptor } from './common/interceptors/response-meta.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  // OpenAPI Swagger Documentation
  // API contract: success {success:true,data,meta:{requestId,pagination?}},
  // errors {success:false,error:{code,message,details?},meta:{requestId}}.
  // See docs/architecture/api-contract-standard.md for the normative spec.
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

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`====================================================`);
  logger.log(` OgroniEdu API server running on: http://localhost:${port}`);
  logger.log(` Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(` Health probes: http://localhost:${port}/health/live & /health/ready`);
  logger.log(` Socket.IO Gateway namespace: ws://localhost:${port}/notifications`);
  logger.log(`====================================================`);
}

bootstrap();
