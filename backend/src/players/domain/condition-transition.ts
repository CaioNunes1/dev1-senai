import { Condition } from './player.types';

/** Limites de cada campo › `condition`: de DOENTE não vai direto para APTO. */
export function canChangeCondition(current: Condition, next: Condition): boolean {
  return !(current === 'DOENTE' && next === 'APTO');
}

/** RN19: o titular que passa a DOENTE sai da escalação. */
export function leavesLineup(next: Condition): boolean {
  return next === 'DOENTE';
}
