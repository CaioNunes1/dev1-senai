import { Badge } from '../../shared/components/Badge';
import { formatMoney } from '../../shared/lib/format';
import type { Player } from './api';
import { ConditionBadge } from './ConditionBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { POSITION_LABELS } from './player-labels';

/**
 * Cartão com o jogador da ação (Figma J10, J13 e M01): avatar, posição, idade e, à direita,
 * a condição, a situação ou o valor de mercado da consulta mais recente.
 */
export function PlayerSummary({
  player,
  show,
}: {
  player: Player;
  show: 'condition' | 'club' | 'value';
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted-subtle p-3">
      <PlayerAvatar id={player.id} name={player.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{player.name}</span>
        <span className="text-xs text-muted-foreground">
          {player.position} · {POSITION_LABELS[player.position]} · {player.age} anos
        </span>
      </div>
      {show === 'condition' && <ConditionBadge condition={player.condition} />}
      {show === 'club' && (
        <Badge variant="secondary">{player.club_id === null ? 'Livre' : 'Em clube'}</Badge>
      )}
      {show === 'value' && (
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-xs text-muted-foreground">Valor de mercado</span>
          <span className="text-heading-card">{formatMoney(player.market_value)}</span>
        </span>
      )}
    </div>
  );
}
