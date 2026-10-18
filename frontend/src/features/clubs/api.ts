import { apiRequest } from '../../shared/api/http-client';

/** Clube como devolvido por `GET /clubs` (campos no formato da API). */
export type Club = {
  id: number;
  name: string;
  acronym: string;
  cash: number;
  squad_value: number;
  net_worth: number;
};

export function listClubs(signal?: AbortSignal): Promise<Club[]> {
  return apiRequest<Club[]>('/clubs', { signal });
}
