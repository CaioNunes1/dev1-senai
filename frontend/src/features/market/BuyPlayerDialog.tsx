import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Info, RefreshCw, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { ROUTES } from '../../app/layout/navigation';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { formatBrasiliaDateTime, formatInteger, formatMoney } from '../../shared/lib/format';
import type { Club } from '../clubs/api';
import { useClubList } from '../clubs/clubs-context';
import { getPlayer, type Player } from '../players/api';
import { PlayerSummary } from '../players/PlayerSummary';
import { buyPlayer, type BuyPlayerBody, type PurchaseResult } from './api';
import { buyPlayerSchema, type BuyPlayerForm } from './buy-player-schema';
import { MAX_LOYALTY_DAYS, suggestedLoyalty } from './loyalty-date';

const systemNow = () => new Date();

type BuyPlayerDialogProps = {
  player: Player;
  /** Clube já escolhido quando a compra começa pela página do clube. */
  initialClubId?: number;
  onClose: () => void;
  onPurchased: (result: PurchaseResult) => void;
  /** Recusa da API (400, 404, 409): os dados podem ter mudado depois que a lista carregou. */
  onRefused: (error: ApiError) => void;
  /** Relógio usado na validação e na sugestão de data (os testes fixam o instante). */
  now?: () => Date;
};

/** Depois de uma falha de rede no envio: o jogador foi consultado de novo antes de liberar outra tentativa. */
type Verified = { free: true } | { free: false; clubId: number };

/**
 * Compra de jogador livre (Figma M01–M04, M07, M08; `POST /players/{id}/buy`). Em dois passos:
 * o formulário (clube e fim da fidelidade, em horário de Brasília) e a revisão, que envia.
 * Valor, taxa, custo e novo caixa só aparecem no resultado, com os números da API. Numa
 * recusa, volta ao formulário com o `message` e os dados. Se a conexão cair depois do envio,
 * confere o jogador antes de deixar tentar de novo, para não arriscar uma compra duplicada.
 */
