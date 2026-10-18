import { InvalidInputError } from '../../common/errors/domain-errors';
import { parsePlayerListQuery } from './player-list-query';

describe('parsePlayerListQuery', () => {
  it('sem parâmetros, usa os padrões', () => {
    expect(parsePlayerListQuery({})).toEqual({
      search: undefined,
      position: undefined,
      condition: undefined,
      free: undefined,
      clubId: undefined,
      minAge: 16,
      maxAge: 45,
      minValue: 0,
      maxValue: 55000,
      sort: ['name'],
      page: 1,
      limit: 10,
    });
  });

  it('converte todos os filtros válidos', () => {
    const query = parsePlayerListQuery({
      search: '  meia   lua ',
      position: 'MEI',
      condition: 'APTO',
      free: 'false',
      club_id: '3',
      min_age: '20',
      max_age: '30',
      min_value: '10.5',
      max_value: '40',
      sort: 'value_desc,age_asc',
      page: '2',
      limit: '50',
      ignored_param: 'x',
    });

    expect(query).toEqual({
      search: 'meia lua',
      position: 'MEI',
      condition: 'APTO',
      free: false,
      clubId: 3,
      minAge: 20,
      maxAge: 30,
      minValue: 1050,
      maxValue: 4000,
      sort: ['value_desc', 'age_asc'],
      page: 2,
      limit: 50,
    });
  });

  it('com só um limite da faixa, o outro assume o extremo', () => {
    expect(parsePlayerListQuery({ min_age: '30' })).toMatchObject({ minAge: 30, maxAge: 45 });
    expect(parsePlayerListQuery({ max_value: '20' })).toMatchObject({
      minValue: 0,
      maxValue: 2000,
    });
  });

  it('aceita free=false junto com club_id', () => {
    expect(parsePlayerListQuery({ free: 'false', club_id: '1' })).toMatchObject({
      free: false,
      clubId: 1,
    });
  });

  it.each([
    ['search com 1 caractere', { search: 'a' }],
    ['search só com espaços', { search: '   ' }],
    ['search com 101 caracteres', { search: 'a'.repeat(101) }],
    ['search com tabulação', { search: 'meia\tlua' }],
    ['position em minúsculas', { position: 'mei' }],
    ['position vazia', { position: '' }],
    ['condition inválida', { condition: 'Apto' }],
    ['free em maiúsculas', { free: 'TRUE' }],
    ['free=true com club_id', { free: 'true', club_id: '1' }],
    ['club_id zero', { club_id: '0' }],
    ['club_id com texto', { club_id: 'abc' }],
    ['min_age abaixo de 16', { min_age: '15' }],
    ['max_age acima de 45', { max_age: '46' }],
    ['min_age maior que max_age', { min_age: '30', max_age: '20' }],
    ['min_value negativo', { min_value: '-1' }],
    ['min_value com 3 casas', { min_value: '10.555' }],
    ['min_value com vírgula', { min_value: '1,5' }],
    ['max_value acima de 550', { max_value: '551' }],
    ['min_value maior que max_value', { min_value: '20', max_value: '10' }],
    ['sort em maiúsculas', { sort: 'POSITION' }],
    ['sort com o mesmo campo duas vezes', { sort: 'value_asc,value_desc' }],
    ['sort repetido', { sort: 'name,name' }],
    ['sort com espaço', { sort: 'name, age_asc' }],
    ['sort com três critérios', { sort: 'name,age_asc,position' }],
    ['page zero', { page: '0' }],
    ['page com zero à esquerda', { page: '01' }],
    ['limit acima de 50', { limit: '51' }],
    ['limit zero', { limit: '0' }],
    ['parâmetro repetido', { position: ['MEI', 'ATA'] }],
  ])('recusa %s', (_description, query) => {
    expect(() => parsePlayerListQuery(query)).toThrow(InvalidInputError);
  });
});
