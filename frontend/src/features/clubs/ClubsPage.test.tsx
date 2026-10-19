import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  jsonResponse,
  mockApi,
  requestsTo,
  writesTo,
  type ApiRequest,
} from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import type { Club, CreateClubBody } from './api';

type User = ReturnType<typeof userEvent.setup>;

function makeClub(id: number, name: string, acronym: string, cash = 300, squadValue = 0): Club {
  return {
    id,
    name,
    acronym,
    cash,
    squad_value: squadValue,
    net_worth: Math.round((cash + squadValue) * 100) / 100,
  };
}

const AGUIAS = makeClub(2, 'Águias FC', 'AGU', 51.58, 222.68);
const DELTA = makeClub(5, 'Delta FC', 'DEL', 91.85, 200.76);
const TUBAROES = makeClub(1, 'Tubarões EC', 'TUB');

const EMPTY_PAGE = { data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } };

type Override = (url: URL, request: ApiRequest) => Response | Promise<Response> | undefined;

/** Ordem por nome como a API: sem acento e sem diferenciar maiúsculas. */
function byName(first: Club, second: Club): number {
  const key = (club: Club) =>
    club.name
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase();
  return key(first) < key(second) ? -1 : 1;
}

/**
 * API falsa com estado, como o backend: `GET /clubs` ordenado (nome ou patrimônio),
 * `POST /clubs` com 201 e caixa de 300,00 ou 409 (nome, sigla, limite de 20).
 */
function fakeApi(initial: Club[], override?: Override) {
  let clubs = [...initial];
  let nextId = 100;
  return mockApi((url, _signal, request) => {
    const overridden = override?.(url, request);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/clubs' && request.method === 'GET') {
      const sort = url.searchParams.get('sort') ?? 'name';
      const sorted = [...clubs].sort(byName);
      if (sort === 'net_worth_desc') {
        sorted.sort((first, second) => second.net_worth - first.net_worth);
      } else if (sort === 'net_worth_asc') {
        sorted.sort((first, second) => first.net_worth - second.net_worth);
      }
      return jsonResponse(sorted);
    }
    if (path === '/clubs' && request.method === 'POST') {
      const { name, acronym } = request.body as CreateClubBody;
      if (clubs.length >= 20) {
        return jsonResponse({ message: 'A liga já tem o máximo de 20 clubes.' }, 409);
      }
      if (clubs.some((club) => club.name.toLowerCase() === name.toLowerCase())) {
        return jsonResponse({ message: `Já existe um clube com o nome "${name}".` }, 409);
      }
      if (clubs.some((club) => club.acronym === acronym)) {
        return jsonResponse({ message: `Já existe um clube com a sigla ${acronym}.` }, 409);
      }
      nextId += 1;
      const created = makeClub(nextId, name, acronym);
      clubs = [...clubs, created];
      return jsonResponse(created, 201);
    }
    const club = clubs.find(({ id }) => path === `/clubs/${id}`);
    if (club) {
      return jsonResponse({ ...club, players: [] });
    }
    if (path.startsWith('/clubs/')) {
      return jsonResponse({ message: 'Clube não encontrado.' }, 404);
    }
    return jsonResponse(EMPTY_PAGE);
  });
}

function clubsTable() {
  return within(screen.getByRole('table', { name: 'Clubes' }));
}

/** Nomes das linhas, na ordem em que aparecem na tabela. */
async function rowNames(): Promise<string[]> {
  const links = await clubsTable().findAllByRole('link', { name: /^Ver clube / });
  return links.map((link) => (link.getAttribute('aria-label') ?? '').replace('Ver clube ', ''));
}

function sidebarClubs() {
  return within(screen.getByRole('region', { name: 'Clubes' }));
}

function dialog() {
  return within(screen.getByRole('dialog', { name: 'Novo clube' }));
}

