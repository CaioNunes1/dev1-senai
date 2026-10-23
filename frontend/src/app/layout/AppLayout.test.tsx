import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, requestsTo } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';

const CLUBS = [
  { id: 2, name: 'Águias FC', acronym: 'AGU', cash: 51.58, squad_value: 222.68, net_worth: 274.26 },
  { id: 1, name: 'Delta FC', acronym: 'DEL', cash: 300, squad_value: 0, net_worth: 300 },
];

const EMPTY_PAGE = { data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } };

/**
 * Clubes conforme `clubsResponses` (um por consulta; o último se repete); página de um
 * clube com elenco vazio; jogadores vazios.
 */
function mockClubsApi(...clubsResponses: Array<() => Response>) {
  let clubsCalls = 0;
  return mockApi((url) => {
    if (url.pathname.endsWith('/clubs')) {
      const respond = clubsResponses[Math.min(clubsCalls, clubsResponses.length - 1)];
      clubsCalls += 1;
      return respond();
    }
    const clubId = Number(/\/clubs\/(\d+)$/.exec(url.pathname)?.[1]);
    const club = CLUBS.find(({ id }) => id === clubId);
    if (club) {
      return jsonResponse({ ...club, players: [] });
    }
    if (url.pathname.endsWith('/standings') || url.pathname.endsWith('/matches')) {
      return jsonResponse([]);
    }
    return jsonResponse(EMPTY_PAGE);
  });
}

function breadcrumb() {
  return within(screen.getByRole('navigation', { name: 'Trilha de navegação' }));
}

describe('AppLayout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('abre a tela de jogadores pela raiz, com menu e trilha', async () => {
    mockClubsApi(() => jsonResponse(CLUBS));

    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Jogadores' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jogadores' })).toHaveAttribute('aria-current', 'page');
    expect(breadcrumb().getByText('Mercado')).toBeInTheDocument();
    expect(breadcrumb().getByText('Jogadores')).toHaveAttribute('aria-current', 'page');
  });

  it('lista os clubes da API no menu, na ordem recebida', async () => {
    const fetchMock = mockClubsApi(() => jsonResponse(CLUBS));

    renderApp('/players');

    const clubsGroup = within(screen.getByRole('region', { name: 'Clubes' }));
    const links = await clubsGroup.findAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['AÁguias FC', 'DDelta FC']);
    expect(links[0]).toHaveAttribute('href', '/clubs/2');
    expect(requestsTo(fetchMock, '/clubs').map(String)).toEqual([
      'http://localhost:3000/api/v1/clubs',
    ]);
  });

  it('navega pelo menu e mostra o nome do clube na trilha', async () => {
    mockClubsApi(() => jsonResponse(CLUBS));
    const user = userEvent.setup();
    renderApp('/players');

    await user.click(await screen.findByRole('link', { name: /Delta FC/ }));

    expect(breadcrumb().getByRole('link', { name: 'Clubes' })).toHaveAttribute('href', '/clubs');
    expect(breadcrumb().getByText('Delta FC')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Delta FC/ })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'Classificação' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Classificação' })).toBeInTheDocument();
    expect(breadcrumb().getByText('Liga')).toBeInTheDocument();
  });

  it('mostra o message da API quando os clubes não carregam e permite tentar de novo', async () => {
    mockClubsApi(
      () => jsonResponse({ message: 'Falha ao consultar os clubes.' }, 500),
      () => jsonResponse(CLUBS),
    );
    const user = userEvent.setup();
    renderApp('/players');

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao consultar os clubes.');

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('link', { name: /Águias FC/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa quando não há clubes cadastrados', async () => {
    mockClubsApi(() => jsonResponse([]));

    renderApp('/players');

    expect(await screen.findByText('Nenhum clube cadastrado.')).toBeInTheDocument();
  });

  it('recarrega os dados pelo botão "Atualizar dados" sem recarregar a página', async () => {
    const fetchMock = mockClubsApi(
      () => jsonResponse(CLUBS.slice(0, 1)),
      () => jsonResponse(CLUBS),
    );
    const user = userEvent.setup();
    renderApp('/players');
    await screen.findByRole('link', { name: /Águias FC/ });

    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }));

    expect(await screen.findByRole('link', { name: /Delta FC/ })).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/clubs')).toHaveLength(2);
    expect(requestsTo(fetchMock, '/players')).toHaveLength(2);
  });
});
