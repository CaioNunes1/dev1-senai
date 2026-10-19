import { cx } from '../lib/cx';

/** Variantes e tamanhos do componente Button do Figma (02 · Componentes, nó 6:509). */
const VARIANT_CLASSES = {
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
  outline: 'border border-border bg-background text-foreground shadow-xs hover:bg-accent',
  ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive-soft-foreground',
} as const;

const SIZE_CLASSES = {
  default: 'h-9 px-4 has-[>svg]:px-3',
  sm: 'h-8 px-3',
  icon: 'size-9',
  iconSm: 'size-8',
} as const;

export type ButtonStyle = {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
};

/** Classes do botão, também usadas por links com cara de botão (ex.: "Ver clube"). */
export function buttonClasses({ variant = 'primary', size = 'default' }: ButtonStyle = {}): string {
  return cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none',
    'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}
