import { describe, expect, it } from 'vitest';
import {
  buildPlayerQuery,
  INITIAL_FILTERS,
  normalizeSearch,
  parseAgeRange,
  parseValueRange,
  type PlayerFilters,
} from './player-filters';

describe('buildPlayerQuery', () => {
  it('sem filtros envia só ordenação, página e limite de 10', () => {
    expect(buildPlayerQuery(INITIAL_FILTERS, '', 1)).toEqual({
      sort: 'name',
      page: 1,
      limit: 10,
    });
  });

  it('combina todos os filtros no formato da API', () => {
    const filters: PlayerFilters = {
      position: 'MEI',
      condition: 'APTO',
      free: false,
      clubId: 3,
      age: { min: '18', max: '30' },
      value: { min: '10.5', max: '60' },
      sort: 'value_desc',
    };

    expect(buildPlayerQuery(filters, 'lua', 2)).toEqual({
      search: 'lua',
      position: 'MEI',
      condition: 'APTO',
      free: false,
      club_id: 3,
      min_age: '18',
      max_age: '30',
      min_value: '10.5',
      max_value: '60',
      sort: 'value_desc',
      page: 2,
      limit: 10,
    });
  });

  it('nunca envia free=true junto com club_id', () => {
    const query = buildPlayerQuery({ ...INITIAL_FILTERS, free: true, clubId: 3 }, '', 1);

    expect(query.free).toBe(true);
    expect(query.club_id).toBeUndefined();
  });

  it('não envia busca com menos de 2 caracteres', () => {
    expect(buildPlayerQuery(INITIAL_FILTERS, 'a', 1).search).toBeUndefined();
    expect(buildPlayerQuery(INITIAL_FILTERS, 'ab', 1).search).toBe('ab');
  });
});

describe('normalizeSearch', () => {
  it.each([
    ['  meia   lua  ', 'meia lua'],
    ['João', 'João'],
    ['   ', ''],
  ])('%j → %j', (text, expected) => {
    expect(normalizeSearch(text)).toBe(expected);
  });
});

describe('parseAgeRange', () => {
  it.each([
    ['16', '45', { min: '16', max: '45' }],
    ['18', '', { min: '18', max: undefined }],
    ['', '30', { min: undefined, max: '30' }],
    ['', '', { min: undefined, max: undefined }],
    ['020', '30', { min: '20', max: '30' }],
    ['25', '25', { min: '25', max: '25' }],
  ])('aceita %j a %j', (min, max, range) => {
    expect(parseAgeRange(min, max)).toEqual({ range });
  });

  it.each([
    ['15', '', 'min'],
    ['', '46', 'max'],
    ['18.5', '', 'min'],
    ['-18', '', 'min'],
    ['1e1', '', 'min'],
    ['abc', '', 'min'],
  ])('recusa %j / %j no campo %s', (min, max, field) => {
    expect(parseAgeRange(min, max).errors).toHaveProperty(
      field,
      'Use um número inteiro de 16 a 45.',
    );
  });

  it('recusa mínimo maior que o máximo', () => {
    expect(parseAgeRange('30', '18').errors).toEqual({
      max: 'O máximo não pode ser menor que o mínimo.',
    });
  });
});

describe('parseValueRange', () => {
  it.each([
    ['10,5', '60', { min: '10.5', max: '60' }],
    ['10.55', '550', { min: '10.55', max: '550' }],
    ['0', '0,5', { min: '0', max: '0.5' }],
    ['007', '', { min: '7', max: undefined }],
    ['10,50', '', { min: '10.5', max: undefined }],
  ])('aceita %j a %j e envia com ponto', (min, max, range) => {
    expect(parseValueRange(min, max)).toEqual({ range });
  });

  it.each(['550,01', '-1', '1e3', '10,555', '10,', ',5', '1.000,00', 'dez'])('recusa %j', (min) => {
    expect(parseValueRange(min, '').errors).toEqual({
      min: 'Use um valor de 0 a 550, com até 2 casas decimais.',
    });
  });

  it('recusa mínimo maior que o máximo', () => {
    expect(parseValueRange('60', '10').errors).toEqual({
      max: 'O máximo não pode ser menor que o mínimo.',
    });
  });
});
