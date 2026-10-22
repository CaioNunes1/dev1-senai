import { describe, expect, it } from 'vitest';
import type { Transaction } from './api';
import {
  describeFilters,
  hasActiveFilters,
  historyPlayerOptions,
  NO_TRANSACTION_FILTERS,
  readTransactionFilters,
  toggleTransactionType,
  transactionQuery,
  writeTransactionFilters,
  type TransactionFilters,
} from './transaction-filters';

const ONLY_SALES: TransactionFilters = { types: ['VENDA'], playerId: undefined };

function transaction(id: number, playerId: number, playerName: string): Transaction {
  return {
    id,
    club_id: 1,
    player_id: playerId,
    player_name: playerName,
    type: 'COMPRA',
    value: 10,
    fee: 0,
    penalty: 0,
    profit: null,
    cash_change: -10,
    created_at: '2026-11-02T10:15:00-03:00',
  };
}

describe('transactionQuery (mesmos parâmetros no histórico e no CSV)', () => {
  it.each<[string, TransactionFilters, Record<string, unknown>]>([
    ['sem filtro: nenhum parâmetro', NO_TRANSACTION_FILTERS, {}],
    ['só compras', { types: ['COMPRA'], playerId: undefined }, { type: 'COMPRA' }],
    ['só vendas', ONLY_SALES, { type: 'VENDA' }],
    ['os dois tipos = todas', { types: ['COMPRA', 'VENDA'], playerId: undefined }, {}],
    ['jogador', { types: ['COMPRA', 'VENDA'], playerId: 2 }, { player_id: 2 }],
    ['combinados', { types: ['VENDA'], playerId: 2 }, { type: 'VENDA', player_id: 2 }],
  ])('%s', (_, filters, expected) => {
    const defined = Object.fromEntries(
      Object.entries(transactionQuery(filters)).filter(([, value]) => value !== undefined),
    );
    expect(defined).toEqual(expected);
  });
});

describe('filtros na URL', () => {
  it.each<[string, TransactionFilters]>([
    ['', NO_TRANSACTION_FILTERS],
    ['type=VENDA', ONLY_SALES],
    ['type=COMPRA', { types: ['COMPRA'], playerId: undefined }],
    ['type=VENDA,COMPRA', NO_TRANSACTION_FILTERS],
    ['type=COMPRA,COMPRA', { types: ['COMPRA'], playerId: undefined }],
    ['type=FOO', NO_TRANSACTION_FILTERS],
    ['type=', NO_TRANSACTION_FILTERS],
    ['player_id=2', { types: ['COMPRA', 'VENDA'], playerId: 2 }],
    ['type=VENDA&player_id=2147483647', { types: ['VENDA'], playerId: 2_147_483_647 }],
  ])('lê "%s"', (search, expected) => {
    expect(readTransactionFilters(new URLSearchParams(search))).toEqual(expected);
  });

  it.each(['0', '-1', 'abc', '2.5', ' 2', '02', '2147483648', ''])(
    'ignora player_id inválido %j',
    (playerId) => {
      expect(
        readTransactionFilters(new URLSearchParams({ player_id: playerId })).playerId,
      ).toBeUndefined();
    },
  );

  it('grava só os filtros ativos e mantém a aba', () => {
    const params = new URLSearchParams('tab=history&type=COMPRA&player_id=9');

    expect(writeTransactionFilters(params, { types: ['VENDA'], playerId: 2 }).toString()).toBe(
      'tab=history&type=VENDA&player_id=2',
    );
    expect(writeTransactionFilters(params, NO_TRANSACTION_FILTERS).toString()).toBe('tab=history');
    expect(params.toString()).toBe('tab=history&type=COMPRA&player_id=9');
  });
});

describe('toggleTransactionType', () => {
  it('desmarca e marca mantendo a ordem Compra, Venda e o jogador', () => {
    const onlySales = toggleTransactionType({ ...NO_TRANSACTION_FILTERS, playerId: 2 }, 'COMPRA');
    expect(onlySales).toEqual({ types: ['VENDA'], playerId: 2 });
    expect(toggleTransactionType(onlySales, 'COMPRA')).toEqual({
      types: ['COMPRA', 'VENDA'],
      playerId: 2,
    });
  });

  it('não deixa desmarcar o último tipo', () => {
    expect(toggleTransactionType(ONLY_SALES, 'VENDA')).toBe(ONLY_SALES);
  });

  it('hasActiveFilters', () => {
    expect(hasActiveFilters(NO_TRANSACTION_FILTERS)).toBe(false);
    expect(hasActiveFilters(ONLY_SALES)).toBe(true);
    expect(hasActiveFilters({ ...NO_TRANSACTION_FILTERS, playerId: 1 })).toBe(true);
  });
});

describe('historyPlayerOptions', () => {
  it('um item por jogador, com o nome da transação mais recente, em ordem alfabética', () => {
    const options = historyPlayerOptions([
      transaction(5, 2, 'Meia Lua'),
      transaction(4, 3, 'Ana Souza'),
      transaction(3, 2, 'Meio Lua'),
      transaction(2, 3, 'Ana'),
    ]);

    expect(options).toEqual([
      { value: '3', label: 'Ana Souza' },
      { value: '2', label: 'Meia Lua' },
    ]);
  });

  it('nomes iguais de jogadores diferentes levam o id', () => {
    expect(
      historyPlayerOptions([transaction(2, 7, 'Renan Castro'), transaction(1, 3, 'Renan Castro')]),
    ).toEqual([
      { value: '3', label: 'Renan Castro (id 3)' },
      { value: '7', label: 'Renan Castro (id 7)' },
    ]);
  });

  it('histórico vazio: nenhuma opção', () => {
    expect(historyPlayerOptions([])).toEqual([]);
  });
});

describe('describeFilters', () => {
  it.each<[TransactionFilters, string | undefined, string]>([
    [NO_TRANSACTION_FILTERS, undefined, 'sem filtros'],
    [ONLY_SALES, undefined, 'com tipo Venda'],
    [{ types: ['VENDA'], playerId: 2 }, 'Meia Lua', 'com tipo Venda e jogador Meia Lua'],
    [{ types: ['COMPRA', 'VENDA'], playerId: 9 }, undefined, 'com jogador id 9'],
  ])('%j', (filters, playerLabel, expected) => {
    expect(describeFilters(filters, playerLabel)).toBe(expected);
  });
});
