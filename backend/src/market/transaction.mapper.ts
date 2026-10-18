import { MarketTransaction } from '@prisma/client';
import { formatBrasiliaDateTime } from '../common/domain/datetime';
import { centsToNumber } from '../common/domain/money';
import { decimalToCents } from '../prisma/decimal';
import { TransactionResponse } from './dto/market-response.dto';

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
