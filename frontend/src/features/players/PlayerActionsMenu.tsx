import { Ellipsis, HeartPulse, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../shared/components/Button';
import { cx } from '../../shared/lib/cx';
import type { Player } from './api';

export type PlayerAction = 'edit' | 'condition' | 'delete';

type MenuItem = {
  action: PlayerAction;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  note?: string;
  destructive?: boolean;
};

const MENU_WIDTH_PX = 224;
const GAP_PX = 4;

type Position = { top: number; left: number; openUp: boolean };

/**
 * Menu de ações da linha (Figma J08): Editar, Alterar condição e Excluir. Abre num portal com
 * posição fixa, para não ser cortado pela rolagem da tabela; setas, Home/End, Esc e Tab
 * funcionam; fecha ao escolher, ao clicar fora ou ao rolar a página.
 */
export function PlayerActionsMenu({
  player,
  onAction,
}: {
  player: Player;
  onAction: (action: PlayerAction, player: Player) => void;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isFree = player.club_id === null;

  const items: MenuItem[] = [
    { action: 'edit', label: 'Editar', icon: Pencil },
    { action: 'condition', label: 'Alterar condição', icon: HeartPulse },
    {
      action: 'delete',
      label: 'Excluir',
      icon: Trash2,
      destructive: true,
      disabled: !isFree,
      note: isFree
        ? 'Disponível porque o jogador está livre.'
        : 'Só jogador livre pode ser excluído; este está num clube.',
    },
  ];

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const openUp = rect.bottom + 200 > window.innerHeight;
    setPosition({
      top: openUp ? rect.top - GAP_PX : rect.bottom + GAP_PX,
      left: Math.max(8, rect.right - MENU_WIDTH_PX),
      openUp,
    });
  };

  const close = (returnFocus: boolean) => {
    setPosition(null);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!position) {
      return;
    }
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setPosition(null);
      }
    };
    const closeOnScroll = () => setPosition(null);
    document.addEventListener('mousedown', closeOnOutside);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [position]);

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const enabled = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ??
        []),
    ];
    const index = enabled.indexOf(document.activeElement as HTMLElement);
    const moves: Record<string, number> = {
      ArrowDown: (index + 1) % enabled.length,
      ArrowUp: (index - 1 + enabled.length) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      enabled[moves[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const choose = (action: PlayerAction) => {
    close(true);
    onAction(action, player);
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="iconSm"
        aria-label={`Ações de ${player.name}`}
        aria-haspopup="menu"
        aria-expanded={position !== null}
        aria-controls={position ? menuId : undefined}
        onClick={() => (position ? close(false) : open())}
      >
        <Ellipsis aria-hidden="true" />
      </Button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Ações de ${player.name}`}
            onKeyDown={onMenuKeyDown}
            style={{ top: position.top, left: position.left }}
            className={cx(
              'fixed z-40 flex w-56 flex-col rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md',
              position.openUp && '-translate-y-full',
            )}
          >
            <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{player.name}</p>
            {items.map((item) => (
              <div key={item.action}>
                {item.destructive && <div role="separator" className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-describedby={item.note ? `${menuId}-${item.action}` : undefined}
                  onClick={() => choose(item.action)}
                  className={cx(
                    'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none',
                    'hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                    item.destructive && 'text-destructive',
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4 shrink-0" />
                  {item.label}
                </button>
                {item.note && (
                  <p
                    id={`${menuId}-${item.action}`}
                    className="px-2 pb-1.5 pl-8 text-xs text-muted-foreground"
                  >
                    {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
