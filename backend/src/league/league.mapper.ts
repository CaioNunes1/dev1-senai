import { Club, Match, MatchDuel, Player } from '@prisma/client';
import { formatBrasiliaDateTime } from '../common/domain/datetime';
import { compareRosterOrder } from '../players/domain/roster-order';
import { toPlayerResponse } from '../players/player.mapper';
import { STARTERS } from './domain/formation';
import { resultOf } from './domain/match-engine';
import { StandingRow } from './domain/standings';
import {
  DuelResponse,
  LineupResponse,
  MatchResponse,
  MatchSummaryResponse,
  StandingResponse,
} from './dto/league-responses';

/** RN19 › 6: titulares na ordem do elenco; completa só com a formação e os 5 titulares. */
export function toLineupResponse(
  clubId: number,
  formation: string | null,
  starters: readonly Player[],
): LineupResponse {
  return {
    club_id: clubId,
    formation,
    complete: formation !== null && starters.length === STARTERS,
    players: [...starters].sort(compareRosterOrder).map((player) => toPlayerResponse(player)),
  };
}

export type MatchWithClubs = Match & { homeClub: Club; awayClub: Club };

export function toMatchSummaryResponse(match: MatchWithClubs): MatchSummaryResponse {
  return {
    id: match.id,
    played_at: formatBrasiliaDateTime(match.playedAt),
    home: {
      club_id: match.homeClubId,
      club_name: match.homeClub.name,
      formation: match.homeFormation,
      goals: match.homeGoals,
    },
    away: {
      club_id: match.awayClubId,
      club_name: match.awayClub.name,
      formation: match.awayFormation,
      goals: match.awayGoals,
    },
    result: resultOf(match.homeGoals, match.awayGoals),
  };
}

/** RN20 › 7: os duelos como foram gravados, sem recalcular nada com os jogadores de hoje. */
export function toMatchResponse(match: MatchWithClubs & { duels: MatchDuel[] }): MatchResponse {
  return {
    ...toMatchSummaryResponse(match),
    duels: [...match.duels].sort((a, b) => a.order - b.order).map(toDuelResponse),
  };
}

function toDuelResponse(duel: MatchDuel): DuelResponse {
  return {
    order: duel.order,
    attacking_club_id: duel.attackingClubId,
    attacker: {
      player_id: duel.attackerId,
      player_name: duel.attackerName,
      position: duel.attackerPosition,
      condition: duel.attackerCondition,
      attribute: duel.attackAttribute,
      value: duel.attackValue,
    },
    defender: {
      player_id: duel.defenderId,
      player_name: duel.defenderName,
      position: duel.defenderPosition,
      condition: duel.defenderCondition,
      attribute: duel.defenseAttribute,
      value: duel.defenseValue,
    },
    goal: duel.goal,
  };
}

export function toStandingResponse(row: StandingRow): StandingResponse {
  return {
    position: row.position,
    club_id: row.clubId,
    club_name: row.clubName,
    played: row.played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    goal_difference: row.goalDifference,
    points: row.points,
  };
}
