import { Injectable, PipeTransform } from '@nestjs/common';
import { InvalidInputError } from '../../common/errors/domain-errors';
import { parseIntegerParam, RawQuery, readQueryParam } from '../../common/validation/query-params';
import { TRANSACTION_TYPES, TransactionKind } from '../domain/transaction-history';

/** Filtros de `GET /clubs/{id}/transactions` e do `/export`, já validados (RN17, RN18). */
export interface TransactionFilters {
  types?: TransactionKind[];
  playerId?: number;
}

/** Maior id que a correção envia (README › "Filtros e query params"); acima disso, 400. */
const ID_RANGE = { min: 1, max: 2_147_483_647 };

const INVALID_TYPE_MESSAGE =
  'O parâmetro type deve ter COMPRA e/ou VENDA, separados por vírgula, sem espaços e sem repetição.';

/** `type`: um ou mais de COMPRA e VENDA, separados por vírgula, sem espaços nem repetição. */
function parseTypes(query: RawQuery): TransactionKind[] | undefined {
  const value = readQueryParam(query, 'type');
  if (value === undefined) {
    return undefined;
  }
  const types = value.split(',');
  const valid =
    types.every((type) => (TRANSACTION_TYPES as readonly string[]).includes(type)) &&
    new Set(types).size === types.length;
  if (!valid) {
    throw new InvalidInputError(INVALID_TYPE_MESSAGE);
  }
  return types as TransactionKind[];
}

export function parseTransactionFilters(query: RawQuery): TransactionFilters {
  return {
    types: parseTypes(query),
    playerId: parseIntegerParam(query, 'player_id', ID_RANGE),
  };
}

/** Mesmos filtros e mesmas recusas (400) para o histórico e para a exportação. */
@Injectable()
export class TransactionFiltersPipe implements PipeTransform<RawQuery, TransactionFilters> {
  transform(query: RawQuery): TransactionFilters {
    return parseTransactionFilters(query);
  }
}
