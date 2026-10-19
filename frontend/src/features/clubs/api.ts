import { apiRequest } from '../../shared/api/http-client';
import type { Player } from '../players/api';

/** Ordenações de `GET /clubs` (RN11); sem `sort`, a API ordena pelo nome. */
export const CLUB_SORTS = ['name', 'net_worth_desc', 'net_worth_asc'] as const;
export type ClubSort = (typeof CLUB_SORTS)[number];

/** Clube como devolvido por `GET /clubs` e `POST /clubs` (campos no formato da API). */
export type Club = {
  id: number;
  name: string;
  acronym: string;
  cash: number;
  squad_value: number;
  net_worth: number;
};

/** Contrato ativo do jogador, com dias restantes e % de multa calculados na consulta (RN15). */
export type ContractSummary = {
  purchase_value: number;
  loyalty_until: string;
  remaining_days: number;
  penalty_rate: number;
};

export type SquadPlayer = Player & { contract: ContractSummary | null };

/** `GET /clubs/{id}`: o clube com o elenco na ordem da RN11 (GOL → ATA, nome, id). */
export type ClubDetail = Club & { players: SquadPlayer[] };

/** Corpo de `POST /clubs`: só nome e sigla; caixa, valor do elenco e patrimônio vêm da API. */
export type CreateClubBody = { name: string; acronym: string };

export function listClubs(sort: ClubSort | undefined, signal?: AbortSignal): Promise<Club[]> {
  return apiRequest<Club[]>('/clubs', { query: { sort }, signal });
}

/** O id vem da URL como texto; a API responde 404 para id fora do formato (V8). */
export function getClub(id: string, signal?: AbortSignal): Promise<ClubDetail> {
  return apiRequest<ClubDetail>(`/clubs/${encodeURIComponent(id)}`, { signal });
}

export function createClub(body: CreateClubBody): Promise<Club> {
  return apiRequest<Club>('/clubs', { method: 'POST', body });
}
