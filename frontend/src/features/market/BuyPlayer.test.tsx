import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  jsonResponse,
  mockApi,
  requestsTo,
  writesTo,
  type ApiRequest,
} from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { Club } from '../clubs/api';
import type { Player } from '../players/api';
import type { BuyPlayerBody, PurchaseResult, Transaction } from './api';

type User = ReturnType<typeof userEvent.setup>;

/** 02/11/2026 às 10:15 de Brasília (exemplo 2.3.1); os testes rodam em UTC. */
const NOW = new Date('2026-11-02T13:15:00.000Z');

function makePlayer(id: number, name: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name,
    position: 'MEI',
    agility: 68,
    age: 26,
    condition: 'APTO',
    base_value: 46,
    market_value: 46,
    pace: 60,
    shooting: 60,
    passing: 60,
    dribbling: 60,
    defending: 60,
    physical: 60,
    potential: 70,
    overall: 76,
    club_id: null,
    ...overrides,
  };
}

const CLUBS: Club[] = [
  { id: 1, name: 'Águias FC', acronym: 'AGU', cash: 300, squad_value: 0, net_worth: 300 },
  { id: 2, name: 'Tubarões EC', acronym: 'TUB', cash: 300, squad_value: 0, net_worth: 300 },
];

/** Resposta própria do teste; `undefined` (ou uma promessa dele) segue para a API falsa. */
type Override = (
  url: URL,
  request: ApiRequest,
) => Response | Promise<Response | undefined> | undefined;

/**
 * API falsa com estado, como o backend: `GET /players` com `free`, `club_id` e páginas de 10;
 * `POST /players/{id}/buy` cobra 46,00 + 2,30 (valores próprios da resposta, diferentes do
 * valor de mercado mostrado antes) e põe o jogador no clube; `GET /clubs/{id}` com o contrato;
 * `GET /clubs/{id}/transactions` com as compras gravadas (mais recente primeiro).
 */
