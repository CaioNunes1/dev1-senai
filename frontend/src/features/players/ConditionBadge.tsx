import { Badge } from '../../shared/components/Badge';
import type { Condition } from './api';
import { CONDITION_BADGES, CONDITION_LABELS } from './player-labels';

/** Condição física com cor e texto (Figma: Badge Apto, Mal condicionado e Doente). */
export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge variant={CONDITION_BADGES[condition]} dot>
      {CONDITION_LABELS[condition]}
    </Badge>
  );
}
