import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadEnvironment } from './config/environment.js';

async function bootstrap(): Promise<void> {
  const env = loadEnvironment();
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  // Security headers
  app.use(helmet());

  // Cookie parsing for refresh tokens
  app.use(cookieParser());

  // Strict CORS
  app.enableCors({
    origin: env.WEB_URL,
    credentials: true,
  });

  // Global API prefix (excluding root scaffold)
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  await app.listen(env.PORT, '127.0.0.1');
}

void bootstrap();
