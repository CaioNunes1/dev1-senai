import { Position } from '../../players/domain/player.types';
import { formationViolation, isFormation } from './formation';

describe('formationViolation (RN19)', () => {
  it.each<[string, Position[]]>([
    ['3-1', ['GOL', 'ZAG', 'LAT', 'LAT', 'ATA']],
    ['3-1', ['GOL', 'ZAG', 'ZAG', 'ZAG', 'ATA']],
    ['2-2', ['GOL', 'ZAG', 'LAT', 'ATA', 'ATA']],
    ['2-1-1', ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA']],
    ['2-1-1', ['ATA', 'MEI', 'GOL', 'LAT', 'LAT']],
    ['1-2-1', ['GOL', 'ZAG', 'MEI', 'MEI', 'ATA']],
  ])('%s com %j fecha a formação', (formation, positions) => {
    expect(formationViolation(formation as never, positions)).toBeUndefined();
  });

  it.each<[string, Position[], RegExp]>([
    ['2-1-1', ['ZAG', 'ZAG', 'LAT', 'MEI', 'ATA'], /exatamente 1 goleiro.*0/],
    ['2-1-1', ['GOL', 'GOL', 'LAT', 'MEI', 'ATA'], /exatamente 1 goleiro.*2/],
    ['2-1-1', ['GOL', 'ZAG', 'LAT', 'ATA', 'ATA'], /formação 2-1-1/],
    ['3-1', ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'], /formação 3-1/],
    ['2-2', ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'], /formação 2-2/],
    ['1-2-1', ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'], /formação 1-2-1/],
  ])('%s com %j é recusada', (formation, positions, message) => {
    expect(formationViolation(formation as never, positions)).toMatch(message);
  });

  it('isFormation aceita só as 4 da tabela', () => {
    expect(['3-1', '2-2', '2-1-1', '1-2-1'].every(isFormation)).toBe(true);
    expect(['4-0', '2-1', '', '2-1-1 ', 211, null].some(isFormation)).toBe(false);
  });
});
