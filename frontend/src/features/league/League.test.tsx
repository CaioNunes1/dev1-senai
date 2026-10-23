import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, requestsTo, writesTo } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { Club } from '../clubs/api';
import type { Duel, Match, MatchSummary, Standing } from './api';

type User = ReturnType<typeof userEvent.setup>;

const CLUBS: Club[] = [
  { id: 1, name: 'Águias FC', acronym: 'AGU', cash: 300, squad_value: 0, net_worth: 300 },
  { id: 2, name: 'Delta FC', acronym: 'DEL', cash: 300, squad_value: 0, net_worth: 300 },
  { id: 3, name: 'Gama SC', acronym: 'GAM', cash: 300, squad_value: 0, net_worth: 300 },
];

function duel(
  order: number,
  attackingClubId: number,
  attacker: [string, string, string, number, string?],
  defender: [string, string, number],
  goal: boolean,
): Duel {
  return {
    order,
    attacking_club_id: attackingClubId,
    attacker: {
      player_id: order * 10,
      player_name: attacker[0],
      position: attacker[1],
      condition: attacker[4] ?? 'APTO',
      attribute: attacker[2],
      value: attacker[3],
    },
    defender: {
      player_id: order * 10 + 1,
      player_name: defender[0],
      position: defender[1],
      condition: 'APTO',
      attribute: 'defending',
      value: defender[2],
    },
    goal,
  };
}

/** Exemplo da RN20 (README › 2.4.2): Águias FC 1 × 2 Delta FC. */
const OFFICIAL: Match = {
  id: 7,
  played_at: '2026-11-12T15:00:00-03:00',
  home: { club_id: 1, club_name: 'Águias FC', formation: '2-1-1', goals: 1 },
  away: { club_id: 2, club_name: 'Delta FC', formation: '2-1-1', goals: 2 },
  result: 'VISITANTE',
  duels: [
    duel(1, 1, ['Otto Rangel', 'ATA', 'shooting', 75], ['Ivo Teles', 'GOL', 72], true),
    duel(2, 1, ['Lauro Neves', 'MEI', 'passing', 82], ['Hugo Vaz', 'ZAG', 84], false),
    duel(
      3,
      1,
      ['Davi Lins', 'LAT', 'dribbling', 63, 'MAL_CONDICIONADO'],
      ['Lino Matos', 'LAT', 63],
      false,
    ),
    duel(4, 2, ['Ugo Falcão', 'ATA', 'shooting', 81], ['Rui Prado', 'GOL', 77], true),
    duel(5, 2, ['Nei Soares', 'MEI', 'passing', 70], ['Téo Brandão', 'ZAG', 84], false),
    duel(6, 2, ['Lino Matos', 'LAT', 'dribbling', 79], ['Davi Lins', 'LAT', 56], true),
  ],
};

function summaryOf(match: Match): MatchSummary {
  return {
    id: match.id,
    played_at: match.played_at,
    home: match.home,
    away: match.away,
    result: match.result,
  };
}

/** Histórico na ordem da API (o mais recente primeiro, mesmo com data UTC no meio). */
const HISTORY: MatchSummary[] = [
  summaryOf(OFFICIAL),
  {
    id: 5,
    played_at: '2026-11-11T02:30:00Z',
    home: { club_id: 3, club_name: 'Gama SC', formation: '3-1', goals: 2 },
    away: { club_id: 1, club_name: 'Águias FC', formation: '2-1-1', goals: 2 },
    result: 'EMPATE',
  },
];

/** Classificação fora da ordem alfabética, como a API ordenou (pontos, saldo, gols, nome). */
const STANDINGS: Standing[] = [
  {
    position: 1,
    club_id: 2,
    club_name: 'Delta FC',
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goals_for: 2,
    goals_against: 1,
    goal_difference: 1,
    points: 3,
  },
  {
    position: 2,
    club_id: 3,
    club_name: 'Gama SC',
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
  },
  {
    position: 3,
    club_id: 1,
    club_name: 'Águias FC',
    played: 1,
    wins: 0,
    draws: 0,
    losses: 1,
    goals_for: 1,
    goals_against: 2,
    goal_difference: -1,
    points: 0,
  },
];

