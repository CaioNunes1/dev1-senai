import { useEffect, useEffectEvent, useState } from 'react';
import { toApiError, type ApiError } from '../api/http-client';
import { useDataRefresh } from './data-refresh';

export type ApiQuery<T> = {
  /** Último resultado da mesma consulta; continua visível enquanto ela recarrega. */
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  retry: () => void;
};

type Settled<T> = { key: string; requestId: string; data?: T; error?: ApiError };

type QueryOptions = {
  /** `false` não faz o pedido (ex.: a mesma consulta já está aberta em outro lugar). */
  enabled?: boolean;
};

/**
 * Carrega dados da API e recarrega quando `key` muda, quando `retry` é chamado ou quando
 * alguém pede `refreshAll`. Respostas atrasadas de pedidos antigos são descartadas.
 */
export function useApiQuery<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  { enabled = true }: QueryOptions = {},
): ApiQuery<T> {
  const { version } = useDataRefresh();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>();
  const requestId = `${key}|${version}|${attempt}`;
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    runLoad(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ key, requestId, data });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, requestId, error: toApiError(error) });
        }
      },
    );
    return () => controller.abort();
  }, [key, requestId, enabled]);

  const retry = () => setAttempt((current) => current + 1);
  if (!enabled) {
    return { data: undefined, error: undefined, isLoading: false, retry };
  }
  const isLoading = settled?.requestId !== requestId;
  return {
    data: settled?.key === key ? settled.data : undefined,
    error: isLoading ? undefined : settled.error,
    isLoading,
    retry,
  };
}
