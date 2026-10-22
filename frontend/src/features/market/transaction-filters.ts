import type { QueryParams } from '../../shared/api/http-client';
import type { Transaction, TransactionType } from './api';

/** Tipos na ordem da tela (Figma H01: Compra, Venda); os dois marcados = sem filtro de tipo. */
export const TRANSACTION_TYPES: readonly TransactionType[] = ['COMPRA', 'VENDA'];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  COMPRA: 'Compra',
  VENDA: 'Venda',
};

/**
 * Filtros do histórico (RN17). `types` nunca fica vazio: os dois tipos equivalem a "todas",
 * e a tela não deixa desmarcar o último. `playerId` é um inteiro positivo.
 */
export type TransactionFilters = {
  types: readonly TransactionType[];
  playerId: number | undefined;
};

export const NO_TRANSACTION_FILTERS: TransactionFilters = {
  types: TRANSACTION_TYPES,
  playerId: undefined,
};

/** Maior id aceito pela API (README › "Filtros e query params"). */
const MAX_ID = 2_147_483_647;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

const TYPE_PARAM = 'type';
const PLAYER_PARAM = 'player_id';

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return filters.types.length < TRANSACTION_TYPES.length || filters.playerId !== undefined;
}

/**
 * Única tradução dos filtros para a API, usada pelo histórico e pela exportação (RN18):
 * só o que restringe vai na URL, sem parâmetro vazio, repetido ou com espaço.
 */
export function transactionQuery(filters: TransactionFilters): QueryParams {
  return {
    [TYPE_PARAM]:
      filters.types.length < TRANSACTION_TYPES.length ? filters.types.join(',') : undefined,
    [PLAYER_PARAM]: filters.playerId,
  };
}

/** Filtros guardados na URL da página (ex.: `?tab=history&type=VENDA&player_id=2`). */
export function readTransactionFilters(params: URLSearchParams): TransactionFilters {
  const requested = (params.get(TYPE_PARAM) ?? '').split(',');
  const types = TRANSACTION_TYPES.filter((type) => requested.includes(type));
  const player = params.get(PLAYER_PARAM) ?? '';
  const playerId = POSITIVE_INTEGER.test(player) ? Number(player) : undefined;
  return {
    types: types.length === 0 ? TRANSACTION_TYPES : types,
    playerId: playerId !== undefined && playerId <= MAX_ID ? playerId : undefined,
  };
}

/** Nova URL com os filtros; os demais parâmetros (ex.: a aba) continuam como estavam. */
export function writeTransactionFilters(
  params: URLSearchParams,
  filters: TransactionFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(TYPE_PARAM);
  next.delete(PLAYER_PARAM);
  for (const [name, value] of Object.entries(transactionQuery(filters))) {
    if (value !== undefined) {
      next.set(name, String(value));
    }
  }
  return next;
}

/** Marca ou desmarca um tipo; desmarcar o único marcado não muda nada. */
export function toggleTransactionType(
  filters: TransactionFilters,
  type: TransactionType,
): TransactionFilters {
  const types = filters.types.includes(type)
    ? filters.types.filter((item) => item !== type)
    : TRANSACTION_TYPES.filter((item) => item === type || filters.types.includes(item));
  return types.length === 0 ? filters : { ...filters, types };
}

export type PlayerOption = { value: string; label: string };

/**
 * Jogadores que já aparecem no histórico do clube (inclusive os vendidos e os excluídos),
 * tirados do histórico sem filtro, sem consultar `/players`. O nome é o da transação mais
 * recente (a API devolve da mais recente para a mais antiga); nomes repetidos levam o id.
 */
export function historyPlayerOptions(transactions: readonly Transaction[]): PlayerOption[] {
  const names = new Map<number, string>();
  for (const transaction of transactions) {
    if (!names.has(transaction.player_id)) {
      names.set(transaction.player_id, transaction.player_name);
    }
  }
  const counts = new Map<string, number>();
  for (const name of names.values()) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...names]
    .map(([id, name]) => ({
      value: String(id),
      label: (counts.get(name) ?? 0) > 1 ? `${name} (id ${id})` : name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** Filtros em texto para o aviso da exportação (ex.: "tipo Venda e jogador Meia Lua"). */
export function describeFilters(
  filters: TransactionFilters,
  playerLabel: string | undefined,
): string {
  const parts: string[] = [];
  if (filters.types.length < TRANSACTION_TYPES.length) {
    parts.push(`tipo ${filters.types.map((type) => TRANSACTION_TYPE_LABELS[type]).join(' e ')}`);
  }
  if (filters.playerId !== undefined) {
    parts.push(`jogador ${playerLabel ?? `id ${filters.playerId}`}`);
  }
  return parts.length === 0 ? 'sem filtros' : `com ${parts.join(' e ')}`;
}
