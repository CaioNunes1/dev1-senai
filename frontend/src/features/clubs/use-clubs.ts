import { useApiQuery } from '../../shared/hooks/use-api-query';
import { getClub, listClubs, type ClubSort } from './api';

/**
 * Clubes na ordem pedida. Sem `sort`, é a lista padrão da API (por nome) que o layout
 * carrega e compartilha pelo `ClubsContext`.
 */
export function useClubs(sort?: ClubSort) {
  return useApiQuery(sort ? `clubs?sort=${sort}` : 'clubs', (signal) => listClubs(sort, signal));
}

export function useClub(id: string) {
  return useApiQuery(`club:${id}`, (signal) => getClub(id, signal));
}
