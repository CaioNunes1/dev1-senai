import type { BadgeVariant } from '../../shared/components/Badge';
import type { Condition, PlayerSort, Position } from './api';

/** Nome da posição por extenso, mostrado abaixo do nome do jogador (Figma J01). */
export const POSITION_LABELS: Record<Position, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  MEI: 'Meio-campo',
  ATA: 'Atacante',
};

export const CONDITION_LABELS: Record<Condition, string> = {
  APTO: 'Apto',
  MAL_CONDICIONADO: 'Mal condicionado',
  DOENTE: 'Doente',
};

export const CONDITION_BADGES: Record<Condition, BadgeVariant> = {
  APTO: 'success',
  MAL_CONDICIONADO: 'warning',
  DOENTE: 'destructive',
};

/** Textos do menu "Ordenar por" (Figma J15), na ordem do frame. */
export const SORT_LABELS: Record<PlayerSort, string> = {
  name: 'Nome',
  value_desc: 'Maior valor de mercado',
  value_asc: 'Menor valor de mercado',
  age_desc: 'Maior idade',
  age_asc: 'Menor idade',
  position: 'Posição (GOL a ATA)',
};

/** Motivo do bloqueio de `free=true` junto com `club_id` (a API recusa com 400). */
export const FREE_WITH_CLUB_HINT = '“Livres” não combina com o filtro por clube.';
