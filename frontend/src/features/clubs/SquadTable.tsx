import { Check, HandCoins, Shirt } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import {
  formatBrasiliaDateTime,
  formatInteger,
  formatMoney,
  formatPercent,
} from '../../shared/lib/format';
import { ConditionBadge } from '../players/ConditionBadge';
import { PlayerAvatar } from '../players/PlayerAvatar';
import { POSITION_LABELS } from '../players/player-labels';
import type { ClubDetail, ContractSummary, SquadPlayer } from './api';
import { MAX_SQUAD_SIZE } from './club-labels';

/** Cor do % de multa (Figma C05): sem multa em verde, a maior faixa (20%) em vermelho. */
const HIGHEST_PENALTY_RATE = 20;

function penaltyVariant(rate: number): BadgeVariant {
  if (rate === 0) {
    return 'success';
  }
  return rate >= HIGHEST_PENALTY_RATE ? 'destructive' : 'warning';
}

/** Coluna do contrato; jogador sem contrato ativo mostra um traço. */
function contractCell(render: (contract: ContractSummary) => ReactNode) {
  return (player: SquadPlayer) =>
    player.contract ? (
      render(player.contract)
    ) : (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sem contrato ativo</span>
      </span>
    );
}

const COLUMNS: Column<SquadPlayer>[] = [
  {
    key: 'name',
    header: 'Jogador',
    cell: (player) => (
      <div className="flex items-center gap-3">
        <PlayerAvatar id={player.id} name={player.name} />
        <span className="font-medium whitespace-normal text-foreground">{player.name}</span>
      </div>
    ),
  },
  {
    key: 'position',
    header: 'Posição',
    cell: (player) => (
      <Badge variant="outline">
        <abbr title={POSITION_LABELS[player.position]} className="no-underline">
          {player.position}
        </abbr>
      </Badge>
    ),
  },
  {
    key: 'overall',
    header: 'Overall',
    align: 'right',
    widthClass: 'w-16',
    cell: (player) => <span className="font-semibold">{player.overall}</span>,
  },
  {
    key: 'condition',
    header: 'Condição',
    cell: (player) => <ConditionBadge condition={player.condition} />,
  },
  {
    key: 'market_value',
    header: 'Valor de mercado',
    align: 'right',
    cell: (player) => <span className="font-semibold">{formatMoney(player.market_value)}</span>,
  },
  {
    key: 'purchase_value',
    header: 'Valor de compra',
    align: 'right',
    cell: contractCell((contract) => (
      <span className="text-muted-foreground">{formatMoney(contract.purchase_value)}</span>
    )),
  },
  {
    key: 'loyalty_until',
    header: 'Fim da fidelidade',
    cell: contractCell((contract) => {
      const { date, time } = formatBrasiliaDateTime(contract.loyalty_until);
      return (
        <time dateTime={contract.loyalty_until} className="flex flex-col">
          <span>{date}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </time>
      );
    }),
  },
  {
    key: 'remaining_days',
    header: 'Dias restantes',
    align: 'right',
    cell: contractCell((contract) => formatInteger(contract.remaining_days)),
  },
  {
    key: 'penalty_rate',
    header: '% de multa',
    cell: contractCell((contract) => (
      <Badge variant={penaltyVariant(contract.penalty_rate)}>
        {contract.penalty_rate === 0 && <Check aria-hidden="true" className="size-3" />}
        {formatPercent(contract.penalty_rate)}
      </Badge>
    )),
  },
];

/**
 * Elenco do clube (Figma C05): jogadores na ordem da API (RN11: GOL → ATA, depois nome e id)
 * e o contrato ativo de cada um, com fim da fidelidade, dias restantes e % de multa
 * calculados pela API no momento da consulta (RN15), e o botão "Vender" de cada jogador.
 */
export function SquadTable({
  club,
  onSell,
}: {
  club: ApiQuery<ClubDetail>;
  /** Abre a confirmação da venda (Figma V01). */
  onSell: (player: SquadPlayer) => void;
}) {
  const columns: Column<SquadPlayer>[] = [
    ...COLUMNS,
    {
      key: 'actions',
      header: 'Ações',
      headerHidden: true,
      align: 'right',
      cell: (player) => (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Vender ${player.name}`}
          onClick={() => onSell(player)}
        >
          <HandCoins aria-hidden="true" />
          Vender
        </Button>
      ),
    },
  ];
  return (
    <DataTable
      caption="Elenco"
      columns={columns}
      rows={club.data?.players}
      rowKey={(player) => player.id}
      isLoading={club.isLoading}
      loadingLabel="Carregando elenco…"
      error={club.error}
      errorTitle="Não foi possível carregar o elenco"
      onRetry={club.retry}
      skeletonRows={4}
      empty={
        <EmptyState
          icon={Shirt}
          title="Nenhum jogador no elenco"
          description={`Este clube ainda não possui jogadores. O elenco aceita até ${MAX_SQUAD_SIZE} jogadores.`}
        />
      }
    />
  );
}
