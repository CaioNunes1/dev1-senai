import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Lock, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { formatMoney } from '../../shared/lib/format';
import { getPlayer, updatePlayer, type Player, type UpdatePlayerBody } from './api';
import { editPlayerSchema, type EditPlayerForm } from './player-schemas';
import { PositionPicker } from './PositionPicker';

type EditPlayerDialogProps = {
  playerId: number;
  onClose: () => void;
  onSaved: (player: Player) => void;
  /** Recusa da API (ex.: 404, 409); quem chama decide se atualiza a lista. */
  onRefused: (error: ApiError) => void;
};

const DESCRIPTION = 'Edite nome, posição, idade e agilidade. Os demais dados não mudam.';

/**
 * Edição (Figma J09, RN08). Carrega o jogador atual por `GET /players/{id}` antes de abrir o
 * formulário, para não editar dados que mudaram depois que a lista foi carregada.
 */
export function EditPlayerDialog({ playerId, onClose, onSaved, onRefused }: EditPlayerDialogProps) {
  const player = useApiQuery(`player:${playerId}`, (signal) => getPlayer(playerId, signal));

  if (player.data) {
    return (
      <EditPlayerForm
        player={player.data}
        onClose={onClose}
        onSaved={onSaved}
        onRefused={onRefused}
      />
    );
  }
  return (
    <Dialog title="Editar jogador" description={DESCRIPTION} onClose={onClose}>
      {player.error ? (
        <Alert variant="destructive" title="Não foi possível carregar o jogador">
          <p>{player.error.message}</p>
          <Button variant="outline" size="sm" onClick={player.retry} className="mt-2">
            <RefreshCw aria-hidden="true" />
            Tentar de novo
          </Button>
        </Alert>
      ) : (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Carregando jogador…
        </p>
      )}
    </Dialog>
  );
}

type EditPlayerFormProps = Omit<EditPlayerDialogProps, 'playerId'> & { player: Player };

function EditPlayerForm({ player, onClose, onSaved, onRefused }: EditPlayerFormProps) {
  const schema = useMemo(() => editPlayerSchema(player.age), [player.age]);
  const form = useForm<EditPlayerForm, unknown, UpdatePlayerBody>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: player.name,
      position: player.position,
      age: String(player.age),
      agility: String(player.agility),
    },
  });
  const { errors } = form.formState;
  const save = useApiAction((body: UpdatePlayerBody) => updatePlayer(player.id, body), {
    onSuccess: onSaved,
    onError: onRefused,
  });
  const hasClub = player.club_id !== null;

  return (
    <Dialog
      title="Editar jogador"
      description={DESCRIPTION}
      onClose={onClose}
      closeDisabled={save.isPending}
      notice={
        save.error && (
          <Alert variant="destructive" title="Não foi possível salvar as alterações">
            {save.error.message}
          </Alert>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-player-form" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <form
        id="edit-player-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((body) => save.run(body))(event)}
        className="flex flex-col gap-4"
      >
        <FormField
          label="Nome"
          required
          error={errors.name?.message}
          hint="De 3 a 100 caracteres, com pelo menos duas palavras e sem números."
        >
          {(control) => (
            <Input {...control} {...form.register('name')} autoComplete="off" data-autofocus />
          )}
        </FormField>
        <PositionPicker
          registration={form.register('position')}
          error={errors.position?.message}
          lockedTo={hasClub ? player.position : undefined}
          note={
            hasClub
              ? 'Jogador com clube não muda de posição: as outras posições ficam desabilitadas.'
              : undefined
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Idade"
            required
            error={errors.age?.message}
            hint={`De 16 a 45, sem diminuir (atual: ${player.age}).`}
          >
            {(control) => <Input {...control} {...form.register('age')} inputMode="numeric" />}
          </FormField>
          <FormField
            label="Agilidade"
            required
            error={errors.agility?.message}
            hint="De 1 a 100 (até 85 com 35 anos ou mais)."
          >
            {(control) => <Input {...control} {...form.register('agility')} inputMode="numeric" />}
          </FormField>
        </div>
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          Não mudam depois do cadastro: valor base ({formatMoney(player.base_value)}), indicadores e
          potencial.
        </p>
      </form>
    </Dialog>
  );
}
