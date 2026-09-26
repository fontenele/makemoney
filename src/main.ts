import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');

  app.useStaticAssets(join(process.cwd(), 'dashboard-dist'), {
    prefix: '/dashboard',
  });
  app.enableShutdownHooks();
  await app.listen(port);

  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
