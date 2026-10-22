import type { LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { tabIds } from './tab-ids';

type TabItem<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Contagem ao lado do rótulo (Figma: "Elenco 6"); sem ela, nada é mostrado. */
  count?: number;
  /** Aba visível, mas sem conteúdo ainda; o motivo aparece no rótulo e no `title`. */
  disabledReason?: string;
};

type TabsProps<K extends string> = {
  label: string;
  idPrefix: string;
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
};

/**
 * Abas do Figma (C05/H01): ícone, rótulo, contagem e sublinhado na ativa. Padrão de abas da
 * WAI-ARIA: só a ativa entra no Tab; setas, Home e End trocam de aba (pulando as desabilitadas).
 * Quem chama renderiza o painel com `role="tabpanel"` e os ids de `tabIds`.
 */
export function Tabs<K extends string>({ label, idPrefix, items, value, onChange }: TabsProps<K>) {
  const refs = useRef(new Map<K, HTMLButtonElement>());
  const enabled = items.filter((item) => item.disabledReason === undefined);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = enabled.findIndex((item) => item.key === value);
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % enabled.length,
      ArrowLeft: (index - 1 + enabled.length) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const next = enabled[target].key;
    onChange(next);
    refs.current.get(next)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex overflow-x-auto border-b border-border sm:gap-1"
    >
      {items.map((item) => {
        const selected = item.key === value;
        const disabled = item.disabledReason !== undefined;
        const ids = tabIds(idPrefix, item.key);
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            ref={(element) => {
              if (element) {
                refs.current.set(item.key, element);
              } else {
                refs.current.delete(item.key);
              }
            }}
            type="button"
            role="tab"
            id={ids.tab}
            aria-selected={selected}
            aria-controls={selected ? ids.panel : undefined}
            aria-disabled={disabled || undefined}
            title={item.disabledReason}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!disabled) {
                onChange(item.key);
              }
            }}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-1.5 py-2.5 sm:gap-2 sm:px-2 text-sm font-medium whitespace-nowrap outline-none',
              'focus-visible:ring-3 focus-visible:ring-ring/50',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
            {item.label}
            {item.count !== undefined && (
              <span
                className={cx(
                  'rounded-sm px-1.5 text-xs',
                  selected ? 'bg-primary-soft text-primary-soft-foreground' : 'bg-muted',
                )}
              >
                {item.count}
              </span>
            )}
            {disabled && (
              <span className="rounded-sm border border-border px-1 text-xs font-normal sm:px-1.5">
                Em breve
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
