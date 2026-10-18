import { Position } from './player.types';
import { compareRosterOrder } from './roster-order';

const member = (id: number, name: string, position: Position) => ({ id, name, position });

describe('compareRosterOrder (RN11)', () => {
  it('ordena por posição GOL → ATA, depois pelo nome e depois pelo id', () => {
    const squad = [
      member(1, 'Otto Rangel', 'ATA'),
      member(2, 'Lauro Neves', 'MEI'),
      member(3, 'Davi Lins', 'LAT'),
      member(4, 'Téo Brandão', 'ZAG'),
      member(5, 'Rui Prado', 'GOL'),
      member(9, 'Bruno Alves', 'MEI'),
      member(8, 'Bruno Alves', 'MEI'),
      member(6, 'Ábner Costa', 'ZAG'),
    ];

    expect([...squad].sort(compareRosterOrder).map(({ id }) => id)).toEqual([
      5, 6, 4, 3, 8, 9, 2, 1,
    ]);
  });
});
