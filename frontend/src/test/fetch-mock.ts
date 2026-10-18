import { vi } from 'vitest';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Substitui o `fetch` global por um mock; cada teste define as respostas. */
export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export type FetchMock = ReturnType<typeof mockFetch>;

/** URL de um pedido feito ao `fetch`, qualquer que seja a forma do argumento. */
export function urlOf(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }
  return input instanceof URL ? input.href : input;
}

export function requestedUrl(fetchMock: FetchMock, call = 0): string {
  const input = fetchMock.mock.calls[call]?.[0];
  return input === undefined ? '' : urlOf(input);
}

/**
 * Mock do `fetch` que responde conforme o caminho do pedido (ex.: `/api/v1/players`).
 * O `signal` do pedido é repassado para o teste simular respostas lentas e cancelamentos.
 */
export type ApiRequest = { method: string; body: unknown };

export function mockApi(
  respond: (
    url: URL,
    signal: AbortSignal | undefined,
    request: ApiRequest,
  ) => Response | Promise<Response>,
) {
  const fetchMock = mockFetch();
  fetchMock.mockImplementation((input, init) =>
    Promise.resolve(respond(new URL(urlOf(input)), init?.signal ?? undefined, requestOf(init))),
  );
  return fetchMock;
}

function requestOf(init: RequestInit | undefined): ApiRequest {
  const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
  return { method: init?.method ?? 'GET', body };
}

/** Consultas (GET) a um caminho, na ordem (ex.: todas as consultas a `/players`). */
export function requestsTo(fetchMock: FetchMock, path: string): URL[] {
  return fetchMock.mock.calls
    .filter(([, init]) => requestOf(init).method === 'GET')
    .map(([input]) => new URL(urlOf(input)))
    .filter((url) => url.pathname === `/api/v1${path}`);
}

/** Pedidos de escrita (POST, PUT, PATCH, DELETE) com método, caminho e corpo enviado. */
export function writesTo(fetchMock: FetchMock): Array<ApiRequest & { path: string }> {
  return fetchMock.mock.calls
    .map(([input, init]) => ({
      ...requestOf(init),
      path: new URL(urlOf(input)).pathname.replace('/api/v1', ''),
    }))
    .filter((request) => request.method !== 'GET');
}
