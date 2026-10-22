import { HandCoins, ShoppingCart } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../shared/components/Badge';
import { DataTable, type Column } from '../../shared/components/DataTable';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { cx } from '../../shared/lib/cx';
import { formatBrasiliaDateTime, formatMoney, formatSignedMoney } from '../../shared/lib/format';
import { PlayerAvatar } from '../players/PlayerAvatar';
import type { Transaction, TransactionHistory } from './api';
import { signedToneClass } from './signed-tone';
import { TRANSACTION_TYPE_LABELS } from './transaction-filters';

const COLUMNS: Column<Transaction>[] = [
  {
    key: 'created_at',
    header: 'Data e hora',
    widthClass: 'w-40',
    cell: (transaction) => {
      const { date, time } = formatBrasiliaDateTime(transaction.created_at);
      return (
        <time dateTime={transaction.created_at} className="flex gap-2">
          <span>{date}</span>
          <span className="text-muted-foreground">{time}</span>
        </time>
      );
    },
  },
  {
    key: 'type',
    header: 'Tipo',
    widthClass: 'w-24',
    cell: (transaction) =>
      transaction.type === 'COMPRA' ? (
        <Badge variant="outline">
          <ShoppingCart aria-hidden="true" className="size-3" />
          {TRANSACTION_TYPE_LABELS.COMPRA}
        </Badge>
      ) : (
        <Badge variant="secondary">
          <HandCoins aria-hidden="true" className="size-3" />
          {TRANSACTION_TYPE_LABELS.VENDA}
        </Badge>
      ),
  },
  {
    key: 'player_name',
    header: 'Jogador',
    cell: (transaction) => (
      <div className="flex items-center gap-3">
        <PlayerAvatar id={transaction.player_id} name={transaction.player_name} />
        <span className="font-medium whitespace-normal text-foreground">
          {transaction.player_name}
        </span>
      </div>
    ),
  },
  {
    key: 'value',
    header: 'Valor',
    align: 'right',
    cell: (transaction) => formatMoney(transaction.value),
  },
  {
    key: 'fee',
    header: 'Taxa ou comissão',
    align: 'right',
    cell: (transaction) => formatMoney(transaction.fee),
  },
  {
    key: 'penalty',
    header: 'Multa',
    align: 'right',
    cell: (transaction) => formatMoney(transaction.penalty),
  },
  {
    key: 'profit',
    header: 'Lucro',
    align: 'right',
    cell: (transaction) =>
      transaction.profit === null ? (
        <span className="text-muted-foreground">
          <span aria-hidden="true">–</span>
          <span className="sr-only">Não se aplica</span>
        </span>
      ) : (
        <span className={signedToneClass(transaction.profit)}>
          {formatSignedMoney(transaction.profit)}
        </span>
      ),
  },
  {
    key: 'cash_change',
    header: 'Variação do caixa',
    align: 'right',
    cell: (transaction) => (
      <span className={cx('font-semibold', signedToneClass(transaction.cash_change))}>
        {formatSignedMoney(transaction.cash_change)}
      </span>
    ),
  },
];

type TransactionsTableProps = {
  history: ApiQuery<TransactionHistory>;
  empty: ReactNode;
};

/**
 * Histórico de transações (RN17, Figma H01): linhas na ordem da API (mais recente primeiro),
 * com o nome e os valores gravados no momento de cada operação; nada é recalculado.
 */
export function TransactionsTable({ history, empty }: TransactionsTableProps) {
  return (
    <DataTable
      caption="Histórico de transações"
      columns={COLUMNS}
      rows={history.data?.data}
      rowKey={(transaction) => transaction.id}
      isLoading={history.isLoading}
      loadingLabel="Carregando histórico…"
      error={history.error}
      errorTitle="Não foi possível carregar o histórico"
      onRetry={history.retry}
      skeletonRows={4}
      empty={empty}
    />
  );
}
