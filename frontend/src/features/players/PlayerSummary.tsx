import { Badge } from '../../shared/components/Badge';
import type { Player } from './api';
import { ConditionBadge } from './ConditionBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { POSITION_LABELS } from './player-labels';

/** Cartão com o jogador da ação (Figma J10 e J13): avatar, posição, idade e situação. */
export function PlayerSummary({ player, show }: { player: Player; show: 'condition' | 'club' }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted-subtle p-3">
      <PlayerAvatar id={player.id} name={player.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{player.name}</span>
        <span className="text-xs text-muted-foreground">
          {player.position} · {POSITION_LABELS[player.position]} · {player.age} anos
        </span>
      </div>
      {show === 'condition' ? (
        <ConditionBadge condition={player.condition} />
      ) : (
        <Badge variant="secondary">{player.club_id === null ? 'Livre' : 'Em clube'}</Badge>
      )}
    </div>
  );
}
