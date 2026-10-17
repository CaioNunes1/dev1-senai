import { calculateBaseValue } from './base-value';

/** Converte o valor em moedas da tabela (ex.: 34.2) para centavos. */
const toCents = (value: number): number => Math.round(value * 100);

describe('calculateBaseValue (RN06)', () => {
  describe('exemplos oficiais', () => {
    it.each([
      // overall, potencial, idade no cadastro, esperado, cálculo
      // README › "Exemplos de cálculo do valor base"
      [75, 86, 25, 40.0, '20 × 0,50 + 15 × 2,00'],
      [60, 70, 30, 10.0, 'fim da primeira faixa'],
      [61, 70, 30, 12.0, 'início da segunda faixa'],
      [76, 80, 22, 46.0, '10,00 + 30,00 + 1 × 6,00'],
      [85, 92, 27, 100.0, '10,00 + 30,00 + 10 × 6,00'],
      [70, 84, 21, 34.2, 'jovem promessa: 30,00 × 114 ÷ 100'],
      [70, 84, 22, 30.0, '22 anos: sem jovem promessa'],
      [45, 90, 18, 3.63, '2,50 × 145 ÷ 100 = 3,625 → meio para longe do zero'],
      [40, 66, 36, 1.0, 'parte do overall zero sobe para o piso'],
      // ficha-avaliacao-exemplo.md › B06
      [85, 99, 20, 114.0, '100,00 × 114 ÷ 100'],
      [83, 88, 27, 88.0, '10,00 + 30,00 + 8 × 6,00'],
      [43, 55, 36, 1.5, '3 × 0,50'],
    ])('overall %i, potencial %i, %i anos → %d (%s)', (overall, potential, age, expected) => {
      expect(calculateBaseValue({ overall, potential, ageAtRegistration: age })).toBe(
        toCents(expected),
      );
    });
  });

  describe('limites das faixas progressivas (sem jovem promessa)', () => {
    it.each([
      [40, 1.0, '0,00 → piso'],
      [41, 1.0, '0,50 → piso'],
      [42, 1.0, '1,00, exatamente o piso'],
      [43, 1.5, '3 × 0,50'],
      [60, 10.0, '20 × 0,50'],
      [61, 12.0, '10,00 + 1 × 2,00'],
      [75, 40.0, '10,00 + 15 × 2,00'],
      [76, 46.0, '40,00 + 1 × 6,00'],
      [99, 184.0, '10,00 + 30,00 + 24 × 6,00'],
    ])('overall %i → %d (%s)', (overall, expected) => {
      expect(calculateBaseValue({ overall, potential: 99, ageAtRegistration: 30 })).toBe(
        toCents(expected),
      );
    });
  });

  describe('jovem promessa', () => {
    it.each([
      // overall, potencial, idade, esperado, cálculo
      [70, 84, 21, 34.2, '21 anos aplica: 30,00 × 114 ÷ 100'],
      [70, 84, 16, 34.2, 'idade mínima aplica'],
      [70, 84, 22, 30.0, '22 anos não aplica'],
      [60, 60, 19, 10.0, 'potencial igual ao overall: × 100 ÷ 100'],
      [60, 99, 19, 13.9, '10,00 × 139 ÷ 100'],
      [47, 48, 20, 3.54, '3,50 × 101 ÷ 100 = 3,535 → meio para longe do zero'],
      [52, 53, 20, 6.06, '6,00 × 101 ÷ 100'],
      [40, 99, 18, 1.0, 'parte do overall zero continua zero → piso'],
      [41, 99, 18, 1.0, '0,50 × 158 ÷ 100 = 0,79 → piso'],
    ])('overall %i, potencial %i, %i anos → %d (%s)', (overall, potential, age, expected) => {
      expect(calculateBaseValue({ overall, potential, ageAtRegistration: age })).toBe(
        toCents(expected),
      );
    });
  });
});
