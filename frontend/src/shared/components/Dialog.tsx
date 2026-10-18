import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Button } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_CLASSES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

type DialogProps = {
  title: string;
  description?: ReactNode;
  /** Ícone ou destaque acima do título (ex.: sucesso no J07). */
  header?: ReactNode;
  children?: ReactNode;
  /** Aviso sempre visível acima do rodapé (ex.: `message` de uma recusa da API). */
  notice?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  onClose: () => void;
  /** Impede fechar (Esc, X, fundo) enquanto uma ação está sendo enviada. */
  closeDisabled?: boolean;
};

/**
 * Diálogo modal (Figma J05, J09, J10, J13): título, descrição, conteúdo e rodapé de ações.
 * Abre num portal por cima da tela, prende o foco (Tab/Shift+Tab), fecha com Esc, com o X ou
 * clicando fora, e devolve o foco para quem o abriu. Título, aviso e rodapé ficam fixos; só o
 * conteúdo rola quando o diálogo não cabe na tela (ex.: cadastro em 1366 × 768).
 */
export function Dialog({
  title,
  description,
  header,
  children,
  notice,
  footer,
  size = 'md',
  onClose,
  closeDisabled = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    closeRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0];
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!closeDisabledRef.current) {
          closeRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          'relative flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-lg',
          SIZE_CLASSES[size],
        )}
      >
        <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
          {header}
          <h2 id={titleId} className="pr-8 text-heading-dialog">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-1 text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        {children && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 pb-1 sm:px-6">
            {children}
          </div>
        )}
        {notice && <div className="shrink-0 px-5 pt-3 sm:px-6">{notice}</div>}
        {footer && (
          <div className="mx-5 mt-4 mb-5 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-4 sm:mx-6 sm:mb-6">
            {footer}
          </div>
        )}
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Fechar janela"
          disabled={closeDisabled}
          onClick={onClose}
          className="absolute top-3 right-3"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
