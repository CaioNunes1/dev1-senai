import { ChevronRight, Plus, Shield, Swords } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { matchDetailPath } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { PageHeader } from '../../shared/components/PageHeader';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { useToast } from '../../shared/hooks/toast';
import { formatBrasiliaDateTime } from '../../shared/lib/format';
import { useClubList } from '../clubs/clubs-context';
import { listMatches, type MatchSummary } from './api';
import { RESULT_BADGES, RESULT_LABELS } from './match-labels';
import { NewMatchDialog } from './NewMatchDialog';

const CLUB_PARAM = 'club_id';
const POSITIVE_INTEGER = /^[1-9]\d*$/;

const COLUMNS: Column<MatchSummary>[] = [
  {
    key: 'played_at',
    header: 'Data e hora',
    widthClass: 'w-40',
    cell: (match) => {
      const { date, time } = formatBrasiliaDateTime(match.played_at);
      return (
        <time dateTime={match.played_at} className="flex gap-2">
          <span>{date}</span>
          <span className="text-muted-foreground">{time}</span>
        </time>
      );
    },
  },
  {
    key: 'home',
    header: 'Mandante',
    align: 'right',
    cell: (match) => (
      <span className={match.result === 'MANDANTE' ? 'font-semibold' : undefined}>
        {match.home.club_name}
      </span>
    ),
  },
  {
    key: 'score',
    header: 'Placar',
    widthClass: 'w-20',
    cell: (match) => (
      <span className="flex justify-center">
        <span className="rounded-md bg-muted px-2 py-0.5 font-semibold">
          {match.home.goals} × {match.away.goals}
        </span>
      </span>
    ),
  },
  {
    key: 'away',
    header: 'Visitante',
    cell: (match) => (
      <span className={match.result === 'VISITANTE' ? 'font-semibold' : undefined}>
        {match.away.club_name}
      </span>
    ),
  },
  {
    key: 'result',
    header: 'Resultado',
    cell: (match) => (
      <Badge variant={RESULT_BADGES[match.result]}>{RESULT_LABELS[match.result]}</Badge>
    ),
  },
  {
    key: 'actions',
    header: 'Ações',
    headerHidden: true,
    align: 'right',
    cell: (match) => (
      <Link
        to={matchDetailPath(match.id)}
        aria-label={`Ver duelos de ${match.home.club_name} ${match.home.goals} × ${match.away.goals} ${match.away.club_name}`}
        className="inline-flex items-center gap-1 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ver duelos
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    ),
  },
];

/**
 * Tela de partidas (Figma L01/L02, RN21): "Nova partida" e o histórico da API, da mais recente
 * para a mais antiga, com filtro por clube na URL (`?club_id=`). "Ver duelos" abre a partida.
 */
export function MatchesPage() {
  const clubs = useClubList();
  const navigate = useNavigate();
  const showToast = useToast();
  const { refreshAll } = useDataRefresh();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const clubParam = searchParams.get(CLUB_PARAM) ?? '';
  const clubId = POSITIVE_INTEGER.test(clubParam) ? Number(clubParam) : undefined;
  const matches = useApiQuery(`matches?club=${clubId ?? ''}`, (signal) =>
    listMatches(clubId, signal),
  );
  const clubName = clubs.data?.find((club) => club.id === clubId)?.name;

  return (
    <>
      <PageHeader
        icon={Swords}
        title="Partidas"
        description="Jogue partidas entre clubes com os 5 titulares escalados e acompanhe o histórico."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Nova partida
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-heading-card">Histórico de partidas</h2>
            <p className="text-muted-foreground">Da mais recente para a mais antiga.</p>
          </div>
          <FilterSelect
            label="Clube"
            icon={Shield}
            value={clubId === undefined ? '' : String(clubId)}
            selectedText={`Clube: ${clubName ?? clubId}`}
            allLabel="Todos os clubes"
            options={(clubs.data ?? []).map((club) => ({
              value: String(club.id),
              label: club.name,
            }))}
            onChange={(value) =>
              setSearchParams(value === '' ? {} : { [CLUB_PARAM]: value }, { replace: true })
            }
          />
        </div>
        <div className="border-t border-border">
          <DataTable
            caption="Histórico de partidas"
            columns={COLUMNS}
            rows={matches.data}
            rowKey={(match) => match.id}
            isLoading={matches.isLoading}
            loadingLabel="Carregando partidas…"
            error={matches.error}
            errorTitle="Não foi possível carregar as partidas"
            onRetry={matches.retry}
            skeletonRows={4}
            empty={
              <EmptyState
                icon={Swords}
                title={
                  clubId === undefined ? 'Nenhuma partida jogada' : 'Nenhuma partida deste clube'
                }
                description={
                  clubId === undefined
                    ? 'Jogue a primeira partida: os dois clubes precisam da escalação completa.'
                    : `O ${clubName ?? 'clube'} ainda não jogou como mandante nem como visitante.`
                }
              />
            }
          />
          {matches.data && matches.data.length > 0 && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {matches.data.length} {matches.data.length === 1 ? 'partida' : 'partidas'}
            </p>
          )}
        </div>
      </Card>
      {creating && (
        <NewMatchDialog
          onClose={() => setCreating(false)}
          onPlayed={(match) => {
            setCreating(false);
            showToast({
              variant: 'success',
              title: 'Partida jogada',
              description: `${match.home.club_name} ${match.home.goals} × ${match.away.goals} ${match.away.club_name}. Placar e duelos devolvidos pela API.`,
            });
            refreshAll();
            void navigate(matchDetailPath(match.id));
          }}
        />
      )}
    </>
  );
}
