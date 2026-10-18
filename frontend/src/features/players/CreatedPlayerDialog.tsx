import { CircleCheck } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { formatMoney } from '../../shared/lib/format';
import type { Player } from './api';
import { POSITION_LABELS } from './player-labels';

/**
 * Resultado do cadastro (Figma J07): valor base, valor de mercado e overall exatamente como
 * a API devolveu no `201` (o barema pede que apareçam calculados depois de salvar).
 */
export function CreatedPlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
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
      title="Jogador cadastrado"
      description={`${player.name} entrou livre e Apto. Valores em moedas, calculados pela API ao salvar.`}
      onClose={onClose}
      footer={
        <Button onClick={onClose} data-autofocus>
          Fechar
        </Button>
      }
    >
      <dl className="divide-y divide-border rounded-lg border border-border">
        <ResultRow
          label="Valor base"
          detail="Calculado no cadastro; não muda depois"
          value={formatMoney(player.base_value)}
          highlight
        />
        <ResultRow
          label="Valor de mercado"
          detail="Com condição, agilidade e idade"
          value={formatMoney(player.market_value)}
        />
        <ResultRow
          label="Overall"
          detail={`Pelos pesos da posição ${POSITION_LABELS[player.position]}`}
          value={String(player.overall)}
        />
      </dl>
    </Dialog>
  );
}

type ResultRowProps = { label: string; detail: string; value: string; highlight?: boolean };

function ResultRow({ label, detail, value, highlight = false }: ResultRowProps) {
  return (
    <div
      className={
        highlight ? 'flex items-center gap-3 bg-muted-subtle p-3' : 'flex items-center gap-3 p-3'
      }
    >
      <dt className="flex flex-1 flex-col">
        <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </dt>
      <dd className={highlight ? 'text-heading-card' : 'font-medium'}>{value}</dd>
    </div>
  );
}
