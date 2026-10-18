import type { ReactNode } from 'react';
import type { ApiError } from '../api/http-client';
import { Alert } from './Alert';
import { Button } from './Button';
import { Dialog } from './Dialog';

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  destructive?: boolean;
  isPending: boolean;
  /** Recusa da API (ex.: 409), mostrada no diálogo, que continua aberto. */
  error: ApiError | undefined;
  errorTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmação antes de uma ação (Figma J13): descrição, Cancelar e a ação, com estado de envio. */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  confirmIcon,
  destructive = false,
  isPending,
  error,
  errorTitle,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      size="sm"
      title={title}
      description={description}
      onClose={onCancel}
      closeDisabled={isPending}
      notice={
        error && (
          <Alert variant="destructive" title={errorTitle}>
            {error.message}
          </Alert>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isPending} data-autofocus>
            Cancelar
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {confirmIcon}
            {isPending ? 'Enviando…' : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
