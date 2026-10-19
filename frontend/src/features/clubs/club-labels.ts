import { CLUB_SORTS, type ClubSort } from './api';

/** RN10: limite da liga, mostrado em "6 de 20" e no aviso do cadastro (a API recusa o 21º). */
export const MAX_CLUBS = 20;

/** RN12: limite do elenco, mostrado em "6 de 12 jogadores". */
export const MAX_SQUAD_SIZE = 12;

/** Textos do menu "Ordenar por" (Figma C01), na ordem do frame. */
export const CLUB_SORT_LABELS: Record<ClubSort, string> = {
  name: 'Nome',
  net_worth_desc: 'Patrimônio (maior para o menor)',
  net_worth_asc: 'Patrimônio (menor para o maior)',
};

/** Ordenação lida da URL (`?sort=`); valor ausente ou desconhecido volta ao padrão `name`. */
export function parseClubSort(value: string | null): ClubSort {
  return CLUB_SORTS.find((sort) => sort === value) ?? 'name';
}
