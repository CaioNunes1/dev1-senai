import { Position } from '../../players/domain/player.types';

/** RN19: as 4 formações aceitas, contando só os 4 jogadores de linha. */
export const FORMATIONS = ['3-1', '2-2', '2-1-1', '1-2-1'] as const;
export type Formation = (typeof FORMATIONS)[number];

/** Titulares de uma escalação completa: 1 goleiro e 4 jogadores de linha. */
export const STARTERS = 5;

interface Sectors {
  defense: number;
  midfield: number;
  attack: number;
}

/** Tabela da RN19: defesa (ZAG ou LAT), meio (MEI) e ataque (ATA). */
const SECTORS: Record<Formation, Sectors> = {
  '3-1': { defense: 3, midfield: 0, attack: 1 },
  '2-2': { defense: 2, midfield: 0, attack: 2 },
  '2-1-1': { defense: 2, midfield: 1, attack: 1 },
  '1-2-1': { defense: 1, midfield: 2, attack: 1 },
};

export function isFormation(value: unknown): value is Formation {
  return (FORMATIONS as readonly unknown[]).includes(value);
}

/**
 * RN19 › 4: as posições dos 5 titulares fecham a formação? Exatamente 1 GOL e, em cada
 * setor, a quantidade da tabela. Devolve a mensagem do problema ou `undefined`.
 */
export function formationViolation(
  formation: Formation,
  positions: readonly Position[],
): string | undefined {
  const count = (...accepted: Position[]) =>
    positions.filter((position) => accepted.includes(position)).length;
  const goalkeepers = count('GOL');
  if (goalkeepers !== 1) {
    return `A escalação precisa de exatamente 1 goleiro (GOL); foram enviados ${goalkeepers}.`;
  }
  const expected = SECTORS[formation];
  const actual: Sectors = {
    defense: count('ZAG', 'LAT'),
    midfield: count('MEI'),
    attack: count('ATA'),
  };
  if (
    actual.defense !== expected.defense ||
    actual.midfield !== expected.midfield ||
    actual.attack !== expected.attack
  ) {
    return (
      `As posições não fecham a formação ${formation}: ela pede ${describe(expected)}, ` +
      `e a escalação enviada tem ${describe(actual)}.`
    );
  }
  return undefined;
}

function describe({ defense, midfield, attack }: Sectors): string {
  return `${defense} na defesa (ZAG ou LAT), ${midfield} no meio (MEI) e ${attack} no ataque (ATA)`;
}
