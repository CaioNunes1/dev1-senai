import type { ApiError } from '../../shared/api/http-client';
import { useToast } from '../../shared/hooks/toast';
import { formatMoney } from '../../shared/lib/format';
import type { Player } from './api';
import { ConditionDialog } from './ConditionDialog';
import { CreatedPlayerDialog } from './CreatedPlayerDialog';
import { CreatePlayerDialog } from './CreatePlayerDialog';
import { DeletePlayerDialog } from './DeletePlayerDialog';
import { EditPlayerDialog } from './EditPlayerDialog';
import { CONDITION_LABELS } from './player-labels';

export type PlayerDialogState =
  | { kind: 'create' }
  | { kind: 'created'; player: Player }
  | { kind: 'edit'; player: Player }
  | { kind: 'condition'; player: Player }
  | { kind: 'delete'; player: Player };

type PlayerDialogsProps = {
  dialog: PlayerDialogState | null;
  onDialogChange: (dialog: PlayerDialogState | null) => void;
  /** Depois de gravar: destacar a linha e recarregar as consultas pela API. */
  onPlayerSaved: (player: Player) => void;
  onPlayerDeleted: () => void;
  /** Recusa da API numa ação aberta (dados podem ter mudado depois que a lista carregou). */
  onRefused: (error: ApiError) => void;
};

/** Abre o diálogo da ação escolhida e mostra o resultado (Figma J05–J14). */
export function PlayerDialogs({
  dialog,
  onDialogChange,
  onPlayerSaved,
  onPlayerDeleted,
  onRefused,
}: PlayerDialogsProps) {
  const showToast = useToast();
  const close = () => onDialogChange(null);

  switch (dialog?.kind) {
    case 'create':
      return (
        <CreatePlayerDialog
          onClose={close}
          onCreated={(player) => {
            onPlayerSaved(player);
            onDialogChange({ kind: 'created', player });
          }}
        />
      );
    case 'created':
      return <CreatedPlayerDialog player={dialog.player} onClose={close} />;
    case 'edit':
      return (
        <EditPlayerDialog
          playerId={dialog.player.id}
          onClose={close}
          onRefused={onRefused}
          onSaved={(player) => {
            close();
            onPlayerSaved(player);
            showToast({
              variant: 'success',
              title: 'Jogador atualizado',
              description: `${player.name}: overall ${player.overall}, valor de mercado ${formatMoney(player.market_value)}.`,
            });
          }}
        />
      );
    case 'condition':
      return (
        <ConditionDialog
          player={dialog.player}
          onClose={close}
          onRefused={onRefused}
          onSaved={(player) => {
            close();
            onPlayerSaved(player);
            showToast({
              variant: 'success',
              title: 'Condição alterada',
              description: `${player.name} agora está ${CONDITION_LABELS[player.condition]}. Valor de mercado: ${formatMoney(player.market_value)}.`,
            });
          }}
        />
      );
    case 'delete':
      return (
        <DeletePlayerDialog
          player={dialog.player}
          onClose={close}
          onRefused={onRefused}
          onDeleted={(player) => {
            close();
            onPlayerDeleted();
            showToast({
              variant: 'success',
              title: 'Jogador excluído',
              description: `${player.name} saiu da lista. Transações e partidas antigas dele continuam gravadas.`,
            });
          }}
        />
      );
    default:
      return null;
  }
}
