import { Cents } from '../../common/domain/money';

export const TRANSACTION_TYPES = ['COMPRA', 'VENDA'] as const;
export type TransactionKind = (typeof TRANSACTION_TYPES)[number];

/** Transação como foi gravada: nome e valores do momento da operação (RN17). */
export interface RecordedTransaction {
  type: TransactionKind;
  playerName: string;
  value: Cents;
  fee: Cents;
  penalty: Cents;
  profit: Cents | null;
  cashChange: Cents;
  createdAt: Date;
}

export interface TransactionSummary {
  totalSpent: Cents;
  totalReceived: Cents;
  totalFees: Cents;
  totalPenalties: Cents;
  totalProfit: Cents;
}

/**
 * RN17 › `summary`: totais das transações já filtradas, somados em centavos (exatos, sem
 * arredondar no meio). Só soma os valores gravados; nada da compra ou da venda é recalculado.
 */
export function summarizeTransactions(
  transactions: readonly RecordedTransaction[],
): TransactionSummary {
  const summary: TransactionSummary = {
    totalSpent: 0,
    totalReceived: 0,
    totalFees: 0,
    totalPenalties: 0,
    totalProfit: 0,
  };
  for (const transaction of transactions) {
    summary.totalFees += transaction.fee;
    if (transaction.type === 'COMPRA') {
      summary.totalSpent += transaction.value + transaction.fee;
    } else {
      summary.totalReceived += transaction.cashChange;
      summary.totalPenalties += transaction.penalty;
      summary.totalProfit += transaction.profit ?? 0;
    }
  }
  return summary;
}
