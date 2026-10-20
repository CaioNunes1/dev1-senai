import { formatBrasiliaDateTime } from '../../common/domain/datetime';
import { formatMoney } from '../../common/domain/money';
import { RecordedTransaction } from './transaction-history';

/** RN18: primeira linha do arquivo, exatamente nesta ordem. */
export const CSV_HEADER =
  'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa';

const SEPARATOR = ';';
const LINE_END = '\n';
const NEEDS_QUOTES = /[;"]/;

/** RN18 › 6: nome com `;` ou aspas vai entre aspas duplas, com cada aspa interna duplicada. */
export function escapeCsvText(text: string): string {
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * RN18: histórico em CSV, na ordem recebida (a mesma do histórico). Separador `;`, data e
 * hora da RN01, valores com 2 casas e vírgula, lucro vazio quando nulo e cada linha
 * terminada em LF, inclusive a última. Sem transações, só o cabeçalho.
 */
export function toTransactionsCsv(transactions: readonly RecordedTransaction[]): string {
  const lines = transactions.map((transaction) =>
    [
      formatBrasiliaDateTime(transaction.createdAt),
      transaction.type,
      escapeCsvText(transaction.playerName),
      formatMoney(transaction.value),
      formatMoney(transaction.fee),
      formatMoney(transaction.penalty),
      transaction.profit === null ? '' : formatMoney(transaction.profit),
      formatMoney(transaction.cashChange),
    ].join(SEPARATOR),
  );
  return [CSV_HEADER, ...lines].map((line) => line + LINE_END).join('');
}
