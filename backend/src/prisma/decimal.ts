import { Prisma } from '@prisma/client';
import { Cents } from '../common/domain/money';

/** NUMERIC(p,2) do banco → centavos inteiros, com aritmética decimal exata. */
export function decimalToCents(value: Prisma.Decimal): Cents {
  return value.times(100).toNumber();
}

/** Centavos inteiros → NUMERIC(p,2) do banco, com aritmética decimal exata. */
export function centsToDecimal(cents: Cents): Prisma.Decimal {
  return new Prisma.Decimal(cents).dividedBy(100);
}
