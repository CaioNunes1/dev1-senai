import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

/** Variantes do componente Badge do Figma (02 · Componentes, nó 6:560). */
const VARIANT_CLASSES = {
  outline: 'border-border text-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  success: 'border-success-soft-border bg-success-soft text-success-soft-foreground',
  warning: 'border-warning-soft-border bg-warning-soft text-warning-soft-foreground',
  destructive:
    'border-destructive-soft-border bg-destructive-soft text-destructive-soft-foreground',
} as const;

export type BadgeVariant = keyof typeof VARIANT_CLASSES;

type BadgeProps = {
  variant: BadgeVariant;
  /** Ponto colorido antes do texto, usado nos status (status nunca só por cor). */
  dot?: boolean;
  children: ReactNode;
};

export function Badge({ variant, dot = false, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANT_CLASSES[variant],
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
