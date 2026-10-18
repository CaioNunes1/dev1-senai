import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Clock } from '../src/common/clock/clock';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestClock } from './test-clock';

export interface TestApp {
  app: INestApplication<App>;
  prisma: PrismaService;
  clock: TestClock;
}

/**
 * Aplicação completa, com o mesmo pipeline do `main.ts`, ligada ao banco de testes e
 * a um relógio controlável (as regras de data ficam determinísticas).
 */
export async function createTestApp(): Promise<TestApp> {
  const clock = new TestClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), clock };
}
