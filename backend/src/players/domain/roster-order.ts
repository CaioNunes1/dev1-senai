import { compareNames } from '../../common/domain/text';
import { Position, POSITIONS } from './player.types';

interface RosterMember {
  id: number;
  name: string;
  position: Position;
}

/** Ordem das posições de trás para frente: GOL, ZAG, LAT, MEI, ATA (não alfabética). */
export function comparePositions(first: Position, second: Position): number {
  return POSITIONS.indexOf(first) - POSITIONS.indexOf(second);
}

/**
 * RN11: ordem do elenco — posição (GOL → ATA), depois nome (ordem alfabética do enunciado)
 * e depois id. A mesma ordem vale para a escalação e para os duelos da partida.
 */
export function compareRosterOrder(first: RosterMember, second: RosterMember): number {
  return (
    comparePositions(first.position, second.position) ||
    compareNames(first.name, second.name) ||
    first.id - second.id
  );
}
