import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, requestsTo, writesTo } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { Club, SquadPlayer } from '../clubs/api';
import type { Player } from '../players/api';
import type { SaleResult, Transaction } from './api';

type User = ReturnType<typeof userEvent.setup>;

function makePlayer(id: number, name: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name,
    position: 'ZAG',
    agility: 70,
    age: 27,
    condition: 'APTO',
    base_value: 52,
    market_value: 52,
    pace: 60,
    shooting: 60,
    passing: 60,
    dribbling: 60,
    defending: 80,
    physical: 70,
    potential: 75,
    overall: 77,
    club_id: 1,
    ...overrides,
  };
}

const CONTRACT = {
  purchase_value: 44.2,
  loyalty_until: '2027-04-04T15:45:00-03:00',
  remaining_days: 144,
  penalty_rate: 10,
};

/** Venda de Felipe Moura como no Figma V02; números próprios da resposta, sem conta na tela. */
const SALE: SaleResult = {
  id: 11,
  club_id: 1,
  player_id: 3,
  player_name: 'Felipe Moura',
  type: 'VENDA',
  value: 52,
  fee: 0.78,
  penalty: 5.2,
  profit: 7.8,
  cash_change: 46.02,
  created_at: '2026-11-12T15:00:00-03:00',
  purchase_value: 44.2,
  remaining_days: 144,
  penalty_rate: 10,
  contract_status: 'RESCINDIDO',
  club_cash: 97.6,
};

type Override = (url: URL, method: string) => Response | Promise<Response> | undefined;

/**
 * API falsa com estado: Águias FC (caixa 51,58) com Bruno (1) e Felipe (3); a venda de Felipe
 * devolve o resultado acima, tira o jogador do elenco, devolve-o aos livres, muda o caixa e
 * grava a VENDA no histórico.
 */
function fakeApi(override?: Override) {
  let squad: SquadPlayer[] = [
    { ...makePlayer(1, 'Bruno Tavares', { position: 'GOL' }), contract: CONTRACT },
    { ...makePlayer(3, 'Felipe Moura'), contract: CONTRACT },
  ];
  let free: Player[] = [];
  const club: Club = {
    id: 1,
    name: 'Águias FC',
    acronym: 'AGU',
    cash: 51.58,
    squad_value: 84,
    net_worth: 135.58,
  };
  const history: Transaction[] = [];
  return mockApi(async (url, _signal, request) => {
    const overridden = await override?.(url, request.method);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs') {
      return jsonResponse([club]);
    }
    if (path === '/clubs/1') {
      return jsonResponse({ ...club, players: squad });
    }
    if (path === '/clubs/1/transactions') {
      return jsonResponse({
        data: history,
        summary: {
          total_spent: 0,
          total_received: history.length ? 46.02 : 0,
          total_fees: history.length ? 0.78 : 0,
          total_penalties: history.length ? 5.2 : 0,
          total_profit: history.length ? 7.8 : 0,
        },
      });
    }
    if (path === '/players/3/sell' && request.method === 'POST') {
      const sold = squad.find(({ id }) => id === 3);
      if (!sold) {
        return jsonResponse({ message: 'O jogador está livre: não há clube para vender.' }, 409);
      }
      squad = squad.filter(({ id }) => id !== 3);
      free = [{ ...sold, club_id: null }];
      club.cash = 97.6;
      club.squad_value = 32;
      club.net_worth = 129.6;
      history.unshift({
        id: SALE.id,
        club_id: SALE.club_id,
        player_id: SALE.player_id,
        player_name: SALE.player_name,
        type: SALE.type,
        value: SALE.value,
        fee: SALE.fee,
        penalty: SALE.penalty,
        profit: SALE.profit,
        cash_change: SALE.cash_change,
        created_at: SALE.created_at,
      });
      return jsonResponse(SALE);
    }
    if (path === '/players/3') {
      const inClub = squad.some(({ id }) => id === 3);
      return jsonResponse(makePlayer(3, 'Felipe Moura', { club_id: inClub ? 1 : null }));
    }
    if (path === '/players') {
      const data = url.searchParams.get('free') === 'true' ? free : [...squad, ...free];
      return jsonResponse({
        data,
        meta: { page: 1, limit: 10, total_items: data.length, total_pages: data.length ? 1 : 0 },
      });
    }
    return jsonResponse({ message: 'Recurso não encontrado.' }, 404);
  });
}

function squadTable() {
  return within(screen.getByRole('table', { name: 'Elenco' }));
}

function sellDialog() {
  return within(screen.getByRole('dialog', { name: 'Vender Felipe Moura?' }));
}

async function openSell(user: User) {
  await screen.findByRole('table', { name: 'Elenco' });
  await user.click(await squadTable().findByRole('button', { name: 'Vender Felipe Moura' }));
  return sellDialog();
}

