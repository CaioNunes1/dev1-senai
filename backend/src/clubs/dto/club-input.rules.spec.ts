import { acronymRule, clubNameRule } from './club-input.rules';

describe('clubNameRule (Limites de cada campo › name do clube)', () => {
  it.each([
    ['Águias FC'],
    ['A B'],
    ['Clube Atlético Recreativo Unido Serra'],
    ['Ébano-Clube S.A.'],
    ['Águias - FC'],
    [`${'A'.repeat(29)} ${'B'.repeat(30)}`],
  ])('aceita "%s"', (name) => {
    expect(clubNameRule(name)).toBeUndefined();
  });

  it.each([
    [undefined, 'obrigatório'],
    [null, 'obrigatório'],
    ['', 'obrigatório'],
    [123, 'texto'],
    [['Águias FC'], 'texto'],
    ['Águias\tFC', 'controle'],
    ['Águias\nFC', 'controle'],
    ['Ab', '3 a 60 caracteres'],
    [`${'A'.repeat(30)} ${'B'.repeat(30)}`, '3 a 60 caracteres'],
    ['Águias FC 2', 'só letras'],
    ['Águias_FC Norte', 'só letras'],
    ['Águias & FC', 'só letras'],
    ['Águias FC', 'só letras'],
    ['Águias', '2 a 5 palavras'],
    ['Clube Atlético Recreativo Unido da Serra', '2 a 5 palavras'],
    ['Águias - .', '2 a 5 palavras'],
  ])('recusa %j (%s)', (name, expectedFragment) => {
    expect(clubNameRule(name)).toContain(expectedFragment);
  });
});

describe('acronymRule (Limites de cada campo › acronym)', () => {
  const club = (name: unknown) => ({ name });

  it.each([
    ['AGU', 'Águias FC'],
    ['AFC', 'Águias FC'],
    ['TDN', 'Tubarões do Norte'],
    ['CCF', 'Çaçula FC'],
  ])('aceita %s para "%s"', (acronym, name) => {
    expect(acronymRule(acronym, club(name))).toBeUndefined();
  });

  it.each([
    [undefined, 'Águias FC', 'obrigatória'],
    [null, 'Águias FC', 'obrigatória'],
    [123, 'Águias FC', 'texto'],
    ['AG', 'Águias FC', 'exatamente 3 letras'],
    ['AGUA', 'Águias FC', 'exatamente 3 letras'],
    ['agu', 'Águias FC', 'exatamente 3 letras'],
    ['AG1', 'Águias FC', 'exatamente 3 letras'],
    ['ÁGU', 'Águias FC', 'exatamente 3 letras'],
    [' AGU', 'Águias FC', 'exatamente 3 letras'],
    ['AAA', 'Arara Azul', 'três letras iguais'],
    ['XYZ', 'Águias FC', 'primeira letra do nome'],
    ['GFC', 'Águias FC', 'primeira letra do nome'],
  ])('recusa %j para "%s" (%s)', (acronym, name, expectedFragment) => {
    expect(acronymRule(acronym, club(name))).toContain(expectedFragment);
  });

  it('não confere a correspondência quando o nome não é texto (o erro é do nome)', () => {
    expect(acronymRule('AGU', club(undefined))).toBeUndefined();
  });
});
