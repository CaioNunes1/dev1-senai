import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../app/AppRoutes';
import { DataRefreshProvider } from '../../shared/hooks/DataRefreshProvider';
import { jsonResponse, mockApi, requestsTo, urlOf, type FetchMock } from '../../test/fetch-mock';
import type { Player, PlayerPage } from './api';

const CLUBS = [
  { id: 2, name: 'Águias FC', acronym: 'AGU', cash: 51.58, squad_value: 222.68, net_worth: 274.26 },
  { id: 1, name: 'Delta FC', acronym: 'DEL', cash: 300, squad_value: 0, net_worth: 300 },
];

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 2,
    name: 'Meia Lua',
    position: 'MEI',
    agility: 85,
    age: 25,
    condition: 'MAL_CONDICIONADO',
    base_value: 40,
    market_value: 37,
    pace: 70,
    shooting: 68,
    passing: 82,
    dribbling: 79,
    defending: 55,
    physical: 64,
    potential: 86,
    overall: 75,
    club_id: null,
    ...overrides,
  };
}

function pageOf(data: Player[], meta: Partial<PlayerPage['meta']> = {}): PlayerPage {
  const totalItems = meta.total_items ?? data.length;
  return {
    data,
    meta: {
      page: 1,
      limit: 10,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / 10),
      ...meta,
    },
  };
}

/** 23 jogadores, como na tabela de paginação da RN07; a resposta segue a página pedida. */
function paginatedPlayers(url: URL): Response {
  const page = Number(url.searchParams.get('page'));
  const all = Array.from({ length: 23 }, (_, index) =>
    makePlayer({ id: index + 1, name: `Jogador ${String(index + 1).padStart(2, '0')}` }),
  );
  const data = all.slice((page - 1) * 10, page * 10);
  return jsonResponse(pageOf(data, { page, total_items: 23, total_pages: 3 }));
}

function mockPlayersApi(
  respondPlayers: (url: URL, signal: AbortSignal | undefined) => Response | Promise<Response>,
) {
  return mockApi((url, signal) =>
    url.pathname.endsWith('/clubs') ? jsonResponse(CLUBS) : respondPlayers(url, signal),
  );
}

function lastPlayersQuery(fetchMock: FetchMock): Record<string, string> {
  return Object.fromEntries(requestsTo(fetchMock, '/players').at(-1)?.searchParams ?? []);
}

function renderPlayers() {
  return render(
    <MemoryRouter initialEntries={['/players']}>
      <DataRefreshProvider>
        <AppRoutes />
      </DataRefreshProvider>
    </MemoryRouter>,
  );
}

function table() {
  return within(screen.getByRole('table', { name: 'Jogadores' }));
}

async function openRange(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name }));
  return within(screen.getByRole('dialog'));
}

