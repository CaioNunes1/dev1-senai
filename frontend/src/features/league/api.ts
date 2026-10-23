import { apiRequest } from '../../shared/api/http-client';
import type { Player } from '../players/api';

/** RN19: as 4 formações aceitas (o goleiro fica fora da conta). */
export const FORMATIONS = ['3-1', '2-2', '2-1-1', '1-2-1'] as const;
export type Formation = (typeof FORMATIONS)[number];

/** `GET`/`PUT /clubs/{id}/lineup` (README › 2.4.1): titulares na ordem do elenco. */
export type Lineup = {
  club_id: number;
  formation: Formation | null;
  complete: boolean;
  players: Player[];
};

export type LineupBody = { formation: Formation; player_ids: number[] };

export function getLineup(clubId: number, signal?: AbortSignal): Promise<Lineup> {
  return apiRequest<Lineup>(`/clubs/${clubId}/lineup`, { signal });
}

export function saveLineup(clubId: number, body: LineupBody): Promise<Lineup> {
  return apiRequest<Lineup>(`/clubs/${clubId}/lineup`, { method: 'PUT', body });
}

export type MatchResult = 'MANDANTE' | 'VISITANTE' | 'EMPATE';

export type MatchSide = { club_id: number; club_name: string; formation: string; goals: number };

export type DuelPlayer = {
  player_id: number;
  player_name: string;
  position: string;
  condition: string;
  attribute: string;
  value: number;
};

export type Duel = {
  order: number;
  attacking_club_id: number;
  attacker: DuelPlayer;
  defender: DuelPlayer;
  goal: boolean;
};

/** Item de `GET /matches` (sem os duelos). */
export type MatchSummary = {
  id: number;
  played_at: string;
  home: MatchSide;
  away: MatchSide;
  result: MatchResult;
};

/** `POST /matches` e `GET /matches/{id}` (README › 2.4.2): a partida com os 6 duelos. */
export type Match = MatchSummary & { duels: Duel[] };

type PlayMatchBody = { home_club_id: number; away_club_id: number };

export function playMatch(body: PlayMatchBody): Promise<Match> {
  return apiRequest<Match>('/matches', { method: 'POST', body });
}

export function listMatches(
  clubId: number | undefined,
  signal?: AbortSignal,
): Promise<MatchSummary[]> {
  return apiRequest<MatchSummary[]>('/matches', { query: { club_id: clubId }, signal });
}

export function getMatch(id: number, signal?: AbortSignal): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}`, { signal });
}

/** Linha de `GET /standings` (README › 2.4.3). */
export type Standing = {
  position: number;
  club_id: number;
  club_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export function getStandings(signal?: AbortSignal): Promise<Standing[]> {
  return apiRequest<Standing[]>('/standings', { signal });
}
