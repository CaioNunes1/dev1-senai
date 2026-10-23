import { divideRoundingHalfAwayFromZero } from '../../common/domain/rounding';
import { Condition, Position } from '../../players/domain/player.types';
import { compareRosterOrder } from '../../players/domain/roster-order';

/** Titular com os dados do momento da partida (RN20 › 2). */
export interface Starter {
  id: number;
  name: string;
  position: Position;
  condition: Condition;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
}

export type DuelAttribute = 'shooting' | 'passing' | 'dribbling' | 'defending';
export type MatchResult = 'MANDANTE' | 'VISITANTE' | 'EMPATE';

export interface DuelSide {
  player: Starter;
  attribute: DuelAttribute;
  value: number;
}

export interface Duel {
  order: number;
  attackingSide: 'home' | 'away';
  attacker: DuelSide;
  defender: DuelSide;
  goal: boolean;
}

export interface MatchOutcome {
  homeGoals: number;
  awayGoals: number;
  result: MatchResult;
  duels: Duel[];
}

/** RN20 › 3: MAL_CONDICIONADO joga com 85% (inteiro mais próximo, meio para cima). */
const MAL_CONDICIONADO_PERCENT = 85;

/** RN20 › 5: o atributo de ataque de cada posição de linha. */
const ATTACK_ATTRIBUTE: Record<Exclude<Position, 'GOL'>, DuelAttribute> = {
  ATA: 'shooting',
  MEI: 'passing',
  ZAG: 'dribbling',
  LAT: 'dribbling',
};

/**
 * RN20 › 4: quem ataca e quem defende, pelos índices dos jogadores de linha (0 = 1º, o mais
 * recuado). `null` é o goleiro. Os 3 duelos de um lado, na ordem da tabela oficial.
 */
const PAIRINGS: { attacker: number; defender: number | null }[] = [
  { attacker: 3, defender: null },
  { attacker: 2, defender: 0 },
  { attacker: 1, defender: 1 },
];

export function conditionedValue(value: number, condition: Condition): number {
  return condition === 'MAL_CONDICIONADO'
    ? divideRoundingHalfAwayFromZero(value * MAL_CONDICIONADO_PERCENT, 100)
    : value;
}

interface Team {
  goalkeeper: Starter;
  /** Jogadores de linha do 1º (mais recuado) ao 4º (mais avançado). */
  line: Starter[];
}

/** RN20 › 2: titulares na ordem do elenco (RN11): o goleiro e depois os 4 de linha. */
function toTeam(starters: readonly Starter[]): Team {
  const [goalkeeper, ...line] = [...starters].sort(compareRosterOrder);
  return { goalkeeper, line };
}

function side(player: Starter, attribute: DuelAttribute): DuelSide {
  return { player, attribute, value: conditionedValue(player[attribute], player.condition) };
}

function attacksOf(
  attacking: Team,
  defending: Team,
  attackingSide: Duel['attackingSide'],
  firstOrder: number,
): Duel[] {
  return PAIRINGS.map(({ attacker: attackerIndex, defender: defenderIndex }, index) => {
    const attackerPlayer = attacking.line[attackerIndex];
    const defenderPlayer =
      defenderIndex === null ? defending.goalkeeper : defending.line[defenderIndex];
    const attacker = side(
      attackerPlayer,
      ATTACK_ATTRIBUTE[attackerPlayer.position as Exclude<Position, 'GOL'>],
    );
    const defender = side(defenderPlayer, 'defending');
    return {
      order: firstOrder + index,
      attackingSide,
      attacker,
      defender,
      goal: attacker.value > defender.value,
    };
  });
}

/**
 * RN20: os 6 duelos (1 a 3, ataques do mandante; 4 a 6, do visitante), sem sorteio. Gol só
 * quando o ataque é maior que a defesa. Recebe escalações completas (5 titulares, 1 GOL),
 * já conferidas pela RN19.
 */
export function playMatch(home: readonly Starter[], away: readonly Starter[]): MatchOutcome {
  const homeTeam = toTeam(home);
  const awayTeam = toTeam(away);
  const duels = [
    ...attacksOf(homeTeam, awayTeam, 'home', 1),
    ...attacksOf(awayTeam, homeTeam, 'away', 4),
  ];
  const goalsOf = (attackingSide: Duel['attackingSide']) =>
    duels.filter((duel) => duel.attackingSide === attackingSide && duel.goal).length;
  const homeGoals = goalsOf('home');
  const awayGoals = goalsOf('away');
  return { homeGoals, awayGoals, result: resultOf(homeGoals, awayGoals), duels };
}

export function resultOf(homeGoals: number, awayGoals: number): MatchResult {
  if (homeGoals === awayGoals) {
    return 'EMPATE';
  }
  return homeGoals > awayGoals ? 'MANDANTE' : 'VISITANTE';
}
