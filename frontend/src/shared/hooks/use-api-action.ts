import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError, type ApiError } from '../api/http-client';

type ActionCallbacks<TResult> = {
  onSuccess?: (result: TResult) => void;
  onError?: (error: ApiError) => void;
};

/**
 * Executa uma ação de escrita na API (POST, PUT, PATCH, DELETE) uma vez por vez.
 * A trava é síncrona (`ref`), então um clique duplo antes de o React redesenhar o botão
 * desabilitado não envia dois pedidos (F3 › Mensagens). Quem chama decide o que atualizar
 * no sucesso (ex.: `refreshAll`); o erro guardado é o `ApiError` com o `message` da API.
 */
export function useApiAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  callbacks: ActionCallbacks<TResult> = {},
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError>();
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const latest = useRef({ action, callbacks });

  useEffect(() => {
    latest.current = { action, callbacks };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args: TArgs): Promise<void> => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setIsPending(true);
    setError(undefined);
    try {
      const result = await latest.current.action(...args);
      latest.current.callbacks.onSuccess?.(result);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (mountedRef.current) {
        setError(apiError);
      }
      latest.current.callbacks.onError?.(apiError);
    } finally {
      runningRef.current = false;
      if (mountedRef.current) {
        setIsPending(false);
      }
    }
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  return { run, isPending, error, clearError };
}
