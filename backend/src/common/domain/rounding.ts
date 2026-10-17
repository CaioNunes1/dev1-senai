/**
 * Divide dois inteiros e arredonda o quociente para o inteiro mais próximo,
 * com o meio para longe do zero (3,5 → 4; −3,5 → −4).
 *
 * Usa só aritmética inteira (resto e subtração), sem frações em ponto flutuante,
 * para que um empate exato nunca vire 0,4999… por erro de representação.
 * Serve ao arredondamento monetário (em centavos) e ao do overall (RN06), que
 * para valores positivos coincide com "meio para cima".
 */
export function divideRoundingHalfAwayFromZero(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError('Numerador deve ser inteiro e denominador, inteiro positivo.');
  }
  const absoluteNumerator = Math.abs(numerator);
  const remainder = absoluteNumerator % denominator;
  const truncatedQuotient = (absoluteNumerator - remainder) / denominator;
  const roundedQuotient = 2 * remainder >= denominator ? truncatedQuotient + 1 : truncatedQuotient;
  return numerator < 0 ? -roundedQuotient : roundedQuotient;
}
