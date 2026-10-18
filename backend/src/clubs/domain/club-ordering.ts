import { Cents } from '../../common/domain/money';
import { compareNames } from '../../common/domain/text';

export const CLUB_SORT_OPTIONS = ['name', 'net_worth_asc', 'net_worth_desc'] as const;
export type ClubSortOption = (typeof CLUB_SORT_OPTIONS)[number];

interface SortableClub {
  id: number;
  name: string;
  netWorth: Cents;
}

const PRIMARY: Record<ClubSortOption, (first: SortableClub, second: SortableClub) => number> = {
  name: () => 0,
  net_worth_asc: (first, second) => first.netWorth - second.netWorth,
  net_worth_desc: (first, second) => second.netWorth - first.netWorth,
};

/**
 * RN11: `GET /clubs` ordena pelo nome (padrão) ou pelo patrimônio calculado; em qualquer
 * ordenação, o empate é desfeito pelo nome e depois pelo id. Não altera a lista recebida.
 */
export function sortClubs<T extends SortableClub>(clubs: readonly T[], sort: ClubSortOption): T[] {
  return [...clubs].sort(
    (first, second) =>
      PRIMARY[sort](first, second) || compareNames(first.name, second.name) || first.id - second.id,
  );
}
