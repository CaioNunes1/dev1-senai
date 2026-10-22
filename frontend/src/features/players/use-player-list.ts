import { useState } from 'react';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { useDebouncedValue } from '../../shared/hooks/use-debounced-value';
import { countCharacters } from '../../shared/lib/text';
import { listPlayers } from './api';
import {
  buildPlayerQuery,
  hasActiveFilters,
  INITIAL_FILTERS,
  normalizeSearch,
  SEARCH_LIMITS,
  type PlayerFilters,
} from './player-filters';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Estado da lista de jogadores: filtros, busca e página. Filtrar, ordenar e paginar é sempre
 * trabalho da API; aqui só se monta a consulta. Qualquer mudança de filtro ou de busca volta
 * para a página 1: a página escolhida vale só enquanto os filtros não mudam (ajuste de estado
 * durante a renderização, sem efeito; voltar aos mesmos filtros depois não restaura a página).
 * `initialChanges` vale só na montagem (ex.: abrir já em "Livres" ao vir da página do clube).
 */
export function usePlayerList(initialChanges: Partial<PlayerFilters> = {}) {
  const [filters, setFilters] = useState<PlayerFilters>(() => ({
    ...INITIAL_FILTERS,
    ...initialChanges,
  }));
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);

  const typedLength = countCharacters(normalizeSearch(searchText));
  const searchTooShort = typedLength > 0 && typedLength < SEARCH_LIMITS.min;
  const debounced = normalizeSearch(debouncedSearch);
  const search =
    typedLength === 0 || countCharacters(debounced) < SEARCH_LIMITS.min ? '' : debounced;

  const filterKey = JSON.stringify(buildPlayerQuery(filters, search, 1));
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  if (pageState.filterKey !== filterKey) {
    setPageState({ filterKey, page: 1 });
  }
  const page = pageState.filterKey === filterKey ? pageState.page : 1;

  const query = buildPlayerQuery(filters, search, page);
  const players = useApiQuery(`players:${JSON.stringify(query)}`, (signal) =>
    listPlayers(query, signal),
  );

  const updateFilters = (changes: Partial<PlayerFilters>) =>
    setFilters((current) => ({ ...current, ...changes }));

  const clearFilters = () => {
    setFilters((current) => ({ ...INITIAL_FILTERS, sort: current.sort }));
    setSearchText('');
  };

  return {
    filters,
    updateFilters,
    clearFilters,
    searchText,
    setSearchText,
    search,
    searchTooShort,
    hasFilters: hasActiveFilters(filters, search),
    page,
    goToPage: (nextPage: number) => setPageState({ filterKey, page: nextPage }),
    players,
  };
}
