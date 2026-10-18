import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

/** Variantes do componente Alert do Figma (02 · Componentes, nó 6:978). */
const VARIANTS = {
  info: { icon: Info, classes: 'border-border bg-muted-subtle text-foreground' },
  warning: {
    icon: TriangleAlert,
    classes: 'border-warning-soft-border bg-warning-soft text-warning-soft-foreground',
  },
  destructive: {
    icon: CircleAlert,
    classes: 'border-destructive-soft-border bg-destructive-soft text-destructive-soft-foreground',
  },
} as const;

type AlertProps = {
  variant: keyof typeof VARIANTS;
  title: string;
  children?: ReactNode;
};

/** Aviso dentro de uma tela ou diálogo; o destrutivo é anunciado na hora (role="alert"). */
export function Alert({ variant, title, children }: AlertProps) {
  const { icon: Icon, classes } = VARIANTS[variant];
  return (
    <div
      role={variant === 'destructive' ? 'alert' : undefined}
      className={cx('flex gap-2 rounded-lg border px-3 py-2.5 text-sm', classes)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
