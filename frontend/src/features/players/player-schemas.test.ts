import { describe, expect, it } from 'vitest';
import { createPlayerSchema, editPlayerSchema } from './player-schemas';

const VALID = {
  name: 'Meia Lua',
  position: 'MEI',
  age: '25',
  agility: '85',
  pace: '70',
  shooting: '68',
  passing: '82',
  dribbling: '79',
  defending: '55',
  physical: '64',
  potential: '86',
};

/** Primeira mensagem de cada campo, como o React Hook Form mostra. */
function errorsOf(values: Record<string, unknown>): Record<string, string> {
  const result = createPlayerSchema.safeParse(values);
  const errors: Record<string, string> = {};
  for (const issue of result.success ? [] : result.error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

describe('createPlayerSchema', () => {
  it('converte o formulário no corpo do POST, com números JSON e nome normalizado', () => {
    expect(createPlayerSchema.parse({ ...VALID, name: '  Meia   Lua ', age: ' 25 ' })).toEqual({
      name: 'Meia Lua',
      position: 'MEI',
      age: 25,
      agility: 85,
      pace: 70,
      shooting: 68,
      passing: 82,
      dribbling: 79,
      defending: 55,
      physical: 64,
      potential: 86,
    });
  });

  it('cada campo obrigatório vazio tem a sua mensagem, sem virar zero', () => {
    expect(
      errorsOf({
        name: '',
        age: '',
        agility: '',
        pace: '',
        shooting: '',
        passing: '',
        dribbling: '',
        defending: '',
        physical: '',
        potential: '',
      }),
    ).toEqual({
      name: 'Informe o nome.',
      position: 'Escolha a posição.',
      age: 'Informe a idade.',
      agility: 'Informe a agilidade.',
      pace: 'Informe a velocidade.',
      shooting: 'Informe a finalização.',
      passing: 'Informe o passe.',
      dribbling: 'Informe o drible.',
      defending: 'Informe a defesa.',
      physical: 'Informe o físico.',
      potential: 'Informe o potencial.',
    });
  });

  it.each([
    ['Da', 'Use de 3 a 100 caracteres.'],
    ['Pelé', 'Informe pelo menos duas palavras.'],
    ['Meia Lua 2', 'O nome não pode ter números.'],
    ['Jogador 10', 'Informe pelo menos duas palavras.'],
    ['Meia\tLua', 'Remova tabulações e quebras de linha.'],
    [`${'a'.repeat(50)} ${'b'.repeat(50)}`, 'Use de 3 a 100 caracteres.'],
  ])('nome %j → %s', (name, message) => {
    expect(errorsOf({ ...VALID, name }).name).toBe(message);
  });

  it('aceita nome com acentos e 100 caracteres em pontos de código', () => {
    expect(errorsOf({ ...VALID, name: `Ênio ${'á'.repeat(95)}` })).toEqual({});
  });

  it.each([
    ['age', '15', 'Use uma idade de 16 a 45 anos.'],
    ['age', '46', 'Use uma idade de 16 a 45 anos.'],
    ['age', '25.5', 'Use uma idade de 16 a 45 anos.'],
    ['agility', '0', 'Use um valor inteiro de 1 a 100.'],
    ['agility', '101', 'Use um valor inteiro de 1 a 100.'],
    ['pace', '100', 'Use um valor inteiro de 1 a 99.'],
    ['potential', '0', 'Use um valor inteiro de 1 a 99.'],
    ['shooting', '-5', 'Use um valor inteiro de 1 a 99.'],
    ['passing', '1e2', 'Use um valor inteiro de 1 a 99.'],
    ['physical', 'abc', 'Use um valor inteiro de 1 a 99.'],
  ])('%s = %j → %s', (field, value, message) => {
    expect(errorsOf({ ...VALID, [field]: value })[field]).toBe(message);
  });

  it.each([
    ['age', '16'],
    ['age', '45'],
    ['agility', '1'],
    ['agility', '100'],
    ['pace', '1'],
    ['potential', '99'],
  ])('aceita o limite %s = %s', (field, value) => {
    expect(errorsOf({ ...VALID, [field]: value })).toEqual({});
  });

  it('deixa para a API as regras que cruzam campos (soma, potencial, idade × agilidade)', () => {
    expect(
      errorsOf({ ...VALID, age: '36', agility: '90', pace: '99', shooting: '99', potential: '50' }),
    ).toEqual({});
  });
});

describe('editPlayerSchema', () => {
  const schema = editPlayerSchema(25);

  it('converte os quatro campos editáveis', () => {
    expect(schema.parse({ name: 'Davi Melo', position: 'MEI', agility: '70', age: '26' })).toEqual({
      name: 'Davi Melo',
      position: 'MEI',
      agility: 70,
      age: 26,
    });
  });

  it('recusa idade menor que a atual e aceita a mesma idade', () => {
    const lower = schema.safeParse({
      name: 'Davi Melo',
      position: 'MEI',
      agility: '70',
      age: '24',
    });
    expect(lower.success).toBe(false);
    expect(lower.error?.issues[0].message).toBe('A idade não pode diminuir (atual: 25).');
    expect(
      schema.safeParse({ name: 'Davi Melo', position: 'MEI', agility: '70', age: '25' }).success,
    ).toBe(true);
  });
});
