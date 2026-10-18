/**
 * Regras de texto do enunciado (V4 e "Definições usadas em todo o enunciado"):
 * caractere é um ponto de código Unicode; espaço é só o U+0020; letra é a categoria
 * Unicode L; palavra é uma sequência sem espaços com pelo menos uma letra.
 */

const CONTROL_CHARACTER = /\p{Cc}/u;
const LETTER = /\p{L}/u;
const ACCENT_MARKS = /\p{Mn}/gu;
const SPACE = ' ';

/** V4: remove espaços (U+0020) do início e do fim e reduz espaços repetidos a um só. */
export function normalizeSpaces(text: string): string {
  return text.replace(/^ +| +$/g, '').replace(/ {2,}/g, SPACE);
}

/** V4: caracteres de controle (como tabulação e quebra de linha) são recusados. */
export function hasControlCharacters(text: string): boolean {
  return CONTROL_CHARACTER.test(text);
}

/** Tamanho em pontos de código Unicode, não em unidades UTF-16. */
export function countCharacters(text: string): number {
  return [...text].length;
}

export function countWords(text: string): number {
  return text.split(SPACE).filter((token) => LETTER.test(token)).length;
}

/** Decompõe em NFD e retira as marcas de acento (Mn), inclusive a cedilha. */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(ACCENT_MARKS, '');
}

/** Minúsculas e sem acentos: forma usada na busca e na ordem alfabética do enunciado. */
export function toComparableText(text: string): string {
  return removeAccents(text.toLowerCase());
}

/** Busca "dentro do nome", ignorando maiúsculas, minúsculas e acentos (RN07). */
export function includesIgnoringCaseAndAccents(text: string, search: string): boolean {
  return toComparableText(text).includes(toComparableText(search));
}

/**
 * Ordem alfabética do enunciado (Premissas): minúsculas, sem acentos e comparação
 * caractere a caractere pela ordem Unicode. Compara pontos de código, e não unidades
 * UTF-16 (como o `<` do JavaScript), e não depende da collation do banco.
 * O espaço (U+0020) vem antes do hífen (U+002D), que vem antes das letras.
 */
export function compareNames(first: string, second: string): number {
  return compareByCodePoint(toComparableText(first), toComparableText(second));
}

function compareByCodePoint(first: string, second: string): number {
  const firstCodePoints = [...first];
  const secondCodePoints = [...second];
  const sharedLength = Math.min(firstCodePoints.length, secondCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference =
      (firstCodePoints[index].codePointAt(0) ?? 0) - (secondCodePoints[index].codePointAt(0) ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return firstCodePoints.length - secondCodePoints.length;
}
