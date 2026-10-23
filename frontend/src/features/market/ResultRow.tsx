import type { ReactNode } from 'react';
import { cx } from '../../shared/lib/cx';

type ResultRowProps = {
  label: string;
  detail?: string;
  value: ReactNode;
  highlight?: boolean;
  /** Classe extra do valor (ex.: cor do lucro com sinal). */
  valueClassName?: string;
};

/** Linha de resultado de uma operação de mercado (Figma M05 e V02): rótulo, detalhe e valor. */
export function ResultRow({
  label,
  detail,
  value,
  highlight = false,
  valueClassName,
}: ResultRowProps) {
  return (
    <div
      className={
        highlight ? 'flex items-center gap-3 bg-muted-subtle p-3' : 'flex items-center gap-3 p-3'
      }
    >
      <dt className="flex flex-1 flex-col">
        <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </dt>
      <dd className={cx(highlight ? 'text-heading-card' : 'font-medium', valueClassName)}>
        {value}
      </dd>
    </div>
  );
}
