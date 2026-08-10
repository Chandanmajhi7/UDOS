/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

// Must be the first import: class-validator's nested @ValidateNested()/@Type()
// decorators read decorator metadata off the global Reflect object, which this
// polyfill installs. Without it, nested DTO validation silently misidentifies
// every property of the nested object as unrecognized (see Phase 8 debugging notes).
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  // whitelist strips unknown fields instead of erroring on them; forbidNonWhitelisted
  // turns "extra field in the body" into a 400 instead of silently accepting it.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Dev-only allowlist for the Next.js app (apps/web) on a different port.
  // Phase 11 replaces this with a per-tenant-domain allowlist behind the API Gateway
  // (Architecture §6) rather than a fixed localhost list.
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
