import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { createPlayer, type CreatePlayerBody, type Player } from './api';
import { createPlayerSchema, type CreatePlayerForm } from './player-schemas';
import { PositionPicker } from './PositionPicker';

const ATTRIBUTE_FIELDS = [
  ['pace', 'Velocidade'],
  ['shooting', 'Finalização'],
  ['passing', 'Passe'],
  ['dribbling', 'Drible'],
  ['defending', 'Defesa'],
  ['physical', 'Físico'],
  ['potential', 'Potencial'],
] as const;

/** Campos vazios; a posição começa sem escolha (o Zod pede que seja escolhida). */
const EMPTY_FORM = {
  name: '',
  age: '',
  agility: '',
  pace: '',
  shooting: '',
  passing: '',
  dribbling: '',
  defending: '',
  physical: '',
  potential: '',
} satisfies Partial<CreatePlayerForm>;

type CreatePlayerDialogProps = {
  onClose: () => void;
  onCreated: (player: Player) => void;
};

/**
 * Cadastro de jogador (Figma J05/J06, `POST /players`). Envia só os 11 campos informados,
 * como números; valor base, overall e valor de mercado aparecem depois de salvar (J07).
 * Em caso de recusa, o formulário fica aberto, com os dados e o `message` da API.
 */
export function CreatePlayerDialog({ onClose, onCreated }: CreatePlayerDialogProps) {
  const form = useForm<CreatePlayerForm, unknown, CreatePlayerBody>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: EMPTY_FORM,
  });
  const { errors } = form.formState;
  const create = useApiAction(createPlayer, { onSuccess: onCreated });

  return (
    <Dialog
      size="lg"
      title="Novo jogador"
      description="Preencha os dados e os indicadores técnicos. O valor base, o overall e o valor de mercado são calculados ao salvar."
      onClose={onClose}
      closeDisabled={create.isPending}
      notice={
        create.error && (
          <Alert variant="destructive" title="Não foi possível cadastrar o jogador">
            {create.error.message}
          </Alert>
        )
      }
      footer={
        <>
          <p className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="size-4" />O jogador começa livre e Apto.
          </p>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="create-player-form" disabled={create.isPending}>
            {create.isPending ? 'Salvando…' : 'Salvar jogador'}
          </Button>
        </>
      }
    >
      <form
        id="create-player-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((body) => create.run(body))(event)}
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
        <PositionPicker registration={form.register('position')} error={errors.position?.message} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Idade" required error={errors.age?.message} hint="De 16 a 45 anos.">
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
          <AfterSaveValue label="Valor base (moedas)" hint="Calculado no cadastro." />
        </div>

        <section
          aria-labelledby="attributes-title"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <div>
            <h3 id="attributes-title" className="text-heading-card">
              Indicadores técnicos
            </h3>
            <p className="text-muted-foreground">
              Seis atributos e o potencial, de 1 a 99. Não mudam depois do cadastro; a soma dos seis
              atributos não pode passar de 480.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
            {ATTRIBUTE_FIELDS.map(([field, label]) => (
              <FormField
                key={field}
                label={label}
                required
                error={errors[field]?.message}
                hint={
                  field === 'potential' ? '≥ maior atributo; igual a ele com 33+ anos' : undefined
                }
              >
                {(control) => <Input {...control} {...form.register(field)} inputMode="numeric" />}
              </FormField>
            ))}
            <AfterSaveValue label="Overall" hint="Calculado automaticamente." />
          </div>
        </section>
      </form>
    </Dialog>
  );
}

/** Valor que só existe depois de salvar (calculado pela API), nunca na tela. */
function AfterSaveValue({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted-subtle px-3 text-sm text-muted-foreground">
        <Lock aria-hidden="true" className="size-4" />
        Após salvar
      </span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}
