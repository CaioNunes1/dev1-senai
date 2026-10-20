import { MarketTransaction } from '@prisma/client';
import { formatBrasiliaDateTime } from '../common/domain/datetime';
import { centsToNumber } from '../common/domain/money';
import { decimalToCents } from '../prisma/decimal';
import { RecordedTransaction, TransactionSummary } from './domain/transaction-history';
import { TransactionResponse, TransactionSummaryResponse } from './dto/market-response.dto';

const toMoney = (value: Parameters<typeof decimalToCents>[0]) =>
  centsToNumber(decimalToCents(value));

/** Transação gravada → resposta da API, sem recalcular nada (RN17). */
export function toTransactionResponse(transaction: MarketTransaction): TransactionResponse {
  return {
    id: transaction.id,
    club_id: transaction.clubId,
    player_id: transaction.playerId,
    player_name: transaction.playerName,
    type: transaction.type,
    value: toMoney(transaction.value),
    fee: toMoney(transaction.fee),
    penalty: toMoney(transaction.penalty),
    profit: transaction.profit === null ? null : toMoney(transaction.profit),
    cash_change: toMoney(transaction.cashChange),
    created_at: formatBrasiliaDateTime(transaction.createdAt),
  };
}

/** Transação gravada → valores em centavos para o `summary` e o CSV (RN17, RN18). */
export function toRecordedTransaction(transaction: MarketTransaction): RecordedTransaction {
  return {
    type: transaction.type,
    playerName: transaction.playerName,
    value: decimalToCents(transaction.value),
    fee: decimalToCents(transaction.fee),
    penalty: decimalToCents(transaction.penalty),
    profit: transaction.profit === null ? null : decimalToCents(transaction.profit),
    cashChange: decimalToCents(transaction.cashChange),
    createdAt: transaction.createdAt,
  };
}

/** `summary` em centavos → números JSON da resposta. */
export function toSummaryResponse(summary: TransactionSummary): TransactionSummaryResponse {
  return {
    total_spent: centsToNumber(summary.totalSpent),
    total_received: centsToNumber(summary.totalReceived),
    total_fees: centsToNumber(summary.totalFees),
    total_penalties: centsToNumber(summary.totalPenalties),
    total_profit: centsToNumber(summary.totalProfit),
  };
}
