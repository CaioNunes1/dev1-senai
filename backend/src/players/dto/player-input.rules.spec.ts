import {
  ageRule,
  agilityRule,
  attributeRule,
  conditionRule,
  playerNameRule,
  positionRule,
  potentialRule,
} from './player-input.rules';

/** Jogador válido de referência: o "Meia Lua" dos exemplos oficiais. */
const MEIA_LUA = {
  name: 'Meia Lua',
  position: 'MEI',
  agility: 85,
  age: 25,
  pace: 70,
  shooting: 68,
  passing: 82,
  dribbling: 79,
  defending: 55,
  physical: 64,
  potential: 86,
};

describe('playerNameRule', () => {
  it.each([
    'Meia Lua',
    'Zé "Foguete" Lima',
    'Ana-Maria Souza',
    'A B',
    `${'a'.repeat(49)} ${'b'.repeat(50)}`,
  ])('aceita %j', (name) => {
    expect(playerNameRule(name)).toBeUndefined();
  });

  it.each([
    [undefined, 'obrigatório'],
    [null, 'obrigatório'],
    ['', 'obrigatório'],
    [10, 'texto'],
    ['Meia\tLua', 'controle'],
    ['Ab', '3 a 100'],
    [`${'a'.repeat(50)} ${'b'.repeat(50)}`, '3 a 100'],
    ['Meia', '2 palavras'],
    ['Meia -', '2 palavras'],
    ['Meia Lua 2', 'dígitos'],
  ])('recusa %j (%s)', (name, fragment) => {
    expect(playerNameRule(name)).toContain(fragment);
  });
});

describe('positionRule e conditionRule (V5)', () => {
  it.each(['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'])('aceita a posição %s', (position) => {
    expect(positionRule(position)).toBeUndefined();
  });

  it.each([undefined, null, 'mei', 'Mei', 'XYZ', 1])('recusa a posição %j', (position) => {
    expect(positionRule(position)).toBeDefined();
  });

  it.each(['APTO', 'MAL_CONDICIONADO', 'DOENTE'])('aceita a condição %s', (condition) => {
    expect(conditionRule(condition)).toBeUndefined();
  });

  it.each([undefined, null, 'apto', 'Apto', 'LESIONADO'])('recusa a condição %j', (condition) => {
    expect(conditionRule(condition)).toBeDefined();
  });
});

describe('ageRule', () => {
  it.each([16, 45, 25])('aceita %p', (age) => {
    expect(ageRule(age)).toBeUndefined();
  });

  it.each([15, 46, '25', 25.5, null, undefined, true])('recusa %p', (age) => {
    expect(ageRule(age)).toBeDefined();
  });
});

describe('agilityRule', () => {
  it.each([
    [1, 25],
    [100, 34],
    [85, 35],
    [85, 45],
  ])('aceita agilidade %p com %p anos', (agility, age) => {
    expect(agilityRule(agility, { age })).toBeUndefined();
  });

  it.each([
    [0, 25, '1 a 100'],
    [101, 25, '1 a 100'],
    ['50', 25, '1 a 100'],
    [50.5, 25, '1 a 100'],
    [null, 25, 'obrigatório'],
    [86, 35, 'no máximo 85'],
    [100, 45, 'no máximo 85'],
  ])('recusa agilidade %p com %p anos (%s)', (agility, age, fragment) => {
    expect(agilityRule(agility, { age })).toContain(fragment);
  });

  it('não cruza com a idade quando a idade é inválida (o erro é da idade)', () => {
    expect(agilityRule(100, { age: 'x' })).toBeUndefined();
  });
});

describe('attributeRule', () => {
  const pace = attributeRule('pace');

  it.each([1, 99])('aceita %p', (value) => {
    expect(pace(value, { ...MEIA_LUA, pace: value })).toBeUndefined();
  });

  it.each([0, 100, '70', 70.5])('recusa %p', (value) => {
    expect(pace(value, { ...MEIA_LUA, pace: value })).toContain('1 a 99');
  });

  it.each([null, undefined])('recusa %p como obrigatório', (value) => {
    expect(pace(value, { ...MEIA_LUA, pace: value })).toContain('obrigatório');
  });

  it('aceita soma exatamente 480', () => {
    const attributes = {
      pace: 99,
      shooting: 99,
      passing: 99,
      dribbling: 99,
      defending: 83,
      physical: 1,
    };
    expect(pace(99, { ...MEIA_LUA, ...attributes })).toBeUndefined();
  });

  it('recusa soma 481', () => {
    const attributes = {
      pace: 99,
      shooting: 99,
      passing: 99,
      dribbling: 99,
      defending: 84,
      physical: 1,
    };
    expect(pace(99, { ...MEIA_LUA, ...attributes })).toContain('481');
  });
});

describe('potentialRule (RN06)', () => {
  it.each([
    [86, 25, 'maior que o maior atributo (82)'],
    [82, 25, 'igual ao maior atributo'],
    [82, 33, '33 anos: igual ao maior atributo'],
  ])('aceita potencial %p com %p anos (%s)', (potential, age) => {
    expect(potentialRule(potential, { ...MEIA_LUA, age })).toBeUndefined();
  });

  it.each([
    [81, 25, 'maior ou igual'],
    [86, 33, 'igual ao maior atributo'],
    [86, 45, 'igual ao maior atributo'],
    [0, 25, '1 a 99'],
    [100, 25, '1 a 99'],
    [null, 25, 'obrigatório'],
  ])('recusa potencial %p com %p anos (%s)', (potential, age, fragment) => {
    expect(potentialRule(potential, { ...MEIA_LUA, age })).toContain(fragment);
  });
});
