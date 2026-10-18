import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cx } from '../lib/cx';

type SelectOption = { value: string; label: string };

type FilterSelectProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  options: SelectOption[];
  /** Texto do botão quando há valor escolhido (ex.: "Condição: Apto"); sem valor, mostra o rótulo. */
  selectedText?: string;
  /** Rótulo da opção que limpa o filtro (valor vazio); sem ele, sempre há um valor escolhido. */
  allLabel?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * Filtro de seleção no formato do SelectTrigger do Figma (nó 6:866): ícone, texto e chevron.
 * Usa um `<select>` nativo transparente sobre o botão, que mantém teclado e leitores de tela.
 */
export function FilterSelect({
  label,
  icon: Icon,
  value,
  options,
  selectedText,
  allLabel,
  onChange,
  disabled = false,
  disabledReason,
}: FilterSelectProps) {
  return (
    <div
      title={disabled ? disabledReason : undefined}
      className={cx(
        'relative flex h-9 shrink-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        disabled && 'opacity-50',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span
        aria-hidden="true"
        className={cx('truncate', value === '' ? 'text-muted-foreground' : 'text-foreground')}
      >
        {value === '' ? label : (selectedText ?? label)}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
