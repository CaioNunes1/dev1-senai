import {
  compareNames,
  countCharacters,
  countWords,
  hasControlCharacters,
  includesIgnoringCaseAndAccents,
  normalizeSpaces,
  removeAccents,
} from './text';

describe('compareNames (Premissas › Ordem alfabética)', () => {
  const sortNames = (names: string[]) => [...names].sort(compareNames);

  it('"Épsilon" fica entre "Delta" e "Gama" (exemplo oficial)', () => {
    expect(sortNames(['Gama', 'Épsilon', 'Delta'])).toEqual(['Delta', 'Épsilon', 'Gama']);
  });

  it('"Ana Lima" vem antes de "Ana-Maria": espaço antes do hífen (exemplo oficial)', () => {
    expect(sortNames(['Ana-Maria', 'Ana Lima'])).toEqual(['Ana Lima', 'Ana-Maria']);
  });

  it('hífen vem antes das letras', () => {
    expect(sortNames(['Anabela', 'Ana-Maria'])).toEqual(['Ana-Maria', 'Anabela']);
  });

  it.each([
    ['Águias FC', 'Aguias FC'],
    ['ÁGUIAS FC', 'águias fc'],
    ['Çaçula', 'cacula'],
  ])('"%s" e "%s" empatam', (first, second) => {
    expect(compareNames(first, second)).toBe(0);
  });

  it('nome mais curto vem antes quando é prefixo do outro', () => {
    expect(sortNames(['Ana Lima', 'Ana'])).toEqual(['Ana', 'Ana Lima']);
  });

  it('compara por ponto de código, não por unidade UTF-16', () => {
    // U+FB01 (ligadura "fi") < U+1D538 (A matemático), embora em UTF-16 o segundo comece por 0xD835
    expect(compareNames('ﬁ', '\u{1D538}')).toBeLessThan(0);
  });
});

describe('includesIgnoringCaseAndAccents (RN07)', () => {
  it.each([
    ['João Silva', 'joao', true],
    ['Meia Lua', 'LUA', true],
    ['Conceição Reis', 'CONCEICAO', true],
    ['Meia Lua', 'sol', false],
  ])('"%s" contém "%s"? %p', (text, search, expected) => {
    expect(includesIgnoringCaseAndAccents(text, search)).toBe(expected);
  });
});

describe('normalizeSpaces (V4)', () => {
  it.each([
    ['  Meia   Zeta ', 'Meia Zeta', 'exemplo oficial'],
    ['Águias FC', 'Águias FC', 'texto já normalizado'],
    ['   ', '', 'só espaços vira vazio'],
    ['A  B  C', 'A B C', 'vários grupos de espaços'],
    ['Águias FC', 'Águias FC', 'espaço não separável não é o U+0020'],
    ['\tÁguias FC', '\tÁguias FC', 'tabulação não é removida (é recusada à parte)'],
  ])('"%s" → "%s" (%s)', (input, expected) => {
    expect(normalizeSpaces(input)).toBe(expected);
  });
});

describe('hasControlCharacters (V4)', () => {
  it.each([
    ['Águias\tFC', true],
    ['Águias\nFC', true],
    ['Águias\rFC', true],
    ['Águias\u0000FC', true],
    ['Águias FC', false],
    ['Ébano-Clube S.A.', false],
  ])('%j → %p', (input, expected) => {
    expect(hasControlCharacters(input)).toBe(expected);
  });
});

describe('countCharacters', () => {
  it.each([
    ['Águias FC', 9],
    ['', 0],
    ['\u{1D538}bc', 3],
  ])('%j tem %i caracteres', (input, expected) => {
    expect(countCharacters(input)).toBe(expected);
  });
});

describe('countWords', () => {
  it.each([
    ['Águias FC', 2],
    ['Águias', 1],
    ['Clube Atlético Recreativo Unido Serra', 5],
    ['Águias - FC', 2],
    ['Ébano-Clube S.A.', 2],
    ['', 0],
  ])('%j tem %i palavras', (input, expected) => {
    expect(countWords(input)).toBe(expected);
  });
});

describe('removeAccents', () => {
  it.each([
    ['Águias', 'Aguias'],
    ['Épsilon', 'Epsilon'],
    ['Çaçula', 'Cacula'],
    ['Tubarões', 'Tubaroes'],
    ['João', 'Joao'],
    ['Aguias', 'Aguias'],
  ])('%s → %s', (input, expected) => {
    expect(removeAccents(input)).toBe(expected);
  });
});
