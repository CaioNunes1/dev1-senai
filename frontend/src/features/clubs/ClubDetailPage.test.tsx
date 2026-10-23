import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, requestsTo } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { ClubDetail, SquadPlayer } from './api';

const CLUB_ROW = {
  id: 2,
  name: 'Águias FC',
  acronym: 'AGU',
  cash: 51.58,
  squad_value: 222.68,
  net_worth: 274.26,
};

function makeSquadPlayer(overrides: Partial<SquadPlayer>): SquadPlayer {
  return {
    id: 1,
    name: 'Bruno Tavares',
    position: 'GOL',
    agility: 70,
    age: 28,
    condition: 'APTO',
    base_value: 32,
    market_value: 32,
    pace: 50,
    shooting: 40,
    passing: 60,
    dribbling: 45,
    defending: 70,
    physical: 72,
    potential: 75,
    overall: 71,
    club_id: 2,
    contract: {
      purchase_value: 32,
      loyalty_until: '2028-11-03T11:20:00-03:00',
      remaining_days: 722,
      penalty_rate: 20,
    },
    ...overrides,
  };
}

/** Elenco na ordem da RN11 (GOL → ATA); os nomes não estão em ordem alfabética de propósito. */
const SQUAD: SquadPlayer[] = [
  makeSquadPlayer({ id: 7 }),
  makeSquadPlayer({
    id: 3,
    name: 'Felipe Moura',
    position: 'ZAG',
    overall: 77,
    market_value: 52,
    contract: {
      purchase_value: 44.2,
      loyalty_until: '2027-04-04T15:45:00-03:00',
      remaining_days: 144,
      penalty_rate: 10,
    },
  }),
  makeSquadPlayer({
    id: 9,
    name: 'Lucas Ferraz',
    position: 'MEI',
    condition: 'DOENTE',
    market_value: 24,
    contract: {
      purchase_value: 28.8,
      loyalty_until: '2026-11-07T09:00:00-03:00',
      remaining_days: 0,
      penalty_rate: 0,
    },
  }),
  makeSquadPlayer({
    id: 4,
    name: 'João Silva',
    position: 'ATA',
    market_value: 1744.14,
    contract: {
      purchase_value: 52,
      loyalty_until: '2029-11-04T17:10:00-03:00',
      remaining_days: 1089,
      penalty_rate: 20,
    },
  }),
];

const DETAIL: ClubDetail = { ...CLUB_ROW, players: SQUAD };

const EMPTY_HISTORY = {
  data: [],
  summary: {
    total_spent: 0,
    total_received: 0,
    total_fees: 0,
    total_penalties: 0,
    total_profit: 0,
  },
};

/**
 * `GET /clubs` para o menu e a trilha; `GET /clubs/{id}` conforme `detail`; histórico vazio
 * (a aba Histórico tem os próprios testes em `market/TransactionHistory.test.tsx`).
 */
function mockClubApi(detail: (url: URL) => Response | Promise<Response>) {
  return mockApi((url) => {
    if (url.pathname.endsWith('/clubs')) {
      return jsonResponse([CLUB_ROW]);
    }
    if (url.pathname.endsWith('/transactions')) {
      return jsonResponse(EMPTY_HISTORY);
    }
    if (url.pathname.endsWith('/lineup')) {
      return jsonResponse({ club_id: 2, formation: null, complete: false, players: [] });
    }
    if (url.pathname.includes('/clubs/')) {
      return detail(url);
    }
    return jsonResponse({ data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } });
  });
}

function squadTable() {
  return within(screen.getByRole('table', { name: 'Elenco' }));
}

