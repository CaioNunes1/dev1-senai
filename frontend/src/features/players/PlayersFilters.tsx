import { Coins, HeartPulse, Info, Search, Shield, Shirt, UserRound, X } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { Input } from '../../shared/components/Input';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { formatMoney } from '../../shared/lib/format';
import type { Club } from '../clubs/api';
import { CONDITIONS, POSITIONS, type Condition, type Position } from './api';
import {
  AGE_LIMITS,
  isRangeSet,
  parseAgeRange,
  parseValueRange,
  SEARCH_LIMITS,
  VALUE_LIMITS,
  type PlayerFilters,
  type Range,
} from './player-filters';
import { CONDITION_LABELS, FREE_WITH_CLUB_HINT, POSITION_LABELS } from './player-labels';
import { RangeFilter } from './RangeFilter';

const SEARCH_HINT_ID = 'players-search-hint';

type PlayersFiltersProps = {
  filters: PlayerFilters;
  onChange: (changes: Partial<PlayerFilters>) => void;
  onClear: () => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  search: string;
  searchTooShort: boolean;
  hasFilters: boolean;
  clubs: ApiQuery<Club[]>;
  clubsById: Map<number, Club>;
};

/** Busca e filtros (Figma J01–J04): cada mudança vira query param de `GET /players`. */
export function PlayersFilters({
  filters,
  onChange,
  onClear,
  searchText,
  onSearchTextChange,
  search,
  searchTooShort,
  hasFilters,
  clubs,
  clubsById,
}: PlayersFiltersProps) {
  const clubName = filters.clubId === undefined ? undefined : clubsById.get(filters.clubId)?.name;
  const chips = activeChips(filters, search, clubName, onChange, () => onSearchTextChange(''));

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-wrap gap-2 p-2">
        <div className="relative w-full sm:w-auto sm:min-w-40 sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar jogador pelo nome"
            placeholder="Buscar por nome"
            maxLength={SEARCH_LIMITS.max}
            value={searchText}
            aria-describedby={searchTooShort ? SEARCH_HINT_ID : undefined}
            onChange={(event) => onSearchTextChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <FilterSelect
          label="Posição"
          icon={Shirt}
          allLabel="Todas as posições"
          value={filters.position ?? ''}
          selectedText={filters.position && `Posição: ${filters.position}`}
          options={POSITIONS.map((position) => ({
            value: position,
            label: `${position} — ${POSITION_LABELS[position]}`,
          }))}
          onChange={(value) => onChange({ position: (value || undefined) as Position | undefined })}
        />
        <FilterSelect
          label="Condição"
          icon={HeartPulse}
          allLabel="Todas as condições"
          value={filters.condition ?? ''}
          selectedText={filters.condition && `Condição: ${CONDITION_LABELS[filters.condition]}`}
          options={CONDITIONS.map((condition) => ({
            value: condition,
            label: CONDITION_LABELS[condition],
          }))}
          onChange={(value) =>
            onChange({ condition: (value || undefined) as Condition | undefined })
          }
        />
        <FilterSelect
          label="Clube"
          icon={Shield}
          allLabel="Todos os clubes"
          value={filters.clubId?.toString() ?? ''}
          selectedText={clubName && `Clube: ${clubName}`}
          options={(clubs.data ?? []).map((club) => ({
            value: club.id.toString(),
            label: club.name,
          }))}
          onChange={(value) => onChange({ clubId: value === '' ? undefined : Number(value) })}
          disabled={filters.free === true || clubs.data === undefined}
          disabledReason={filters.free === true ? FREE_WITH_CLUB_HINT : 'Clubes indisponíveis.'}
        />
        <RangeFilter
          label="Idade"
          icon={UserRound}
          appliedText={rangeText('Idade', filters.age, (age) => age)}
          value={filters.age}
          hint={`Idade de ${AGE_LIMITS.min} a ${AGE_LIMITS.max} anos. Deixe um campo vazio para não limitar.`}
          inputMode="numeric"
          parse={parseAgeRange}
          onApply={(age) => onChange({ age })}
        />
        <RangeFilter
          label="Valor de mercado"
          icon={Coins}
          appliedText={rangeText('Valor', filters.value, formatValue)}
          value={filters.value}
          hint={`Valor de mercado de ${VALUE_LIMITS.min} a ${VALUE_LIMITS.max} moedas, com até 2 casas decimais.`}
          inputMode="decimal"
          parse={parseValueRange}
          onApply={(value) => onChange({ value })}
        />
      </Card>

      {searchTooShort && (
        <p id={SEARCH_HINT_ID} className="text-xs text-muted-foreground">
          Digite pelo menos {SEARCH_LIMITS.min} letras para buscar pelo nome.
        </p>
      )}
      {(filters.free === true || filters.clubId !== undefined) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="size-4 shrink-0" />
          {filters.free === true
            ? `${FREE_WITH_CLUB_HINT} O filtro por clube fica desabilitado.`
            : `${FREE_WITH_CLUB_HINT} A aba “Livres” fica desabilitada.`}
        </p>
      )}

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.length > 0 && <span className="text-muted-foreground">Filtros ativos:</span>}
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remover filtro ${chip.label}`}
                onClick={chip.remove}
                className="flex size-5 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="h-8 cursor-pointer rounded-md px-3 font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

type Chip = { label: string; remove: () => void };

function activeChips(
  filters: PlayerFilters,
  search: string,
  clubName: string | undefined,
  onChange: (changes: Partial<PlayerFilters>) => void,
  clearSearch: () => void,
): Chip[] {
  const chips: Chip[] = [];
  if (search !== '') {
    chips.push({ label: `Busca: ${search}`, remove: clearSearch });
  }
  if (filters.free !== undefined) {
    chips.push({
      label: filters.free ? 'Situação: Livres' : 'Situação: Em clubes',
      remove: () => onChange({ free: undefined }),
    });
  }
  if (filters.position) {
    chips.push({
      label: `Posição: ${filters.position}`,
      remove: () => onChange({ position: undefined }),
    });
  }
  if (filters.condition) {
    chips.push({
      label: `Condição: ${CONDITION_LABELS[filters.condition]}`,
      remove: () => onChange({ condition: undefined }),
    });
  }
  if (filters.clubId !== undefined) {
    chips.push({
      label: `Clube: ${clubName ?? filters.clubId}`,
      remove: () => onChange({ clubId: undefined }),
    });
  }
  const age = rangeText('Idade', filters.age, (value) => value);
  if (age) {
    chips.push({ label: age, remove: () => onChange({ age: {} }) });
  }
  const value = rangeText('Valor de mercado', filters.value, formatValue);
  if (value) {
    chips.push({ label: value, remove: () => onChange({ value: {} }) });
  }
  return chips;
}

function formatValue(value: string): string {
  return formatMoney(Number(value));
}

/** "Idade: 18 a 30", "Idade: a partir de 18" ou "Idade: até 30"; sem faixa, nada. */
function rangeText(
  label: string,
  range: Range,
  format: (value: string) => string,
): string | undefined {
  if (!isRangeSet(range)) {
    return undefined;
  }
  if (range.min !== undefined && range.max !== undefined) {
    return `${label}: ${format(range.min)} a ${format(range.max)}`;
  }
  return range.min !== undefined
    ? `${label}: a partir de ${format(range.min)}`
    : `${label}: até ${format(range.max ?? '')}`;
}
