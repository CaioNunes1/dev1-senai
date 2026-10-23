import { apiDownload, apiRequest } from '../../shared/api/http-client';
import { transactionQuery, type TransactionFilters } from './transaction-filters';

/** Corpo de `POST /players/{id}/buy`: só o clube e o fim da fidelidade (RN01, RN12). */
export type BuyPlayerBody = { club_id: number; loyalty_until: string };

/** Resposta 200 da compra (README › 2.3.1): a transação COMPRA, o contrato e o novo caixa. */
export type PurchaseResult = {
  id: number;
  club_id: number;
  player_id: number;
  player_name: string;
  type: 'COMPRA';
  value: number;
  fee: number;
  penalty: number;
  profit: null;
  cash_change: number;
  created_at: string;
  contract: { purchase_value: number; loyalty_until: string; status: 'ATIVO' };
  club_cash: number;
};

export function buyPlayer(playerId: number, body: BuyPlayerBody): Promise<PurchaseResult> {
  return apiRequest<PurchaseResult>(`/players/${playerId}/buy`, { method: 'POST', body });
}

export type TransactionType = 'COMPRA' | 'VENDA';

/** Transação do histórico (README › 2.3.3): nome e valores gravados no momento da operação. */
export type Transaction = {
  id: number;
  club_id: number;
  player_id: number;
  player_name: string;
  type: TransactionType;
  value: number;
  fee: number;
  penalty: number;
  profit: number | null;
  cash_change: number;
  created_at: string;
};

/** Totais das transações filtradas, somados pela API (RN17). */
export type TransactionSummary = {
  total_spent: number;
  total_received: number;
  total_fees: number;
  total_penalties: number;
  total_profit: number;
};

/** `GET /clubs/{id}/transactions`: as linhas e o resumo saem da mesma consulta. */
export type TransactionHistory = { data: Transaction[]; summary: TransactionSummary };

export function listClubTransactions(
  clubId: number,
  filters: TransactionFilters,
  signal?: AbortSignal,
): Promise<TransactionHistory> {
  return apiRequest<TransactionHistory>(`/clubs/${clubId}/transactions`, {
    query: transactionQuery(filters),
    signal,
  });
}

/** RN18: o CSV pronto da API, com os mesmos filtros da tabela; a tela não mexe no conteúdo. */
export function exportClubTransactions(clubId: number, filters: TransactionFilters): Promise<Blob> {
  return apiDownload(`/clubs/${clubId}/transactions/export`, {
    accept: 'text/csv',
    query: transactionQuery(filters),
  });
}

/** Resposta 200 da venda (README › 2.3.2): a transação VENDA, o contrato encerrado e o novo caixa. */
export type SaleResult = Omit<Transaction, 'type' | 'profit'> & {
  type: 'VENDA';
  profit: number;
  purchase_value: number;
  remaining_days: number;
  penalty_rate: number;
  contract_status: 'ENCERRADO' | 'RESCINDIDO';
  club_cash: number;
};

/** RN15–RN16: a venda é sempre pelo clube atual do jogador, sem corpo. */
export function sellPlayer(playerId: number): Promise<SaleResult> {
  return apiRequest<SaleResult>(`/players/${playerId}/sell`, { method: 'POST' });
}
