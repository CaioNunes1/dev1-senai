/** Crédito em verde, débito em vermelho (Figma H01); o sinal também vai no texto. */
export function signedToneClass(value: number): string | undefined {
  if (value === 0) {
    return undefined;
  }
  return value > 0 ? 'text-success' : 'text-destructive';
}
