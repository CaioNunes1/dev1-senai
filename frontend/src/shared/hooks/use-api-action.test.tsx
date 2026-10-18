import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http-client';
import { useApiAction } from './use-api-action';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe('useApiAction', () => {
  it('chamadas seguidas antes de terminar executam a ação uma vez só', async () => {
    const pending = deferred<string>();
    const action = vi.fn(() => pending.promise);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useApiAction(action, { onSuccess }));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.run();
      void result.current.run();
      void result.current.run();
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      pending.resolve('ok');
      await first;
    });

    expect(result.current.isPending).toBe(false);
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith('ok');
  });

  it('guarda o ApiError com o message da API e libera nova tentativa', async () => {
    const refusal = new ApiError('Jogador com clube não pode ser excluído.', 409);
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce('ok');
    const onError = vi.fn();
    const { result } = renderHook(() => useApiAction(action, { onError }));

    await act(() => result.current.run());

    expect(result.current.error).toBe(refusal);
    expect(result.current.isPending).toBe(false);
    expect(onError).toHaveBeenCalledExactlyOnceWith(refusal);

    await act(() => result.current.run());

    expect(action).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeUndefined();
  });

  it('erro que não é da API vira ApiError com texto próprio', async () => {
    const { result } = renderHook(() =>
      useApiAction(() => Promise.reject(new Error('falha interna'))),
    );

    await act(() => result.current.run());

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBeNull();
  });

  it('terminar depois de desmontar não gera erro nem atualiza estado', async () => {
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const { result, unmount } = renderHook(() =>
      useApiAction(() => pending.promise, { onSuccess }),
    );
    let running: Promise<void> = Promise.resolve();
    act(() => {
      running = result.current.run();
    });

    unmount();
    pending.resolve('ok');

    await expect(running).resolves.toBeUndefined();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
