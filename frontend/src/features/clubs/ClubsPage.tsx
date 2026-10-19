import { ArrowUpDown, Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ApiError } from '../../shared/api/http-client';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { PageHeader } from '../../shared/components/PageHeader';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { useToast } from '../../shared/hooks/toast';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { formatMoney, lowerFirst } from '../../shared/lib/format';
import { CLUB_SORTS, type Club, type ClubSort } from './api';
import { CLUB_SORT_LABELS, MAX_CLUBS, parseClubSort } from './club-labels';
import { useClubList } from './clubs-context';
import { ClubsTable } from './ClubsTable';
import { CreateClubDialog } from './CreateClubDialog';
import { useClubs } from './use-clubs';

/**
 * Tela de clubes (Figma C01–C04 e C09): lista de `GET /clubs` e cadastro por `POST /clubs`.
 * A ordenação fica na URL (`?sort=`) e é feita pela API. Por nome, a tela usa a mesma
 * consulta do menu lateral; por patrimônio, faz a própria consulta com `sort`.
 */
export function ClubsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = parseClubSort(searchParams.get('sort'));
  const sharedClubs = useClubList();
  const { refreshAll } = useDataRefresh();
  const showToast = useToast();
  const [creating, setCreating] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number>();

  const changeSort = (next: ClubSort) =>
    setSearchParams(next === 'name' ? {} : { sort: next }, { replace: true });

  const handleCreated = (club: Club) => {
    setCreating(false);
    setHighlightedId(club.id);
    refreshAll();
    showToast({
      variant: 'success',
      title: 'Clube criado',
      description: `${club.name} (${club.acronym}) começa com ${formatMoney(club.cash)} em caixa, valor do elenco de ${formatMoney(club.squad_value)} e patrimônio de ${formatMoney(club.net_worth)}.`,
    });
  };

  const handleRefused = (refusal: ApiError) => {
    if (refusal.status === 409) {
      refreshAll();
    }
  };

  const cardProps = {
    onSortChange: changeSort,
    onCreate: () => setCreating(true),
    highlightedId,
  };

  return (
    <>
      <PageHeader
        icon={Shield}
        title="Clubes"
        description={`Cada clube começa com 300,00 em caixa e sem jogadores. A liga aceita no máximo ${MAX_CLUBS} clubes.`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Novo clube
          </Button>
        }
      />
      {sort === 'name' ? (
        <ClubsCard clubs={sharedClubs} sort={sort} {...cardProps} />
      ) : (
        <SortedClubsCard sort={sort} {...cardProps} />
      )}
      <p className="text-xs text-muted-foreground">
        Caixa, valor do elenco e patrimônio vêm da API. Clubes pelo nome por padrão ou pelo
        patrimônio, com empate desfeito pelo nome.
      </p>
      {creating && (
        <CreateClubDialog
          clubCount={sharedClubs.data?.length}
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
          onRefused={handleRefused}
        />
      )}
    </>
  );
}

type ClubsCardProps = {
  clubs: ApiQuery<Club[]>;
  sort: ClubSort;
  onSortChange: (sort: ClubSort) => void;
  onCreate: () => void;
  highlightedId: number | undefined;
};

/** Ordenação por patrimônio: consulta própria `GET /clubs?sort=…`, refeita a cada `refreshAll`. */
function SortedClubsCard(props: Omit<ClubsCardProps, 'clubs'>) {
  const clubs = useClubs(props.sort);
  return <ClubsCard clubs={clubs} {...props} />;
}

function ClubsCard({ clubs, sort, onSortChange, onCreate, highlightedId }: ClubsCardProps) {
  const count = clubs.data?.length;

  return (
    <Card className="overflow-hidden">
      {count !== 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 font-medium">
            {count === undefined ? 'Clubes' : `${count} ${count === 1 ? 'clube' : 'clubes'}`}
            {count !== undefined && (
              <Badge variant="secondary">
                {count} de {MAX_CLUBS}
              </Badge>
            )}
          </p>
          <FilterSelect
            label="Ordenar por"
            icon={ArrowUpDown}
            value={sort}
            selectedText={`Ordenar: ${lowerFirst(CLUB_SORT_LABELS[sort])}`}
            options={CLUB_SORTS.map((option) => ({
              value: option,
              label: CLUB_SORT_LABELS[option],
            }))}
            onChange={(value) => onSortChange(parseClubSort(value))}
          />
        </div>
      )}
      <ClubsTable
        clubs={clubs}
        highlightedId={highlightedId}
        empty={
          <EmptyState
            icon={Shield}
            title="Nenhum clube cadastrado"
            description="Crie o primeiro clube com nome e sigla. Ele começa com 300,00 em caixa e sem jogadores."
            action={
              <Button variant="outline" onClick={onCreate}>
                <Plus aria-hidden="true" />
                Novo clube
              </Button>
            }
          />
        }
      />
    </Card>
  );
}
