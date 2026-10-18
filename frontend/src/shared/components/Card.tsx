import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

/** Superfície de conteúdo (tabelas, filtros, avisos): borda, raio de card e sombra xs. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cx(
        'rounded-xl border border-border bg-card text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    />
  );
}
