import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import type { ApiError } from '../../shared/api/http-client';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { deletePlayer, type Player } from './api';
import { PlayerSummary } from './PlayerSummary';

type DeletePlayerDialogProps = {
  player: Player;
  onClose: () => void;
  onDeleted: (player: Player) => void;
  /** Recusas como 404 e 409: os dados mudaram; quem chama atualiza a lista. */
  onRefused: (error: ApiError) => void;
};

/** Confirmação da exclusão lógica (Figma J13, `DELETE /players/{id}`, RN09). */
export function DeletePlayerDialog({
  player,
  onClose,
  onDeleted,
  onRefused,
}: DeletePlayerDialogProps) {
  const remove = useApiAction(() => deletePlayer(player.id), {
    onSuccess: () => onDeleted(player),
    onError: onRefused,
  });

  return (
    <ConfirmDialog
      title={`Excluir ${player.name}?`}
      description="O jogador sai da lista e da busca, mas as transações e as partidas antigas dele continuam como foram gravadas."
      confirmLabel="Excluir jogador"
      confirmIcon={<Trash2 aria-hidden="true" />}
      destructive
      isPending={remove.isPending}
      error={remove.error}
      errorTitle="Não foi possível excluir o jogador"
      onConfirm={() => void remove.run()}
      onCancel={onClose}
    >
      <PlayerSummary player={player} show="club" />
    </ConfirmDialog>
  );
}
