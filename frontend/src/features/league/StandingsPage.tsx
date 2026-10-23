import { ListOrdered } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { getStandings, type Standing } from './api';

const number = (key: keyof Standing, header: string): Column<Standing> => ({
  key,
  header,
  align: 'right',
  widthClass: 'w-20',
  cell: (row) => row[key],
});

const COLUMNS: Column<Standing>[] = [
  {
    key: 'position',
    header: 'Posição',
    widthClass: 'w-20',
    cell: (row) => <span className="font-semibold">{row.position}º</span>,
  },
  {
    key: 'club_name',
    header: 'Clube',
    cell: (row) => <span className="font-medium whitespace-normal">{row.club_name}</span>,
  },
  number('played', 'Jogos'),
  number('wins', 'Vitórias'),
  number('draws', 'Empates'),
  number('losses', 'Derrotas'),
  number('goals_for', 'Gols marcados'),
  number('goals_against', 'Gols sofridos'),
  {
    key: 'goal_difference',
    header: 'Saldo',
    align: 'right',
    widthClass: 'w-20',
    cell: (row) => (row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference),
  },
  {
    key: 'points',
    header: 'Pontos',
    align: 'right',
    widthClass: 'w-20',
    cell: (row) => <span className="font-semibold">{row.points}</span>,
  },
];

/**
 * Classificação (Figma L05, RN21): todos os clubes, na ordem devolvida por `GET /standings`
 * (pontos, saldo, gols marcados e nome). A tela não ordena nem soma nada.
 */
export function StandingsPage() {
  const standings = useApiQuery('standings', (signal) => getStandings(signal));
  return (
    <>
      <PageHeader
        icon={ListOrdered}
        title="Classificação"
        description="Todos os clubes, com 3 pontos por vitória e 1 por empate. Desempate por saldo, gols marcados e nome."
      />
      <Card className="overflow-hidden">
        <DataTable
          caption="Classificação"
          columns={COLUMNS}
          rows={standings.data}
          rowKey={(row) => row.club_id}
          isLoading={standings.isLoading}
          loadingLabel="Carregando classificação…"
          error={standings.error}
          errorTitle="Não foi possível carregar a classificação"
          onRetry={standings.retry}
          skeletonRows={6}
          empty={
            <EmptyState
              icon={ListOrdered}
              title="Nenhum clube cadastrado"
              description="A classificação mostra todos os clubes, inclusive os que ainda não jogaram."
            />
          }
        />
      </Card>
    </>
  );
}
