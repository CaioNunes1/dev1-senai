import {
  CirclePercent,
  HandCoins,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../../shared/lib/cx';
import { formatMoney, formatSignedMoney } from '../../shared/lib/format';
import type { TransactionSummary } from './api';
import { signedToneClass } from './signed-tone';

type Total = {
  key: keyof TransactionSummary;
  label: string;
  icon: LucideIcon;
  detail: string;
};

const TOTALS: Total[] = [
  {
    key: 'total_spent',
    label: 'Total pago em compras',
    icon: ShoppingCart,
    detail: 'Valor + taxa',
  },
  {
    key: 'total_received',
    label: 'Total recebido em vendas',
    icon: HandCoins,
    detail: 'Crédito líquido',
  },
  { key: 'total_fees', label: 'Taxas e comissões', icon: CirclePercent, detail: 'Somadas' },
  { key: 'total_penalties', label: 'Multas', icon: TriangleAlert, detail: 'Por fidelidade' },
  {
    key: 'total_profit',
    label: 'Lucro total',
    icon: TrendingUp,
    detail: 'Soma dos lucros, com sinal',
  },
];

/**
 * Os cinco totais do `summary` (RN17, Figma H01), abaixo da tabela. Cada número é o da
 * resposta da mesma consulta da tabela; a tela não soma linhas. Sem resposta ainda
 * (carregando), mostra o esqueleto.
 */
export function TransactionSummaryBar({ summary }: { summary: TransactionSummary | undefined }) {
  return (
    <ul
      aria-label="Totais das transações"
      aria-busy={summary === undefined}
      className="grid grid-cols-2 gap-px border-t border-border bg-border lg:grid-cols-5"
    >
      {TOTALS.map((total) => {
        const value = summary?.[total.key];
        const isProfit = total.key === 'total_profit';
        const Icon = isProfit && value !== undefined && value < 0 ? TrendingDown : total.icon;
        return (
          <li
            key={total.key}
            className="flex flex-col gap-1 bg-muted-subtle px-4 py-3 last:col-span-2 lg:last:col-span-1"
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {total.label}
            </p>
            {value === undefined ? (
              <span
                aria-hidden="true"
                className="my-1.5 h-3 w-16 animate-pulse rounded-full bg-muted"
              />
            ) : (
              <p
                className={cx(
                  'text-heading-card',
                  isProfit ? signedToneClass(value) : 'text-foreground',
                )}
              >
                {isProfit ? formatSignedMoney(value) : formatMoney(value)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{total.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
