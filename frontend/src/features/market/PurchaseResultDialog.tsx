import { ArrowRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { clubPath } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { buttonClasses } from '../../shared/components/button-styles';
import { Dialog } from '../../shared/components/Dialog';
import { formatBrasiliaDateTime, formatMoney } from '../../shared/lib/format';
import type { PurchaseResult } from './api';

type PurchaseResultDialogProps = {
  result: PurchaseResult;
  /** Nome do clube pela lista já carregada; sem ele, "clube {id}". */
  clubName: string | undefined;
  onClose: () => void;
};

/**
 * Resultado da compra (Figma M05): valor, taxa, custo total, fim da fidelidade, contrato e
 * novo caixa, exatamente como a API devolveu no 200. O custo total é o débito gravado
 * (`cash_change`, negativo na compra) sem o sinal; nada é calculado na tela.
 */
export function PurchaseResultDialog({ result, clubName, onClose }: PurchaseResultDialogProps) {
  const club = clubName ?? `clube ${result.club_id}`;
  const loyalty = formatBrasiliaDateTime(result.contract.loyalty_until);
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
      title="Compra concluída"
      description={`${result.player_name} agora é do ${club}. Valores em moedas, gravados pela API.`}
      onClose={onClose}
      footer={
        <>
          <Link
            to={clubPath(result.club_id)}
            onClick={onClose}
            className={buttonClasses({ variant: 'outline' })}
          >
            Ver clube
            <ArrowRight aria-hidden="true" />
          </Link>
          <Button onClick={onClose} data-autofocus>
            Fechar
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-border rounded-lg border border-border">
        <ResultRow
          label="Valor"
          detail="Valor de mercado no momento da compra"
          value={formatMoney(result.value)}
        />
        <ResultRow label="Taxa" detail="Taxa de compra" value={formatMoney(result.fee)} />
        <ResultRow
          label="Custo total"
          detail="Valor + taxa, debitado do caixa"
          value={formatMoney(Math.abs(result.cash_change))}
          highlight
        />
        <ResultRow
          label="Fim da fidelidade"
          detail="Horário de Brasília"
          value={`${loyalty.date}, ${loyalty.time}`}
        />
        <div className="flex items-center gap-3 p-3">
          <dt className="flex-1 text-muted-foreground">Contrato</dt>
          <dd>
            <Badge variant="success" dot>
              {result.contract.status}
            </Badge>
          </dd>
        </div>
        <ResultRow
          label={`Novo caixa do ${club}`}
          value={formatMoney(result.club_cash)}
          highlight
        />
      </dl>
    </Dialog>
  );
}

type ResultRowProps = { label: string; detail?: string; value: string; highlight?: boolean };

function ResultRow({ label, detail, value, highlight = false }: ResultRowProps) {
  return (
    <div
      className={
        highlight ? 'flex items-center gap-3 bg-muted-subtle p-3' : 'flex items-center gap-3 p-3'
      }
    >
      <dt className="flex flex-1 flex-col">
        <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </dt>
      <dd className={highlight ? 'text-heading-card' : 'font-medium'}>{value}</dd>
    </div>
  );
}
