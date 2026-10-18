import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { clubPath } from '../../app/layout/navigation';
import type { Club } from '../clubs/api';
import { Badge } from '../../shared/components/Badge';
import { DataTable, type Column } from '../../shared/components/DataTable';
import type { ApiError } from '../../shared/api/http-client';
import { formatMoney } from '../../shared/lib/format';
import { cx } from '../../shared/lib/cx';
import type { Player } from './api';
import { ConditionBadge } from './ConditionBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { POSITION_LABELS } from './player-labels';

/**
 * Cor da barra de agilidade (Figma J01): as mesmas faixas da RN03 (até 30 e a partir de 80).
 * É só apresentação do número recebido; nenhum valor é calculado com elas.
 */
const AGILITY_LOW_MAX = 30;
const AGILITY_HIGH_MIN = 80;

function agilityBarClass(agility: number): string {
  if (agility <= AGILITY_LOW_MAX) {
    return 'bg-destructive';
  }
  return agility >= AGILITY_HIGH_MIN ? 'bg-success' : 'bg-muted-foreground';
}

type PlayersTableProps = {
  players: Player[] | undefined;
  clubsById: Map<number, Club>;
  isLoading: boolean;
  error: ApiError | undefined;
  onRetry: () => void;
  empty: ReactNode;
};

/** Tabela de jogadores com as 9 colunas obrigatórias, na ordem e no estilo do frame J01. */
export function PlayersTable({
  players,
  clubsById,
  isLoading,
  error,
  onRetry,
  empty,
}: PlayersTableProps) {
  const columns: Column<Player>[] = [
    {
      key: 'name',
      header: 'Jogador',
      cell: (player) => (
        <div className="flex items-center gap-3">
          <PlayerAvatar id={player.id} name={player.name} />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{player.name}</span>
            <span className="text-xs text-muted-foreground">
              {POSITION_LABELS[player.position]}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Posição',
      widthClass: 'w-20',
      cell: (player) => <Badge variant="outline">{player.position}</Badge>,
    },
    {
      key: 'overall',
      header: 'Overall',
      align: 'right',
      widthClass: 'w-16',
      cell: (player) => <span className="font-semibold">{player.overall}</span>,
    },
    {
      key: 'agility',
      header: 'Agilidade',
      align: 'right',
      widthClass: 'w-24',
      cell: (player) => (
        <div className="flex items-center justify-end gap-2">
          {player.agility}
          <span aria-hidden="true" className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
            <span
              className={cx('block h-full rounded-full', agilityBarClass(player.agility))}
              style={{ width: `${player.agility}%` }}
            />
          </span>
        </div>
      ),
    },
    {
      key: 'age',
      header: 'Idade',
      align: 'right',
      widthClass: 'w-14',
      cell: (player) => player.age,
    },
    {
      key: 'condition',
      header: 'Condição',
      widthClass: 'w-36',
      cell: (player) => <ConditionBadge condition={player.condition} />,
    },
    {
      key: 'base_value',
      header: 'Valor base',
      align: 'right',
      widthClass: 'w-24',
      cell: (player) => (
        <span className="text-muted-foreground">{formatMoney(player.base_value)}</span>
      ),
    },
    {
      key: 'market_value',
      header: 'Valor de mercado',
      align: 'right',
      widthClass: 'w-36',
      cell: (player) => <span className="font-semibold">{formatMoney(player.market_value)}</span>,
    },
    {
      key: 'club',
      header: 'Clube',
      widthClass: 'w-44',
      cell: (player) => <ClubCell clubId={player.club_id} clubsById={clubsById} />,
    },
  ];

  return (
    <DataTable
      caption="Jogadores"
      columns={columns}
      rows={players}
      rowKey={(player) => player.id}
      isLoading={isLoading}
      loadingLabel="Carregando jogadores…"
      error={error}
      errorTitle="Não foi possível carregar os jogadores"
      onRetry={onRetry}
      empty={empty}
    />
  );
}

/** "Livre" sem clube; com clube, sigla e nome com link para a página do clube. */
function ClubCell({ clubId, clubsById }: { clubId: number | null; clubsById: Map<number, Club> }) {
  if (clubId === null) {
    return <Badge variant="secondary">Livre</Badge>;
  }
  const club = clubsById.get(clubId);
  return (
    <span className="flex items-center gap-2">
      {club && (
        <span className="rounded-sm bg-muted px-1 text-xs font-medium" aria-hidden="true">
          {club.acronym}
        </span>
      )}
      <Link
        to={clubPath(clubId)}
        className="rounded-sm underline underline-offset-2 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {club?.name ?? `Clube ${clubId}`}
      </Link>
    </span>
  );
}
