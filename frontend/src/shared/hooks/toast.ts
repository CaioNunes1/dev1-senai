import { createContext, useContext } from 'react';

type ToastVariant = 'success' | 'error';

export type ToastInput = { variant: ToastVariant; title: string; description?: string };

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Mostra um aviso no canto da tela (Figma: Toast, nó 6:1014), como em J11 e J14. */
export function useToast(): (toast: ToastInput) => void {
  const showToast = useContext(ToastContext);
  if (showToast === null) {
    throw new Error('useToast precisa estar dentro de ToastProvider.');
  }
  return showToast;
}
