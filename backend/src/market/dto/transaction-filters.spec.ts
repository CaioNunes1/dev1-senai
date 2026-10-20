import { InvalidInputError } from '../../common/errors/domain-errors';
import { parseTransactionFilters } from './transaction-filters';

describe('parseTransactionFilters (RN17, RN18 e "Filtros e query params")', () => {
  it('sem filtros: compras e vendas de todos os jogadores', () => {
    expect(parseTransactionFilters({})).toEqual({ types: undefined, playerId: undefined });
  });

  it.each([
    ['COMPRA', ['COMPRA']],
    ['VENDA', ['VENDA']],
    ['COMPRA,VENDA', ['COMPRA', 'VENDA']],
    ['VENDA,COMPRA', ['VENDA', 'COMPRA']],
  ])('type=%s → %j', (type, types) => {
    expect(parseTransactionFilters({ type }).types).toEqual(types);
  });

  it.each([
    [''],
    ['compra'],
    ['COMPRA,venda'],
    ['COMPRA,COMPRA'],
    ['COMPRA, VENDA'],
    [' COMPRA'],
    ['COMPRA,OUTRO'],
    ['COMPRA,'],
    [','],
    ['COMPRA,VENDA,COMPRA'],
  ])('type=%j → 400', (type) => {
    expect(() => parseTransactionFilters({ type })).toThrow(InvalidInputError);
  });

  it('type repetido na URL (?type=COMPRA&type=VENDA) → 400', () => {
    expect(() => parseTransactionFilters({ type: ['COMPRA', 'VENDA'] })).toThrow(InvalidInputError);
  });

  it.each([
    ['1', 1],
    ['25', 25],
    ['2147483647', 2147483647],
  ])('player_id=%s → %i', (playerId, expected) => {
    expect(parseTransactionFilters({ player_id: playerId }).playerId).toBe(expected);
  });

  it.each([[''], ['0'], ['-1'], ['+1'], ['01'], ['1.0'], ['1e2'], ['abc'], [' 1'], ['2147483648']])(
    'player_id=%j → 400',
    (playerId) => {
      expect(() => parseTransactionFilters({ player_id: playerId })).toThrow(InvalidInputError);
    },
  );

  it('combina type e player_id', () => {
    expect(parseTransactionFilters({ type: 'VENDA', player_id: '2' })).toEqual({
      types: ['VENDA'],
      playerId: 2,
    });
  });
});
