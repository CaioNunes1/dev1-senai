import { apiRequest, type QueryParams } from '../../shared/api/http-client';

export const POSITIONS = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'] as const;
export type Position = (typeof POSITIONS)[number];

export const CONDITIONS = ['APTO', 'MAL_CONDICIONADO', 'DOENTE'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const PLAYER_SORTS = [
  'name',
  'value_desc',
  'value_asc',
  'age_desc',
  'age_asc',
  'position',
] as const;
export type PlayerSort = (typeof PLAYER_SORTS)[number];

/** Jogador como devolvido por `GET /players` e `GET /players/{id}` (README › 2.1.2). */
export type Player = {
  id: number;
  name: string;
  position: Position;
  agility: number;
  age: number;
  condition: Condition;
  base_value: number;
  market_value: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  potential: number;
  overall: number;
  club_id: number | null;
};

export type PageMeta = {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
};

export type PlayerPage = { data: Player[]; meta: PageMeta };

/** Query params de `GET /players`, já no formato aceito pela API (README › "Filtros e query params"). */
export type PlayerListQuery = {
  search?: string;
  position?: Position;
  condition?: Condition;
  free?: boolean;
  club_id?: number;
  min_age?: string;
  max_age?: string;
  min_value?: string;
  max_value?: string;
  sort: PlayerSort;
  page: number;
  limit: number;
};

export function listPlayers(query: PlayerListQuery, signal?: AbortSignal): Promise<PlayerPage> {
  return apiRequest<PlayerPage>('/players', { query: query satisfies QueryParams, signal });
}
