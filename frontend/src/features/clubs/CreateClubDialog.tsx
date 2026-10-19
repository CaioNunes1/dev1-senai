import { zodResolver } from '@hookform/resolvers/zod';
import { Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { createClub, type Club, type CreateClubBody } from './api';
import { MAX_CLUBS } from './club-labels';
import { createClubSchema, type CreateClubForm } from './club-schemas';

const EMPTY_FORM = { name: '', acronym: '' } satisfies CreateClubForm;

type CreateClubDialogProps = {
  /** Clubes já carregados pela lista do menu; só orienta, quem recusa o 21º é a API (409). */
  clubCount: number | undefined;
  onClose: () => void;
  onCreated: (club: Club) => void;
  onRefused: (error: ApiError) => void;
};

/**
 * Cadastro de clube (Figma C02/C03, `POST /clubs`). Envia só nome e sigla; caixa, valor do
 * elenco e patrimônio vêm da resposta 201. Numa recusa, o diálogo fica aberto com os dados
 * e o `message` da API (nome ou sigla repetidos, limite de clubes).
 */
export function CreateClubDialog({
  clubCount,
  onClose,
  onCreated,
  onRefused,
}: CreateClubDialogProps) {
  const form = useForm<CreateClubForm, unknown, CreateClubBody>({
    resolver: zodResolver(createClubSchema),
    defaultValues: EMPTY_FORM,
  });
  const { errors } = form.formState;
  const create = useApiAction(createClub, { onSuccess: onCreated, onError: onRefused });

  return (
    <Dialog
      title="Novo clube"
      description="Informe o nome e a sigla do clube."
      onClose={onClose}
      closeDisabled={create.isPending}
      notice={
        create.error && (
          <Alert variant="destructive" title="Não foi possível criar o clube">
            {create.error.message}
          </Alert>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="create-club-form" disabled={create.isPending}>
            {create.isPending ? 'Criando…' : 'Criar clube'}
          </Button>
        </>
      }
    >
      <form
        id="create-club-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((body) => create.run(body))(event)}
        className="flex flex-col gap-4"
      >
        {clubCount !== undefined && clubCount >= MAX_CLUBS && (
          <Alert variant="warning" title={`A liga já tem ${MAX_CLUBS} clubes`}>
            A API recusa novos cadastros enquanto o limite estiver atingido.
          </Alert>
        )}
        <FormField
          label="Nome"
          required
          error={errors.name?.message}
          hint="De 3 a 60 caracteres e de 2 a 5 palavras; só letras, espaços, hífen e ponto. Não pode repetir outro clube."
        >
          {(control) => (
            <Input {...control} {...form.register('name')} autoComplete="off" data-autofocus />
          )}
        </FormField>
        <FormField
          label="Sigla"
          required
          error={errors.acronym?.message}
          hint="3 letras de A a Z, maiúsculas, que aparecem no nome nessa ordem; a primeira é a primeira letra do nome."
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('acronym')}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          )}
        </FormField>
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted-subtle px-3 py-2.5 text-muted-foreground">
          <Wallet aria-hidden="true" className="size-4 shrink-0" />O clube começa com 300,00 em
          caixa e sem jogadores.
        </p>
      </form>
    </Dialog>
  );
}
