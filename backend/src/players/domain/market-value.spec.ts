import { calculateMarketValue } from './market-value';
import { Condition } from './player.types';

/** Converte o valor em moedas da tabela (ex.: 84.05) para centavos. */
const toCents = (value: number): number => Math.round(value * 100);

type MarketValueCase = [
  baseValue: number,
  condition: Condition,
  agility: number,
  age: number,
  expected: number,
  calculation: string,
];

function expectMarketValue([baseValue, condition, agility, age, expected]: MarketValueCase): void {
  expect(calculateMarketValue({ baseValue: toCents(baseValue), condition, agility, age })).toBe(
    toCents(expected),
  );
}

const title = '%d, %s, agilidade %i, %i anos → %d (%s)';

describe('calculateMarketValue (RN02 a RN05)', () => {
  describe('exemplos oficiais', () => {
    it.each<MarketValueCase>([
      // README › tabela da RN05
      [82, 'APTO', 20, 25, 82.0, 'a agilidade não age em APTO'],
      [82, 'APTO', 50, 19, 90.2, '+10%'],
      [82, 'MAL_CONDICIONADO', 50, 25, 69.7, '−15%'],
      [82, 'MAL_CONDICIONADO', 80, 21, 84.05, '−7,5% + 10% = +2,5%'],
      [82, 'MAL_CONDICIONADO', 30, 33, 53.3, '−25% − 10% = −35%'],
      [82, 'DOENTE', 90, 25, 69.7, '30% pela metade = −15%'],
      [82, 'DOENTE', 30, 25, 49.2, '−40%, exatamente no teto'],
      [82, 'DOENTE', 10, 40, 49.2, '−50%, limitado a −40%'],
      [9.5, 'MAL_CONDICIONADO', 85, 25, 8.79, '8,7875 arredondado'],
      [1, 'MAL_CONDICIONADO', 50, 35, 1.0, '0,75 sobe para o piso'],
      // ficha-avaliacao-exemplo.md › B05
      [114, 'APTO', 60, 20, 125.4, '+10%'],
      [88, 'MAL_CONDICIONADO', 85, 27, 81.4, '−7,5%'],
      [46, 'DOENTE', 20, 34, 27.6, '−40% − 10% = −50%, limitado a −40%'],
      [1.5, 'DOENTE', 50, 36, 1.0, '−40%: 0,90 sobe para o piso'],
      [9.5, 'MAL_CONDICIONADO', 25, 22, 7.13, '−25%: 7,125 arredondado'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  describe('condição física (RN02), com agilidade neutra e idade neutra', () => {
    it.each<MarketValueCase>([
      [100, 'APTO', 50, 25, 100.0, '0%'],
      [100, 'MAL_CONDICIONADO', 50, 25, 85.0, '−15%'],
      [100, 'DOENTE', 50, 25, 70.0, '−30%'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  describe('agilidade (RN03): limites das faixas', () => {
    it.each<MarketValueCase>([
      [100, 'MAL_CONDICIONADO', 1, 25, 75.0, '15% + 10 pontos'],
      [100, 'MAL_CONDICIONADO', 30, 25, 75.0, '15% + 10 pontos'],
      [100, 'MAL_CONDICIONADO', 31, 25, 85.0, 'sem efeito'],
      [100, 'MAL_CONDICIONADO', 79, 25, 85.0, 'sem efeito'],
      [100, 'MAL_CONDICIONADO', 80, 25, 92.5, '15% pela metade'],
      [100, 'MAL_CONDICIONADO', 100, 25, 92.5, '15% pela metade'],
      [100, 'DOENTE', 30, 25, 60.0, '30% + 10 pontos'],
      [100, 'DOENTE', 31, 25, 70.0, 'sem efeito'],
      [100, 'DOENTE', 79, 25, 70.0, 'sem efeito'],
      [100, 'DOENTE', 80, 25, 85.0, '30% pela metade'],
      [100, 'APTO', 1, 25, 100.0, 'não age em APTO'],
      [100, 'APTO', 30, 25, 100.0, 'não age em APTO'],
      [100, 'APTO', 80, 25, 100.0, 'não age em APTO'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  describe('idade atual (RN04): limites das faixas, inclusive em APTO', () => {
    it.each<MarketValueCase>([
      [100, 'APTO', 50, 16, 110.0, '+10%'],
      [100, 'APTO', 50, 21, 110.0, '+10%'],
      [100, 'APTO', 50, 22, 100.0, '0%'],
      [100, 'APTO', 50, 31, 100.0, '0%'],
      [100, 'APTO', 50, 32, 90.0, '−10%'],
      [100, 'APTO', 50, 45, 90.0, '−10%'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  describe('combinações e teto de −40% (RN05)', () => {
    it.each<MarketValueCase>([
      [100, 'MAL_CONDICIONADO', 80, 32, 82.5, '−7,5% − 10% = −17,5%'],
      [100, 'MAL_CONDICIONADO', 20, 19, 85.0, '−25% + 10% = −15%'],
      [100, 'DOENTE', 90, 20, 95.0, '−15% + 10% = −5%'],
      [100, 'DOENTE', 20, 20, 70.0, '−40% + 10% = −30%'],
      [100, 'DOENTE', 31, 40, 60.0, '−30% − 10% = −40%, exatamente no teto'],
      [100, 'DOENTE', 20, 40, 60.0, '−40% − 10% = −50%, limitado a −40%'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  describe('arredondamento monetário e piso de 1,00', () => {
    it.each<MarketValueCase>([
      [2.7, 'MAL_CONDICIONADO', 50, 25, 2.3, '2,295: empate exato, para longe do zero'],
      [1.3, 'MAL_CONDICIONADO', 90, 25, 1.2, '1,2025 desce'],
      [1.33, 'APTO', 50, 20, 1.46, '1,33 × 1,10 = 1,463 desce'],
      [1.12, 'APTO', 50, 32, 1.01, '1,008 → 1,01, acima do piso'],
      [1.1, 'APTO', 50, 32, 1.0, '0,99 sobe para o piso'],
      [1, 'APTO', 50, 35, 1.0, '0,90 sobe para o piso'],
      [1, 'APTO', 50, 20, 1.1, '1,10, sem piso'],
      [1, 'DOENTE', 10, 40, 1.0, '0,60 sobe para o piso'],
    ])(title, (...testCase) => expectMarketValue(testCase));
  });

  it('não altera o objeto recebido', () => {
    const input = Object.freeze({
      baseValue: 8200,
      condition: 'DOENTE' as const,
      agility: 10,
      age: 40,
    });
    expect(calculateMarketValue(input)).toBe(4920);
    expect(input).toEqual({ baseValue: 8200, condition: 'DOENTE', agility: 10, age: 40 });
  });
});
