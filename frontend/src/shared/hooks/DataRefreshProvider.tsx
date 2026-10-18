import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataRefreshContext } from './data-refresh';

/**
 * Atualização dos dados sem recarregar a página: o botão "Atualizar dados" do topo e,
 * depois de cada ação gravada, a própria ação chamam `refreshAll`.
 */
export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refreshAll = useCallback(() => setVersion((current) => current + 1), []);
  const value = useMemo(() => ({ version, refreshAll }), [version, refreshAll]);
  return <DataRefreshContext value={value}>{children}</DataRefreshContext>;
}
