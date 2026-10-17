import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';
import { Position, TechnicalAttributes } from './player.types';

/** Pesos (em %) de cada atributo por posição — RN06; os de cada posição somam 100. */
const POSITION_WEIGHTS: Readonly<Record<Position, Readonly<TechnicalAttributes>>> = {
  GOL: { pace: 10, shooting: 0, passing: 20, dribbling: 0, defending: 40, physical: 30 },
  ZAG: { pace: 10, shooting: 0, passing: 15, dribbling: 0, defending: 45, physical: 30 },
  LAT: { pace: 25, shooting: 0, passing: 20, dribbling: 15, defending: 25, physical: 15 },
  MEI: { pace: 10, shooting: 15, passing: 35, dribbling: 25, defending: 5, physical: 10 },
  ATA: { pace: 20, shooting: 40, passing: 10, dribbling: 20, defending: 0, physical: 10 },
};

const WEIGHT_TOTAL = 100;

/**
 * RN06: overall = Σ(atributo × peso da posição) ÷ 100, arredondado para o inteiro
 * mais próximo com meio para cima. Calculado a cada consulta; nunca gravado.
 */
export function calculateOverall(
  position: Position,
  attributes: Readonly<TechnicalAttributes>,
): number {
  const weights = POSITION_WEIGHTS[position];
  const weightedSum =
    attributes.pace * weights.pace +
    attributes.shooting * weights.shooting +
    attributes.passing * weights.passing +
    attributes.dribbling * weights.dribbling +
    attributes.defending * weights.defending +
    attributes.physical * weights.physical;
  return divideRoundingHalfAwayFromZero(weightedSum, WEIGHT_TOTAL);
}
