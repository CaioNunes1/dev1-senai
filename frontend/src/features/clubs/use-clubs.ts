import { useApiQuery } from '../../shared/hooks/use-api-query';
import { listClubs } from './api';

/** Clubes na ordem padrão da API (por nome). */
export function useClubs() {
  return useApiQuery('clubs', listClubs);
}
