import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, requestsTo, writesTo } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { SquadPlayer } from '../clubs/api';
import type { Condition, Position } from '../players/api';
import type { Formation, Lineup, LineupBody } from './api';

type User = ReturnType<typeof userEvent.setup>;

function squadPlayer(
  id: number,
  name: string,
  position: Position,
  condition: Condition = 'APTO',
): SquadPlayer {
  return {
    id,
    name,
    position,
    agility: 60,
    age: 25,
    condition,
    base_value: 30,
    market_value: 30,
    pace: 60,
    shooting: 70 + id,
    passing: 60 + id,
    dribbling: 50 + id,
    defending: 40 + id,
    physical: 60,
    potential: 90,
    overall: 70,
    club_id: 1,
    contract: null,
  };
}

/** Elenco na ordem da RN11; Lucas está DOENTE; Diego, MAL_CONDICIONADO. */
const SQUAD: SquadPlayer[] = [
  squadPlayer(1, 'Bruno Tavares', 'GOL'),
  squadPlayer(2, 'Felipe Moura', 'ZAG'),
  squadPlayer(3, 'Diego Ramos', 'LAT', 'MAL_CONDICIONADO'),
  squadPlayer(4, 'Rafa Lopes', 'LAT'),
  squadPlayer(5, 'Lucas Ferraz', 'MEI', 'DOENTE'),
  squadPlayer(6, 'Sávio Lima', 'MEI'),
  squadPlayer(7, 'Caio Rocha', 'ATA'),
  squadPlayer(8, 'João Silva', 'ATA'),
];

const NO_LINEUP: Lineup = { club_id: 1, formation: null, complete: false, players: [] };

type Override = (url: URL, method: string) => Response | Promise<Response> | undefined;

/** API falsa: clube 1 com o elenco acima; o PUT grava e devolve a escalação na ordem do elenco. */
function fakeApi(initial: Lineup = NO_LINEUP, override?: Override) {
  let lineup = initial;
  return mockApi(async (url, _signal, request) => {
    const overridden = await override?.(url, request.method);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs') {
      return jsonResponse([
        {
          id: 1,
          name: 'Águias FC',
          acronym: 'AGU',
          cash: 51.58,
          squad_value: 240,
          net_worth: 291.58,
        },
      ]);
    }
    if (path === '/clubs/1') {
      return jsonResponse({
        id: 1,
        name: 'Águias FC',
        acronym: 'AGU',
        cash: 51.58,
        squad_value: 240,
        net_worth: 291.58,
        players: SQUAD,
      });
    }
    if (path === '/clubs/1/lineup' && request.method === 'PUT') {
      const body = request.body as LineupBody;
      lineup = {
        club_id: 1,
        formation: body.formation,
        complete: true,
        players: SQUAD.filter((player) => body.player_ids.includes(player.id)),
      };
      return jsonResponse(lineup);
    }
    if (path === '/clubs/1/lineup') {
      return jsonResponse(lineup);
    }
    if (path === '/clubs/1/transactions') {
      return jsonResponse({
        data: [],
        summary: {
          total_spent: 0,
          total_received: 0,
          total_fees: 0,
          total_penalties: 0,
          total_profit: 0,
        },
      });
    }
    return jsonResponse({ data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } });
  });
}

function lineupOf(formation: Formation, ids: number[], complete = true): Lineup {
  return {
    club_id: 1,
    formation,
    complete,
    players: SQUAD.filter((player) => ids.includes(player.id)),
  };
}

async function openLineup() {
  renderApp('/clubs/1?tab=lineup');
  await screen.findByRole('heading', { name: 'Titulares' });
}

function slotSelects(): HTMLSelectElement[] {
  return screen.getAllByRole<HTMLSelectElement>('combobox', { name: /^Titular:/ });
}

function optionsOf(select: HTMLSelectElement): string[] {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
}

