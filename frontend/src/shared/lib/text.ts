/**
 * Regras de texto do enunciado (V4), iguais às do backend: espaço é só o U+0020;
 * caractere é um ponto de código Unicode; palavra é um trecho sem espaço com uma letra.
 */
const CONTROL_CHARACTER = /\p{Cc}/u;
const LETTER = /\p{L}/u;
const SPACE = ' ';

/** Remove espaços do início e do fim e reduz espaços repetidos a um só. */
export function normalizeSpaces(text: string): string {
  return text.replace(/^ +| +$/g, '').replace(/ {2,}/g, SPACE);
}

export function hasControlCharacters(text: string): boolean {
  return CONTROL_CHARACTER.test(text);
}

export function countCharacters(text: string): number {
  return [...text].length;
}

export function countWords(text: string): number {
  return text.split(SPACE).filter((token) => LETTER.test(token)).length;
}
