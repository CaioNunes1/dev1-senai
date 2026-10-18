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

export function requestedUrl(fetchMock: ReturnType<typeof mockFetch>, call = 0): string {
  const input = fetchMock.mock.calls[call]?.[0];
  return input instanceof Request ? input.url : String(input);
}
