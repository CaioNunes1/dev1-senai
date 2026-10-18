import { ChevronRight, PanelLeft, RefreshCw } from 'lucide-react';

import { Link } from 'react-router';
import { Button } from '../../shared/components/Button';
import { cx } from '../../shared/lib/cx';
import type { Crumb } from './navigation';

type TopbarProps = {
  sidebarId: string;
  breadcrumb: Crumb[];
  onToggleSidebar: () => void;
  onRefresh: () => void;
};

/** Barra do topo do painel (Figma: frame Topbar de J01, nó 52:124988). */
export function Topbar({ sidebarId, breadcrumb, onToggleSidebar, onRefresh }: TopbarProps) {
  return (
    <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border px-4">
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Mostrar ou recolher o menu"
        aria-controls={sidebarId}
        onClick={onToggleSidebar}
      >
        <PanelLeft aria-hidden="true" />
      </Button>
      <div aria-hidden="true" className="h-4 w-px bg-border" />
      <nav aria-label="Trilha de navegação" className="min-w-0 flex-1 pl-1">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumb.map((crumb, index) => {
            const isCurrent = index === breadcrumb.length - 1;
            return (
              <li
                key={crumb.label}
                className={cx('flex items-center gap-2', isCurrent ? 'min-w-0' : 'shrink-0')}
              >
                {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />}
                {crumb.to && !isCurrent ? (
                  <Link
                    to={crumb.to}
                    className="rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cx(isCurrent && 'truncate text-foreground')}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <Button variant="ghost" size="iconSm" aria-label="Atualizar dados" onClick={onRefresh}>
        <RefreshCw aria-hidden="true" />
      </Button>
    </header>
  );
}
