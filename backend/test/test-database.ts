import { PrismaClient } from '@prisma/client';

/**
 * Banco exclusivo dos testes e2e, no mesmo PostgreSQL do docker-compose.
 * Pode ser trocado por TEST_DATABASE_URL; nunca usa a DATABASE_URL de desenvolvimento.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://passe:passe@localhost:5433/passe_test?schema=public';

const TABLES = [
  'duelos_partida',
  'partidas',
  'escalacoes',
  'transacoes',
  'contratos',
  'jogadores',
  'clubes',
];

/** Trava de segurança: só limpa bancos cujo nome termina em `_test`. */
export function assertTestDatabase(url: string): void {
  const databaseName = new URL(url).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Recusado: "${databaseName}" não é um banco de testes (*_test).`);
  }
}

/** Apaga todas as linhas e reinicia os ids, para cada teste partir do banco vazio. */
export async function resetTestDatabase(prisma: PrismaClient): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
