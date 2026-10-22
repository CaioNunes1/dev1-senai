import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cx } from '../lib/cx';

/**
 * Seleção de formulário com o visual do Input/SelectTrigger do Figma (M01 "Clube comprador").
 * É um `<select>` nativo: teclado, leitor de tela e celular funcionam sem código próprio.
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cx(
          'h-9 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-sm text-foreground shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
