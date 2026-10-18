import { MILLISECONDS_PER_DAY } from '../../common/domain/datetime';
import { Cents } from '../../common/domain/money';
import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';

const PENALTY_CAP: Cents = 1000;

/** RN15: faixas de dias restantes → percentual da multa. */
const PENALTY_RATES: readonly { maxDays: number; rate: number }[] = [
  { maxDays: 0, rate: 0 },
  { maxDays: 30, rate: 5 },
  { maxDays: 180, rate: 10 },
  { maxDays: Infinity, rate: 20 },
];

/**
 * RN15: dias restantes = (fim da fidelidade − agora) em dias com fração, arredondado para
 * cima; se o fim já passou ou é o próprio momento, 0. Usado na venda e na consulta do clube.
 */
export function calculateRemainingDays(loyaltyUntil: Date, now: Date): number {
  const remaining = loyaltyUntil.getTime() - now.getTime();
  if (remaining <= 0) {
    return 0;
  }
  const fullDays = (remaining - (remaining % MILLISECONDS_PER_DAY)) / MILLISECONDS_PER_DAY;
  return remaining % MILLISECONDS_PER_DAY > 0 ? fullDays + 1 : fullDays;
}

/** RN15: 0 dia → 0%; 1 a 30 → 5%; 31 a 180 → 10%; 181 ou mais → 20%. */
export function penaltyRateFor(remainingDays: number): number {
  return PENALTY_RATES.find((band) => remainingDays <= band.maxDays)?.rate ?? 0;
}

/** RN15: multa = valor de mercado × percentual, arredondada e limitada a 10,00. */
export function calculatePenalty(marketValue: Cents, penaltyRate: number): Cents {
  return Math.min(divideRoundingHalfAwayFromZero(marketValue * penaltyRate, 100), PENALTY_CAP);
}
