import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDownloads } from '../../test/download-mock';
import { jsonResponse, mockApi, requestsTo, urlOf, type FetchMock } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { Club, SquadPlayer } from '../clubs/api';
import type { Transaction, TransactionSummary, TransactionType } from './api';

type User = ReturnType<typeof userEvent.setup>;

const CLUBS: Club[] = [
  { id: 1, name: 'Águias FC', acronym: 'AGU', cash: 51.58, squad_value: 222.68, net_worth: 274.26 },
  { id: 2, name: 'Delta FC', acronym: 'DEL', cash: 300, squad_value: 0, net_worth: 300 },
];

const SQUAD: SquadPlayer[] = [
  {
    id: 6,
    name: 'Lucas Ferraz',
    position: 'MEI',
    agility: 60,
    age: 25,
    condition: 'APTO',
    base_value: 28.8,
    market_value: 28.8,
    pace: 60,
    shooting: 60,
    passing: 60,
    dribbling: 60,
    defending: 60,
    physical: 60,
    potential: 70,
    overall: 71,
    club_id: 1,
    contract: null,
  },
];

function tx(
  id: number,
  type: TransactionType,
  playerId: number,
  playerName: string,
  createdAt: string,
  [value, fee, penalty, profit, cashChange]: [number, number, number, number | null, number],
): Transaction {
  return {
    id,
    club_id: 1,
    player_id: playerId,
    player_name: playerName,
    type,
    value,
    fee,
    penalty,
    profit,
    cash_change: cashChange,
    created_at: createdAt,
  };
}

/**
 * Histórico do Águias na ordem da API (mais recente primeiro). Renan Castro (3) foi comprado e
 * vendido; Meia Lua (2) foi comprado como "Meio Lua" (nome do momento) e vendido; Sávio Lima
 * (5) foi excluído depois; a transação 9 vem em UTC (23:30 de 31/10 em Brasília).
 */
const HISTORY: Transaction[] = [
  tx(14, 'COMPRA', 5, 'Sávio Lima', '2026-11-08T11:00:00-03:00', [22.25, 0, 0, null, -22.25]),
  tx(13, 'VENDA', 3, 'Renan Castro', '2026-11-06T08:30:00-03:00', [32.3, 0, 6.46, -5.7, 25.84]),
  tx(12, 'VENDA', 2, 'Meia Lua', '2026-11-05T16:40:00-03:00', [40, 0.3, 4, 3, 35.7]),
  tx(11, 'COMPRA', 3, 'Renan Castro', '2026-11-02T14:00:00-03:00', [38, 1.9, 0, null, -39.9]),
  tx(10, 'COMPRA', 2, 'Meio Lua', '2026-11-02T10:15:00-03:00', [37, 1.85, 0, null, -38.85]),
  tx(9, 'COMPRA', 6, 'Lucas Ferraz', '2026-11-01T02:30:00Z', [28.8, 1.44, 0, null, -30.24]),
];

function summary(
  spent: number,
  received: number,
  fees: number,
  penalties: number,
  profit: number,
): TransactionSummary {
  return {
    total_spent: spent,
    total_received: received,
    total_fees: fees,
    total_penalties: penalties,
    total_profit: profit,
  };
}

const ZERO = summary(0, 0, 0, 0, 0);

/**
 * Totais "da API" por consulta. De propósito, não são a soma das linhas do teste (sem filtro, as
 * compras somam 131,24): a tela tem de mostrar o `summary` recebido, sem somar nada.
 */
const SUMMARIES: Record<string, TransactionSummary> = {
  '': summary(309.96, 61.54, 12.63, 10.46, -2.7),
  '?type=COMPRA': summary(101.11, 0, 5.19, 0, 0),
  '?type=VENDA': summary(0, 61.54, 0.3, 10.46, -2.7),
  '?player_id=2': summary(38.85, 35.7, 2.15, 4, 3),
  '?type=VENDA&player_id=2': summary(0, 35.7, 0.3, 4, 3),
  '?type=COMPRA&player_id=2': summary(38.85, 0, 1.85, 0, 0),
  '?player_id=3': summary(39.9, 25.84, 1.9, 6.46, -5.7),
};

const DELETED_PLAYER = 5;
const CSV_HEADER = 'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa';

