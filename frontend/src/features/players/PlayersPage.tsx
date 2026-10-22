import { ArrowLeft, Plus, SearchX, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { useClubList } from '../clubs/clubs-context';
import type { PageMeta } from './api';
import { PlayerDialogs, type PlayerDialogState } from './PlayerDialogs';
import { PlayersFilters } from './PlayersFilters';
import { PlayersPagination } from './PlayersPagination';
import { PlayersTable } from './PlayersTable';
import { PlayersTableToolbar } from './PlayersTableToolbar';
import { usePlayerList } from './use-player-list';

/** Estado de navegação vindo do botão “Comprar jogadores” da página do clube. */
export type PlayersPageState = { buyerClubId?: number };

/**
 * Tela de jogadores (Figma J01–J16 e estados E01–E03): lista por `GET /players` e as ações
 * de cadastro, edição, condição e exclusão. Depois de cada ação gravada, `refreshAll` recarrega
 * as consultas pela API, mantendo busca, filtros, ordenação e página.
 */
export function PlayersPage() {
  const buyerClubId = (useLocation().state as PlayersPageState | null)?.buyerClubId;
  const list = usePlayerList(buyerClubId === undefined ? {} : { free: true });
  const clubs = useClubList();
  const clubsById = useMemo(
    () => new Map((clubs.data ?? []).map((club) => [club.id, club])),
    [clubs.data],
  );
  const { data, error, isLoading, retry } = list.players;
  const { refreshAll } = useDataRefresh();
  const [dialog, setDialog] = useState<PlayerDialogState | null>(null);
  const [highlightedId, setHighlightedId] = useState<number>();

  const handleDeleted = () => {
    const onlyRowOfLastPage = data?.data.length === 1 && list.page > 1;
    if (onlyRowOfLastPage) {
      list.goToPage(list.page - 1);
    }
    refreshAll();
  };

  const buyerClub = buyerClubId === undefined ? undefined : clubsById.get(buyerClubId);

  const handleRefused = (refusal: ApiError) => {
    if (refusal.status === 404 || refusal.status === 409) {
      refreshAll();
    }
  };

  return (
    <>
      <PageHeader
        icon={Users}
        title="Jogadores"
        description="Cadastre jogadores, acompanhe os indicadores e compre os que estão livres."
        actions={
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus aria-hidden="true" />
            Novo jogador
          </Button>
        }
      />
      {buyerClub && (
        <Alert variant="info" title={`Comprando para o ${buyerClub.name}`}>
          A lista abriu nos jogadores livres. Em “Comprar”, o {buyerClub.name} já vem escolhido.
        </Alert>
      )}
      <PlayersFilters
        filters={list.filters}
        onChange={list.updateFilters}
        onClear={list.clearFilters}
        searchText={list.searchText}
        onSearchTextChange={list.setSearchText}
        search={list.search}
        searchTooShort={list.searchTooShort}
        hasFilters={list.hasFilters}
        clubs={clubs}
        clubsById={clubsById}
      />
      <Card className="overflow-hidden">
        <PlayersTableToolbar
          free={list.filters.free}
          hasClubFilter={list.filters.clubId !== undefined}
          total={data?.meta.total_items}
          sort={list.filters.sort}
          onFreeChange={(free) => list.updateFilters({ free })}
          onSortChange={(sort) => list.updateFilters({ sort })}
        />
        <PlayersTable
          players={data?.data}
          clubsById={clubsById}
          isLoading={isLoading}
          error={error}
          onRetry={retry}
          onAction={(kind, player) => setDialog({ kind, player })}
          highlightedId={highlightedId}
          empty={
            <EmptyPlayers
              meta={data?.meta}
              search={list.search}
              hasFilters={list.hasFilters}
              onClear={list.clearFilters}
              onGoToPage={list.goToPage}
            />
          }
        />
        {data && data.data.length > 0 && !error && (
          <PlayersPagination
            meta={data.meta}
            shownCount={data.data.length}
            onPageChange={list.goToPage}
          />
        )}
      </Card>
      <p className="text-xs text-muted-foreground">
        Overall e valor de mercado são calculados pela API a cada consulta. A busca ignora
        maiúsculas, minúsculas e acentos.
      </p>
      <PlayerDialogs
        dialog={dialog}
        onDialogChange={setDialog}
        onPlayerSaved={(player) => {
          setHighlightedId(player.id);
          refreshAll();
        }}
        onPurchased={(result) => {
          setHighlightedId(result.player_id);
          refreshAll();
        }}
        onPlayerDeleted={handleDeleted}
        onRefused={handleRefused}
        buyerClubId={buyerClub?.id}
      />
    </>
  );
}

type EmptyPlayersProps = {
  meta: PageMeta | undefined;
  search: string;
  hasFilters: boolean;
  onClear: () => void;
  onGoToPage: (page: number) => void;
};

/** Lista vazia: banco sem jogadores, filtros sem resultado ou página além da última (RN07). */
function EmptyPlayers({ meta, search, hasFilters, onClear, onGoToPage }: EmptyPlayersProps) {
  if (meta && meta.total_items > 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Esta página não tem jogadores"
        description={`A lista tem ${meta.total_pages} ${meta.total_pages === 1 ? 'página' : 'páginas'}.`}
        action={
          <Button variant="outline" onClick={() => onGoToPage(meta.total_pages)}>
            <ArrowLeft aria-hidden="true" />
            Ir para a página {meta.total_pages}
          </Button>
        }
      />
    );
  }
  if (hasFilters) {
    return (
      <EmptyState
        icon={SearchX}
        title={search ? `Nenhum jogador encontrado para “${search}”` : 'Nenhum jogador encontrado'}
        description="Confira a grafia ou tire alguns filtros. A busca ignora maiúsculas, minúsculas e acentos."
        action={
          <Button variant="outline" onClick={onClear}>
            <X aria-hidden="true" />
            Limpar filtros
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Users}
      title="Nenhum jogador cadastrado"
      description="Os jogadores cadastrados aparecem aqui, com overall e valor de mercado calculados pela API."
    />
  );
}
