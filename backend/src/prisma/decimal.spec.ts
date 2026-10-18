import { Prisma } from '@prisma/client';
import { centsToDecimal, decimalToCents } from './decimal';

describe('conversão NUMERIC ↔ centavos', () => {
  it.each([
    ['300.00', 30000],
    ['0.29', 29],
    ['8.79', 879],
    ['-38.85', -3885],
    ['0.00', 0],
  ])('%s ↔ %i', (decimal, cents) => {
    expect(decimalToCents(new Prisma.Decimal(decimal))).toBe(cents);
    expect(centsToDecimal(cents).toFixed(2)).toBe(decimal);
  });
});