/** CSV "do backend" para a consulta: a tela tem de entregar esses bytes sem mexer. */
function csvOf(rows: Transaction[]): string {
  return [
    CSV_HEADER,
    ...rows.map((row) => `${row.created_at};${row.type};"${row.player_name}";${row.value}`),
  ]
    .map((line) => `${line}\n`)
    .join('');
}

type Override = (url: URL) => Response | Promise<Response> | undefined;

/** API falsa do clube: filtra como o backend e devolve `summary` e CSV da mesma consulta. */
function fakeApi(override?: Override) {
  const exported: string[] = [];
  const fetchMock = mockApi(async (url) => {
    const overridden = await override?.(url);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs') {
      return jsonResponse(CLUBS);
    }
    const clubMatch = /^\/clubs\/(\d+)$/.exec(path);
    if (clubMatch) {
      const club = CLUBS.find(({ id }) => id === Number(clubMatch[1]));
      return club
        ? jsonResponse({ ...club, players: club.id === 1 ? SQUAD : [] })
        : jsonResponse({ message: 'Clube não encontrado.' }, 404);
    }
    const historyMatch = /^\/clubs\/(\d+)\/transactions(\/export)?$/.exec(path);
    if (historyMatch) {
      const playerId = url.searchParams.get('player_id');
      if (Number(playerId) === DELETED_PLAYER) {
        return jsonResponse({ message: 'Jogador não encontrado.' }, 404);
      }
      const types = url.searchParams.get('type')?.split(',');
      const rows = (historyMatch[1] === '1' ? HISTORY : []).filter(
        (row) =>
          (types === undefined || types.includes(row.type)) &&
          (playerId === null || row.player_id === Number(playerId)),
      );
      if (historyMatch[2]) {
        const body = csvOf(rows);
        exported.push(body);
        return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      const totals = rows.length === 0 ? ZERO : SUMMARIES[url.search];
      return totals
        ? jsonResponse({ data: rows, summary: totals })
        : jsonResponse({ message: `summary não previsto: ${url.search}` }, 500);
    }
    return jsonResponse({ data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } });
  });
  return { fetchMock, exported };
}

function historyTable() {
  return within(screen.getByRole('table', { name: 'Histórico de transações' }));
}

function rowsOf(): string[][] {
  return historyTable()
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent ?? ''),
    );
}

