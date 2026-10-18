import { Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import brandMark from '../../assets/brand-mark.svg';
import type { Club } from '../../features/clubs/api';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { cx } from '../../shared/lib/cx';
import { NAV_GROUPS, clubPath } from './navigation';

type SidebarProps = {
  id?: string;
  collapsed: boolean;
  clubs: ApiQuery<Club[]>;
  onNavigate?: () => void;
};

const ITEM_BASE =
  'flex h-8 items-center gap-2 rounded-md border text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const ITEM_ACTIVE = 'border-sidebar-border bg-background font-medium shadow-xs';
const ITEM_INACTIVE =
  'border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

/** Menu lateral (Figma: componente Sidebar, nós 9:17480 aberto e 9:18078 recolhido). */
export function Sidebar({ id, collapsed, clubs, onNavigate }: SidebarProps) {
  const itemLayout = collapsed ? 'size-8 justify-center' : 'px-2';

  return (
    <aside
      id={id}
      aria-label="Menu principal"
      className={cx(
        'flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-sidebar-collapsed items-center' : 'w-sidebar',
      )}
    >
      <div className={cx('flex items-center gap-2.5 py-3', collapsed ? 'px-2' : 'px-4')}>
        <img src={brandMark} alt="" width={32} height={32} className="size-8 shrink-0" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Passe</span>
            <span className="text-xs text-muted-foreground">Gestão da liga</span>
          </div>
        )}
      </div>

      <nav aria-label="Seções" className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} label={group.label} collapsed={collapsed}>
            {group.items.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(ITEM_BASE, itemLayout, isActive ? ITEM_ACTIVE : ITEM_INACTIVE)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        aria-hidden="true"
                        className={cx('size-4 shrink-0', isActive && 'text-primary')}
                      />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </SidebarGroup>
        ))}

        <SidebarGroup label="Clubes" collapsed={collapsed}>
          <ClubShortcuts
            clubs={clubs}
            collapsed={collapsed}
            itemLayout={itemLayout}
            onNavigate={onNavigate}
          />
        </SidebarGroup>
      </nav>

      {!collapsed && (
        <div className="w-full p-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-sidebar-border bg-background p-3 text-xs text-muted-foreground shadow-xs">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            Horário de Brasília (UTC−3)
          </div>
        </div>
      )}
    </aside>
  );
}

type SidebarGroupProps = { label: string; collapsed: boolean; children: ReactNode };

function SidebarGroup({ label, collapsed, children }: SidebarGroupProps) {
  return (
    <section aria-label={label} className={cx('flex flex-col p-2', collapsed && 'items-center')}>
      {!collapsed && (
        <h2 className="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground">
          {label}
        </h2>
      )}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

type ClubShortcutsProps = {
  clubs: ApiQuery<Club[]>;
  collapsed: boolean;
  itemLayout: string;
  onNavigate?: () => void;
};

/** Atalhos para as páginas dos clubes, na ordem de `GET /clubs` (por nome). */
function ClubShortcuts({ clubs, collapsed, itemLayout, onNavigate }: ClubShortcutsProps) {
  const { data, error, isLoading, retry } = clubs;

  if (data === undefined) {
    if (collapsed) {
      return null;
    }
    if (error) {
      return (
        <li className="flex flex-col items-start gap-1 px-2 text-xs text-muted-foreground">
          <span role="alert">{error.message}</span>
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer font-medium text-foreground underline underline-offset-2"
          >
            Tentar de novo
          </button>
        </li>
      );
    }
    return isLoading ? (
      <li className="px-2 text-xs text-muted-foreground">Carregando clubes…</li>
    ) : null;
  }

  if (data.length === 0) {
    return collapsed ? null : (
      <li className="px-2 text-xs text-muted-foreground">Nenhum clube cadastrado.</li>
    );
  }

  return data.map((club) => (
    <li key={club.id}>
      <NavLink
        to={clubPath(club.id)}
        title={collapsed ? club.name : undefined}
        aria-label={collapsed ? club.name : undefined}
        onClick={onNavigate}
        className={({ isActive }) =>
          cx(ITEM_BASE, itemLayout, isActive ? ITEM_ACTIVE : ITEM_INACTIVE)
        }
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={cx(
                'flex size-5 shrink-0 items-center justify-center rounded-sm text-xs font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted text-foreground',
              )}
            >
              {club.acronym.charAt(0)}
            </span>
            {!collapsed && <span className="truncate">{club.name}</span>}
          </>
        )}
      </NavLink>
    </li>
  ));
}
