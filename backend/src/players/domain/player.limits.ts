/** Limites inclusivos de cada campo do jogador (README › "Limites de cada campo"). */
export const PLAYER_LIMITS = {
  nameLength: { min: 3, max: 100 },
  nameMinWords: 2,
  agility: { min: 1, max: 100 },
  age: { min: 16, max: 45 },
  attribute: { min: 1, max: 99 },
  potential: { min: 1, max: 99 },
  attributesMaxSum: 480,
  /** Com 35 anos ou mais, agilidade de no máximo 85. */
  veteranAgility: { fromAge: 35, max: 85 },
  /** No cadastro com 33 anos ou mais, o potencial é igual ao maior dos seis atributos. */
  potentialFixedFromAge: 33,
} as const;
