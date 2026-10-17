import { Cents } from '../../common/domain/money';
import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';
import { YOUNG_PROSPECT_MAX_AGE } from './player.types';

export interface BaseValueInput {
  /** Overall calculado com a posição e os atributos do cadastro. */
  overall: number;
  potential: number;
  /** Idade informada no cadastro. */
  ageAtRegistration: number;
}

interface OverallTier {
  firstPoint: number;
  lastPoint: number;
  centsPerPoint: Cents;
}

/** Faixas progressivas da parte do overall (RN06); até 40 pontos não soma nada. */
const OVERALL_TIERS: readonly OverallTier[] = [
  { firstPoint: 41, lastPoint: 60, centsPerPoint: 50 },
  { firstPoint: 61, lastPoint: 75, centsPerPoint: 200 },
  { firstPoint: 76, lastPoint: 99, centsPerPoint: 600 },
];

const MINIMUM_BASE_VALUE: Cents = 100;

/**
 * RN06: valor base, calculado uma única vez, no cadastro, e gravado.
 * 1. parte do overall pelas faixas progressivas;
 * 2. jovem promessa (até 21 anos no cadastro): × (100 + potencial − overall) ÷ 100;
 * 3. arredondamento único para centavos e piso de 1,00.
 */
export function calculateBaseValue(input: Readonly<BaseValueInput>): Cents {
  const overallPart = calculateOverallPart(input.overall);
  const value =
    input.ageAtRegistration <= YOUNG_PROSPECT_MAX_AGE
      ? divideRoundingHalfAwayFromZero(overallPart * (100 + input.potential - input.overall), 100)
      : overallPart;
  return Math.max(value, MINIMUM_BASE_VALUE);
}

function calculateOverallPart(overall: number): Cents {
  return OVERALL_TIERS.reduce((total, tier) => {
    const pointsInTier = Math.min(overall, tier.lastPoint) - tier.firstPoint + 1;
    return total + Math.max(pointsInTier, 0) * tier.centsPerPoint;
  }, 0);
}