function fakeApi(initialPlayers: Player[], override?: Override, initialClubs = CLUBS) {
  let players = initialPlayers.map((player) => ({ ...player }));
  const clubs = initialClubs.map((club) => ({ ...club }));
  const contracts = new Map<number, { purchase_value: number; loyalty_until: string }>();
  let nextTransaction = 10;
  const transactions: Transaction[] = [];
  return mockApi(async (url, _signal, request) => {
    const overridden = await override?.(url, request);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs') {
      return jsonResponse(clubs);
    }
    const historyMatch = /^\/clubs\/(\d+)\/transactions$/.exec(path);
    if (historyMatch) {
      const data = transactions.filter(({ club_id }) => club_id === Number(historyMatch[1]));
      const spent = data.reduce((sum, { cash_change }) => sum - cash_change, 0);
      const fees = data.reduce((sum, { fee }) => sum + fee, 0);
      return jsonResponse({
        data,
        summary: {
          total_spent: spent,
          total_received: 0,
          total_fees: fees,
          total_penalties: 0,
          total_profit: 0,
        },
      });
    }
    const clubMatch = /^\/clubs\/(\d+)$/.exec(path);
    if (clubMatch) {
      const club = clubs.find(({ id }) => id === Number(clubMatch[1]));
      const squad = players
        .filter((player) => player.club_id === club?.id)
        .map((player) => ({
          ...player,
          contract: { ...contracts.get(player.id), remaining_days: 120, penalty_rate: 10 },
        }));
      return club
        ? jsonResponse({ ...club, players: squad })
        : jsonResponse({ message: 'Clube não encontrado.' }, 404);
    }
    if (path === '/players') {
      const free = url.searchParams.get('free');
      const clubId = url.searchParams.get('club_id');
      const page = Number(url.searchParams.get('page'));
      const filtered = players.filter(
        (player) =>
          (free === null || (free === 'true') === (player.club_id === null)) &&
          (clubId === null || player.club_id === Number(clubId)),
      );
      return jsonResponse({
        data: filtered.slice((page - 1) * 10, page * 10),
        meta: {
          page,
          limit: 10,
          total_items: filtered.length,
          total_pages: Math.ceil(filtered.length / 10),
        },
      });
    }
    const buyMatch = /^\/players\/(\d+)\/buy$/.exec(path);
    if (buyMatch && request.method === 'POST') {
      const { club_id: clubId, loyalty_until: loyaltyUntil } = request.body as BuyPlayerBody;
      const player = players.find(({ id }) => id === Number(buyMatch[1]));
      const club = clubs.find(({ id }) => id === clubId);
      if (!player || !club) {
        return jsonResponse({ message: 'Jogador não encontrado.' }, 404);
      }
      if (player.club_id !== null) {
        return jsonResponse({ message: 'O jogador não está livre: já pertence a um clube.' }, 409);
      }
      club.cash = Math.round((club.cash - 48.3) * 100) / 100;
      club.squad_value = 46;
      club.net_worth = Math.round((club.cash + 46) * 100) / 100;
      players = players.map((item) =>
        item.id === player.id ? { ...item, club_id: club.id, market_value: 46 } : item,
      );
      const loyalty = `${loyaltyUntil.slice(0, 16)}:00-03:00`;
      contracts.set(player.id, { purchase_value: 46, loyalty_until: loyalty });
      nextTransaction += 1;
      const result: PurchaseResult = {
        id: nextTransaction,
        club_id: club.id,
        player_id: player.id,
        player_name: player.name,
        type: 'COMPRA',
        value: 46,
        fee: 2.3,
        penalty: 0,
        profit: null,
        cash_change: -48.3,
        created_at: '2026-11-02T10:15:00-03:00',
        contract: { purchase_value: 46, loyalty_until: loyalty, status: 'ATIVO' },
        club_cash: club.cash,
      };
      transactions.unshift({
        id: result.id,
        club_id: result.club_id,
        player_id: result.player_id,
        player_name: result.player_name,
        type: result.type,
        value: result.value,
        fee: result.fee,
        penalty: result.penalty,
        profit: result.profit,
        cash_change: result.cash_change,
        created_at: result.created_at,
      });
      return jsonResponse(result);
    }
    const playerMatch = /^\/players\/(\d+)$/.exec(path);
    const found = players.find(({ id }) => id === Number(playerMatch?.[1]));
    return found ? jsonResponse(found) : jsonResponse({ message: 'Jogador não encontrado.' }, 404);
  });
}

/** Eduardo Paiva livre, valendo 40,00 na lista (a compra grava 46,00); João Silva no Águias. */
const EDUARDO = makePlayer(1, 'Eduardo Paiva', { market_value: 40 });
const JOAO = makePlayer(2, 'João Silva', { position: 'ATA', club_id: 1 });

function playersTable() {
  return within(screen.getByRole('table', { name: 'Jogadores' }));
}

function dialog() {
  return within(screen.getByRole('dialog', { name: 'Comprar jogador' }));
}

async function openBuy(user: User, name: string) {
  await user.click(await playersTable().findByRole('button', { name: `Comprar ${name}` }));
  return dialog();
}

/** Preenche data e hora (campos nativos `date` e `time`). */
function setLoyalty(date: string, time: string) {
  fireEvent.change(dialog().getByLabelText(/^Fim da fidelidade \(data\)/), {
    target: { value: date },
  });
  fireEvent.change(dialog().getByLabelText(/^Hora/), { target: { value: time } });
}

