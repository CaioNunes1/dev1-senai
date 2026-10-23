import { compareNames } from '../../common/domain/text';

export interface StandingClub {
  id: number;
  name: string;
}

export interface PlayedMatch {
  homeClubId: number;
  awayClubId: number;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingRow {
  position: number;
  clubId: number;
  clubName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const POINTS = { win: 3, draw: 1, loss: 0 } as const;

type Tally = Omit<StandingRow, 'position' | 'goalDifference' | 'points'>;

/**
 * RN21: classificação calculada a cada consulta, com todos os clubes (os que não jogaram
 * ficam zerados). Ordem: pontos, saldo, gols marcados, nome (ordem alfabética do enunciado)
 * e, em nomes iguais nessa comparação, id crescente.
 */
export function computeStandings(
  clubs: readonly StandingClub[],
  matches: readonly PlayedMatch[],
): StandingRow[] {
  const tallies = new Map<number, Tally>(
    clubs.map((club) => [
      club.id,
      {
        clubId: club.id,
        clubName: club.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      },
    ]),
  );
  for (const match of matches) {
    record(tallies.get(match.homeClubId), match.homeGoals, match.awayGoals);
    record(tallies.get(match.awayClubId), match.awayGoals, match.homeGoals);
  }
  return [...tallies.values()]
    .map((tally) => ({
      ...tally,
      goalDifference: tally.goalsFor - tally.goalsAgainst,
      points: tally.wins * POINTS.win + tally.draws * POINTS.draw + tally.losses * POINTS.loss,
    }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        second.goalsFor - first.goalsFor ||
        compareNames(first.clubName, second.clubName) ||
        first.clubId - second.clubId,
    )
    .map((row, index) => ({ position: index + 1, ...row }));
}

function record(tally: Tally | undefined, scored: number, conceded: number): void {
  if (!tally) {
    return;
  }
  tally.played += 1;
  tally.goalsFor += scored;
  tally.goalsAgainst += conceded;
  if (scored > conceded) {
    tally.wins += 1;
  } else if (scored === conceded) {
    tally.draws += 1;
  } else {
    tally.losses += 1;
  }
}
