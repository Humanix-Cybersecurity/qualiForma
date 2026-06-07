// SPDX-License-Identifier: AGPL-3.0-or-later
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv(); // fail-fast si configuration invalide
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet()); // CSP/HSTS/headers de sécurité (durcis à l'étape 11)
  app.set('trust proxy', 1); // req.ip fiable derrière un reverse-proxy
  app.enableCors({
    origin: env.CORS_ORIGINS,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
}

void bootstrap();
