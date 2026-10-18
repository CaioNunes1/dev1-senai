import { Injectable, PipeTransform } from '@nestjs/common';
import { Cents } from '../../common/domain/money';
import { countCharacters, hasControlCharacters, normalizeSpaces } from '../../common/domain/text';
import { InvalidInputError } from '../../common/errors/domain-errors';
import {
  parseBooleanParam,
  parseEnumParam,
  parseIntegerParam,
  parseMoneyParam,
  RawQuery,
  readQueryParam,
} from '../../common/validation/query-params';
import { PLAYER_SORT_OPTIONS, PlayerSortOption } from '../domain/player-listing';
import { PLAYER_LIMITS } from '../domain/player.limits';
import { Condition, CONDITIONS, Position, POSITIONS } from '../domain/player.types';

/** Filtros de `GET /players` já validados e convertidos (README › "Filtros e query params"). */
export interface PlayerListQuery {
  search?: string;
  position?: Position;
  condition?: Condition;
  free?: boolean;
  clubId?: number;
  minAge: number;
  maxAge: number;
  minValue: Cents;
  maxValue: Cents;
  sort: PlayerSortOption[];
  page: number;
  limit: number;
}

const SEARCH_LENGTH = { min: 2, max: 100 };
const VALUE_RANGE = { min: 0, max: 55000 };
const LIMIT_RANGE = { min: 1, max: 50 };
const MAX_SORT_CRITERIA = 2;
const DEFAULTS = { page: 1, limit: 10, sort: ['name'] as PlayerSortOption[] };

export function parsePlayerListQuery(query: RawQuery): PlayerListQuery {
  const clubId = parseIntegerParam(query, 'club_id');
  const free = parseBooleanParam(query, 'free');
  if (free === true && clubId !== undefined) {
    throw new InvalidInputError('Os filtros free=true e club_id não podem ser usados juntos.');
  }
  const minAge = parseIntegerParam(query, 'min_age', PLAYER_LIMITS.age) ?? PLAYER_LIMITS.age.min;
  const maxAge = parseIntegerParam(query, 'max_age', PLAYER_LIMITS.age) ?? PLAYER_LIMITS.age.max;
  if (minAge > maxAge) {
    throw new InvalidInputError('O parâmetro min_age não pode ser maior que max_age.');
  }
  const minValue = parseMoneyParam(query, 'min_value', VALUE_RANGE) ?? VALUE_RANGE.min;
  const maxValue = parseMoneyParam(query, 'max_value', VALUE_RANGE) ?? VALUE_RANGE.max;
  if (minValue > maxValue) {
    throw new InvalidInputError('O parâmetro min_value não pode ser maior que max_value.');
  }
  return {
    search: parseSearch(query),
    position: parseEnumParam(query, 'position', POSITIONS),
    condition: parseEnumParam(query, 'condition', CONDITIONS),
    free,
    clubId,
    minAge,
    maxAge,
    minValue,
    maxValue,
    sort: parseSort(query),
    page: parseIntegerParam(query, 'page') ?? DEFAULTS.page,
    limit: parseIntegerParam(query, 'limit', LIMIT_RANGE) ?? DEFAULTS.limit,
  };
}

/** V4 no `search`: espaços normalizados, controle recusado, vazio recusado, 2 a 100 caracteres. */
function parseSearch(query: RawQuery): string | undefined {
  const raw = readQueryParam(query, 'search');
  if (raw === undefined) {
    return undefined;
  }
  const search = normalizeSpaces(raw);
  const length = countCharacters(search);
  if (hasControlCharacters(search) || length < SEARCH_LENGTH.min || length > SEARCH_LENGTH.max) {
    throw new InvalidInputError(
      `O parâmetro search deve ter de ${SEARCH_LENGTH.min} a ${SEARCH_LENGTH.max} caracteres, sem caracteres de controle.`,
    );
  }
  return search;
}

/** Até dois critérios separados por vírgula, sem espaços e sem repetir o campo. */
function parseSort(query: RawQuery): PlayerSortOption[] {
  const raw = readQueryParam(query, 'sort');
  if (raw === undefined) {
    return DEFAULTS.sort;
  }
  const options = raw.split(',');
  const fields = options.map((option) => option.split('_')[0]);
  const isValid =
    options.length <= MAX_SORT_CRITERIA &&
    options.every((option) => (PLAYER_SORT_OPTIONS as readonly string[]).includes(option)) &&
    new Set(fields).size === fields.length;
  if (!isValid) {
    throw new InvalidInputError(
      `O parâmetro sort aceita até ${MAX_SORT_CRITERIA} destes valores, sem repetir o campo: ${PLAYER_SORT_OPTIONS.join(', ')}.`,
    );
  }
  return options as PlayerSortOption[];
}

/** Valida e converte os query params de `GET /players` antes do controller (mecanismo declarado). */
@Injectable()
export class PlayerListQueryPipe implements PipeTransform<RawQuery, PlayerListQuery> {
  transform(query: RawQuery): PlayerListQuery {
    return parsePlayerListQuery(query);
  }
}