type Override = (url: URL, method: string) => Response | Promise<Response> | undefined;

function fakeApi(override?: Override) {
  return mockApi(async (url, _signal, request) => {
    const overridden = await override?.(url, request.method);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs') {
      return jsonResponse(CLUBS);
    }
    if (path === '/matches' && request.method === 'POST') {
      return jsonResponse(OFFICIAL, 201);
    }
    if (path === '/matches') {
      const clubId = Number(url.searchParams.get('club_id'));
      return jsonResponse(
        clubId
          ? HISTORY.filter((match) => [match.home.club_id, match.away.club_id].includes(clubId))
          : HISTORY,
      );
    }
    if (path === '/matches/7') {
      return jsonResponse(OFFICIAL);
    }
    if (path.startsWith('/matches/')) {
      return jsonResponse({ message: 'Partida não encontrada.' }, 404);
    }
    if (path === '/standings') {
      return jsonResponse(STANDINGS);
    }
    return jsonResponse({ data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } });
  });
}

function tableRows(name: string): string[][] {
  return within(screen.getByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .queryAllByRole('cell')
        .map((cell) => cell.textContent ?? ''),
    );
}

async function openNewMatch(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Nova partida' }));
  return within(screen.getByRole('dialog', { name: 'Nova partida' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Partidas (F13, F14)', () => {
  it('histórico na ordem da API, com data em Brasília, placar e resultado', async () => {
    fakeApi();
    renderApp('/matches');

    await screen.findByText('2 partidas');
    expect(tableRows('Histórico de partidas')).toEqual([
      ['12/11/202615:00', 'Águias FC', '1 × 2', 'Delta FC', 'Vitória do visitante', 'Ver duelos'],
      ['10/11/202623:30', 'Gama SC', '2 × 2', 'Águias FC', 'Empate', 'Ver duelos'],
    ]);
    expect(screen.getByText('2 partidas')).toBeInTheDocument();
  });

  it('filtro por clube pede ?club_id à API, sem filtrar na tela', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/matches');
    await screen.findByText('2 partidas');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Clube' }), '2');

    await waitFor(() => expect(tableRows('Histórico de partidas')).toHaveLength(1));
    expect(requestsTo(fetchMock, '/matches').at(-1)?.searchParams.get('club_id')).toBe('2');
  });

  it('sem partidas: estado vazio; erro: message e nova tentativa', async () => {
    let failing = true;
    fakeApi((url) => {
      if (url.pathname.endsWith('/matches')) {
        return failing ? Promise.reject(new TypeError('Failed to fetch')) : jsonResponse([]);
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/matches');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as partidas');
    failing = false;
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Nenhuma partida jogada')).toBeInTheDocument();
  });

  it('nova partida: exige os dois clubes, diferentes, sem enviar', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/matches');
    const dialog = await openNewMatch(user);

    await user.click(dialog.getByRole('button', { name: 'Jogar partida' }));
    expect(dialog.getByText('Escolha o mandante.')).toBeInTheDocument();
    await user.selectOptions(dialog.getByLabelText('Mandante'), '1');
    await user.selectOptions(dialog.getByLabelText('Visitante'), '1');
    await user.click(dialog.getByRole('button', { name: 'Jogar partida' }));

    expect(dialog.getByText('O visitante precisa ser diferente do mandante.')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('escalação incompleta: envia e mostra o message do 409', async () => {
    fakeApi((_url, method) =>
      method === 'POST'
        ? jsonResponse(
            { message: 'O Gama SC não tem a escalação completa (5 titulares) e não pode jogar.' },
            409,
          )
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/matches');
    const dialog = await openNewMatch(user);

    await user.selectOptions(dialog.getByLabelText('Mandante'), '3');
    await user.selectOptions(dialog.getByLabelText('Visitante'), '1');
    await user.click(dialog.getByRole('button', { name: 'Jogar partida' }));

    const alert = await dialog.findByRole('alert');
    expect(alert).toHaveTextContent('Partida recusada');
    expect(alert).toHaveTextContent('O Gama SC não tem a escalação completa');
  });

  it('jogar: clique duplo cria uma só partida e abre o placar e os 6 duelos da API', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/matches');
    const dialog = await openNewMatch(user);
    await user.selectOptions(dialog.getByLabelText('Mandante'), '1');
    await user.selectOptions(dialog.getByLabelText('Visitante'), '2');

    await user.dblClick(dialog.getByRole('button', { name: 'Jogar partida' }));

    expect(await screen.findByRole('table', { name: 'Duelos da partida' })).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      { method: 'POST', path: '/matches', body: { home_club_id: 1, away_club_id: 2 } },
    ]);
    expect(screen.getByText('Partida jogada')).toBeInTheDocument();
    expect(screen.getByLabelText('Placar')).toHaveTextContent('1 × 2');
    expect(screen.getByText('Vitória do visitante')).toBeInTheDocument();
    expect(tableRows('Duelos da partida').filter((cells) => cells.length > 1)).toEqual([
      ['1', 'Otto RangelATA', 'Finalização 75', 'Ivo TelesGOL', 'Defesa 72', 'Gol'],
      ['2', 'Lauro NevesMEI', 'Passe 82', 'Hugo VazZAG', 'Defesa 84', 'Sem gol'],
      [
        '3',
        'Davi LinsLAT · mal condicionado',
        'Drible 63',
        'Lino MatosLAT',
        'Defesa 63',
        'Sem gol',
      ],
      ['4', 'Ugo FalcãoATA', 'Finalização 81', 'Rui PradoGOL', 'Defesa 77', 'Gol'],
      ['5', 'Nei SoaresMEI', 'Passe 70', 'Téo BrandãoZAG', 'Defesa 84', 'Sem gol'],
      ['6', 'Lino MatosLAT', 'Drible 79', 'Davi LinsLAT', 'Defesa 56', 'Gol'],
    ]);
    expect(screen.getByText('Ataques do Águias FC (mandante)')).toBeInTheDocument();
    expect(screen.getByText('Ataques do Delta FC (visitante)')).toBeInTheDocument();
  });

  it('"Ver duelos" no histórico abre a partida pela API; partida inexistente mostra o 404', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/matches');

    await user.click(await screen.findByRole('link', { name: /^Ver duelos de Águias FC 1 × 2/ }));

    expect(await screen.findByRole('table', { name: 'Duelos da partida' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/matches/7')).toHaveLength(1);
    expect(
      within(screen.getByRole('navigation', { name: 'Trilha de navegação' })).getByText(
        'Partida 7',
      ),
    ).toBeInTheDocument();
  });

  it('partida inexistente: 404 com o message', async () => {
    fakeApi();
    renderApp('/matches/99');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Partida não encontrada.');
    expect(screen.getByRole('link', { name: 'Voltar para partidas' })).toBeInTheDocument();
  });
});

describe('Classificação (F14)', () => {
  it('mostra as 10 colunas na ordem devolvida pela API, sem reordenar', async () => {
    fakeApi();
    renderApp('/standings');

    await screen.findByText('1º');
    expect(
      within(screen.getByRole('table', { name: 'Classificação' }))
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Posição',
      'Clube',
      'Jogos',
      'Vitórias',
      'Empates',
      'Derrotas',
      'Gols marcados',
      'Gols sofridos',
      'Saldo',
      'Pontos',
    ]);
    expect(tableRows('Classificação')).toEqual([
      ['1º', 'Delta FC', '1', '1', '0', '0', '2', '1', '+1', '3'],
      ['2º', 'Gama SC', '0', '0', '0', '0', '0', '0', '0', '0'],
      ['3º', 'Águias FC', '1', '0', '0', '1', '1', '2', '-1', '0'],
    ]);
  });

  it('erro: message e nova tentativa', async () => {
    let failing = true;
    fakeApi((url) =>
      failing && url.pathname.endsWith('/standings')
        ? jsonResponse({ message: 'Falha inesperada.' }, 500)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/standings');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Falha inesperada.');
    failing = false;
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('table', { name: 'Classificação' })).toBeInTheDocument();
  });
});
