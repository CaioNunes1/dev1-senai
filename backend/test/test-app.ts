import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestApp {
  app: INestApplication<App>;
  prisma: PrismaService;
}

/** Aplicação completa, com o mesmo pipeline do `main.ts`, ligada ao banco de testes. */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