async function fillClub(user: User, name: string, acronym: string) {
  await user.click(screen.getByRole('button', { name: 'Novo clube' }));
  if (name) {
    await user.type(dialog().getByLabelText(/^Nome/), name);
  }
  if (acronym) {
    await user.type(dialog().getByLabelText(/^Sigla/), acronym);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClubsPage — listagem', () => {
  it('mostra as 5 colunas com os valores da API formatados, sem paginação', async () => {
    const fetchMock = fakeApi([AGUIAS, DELTA, TUBAROES]);
    renderApp('/clubs');

    expect(await rowNames()).toEqual(['Águias FC', 'Delta FC', 'Tubarões EC']);
    const headers = clubsTable()
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      'Clube',
      'Sigla',
      'Caixa',
      'Valor do elenco',
      'Patrimônio',
      'Detalhes',
    ]);

    const aguias = clubsTable().getAllByRole('row')[1];
    expect(
      within(aguias)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['AGUÁguias FC', 'AGU', '51,58', '222,68', '274,26', 'Ver clube']);
    const tubaroes = clubsTable().getAllByRole('row')[3];
    expect(within(tubaroes).getAllByRole('cell')[3]).toHaveTextContent('0,00');

    expect(screen.getByText('3 clubes')).toBeInTheDocument();
    expect(screen.getByText('3 de 20')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /Paginação/ })).not.toBeInTheDocument();
    const [listRequest] = requestsTo(fetchMock, '/clubs');
    expect([...listRequest.searchParams.keys()]).toEqual([]);
  });

  it('por nome (padrão), reaproveita a consulta do menu: um só GET /clubs', async () => {
    const fetchMock = fakeApi([AGUIAS, DELTA]);
    renderApp('/clubs');

    await rowNames();

    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('name');
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(1);
  });

  it('ordena por patrimônio pela API e mostra as linhas na ordem da resposta', async () => {
    const fetchMock = fakeApi([AGUIAS, DELTA, TUBAROES]);
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar por' }),
      'net_worth_desc',
    );
    await waitFor(async () =>
      expect(await rowNames()).toEqual(['Tubarões EC', 'Delta FC', 'Águias FC']),
    );
    expect(screen.getByText('Ordenar: patrimônio (maior para o menor)')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar por' }),
      'net_worth_asc',
    );
    await waitFor(async () =>
      expect(await rowNames()).toEqual(['Águias FC', 'Delta FC', 'Tubarões EC']),
    );

    const sorts = requestsTo(fetchMock, '/clubs').map((url) => url.searchParams.get('sort'));
    expect(sorts).toEqual([null, 'net_worth_desc', 'net_worth_asc']);
  });

  it('não reordena: mostra a lista exatamente na ordem devolvida pela API', async () => {
    fakeApi([], (url) =>
      url.pathname.endsWith('/clubs') ? jsonResponse([TUBAROES, AGUIAS, DELTA]) : undefined,
    );
    renderApp('/clubs');

    expect(await rowNames()).toEqual(['Tubarões EC', 'Águias FC', 'Delta FC']);
  });

  it('abre a ordenação pela URL (?sort=) e volta a ela depois de ver um clube', async () => {
    const fetchMock = fakeApi([AGUIAS, DELTA, TUBAROES]);
    const user = userEvent.setup();
    renderApp('/clubs?sort=net_worth_desc');

    expect(await rowNames()).toEqual(['Tubarões EC', 'Delta FC', 'Águias FC']);
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('net_worth_desc');
    expect(requestsTo(fetchMock, '/clubs').map((url) => url.searchParams.get('sort'))).toContain(
      'net_worth_desc',
    );

    await user.click(clubsTable().getByRole('link', { name: 'Ver clube Delta FC' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Delta FC' })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('navigation', { name: 'Trilha de navegação' })).getByRole('link', {
        name: 'Clubes',
      }),
    );
    expect(await rowNames()).toEqual(['Águias FC', 'Delta FC', 'Tubarões EC']);
  });

  it('mostra o estado vazio com o botão de criar o primeiro clube', async () => {
    fakeApi([]);
    const user = userEvent.setup();
    renderApp('/clubs');

    expect(await screen.findByText('Nenhum clube cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(sidebarClubs().getByText('Nenhum clube cadastrado.')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: 'Novo clube' });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);
    expect(screen.getByRole('dialog', { name: 'Novo clube' })).toBeInTheDocument();
  });

  it('mostra carregando e, na falha de rede, o erro com "Tentar de novo"', async () => {
    let fail = true;
    let release: () => void = () => undefined;
    const fetchMock = fakeApi([AGUIAS], (url) => {
      if (!url.pathname.endsWith('/clubs')) {
        return undefined;
      }
      if (fail) {
        return new Promise<Response>((_resolve, reject) => {
          release = () => reject(new TypeError('Failed to fetch'));
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/clubs');

    expect(
      await within(screen.getByRole('main')).findByText('Carregando clubes…'),
    ).toBeInTheDocument();
    fail = false;
    release();

    const errorBlock = await screen.findByText('Não foi possível carregar os clubes');
    expect(errorBlock.parentElement).toHaveTextContent('Não foi possível conectar à API.');

    await user.click(
      within(errorBlock.parentElement as HTMLElement).getByRole('button', {
        name: 'Tentar de novo',
      }),
    );
    expect(await rowNames()).toEqual(['Águias FC']);
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(2);
  });
});

describe('ClubsPage — cadastro', () => {
  it('valida os campos antes de enviar (obrigatórios, nome e sigla)', async () => {
    const fetchMock = fakeApi([AGUIAS]);
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();

    await fillClub(user, '', '');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));
    expect(dialog().getByLabelText(/^Nome/)).toHaveAccessibleDescription(
      expect.stringContaining('Informe o nome do clube.'),
    );
    expect(dialog().getByLabelText(/^Sigla/)).toHaveAccessibleDescription(
      expect.stringContaining('Informe a sigla.'),
    );

    await user.type(dialog().getByLabelText(/^Nome/), 'Leões 2 Serra');
    await user.type(dialog().getByLabelText(/^Sigla/), 'L1S');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));
    expect(
      await dialog().findByText('Use só letras, espaços, hífen e ponto (sem números).'),
    ).toBeInTheDocument();
    expect(
      dialog().getByText('Use exatamente 3 letras maiúsculas de A a Z, sem acento.'),
    ).toBeInTheDocument();

    await user.clear(dialog().getByLabelText(/^Nome/));
    await user.type(dialog().getByLabelText(/^Nome/), 'Leões da Serra');
    await user.clear(dialog().getByLabelText(/^Sigla/));
    await user.type(dialog().getByLabelText(/^Sigla/), 'SDL');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));
    expect(
      await dialog().findByText(
        'A sigla deve começar pela primeira letra do nome e usar letras do nome, nessa ordem.',
      ),
    ).toBeInTheDocument();

    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('envia só name e acronym (nome com acentos, espaços normalizados) e atualiza lista e menu', async () => {
    const fetchMock = fakeApi([AGUIAS, TUBAROES]);
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();
    const listsBefore = requestsTo(fetchMock, '/clubs').length;

    await fillClub(user, '  Leões   da Serra ', 'LDS');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

    expect(await screen.findByText('Clube criado')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      { method: 'POST', path: '/clubs', body: { name: 'Leões da Serra', acronym: 'LDS' } },
    ]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(async () =>
      expect(await rowNames()).toEqual(['Águias FC', 'Leões da Serra', 'Tubarões EC']),
    );
    expect(sidebarClubs().getByRole('link', { name: /Leões da Serra/ })).toHaveAttribute(
      'href',
      '/clubs/101',
    );
    expect(screen.getByText('3 de 20')).toBeInTheDocument();
    const created = clubsTable().getAllByRole('row')[2];
    expect(created).toHaveClass('bg-primary-soft');
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(listsBefore + 1);
  });

  it('mostra no aviso o caixa, o valor do elenco e o patrimônio devolvidos pela API', async () => {
    fakeApi([AGUIAS], (url, request) =>
      url.pathname.endsWith('/clubs') && request.method === 'POST'
        ? jsonResponse(makeClub(9, 'Leões da Serra', 'LDS', 300, 0), 201)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();

    await fillClub(user, 'Leões da Serra', 'LDS');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

    expect(await screen.findByText(/Leões da Serra \(LDS\) começa com/)).toHaveTextContent(
      'Leões da Serra (LDS) começa com 300,00 em caixa, valor do elenco de 0,00 e patrimônio de 300,00.',
    );
  });

  it('com a ordenação por patrimônio, recarrega pela API e mostra o novo clube na posição dela', async () => {
    const fetchMock = fakeApi([AGUIAS, DELTA]);
    const user = userEvent.setup();
    renderApp('/clubs?sort=net_worth_asc');
    expect(await rowNames()).toEqual(['Águias FC', 'Delta FC']);

    await fillClub(user, 'Leões da Serra', 'LDS');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

    await waitFor(async () =>
      expect(await rowNames()).toEqual(['Águias FC', 'Delta FC', 'Leões da Serra']),
    );
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('net_worth_asc');
    expect(requestsTo(fetchMock, '/clubs').map((url) => url.searchParams.get('sort'))).toContain(
      'net_worth_asc',
    );
    expect(sidebarClubs().getByRole('link', { name: /Leões da Serra/ })).toBeInTheDocument();
  });

  it('bloqueia o envio duplo: dois cliques mandam um só POST', async () => {
    let respond: () => void = () => undefined;
    const fetchMock = fakeApi([AGUIAS], (url, request) =>
      url.pathname.endsWith('/clubs') && request.method === 'POST'
        ? new Promise<Response>((resolve) => {
            respond = () => resolve(jsonResponse(makeClub(9, 'Leões da Serra', 'LDS'), 201));
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();

    await fillClub(user, 'Leões da Serra', 'LDS');
    await user.dblClick(dialog().getByRole('button', { name: 'Criar clube' }));
    expect(dialog().getByRole('button', { name: 'Criando…' })).toBeDisabled();
    respond();

    expect(await screen.findByText('Clube criado')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it.each([
    [
      'nome repetido (sem diferenciar maiúsculas)',
      'águias fc',
      'AFC',
      'Já existe um clube com o nome "águias fc".',
    ],
    ['sigla repetida', 'Arara Gaúcha', 'AGU', 'Já existe um clube com a sigla AGU.'],
  ])(
    '409 por %s: mostra o message da API, mantém os dados e permite corrigir',
    async (_case, name, acronym, message) => {
      const fetchMock = fakeApi([AGUIAS]);
      const user = userEvent.setup();
      renderApp('/clubs');
      await rowNames();

      await fillClub(user, name, acronym);
      await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

      const alert = await dialog().findByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível criar o clube');
      expect(alert).toHaveTextContent(message);
      expect(dialog().getByLabelText(/^Nome/)).toHaveValue(name);
      expect(dialog().getByLabelText(/^Sigla/)).toHaveValue(acronym);
      expect(screen.queryByText('Clube criado')).not.toBeInTheDocument();

      await user.clear(dialog().getByLabelText(/^Nome/));
      await user.type(dialog().getByLabelText(/^Nome/), 'Leões da Serra');
      await user.clear(dialog().getByLabelText(/^Sigla/));
      await user.type(dialog().getByLabelText(/^Sigla/), 'LDS');
      await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

      expect(await screen.findByText('Clube criado')).toBeInTheDocument();
      expect(writesTo(fetchMock)).toHaveLength(2);
    },
  );

  it('com 20 clubes, avisa no diálogo e mostra o 409 do limite devolvido pela API', async () => {
    const twenty = Array.from({ length: 20 }, (_, index) =>
      makeClub(
        index + 1,
        `Clube ${String.fromCharCode(65 + index)}a FC`,
        `C${String.fromCharCode(65 + index)}F`,
      ),
    );
    const fetchMock = fakeApi(twenty);
    const user = userEvent.setup();
    renderApp('/clubs');
    expect(await screen.findByText('20 de 20')).toBeInTheDocument();

    await fillClub(user, 'Leões da Serra', 'LDS');
    expect(dialog().getByText('A liga já tem 20 clubes')).toBeInTheDocument();
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));

    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'A liga já tem o máximo de 20 clubes.',
    );
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it('400 da API e falha de rede: mostra o motivo, sem falso sucesso', async () => {
    let attempt = 0;
    fakeApi([AGUIAS], (url, request) => {
      if (!url.pathname.endsWith('/clubs') || request.method !== 'POST') {
        return undefined;
      }
      attempt += 1;
      if (attempt === 1) {
        return jsonResponse(
          { message: 'O nome do clube aceita só letras, espaços, hífen e ponto.' },
          400,
        );
      }
      return Promise.reject(new TypeError('Failed to fetch'));
    });
    const user = userEvent.setup();
    renderApp('/clubs');
    await rowNames();

    await fillClub(user, 'Leões da Serra', 'LDS');
    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'O nome do clube aceita só letras, espaços, hífen e ponto.',
    );

    await user.click(dialog().getByRole('button', { name: 'Criar clube' }));
    await waitFor(() =>
      expect(dialog().getByRole('alert')).toHaveTextContent('Não foi possível conectar à API.'),
    );
    expect(screen.queryByText('Clube criado')).not.toBeInTheDocument();
    expect(await rowNames()).toEqual(['Águias FC']);
  });
});
