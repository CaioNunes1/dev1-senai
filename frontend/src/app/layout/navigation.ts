import { ListOrdered, Shield, Swords, Users, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router';

export const ROUTES = {
  players: '/players',
  clubs: '/clubs',
  clubDetail: '/clubs/:clubId',
  matches: '/matches',
  standings: '/standings',
} as const;

export function clubPath(clubId: number): string {
  return `${ROUTES.clubs}/${clubId}`;
}

type NavItem = { label: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

/** Grupos e itens do menu lateral, na ordem do frame "Sidebar" do Figma. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Mercado',
    items: [
      { label: 'Jogadores', path: ROUTES.players, icon: Users },
      { label: 'Clubes', path: ROUTES.clubs, icon: Shield },
    ],
  },
  {
    label: 'Liga',
    items: [
      { label: 'Partidas', path: ROUTES.matches, icon: Swords },
      { label: 'Classificação', path: ROUTES.standings, icon: ListOrdered },
    ],
  },
];

export type Crumb = { label: string; to?: string };

/**
 * Trilha do topo: grupo › página (› clube). O nome do clube vem da lista já carregada
 * pelo menu; sem ele (clube inexistente ou lista carregando), mostra "Clube {id}".
 */
export function breadcrumbFor(pathname: string, clubNameById: Map<number, string>): Crumb[] {
  const clubMatch = matchPath(ROUTES.clubDetail, pathname);
  if (clubMatch) {
    const clubId = Number(clubMatch.params.clubId);
    return [
      { label: 'Mercado' },
      { label: 'Clubes', to: ROUTES.clubs },
      { label: clubNameById.get(clubId) ?? `Clube ${clubMatch.params.clubId}` },
    ];
  }
  for (const group of NAV_GROUPS) {
    const item = group.items.find(({ path }) => matchPath(path, pathname));
    if (item) {
      return [{ label: group.label }, { label: item.label }];
    }
  }
  return [];
}