function totals(): string[] {
  return within(screen.getByRole('list', { name: 'Totais das transações' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

/** Os cinco valores do resumo, na ordem da tela. */
function totalValues(): string[] {
  return totals().map((text) => /[+-]?[\d.]+,\d{2}/.exec(text)?.[0] ?? '');
}

function searches(fetchMock: FetchMock, path = '/clubs/1/transactions'): string[] {
  return requestsTo(fetchMock, path).map((url) => url.search);
}

function playerSelect() {
  return screen.getByRole('combobox', { name: 'Jogador' });
}

async function openHistory(path = '/clubs/1?tab=history') {
  renderApp(path);
  await screen.findByRole('table', { name: 'Histórico de transações' });
  await waitFor(() =>
    expect(screen.getByRole('list', { name: 'Totais das transações' })).toHaveAttribute(
      'aria-busy',
      'false',
    ),
  );
}

async function waitForRows(firstPlayers: string[]) {
  await waitFor(() => expect(rowsOf().map((cells) => cells[2])).toEqual(firstPlayers));
}

let downloads: ReturnType<typeof mockDownloads>;

beforeEach(() => {
  downloads = mockDownloads();
});

afterEach(() => {
  downloads.restore();
  vi.unstubAllGlobals();
});

describe('abas da página do clube', () => {
  it('abre no Elenco, com contagens, Escalação desabilitada e o cabeçalho do clube', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');

    expect(await screen.findByRole('table', { name: 'Elenco' })).toBeInTheDocument();
    const tabs = within(screen.getByRole('tablist', { name: 'Seções do clube' }));
    await waitFor(() =>
      expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Elenco1',
        'EscalaçãoEm breve',
        'Histórico6',
      ]),
    );
    expect(tabs.getByRole('tab', { name: /^Elenco/ })).toHaveAttribute('aria-selected', 'true');
    const lineup = tabs.getByRole('tab', { name: /^Escalação/ });
    expect(lineup).toHaveAttribute('aria-disabled', 'true');
    expect(lineup).toHaveAttribute('title', 'A escalação chega com a etapa da Liga.');

    await user.click(lineup);
    expect(tabs.getByRole('tab', { name: /^Elenco/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /^Elenco/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => urlOf(input).includes('lineup'))).toHaveLength(
      0,
    );
    expect(searches(fetchMock)).toEqual(['']);
  });

  it('troca para o Histórico e volta sem recarregar o clube, mantendo cabeçalho e resumo', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    await screen.findByRole('table', { name: 'Elenco' });

    await user.click(screen.getByRole('tab', { name: /^Histórico/ }));

    expect(
      await screen.findByRole('table', { name: 'Histórico de transações' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: /^Histórico/ })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Elenco' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Águias FC' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Resumo do clube' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Elenco/ }));
    expect(await screen.findByRole('table', { name: 'Elenco' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/clubs/1')).toHaveLength(1);
    expect(searches(fetchMock)).toEqual(['']);
  });

  it('teclado: setas, Home e End trocam de aba e pulam a Escalação', async () => {
    fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/1');
    await screen.findByRole('table', { name: 'Elenco' });

    await user.tab();
    while (document.activeElement?.getAttribute('role') !== 'tab') {
      await user.tab();
    }
    expect(screen.getByRole('tab', { name: /^Elenco/ })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /^Histórico/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /^Histórico/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /^Elenco/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /^Histórico/ })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /^Elenco/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /^Histórico/ })).toHaveFocus();
  });

  it('os filtros continuam ao voltar ao Histórico; outro clube pelo menu começa sem filtros', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await waitForRows(['RCRenan Castro', 'MLMeia Lua']);
    await user.click(screen.getByRole('tab', { name: /^Elenco/ }));
    await user.click(await screen.findByRole('tab', { name: /^Histórico/ }));

    await waitForRows(['RCRenan Castro', 'MLMeia Lua']);
    expect(screen.getByRole('checkbox', { name: 'Compra' })).not.toBeChecked();

    await user.click(
      within(screen.getByRole('region', { name: 'Clubes' })).getByRole('link', {
        name: /Delta FC/,
      }),
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Delta FC' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Elenco/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(searches(fetchMock, '/clubs/2/transactions')).toEqual(['']));
  });
});

describe('tabela do histórico (F09)', () => {
  it('mostra as 8 colunas, na ordem da API, com o nome e os valores do momento', async () => {
    const { fetchMock } = fakeApi();
    await openHistory();

    expect(
      historyTable()
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Data e hora',
      'Tipo',
      'Jogador',
      'Valor',
      'Taxa ou comissão',
      'Multa',
      'Lucro',
      'Variação do caixa',
    ]);
    expect(rowsOf()).toEqual([
      [
        '08/11/202611:00',
        'Compra',
        'SLSávio Lima',
        '22,25',
        '0,00',
        '0,00',
        '–Não se aplica',
        '-22,25',
      ],
      ['06/11/202608:30', 'Venda', 'RCRenan Castro', '32,30', '0,00', '6,46', '-5,70', '+25,84'],
      ['05/11/202616:40', 'Venda', 'MLMeia Lua', '40,00', '0,30', '4,00', '+3,00', '+35,70'],
      [
        '02/11/202614:00',
        'Compra',
        'RCRenan Castro',
        '38,00',
        '1,90',
        '0,00',
        '–Não se aplica',
        '-39,90',
      ],
      [
        '02/11/202610:15',
        'Compra',
        'MLMeio Lua',
        '37,00',
        '1,85',
        '0,00',
        '–Não se aplica',
        '-38,85',
      ],
      [
        '31/10/202623:30',
        'Compra',
        'LFLucas Ferraz',
        '28,80',
        '1,44',
        '0,00',
        '–Não se aplica',
        '-30,24',
      ],
    ]);
    expect(historyTable().getByText('31/10/2026').closest('time')).toHaveAttribute(
      'dateTime',
      '2026-11-01T02:30:00Z',
    );
    expect(
      fetchMock.mock.calls.filter(([input]) => /\/players\/\d+/.test(urlOf(input))),
    ).toHaveLength(0);
  });

  it('crédito em verde e débito em vermelho, com o sinal no texto', async () => {
    fakeApi();
    await openHistory();

    expect(historyTable().getByText('+25,84')).toHaveClass('text-success');
    expect(historyTable().getByText('-22,25')).toHaveClass('text-destructive');
    expect(historyTable().getByText('+3,00')).toHaveClass('text-success');
    expect(historyTable().getByText('-5,70')).toHaveClass('text-destructive');
  });
});

