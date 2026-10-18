import { execSync } from 'node:child_process';
import { assertTestDatabase, TEST_DATABASE_URL } from './test-database';

/** Cria o banco de testes, se necessário, e aplica as migrations antes da suíte e2e. */
export default function globalSetup(): void {
  assertTestDatabase(TEST_DATABASE_URL);
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'ignore',
  });
}
