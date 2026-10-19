import { cx } from '../../shared/lib/cx';

const SIZE_CLASSES = {
  sm: 'size-9 rounded-md text-xs',
  lg: 'size-12 rounded-xl text-sm font-semibold',
} as const;

/** Sigla do clube num quadro (Figma C01 e C05); o mockup não tem escudos. Decorativo. */
export function ClubMonogram({
  acronym,
  size = 'sm',
}: {
  acronym: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center border border-border bg-muted font-medium text-foreground',
        SIZE_CLASSES[size],
      )}
    >
      {acronym}
    </span>
  );
}
