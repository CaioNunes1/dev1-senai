import { CircleCheck, History } from 'lucide-react';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import {
  formatInteger,
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from '../../shared/lib/format';
import type { SaleResult } from './api';
import { ResultRow } from './ResultRow';
import { signedToneClass } from './signed-tone';

type SaleResultDialogProps = {
  result: SaleResult;
  clubName: string;
  onShowHistory: () => void;
  onClose: () => void;
};

/**
 * Resultado da venda (Figma V02/V03): os oito valores da RN16 e o novo caixa, exatamente como
 * a API devolveu no 200. Multa, comissão, lucro e crédito não são calculados na tela.
 */
export function SaleResultDialog({
  result,
  clubName,
  onShowHistory,
  onClose,
}: SaleResultDialogProps) {
  return (
    <Dialog
      size="sm"
      header={
        <span
          aria-hidden="true"
          className="mb-3 flex size-9 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <CircleCheck className="size-5" />
        </span>
      }
      title="Venda concluída"
      description={`${result.player_name} voltou a ficar livre e saiu do elenco do ${clubName}. Valores em moedas, gravados pela API.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onShowHistory}>
            <History aria-hidden="true" />
            Ver histórico
          </Button>
          <Button onClick={onClose} data-autofocus>
            Fechar
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-border rounded-lg border border-border">
        <ResultRow label="Valor de compra" value={formatMoney(result.purchase_value)} />
        <ResultRow
          label="Valor de venda"
          detail="Valor de mercado no momento da venda"
          value={formatMoney(result.value)}
        />
        <ResultRow label="Dias restantes" value={formatInteger(result.remaining_days)} />
        <ResultRow
          label="Multa"
          detail={`${formatPercent(result.penalty_rate)} do valor de venda, com teto de 10,00`}
          value={formatMoney(result.penalty)}
        />
        <ResultRow
          label="Lucro"
          value={formatSignedMoney(result.profit)}
          valueClassName={signedToneClass(result.profit)}
        />
        <ResultRow label="Comissão" value={formatMoney(result.fee)} />
        <ResultRow
          label="Crédito no caixa"
          detail="Valor de venda − multa − comissão"
          value={formatSignedMoney(result.cash_change)}
          highlight
        />
        <div className="flex items-center gap-3 p-3">
          <dt className="flex-1 text-muted-foreground">Contrato</dt>
          <dd>
            <Badge variant={result.contract_status === 'RESCINDIDO' ? 'warning' : 'secondary'} dot>
              {result.contract_status}
            </Badge>
          </dd>
        </div>
        <ResultRow
          label={`Novo caixa do ${clubName}`}
          value={formatMoney(result.club_cash)}
          highlight
        />
      </dl>
    </Dialog>
  );
}