describe('resumo financeiro (F10)', () => {
  it('mostra os cinco totais do summary da API abaixo da tabela, sem somar as linhas', async () => {
    fakeApi();
    await openHistory();

    expect(totals()).toEqual([
      'Total pago em compras309,96Valor + taxa',
      'Total recebido em vendas61,54Crédito líquido',
      'Taxas e comissões12,63Somadas',
      'Multas10,46Por fidelidade',
      'Lucro total-2,70Soma dos lucros, com sinal',
    ]);
    expect(screen.getByText('-2,70')).toHaveClass('text-destructive');
    const table = screen.getByRole('table', { name: 'Histórico de transações' });
    const list = screen.getByRole('list', { name: 'Totais das transações' });
    expect(table.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lucro total positivo leva o sinal +', async () => {
    fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.selectOptions(playerSelect(), '2');

    await waitFor(() => expect(totalValues()).toEqual(['38,85', '35,70', '2,15', '4,00', '+3,00']));
    expect(screen.getByText('+3,00', { selector: 'p' })).toHaveClass('text-success');
  });
});

describe('filtros (tipo e jogador)', () => {
  it('sem filtro: a consulta vai sem parâmetros e "Limpar filtros" não aparece', async () => {
    const { fetchMock } = fakeApi();
    await openHistory();

    expect(searches(fetchMock)).toEqual(['']);
    expect(screen.getByRole('checkbox', { name: 'Compra' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Venda' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('só vendas e só compras: tabela e totais da consulta filtrada; o último tipo não desmarca', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await waitForRows(['RCRenan Castro', 'MLMeia Lua']);
    expect(totalValues()).toEqual(['0,00', '61,54', '0,30', '10,46', '-2,70']);
    expect(screen.getByRole('checkbox', { name: 'Venda' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.click(screen.getByRole('checkbox', { name: 'Venda' }));
    await waitForRows(['SLSávio Lima', 'RCRenan Castro', 'MLMeio Lua', 'LFLucas Ferraz']);
    expect(totalValues()).toEqual(['101,11', '0,00', '5,19', '0,00', '0,00']);

    await user.click(screen.getByRole('checkbox', { name: 'Venda' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(6));
    expect(searches(fetchMock)).toEqual(['', '?type=VENDA', '?type=COMPRA']);
  });

  it('jogador: opções do histórico (inclusive vendido e excluído) e consulta por player_id', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    expect(
      within(playerSelect())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Todos os jogadores', 'Lucas Ferraz', 'Meia Lua', 'Renan Castro', 'Sávio Lima']);

    await user.selectOptions(playerSelect(), '3');

    await waitForRows(['RCRenan Castro', 'RCRenan Castro']);
    expect(totalValues()).toEqual(['39,90', '25,84', '1,90', '6,46', '-5,70']);
    expect(screen.getByText('Jogador: Renan Castro')).toBeInTheDocument();
    expect(searches(fetchMock).at(-1)).toBe('?player_id=3');
  });

  it('combina tipo e jogador, preservando um filtro ao mudar o outro', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.selectOptions(playerSelect(), '2');
    await waitForRows(['MLMeia Lua']);
    expect(totalValues()).toEqual(['0,00', '35,70', '0,30', '4,00', '+3,00']);

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.click(screen.getByRole('checkbox', { name: 'Venda' }));
    await waitForRows(['MLMeio Lua']);
    expect(totalValues()).toEqual(['38,85', '0,00', '1,85', '0,00', '0,00']);
    expect(playerSelect()).toHaveValue('2');

    expect(searches(fetchMock).slice(-3)).toEqual([
      '?type=VENDA&player_id=2',
      '?player_id=2',
      '?type=COMPRA&player_id=2',
    ]);
  });

  it('"Limpar filtros" volta ao histórico completo, sem nova consulta', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();
    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.selectOptions(playerSelect(), '2');
    await waitForRows(['MLMeia Lua']);
    const before = searches(fetchMock).length;

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => expect(rowsOf()).toHaveLength(6));
    expect(totalValues()).toEqual(['309,96', '61,54', '12,63', '10,46', '-2,70']);
    expect(playerSelect()).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Compra' })).toBeChecked();
    expect(searches(fetchMock)).toHaveLength(before);
  });

  it('jogador excluído: 404 com o message, sem tabela nem totais; dá para limpar', async () => {
    fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.selectOptions(playerSelect(), String(DELETED_PLAYER));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O filtro foi recusado');
    expect(alert).toHaveTextContent('Jogador não encontrado.');
    expect(
      screen.queryByRole('table', { name: 'Histórico de transações' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Totais das transações' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma transação com esses filtros')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(6));
  });

  it('400: mostra o message da API e mantém os filtros para corrigir', async () => {
    fakeApi((url) =>
      url.search === '?type=VENDA'
        ? jsonResponse({ message: 'O parâmetro type deve ter COMPRA e/ou VENDA.' }, 400)
        : undefined,
    );
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O parâmetro type deve ter COMPRA e/ou VENDA.',
    );
    expect(screen.getByRole('checkbox', { name: 'Compra' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(6));
  });

  it('filtros sem resultado: mensagem própria, totais zerados da API e limpar', async () => {
    fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.selectOptions(playerSelect(), '6');

    expect(await screen.findByText('Nenhuma transação com esses filtros')).toBeInTheDocument();
    expect(totalValues()).toEqual(['0,00', '0,00', '0,00', '0,00', '0,00']);
    await user.click(
      screen.getAllByRole('button', { name: 'Limpar filtros' }).at(-1) as HTMLElement,
    );
    await waitFor(() => expect(rowsOf()).toHaveLength(6));
  });

  it('mudança rápida: a resposta atrasada do filtro anterior não substitui a atual', async () => {
    let releaseSlow: () => void = () => undefined;
    const slow = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    fakeApi((url) =>
      url.pathname.endsWith('/transactions') && url.search === '?type=VENDA'
        ? slow.then(() => jsonResponse({ data: [HISTORY[1]], summary: summary(1, 1, 1, 1, 1) }))
        : undefined,
    );
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.selectOptions(playerSelect(), '2');
    await waitForRows(['MLMeia Lua']);
    releaseSlow();
    await slow;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(rowsOf().map((cells) => cells[2])).toEqual(['MLMeia Lua']);
    expect(totalValues()).toEqual(['0,00', '35,70', '0,30', '4,00', '+3,00']);
  });

  it('"Atualizar dados" consulta de novo o histórico filtrado e o completo', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory('/clubs/1?tab=history&type=VENDA');
    await waitForRows(['RCRenan Castro', 'MLMeia Lua']);

    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }));

    await waitFor(() => expect(searches(fetchMock)).toHaveLength(4));
    expect([...searches(fetchMock)].sort()).toEqual(['', '', '?type=VENDA', '?type=VENDA']);
  });
});

describe('estados', () => {
  it('clube sem transações: "Nenhuma transação ainda", totais zerados e contagem 0', async () => {
    fakeApi();
    renderApp('/clubs/2?tab=history');

    expect(await screen.findByText('Nenhuma transação ainda')).toBeInTheDocument();
    expect(totalValues()).toEqual(['0,00', '0,00', '0,00', '0,00', '0,00']);
    expect(screen.getByRole('tab', { name: /^Histórico/ })).toHaveTextContent('Histórico0');
  });

  it('falha ao carregar: erro com o message, sem totais e sem exportar; tentar de novo', async () => {
    let failing = true;
    fakeApi((url) =>
      failing && url.pathname.endsWith('/transactions')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/clubs/1?tab=history');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar o histórico');
    expect(alert).toHaveTextContent('Não foi possível conectar à API.');
    expect(screen.queryByRole('list', { name: 'Totais das transações' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();

    failing = false;
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(6));
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeEnabled();
  });
});

describe('exportação CSV (F11)', () => {
  async function exportCsv(user: User) {
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
  }

  it('sem filtros: baixa o arquivo da API, com os mesmos bytes, e avisa', async () => {
    const { fetchMock, exported } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await exportCsv(user);

    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(searches(fetchMock, '/clubs/1/transactions/export')).toEqual(['']);
    const [{ name, file }] = downloads.saved;
    expect(name).toBe('historico-clube-1.csv');
    expect(await file.text()).toBe(exported[0]);
    expect(exported[0]).toContain('"Sávio Lima"');
    expect(await screen.findByText('CSV baixado')).toBeInTheDocument();
    expect(screen.getByText('historico-clube-1.csv, sem filtros.')).toBeInTheDocument();
    await waitFor(() => expect(downloads.revoked).toHaveLength(1));
  });

  it('usa exatamente os filtros da tabela: tipo, jogador e os dois', async () => {
    const { fetchMock } = fakeApi();
    const user = userEvent.setup();
    await openHistory();

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await waitForRows(['RCRenan Castro', 'MLMeia Lua']);
    await exportCsv(user);
    await waitFor(() => expect(downloads.saved).toHaveLength(1));

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await user.selectOptions(playerSelect(), '2');
    await waitForRows(['MLMeia Lua', 'MLMeio Lua']);
    await exportCsv(user);
    await waitFor(() => expect(downloads.saved).toHaveLength(2));

    await user.click(screen.getByRole('checkbox', { name: 'Compra' }));
    await waitForRows(['MLMeia Lua']);
    await exportCsv(user);
    await waitFor(() => expect(downloads.saved).toHaveLength(3));

    expect(searches(fetchMock, '/clubs/1/transactions/export')).toEqual([
      '?type=VENDA',
      '?player_id=2',
      '?type=VENDA&player_id=2',
    ]);
    expect(
      await screen.findByText('historico-clube-1.csv, com tipo Venda e jogador Meia Lua.'),
    ).toBeInTheDocument();
    expect(await downloads.saved[2].file.text()).toBe(
      `${CSV_HEADER}\n${HISTORY[2].created_at};VENDA;"Meia Lua";40\n`,
    );
  });

  it('histórico vazio: baixa o CSV só com o cabeçalho, sem erro', async () => {
    fakeApi();
    const user = userEvent.setup();
    renderApp('/clubs/2?tab=history');
    await screen.findByText('Nenhuma transação ainda');

    await exportCsv(user);

    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(await downloads.saved[0].file.text()).toBe(`${CSV_HEADER}\n`);
    expect(downloads.saved[0].name).toBe('historico-clube-2.csv');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    [400, 'O parâmetro type deve ter COMPRA e/ou VENDA.'],
    [404, 'Jogador não encontrado.'],
  ])(
    'recusa %i em JSON: mostra o message, não baixa nada e deixa tentar de novo',
    async (status, message) => {
      let refuse = true;
      const { fetchMock } = fakeApi((url) =>
        refuse && url.pathname.endsWith('/export') ? jsonResponse({ message }, status) : undefined,
      );
      const user = userEvent.setup();
      await openHistory();

      await exportCsv(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível exportar o CSV');
      expect(alert).toHaveTextContent(message);
      expect(downloads.saved).toHaveLength(0);
      expect(screen.queryByText('CSV baixado')).not.toBeInTheDocument();

      refuse = false;
      await exportCsv(user);
      await waitFor(() => expect(downloads.saved).toHaveLength(1));
      expect(screen.queryByText('Não foi possível exportar o CSV')).not.toBeInTheDocument();
      expect(searches(fetchMock, '/clubs/1/transactions/export')).toHaveLength(2);
    },
  );

  it('durante o download o botão fica desabilitado, e o clique duplo faz um só pedido', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { fetchMock } = fakeApi((url) =>
      url.pathname.endsWith('/export')
        ? pending.then(
            () =>
              new Response(`${CSV_HEADER}\n`, {
                headers: { 'Content-Type': 'text/csv; charset=utf-8' },
              }),
          )
        : undefined,
    );
    const user = userEvent.setup();
    await openHistory();

    await user.dblClick(screen.getByRole('button', { name: 'Exportar CSV' }));

    expect(await screen.findByRole('button', { name: 'Exportando…' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Compra' })).toBeEnabled();
    release();
    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeEnabled();
    expect(searches(fetchMock, '/clubs/1/transactions/export')).toHaveLength(1);
  });
});
