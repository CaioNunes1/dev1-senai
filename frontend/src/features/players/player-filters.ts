import type { Condition, PlayerListQuery, PlayerSort, Position } from './api';

const PAGE_SIZE = 10;

/** Faixas aceitas pela API (README › "Filtros e query params"); limites de um campo só. */
export const AGE_LIMITS = { min: 16, max: 45 };
export const VALUE_LIMITS = { min: 0, max: 550 };
export const SEARCH_LIMITS = { min: 2, max: 100 };

export type Range = { min?: string; max?: string };

/** Filtros escolhidos na tela, guardados já no formato que a API aceita. */
export type PlayerFilters = {
  position?: Position;
  condition?: Condition;
  free?: boolean;
  clubId?: number;
  age: Range;
  value: Range;
  sort: PlayerSort;
};

export const INITIAL_FILTERS: PlayerFilters = { age: {}, value: {}, sort: 'name' };

/** Mesma normalização da API para o `search` (V4): sem espaços nas pontas e espaços repetidos. */
export function normalizeSearch(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function countCharacters(text: string): number {
  return [...text].length;
}

/** Monta os query params de `GET /players`, sem enviar parâmetros vazios. */
export function buildPlayerQuery(
  filters: PlayerFilters,
  search: string,
  page: number,
): PlayerListQuery {
  return {
    search: countCharacters(search) >= SEARCH_LIMITS.min ? search : undefined,
    position: filters.position,
    condition: filters.condition,
    free: filters.free,
    club_id: filters.free === true ? undefined : filters.clubId,
    min_age: filters.age.min,
    max_age: filters.age.max,
    min_value: filters.value.min,
    max_value: filters.value.max,
    sort: filters.sort,
    page,
    limit: PAGE_SIZE,
  };
}

export function hasActiveFilters(filters: PlayerFilters, search: string): boolean {
  return (
    search !== '' ||
    filters.position !== undefined ||
    filters.condition !== undefined ||
    filters.free !== undefined ||
    filters.clubId !== undefined ||
    isRangeSet(filters.age) ||
    isRangeSet(filters.value)
  );
}

export function isRangeSet(range: Range): boolean {
  return range.min !== undefined || range.max !== undefined;
}

export type RangeErrors = { min?: string; max?: string };
export type RangeResult = { range: Range; errors?: undefined } | { errors: RangeErrors };

const AGE_PATTERN = /^\d+$/;
const VALUE_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Idade digitada → inteiro de 16 a 45 sem zeros à esquerda; vazio = sem limite. */
export function parseAgeRange(minText: string, maxText: string): RangeResult {
  return parseRange(
    minText,
    maxText,
    (text) => {
      if (!AGE_PATTERN.test(text)) {
        return undefined;
      }
      const age = Number(text);
      return age >= AGE_LIMITS.min && age <= AGE_LIMITS.max ? age : undefined;
    },
    `Use um número inteiro de ${AGE_LIMITS.min} a ${AGE_LIMITS.max}.`,
  );
}

/** Valor digitado (vírgula ou ponto) → decimal de 0 a 550 com até 2 casas, enviado com ponto. */
export function parseValueRange(minText: string, maxText: string): RangeResult {
  return parseRange(
    minText,
    maxText,
    (text) => {
      if (!VALUE_PATTERN.test(text)) {
        return undefined;
      }
      const value = Number(text.replace(',', '.'));
      return value >= VALUE_LIMITS.min && value <= VALUE_LIMITS.max ? value : undefined;
    },
    `Use um valor de ${VALUE_LIMITS.min} a ${VALUE_LIMITS.max}, com até 2 casas decimais.`,
  );
}

function parseRange(
  minText: string,
  maxText: string,
  parse: (text: string) => number | undefined,
  invalidMessage: string,
): RangeResult {
  const minInput = minText.trim();
  const maxInput = maxText.trim();
  const min = minInput === '' ? undefined : parse(minInput);
  const max = maxInput === '' ? undefined : parse(maxInput);
  const errors: RangeErrors = {};
  if (minInput !== '' && min === undefined) {
    errors.min = invalidMessage;
  }
  if (maxInput !== '' && max === undefined) {
    errors.max = invalidMessage;
  }
  if (min !== undefined && max !== undefined && min > max) {
    errors.max = 'O máximo não pode ser menor que o mínimo.';
  }
  if (errors.min || errors.max) {
    return { errors };
  }
  return { range: { min: min?.toString(), max: max?.toString() } };
}
