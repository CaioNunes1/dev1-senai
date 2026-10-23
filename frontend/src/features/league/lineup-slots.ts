import type { Player, Position } from '../players/api';
import type { Formation } from './api';

/** Setores da RN19, do goleiro ao ataque. */
type Sector = 'GOL' | 'DEF' | 'MEI' | 'ATA';

type Slot = {
  key: string;
  label: string;
  hint: string;
  positions: readonly Position[];
};

const SECTOR_SLOTS: Record<Sector, Omit<Slot, 'key'>> = {
  GOL: { label: 'Goleiro', hint: 'GOL', positions: ['GOL'] },
  DEF: { label: 'Defesa', hint: 'ZAG ou LAT', positions: ['ZAG', 'LAT'] },
  MEI: { label: 'Meio', hint: 'MEI', positions: ['MEI'] },
  ATA: { label: 'Ataque', hint: 'ATA', positions: ['ATA'] },
};

/** Tabela da RN19: jogadores de linha por setor em cada formação. */
const SECTOR_COUNTS: Record<Formation, Record<Exclude<Sector, 'GOL'>, number>> = {
  '3-1': { DEF: 3, MEI: 0, ATA: 1 },
  '2-2': { DEF: 2, MEI: 0, ATA: 2 },
  '2-1-1': { DEF: 2, MEI: 1, ATA: 1 },
  '1-2-1': { DEF: 1, MEI: 2, ATA: 1 },
};

/** Descrição curta da formação (Figma C06: "Defesa 2, meio 1, ataque 1"). */
export function describeFormation(formation: Formation): string {
  const { DEF, MEI, ATA } = SECTOR_COUNTS[formation];
  return [`Defesa ${DEF}`, MEI > 0 ? `meio ${MEI}` : undefined, `ataque ${ATA}`]
    .filter(Boolean)
    .join(', ');
}

/** As 5 vagas da formação: o goleiro e os jogadores de linha de trás para frente. */
export function slotsFor(formation: Formation): Slot[] {
  const counts = SECTOR_COUNTS[formation];
  const sectors: Sector[] = [
    'GOL',
    ...Array<Sector>(counts.DEF).fill('DEF'),
    ...Array<Sector>(counts.MEI).fill('MEI'),
    ...Array<Sector>(counts.ATA).fill('ATA'),
  ];
  return sectors.map((sector, index) => ({ key: `${sector}-${index}`, ...SECTOR_SLOTS[sector] }));
}

/** Vaga → id do titular escolhido (vazio enquanto não escolhido). */
export type Selection = Record<string, number | undefined>;

/**
 * Distribui jogadores nas vagas da formação, na ordem recebida: cada um vai para a primeira
 * vaga livre da posição dele. Quem não cabe fica de fora (`left`), para a tela avisar.
 */
export function fillSlots(
  formation: Formation,
  players: readonly Pick<Player, 'id' | 'position'>[],
): { selection: Selection; left: number[] } {
  const selection: Selection = {};
  const left: number[] = [];
  const slots = slotsFor(formation);
  for (const player of players) {
    const slot = slots.find(
      (item) => selection[item.key] === undefined && item.positions.includes(player.position),
    );
    if (slot) {
      selection[slot.key] = player.id;
    } else {
      left.push(player.id);
    }
  }
  return { selection, left };
}

/**
 * Opções de uma vaga: jogadores do elenco na posição da vaga, sem DOENTE (RN19) e sem quem já
 * está em outra vaga. O titular atual da vaga continua na lista.
 */
export function candidatesFor<T extends Pick<Player, 'id' | 'position' | 'condition'>>(
  slot: Slot,
  squad: readonly T[],
  selection: Selection,
): T[] {
  const taken = new Set(
    Object.entries(selection)
      .filter(([key, id]) => key !== slot.key && id !== undefined)
      .map(([, id]) => id),
  );
  return squad.filter(
    (player) =>
      slot.positions.includes(player.position) &&
      player.condition !== 'DOENTE' &&
      !taken.has(player.id),
  );
}

/** Ids na ordem das vagas, só quando as 5 estão preenchidas. */
export function selectedIds(formation: Formation, selection: Selection): number[] | undefined {
  const ids = slotsFor(formation).map((slot) => selection[slot.key]);
  return ids.every((id): id is number => id !== undefined) ? ids : undefined;
}
