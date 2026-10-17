import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { API_DOCS_PATH, API_PREFIX, configureApp } from './app.setup';
import { AppModule } from './app.module';
import { Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app.get(ConfigService<Environment, true>).get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API em http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Documentação em http://localhost:${port}/${API_DOCS_PATH}`);
}

void bootstrap();
