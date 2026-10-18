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
import type { Player } from './api';

type User = ReturnType<typeof userEvent.setup>;

const CLUBS = [
  { id: 2, name: 'Águias FC', acronym: 'AGU', cash: 51.58, squad_value: 222.68, net_worth: 274.26 },
];

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: 'Ícaro Mendes',
    position: 'ATA',
    agility: 12,
    age: 40,
    condition: 'APTO',
    base_value: 24,
    market_value: 21.6,
    pace: 55,
    shooting: 74,
    passing: 60,
    dribbling: 62,
    defending: 30,
    physical: 66,
    potential: 74,
    overall: 67,
    club_id: null,
    ...overrides,
  };
}

const FREE = makePlayer();
const SICK = makePlayer({
  id: 2,
  name: 'Ênio Carvalho',
  position: 'LAT',
  age: 18,
  condition: 'DOENTE',
  agility: 83,
  market_value: 23.69,
});
const IN_CLUB = makePlayer({
  id: 3,
  name: 'Felipe Moura',
  position: 'ZAG',
  age: 27,
  club_id: 2,
  market_value: 52,
});

type Override = (url: URL, request: ApiRequest) => Response | Promise<Response> | undefined;

/**
 * API falsa com estado, como o backend: lista paginada de 10, cadastro devolve 201 com os
 * valores calculados, PUT/PATCH devolvem o jogador e DELETE devolve 204 sem corpo.
 */
function fakeApi(initial: Player[], override?: Override) {
  let players = [...initial];
  let nextId = 100;
  const fetchMock = mockApi((url, _signal, request) => {
    const overridden = override?.(url, request);
    if (overridden) {
      return overridden;
    }
    const path = url.pathname.replace('/api/v1', '');
    const id = Number(/^\/players\/(\d+)/.exec(path)?.[1]);
    const found = players.find((player) => player.id === id);
    if (path === '/clubs') {
      return jsonResponse(CLUBS);
    }
    if (path === '/players' && request.method === 'GET') {
      const page = Number(url.searchParams.get('page'));
      const data = players.slice((page - 1) * 10, page * 10);
      const meta = {
        page,
        limit: 10,
        total_items: players.length,
        total_pages: Math.ceil(players.length / 10),
      };
      return jsonResponse({ data, meta });
    }
    if (path === '/players' && request.method === 'POST') {
      nextId += 1;
      const created = makePlayer({
        ...(request.body as Partial<Player>),
        id: nextId,
        condition: 'APTO',
        club_id: null,
        base_value: 40,
        market_value: 37,
        overall: 75,
      });
      players = [...players, created];
      return jsonResponse(created, 201);
    }
    if (!found) {
      return jsonResponse({ message: 'Jogador não encontrado.' }, 404);
    }
    if (request.method === 'GET') {
      return jsonResponse(found);
    }
    if (request.method === 'PUT') {
      const updated = {
        ...found,
        ...(request.body as Partial<Player>),
        overall: 70,
        market_value: 33.33,
      };
      players = players.map((player) => (player.id === id ? updated : player));
      return jsonResponse(updated);
    }
    if (request.method === 'PATCH') {
      const { condition } = request.body as { condition: Player['condition'] };
      const updated = { ...found, condition, market_value: 34.73 };
      players = players.map((player) => (player.id === id ? updated : player));
      return jsonResponse(updated);
    }
    players = players.filter((player) => player.id !== id);
    return new Response(null, { status: 204 });
  });
  return fetchMock;
}

function table() {
  return within(screen.getByRole('table', { name: 'Jogadores' }));
}

async function openRowMenu(user: User, name: string) {
  await user.click(await table().findByRole('button', { name: `Ações de ${name}` }));
  return within(screen.getByRole('menu', { name: `Ações de ${name}` }));
}

const VALID_FORM: Array<[RegExp, string]> = [
  [/^Nome/, 'Davi Melo'],
  [/^Idade/, '23'],
  [/^Agilidade/, '70'],
  [/^Velocidade/, '66'],
  [/^Finalização/, '62'],
  [/^Passe/, '74'],
  [/^Drible/, '70'],
  [/^Defesa/, '48'],
  [/^Físico/, '58'],
  [/^Potencial/, '82'],
];

