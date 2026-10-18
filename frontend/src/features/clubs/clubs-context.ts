import { createContext, useContext } from 'react';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import type { Club } from './api';

/**
 * Lista de `GET /clubs` carregada uma vez pelo layout e compartilhada pelo menu, pela tabela
 * de jogadores (nome do clube) e pelos filtros, sem um pedido por tela ou por linha.
 */
export const ClubsContext = createContext<ApiQuery<Club[]> | null>(null);

export function useClubList(): ApiQuery<Club[]> {
  const context = useContext(ClubsContext);
  if (context === null) {
    throw new Error('useClubList precisa estar dentro do layout que fornece ClubsContext.');
  }
  return context;
}
