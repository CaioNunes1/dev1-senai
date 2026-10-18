import { calculateCommission, settleSale } from './sale';

describe('RN16 — comissão progressiva (tabela oficial)', () => {
  it.each([
    [300, 30, '10% × 3,00'],
    [385, 39, '10% × 3,85 = 0,385'],
    [1000, 100, '10% × 10,00'],
    [1001, 100, '10% × 10,00 + 20% × 0,01 = 1,002'],
    [1500, 200, '1,00 + 20% × 5,00'],
    [-750, 0, 'sem lucro'],
    [0, 0, 'lucro zero'],
  ])('lucro %i → comissão %i (%s)', (profit, commission) => {
    expect(calculateCommission(profit)).toBe(commission);
  });
});

describe('RN15 + RN16 — acerto da venda (tabela oficial)', () => {
  const now = new Date('2026-11-05T19:40:00.000Z');
  const DAY = 86_400_000;
  /** Fim da fidelidade que leva ao percentual pedido: 10% → 100 dias; 20% → 200; 5% → 10. */
  const loyaltyFor = (rate: number) =>
    new Date(
      now.getTime() +
        ({ 0: -DAY, 5: 10 * DAY, 10: 100 * DAY, 20: 200 * DAY } as Record<number, number>)[rate],
    );

  it.each([
    // compra, venda, %, multa, lucro, comissão, crédito, situação
    [3700, 4000, 10, 400, 300, 30, 3570, 'RESCINDIDO'],
    [5000, 4250, 20, 850, -750, 0, 3400, 'RESCINDIDO'],
    [2615, 3000, 5, 150, 385, 39, 2811, 'RESCINDIDO'],
    [2500, 2500, 0, 0, 0, 0, 2500, 'ENCERRADO'],
    [6000, 7500, 20, 1000, 1500, 200, 6300, 'RESCINDIDO'],
  ])(
    'compra %i, venda %i com %i%% → multa %i, lucro %i, comissão %i, crédito %i, %s',
    (purchaseValue, marketValue, rate, penalty, profit, commission, credit, status) => {
      const settlement = settleSale({
        purchaseValue,
        marketValue,
        loyaltyUntil: loyaltyFor(rate),
        now,
      });
      expect(settlement).toMatchObject({
        penaltyRate: rate,
        penalty,
        profit,
        commission,
        credit,
        contractStatus: status,
      });
    },
  );

  it('exemplo 2.3.2: Meia Lua vendido em 05/11/2026 às 16:40 (117 dias, 10%)', () => {
    const settlement = settleSale({
      purchaseValue: 3700,
      marketValue: 4000,
      loyaltyUntil: new Date('2027-03-02T13:15:00.000Z'),
      now,
    });
    expect(settlement).toEqual({
      remainingDays: 117,
      penaltyRate: 10,
      penalty: 400,
      profit: 300,
      commission: 30,
      credit: 3570,
      contractStatus: 'RESCINDIDO',
    });
  });
});
