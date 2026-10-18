import { createContext, useContext } from 'react';

export type DataRefresh = {
  /** Muda a cada pedido de atualização; as consultas abertas recarregam quando ela muda. */
  version: number;
  refreshAll: () => void;
};

export const DataRefreshContext = createContext<DataRefresh | null>(null);

export function useDataRefresh(): DataRefresh {
  const context = useContext(DataRefreshContext);
  if (context === null) {
    throw new Error('useDataRefresh precisa estar dentro de DataRefreshProvider.');
  }
  return context;
}
