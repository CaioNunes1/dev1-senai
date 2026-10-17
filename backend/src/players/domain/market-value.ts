import { Cents } from '../../common/domain/money';
import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';
import { Condition, YOUNG_PROSPECT_MAX_AGE } from './player.types';

export interface MarketValueInput {
  /** Valor base gravado no cadastro (já arredondado). */
  baseValue: Cents;
  condition: Condition;
  agility: number;
  /** Idade atual do jogador. */
  age: number;
}

/**
 * Percentuais em décimos de ponto percentual (per mille), para representar
 * 7,5% (75‰) sem frações: 15% = 150‰, +10 pontos percentuais = +100‰.
 */
const PER_MILLE = 1000;

/** RN02 — desconto por condição física. */
const CONDITION_DISCOUNT: Readonly<Record<Condition, number>> = {
  APTO: 0,
  MAL_CONDICIONADO: 150,
  DOENTE: 300,
};

/** RN03 — faixas de agilidade que alteram o desconto por condição. */
const HIGH_AGILITY_MIN = 80;
const LOW_AGILITY_MAX = 30;
const LOW_AGILITY_EXTRA_DISCOUNT = 100;

/** RN04 — ajuste pela idade atual. */
const VETERAN_MIN_AGE = 32;
const AGE_ADJUSTMENT = 100;

/** RN05 — teto do desconto (percentual total mínimo) e piso do valor. */
const MINIMUM_TOTAL_PERCENTAGE = -400;
const MINIMUM_MARKET_VALUE: Cents = 100;

/**
 * RN05: valor de mercado, calculado a cada consulta, nesta ordem:
 * 1. desconto por condição (RN02), já ajustado pela agilidade (RN03);
 * 2. percentual total = ajuste por idade (RN04) − desconto por condição;
 * 3. teto: percentual total abaixo de −40% vira −40%;
 * 4. valor base × (100 + percentual total) ÷ 100, arredondado uma única vez;
 * 5. piso de 1,00.
 */
export function calculateMarketValue(input: Readonly<MarketValueInput>): Cents {
  const totalPercentage = Math.max(
    calculateAgeAdjustment(input.age) - calculateConditionDiscount(input.condition, input.agility),
    MINIMUM_TOTAL_PERCENTAGE,
  );
  const value = divideRoundingHalfAwayFromZero(
    input.baseValue * (PER_MILLE + totalPercentage),
    PER_MILLE,
  );
  return Math.max(value, MINIMUM_MARKET_VALUE);
}

/** RN02 + RN03: a agilidade só altera o desconto de quem não está APTO. */
function calculateConditionDiscount(condition: Condition, agility: number): number {
  const discount = CONDITION_DISCOUNT[condition];
  if (condition === 'APTO') {
    return discount;
  }
  if (agility >= HIGH_AGILITY_MIN) {
    return discount / 2;
  }
  if (agility <= LOW_AGILITY_MAX) {
    return discount + LOW_AGILITY_EXTRA_DISCOUNT;
  }
  return discount;
}

function calculateAgeAdjustment(age: number): number {
  if (age <= YOUNG_PROSPECT_MAX_AGE) {
    return AGE_ADJUSTMENT;
  }
  if (age >= VETERAN_MIN_AGE) {
    return -AGE_ADJUSTMENT;
  }
  return 0;
}
