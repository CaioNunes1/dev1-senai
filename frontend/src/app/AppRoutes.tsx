import { Navigate, Route, Routes } from 'react-router';
import { ClubDetailPage } from '../features/clubs/ClubDetailPage';
import { ClubsPage } from '../features/clubs/ClubsPage';
import { MatchesPage } from '../features/league/MatchesPage';
import { StandingsPage } from '../features/league/StandingsPage';
import { PlayersPage } from '../features/players/PlayersPage';
import { AppLayout } from './layout/AppLayout';
import { ROUTES } from './layout/navigation';

/** Rotas declarativas (React Router no modo biblioteca). A tela inicial do mockup é opcional. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={ROUTES.players} replace />} />
        <Route path={ROUTES.players} element={<PlayersPage />} />
        <Route path={ROUTES.clubs} element={<ClubsPage />} />
        <Route path={ROUTES.clubDetail} element={<ClubDetailPage />} />
        <Route path={ROUTES.matches} element={<MatchesPage />} />
        <Route path={ROUTES.standings} element={<StandingsPage />} />
        <Route path="*" element={<Navigate to={ROUTES.players} replace />} />
      </Route>
    </Routes>
  );
}
