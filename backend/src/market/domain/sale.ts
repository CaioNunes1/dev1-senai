import { Cents } from '../../common/domain/money';
import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';
import { calculatePenalty, calculateRemainingDays, penaltyRateFor } from './loyalty-penalty';

const COMMISSION_FIRST_BAND: Cents = 1000;
const COMMISSION_FIRST_PERCENT = 10;
const COMMISSION_ABOVE_PERCENT = 20;

export type EndedContractStatus = 'ENCERRADO' | 'RESCINDIDO';

export interface SaleInput {
  marketValue: Cents;
  purchaseValue: Cents;
  loyaltyUntil: Date;
  now: Date;
}

export interface SaleSettlement {
  remainingDays: number;
  penaltyRate: number;
  penalty: Cents;
  profit: Cents;
  commission: Cents;
  credit: Cents;
  contractStatus: EndedContractStatus;
}

/**
 * RN16: comissão progressiva, só com lucro: 10% sobre a parte até 10,00 + 20% sobre a
 * parte acima de 10,00, somadas e arredondadas uma única vez.
 */
export function calculateCommission(profit: Cents): Cents {
  if (profit <= 0) {
    return 0;
  }
  const firstBand = Math.min(profit, COMMISSION_FIRST_BAND);
  const aboveBand = Math.max(profit - COMMISSION_FIRST_BAND, 0);
  return divideRoundingHalfAwayFromZero(
    firstBand * COMMISSION_FIRST_PERCENT + aboveBand * COMMISSION_ABOVE_PERCENT,
    100,
  );
}

/**
 * RN15 + RN16: acerto da venda. Lucro = valor na venda − valor de compra; crédito no
 * caixa = valor − multa − comissão. Com multa o contrato fica RESCINDIDO; sem multa
 * (fidelidade cumprida), ENCERRADO.
 */
export function settleSale(input: SaleInput): SaleSettlement {
  const remainingDays = calculateRemainingDays(input.loyaltyUntil, input.now);
  const penaltyRate = penaltyRateFor(remainingDays);
  const penalty = calculatePenalty(input.marketValue, penaltyRate);
  const profit = input.marketValue - input.purchaseValue;
  const commission = calculateCommission(profit);
  return {
    remainingDays,
    penaltyRate,
    penalty,
    profit,
    commission,
    credit: input.marketValue - penalty - commission,
    contractStatus: penalty > 0 ? 'RESCINDIDO' : 'ENCERRADO',
  };
}
