import { User } from 'lucide-react';
import { useId } from 'react';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { cx } from '../../shared/lib/cx';
import {
  hasActiveFilters,
  NO_TRANSACTION_FILTERS,
  toggleTransactionType,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  type PlayerOption,
  type TransactionFilters,
} from './transaction-filters';

type TransactionFiltersBarProps = {
  filters: TransactionFilters;
  playerOptions: PlayerOption[];
  /** Motivo para o filtro de jogador estar indisponível (ex.: histórico ainda carregando). */
  playersUnavailable?: string;
  onChange: (filters: TransactionFilters) => void;
};

/**
 * Filtros do histórico (Figma H01–H03): tipo em duas caixas (as duas marcadas = todas),
 * jogador do próprio histórico e "Limpar filtros" quando algum filtro restringe a lista.
 */
export function TransactionFiltersBar({
  filters,
  playerOptions,
  playersUnavailable,
  onChange,
}: TransactionFiltersBarProps) {
  const hintId = useId();
  const selected = playerOptions.find((option) => option.value === String(filters.playerId));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="float-left mr-1 text-sm text-muted-foreground">Tipo</legend>
        <p id={hintId} className="sr-only">
          Pelo menos um tipo fica marcado; os dois marcados mostram todas as transações.
        </p>
        {TRANSACTION_TYPES.map((type) => {
          const checked = filters.types.includes(type);
          const isLast = checked && filters.types.length === 1;
          return (
            <label
              key={type}
              title={isLast ? 'Pelo menos um tipo fica marcado.' : undefined}
              className={cx(
                'flex h-9 items-center gap-2 rounded-md border px-3 text-sm shadow-xs',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                checked
                  ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                  : 'border-border bg-background text-foreground',
                isLast ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isLast}
                aria-describedby={hintId}
                onChange={() => onChange(toggleTransactionType(filters, type))}
                className="size-4 accent-primary outline-none disabled:cursor-not-allowed"
              />
              {TRANSACTION_TYPE_LABELS[type]}
            </label>
          );
        })}
      </fieldset>
      <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
      <FilterSelect
        label="Jogador"
        icon={User}
        value={filters.playerId === undefined ? '' : String(filters.playerId)}
        selectedText={`Jogador: ${selected?.label ?? `id ${filters.playerId}`}`}
        allLabel="Todos os jogadores"
        options={
          selected || filters.playerId === undefined
            ? playerOptions
            : [
                ...playerOptions,
                { value: String(filters.playerId), label: `id ${filters.playerId}` },
              ]
        }
        onChange={(value) =>
          onChange({ ...filters, playerId: value === '' ? undefined : Number(value) })
        }
        disabled={playersUnavailable !== undefined}
        disabledReason={playersUnavailable}
      />
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(NO_TRANSACTION_FILTERS)}
          className="rounded-sm px-1 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