function summaryCards(): string[] {
  return within(screen.getByRole('list', { name: 'Resumo do clube' }))
    .getAllByRole('listitem')
    .map((card) => card.textContent ?? '');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Vender no elenco (F08)', () => {
  it('cada jogador do elenco tem "Vender"; a confirmação mostra o jogador e o contrato', async () => {
    fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    await screen.findByRole('table', { name: 'Elenco' });

    expect(
      await squadTable().findByRole('button', { name: 'Vender Bruno Tavares' }),
    ).toBeInTheDocument();
    const dialog = await openSell(user);

    expect(
      dialog.getByText('O jogador sai do elenco do Águias FC e volta a ficar livre.'),
    ).toBeInTheDocument();
    expect(dialog.getByText('Felipe Moura')).toBeInTheDocument();
    const rows = dialog.getAllByRole('term').map((term) => term.textContent);
    expect(rows).toEqual([
      'Valor de compra',
      'Fim da fidelidade',
      'Dias restantes',
      '% de multa se vender agora',
    ]);
    expect(dialog.getByText('04/04/2027, 15:45')).toBeInTheDocument();
    expect(dialog.getByText('144')).toBeInTheDocument();
    expect(dialog.getByText('10%')).toBeInTheDocument();
  });

  it('cancelar não envia nada', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);

    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('clique duplo envia uma só venda, sem corpo, e o resultado traz os números da API', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);

    await user.dblClick(dialog.getByRole('button', { name: 'Confirmar venda' }));

    const result = within(await screen.findByRole('dialog', { name: 'Venda concluída' }));
    expect(writesTo(fetchMock)).toEqual([
      { method: 'POST', path: '/players/3/sell', body: undefined },
    ]);
    const values = result.getAllByRole('definition').map((definition) => definition.textContent);
    expect(result.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Valor de compra',
      'Valor de vendaValor de mercado no momento da venda',
      'Dias restantes',
      'Multa10% do valor de venda, com teto de 10,00',
      'Lucro',
      'Comissão',
      'Crédito no caixaValor de venda − multa − comissão',
      'Contrato',
      'Novo caixa do Águias FC',
    ]);
    expect(values).toEqual([
      '44,20',
      '52,00',
      '144',
      '5,20',
      '+7,80',
      '0,78',
      '+46,02',
      'RESCINDIDO',
      '97,60',
    ]);
    expect(result.getByText('+7,80')).toHaveClass('text-success');
  });

  it('depois da venda: elenco, caixa e patrimônio da API; histórico com a VENDA; jogador livre', async () => {
    const fetchMock = fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);
    await user.click(dialog.getByRole('button', { name: 'Confirmar venda' }));
    const result = within(await screen.findByRole('dialog', { name: 'Venda concluída' }));

    await waitFor(() => expect(squadTable().queryByText('Felipe Moura')).not.toBeInTheDocument());
    expect(summaryCards()[0]).toContain('97,60');
    expect(summaryCards()[2]).toContain('129,60');
    expect(requestsTo(fetchMock, '/clubs').length).toBeGreaterThanOrEqual(2);

    await user.click(result.getByRole('button', { name: 'Ver histórico' }));
    const history = within(await screen.findByRole('table', { name: 'Histórico de transações' }));
    expect(await history.findByText('Felipe Moura')).toBeInTheDocument();
    expect(history.getByText('+46,02')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Jogadores/ }));
    await user.click(await screen.findByRole('button', { name: /^Livres/ }));
    const players = within(await screen.findByRole('table', { name: 'Jogadores' }));
    expect(await players.findByText('Felipe Moura')).toBeInTheDocument();
  });

  it.each([
    [409, 'O jogador está livre: não há clube para vender.'],
    [404, 'Jogador não encontrado.'],
  ])(
    'recusa %i: mostra o message, não mostra resultado e recarrega o clube',
    async (status, message) => {
      const fetchMock = fakeApi((_url, method) =>
        method === 'POST' ? jsonResponse({ message }, status) : undefined,
      );
      const user = userEvent.setup();
      renderApp('/clubs/1');
      const dialog = await openSell(user);

      await user.click(dialog.getByRole('button', { name: 'Confirmar venda' }));

      const alert = await dialog.findByRole('alert');
      expect(alert).toHaveTextContent('Venda recusada');
      expect(alert).toHaveTextContent(message);
      expect(screen.queryByRole('dialog', { name: 'Venda concluída' })).not.toBeInTheDocument();
      await waitFor(() => expect(requestsTo(fetchMock, '/clubs/1')).toHaveLength(2));
    },
  );

  it('falha de rede com o jogador ainda no clube: "Sem conexão" e nova tentativa', async () => {
    let failing = true;
    const fetchMock = fakeApi((_url, method) =>
      failing && method === 'POST' ? Promise.reject(new TypeError('Failed to fetch')) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);

    await user.click(dialog.getByRole('button', { name: 'Confirmar venda' }));

    expect(await dialog.findByText('Sem conexão')).toBeInTheDocument();
    failing = false;
    await user.click(dialog.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('dialog', { name: 'Venda concluída' })).toBeInTheDocument();
    expect(writesTo(fetchMock)).toHaveLength(2);
  });

  it('falha de rede, mas o jogador já saiu do clube: avisa e não deixa vender de novo', async () => {
    const fetchMock = fakeApi((url, method) => {
      if (method === 'POST') {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return url.pathname.endsWith('/players/3')
        ? jsonResponse(makePlayer(3, 'Felipe Moura', { club_id: null }))
        : undefined;
    });
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);

    await user.click(dialog.getByRole('button', { name: 'Confirmar venda' }));

    expect(await dialog.findByText('A venda pode ter sido concluída')).toBeInTheDocument();
    expect(
      dialog.queryByRole('button', { name: /Tentar de novo|Confirmar venda/ }),
    ).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it('se a recarga do clube falhar depois da venda, o resultado continua na tela', async () => {
    let sold = false;
    fakeApi((url, method) => {
      if (method === 'POST') {
        sold = true;
        return undefined;
      }
      return sold && url.pathname.endsWith('/clubs/1')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : undefined;
    });
    const user = userEvent.setup();
    renderApp('/clubs/1');
    const dialog = await openSell(user);

    await user.click(dialog.getByRole('button', { name: 'Confirmar venda' }));

    expect(await screen.findByText('Não foi possível carregar o clube')).toBeInTheDocument();
    const result = within(screen.getByRole('dialog', { name: 'Venda concluída' }));
    expect(result.getByText('97,60')).toBeInTheDocument();
  });
});