describe('PlayersPage — listagem', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra as 9 colunas obrigatórias com os valores da API, sem recalcular', async () => {
    mockPlayersApi(() =>
      jsonResponse(
        pageOf([
          makePlayer(),
          makePlayer({
            id: 7,
            name: 'João Silva',
            position: 'ATA',
            agility: 30,
            age: 33,
            condition: 'APTO',
            base_value: 52,
            market_value: 46.8,
            overall: 77,
            club_id: 2,
          }),
        ]),
      ),
    );

    renderPlayers();

    await table().findByText('João Silva');
    const rows = table().getAllByRole('row');
    expect(
      within(rows[0])
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Jogador',
      'Posição',
      'Overall',
      'Agilidade',
      'Idade',
      'Condição',
      'Valor base',
      'Valor de mercado',
      'Clube',
    ]);
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent);
    expect(cells(rows[1])).toEqual([
      'MLMeia LuaMeio-campo',
      'MEI',
      '75',
      '85',
      '25',
      'Mal condicionado',
      '40,00',
      '37,00',
      'Livre',
    ]);
    expect(cells(rows[2])).toEqual([
      'JSJoão SilvaAtacante',
      'ATA',
      '77',
      '30',
      '33',
      'Apto',
      '52,00',
      '46,80',
      'AGUÁguias FC',
    ]);
    expect(table().getByRole('link', { name: 'Águias FC' })).toHaveAttribute('href', '/clubs/2');
  });

  it('resolve os clubes pela lista de GET /clubs, sem um pedido por linha', async () => {
    const fetchMock = mockPlayersApi(() =>
      jsonResponse(pageOf([makePlayer({ id: 1, club_id: 1 }), makePlayer({ id: 2, club_id: 2 })])),
    );

    renderPlayers();

    expect(await table().findByRole('link', { name: 'Delta FC' })).toBeInTheDocument();
    expect(table().getByRole('link', { name: 'Águias FC' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(1);
    expect(fetchMock.mock.calls.every(([input]) => !urlOf(input).includes('/clubs/'))).toBe(true);
  });

  it('mostra o total da API, não o tamanho da página', async () => {
    mockPlayersApi(paginatedPlayers);

    renderPlayers();

    expect(await screen.findByText('Mostrando 1–10 de 23 jogadores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Todos/ })).toHaveTextContent('Todos23');
  });

  it('mostra o carregamento enquanto a API não responde', async () => {
    let respond: (response: Response) => void = () => undefined;
    mockPlayersApi(() => new Promise<Response>((resolve) => (respond = resolve)));

    renderPlayers();

    expect(await screen.findByRole('status')).toHaveTextContent('Carregando jogadores…');
    expect(screen.getByRole('table', { name: 'Jogadores' })).toHaveAttribute('aria-busy', 'true');

    respond(jsonResponse(pageOf([makePlayer()])));

    expect(await table().findByText('Meia Lua')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('com o banco vazio, mostra que não há jogadores cadastrados', async () => {
    mockPlayersApi(() => jsonResponse(pageOf([])));

    renderPlayers();

    expect(await screen.findByText('Nenhum jogador cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginação dos jogadores' })).toBeNull();
  });

  it('mostra o message da API no erro e tenta de novo', async () => {
    let calls = 0;
    mockPlayersApi(() => {
      calls += 1;
      return calls === 1
        ? jsonResponse({ message: 'O parâmetro sort aceita até 2 destes valores.' }, 400)
        : jsonResponse(pageOf([makePlayer()]));
    });
    const user = userEvent.setup();
    renderPlayers();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar os jogadores');
    expect(alert).toHaveTextContent('O parâmetro sort aceita até 2 destes valores.');

    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));

    expect(await table().findByText('Meia Lua')).toBeInTheDocument();
  });

  it('distingue falha de conexão de lista vazia', async () => {
    mockPlayersApi(() => Promise.reject(new TypeError('Failed to fetch')));

    renderPlayers();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API.');
    expect(screen.queryByText('Nenhum jogador cadastrado')).not.toBeInTheDocument();
  });
});

describe('PlayersPage — busca e filtros', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('busca pelo nome com acento, num só pedido depois de parar de digitar', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    await user.type(screen.getByRole('searchbox', { name: 'Buscar jogador pelo nome' }), ' João ');

    await waitFor(() => expect(lastPlayersQuery(fetchMock).search).toBe('João'));
    expect(requestsTo(fetchMock, '/players')).toHaveLength(2);
    expect(lastPlayersQuery(fetchMock).page).toBe('1');
  });

  it('com 1 caractere, orienta e não envia a busca', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    await user.type(screen.getByRole('searchbox'), 'a');

    expect(screen.getByText('Digite pelo menos 2 letras para buscar pelo nome.')).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(requestsTo(fetchMock, '/players').every((url) => !url.searchParams.has('search'))).toBe(
      true,
    );
  });

  it.each([
    ['Posição', 'MEI', { position: 'MEI' }, 'Posição: MEI'],
    [
      'Condição',
      'MAL_CONDICIONADO',
      { condition: 'MAL_CONDICIONADO' },
      'Condição: Mal condicionado',
    ],
    ['Clube', '2', { club_id: '2' }, 'Clube: Águias FC'],
  ])(
    'filtro %s envia o parâmetro e aparece nos filtros ativos',
    async (label, option, params, chip) => {
      const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
      const user = userEvent.setup();
      renderPlayers();
      await table().findByText('Meia Lua');
      await screen.findByRole('option', { name: 'Águias FC' });

      await user.selectOptions(screen.getByRole('combobox', { name: label }), option);

      await waitFor(() => expect(lastPlayersQuery(fetchMock)).toMatchObject(params));
      expect(screen.getByRole('button', { name: `Remover filtro ${chip}` })).toBeInTheDocument();
    },
  );

  it('abas de situação enviam free=true, free=false ou nenhum free', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    await user.click(screen.getByRole('button', { name: /^Livres/ }));
    await waitFor(() => expect(lastPlayersQuery(fetchMock).free).toBe('true'));

    await user.click(screen.getByRole('button', { name: /^Em clubes/ }));
    await waitFor(() => expect(lastPlayersQuery(fetchMock).free).toBe('false'));

    await user.click(screen.getByRole('button', { name: /^Todos/ }));
    await waitFor(() => expect(lastPlayersQuery(fetchMock)).not.toHaveProperty('free'));
  });

  it('impede free=true junto com club_id nos dois sentidos', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByRole('option', { name: 'Águias FC' });

    await user.click(screen.getByRole('button', { name: /^Livres/ }));
    expect(screen.getByRole('combobox', { name: 'Clube' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^Todos/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Clube' }), '1');
    expect(screen.getByRole('button', { name: /^Livres/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Em clubes/ })).toBeEnabled();

    await waitFor(() => expect(lastPlayersQuery(fetchMock).club_id).toBe('1'));
    expect(
      requestsTo(fetchMock, '/players').some(
        (url) => url.searchParams.get('free') === 'true' && url.searchParams.has('club_id'),
      ),
    ).toBe(false);
  });

  it('faixa de idade envia min_age e max_age', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    const panel = await openRange(user, /^Idade/);
    await user.type(panel.getByLabelText('Mínimo'), '18');
    await user.type(panel.getByLabelText('Máximo'), '30');
    await user.click(panel.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(lastPlayersQuery(fetchMock)).toMatchObject({ min_age: '18', max_age: '30' }),
    );
    expect(screen.getByRole('button', { name: 'Idade: 18 a 30' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('faixa de idade inválida mostra o erro junto ao campo e não consulta', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');
    const before = requestsTo(fetchMock, '/players').length;

    const panel = await openRange(user, /^Idade/);
    await user.type(panel.getByLabelText('Mínimo'), '15');
    await user.click(panel.getByRole('button', { name: 'Aplicar' }));

    expect(panel.getByLabelText('Mínimo')).toHaveAccessibleDescription(
      'Use um número inteiro de 16 a 45.',
    );

    await user.clear(panel.getByLabelText('Mínimo'));
    await user.type(panel.getByLabelText('Mínimo'), '30');
    await user.type(panel.getByLabelText('Máximo'), '18');
    await user.click(panel.getByRole('button', { name: 'Aplicar' }));

    expect(panel.getByLabelText('Máximo')).toHaveAccessibleDescription(
      'O máximo não pode ser menor que o mínimo.',
    );
    expect(requestsTo(fetchMock, '/players')).toHaveLength(before);
  });

  it('faixa de valor aceita vírgula e envia com ponto', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    const panel = await openRange(user, /^Valor de mercado/);
    await user.type(panel.getByLabelText('Mínimo'), '10,5');
    await user.type(panel.getByLabelText('Máximo'), '60');
    await user.click(panel.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(lastPlayersQuery(fetchMock)).toMatchObject({ min_value: '10.5', max_value: '60' }),
    );
    expect(
      screen.getByRole('button', { name: 'Remover filtro Valor de mercado: 10,50 a 60,00' }),
    ).toBeInTheDocument();
  });

  it('faixa de valor recusa negativo, expoente e mais de 2 casas', async () => {
    mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    for (const text of ['-1', '1e3', '10,555', '551']) {
      const panel = await openRange(user, /^Valor de mercado/);
      await user.type(panel.getByLabelText('Mínimo'), text);
      await user.click(panel.getByRole('button', { name: 'Aplicar' }));
      expect(panel.getByLabelText('Mínimo')).toHaveAccessibleDescription(
        'Use um valor de 0 a 550, com até 2 casas decimais.',
      );
      await user.keyboard('{Escape}');
    }
  });

  it('combina os filtros, remove um pelo chip e limpa todos', async () => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByRole('option', { name: 'Águias FC' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Posição' }), 'MEI');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Condição' }), 'APTO');
    await user.click(screen.getByRole('button', { name: /^Livres/ }));
    const panel = await openRange(user, /^Idade/);
    await user.type(panel.getByLabelText('Mínimo'), '18');
    await user.type(panel.getByLabelText('Máximo'), '30');
    await user.click(panel.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(lastPlayersQuery(fetchMock)).toEqual({
        position: 'MEI',
        condition: 'APTO',
        free: 'true',
        min_age: '18',
        max_age: '30',
        sort: 'name',
        page: '1',
        limit: '10',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Remover filtro Condição: Apto' }));
    await waitFor(() => expect(lastPlayersQuery(fetchMock)).not.toHaveProperty('condition'));

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() =>
      expect(lastPlayersQuery(fetchMock)).toEqual({ sort: 'name', page: '1', limit: '10' }),
    );
    expect(screen.queryByText('Filtros ativos:')).not.toBeInTheDocument();
  });

  it('sem resultados para os filtros, oferece limpar os filtros', async () => {
    const fetchMock = mockPlayersApi((url) =>
      jsonResponse(pageOf(url.searchParams.has('search') ? [] : [makePlayer()])),
    );
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    await user.type(screen.getByRole('searchbox'), 'zzz');

    expect(await screen.findByText('Nenhum jogador encontrado para “zzz”')).toBeInTheDocument();
    const clearButtons = screen.getAllByRole('button', { name: 'Limpar filtros' });
    expect(clearButtons).toHaveLength(2);
    await user.click(clearButtons[1]);

    expect(await table().findByText('Meia Lua')).toBeInTheDocument();
    expect(lastPlayersQuery(fetchMock)).not.toHaveProperty('search');
  });
});

describe('PlayersPage — ordenação', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['Maior valor de mercado', 'value_desc'],
    ['Menor valor de mercado', 'value_asc'],
    ['Maior idade', 'age_desc'],
    ['Menor idade', 'age_asc'],
    ['Posição (GOL a ATA)', 'position'],
    ['Nome', 'name'],
  ])('"%s" envia sort=%s', async (label, sort) => {
    const fetchMock = mockPlayersApi(() => jsonResponse(pageOf([makePlayer()])));
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar por' }),
      screen.getByRole('option', { name: label }),
    );

    await waitFor(() => expect(lastPlayersQuery(fetchMock).sort).toBe(sort));
    expect(lastPlayersQuery(fetchMock).page).toBe('1');
  });
});