async function pick(user: User, formation: Formation, names: string[]) {
  await user.click(screen.getByRole('radio', { name: new RegExp(`^${formation}`) }));
  for (const [index, name] of names.entries()) {
    const select = slotSelects()[index];
    const option = within(select).getByRole('option', { name: new RegExp(`^${name}`) });
    await user.selectOptions(select, option);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aba Escalação (F12)', () => {
  it('sem escalação: avisa que o clube não pode jogar e não envia sem formação', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    await openLineup();

    expect(screen.getByText('Sem escalação')).toBeInTheDocument();
    expect(screen.getByText('O Águias FC ainda não tem escalação')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar escalação' }));

    expect(
      screen.getByText('Escolha a formação e um titular para cada vaga antes de salvar.'),
    ).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it.each([
    ['3-1', ['Goleiro', 'Defesa', 'Defesa', 'Defesa', 'Ataque']],
    ['2-2', ['Goleiro', 'Defesa', 'Defesa', 'Ataque', 'Ataque']],
    ['2-1-1', ['Goleiro', 'Defesa', 'Defesa', 'Meio', 'Ataque']],
    ['1-2-1', ['Goleiro', 'Defesa', 'Meio', 'Meio', 'Ataque']],
  ] as const)('formação %s: 5 vagas, uma por setor da tabela', async (formation, labels) => {
    fakeApi();
    const user = userEvent.setup();
    await openLineup();

    await user.click(screen.getByRole('radio', { name: new RegExp(`^${formation}`) }));

    expect(slotSelects().map((select) => select.getAttribute('aria-label')?.split(' ')[1])).toEqual(
      labels,
    );
  });

  it('cada vaga só oferece a posição dela, sem DOENTE e sem repetir quem já está em outra vaga', async () => {
    fakeApi();
    const user = userEvent.setup();
    await openLineup();
    await user.click(screen.getByRole('radio', { name: /^2-1-1/ }));

    const [goalkeeper, firstDefense, secondDefense, midfield, attack] = slotSelects();
    expect(optionsOf(goalkeeper)).toEqual(['Escolha o titular', 'Bruno Tavares (GOL)']);
    expect(optionsOf(midfield)).toEqual(['Escolha o titular', 'Sávio Lima (MEI)']);
    expect(optionsOf(attack)).toEqual([
      'Escolha o titular',
      'Caio Rocha (ATA)',
      'João Silva (ATA)',
    ]);

    await user.selectOptions(firstDefense, '2');

    expect(optionsOf(secondDefense)).toEqual([
      'Escolha o titular',
      'Diego Ramos (LAT)',
      'Rafa Lopes (LAT)',
    ]);
  });

  it('salva: envia formação e os 5 ids, mostra o retorno da API e avisa o mal condicionado', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    await openLineup();

    await pick(user, '2-1-1', ['Bruno', 'Felipe', 'Diego', 'Sávio', 'João']);
    expect(screen.getByText('Diego Ramos está mal condicionado')).toBeInTheDocument();
    await user.dblClick(screen.getByRole('button', { name: 'Salvar escalação' }));

    await waitFor(() =>
      expect(writesTo(fetchMock)).toEqual([
        {
          method: 'PUT',
          path: '/clubs/1/lineup',
          body: { formation: '2-1-1', player_ids: [1, 2, 3, 6, 8] },
        },
      ]),
    );
    expect(await screen.findByText('Escalação salva')).toBeInTheDocument();
    expect(await screen.findByText('Completa')).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fetchMock, '/clubs/1/lineup')).toHaveLength(2));
    expect(slotSelects().map((select) => select.value)).toEqual(['1', '2', '3', '6', '8']);
  });

  it('carrega a escalação salva e, ao trocar a formação, avisa quem não cabe mais', async () => {
    fakeApi(lineupOf('2-1-1', [1, 2, 3, 6, 8]));
    const user = userEvent.setup();
    await openLineup();

    expect(screen.getByText('Completa')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^2-1-1/ })).toBeChecked();
    expect(slotSelects().map((select) => select.value)).toEqual(['1', '2', '3', '6', '8']);

    await user.click(screen.getByRole('radio', { name: /^2-2/ }));

    expect(screen.getByText(/Sávio Lima não cabe na formação 2-2/)).toBeInTheDocument();
    expect(slotSelects().map((select) => select.value)).toEqual(['1', '2', '3', '8', '']);
  });

  it('escalação incompleta (titular vendido): aviso, formação mantida e vaga vazia', async () => {
    fakeApi(lineupOf('2-1-1', [1, 2, 3, 6], false));
    await openLineup();

    expect(screen.getByText('Incompleta')).toBeInTheDocument();
    expect(
      screen.getByText('Escalação incompleta: o Águias FC não pode jogar partidas'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^2-1-1/ })).toBeChecked();
    expect(slotSelects().map((select) => select.value)).toEqual(['1', '2', '3', '6', '']);
  });

  it('vaga sem titular escolhido não é enviada', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    await openLineup();

    await pick(user, '2-1-1', ['Bruno', 'Felipe', 'Diego', 'Sávio']);
    await user.click(screen.getByRole('button', { name: 'Salvar escalação' }));

    expect(
      screen.getByText('Escolha um titular para cada vaga antes de salvar.'),
    ).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('recusa da API (409): mostra o message e mantém as escolhas', async () => {
    fakeApi(NO_LINEUP, (_url, method) =>
      method === 'PUT'
        ? jsonResponse({ message: 'Rafa Lopes não é do elenco deste clube.' }, 409)
        : undefined,
    );
    const user = userEvent.setup();
    await openLineup();

    await pick(user, '2-1-1', ['Bruno', 'Felipe', 'Rafa', 'Sávio', 'Caio']);
    await user.click(screen.getByRole('button', { name: 'Salvar escalação' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Escalação recusada');
    expect(alert).toHaveTextContent('Rafa Lopes não é do elenco deste clube.');
    expect(slotSelects().map((select) => select.value)).toEqual(['1', '2', '4', '6', '7']);
  });

  it('falha ao carregar a escalação: erro com o message e nova tentativa', async () => {
    let failing = true;
    fakeApi(NO_LINEUP, (url) =>
      failing && url.pathname.endsWith('/lineup')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/clubs/1?tab=lineup');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar a escalação');
    failing = false;
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Titulares' })).toBeInTheDocument();
  });

  it('venda de um titular: a confirmação avisa que ele sai da escalação', async () => {
    fakeApi(lineupOf('2-1-1', [1, 2, 3, 6, 8]));
    const user = userEvent.setup();
    renderApp('/clubs/1');
    await screen.findByRole('table', { name: 'Elenco' });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Vender/ }).length).toBe(8));

    await user.click(screen.getByRole('button', { name: 'Vender João Silva' }));
    expect(await screen.findByText('João Silva é titular')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Vender Caio Rocha' }));
    expect(screen.queryByText('Caio Rocha é titular')).not.toBeInTheDocument();
  });
});