async function fillAndReview(user: User, clubId = '1', date = '2027-03-02', time = '10:15') {
  await user.selectOptions(dialog().getByLabelText(/^Clube comprador/), clubId);
  setLoyalty(date, time);
  await user.click(dialog().getByRole('button', { name: 'Revisar compra' }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Comprar na lista de jogadores (F06)', () => {
  it('jogador livre tem "Comprar"; com clube, não tem, e o menu explica por quê', async () => {
    fakeApi([EDUARDO, JOAO]);
    const user = userEvent.setup();
    renderApp('/players');

    expect(
      await playersTable().findByRole('button', { name: 'Comprar Eduardo Paiva' }),
    ).toBeInTheDocument();
    expect(
      playersTable().queryByRole('button', { name: 'Comprar João Silva' }),
    ).not.toBeInTheDocument();

    await user.click(playersTable().getByRole('button', { name: 'Ações de João Silva' }));
    const buyItem = screen.getByRole('menuitem', { name: /Comprar/ });
    expect(buyItem).toBeDisabled();
    expect(buyItem).toHaveAccessibleDescription(
      'Só jogador livre pode ser comprado; este já está num clube.',
    );
  });

  it('abre o diálogo do jogador certo, com o valor de mercado e a fidelidade sugerida', async () => {
    fakeApi([EDUARDO, JOAO]);
    const user = userEvent.setup();
    renderApp('/players');

    const buy = await openBuy(user, 'Eduardo Paiva');

    expect(buy.getByText('Eduardo Paiva')).toBeInTheDocument();
    expect(buy.getByText('MEI · Meio-campo · 26 anos')).toBeInTheDocument();
    expect(buy.getByText('40,00')).toBeInTheDocument();
    expect(buy.getByLabelText(/^Clube comprador/)).toHaveFocus();
    expect(buy.getByLabelText(/^Clube comprador/)).toHaveValue('');
    expect(
      within(buy.getByLabelText(/^Clube comprador/))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Escolha o clube',
      'Águias FC (AGU) · caixa 300,00',
      'Tubarões EC (TUB) · caixa 300,00',
    ]);
    expect(buy.getByLabelText(/^Fim da fidelidade \(data\)/)).toHaveValue('2027-11-02');
    expect(buy.getByLabelText(/^Hora/)).toHaveValue('10:15');
  });

  it('funciona na 2ª página e com o filtro "Livres"', async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      makePlayer(index + 1, `Jogador ${String.fromCharCode(65 + index)}`),
    );
    fakeApi(many);
    const user = userEvent.setup();
    renderApp('/players');

    await user.click(await screen.findByRole('button', { name: 'Livres' }));
    await user.click(await screen.findByRole('button', { name: 'Página 2' }));
    const buy = await openBuy(user, 'Jogador L');

    expect(buy.getByText('Jogador L')).toBeInTheDocument();
  });

  it('valida clube, data passada e limite de 1.095 dias antes de enviar', async () => {
    const fetchMock = fakeApi([EDUARDO]);
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');

    await user.click(buy.getByRole('button', { name: 'Revisar compra' }));
    expect(buy.getByLabelText(/^Clube comprador/)).toHaveAccessibleDescription(
      expect.stringContaining('Escolha o clube comprador.'),
    );

    await user.selectOptions(buy.getByLabelText(/^Clube comprador/), '1');
    setLoyalty('2026-11-01', '10:15');
    await user.click(buy.getByRole('button', { name: 'Revisar compra' }));
    expect(
      await buy.findByText(
        'O fim da fidelidade precisa ser depois de agora (horário de Brasília).',
      ),
    ).toBeInTheDocument();

    setLoyalty('2029-11-01', '10:16');
    await user.click(buy.getByRole('button', { name: 'Revisar compra' }));
    expect(
      await buy.findByText('Use no máximo 1.095 dias a partir de agora (até 01/11/2029 às 10:15).'),
    ).toBeInTheDocument();

    setLoyalty('2029-11-01', '10:15');
    await user.click(buy.getByRole('button', { name: 'Revisar compra' }));
    expect(await buy.findByRole('button', { name: 'Confirmar compra' })).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('cancelar no formulário ou voltar da revisão não envia nada', async () => {
    const fetchMock = fakeApi([EDUARDO]);
    const user = userEvent.setup();
    renderApp('/players');

    let buy = await openBuy(user, 'Eduardo Paiva');
    await user.click(buy.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    buy = await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user);
    await user.click(buy.getByRole('button', { name: 'Voltar' }));
    expect(buy.getByLabelText(/^Clube comprador/)).toHaveValue('1');
    expect(buy.getByLabelText(/^Fim da fidelidade \(data\)/)).toHaveValue('2027-03-02');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
  });
});

