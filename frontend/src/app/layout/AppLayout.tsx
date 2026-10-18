import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useClubs } from '../../features/clubs/use-clubs';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { breadcrumbFor } from './navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const SIDEBAR_ID = 'app-sidebar';
const DESKTOP_QUERY = '(min-width: 64rem)';

/**
 * Estrutura comum das telas (Figma J01): menu lateral fixo e painel com topo e conteúdo.
 * Em telas largas o botão do topo recolhe o menu para 48 px; nas estreitas, abre o menu
 * por cima do conteúdo.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const { refreshAll } = useDataRefresh();
  const clubs = useClubs();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const clubNameById = useMemo(
    () => new Map((clubs.data ?? []).map((club) => [club.id, club.name])),
    [clubs.data],
  );
  const breadcrumb = breadcrumbFor(pathname, clubNameById);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const toggleSidebar = () => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((current) => !current);
    } else {
      setMobileOpen((current) => !current);
    }
  };
  const closeMobileSidebar = () => setMobileOpen(false);

  return (
    <div className="flex h-dvh bg-sidebar">
      <div className="hidden lg:flex">
        <Sidebar id={SIDEBAR_ID} collapsed={collapsed} clubs={clubs} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-overlay"
            onClick={closeMobileSidebar}
          />
          <div className="relative h-full shadow-lg">
            <Sidebar collapsed={false} clubs={clubs} onNavigate={closeMobileSidebar} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-2 lg:pl-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background shadow-sm">
          <Topbar
            sidebarId={SIDEBAR_ID}
            breadcrumb={breadcrumb}
            onToggleSidebar={toggleSidebar}
            onRefresh={refreshAll}
          />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 px-4 pt-7 pb-10 sm:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