function cellsOf(playerName: string): string[] {
  const row = squadTable().getByText(playerName).closest('tr') as HTMLElement;
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClubDetailPage', () => {
  it('carrega pela URL direta e mostra cabeçalho e resumo financeiro da API', async () => {
    const fetchMock = mockClubApi(() => jsonResponse(DETAIL));
    renderApp('/clubs/2');

    expect(screen.getByRole('status')).toHaveTextContent('Carregando clube…');
    expect(await screen.findByRole('heading', { level: 1, name: 'Águias FC' })).toBeInTheDocument();
    expect(screen.getByText('Sigla AGU')).toBeInTheDocument();
    expect(screen.getByText('4 de 12 jogadores')).toBeInTheDocument();

    const summary = within(screen.getByRole('list', { name: 'Resumo do clube' }));
    const cards = summary.getAllByRole('listitem').map((card) => card.textContent);
    expect(cards).toEqual([
      'Caixa51,58moedasSó muda por compras e vendas',
      'Valor do elenco222,68moedasSoma dos valores de mercado',
      'Patrimônio274,26moedasCaixa + valor do elenco',
      'Elenco4 de 12Limite de 12 jogadores',
    ]);
    expect(requestsTo(fetchMock, '/clubs/2')).toHaveLength(1);
    expect(
      within(screen.getByRole('navigation', { name: 'Trilha de navegação' })).getByText(
        'Águias FC',
      ),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('mostra o elenco na ordem da API, sem reordenar', async () => {
    mockClubApi(() => jsonResponse(DETAIL));
    renderApp('/clubs/2');
    await screen.findByRole('table', { name: 'Elenco' });

    const names = squadTable()
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['BTBruno Tavares', 'FMFelipe Moura', 'LFLucas Ferraz', 'JSJoão Silva']);
  });

  it('mostra valor de mercado e contrato: compra, fidelidade em Brasília, dias e % de multa', async () => {
    mockClubApi(() => jsonResponse(DETAIL));
    renderApp('/clubs/2');
    await screen.findByRole('table', { name: 'Elenco' });

    expect(
      squadTable()
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Jogador',
      'Posição',
      'Overall',
      'Condição',
      'Valor de mercado',
      'Valor de compra',
      'Fim da fidelidade',
      'Dias restantes',
      '% de multa',
      'Ações',
    ]);
    expect(cellsOf('Felipe Moura')).toEqual([
      'FMFelipe Moura',
      'ZAG',
      '77',
      'Apto',
      '52,00',
      '44,20',
      '04/04/202715:45',
      '144',
      '10%',
      'Vender',
    ]);
    expect(cellsOf('João Silva').slice(4)).toEqual([
      '1.744,14',
      '52,00',
      '04/11/202917:10',
      '1.089',
      '20%',
      'Vender',
    ]);
    expect(cellsOf('Lucas Ferraz').slice(3)).toEqual([
      'Doente',
      '24,00',
      '28,80',
      '07/11/202609:00',
      '0',
      '0%',
      'Vender',
    ]);
    const loyalty = squadTable().getByText('04/04/2027').closest('time');
    expect(loyalty).toHaveAttribute('dateTime', '2027-04-04T15:45:00-03:00');
  });

  it('formata a fidelidade no horário de Brasília e mostra traço sem contrato ativo', async () => {
    mockClubApi(() =>
      jsonResponse({
        ...DETAIL,
        players: [
          makeSquadPlayer({
            contract: {
              purchase_value: 32,
              loyalty_until: '2026-12-11T02:30:00Z',
              remaining_days: 54,
              penalty_rate: 5,
            },
          }),
          makeSquadPlayer({ id: 8, name: 'Diego Ramos', position: 'LAT', contract: null }),
        ],
      }),
    );
    renderApp('/clubs/2');
    await screen.findByRole('table', { name: 'Elenco' });

    expect(cellsOf('Bruno Tavares').slice(6)).toEqual(['10/12/202623:30', '54', '5%', 'Vender']);
    expect(cellsOf('Diego Ramos').slice(5)).toEqual([
      '—Sem contrato ativo',
      '—Sem contrato ativo',
      '—Sem contrato ativo',
      '—Sem contrato ativo',
      'Vender',
    ]);
  });

  it('clube recém-criado: 300,00 / 0,00 / 300,00 e elenco vazio', async () => {
    mockClubApi(() =>
      jsonResponse({
        id: 2,
        name: 'Águias FC',
        acronym: 'AGU',
        cash: 300,
        squad_value: 0,
        net_worth: 300,
        players: [],
      }),
    );
    renderApp('/clubs/2');

    expect(await screen.findByText('Nenhum jogador no elenco')).toBeInTheDocument();
    expect(screen.getByText(/Este clube ainda não possui jogadores\./)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Elenco' })).not.toBeInTheDocument();
    const values = within(screen.getByRole('list', { name: 'Resumo do clube' }))
      .getAllByRole('listitem')
      .map((card) => card.textContent);
    expect(values.slice(0, 3).map((text) => /\d[\d.,]*/.exec(text ?? '')?.[0])).toEqual([
      '300,00',
      '0,00',
      '300,00',
    ]);
    expect(screen.getByText('0 de 12 jogadores')).toBeInTheDocument();
  });

  it('404: mostra o message da API e o caminho de volta para a lista', async () => {
    mockClubApi(() => jsonResponse({ message: 'Clube não encontrado.' }, 404));
    const user = userEvent.setup();
    renderApp('/clubs/99');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Clube não encontrado');
    expect(alert).toHaveTextContent(
      'Clube não encontrado. O endereço pode estar errado ou o clube não existe.',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Trilha de navegação' })).getByText('Clube 99'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Voltar para clubes' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Clubes' })).toBeInTheDocument();
  });

  it('id fora do formato vai para a API, que responde 404', async () => {
    const fetchMock = mockClubApi(() => jsonResponse({ message: 'Recurso não encontrado.' }, 404));
    renderApp('/clubs/abc');

    expect(await screen.findByRole('alert')).toHaveTextContent('Recurso não encontrado.');
    expect(requestsTo(fetchMock, '/clubs/abc')).toHaveLength(1);
  });

  it('falha de rede: mostra o erro (não o elenco vazio) e permite tentar de novo', async () => {
    let calls = 0;
    mockClubApi(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : jsonResponse(DETAIL);
    });
    const user = userEvent.setup();
    renderApp('/clubs/2');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar o clube');
    expect(alert).toHaveTextContent('Não foi possível conectar à API.');
    expect(screen.queryByText('Nenhum jogador no elenco')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Águias FC' })).toBeInTheDocument();
  });

  it('o botão "Atualizar dados" recarrega o clube pela API, sem recarregar a página', async () => {
    const fetchMock = mockClubApi(() => jsonResponse(DETAIL));
    const user = userEvent.setup();
    renderApp('/clubs/2');
    await screen.findByRole('table', { name: 'Elenco' });

    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }));

    await waitFor(() => expect(requestsTo(fetchMock, '/clubs/2')).toHaveLength(2));
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(2);
  });
});