describe('confirmação, envio e resultado', () => {
  it('revisa, envia um só POST com club_id número e loyalty_until -03:00 e mostra o resultado da API', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held = false;
    // O 1º POST espera o `gate` e então segue para a resposta normal da API falsa.
    const fetchMock = fakeApi([EDUARDO, JOAO], (_url, request) => {
      if (request.method === 'POST' && !held) {
        held = true;
        return gate.then(() => undefined);
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user);

    expect(
      buy.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'Confirma a compra de Eduardo Paiva para Águias FC, com fidelidade até 02/03/2027 às 10h15?',
      ),
    ).toBeInTheDocument();
    expect(buy.getByText('Águias FC (AGU)')).toBeInTheDocument();
    expect(buy.getByText('02/03/2027 às 10:15')).toBeInTheDocument();
    expect(buy.getByText('40,00 moedas')).toBeInTheDocument();
    expect(buy.getByText('Taxa e custo final são definidos pela API')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);

    await user.dblClick(buy.getByRole('button', { name: 'Confirmar compra' }));
    expect(buy.getByRole('button', { name: 'Comprando…' })).toBeDisabled();
    expect(buy.getByRole('button', { name: 'Voltar' })).toBeDisabled();
    release();

    const result = within(await screen.findByRole('dialog', { name: 'Compra concluída' }));
    expect(writesTo(fetchMock)).toEqual([
      {
        method: 'POST',
        path: '/players/1/buy',
        body: { club_id: 1, loyalty_until: '2027-03-02T10:15-03:00' },
      },
    ]);
    const rows = result.getAllByRole('definition').map((value) => value.textContent);
    expect(rows).toEqual(['46,00', '2,30', '48,30', '02/03/2027, 10:15', 'ATIVO', '251,70']);
    expect(result.getByText('Novo caixa do Águias FC')).toBeInTheDocument();
    expect(result.getByText(/Eduardo Paiva agora é do Águias FC/)).toBeInTheDocument();
    expect(result.queryByText('40,00')).not.toBeInTheDocument();
  });

  it('depois da compra, a lista, o filtro por clube, o menu e a página do clube vêm atualizados da API', async () => {
    fakeApi([EDUARDO, JOAO]);
    const user = userEvent.setup();
    renderApp('/players');
    await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user, '2');
    await user.click(dialog().getByRole('button', { name: 'Confirmar compra' }));
    const result = within(await screen.findByRole('dialog', { name: 'Compra concluída' }));

    await waitFor(() =>
      expect(playersTable().getByRole('link', { name: 'Tubarões EC' })).toBeInTheDocument(),
    );
    expect(
      playersTable().queryByRole('button', { name: 'Comprar Eduardo Paiva' }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Clubes' })).getByRole('link', {
        name: /Tubarões EC/,
      }),
    ).toBeInTheDocument();

    await user.click(result.getByRole('button', { name: 'Fechar' }));
    await user.click(screen.getByRole('button', { name: 'Livres' }));
    expect(await screen.findByText('Nenhum jogador encontrado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Clube' }), '2');
    expect(await playersTable().findByText('Eduardo Paiva')).toBeInTheDocument();

    await user.click(playersTable().getByRole('link', { name: 'Tubarões EC' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tubarões EC' }),
    ).toBeInTheDocument();
    const summary = within(screen.getByRole('list', { name: 'Resumo do clube' }))
      .getAllByRole('listitem')
      .map((card) => card.textContent);
    expect(summary[0]).toContain('251,70');
    expect(summary[2]).toContain('297,70');
    const squad = within(screen.getByRole('table', { name: 'Elenco' }));
    const row = squad.getByText('Eduardo Paiva').closest('tr') as HTMLElement;
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'EPEduardo Paiva',
      'MEI',
      '76',
      'Apto',
      '46,00',
      '46,00',
      '02/03/202710:15',
      '120',
      '10%',
    ]);
  });
});

