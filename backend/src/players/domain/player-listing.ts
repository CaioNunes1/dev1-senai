import { Cents } from '../../common/domain/money';
import { compareNames, includesIgnoringCaseAndAccents } from '../../common/domain/text';
import { Position, POSITIONS } from './player.types';

export const PLAYER_SORT_OPTIONS = [
  'name',
  'value_asc',
  'value_desc',
  'age_asc',
  'age_desc',
  'position',
] as const;
export type PlayerSortOption = (typeof PLAYER_SORT_OPTIONS)[number];

/** Dados que a busca, o filtro de valor e a ordenação usam. */
export interface ListablePlayer {
  id: number;
  name: string;
  age: number;
  position: Position;
  marketValue: Cents;
}

export interface PlayerSelection {
  search?: string;
  minValue?: Cents;
  maxValue?: Cents;
  sort: readonly PlayerSortOption[];
}

type Comparator = (first: ListablePlayer, second: ListablePlayer) => number;

const COMPARATORS: Record<PlayerSortOption, Comparator> = {
  name: (first, second) => compareNames(first.name, second.name),
  value_asc: (first, second) => first.marketValue - second.marketValue,
  value_desc: (first, second) => second.marketValue - first.marketValue,
  age_asc: (first, second) => first.age - second.age,
  age_desc: (first, second) => second.age - first.age,
  position: (first, second) =>
    POSITIONS.indexOf(first.position) - POSITIONS.indexOf(second.position),
};

/** Desempate de qualquer ordenação: nome e depois id crescente (RN07). */
const TIE_BREAKERS: readonly Comparator[] = [
  COMPARATORS.name,
  (first, second) => first.id - second.id,
];

/**
 * RN07: busca no nome (sem diferenciar maiúsculas, minúsculas e acentos), faixa de valor
 * de mercado (inclusiva) e ordenação por até dois critérios, desempatada por nome e id.
 * Os demais filtros são colunas e chegam aplicados pelo banco. Não altera a lista recebida.
 */
export function selectPlayers<T extends ListablePlayer>(
  players: readonly T[],
  selection: PlayerSelection,
): T[] {
  const comparators = [...selection.sort.map((option) => COMPARATORS[option]), ...TIE_BREAKERS];
  return players
    .filter(
      (player) =>
        (selection.search === undefined ||
          includesIgnoringCaseAndAccents(player.name, selection.search)) &&
        (selection.minValue === undefined || player.marketValue >= selection.minValue) &&
        (selection.maxValue === undefined || player.marketValue <= selection.maxValue),
    )
    .sort((first, second) => {
      for (const compare of comparators) {
        const result = compare(first, second);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    });
}