async function fillCreateForm(user: User) {
  const dialog = within(screen.getByRole('dialog', { name: 'Novo jogador' }));
  for (const [label, value] of VALID_FORM) {
    await user.type(dialog.getByLabelText(label), value);
  }
  await user.click(dialog.getByRole('radio', { name: /^MEI/ }));
  return dialog;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cadastro de jogador', () => {
  it('envia só os 11 campos, como números, e mostra os valores devolvidos pela API', async () => {
    const fetchMock = fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');
    await table().findByText('Ícaro Mendes');
    const listQueries = requestsTo(fetchMock, '/players').length;

    await user.click(screen.getByRole('button', { name: 'Novo jogador' }));
    const dialog = await fillCreateForm(user);
    await user.click(dialog.getByRole('button', { name: 'Salvar jogador' }));

    const result = within(await screen.findByRole('dialog', { name: 'Jogador cadastrado' }));
    expect(writesTo(fetchMock)).toEqual([
      {
        method: 'POST',
        path: '/players',
        body: {
          name: 'Davi Melo',
          position: 'MEI',
          age: 23,
          agility: 70,
          pace: 66,
          shooting: 62,
          passing: 74,
          dribbling: 70,
          defending: 48,
          physical: 58,
          potential: 82,
        },
      },
    ]);
    expect(result.getByText('Valor base').closest('div')).toHaveTextContent('40,00');
    expect(result.getByText('Valor de mercado').closest('div')).toHaveTextContent('37,00');
    expect(result.getByText('Overall').closest('div')).toHaveTextContent('75');

    await user.click(result.getByRole('button', { name: 'Fechar' }));
    expect(await table().findByText('Davi Melo')).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/players').length).toBeGreaterThan(listQueries);
  });

  it('valida antes de enviar, com a mensagem junto a cada campo', async () => {
    const fetchMock = fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');
    await user.click(await screen.findByRole('button', { name: 'Novo jogador' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Novo jogador' }));

    await user.type(dialog.getByLabelText(/^Nome/), 'Da');
    await user.type(dialog.getByLabelText(/^Idade/), '15');
    await user.type(dialog.getByLabelText(/^Passe/), '120');
    await user.click(dialog.getByRole('button', { name: 'Salvar jogador' }));

    expect(dialog.getByLabelText(/^Nome/)).toHaveAccessibleDescription(
      expect.stringContaining('Use de 3 a 100 caracteres.') as string,
    );
    expect(dialog.getByLabelText(/^Idade/)).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('Use uma idade de 16 a 45 anos.')).toBeVisible();
    expect(dialog.getByText('Escolha a posição.')).toBeVisible();
    expect(dialog.getByText('Informe o potencial.')).toBeVisible();
    expect(dialog.getAllByText('Use um valor inteiro de 1 a 99.')).toHaveLength(1);
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('recusa da API (400): mostra o message e mantém o formulário preenchido', async () => {
    const fetchMock = fakeApi([FREE], (_url, request) =>
      request.method === 'POST'
        ? jsonResponse(
            { message: 'O campo potential deve ser maior ou igual ao maior atributo (82).' },
            400,
          )
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');
    await user.click(await screen.findByRole('button', { name: 'Novo jogador' }));
    const dialog = await fillCreateForm(user);

    await user.click(dialog.getByRole('button', { name: 'Salvar jogador' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'O campo potential deve ser maior ou igual ao maior atributo (82).',
    );
    expect(dialog.getByLabelText(/^Nome/)).toHaveValue('Davi Melo');
    expect(dialog.getByLabelText(/^Potencial/)).toHaveValue('82');
    expect(writesTo(fetchMock)).toHaveLength(1);
  });

  it('clique duplo em "Salvar jogador" envia um só POST e desabilita o botão', async () => {
    let release: () => void = () => undefined;
    const fetchMock = fakeApi([FREE], (_url, request) =>
      request.method === 'POST'
        ? new Promise<Response>((resolve) => {
            release = () => resolve(jsonResponse(makePlayer({ id: 50, name: 'Davi Melo' }), 201));
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');
    await user.click(await screen.findByRole('button', { name: 'Novo jogador' }));
    const dialog = await fillCreateForm(user);

    await user.dblClick(dialog.getByRole('button', { name: 'Salvar jogador' }));

    expect(await dialog.findByRole('button', { name: 'Salvando…' })).toBeDisabled();
    release();
    expect(await screen.findByRole('dialog', { name: 'Jogador cadastrado' })).toBeInTheDocument();
    expect(writesTo(fetchMock).filter((write) => write.method === 'POST')).toHaveLength(1);
  });

  it('falha de rede: informa e permite tentar de novo', async () => {
    let attempts = 0;
    fakeApi([FREE], (_url, request) => {
      if (request.method === 'POST') {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/players');
    await user.click(await screen.findByRole('button', { name: 'Novo jogador' }));
    const dialog = await fillCreateForm(user);

    await user.click(dialog.getByRole('button', { name: 'Salvar jogador' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API.');

    await user.click(dialog.getByRole('button', { name: 'Salvar jogador' }));
    expect(await screen.findByRole('dialog', { name: 'Jogador cadastrado' })).toBeInTheDocument();
  });
});

describe('edição de jogador', () => {
  it('carrega o jogador pela API, envia os 4 campos editáveis e avisa o sucesso', async () => {
    const fetchMock = fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Editar' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Editar jogador' }));

    expect(await dialog.findByLabelText(/^Nome/)).toHaveValue('Ícaro Mendes');
    expect(requestsTo(fetchMock, '/players/1')).toHaveLength(1);
    expect(dialog.getByLabelText(/^Idade/)).toHaveValue('40');
    expect(dialog.getByRole('radio', { name: /^ATA/ })).toBeChecked();
    expect(dialog.queryByLabelText(/^Potencial/)).not.toBeInTheDocument();

    await user.clear(dialog.getByLabelText(/^Nome/));
    await user.type(dialog.getByLabelText(/^Nome/), 'Ícaro Mendes Filho');
    await user.clear(dialog.getByLabelText(/^Idade/));
    await user.type(dialog.getByLabelText(/^Idade/), '41');
    await user.click(dialog.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Jogador atualizado')).toBeInTheDocument();
    expect(
      screen.getByText(/Ícaro Mendes Filho: overall 70, valor de mercado 33,33\./),
    ).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      {
        method: 'PUT',
        path: '/players/1',
        body: { name: 'Ícaro Mendes Filho', position: 'ATA', agility: 12, age: 41 },
      },
    ]);
    expect(await table().findByText('Ícaro Mendes Filho')).toBeInTheDocument();
  });

  it('jogador com clube não muda de posição e a idade não diminui', async () => {
    const fetchMock = fakeApi([IN_CLUB]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Felipe Moura');
    await user.click(menu.getByRole('menuitem', { name: 'Editar' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Editar jogador' }));
    await dialog.findByLabelText(/^Nome/);

    expect(dialog.getByRole('radio', { name: /^ZAG/ })).toBeEnabled();
    expect(dialog.getByRole('radio', { name: /^ATA/ })).toBeDisabled();
    expect(dialog.getByText(/Jogador com clube não muda de posição/)).toBeVisible();

    await user.clear(dialog.getByLabelText(/^Idade/));
    await user.type(dialog.getByLabelText(/^Idade/), '26');
    await user.click(dialog.getByRole('button', { name: 'Salvar alterações' }));

    expect(dialog.getByText('A idade não pode diminuir (atual: 27).')).toBeVisible();
    expect(writesTo(fetchMock)).toEqual([]);
  });

  it('recusa 409 da API aparece no diálogo, sem aviso de sucesso', async () => {
    fakeApi([FREE], (_url, request) =>
      request.method === 'PUT'
        ? jsonResponse({ message: 'A idade não pode diminuir (atual: 41).' }, 409)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Editar' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Editar jogador' }));
    await dialog.findByLabelText(/^Nome/);
    await user.click(dialog.getByRole('button', { name: 'Salvar alterações' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'A idade não pode diminuir (atual: 41).',
    );
    expect(screen.queryByText('Jogador atualizado')).not.toBeInTheDocument();
  });
});

describe('alteração de condição', () => {
  it('de DOENTE, Apto fica bloqueado; Mal condicionado envia o PATCH e mostra o valor da API', async () => {
    const fetchMock = fakeApi([SICK]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ênio Carvalho');
    await user.click(menu.getByRole('menuitem', { name: 'Alterar condição' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Alterar condição física' }));

    expect(dialog.getByRole('radio', { name: /^Apto/ })).toBeDisabled();
    expect(dialog.getByText('De Doente não passa direto para Apto.')).toBeVisible();
    expect(dialog.getByRole('radio', { name: /^Doente/ })).toBeChecked();

    await user.click(dialog.getByRole('radio', { name: /^Mal condicionado/ }));
    await user.click(dialog.getByRole('button', { name: 'Salvar condição' }));

    expect(await screen.findByText('Condição alterada')).toBeInTheDocument();
    expect(
      screen.getByText('Ênio Carvalho agora está Mal condicionado. Valor de mercado: 34,73.'),
    ).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      { method: 'PATCH', path: '/players/2/condition', body: { condition: 'MAL_CONDICIONADO' } },
    ]);
    expect(await table().findByText('34,73')).toBeInTheDocument();
    expect(table().getByText('Mal condicionado')).toBeInTheDocument();
  });

  it('enviar a condição atual também é aceito (200)', async () => {
    const fetchMock = fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Alterar condição' }));
    await user.click(screen.getByRole('button', { name: 'Salvar condição' }));

    expect(await screen.findByText('Condição alterada')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      { method: 'PATCH', path: '/players/1/condition', body: { condition: 'APTO' } },
    ]);
  });
});

describe('exclusão de jogador', () => {
  it('só jogador livre tem "Excluir" habilitado; com clube, o motivo aparece', async () => {
    fakeApi([FREE, IN_CLUB]);
    const user = userEvent.setup();
    renderApp('/players');

    const freeMenu = await openRowMenu(user, 'Ícaro Mendes');
    expect(freeMenu.getByRole('menuitem', { name: 'Excluir' })).toBeEnabled();
    expect(freeMenu.getByRole('menuitem', { name: 'Excluir' })).toHaveAccessibleDescription(
      'Disponível porque o jogador está livre.',
    );
    await user.keyboard('{Escape}');

    const clubMenu = await openRowMenu(user, 'Felipe Moura');
    expect(clubMenu.getByRole('menuitem', { name: 'Excluir' })).toBeDisabled();
    expect(clubMenu.getByRole('menuitem', { name: 'Excluir' })).toHaveAccessibleDescription(
      'Só jogador livre pode ser excluído; este está num clube.',
    );
  });

  it('pede confirmação; cancelar não envia nada', async () => {
    const fetchMock = fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Excluir' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Excluir Ícaro Mendes?' }));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([]);
    expect(table().getByText('Ícaro Mendes')).toBeInTheDocument();
  });

  it('confirma com DELETE (204), avisa e atualiza a lista e o total', async () => {
    const fetchMock = fakeApi([FREE, SICK]);
    const user = userEvent.setup();
    renderApp('/players');
    await screen.findByText('Mostrando 1–2 de 2 jogadores');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Excluir' }));
    await user.dblClick(screen.getByRole('button', { name: 'Excluir jogador' }));

    expect(await screen.findByText('Jogador excluído')).toBeInTheDocument();
    expect(writesTo(fetchMock)).toEqual([
      { method: 'DELETE', path: '/players/1', body: undefined },
    ]);
    expect(await screen.findByText('Mostrando 1–1 de 1 jogador')).toBeInTheDocument();
    expect(table().queryByText('Ícaro Mendes')).not.toBeInTheDocument();
  });

  it('recusa 409: mostra o message, não avisa sucesso e mantém o jogador', async () => {
    fakeApi([FREE], (_url, request) =>
      request.method === 'DELETE'
        ? jsonResponse({ message: 'Jogador com clube não pode ser excluído.' }, 409)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Excluir jogador' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Excluir Ícaro Mendes?' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Jogador com clube não pode ser excluído.',
    );
    expect(screen.queryByText('Jogador excluído')).not.toBeInTheDocument();
    expect(table().getByText('Ícaro Mendes')).toBeInTheDocument();
  });

  it('recusa 404: mostra o message e recarrega a lista', async () => {
    const fetchMock = fakeApi([FREE], (_url, request) =>
      request.method === 'DELETE'
        ? jsonResponse({ message: 'Jogador não encontrado.' }, 404)
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/players');
    await table().findByText('Ícaro Mendes');
    const listQueries = requestsTo(fetchMock, '/players').length;

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Excluir jogador' }));

    expect(await screen.findByText('Jogador não encontrado.')).toBeInTheDocument();
    await waitFor(() =>
      expect(requestsTo(fetchMock, '/players').length).toBeGreaterThan(listQueries),
    );
  });

  it('excluir o único jogador da última página volta para a página anterior', async () => {
    const eleven = Array.from({ length: 11 }, (_, index) =>
      makePlayer({ id: index + 1, name: `Jogador ${String(index + 1).padStart(2, '0')}` }),
    );
    const fetchMock = fakeApi(eleven);
    const user = userEvent.setup();
    renderApp('/players');
    await user.click(await screen.findByRole('button', { name: 'Página 2' }));
    await screen.findByText('Mostrando 11–11 de 11 jogadores');

    const menu = await openRowMenu(user, 'Jogador 11');
    await user.click(menu.getByRole('menuitem', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Excluir jogador' }));

    expect(await screen.findByText('Mostrando 1–10 de 10 jogadores')).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/players').at(-1)?.searchParams.get('page')).toBe('1');
  });
});

describe('menu de ações', () => {
  it('abre com o foco no primeiro item, navega pelas setas e Esc devolve o foco', async () => {
    fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');

    const trigger = await table().findByRole('button', { name: 'Ações de Ícaro Mendes' });
    await user.click(trigger);
    const menu = within(screen.getByRole('menu'));

    expect(menu.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(menu.getByRole('menuitem', { name: 'Alterar condição' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(menu.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('o diálogo devolve o foco ao botão da linha ao fechar com Esc', async () => {
    fakeApi([FREE]);
    const user = userEvent.setup();
    renderApp('/players');

    const menu = await openRowMenu(user, 'Ícaro Mendes');
    await user.click(menu.getByRole('menuitem', { name: 'Alterar condição' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(table().getByRole('button', { name: 'Ações de Ícaro Mendes' })).toHaveFocus();
  });
});