describe('compra e histórico do clube', () => {
  it('a compra feita na tela aparece no histórico do clube, consultado de novo na API', async () => {
    const fetchMock = fakeApi([EDUARDO, JOAO]);
    const user = userEvent.setup();
    renderApp('/clubs/2?tab=history');
    expect(await screen.findByText('Nenhuma transação ainda')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Comprar jogadores' }));
    await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user, '2');
    await user.click(dialog().getByRole('button', { name: 'Confirmar compra' }));
    const result = within(await screen.findByRole('dialog', { name: 'Compra concluída' }));
    await user.click(result.getByRole('link', { name: 'Ver clube' }));
    await user.click(await screen.findByRole('tab', { name: /^Histórico/ }));

    const history = within(await screen.findByRole('table', { name: 'Histórico de transações' }));
    const row = history.getByText('Eduardo Paiva').closest('tr') as HTMLElement;
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      '02/11/202610:15',
      'Compra',
      'EPEduardo Paiva',
      '46,00',
      '2,30',
      '0,00',
      '–Não se aplica',
      '-48,30',
    ]);
    const totals = within(screen.getByRole('list', { name: 'Totais das transações' }));
    expect(totals.getAllByRole('listitem')[0]).toHaveTextContent('48,30');
    expect(requestsTo(fetchMock, '/clubs/2/transactions').length).toBeGreaterThanOrEqual(2);
  });
});

