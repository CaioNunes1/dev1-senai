import type { ReactNode } from 'react';
import { DataRefreshProvider } from '../shared/hooks/DataRefreshProvider';
import { ToastProvider } from '../shared/hooks/ToastProvider';

/** Estado global da aplicação: atualização dos dados (ADR-009) e avisos de ações. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DataRefreshProvider>
      <ToastProvider>{children}</ToastProvider>
    </DataRefreshProvider>
  );
}
