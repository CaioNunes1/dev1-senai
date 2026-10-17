/** Posições na ordem de trás para frente (GOL → ATA), usada também nas ordenações. */
export const POSITIONS = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'] as const;
export type Position = (typeof POSITIONS)[number];

export const CONDITIONS = ['APTO', 'MAL_CONDICIONADO', 'DOENTE'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Jovem promessa: até 21 anos (glossário; usado na RN04 e na RN06). */
export const YOUNG_PROSPECT_MAX_AGE = 21;

/** Os seis atributos técnicos informados no cadastro (RN06). */
export interface TechnicalAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}
