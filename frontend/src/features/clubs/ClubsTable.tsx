import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { clubPath } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { buttonClasses } from '../../shared/components/button-styles';
import { DataTable, type Column } from '../../shared/components/DataTable';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { formatMoney } from '../../shared/lib/format';
import type { Club } from './api';
import { ClubMonogram } from './ClubMonogram';

const COLUMNS: Column<Club>[] = [
  {
    key: 'name',
    header: 'Clube',
    cell: (club) => (
      <div className="flex items-center gap-3">
        <ClubMonogram acronym={club.acronym} />
        <span className="font-medium text-foreground">{club.name}</span>
      </div>
    ),
  },
  {
    key: 'acronym',
    header: 'Sigla',
    widthClass: 'w-24',
    cell: (club) => <Badge variant="outline">{club.acronym}</Badge>,
  },
  {
    key: 'cash',
    header: 'Caixa',
    align: 'right',
    widthClass: 'w-32',
    cell: (club) => formatMoney(club.cash),
  },
  {
    key: 'squad_value',
    header: 'Valor do elenco',
    align: 'right',
    widthClass: 'w-36',
    cell: (club) => formatMoney(club.squad_value),
  },
  {
    key: 'net_worth',
    header: 'Patrimônio',
    align: 'right',
    widthClass: 'w-36',
    cell: (club) => <span className="font-semibold">{formatMoney(club.net_worth)}</span>,
  },
  {
    key: 'details',
    header: 'Detalhes',
    headerHidden: true,
    align: 'right',
    widthClass: 'w-32',
    cell: (club) => (
      <Link
        to={clubPath(club.id)}
        aria-label={`Ver clube ${club.name}`}
        className={buttonClasses({ variant: 'ghost', size: 'sm' })}
      >
        Ver clube
        <ChevronRight aria-hidden="true" />
      </Link>
    ),
  },
];

type ClubsTableProps = {
  clubs: ApiQuery<Club[]>;
  empty: ReactNode;
  highlightedId: number | undefined;
};

/**
 * Tabela de clubes (Figma C01): nome, sigla, caixa, valor do elenco e patrimônio como a API
 * devolve, na ordem da resposta (sem paginação: a liga tem no máximo 20 clubes).
 */
export function ClubsTable({ clubs, empty, highlightedId }: ClubsTableProps) {
  return (
    <DataTable
      caption="Clubes"
      columns={COLUMNS}
      rows={clubs.data}
      rowKey={(club) => club.id}
      isLoading={clubs.isLoading}
      loadingLabel="Carregando clubes…"
      error={clubs.error}
      errorTitle="Não foi possível carregar os clubes"
      onRetry={clubs.retry}
      empty={empty}
      skeletonRows={6}
      isRowHighlighted={(club) => club.id === highlightedId}
    />
  );
}
