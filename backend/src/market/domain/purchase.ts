import { MILLISECONDS_PER_DAY } from '../../common/domain/datetime';
import { Cents } from '../../common/domain/money';
import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';

/** RN14: no máximo 12 jogadores por clube. */
export const MAX_SQUAD_SIZE = 12;

/** Limites de cada campo › `loyalty_until`: até 1.095 dias depois do momento da compra. */
export const MAX_LOYALTY_DAYS = 1095;

const FEE_THRESHOLD: Cents = 3000;
const FEE_PERCENT = 5;

/** RN13: taxa de 5% do valor de mercado, arredondada, só quando o valor passa de 30,00. */
export function calculatePurchaseFee(marketValue: Cents): Cents {
  return marketValue > FEE_THRESHOLD
    ? divideRoundingHalfAwayFromZero(marketValue * FEE_PERCENT, 100)
    : 0;
}

/**
 * RN13: o custo total (valor + taxa) não pode passar de 50% do caixa antes da compra;
 * pode ser igual. Compara `2 × custo ≤ caixa` para usar a metade exata, sem arredondar
 * (com caixa de 261,15, o limite é 130,575 e um custo de 130,58 é recusado).
 */
export function fitsCashLimit(totalCost: Cents, cash: Cents): boolean {
  return 2 * totalCost <= cash;
}

/**
 * Limites de cada campo › `loyalty_until`: depois do momento da compra (não igual) e até
 * 1.095 dias depois dele, inclusive.
 */
export function isWithinLoyaltyWindow(loyaltyUntil: Date, now: Date): boolean {
  const latest = now.getTime() + MAX_LOYALTY_DAYS * MILLISECONDS_PER_DAY;
  return loyaltyUntil.getTime() > now.getTime() && loyaltyUntil.getTime() <= latest;
}
