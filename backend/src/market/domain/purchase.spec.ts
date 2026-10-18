import { calculatePurchaseFee, fitsCashLimit, isWithinLoyaltyWindow } from './purchase';

describe('isWithinLoyaltyWindow (fim da fidelidade)', () => {
  const now = new Date('2026-11-02T13:15:30.500Z');
  const DAY = 86_400_000;
  const after = (milliseconds: number) => new Date(now.getTime() + milliseconds);

  it.each([
    ['o próprio momento', 0, false],
    ['no passado', -60_000, false],
    ['1 milissegundo depois', 1, true],
    ['exatamente 1.095 dias depois', 1095 * DAY, true],
    ['1.095 dias e 1 milissegundo depois', 1095 * DAY + 1, false],
  ])('%s → %p', (_description, offset, expected) => {
    expect(isWithinLoyaltyWindow(after(offset), now)).toBe(expected);
  });
});

describe('RN13 — taxa e limite de 50% do caixa (tabela oficial)', () => {
  it.each([
    // caixa, valor de mercado, taxa, custo total, aceita
    [30000, 2800, 0, 2800, true],
    [30000, 3000, 0, 3000, true],
    [30000, 3001, 150, 3151, true],
    [10000, 4762, 238, 5000, true],
    [10000, 4800, 240, 5040, false],
  ])('caixa %i, valor %i → taxa %i, custo %i, aceita: %p', (cash, value, fee, cost, accepted) => {
    expect(calculatePurchaseFee(value)).toBe(fee);
    expect(value + fee).toBe(cost);
    expect(fitsCashLimit(cost, cash)).toBe(accepted);
  });

  it('limite é a metade exata do caixa: 261,15 aceita 130,57 e recusa 130,58', () => {
    expect(fitsCashLimit(13057, 26115)).toBe(true);
    expect(fitsCashLimit(13058, 26115)).toBe(false);
  });

  it.each([
    [10532, 527, '105,32 × 5% = 5,266'],
    [9020, 451, '90,20 × 5% = 4,51'],
    [3001, 150, '30,01 × 5% = 1,5005'],
    [3010, 151, '30,10 × 5% = 1,505: meio para longe do zero'],
  ])('taxa de %i = %i (%s)', (value, fee) => {
    expect(calculatePurchaseFee(value)).toBe(fee);
  });
});
