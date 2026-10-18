import type { InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

/** Campo de texto do Figma (Input, nó 6:721): h-9, borda `input`, foco com anel, erro com aria-invalid. */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
