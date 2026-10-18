import { Cents } from '../domain/money';
import { InvalidInputError } from '../errors/domain-errors';

/** Query params como chegam do Express: texto, ou lista quando o parâmetro se repete. */
export type RawQuery = Record<string, unknown>;

const POSITIVE_INTEGER = /^[1-9]\d*$/;
/** `10`, `10.5`, `10.55`, `0.5`: sem sinal, expoente, vírgula ou zeros à esquerda. */
const MONEY_AMOUNT = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

/**
 * Lê um parâmetro presente: ausente → `undefined` (usa o padrão); vazio ou repetido → 400.
 * O valor é usado exatamente como enviado (V5: sem trocar maiúsculas e minúsculas).
 */
export function readQueryParam(query: RawQuery, name: string): string | undefined {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new InvalidInputError(`O parâmetro ${name} deve ser informado uma única vez.`);
  }
  if (value === '') {
    throw new InvalidInputError(`O parâmetro ${name} não pode ser vazio.`);
  }
  return value;
}

/** Inteiro positivo escrito só com dígitos, sem sinal, ponto, expoente ou zeros à esquerda. */
export function parseIntegerParam(
  query: RawQuery,
  name: string,
  range: { min: number; max: number } = { min: 1, max: Number.MAX_SAFE_INTEGER },
): number | undefined {
  const value = readQueryParam(query, name);
  if (value === undefined) {
    return undefined;
  }
  const number = Number(value);
  if (!POSITIVE_INTEGER.test(value) || number < range.min || number > range.max) {
    throw new InvalidInputError(
      `O parâmetro ${name} deve ser um inteiro de ${range.min} a ${range.max}.`,
    );
  }
  return number;
}

export function parseEnumParam<T extends string>(
  query: RawQuery,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = readQueryParam(query, name);
  if (value === undefined) {
    return undefined;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidInputError(`O parâmetro ${name} deve ser um destes: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function parseBooleanParam(query: RawQuery, name: string): boolean | undefined {
  const value = parseEnumParam(query, name, ['true', 'false'] as const);
  return value === undefined ? undefined : value === 'true';
}

/** Valor em moedas (filtros `min_value`/`max_value`), devolvido em centavos. */
export function parseMoneyParam(
  query: RawQuery,
  name: string,
  range: { min: Cents; max: Cents },
): Cents | undefined {
  const value = readQueryParam(query, name);
  if (value === undefined) {
    return undefined;
  }
  const match = MONEY_AMOUNT.exec(value);
  const cents = match
    ? Number(match[1]) * 100 + Number((match[2] ?? '').slice(1).padEnd(2, '0'))
    : NaN;
  if (!match || cents < range.min || cents > range.max) {
    throw new InvalidInputError(
      `O parâmetro ${name} deve ser um valor de ${range.min / 100} a ${range.max / 100}, com até 2 casas decimais e ponto.`,
    );
  }
  return cents;
}
