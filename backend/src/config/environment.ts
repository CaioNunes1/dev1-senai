export interface Environment {
  DATABASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string[];
}

const DEFAULT_PORT = 3000;

function requireText(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Variável de ambiente ${key} não definida.`);
  }
  return value.trim();
}

function parsePort(value: unknown): number {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Variável de ambiente PORT deve ser um inteiro entre 1 e 65535.');
  }
  return port;
}

function parseCorsOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('Variável de ambiente CORS_ORIGIN deve listar origens explícitas (sem "*").');
  }
  return origins;
}

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return {
    DATABASE_URL: requireText(config, 'DATABASE_URL'),
    PORT: parsePort(config.PORT),
    CORS_ORIGIN: parseCorsOrigins(requireText(config, 'CORS_ORIGIN')),
  };
}