describe('PlayersPage — paginação', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('navega pelas páginas com os metadados da API', async () => {
    const fetchMock = mockPlayersApi(paginatedPlayers);
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByText('Mostrando 1–10 de 23 jogadores');

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('button', { name: 'Página 4' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('Mostrando 11–20 de 23 jogadores')).toBeInTheDocument();
    expect(lastPlayersQuery(fetchMock)).toMatchObject({ page: '2', limit: '10' });

    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(await screen.findByText('Mostrando 21–23 de 23 jogadores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByText('Mostrando 11–20 de 23 jogadores')).toBeInTheDocument();
  });

  it('volta para a página 1 quando um filtro muda', async () => {
    const fetchMock = mockPlayersApi(paginatedPlayers);
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByText('Mostrando 1–10 de 23 jogadores');

    await user.click(screen.getByRole('button', { name: 'Página 2' }));
    await screen.findByText('Mostrando 11–20 de 23 jogadores');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Posição' }), 'GOL');

    await waitFor(() =>
      expect(lastPlayersQuery(fetchMock)).toMatchObject({ position: 'GOL', page: '1' }),
    );
  });

  it('limpar os filtros depois de paginar começa na página 1, não na página antiga', async () => {
    const fetchMock = mockPlayersApi(paginatedPlayers);
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByText('Mostrando 1–10 de 23 jogadores');
    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    await screen.findByText('Mostrando 21–23 de 23 jogadores');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Posição' }), 'MEI');
    await waitFor(() => expect(lastPlayersQuery(fetchMock).position).toBe('MEI'));
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(await screen.findByText('Mostrando 1–10 de 23 jogadores')).toBeInTheDocument();
    expect(lastPlayersQuery(fetchMock)).toEqual({ sort: 'name', page: '1', limit: '10' });
  });

  it('página além da última (200 com data vazia) oferece ir para a última', async () => {
    let totalItems = 23;
    mockPlayersApi((url) => {
      const page = Number(url.searchParams.get('page'));
      const totalPages = Math.ceil(totalItems / 10);
      const count = Math.max(0, Math.min(10, totalItems - (page - 1) * 10));
      const data = Array.from({ length: count }, (_, index) =>
        makePlayer({ id: (page - 1) * 10 + index + 1, name: `Jogador ${index}` }),
      );
      return jsonResponse(pageOf(data, { page, total_items: totalItems, total_pages: totalPages }));
    });
    const user = userEvent.setup();
    renderPlayers();
    await screen.findByText('Mostrando 1–10 de 23 jogadores');
    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    await screen.findByText('Mostrando 21–23 de 23 jogadores');

    totalItems = 20;
    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }));

    expect(await screen.findByText('Esta página não tem jogadores')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }));
    expect(await screen.findByText('Mostrando 11–20 de 20 jogadores')).toBeInTheDocument();
  });
});

