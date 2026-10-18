import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, requestedUrl } from '../../test/fetch-mock';
import { ApiError, apiRequest, resolveApiBaseUrl } from './http-client';

describe('resolveApiBaseUrl', () => {
  it.each([
    [undefined, 'http://localhost:3000/api/v1'],
    ['', 'http://localhost:3000/api/v1'],
    ['http://localhost:3000', 'http://localhost:3000/api/v1'],
    ['http://localhost:3000/', 'http://localhost:3000/api/v1'],
    ['http://api.liga:8080/api/v1', 'http://api.liga:8080/api/v1'],
    ['http://api.liga:8080/api/v1/', 'http://api.liga:8080/api/v1'],
  ])('origem %j → %s', (origin, expected) => {
    expect(resolveApiBaseUrl(origin)).toBe(expected);
  });
});

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('acrescenta /api/v1 e envia só os query params definidos', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse([]));

    await apiRequest('/players', { query: { page: 2, search: 'jose', club_id: undefined } });

    expect(requestedUrl(fetchMock)).toBe('http://localhost:3000/api/v1/players?page=2&search=jose');
  });

  it('envia o corpo em JSON e devolve a resposta tipada', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Águias FC' }, 201));

    const club = await apiRequest<{ id: number; name: string }>('/clubs', {
      method: 'POST',
      body: { name: 'Águias FC', acronym: 'AGU' },
    });

    expect(club).toEqual({ id: 1, name: 'Águias FC' });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"Águias FC","acronym":"AGU"}');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it.each([400, 404, 409])('preserva o message da API na recusa %i', async (status) => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Já existe um clube com esse nome.' }, status),
    );

    const error = await apiRequest('/clubs').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, message: 'Já existe um clube com esse nome.' });
  });

  it('usa um texto próprio quando a recusa não traz message', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(new Response('<html>erro</html>', { status: 502 }));

    await expect(apiRequest('/clubs')).rejects.toMatchObject({
      status: 502,
      message: 'A API respondeu de forma inesperada. Tente de novo.',
    });
  });

  it('transforma falha de rede em ApiError sem status', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/clubs')).rejects.toMatchObject({
      status: null,
      message:
        'Não foi possível conectar à API. Verifique se o backend está em execução e tente de novo.',
    });
  });

  it('devolve undefined quando a resposta não tem corpo', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/players/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
