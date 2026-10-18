const API_PREFIX = '/api/v1';
const DEFAULT_API_ORIGIN = 'http://localhost:3000';

const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar à API. Verifique se o backend está em execução e tente de novo.';
const UNEXPECTED_RESPONSE_MESSAGE = 'A API respondeu de forma inesperada. Tente de novo.';

/** Recusa da API (`status` = código HTTP) ou falha de rede (`status` = null). */
export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Garante um `ApiError` para a tela, qualquer que seja a falha recebida. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
};

/** Origem configurada em VITE_API_URL, sem barra final e sem repetir o prefixo /api/v1. */
export function resolveApiBaseUrl(origin: string | undefined): string {
  const trimmed = (origin?.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, '');
  return trimmed.endsWith(API_PREFIX) ? trimmed : `${trimmed}${API_PREFIX}`;
}

const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

function buildApiUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${apiBaseUrl}${path}`);
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(name, String(value));
    }
  }
  return url.toString();
}

/**
 * Única porta de saída para a API. Devolve o corpo JSON tipado ou lança `ApiError`
 * com o `message` recebido, sem trocá-lo por um texto genérico.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, null);
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw new ApiError(messageOf(payload) ?? UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }
  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }
}

function messageOf(payload: unknown): string | undefined {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const { message } = payload;
    return typeof message === 'string' && message !== '' ? message : undefined;
  }
  return undefined;
}
