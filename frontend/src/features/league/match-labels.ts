import type { BadgeVariant } from '../../shared/components/Badge';
import type { MatchResult } from './api';

/** `result` da API em texto (Figma L01: "Vitória do mandante"). */
export const RESULT_LABELS: Record<MatchResult, string> = {
  MANDANTE: 'Vitória do mandante',
  VISITANTE: 'Vitória do visitante',
  EMPATE: 'Empate',
};

export const RESULT_BADGES: Record<MatchResult, BadgeVariant> = {
  MANDANTE: 'outline',
  VISITANTE: 'outline',
  EMPATE: 'secondary',
};

/** Atributos gravados nos duelos (RN20 › 5). */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  shooting: 'Finalização',
  passing: 'Passe',
  dribbling: 'Drible',
  defending: 'Defesa',
};
