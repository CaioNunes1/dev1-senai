import { describe, expect, it } from 'vitest';
import { acronymMatchesName, createClubSchema } from './club-schemas';

/** Primeira mensagem de cada campo, como o React Hook Form mostra. */
function errorsOf(values: { name: string; acronym: string }): Record<string, string> {
  const result = createClubSchema.safeParse(values);
  const errors: Record<string, string> = {};
  for (const issue of result.success ? [] : result.error.issues) {
    errors[String(issue.path[0])] ??= issue.message;
  }
  return errors;
}

describe('createClubSchema (RN10 e limites de name/acronym)', () => {
  it('normaliza os espaços do nome, mantém os acentos e envia só nome e sigla', () => {
    expect(createClubSchema.parse({ name: '  Leões   da Serra ', acronym: 'LDS' })).toEqual({
      name: 'Leões da Serra',
      acronym: 'LDS',
    });
  });

  it.each([
    ['Águias FC', 'AGU'],
    ['Águias FC', 'AFC'],
    ['Ébano-Clube S.A.', 'ECS'],
    ['Tubarões do Norte', 'TDN'],
    ['Çaçula FC', 'CCF'],
    ['Clube Atlético Recreativo Unido Serra', 'CAR'],
  ])('aceita "%s" com a sigla %s', (name, acronym) => {
    expect(errorsOf({ name, acronym })).toEqual({});
  });

  it.each([
    ['', 'Informe o nome do clube.'],
    ['   ', 'Informe o nome do clube.'],
    ['Águias\tFC', 'Remova tabulações e quebras de linha.'],
    ['Ab', 'Use de 3 a 60 caracteres.'],
    [`${'A'.repeat(30)} ${'B'.repeat(30)}`, 'Use de 3 a 60 caracteres.'],
    ['Águias FC 2', 'Use só letras, espaços, hífen e ponto (sem números).'],
    ['Águias & FC', 'Use só letras, espaços, hífen e ponto (sem números).'],
    ['Águias', 'Use de 2 a 5 palavras.'],
    ['Clube Atlético Recreativo Unido da Serra', 'Use de 2 a 5 palavras.'],
  ])('recusa o nome %j', (name, message) => {
    expect(errorsOf({ name, acronym: 'AGU' }).name).toBe(message);
  });

  it.each([
    ['', 'Informe a sigla.'],
    ['AG', 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.'],
    ['AGUA', 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.'],
    ['agu', 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.'],
    ['ÁGU', 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.'],
    [' AGU', 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.'],
    ['AAA', 'A sigla não pode ter as três letras iguais.'],
    ['XYZ', 'A sigla deve começar pela primeira letra do nome e usar letras do nome, nessa ordem.'],
    ['GAU', 'A sigla deve começar pela primeira letra do nome e usar letras do nome, nessa ordem.'],
  ])('recusa a sigla %j para "Águias FC"', (acronym, message) => {
    expect(errorsOf({ name: 'Águias FC', acronym }).acronym).toBe(message);
  });

  it('só confere a sigla com o nome quando o nome está válido (o erro é do nome)', () => {
    expect(errorsOf({ name: 'Ab', acronym: 'XYZ' })).toEqual({
      name: 'Use de 3 a 60 caracteres.',
    });
  });
});

describe('acronymMatchesName', () => {
  it.each([
    ['AGU', 'Águias FC', true],
    ['ASC', 'Águias FC', true],
    ['UGA', 'Águias FC', false],
    ['AFF', 'Águias FC', false],
    ['LDS', 'leões da serra', true],
  ])('%s em "%s" → %s', (acronym, name, expected) => {
    expect(acronymMatchesName(acronym, name)).toBe(expected);
  });
});