export function BuyPlayerDialog({
  player,
  initialClubId,
  onClose,
  onPurchased,
  onRefused,
  now = systemNow,
}: BuyPlayerDialogProps) {
  const clubs = useClubList();
  const { refreshAll } = useDataRefresh();
  const schema = useMemo(() => buyPlayerSchema(now), [now]);
  const [defaults] = useState(() => {
    const { date, time } = suggestedLoyalty(now());
    return {
      club_id: initialClubId === undefined ? '' : String(initialClubId),
      loyalty_date: date,
      loyalty_time: time,
    } satisfies BuyPlayerForm;
  });
  const form = useForm<BuyPlayerForm, unknown, BuyPlayerBody>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const selectedClubId = useWatch({ control: form.control, name: 'club_id' });
  const [review, setReview] = useState<BuyPlayerBody>();
  const [verified, setVerified] = useState<Verified>();

  const verify = useApiAction((id: number) => getPlayer(id), {
    onSuccess: (current) => {
      if (current.club_id === null) {
        setVerified({ free: true });
      } else {
        setVerified({ free: false, clubId: current.club_id });
        refreshAll();
      }
    },
  });
  const buy = useApiAction((body: BuyPlayerBody) => buyPlayer(player.id, body), {
    onSuccess: onPurchased,
    onError: (error) => {
      if (error.status === null) {
        void verify.run(player.id);
        return;
      }
      setReview(undefined);
      onRefused(error);
    },
  });

  const send = (body: BuyPlayerBody) => {
    setVerified(undefined);
    verify.clearError();
    void buy.run(body);
  };

  const clubsById = new Map((clubs.data ?? []).map((club) => [club.id, club]));
  const selectedClub = clubsById.get(Number(selectedClubId));
  const noClubs = clubs.data?.length === 0;
  const busy = buy.isPending || verify.isPending;
  const lostConnection = buy.error?.status === null;

  return (
    <Dialog
      title="Comprar jogador"
      description={
        review
          ? 'Confira os dados antes de confirmar. Nada é gravado até você confirmar.'
          : 'Escolha o clube comprador e até quando vai a fidelidade do contrato.'
      }
      onClose={onClose}
      closeDisabled={busy}
      notice={
        <PurchaseNotice
          refusal={review ? undefined : buy.error}
          sending={buy.isPending}
          lostConnection={review !== undefined && lostConnection}
          checking={verify.isPending}
          checkFailed={verify.error !== undefined}
          verified={verified}
          clubName={(id) => clubsById.get(id)?.name ?? `clube ${id}`}
        />
      }
      footer={
        review ? (
          <ReviewFooter
            busy={busy}
            sending={buy.isPending}
            lostConnection={lostConnection}
            checkFailed={verify.error !== undefined}
            verified={verified}
            onBack={() => {
              buy.clearError();
              setReview(undefined);
            }}
            onConfirm={() => send(review)}
            onCheckAgain={() => void verify.run(player.id)}
            onClose={onClose}
          />
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="buy-player-form" disabled={noClubs || !clubs.data}>
              Revisar compra
            </Button>
          </>
        )
      }
    >
      {review ? (
        <PurchaseReview player={player} club={clubsById.get(review.club_id)} body={review} />
      ) : (
        <form
          id="buy-player-form"
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((body) => {
              buy.clearError();
              setReview(body);
            })(event)
          }
          className="flex flex-col gap-4"
        >
          <PlayerSummary player={player} show="value" />
          <ClubsState clubs={clubs.data} error={clubs.error} onRetry={clubs.retry} />
          <FormField
            label="Clube comprador"
            required
            error={errors.club_id?.message}
            hint={
              selectedClub
                ? `Caixa atual: ${formatMoney(selectedClub.cash)}. O custo total (valor + taxa) pode ir até 50% do caixa.`
                : 'O custo total (valor + taxa) pode ir até 50% do caixa do clube.'
            }
          >
            {(control) => (
              <Select
                {...control}
                {...form.register('club_id')}
                disabled={!clubs.data || noClubs}
                data-autofocus
              >
                <option value="">{clubs.data ? 'Escolha o clube' : 'Carregando clubes…'}</option>
                {(clubs.data ?? []).map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} ({club.acronym}) · caixa {formatMoney(club.cash)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">Fim da fidelidade</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <FormField
                label="Fim da fidelidade (data)"
                required
                error={errors.loyalty_date?.message}
              >
                {(control) => <Input {...control} {...form.register('loyalty_date')} type="date" />}
              </FormField>
              <FormField label="Hora" required error={errors.loyalty_time?.message}>
                {(control) => <Input {...control} {...form.register('loyalty_time')} type="time" />}
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground">
              Depois do momento da compra e até {formatInteger(MAX_LOYALTY_DAYS)} dias. Horário de
              Brasília; enviado com o fuso −03:00.
            </p>
          </fieldset>
          <p className="flex gap-2 rounded-lg border border-border bg-muted-subtle px-3 py-2.5 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="mt-px size-4 shrink-0" />A taxa, o custo total e o
            novo caixa são calculados pela API ao confirmar, com o valor de mercado daquele momento.
          </p>
        </form>
      )}
    </Dialog>
  );
}

function ClubsState({
  clubs,
  error,
  onRetry,
}: {
  clubs: Club[] | undefined;
  error: ApiError | undefined;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Alert variant="destructive" title="Não foi possível carregar os clubes">
        <span className="flex flex-wrap items-center gap-2">
          {error.message}
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar de novo
          </Button>
        </span>
      </Alert>
    );
  }
  if (clubs?.length === 0) {
    return (
      <Alert variant="warning" title="Nenhum clube cadastrado">
        Cadastre um clube para poder comprar jogadores.{' '}
        <Link to={ROUTES.clubs} className="font-medium underline underline-offset-2">
          Ir para clubes
        </Link>
      </Alert>
    );
  }
  return null;
}

type PurchaseNoticeProps = {
  refusal: ApiError | undefined;
  sending: boolean;
  lostConnection: boolean;
  checking: boolean;
  checkFailed: boolean;
  verified: Verified | undefined;
  clubName: (id: number) => string;
};

/** Aviso sempre visível do diálogo (Figma M02, M03, M04, M07, M08). */
function PurchaseNotice({
  refusal,
  sending,
  lostConnection,
  checking,
  checkFailed,
  verified,
  clubName,
}: PurchaseNoticeProps) {
  if (sending) {
    return (
      <Alert variant="info" title="Enviando a compra">
        Os botões ficam desabilitados até a resposta.
      </Alert>
    );
  }
  if (refusal) {
    return (
      <Alert variant="destructive" title="Compra recusada">
        {refusal.message}
      </Alert>
    );
  }
  if (!lostConnection) {
    return null;
  }
  if (checking) {
    return (
      <Alert variant="info" title="Conferindo a compra">
        A conexão caiu durante o envio. Consultando o jogador para saber se a compra foi gravada.
      </Alert>
    );
  }
  if (checkFailed) {
    return (
      <Alert variant="destructive" title="Não foi possível confirmar a compra">
        A conexão caiu e não deu para saber se a compra foi gravada. Confira de novo antes de tentar
        outra vez.
      </Alert>
    );
  }
  if (verified?.free === false) {
    return (
      <Alert variant="warning" title="A compra pode ter sido concluída">
        A conexão caiu, mas o jogador já aparece no {clubName(verified.clubId)}. Os dados foram
        atualizados; não é preciso enviar de novo.
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" title="Sem conexão">
      A compra não foi confirmada. Verifique a conexão e tente de novo.
    </Alert>
  );
}

type ReviewFooterProps = {
  busy: boolean;
  sending: boolean;
  lostConnection: boolean;
  checkFailed: boolean;
  verified: Verified | undefined;
  onBack: () => void;
  onConfirm: () => void;
  onCheckAgain: () => void;
  onClose: () => void;
};

function ReviewFooter({
  busy,
  sending,
  lostConnection,
  checkFailed,
  verified,
  onBack,
  onConfirm,
  onCheckAgain,
  onClose,
}: ReviewFooterProps) {
  if (lostConnection && verified?.free === false) {
    return (
      <Button onClick={onClose} data-autofocus>
        Fechar
      </Button>
    );
  }
  return (
    <>
      <Button variant="outline" onClick={onBack} disabled={busy}>
        <ArrowLeft aria-hidden="true" />
        Voltar
      </Button>
      {lostConnection && checkFailed ? (
        <Button onClick={onCheckAgain} disabled={busy}>
          <RefreshCw aria-hidden="true" />
          Conferir de novo
        </Button>
      ) : (
        <Button onClick={onConfirm} disabled={busy || (lostConnection && !verified)} data-autofocus>
          {lostConnection ? <RefreshCw aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
          {sending ? 'Comprando…' : lostConnection ? 'Tentar de novo' : 'Confirmar compra'}
        </Button>
      )}
    </>
  );
}

/** Passo de revisão: o que será enviado e o valor de referência da consulta mais recente. */
function PurchaseReview({
  player,
  club,
  body,
}: {
  player: Player;
  club: Club | undefined;
  body: BuyPlayerBody;
}) {
  const { date, time } = formatBrasiliaDateTime(body.loyalty_until);
  const clubName = club?.name ?? `clube ${body.club_id}`;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground">
        Confirma a compra de <strong>{player.name}</strong> para <strong>{clubName}</strong>, com
        fidelidade até {date} às {time.replace(':', 'h')}?
      </p>
      <dl className="divide-y divide-border rounded-lg border border-border">
        <ReviewRow label="Jogador" value={player.name} />
        <ReviewRow
          label="Clube comprador"
          value={club ? `${club.name} (${club.acronym})` : clubName}
          detail={club ? `Caixa atual: ${formatMoney(club.cash)}` : undefined}
        />
        <ReviewRow
          label="Fim da fidelidade"
          value={`${date} às ${time}`}
          detail="Horário de Brasília (−03:00)"
        />
        <ReviewRow
          label="Valor de mercado (referência)"
          value={`${formatMoney(player.market_value)} moedas`}
          detail="Da consulta mais recente; pode mudar até a confirmação"
        />
      </dl>
      <Alert variant="info" title="Taxa e custo final são definidos pela API">
        No momento da compra, com o valor de mercado daquele instante. O resultado mostra os valores
        gravados.
      </Alert>
    </div>
  );
}

function ReviewRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <dt className="flex flex-1 flex-col">
        <span className="text-muted-foreground">{label}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
