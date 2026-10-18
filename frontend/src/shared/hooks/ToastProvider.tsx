import { CircleCheck, CircleX, X } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { cx } from '../lib/cx';
import { ToastContext, type ToastInput } from './toast';

const TOAST_DURATION_MS = 6000;

type Toast = ToastInput & { id: number };

/**
 * Fila de avisos de sucesso e erro das ações. Sucesso é anunciado com `role="status"`;
 * erro com `role="alert"`. Cada aviso some sozinho e também pode ser fechado.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );

  const showToast = useCallback(
    (toast: ToastInput) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        {toasts.map((toast) => {
          const Icon = toast.variant === 'success' ? CircleCheck : CircleX;
          return (
            <div
              key={toast.id}
              role={toast.variant === 'success' ? 'status' : 'alert'}
              className="pointer-events-auto flex w-full gap-3 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
            >
              <Icon
                aria-hidden="true"
                className={cx(
                  'mt-0.5 size-4 shrink-0',
                  toast.variant === 'success' ? 'text-success' : 'text-destructive',
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-medium">{toast.title}</p>
                {toast.description && <p className="text-muted-foreground">{toast.description}</p>}
              </div>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Fechar aviso"
                onClick={() => dismiss(toast.id)}
                className="-mt-1 -mr-1 size-6"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
