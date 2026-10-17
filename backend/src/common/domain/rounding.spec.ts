import { divideRoundingHalfAwayFromZero } from './rounding';

describe('divideRoundingHalfAwayFromZero', () => {
  it.each([
    // numerador, denominador, esperado, motivo
    [7265, 100, 73, '72,65 sobe'],
    [7250, 100, 73, '72,50: meio sobe'],
    [7249, 100, 72, '72,49 desce'],
    [7240, 100, 72, '72,40 desce'],
    [8775, 1000, 9, '8,775 sobe'],
    [3625, 1000, 4, '3,625 sobe'],
    [2295, 1000, 2, '2,295 desce'],
    [7200, 100, 72, 'divisão exata'],
    [0, 100, 0, 'zero'],
    [49, 100, 0, '0,49 desce para zero'],
    [50, 100, 1, '0,50 sobe para um'],
    [-385, 100, -4, '−3,85 vai para −4 (longe do zero)'],
    [-350, 100, -4, '−3,50: meio vai para longe do zero'],
    [-349, 100, -3, '−3,49 vai para −3'],
  ])('%i ÷ %i = %i (%s)', (numerator, denominator, expected) => {
    expect(divideRoundingHalfAwayFromZero(numerator, denominator)).toBe(expected);
  });

  it.each([
    [1.5, 10],
    [10, 0],
    [10, -2],
    [10, 2.5],
  ])('recusa operandos inválidos (%p ÷ %p)', (numerator, denominator) => {
    expect(() => divideRoundingHalfAwayFromZero(numerator, denominator)).toThrow(RangeError);
  });
});
