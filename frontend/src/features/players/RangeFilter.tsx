import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { cx } from '../../shared/lib/cx';
import type { Range, RangeErrors, RangeResult } from './player-filters';

type RangeFilterProps = {
  label: string;
  icon: LucideIcon;
  /** Texto do botão com a faixa aplicada; sem faixa, o botão mostra o rótulo. */
  appliedText?: string;
  value: Range;
  hint: string;
  inputMode: 'numeric' | 'decimal';
  parse: (minText: string, maxText: string) => RangeResult;
  onApply: (range: Range) => void;
};

/** Largura do painel (w-72); usada para abrir pelo lado que cabe na tela. */
const PANEL_WIDTH_PX = 288;

/**
 * Filtro de faixa em popover (Figma: "Filtro faixa de idade (Popover)" e "faixa de valor de
 * mercado"). Valida os limites de um campo antes de aplicar; Esc ou clique fora fecham.
 * O painel abre alinhado pela direita do botão quando não cabe à direita.
 */
export function RangeFilter({ label, icon: Icon, appliedText, ...panelProps }: RangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const { left } = triggerRef.current.getBoundingClientRect();
      setAlignEnd(left + PANEL_WIDTH_PX > window.innerWidth);
    }
    setOpen((current) => !current);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className={cx('whitespace-nowrap', !appliedText && 'text-muted-foreground')}>
          {appliedText ?? label}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <RangePanel
          id={panelId}
          label={label}
          alignEnd={alignEnd}
          {...panelProps}
          onApply={(range) => {
            panelProps.onApply(range);
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
}

type RangePanelProps = Omit<RangeFilterProps, 'icon' | 'appliedText'> & {
  id: string;
  alignEnd: boolean;
  onClose: () => void;
};

function RangePanel({
  id,
  label,
  alignEnd,
  value,
  hint,
  inputMode,
  parse,
  onApply,
  onClose,
}: RangePanelProps) {
  const [minText, setMinText] = useState(toInputText(value.min));
  const [maxText, setMaxText] = useState(toInputText(value.max));
  const [errors, setErrors] = useState<RangeErrors>({});
  const minId = useId();
  const maxId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = parse(minText, maxText);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onApply(result.range);
  };

  return (
    <form
      id={id}
      role="dialog"
      aria-label={`Filtrar por ${label.toLocaleLowerCase('pt-BR')}`}
      noValidate
      onSubmit={submit}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className={cx(
        'fixed inset-x-4 z-20 mt-2 flex flex-col gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md',
        'sm:absolute sm:inset-x-auto sm:w-72',
        alignEnd ? 'sm:right-0' : 'sm:left-0',
      )}
    >
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-2 gap-2">
        <RangeField
          id={minId}
          label="Mínimo"
          value={minText}
          error={errors.min}
          inputMode={inputMode}
          onChange={setMinText}
          autoFocus
        />
        <RangeField
          id={maxId}
          label="Máximo"
          value={maxText}
          error={errors.max}
          inputMode={inputMode}
          onChange={setMaxText}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onApply({})}>
          Limpar
        </Button>
        <Button type="submit" size="sm">
          Aplicar
        </Button>
      </div>
    </form>
  );
}

type RangeFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  inputMode: 'numeric' | 'decimal';
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

function RangeField({ id, label, value, error, inputMode, onChange, autoFocus }: RangeFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Valor guardado no formato da API ("10.5") mostrado com vírgula na edição ("10,5"). */
function toInputText(value: string | undefined): string {
  return value?.replace('.', ',') ?? '';
}
