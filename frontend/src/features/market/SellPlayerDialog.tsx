import { HandCoins, Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { ApiError } from '../../shared/api/http-client';
import { Alert } from '../../shared/components/Alert';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import { useApiAction } from '../../shared/hooks/use-api-action';
import {
  formatBrasiliaDateTime,
  formatInteger,
  formatMoney,
  formatPercent,
} from '../../shared/lib/format';
import type { SquadPlayer } from '../clubs/api';
import { getPlayer } from '../players/api';
import { PlayerSummary } from '../players/PlayerSummary';
import { sellPlayer, type SaleResult } from './api';
import { ResultRow } from './ResultRow';

type SellPlayerDialogProps = {
  player: SquadPlayer;
  clubId: number;
  clubName: string;
  /** O jogador está na escalação do clube (aviso do Figma V01). */
  isStarter: boolean;
  onClose: () => void;
  onSold: (result: SaleResult) => void;
  /** Recusa da API (404, 409): os dados mudaram depois que a página carregou. */
  onRefused: (error: ApiError) => void;
};

/** Depois de uma falha de rede no envio: o jogador foi consultado antes de liberar outra tentativa. */
type Verified = 'still-here' | 'gone';

/**
 * Confirmação da venda (Figma V01, V04, V05; `POST /players/{id}/sell`, sem corpo). Mostra o
 * contrato como a página carregou; multa, comissão, lucro e crédito só aparecem no resultado,
 * com os números da API. Se a conexão cair depois do envio, confere o jogador antes de deixar
 * tentar de novo, para não arriscar uma venda duplicada.
 */
export function SellPlayerDialog({
  player,
  clubId,
  clubName,
  isStarter,
  onClose,
  onSold,
  onRefused,
}: SellPlayerDialogProps) {
  const { refreshAll } = useDataRefresh();
  const [verified, setVerified] = useState<Verified>();

  const verify = useApiAction((id: number) => getPlayer(id), {
    onSuccess: (current) => {
      if (current.club_id === clubId) {
        setVerified('still-here');
      } else {
        setVerified('gone');
        refreshAll();
      }
    },
  });

  const sale = useApiAction(sellPlayer, {
    onSuccess: onSold,
    onError: (error) => {
      if (error.status === null) {
        setVerified(undefined);
        void verify.run(player.id);
      } else {
        onRefused(error);
      }
    },
  });

  const busy = sale.isPending || verify.isPending;
  const loyalty = player.contract && formatBrasiliaDateTime(player.contract.loyalty_until);

  function confirm() {
    setVerified(undefined);
    void sale.run(player.id);
  }

  return (
    <Dialog
      size="sm"
      title={`Vender ${player.name}?`}
      description={`O jogador sai do elenco do ${clubName} e volta a ficar livre.`}
      onClose={onClose}
      closeDisabled={busy}
      notice={<SaleNotice sale={sale} verify={verify} verified={verified} />}
      footer={
        verified === 'gone' ? (
          <Button onClick={onClose} data-autofocus>
            Fechar
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={busy} data-autofocus>
              Cancelar
            </Button>
            {sale.error?.status === null && verified === undefined && !verify.isPending ? (
              <Button onClick={() => void verify.run(player.id)}>
                <RefreshCw aria-hidden="true" />
                Conferir de novo
              </Button>
            ) : (
              <Button onClick={confirm} disabled={busy} aria-busy={sale.isPending}>
                <HandCoins aria-hidden="true" />
                {sale.isPending ? 'Vendendo…' : verified ? 'Tentar de novo' : 'Confirmar venda'}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {isStarter && (
          <Alert variant="warning" title={`${player.name} é titular`}>
            Ao vender, ele sai da escalação, e o {clubName} só volta a jogar partidas depois de
            escalar de novo os 5 titulares.
          </Alert>
        )}
        <PlayerSummary player={player} show="value" />
        {player.contract && loyalty && (
          <dl className="divide-y divide-border rounded-lg border border-border">
            <ResultRow
              label="Valor de compra"
              value={formatMoney(player.contract.purchase_value)}
            />
            <ResultRow label="Fim da fidelidade" value={`${loyalty.date}, ${loyalty.time}`} />
            <ResultRow
              label="Dias restantes"
              value={formatInteger(player.contract.remaining_days)}
            />
            <ResultRow
              label="% de multa se vender agora"
              value={<Badge variant="warning">{formatPercent(player.contract.penalty_rate)}</Badge>}
            />
          </dl>
        )}
        <p className="flex gap-2 rounded-lg border border-border bg-muted-subtle p-3 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />A venda é pelo valor de
          mercado do momento. Multa (teto de 10,00), lucro, comissão e crédito são calculados pela
          API ao confirmar.
        </p>
      </div>
    </Dialog>
  );
}

type SaleNoticeProps = {
  sale: { isPending: boolean; error: ApiError | undefined };
  verify: { isPending: boolean; error: ApiError | undefined };
  verified: Verified | undefined;
};

/** Aviso acima do rodapé: envio, recusa da API e o que se sabe depois de uma falha de rede. */
function SaleNotice({ sale, verify, verified }: SaleNoticeProps) {
  if (sale.isPending) {
    return (
      <Alert variant="info" title="Enviando a venda">
        Aguarde a resposta da API; não feche a janela.
      </Alert>
    );
  }
  if (sale.error && sale.error.status !== null) {
    return (
      <Alert variant="destructive" title="Venda recusada">
        {sale.error.message}
      </Alert>
    );
  }
  if (sale.error === undefined) {
    return undefined;
  }
  if (verify.isPending) {
    return (
      <Alert variant="info" title="Conferindo a venda">
        A conexão caiu durante o envio. Consultando o jogador na API…
      </Alert>
    );
  }
  if (verified === 'gone') {
    return (
      <Alert variant="warning" title="A venda pode ter sido concluída">
        O jogador já não está neste clube. Os dados da tela foram atualizados; confira o elenco e o
        histórico antes de qualquer nova ação.
      </Alert>
    );
  }
  if (verified === 'still-here') {
    return (
      <Alert variant="destructive" title="Sem conexão">
        {sale.error.message} O jogador continua no clube; dá para tentar de novo.
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" title="Não foi possível confirmar a venda">
      {verify.error?.message ?? sale.error.message} Confira de novo antes de tentar outra vez.
    </Alert>
  );
}
