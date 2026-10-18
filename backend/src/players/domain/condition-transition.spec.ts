import { canChangeCondition, leavesLineup } from './condition-transition';
import { Condition } from './player.types';

describe('canChangeCondition', () => {
  it.each<[Condition, Condition, boolean]>([
    ['APTO', 'APTO', true],
    ['APTO', 'MAL_CONDICIONADO', true],
    ['APTO', 'DOENTE', true],
    ['MAL_CONDICIONADO', 'APTO', true],
    ['MAL_CONDICIONADO', 'MAL_CONDICIONADO', true],
    ['MAL_CONDICIONADO', 'DOENTE', true],
    ['DOENTE', 'APTO', false],
    ['DOENTE', 'MAL_CONDICIONADO', true],
    ['DOENTE', 'DOENTE', true],
  ])('%s → %s: %p', (current, next, expected) => {
    expect(canChangeCondition(current, next)).toBe(expected);
  });
});

describe('leavesLineup', () => {
  it.each<[Condition, boolean]>([
    ['APTO', false],
    ['MAL_CONDICIONADO', false],
    ['DOENTE', true],
  ])('passar a %s tira da escalação? %p', (next, expected) => {
    expect(leavesLineup(next)).toBe(expected);
  });
});
