import { calculateOverall } from './overall';
import { Position, TechnicalAttributes } from './player.types';

function attributes(
  pace: number,
  shooting: number,
  passing: number,
  dribbling: number,
  defending: number,
  physical: number,
): TechnicalAttributes {
  return { pace, shooting, passing, dribbling, defending, physical };
}

describe('calculateOverall (RN06)', () => {
  describe('exemplos oficiais', () => {
    it.each<[string, Position, TechnicalAttributes, number]>([
      // README › "Exemplos de cálculo do overall"
      ['MEI 7.265 → 72,65', 'MEI', attributes(68, 65, 80, 78, 52, 60), 73],
      ['ATA 7.610 → 76,10', 'ATA', attributes(78, 75, 73, 82, 48, 68), 76],
      ['LAT 7.240 → 72,40', 'LAT', attributes(72, 70, 78, 76, 70, 66), 72],
      ['ZAG 7.250 → 72,50 (meio para cima)', 'ZAG', attributes(50, 90, 60, 40, 80, 75), 73],
      ['GOL 6.770 → 67,70', 'GOL', attributes(55, 30, 65, 40, 72, 68), 68],
      // ficha-avaliacao-exemplo.md › B06
      ['ZAG 7.380 → 73,80', 'ZAG', attributes(60, 30, 55, 40, 81, 77), 74],
      ['ATA 7.460 → 74,60', 'ATA', attributes(80, 77, 60, 74, 30, 70), 75],
      ['LAT 6.050 → 60,50 (meio para cima)', 'LAT', attributes(60, 40, 60, 60, 62, 60), 61],
    ])('%s', (_description, position, playerAttributes, expected) => {
      expect(calculateOverall(position, playerAttributes)).toBe(expected);
    });
  });

  describe('arredondamento ao inteiro', () => {
    it.each<[string, Position, TechnicalAttributes, number]>([
      // 720 + 1.095 + 2.520 + 1.825 + 365 + 720 = 7.245 → 72,45
      ['72,45 (logo abaixo do meio) desce', 'MEI', attributes(72, 73, 72, 73, 73, 72), 72],
      // 720 + 1.095 + 2.555 + 1.825 + 360 + 720 = 7.275 → 72,75
      ['72,75 sobe', 'MEI', attributes(72, 73, 73, 73, 72, 72), 73],
      // 1.800 + 0 + 1.400 + 1.050 + 1.750 + 1.050 = 7.050 → 70,50
      ['70,50 (meio exato) sobe', 'LAT', attributes(72, 1, 70, 70, 70, 70), 71],
    ])('%s', (_description, position, playerAttributes, expected) => {
      expect(calculateOverall(position, playerAttributes)).toBe(expected);
    });
  });

  describe('pesos de cada posição (tabela oficial)', () => {
    const weightTable: Record<Position, TechnicalAttributes> = {
      GOL: attributes(10, 0, 20, 0, 40, 30),
      ZAG: attributes(10, 0, 15, 0, 45, 30),
      LAT: attributes(25, 0, 20, 15, 25, 15),
      MEI: attributes(10, 15, 35, 25, 5, 10),
      ATA: attributes(20, 40, 10, 20, 0, 10),
    };
    const attributeNames = Object.keys(weightTable.GOL) as (keyof TechnicalAttributes)[];
    const cases = (Object.keys(weightTable) as Position[]).flatMap((position) =>
      attributeNames.map((name) => [position, name, weightTable[position][name]] as const),
    );

    // Com um só atributo em 100 e os demais em 0, o overall é exatamente o peso desse atributo.
    // Os valores ficam fora dos limites da API de propósito, só para isolar cada peso.
    it.each(cases)('%s: peso de %s é %i', (position, name, expectedWeight) => {
      const isolated = { ...attributes(0, 0, 0, 0, 0, 0), [name]: 100 };
      expect(calculateOverall(position, isolated)).toBe(expectedWeight);
    });

    it.each(Object.keys(weightTable) as Position[])(
      '%s: atributos iguais resultam no próprio valor (pesos somam 100)',
      (position) => {
        expect(calculateOverall(position, attributes(64, 64, 64, 64, 64, 64))).toBe(64);
      },
    );
  });

  it('não altera os atributos recebidos', () => {
    const playerAttributes = Object.freeze(attributes(68, 65, 80, 78, 52, 60));
    expect(() => calculateOverall('MEI', playerAttributes)).not.toThrow();
    expect(playerAttributes).toEqual(attributes(68, 65, 80, 78, 52, 60));
  });
});
