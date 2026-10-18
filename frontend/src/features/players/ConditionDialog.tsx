import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { cx } from '../../shared/lib/cx';
import { CONDITIONS, updatePlayerCondition, type Condition, type Player } from './api';
import { CONDITION_LABELS } from './player-labels';
import { PlayerSummary } from './PlayerSummary';

/** Descrições do Figma J10 (texto informativo; o valor de mercado vem da API). */
const CONDITION_DESCRIPTIONS: Record<Condition, string> = {
  APTO: 'Sem desconto por condição.',
  MAL_CONDICIONADO:
    'Desconto de 15%. Agilidade de 80 a 100 corta pela metade; de 1 a 30 soma 10 pontos.',
  DOENTE: 'Desconto de 30%, com o mesmo ajuste de agilidade.',
};

type ConditionDialogProps = {
  player: Player;
  onClose: () => void;
  onSaved: (player: Player) => void;
  onRefused: (error: ApiError) => void;
};

/**
 * Alteração da condição física (Figma J10, `PATCH /players/{id}/condition`). De DOENTE não se
 * vai direto para APTO: a opção fica desabilitada com o motivo, como o enunciado permite.
 * Enviar a condição atual é aceito pela API (200).
 */
export function ConditionDialog({ player, onClose, onSaved, onRefused }: ConditionDialogProps) {
  const [condition, setCondition] = useState<Condition>(player.condition);
  const save = useApiAction((next: Condition) => updatePlayerCondition(player.id, next), {
    onSuccess: onSaved,
    onError: onRefused,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save.run(condition);
  };

  return (
    <Dialog
      title="Alterar condição física"
      description="A condição muda o desconto do valor de mercado, recalculado pela API ao salvar."
      onClose={onClose}
      closeDisabled={save.isPending}
      notice={
        save.error && (
          <Alert variant="destructive" title="Não foi possível alterar a condição">
            {save.error.message}
          </Alert>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="condition-form" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar condição'}
          </Button>
        </>
      }
    >
      <PlayerSummary player={player} show="condition" />
      <form id="condition-form" onSubmit={submit}>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Nova condição de {player.name}</legend>
          {CONDITIONS.map((option) => {
            const blocked = player.condition === 'DOENTE' && option === 'APTO';
            return (
              <label
                key={option}
                className={cx(
                  'flex cursor-pointer gap-3 rounded-lg border border-border p-3',
                  'has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  blocked && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="condition"
                  value={option}
                  checked={condition === option}
                  disabled={blocked}
                  onChange={() => setCondition(option)}
                  className="mt-0.5 size-4 accent-primary"
                  data-autofocus={condition === option ? true : undefined}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {CONDITION_LABELS[option]}
                    {option === player.condition && <Badge variant="secondary">Atual</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CONDITION_DESCRIPTIONS[option]}
                  </span>
                  {blocked && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock aria-hidden="true" className="size-3.5" />
                      De Doente não passa direto para Apto.
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      </form>
    </Dialog>
  );
}