describe('PlayersPage — concorrência', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resposta atrasada de uma busca antiga não substitui a busca atual', async () => {
    let releaseOld: () => void = () => undefined;
    mockPlayersApi((url) => {
      const search = url.searchParams.get('search');
      if (search === 'lu') {
        return new Promise<Response>((resolve) => {
          releaseOld = () =>
            resolve(jsonResponse(pageOf([makePlayer({ id: 9, name: 'Luana Antiga' })])));
        });
      }
      return jsonResponse(pageOf([makePlayer({ id: 1, name: search ? 'Meia Lua' : 'Sem busca' })]));
    });
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Sem busca');
    const searchbox = screen.getByRole('searchbox');

    await user.type(searchbox, 'lu');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await user.type(searchbox, 'a');

    expect(await table().findByText('Meia Lua')).toBeInTheDocument();
    releaseOld();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('Luana Antiga')).not.toBeInTheDocument();
    expect(table().getByText('Meia Lua')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('pedido cancelado não aparece como erro', async () => {
    mockPlayersApi((url, signal) => {
      if (url.searchParams.get('search') === 'lu') {
        return new Promise<Response>((_, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        });
      }
      return jsonResponse(pageOf([makePlayer()]));
    });
    const user = userEvent.setup();
    renderPlayers();
    await table().findByText('Meia Lua');
    const searchbox = screen.getByRole('searchbox');

    await user.type(searchbox, 'lu');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await user.type(searchbox, 'a');

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(table().getByText('Meia Lua')).toBeInTheDocument();
  });
});
