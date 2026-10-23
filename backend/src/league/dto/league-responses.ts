import { ApiProperty } from '@nestjs/swagger';
import { PlayerResponse } from '../../players/dto/player-response.dto';
import { FORMATIONS } from '../domain/formation';

/** `GET`/`PUT /clubs/{id}/lineup` (README › 2.4.1). */
export class LineupResponse {
  @ApiProperty({ example: 1 }) club_id: number;
  @ApiProperty({ enum: FORMATIONS, nullable: true, example: '2-1-1' }) formation: string | null;
  @ApiProperty({ example: true, description: 'true com os 5 titulares.' }) complete: boolean;
  @ApiProperty({ type: [PlayerResponse], description: 'Na ordem do elenco (RN11).' })
  players: PlayerResponse[];
}

export class MatchSideResponse {
  @ApiProperty({ example: 1 }) club_id: number;
  @ApiProperty({ example: 'Águias FC' }) club_name: string;
  @ApiProperty({ example: '2-1-1' }) formation: string;
  @ApiProperty({ example: 1 }) goals: number;
}

export class DuelPlayerResponse {
  @ApiProperty({ example: 34 }) player_id: number;
  @ApiProperty({ example: 'Otto Rangel' }) player_name: string;
  @ApiProperty({ example: 'ATA' }) position: string;
  @ApiProperty({ example: 'APTO' }) condition: string;
  @ApiProperty({ example: 'shooting' }) attribute: string;
  @ApiProperty({ example: 75, description: 'Já com o efeito da condição.' }) value: number;
}

export class DuelResponse {
  @ApiProperty({ example: 1 }) order: number;
  @ApiProperty({ example: 1 }) attacking_club_id: number;
  @ApiProperty({ type: DuelPlayerResponse }) attacker: DuelPlayerResponse;
  @ApiProperty({ type: DuelPlayerResponse }) defender: DuelPlayerResponse;
  @ApiProperty({ example: true }) goal: boolean;
}

/** Item de `GET /matches` (sem os duelos). */
export class MatchSummaryResponse {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: '2026-11-12T15:00:00-03:00' }) played_at: string;
  @ApiProperty({ type: MatchSideResponse }) home: MatchSideResponse;
  @ApiProperty({ type: MatchSideResponse }) away: MatchSideResponse;
  @ApiProperty({ enum: ['MANDANTE', 'VISITANTE', 'EMPATE'], example: 'VISITANTE' }) result: string;
}

/** `POST /matches` e `GET /matches/{id}` (README › 2.4.2), com os 6 duelos. */
export class MatchResponse extends MatchSummaryResponse {
  @ApiProperty({ type: [DuelResponse] }) duels: DuelResponse[];
}

/** Linha de `GET /standings` (README › 2.4.3). */
export class StandingResponse {
  @ApiProperty({ example: 1 }) position: number;
  @ApiProperty({ example: 2 }) club_id: number;
  @ApiProperty({ example: 'Delta FC' }) club_name: string;
  @ApiProperty({ example: 1 }) played: number;
  @ApiProperty({ example: 1 }) wins: number;
  @ApiProperty({ example: 0 }) draws: number;
  @ApiProperty({ example: 0 }) losses: number;
  @ApiProperty({ example: 2 }) goals_for: number;
  @ApiProperty({ example: 1 }) goals_against: number;
  @ApiProperty({ example: 1 }) goal_difference: number;
  @ApiProperty({ example: 3 }) points: number;
}
