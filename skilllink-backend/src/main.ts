// Load .env before anything else touches process.env — several providers
// (AuthService, JwtAuthGuard, escrow/volunteer services) read secrets from
// process.env at construction time.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow the configured frontend origin(s) to call this API. Comma-separate
  // multiple origins in CORS_ORIGIN. Falls back to allowing any origin so a
  // fresh clone still works before the env var is set.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  // Strips unknown fields and runs class-validator decorators on every
  // incoming DTO, so bad input is rejected before it reaches a service.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  console.log(`SkillLink API listening on port ${port}`);
}
bootstrap();
