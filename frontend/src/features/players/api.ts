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

/** Corpo de `POST /players`: só os campos informados; valor base, overall e condição vêm da API. */
export type CreatePlayerBody = {
  name: string;
  position: Position;
  agility: number;
  age: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  potential: number;
};

/** Corpo de `PUT /players/{id}` (RN08): os quatro campos editáveis, sempre juntos. */
export type UpdatePlayerBody = Pick<CreatePlayerBody, 'name' | 'position' | 'agility' | 'age'>;

export function getPlayer(id: number, signal?: AbortSignal): Promise<Player> {
  return apiRequest<Player>(`/players/${id}`, { signal });
}

export function createPlayer(body: CreatePlayerBody): Promise<Player> {
  return apiRequest<Player>('/players', { method: 'POST', body });
}

export function updatePlayer(id: number, body: UpdatePlayerBody): Promise<Player> {
  return apiRequest<Player>(`/players/${id}`, { method: 'PUT', body });
}

export function updatePlayerCondition(id: number, condition: Condition): Promise<Player> {
  return apiRequest<Player>(`/players/${id}/condition`, { method: 'PATCH', body: { condition } });
}

/** `DELETE /players/{id}` responde 204 sem corpo (exclusão lógica, RN09). */
export function deletePlayer(id: number): Promise<void> {
  return apiRequest<undefined>(`/players/${id}`, { method: 'DELETE' });
}
