import { acronymMatchesName, hasAllSameLetters } from './acronym';

describe('acronymMatchesName', () => {
  it.each([
    ['AGU', 'Águias FC', 'letras consecutivas, com acento no nome'],
    ['AFC', 'Águias FC', 'letras não consecutivas'],
    ['TDN', 'Tubarões do Norte', 'uma letra de cada palavra'],
    ['MNG', 'Mangue FC', 'letras salteadas na mesma palavra'],
    ['EBF', 'Ébano FC', 'primeira letra acentuada'],
    ['CCF', 'Çaçula FC', 'cedilha equivale a c'],
    ['DLT', 'delta fc time', 'nome em minúsculas'],
    ['SAN', 'S.A. Norte', 'pontos ignorados na sequência'],
  ])('%s corresponde a "%s" (%s)', (acronym, name) => {
    expect(acronymMatchesName(acronym, name)).toBe(true);
  });

  it.each([
    ['GFC', 'Águias FC', 'não começa pela primeira letra do nome'],
    ['XYZ', 'Águias FC', 'letras ausentes do nome'],
    ['ACF', 'Águias FC', 'letras fora de ordem'],
    ['AUU', 'Águias FC', 'letra repetida que aparece uma vez só depois'],
    ['AGG', 'Águias FC', 'segunda ocorrência inexistente'],
  ])('%s não corresponde a "%s" (%s)', (acronym, name) => {
    expect(acronymMatchesName(acronym, name)).toBe(false);
  });
});

describe('hasAllSameLetters', () => {
  it.each([
    ['AAA', true],
    ['AAB', false],
    ['ABA', false],
    ['ABC', false],
  ])('%s → %p', (acronym, expected) => {
    expect(hasAllSameLetters(acronym)).toBe(expected);
  });
});
