import { InvalidInputError } from '../errors/domain-errors';
import {
  parseBooleanParam,
  parseEnumParam,
  parseIntegerParam,
  parseMoneyParam,
  readQueryParam,
} from './query-params';

describe('readQueryParam', () => {
  it('parâmetro ausente não filtra', () => {
    expect(readQueryParam({}, 'position')).toBeUndefined();
  });

  it.each([
    ['vazio', { position: '' }],
    ['repetido', { position: ['MEI', 'ATA'] }],
  ])('recusa parâmetro %s', (_description, query) => {
    expect(() => readQueryParam(query, 'position')).toThrow(InvalidInputError);
  });
});

describe('parseIntegerParam', () => {
  it.each([
    ['1', 1],
    ['25', 25],
  ])('aceita %s', (value, expected) => {
    expect(parseIntegerParam({ page: value }, 'page')).toBe(expected);
  });

  it.each(['0', '-1', '+1', '01', '1.0', '1e2', ' 1', 'abc'])('recusa %j', (value) => {
    expect(() => parseIntegerParam({ page: value }, 'page')).toThrow(InvalidInputError);
  });

  it('respeita a faixa informada', () => {
    const range = { min: 16, max: 45 };
    expect(parseIntegerParam({ min_age: '16' }, 'min_age', range)).toBe(16);
    expect(parseIntegerParam({ min_age: '45' }, 'min_age', range)).toBe(45);
    expect(() => parseIntegerParam({ min_age: '15' }, 'min_age', range)).toThrow();
    expect(() => parseIntegerParam({ min_age: '46' }, 'min_age', range)).toThrow();
  });
});

describe('parseEnumParam e parseBooleanParam (V5: sem trocar maiúsculas)', () => {
  it('aceita o valor exato', () => {
    expect(parseEnumParam({ position: 'MEI' }, 'position', ['MEI', 'ATA'])).toBe('MEI');
    expect(parseBooleanParam({ free: 'true' }, 'free')).toBe(true);
    expect(parseBooleanParam({ free: 'false' }, 'free')).toBe(false);
  });

  it.each([
    [{ position: 'mei' }, 'position'],
    [{ free: 'TRUE' }, 'free'],
    [{ free: '1' }, 'free'],
  ])('recusa %j', (query, name) => {
    expect(() =>
      name === 'free'
        ? parseBooleanParam(query, name)
        : parseEnumParam(query, name, ['MEI', 'ATA']),
    ).toThrow(InvalidInputError);
  });
});

describe('parseMoneyParam (filtros de valor: 0 a 550, até 2 casas)', () => {
  const range = { min: 0, max: 55000 };

  it.each([
    ['10', 1000],
    ['10.5', 1050],
    ['10.55', 1055],
    ['0.5', 50],
    ['0', 0],
    ['550', 55000],
    ['550.00', 55000],
  ])('aceita %s → %i centavos', (value, cents) => {
    expect(parseMoneyParam({ min_value: value }, 'min_value', range)).toBe(cents);
  });

  it.each(['-1', '+1', '10.555', '1,5', '010', '00.5', '.5', '5.', '1e2', '550.01', 'abc'])(
    'recusa %j',
    (value) => {
      expect(() => parseMoneyParam({ min_value: value }, 'min_value', range)).toThrow(
        InvalidInputError,
      );
    },
  );
});