describe('recusas e falhas', () => {
  it.each([
    [409, 'O custo da compra (48,30) passa do limite de 50% do caixa (caixa: 90,92).'],
    [409, 'O elenco já tem o máximo de 12 jogadores.'],
    [400, 'O fim da fidelidade deve ser depois do momento da compra e até 1095 dias depois dele.'],
  ])(
    '%i: volta ao formulário com o message da API e os dados, sem sucesso',
    async (status, message) => {
      const fetchMock = fakeApi([EDUARDO], (_url, request) =>
        request.method === 'POST' ? jsonResponse({ message }, status) : undefined,
      );
      const user = userEvent.setup();
      renderApp('/players');
      const buy = await openBuy(user, 'Eduardo Paiva');
      await fillAndReview(user, '2');
      await user.click(buy.getByRole('button', { name: 'Confirmar compra' }));

      const alert = await buy.findByRole('alert');
      expect(alert).toHaveTextContent('Compra recusada');
      expect(alert).toHaveTextContent(message);
      expect(buy.getByLabelText(/^Clube comprador/)).toHaveValue('2');
      expect(buy.getByLabelText(/^Fim da fidelidade \(data\)/)).toHaveValue('2027-03-02');
      expect(screen.queryByRole('dialog', { name: 'Compra concluída' })).not.toBeInTheDocument();
      expect(writesTo(fetchMock)).toHaveLength(1);

      await user.selectOptions(buy.getByLabelText(/^Clube comprador/), '1');
      await user.click(buy.getByRole('button', { name: 'Revisar compra' }));
      expect(buy.getByText('Águias FC (AGU)')).toBeInTheDocument();
    },
  );

  it('404 (jogador excluído enquanto a tela estava aberta): mostra o message e recarrega a lista', async () => {
    const fetchMock = fakeApi([EDUARDO], (_url, request) =>
      request.method === 'POST'
        ? jsonResponse({ message: 'Jogador não encontrado.' }, 404)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');
    const listsBefore = requestsTo(fetchMock, '/players').length;
    await fillAndReview(user);
    await user.click(buy.getByRole('button', { name: 'Confirmar compra' }));

    expect(await buy.findByRole('alert')).toHaveTextContent('Jogador não encontrado.');
    await waitFor(() =>
      expect(requestsTo(fetchMock, '/players').length).toBeGreaterThan(listsBefore),
    );
  });

  it('falha de rede com o jogador ainda livre: "Sem conexão" e nova tentativa controlada', async () => {
    let failed = false;
    const fetchMock = fakeApi([EDUARDO], (_url, request) => {
      if (request.method === 'POST' && !failed) {
        failed = true;
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user);
    await user.click(buy.getByRole('button', { name: 'Confirmar compra' }));

    expect(await buy.findByText('Sem conexão')).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/players/1')).toHaveLength(1);
    expect(screen.queryByRole('dialog', { name: 'Compra concluída' })).not.toBeInTheDocument();

    await user.click(buy.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('dialog', { name: 'Compra concluída' })).toBeInTheDocument();
    expect(writesTo(fetchMock)).toHaveLength(2);
  });

  it('falha de rede, mas o jogador já está no clube: avisa e não deixa enviar de novo', async () => {
    const fetchMock = fakeApi([EDUARDO], (url, request) => {
      if (request.method === 'POST') {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      if (url.pathname.endsWith('/players/1')) {
        return jsonResponse({ ...EDUARDO, club_id: 1 });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user);
    await user.click(buy.getByRole('button', { name: 'Confirmar compra' }));

    expect(await buy.findByText('A compra pode ter sido concluída')).toBeInTheDocument();
    expect(buy.getByText(/já aparece no Águias FC/)).toBeInTheDocument();
    expect(buy.queryByRole('button', { name: /Tentar de novo|Confirmar compra/ })).toBeNull();
    await user.click(buy.getByRole('button', { name: 'Fechar' }));
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it('falha de rede e a conferência também falha: só "Conferir de novo", sem novo POST', async () => {
    let checks = 0;
    const fetchMock = fakeApi([EDUARDO], (url, request) => {
      if (request.method === 'POST') {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      if (url.pathname.endsWith('/players/1')) {
        checks += 1;
        return checks === 1
          ? Promise.reject(new TypeError('Failed to fetch'))
          : jsonResponse(EDUARDO);
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');
    await fillAndReview(user);
    await user.click(buy.getByRole('button', { name: 'Confirmar compra' }));

    expect(await buy.findByText('Não foi possível confirmar a compra')).toBeInTheDocument();
    await user.click(buy.getByRole('button', { name: 'Conferir de novo' }));
    expect(await buy.findByRole('button', { name: 'Tentar de novo' })).toBeEnabled();
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it('sem clubes cadastrados: orienta e não deixa revisar', async () => {
    fakeApi([EDUARDO], undefined, []);
    const user = userEvent.setup();
    renderApp('/players');
    const buy = await openBuy(user, 'Eduardo Paiva');

    expect(buy.getByText('Nenhum clube cadastrado')).toBeInTheDocument();
    expect(buy.getByRole('link', { name: 'Ir para clubes' })).toHaveAttribute('href', '/clubs');
    expect(buy.getByRole('button', { name: 'Revisar compra' })).toBeDisabled();
  });
});

describe('"Comprar jogadores" na página do clube', () => {
  it('abre a lista em "Livres" e o diálogo já vem com o clube escolhido', async () => {
    const fetchMock = fakeApi([EDUARDO, JOAO]);
    const user = userEvent.setup();
    renderApp('/clubs/2');

    await user.click(await screen.findByRole('link', { name: 'Comprar jogadores' }));

    expect(await screen.findByText('Comprando para o Tubarões EC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Livres/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(requestsTo(fetchMock, '/players').at(-1)?.searchParams.get('free')).toBe('true'),
    );
    const buy = await openBuy(user, 'Eduardo Paiva');
    expect(buy.getByLabelText(/^Clube comprador/)).toHaveValue('2');
  });
});
