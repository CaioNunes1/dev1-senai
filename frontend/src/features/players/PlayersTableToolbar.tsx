import { ArrowUpDown } from 'lucide-react';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { cx } from '../../shared/lib/cx';
import { lowerFirst } from '../../shared/lib/format';
import { PLAYER_SORTS, type PlayerSort } from './api';
import { FREE_WITH_CLUB_HINT, SORT_LABELS } from './player-labels';

type Situation = { label: string; free: boolean | undefined };

const SITUATIONS: Situation[] = [
  { label: 'Todos', free: undefined },
  { label: 'Livres', free: true },
  { label: 'Em clubes', free: false },
];

type PlayersTableToolbarProps = {
  free: boolean | undefined;
  hasClubFilter: boolean;
  /** Total da consulta atual (`meta.total_items`), mostrado na aba ativa. */
  total: number | undefined;
  sort: PlayerSort;
  onFreeChange: (free: boolean | undefined) => void;
  onSortChange: (sort: PlayerSort) => void;
};

/** Cabeçalho do card da tabela (Figma J01): abas de situação (`free`) e ordenação (`sort`). */
export function PlayersTableToolbar({
  free,
  hasClubFilter,
  total,
  sort,
  onFreeChange,
  onSortChange,
}: PlayersTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div
        role="group"
        aria-label="Situação dos jogadores"
        className="flex items-center rounded-lg bg-muted p-0.75 text-sm"
      >
        {SITUATIONS.map((situation) => {
          const active = situation.free === free;
          const blocked = situation.free === true && hasClubFilter;
          return (
            <button
              key={situation.label}
              type="button"
              aria-pressed={active}
              disabled={blocked}
              title={blocked ? FREE_WITH_CLUB_HINT : undefined}
              onClick={() => onFreeChange(situation.free)}
              className={cx(
                'flex h-7.5 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {situation.label}
              {active && total !== undefined && (
                <span className="font-normal text-muted-foreground">{total}</span>
              )}
            </button>
          );
        })}
      </div>
      <FilterSelect
        label="Ordenar por"
        icon={ArrowUpDown}
        value={sort}
        selectedText={`Ordenar: ${lowerFirst(SORT_LABELS[sort])}`}
        options={PLAYER_SORTS.map((option) => ({ value: option, label: SORT_LABELS[option] }))}
        onChange={(value) => onSortChange(value as PlayerSort)}
      />
    </div>
  );
}
