import { useApiQuery } from '../../shared/hooks/use-api-query';
import { listClubTransactions } from './api';
import {
  NO_TRANSACTION_FILTERS,
  transactionQuery,
  type TransactionFilters,
} from './transaction-filters';

function queryKey(clubId: number, filters: TransactionFilters): string {
  const params = Object.entries(transactionQuery(filters)).filter(
    ([, value]) => value !== undefined,
  );
  return `transactions:${clubId}?${params.map(([name, value]) => `${name}=${value}`).join('&')}`;
}

/**
 * Histórico do clube com os filtros. `data` e `summary` vêm sempre da mesma resposta, e a
 * resposta de um filtro antigo nunca substitui a do filtro atual (`useApiQuery`).
 */
export function useClubTransactions(
  clubId: number,
  filters: TransactionFilters = NO_TRANSACTION_FILTERS,
  enabled = true,
) {
  return useApiQuery(
    queryKey(clubId, filters),
    (signal) => listClubTransactions(clubId, filters, signal),
    { enabled },
  );
}
