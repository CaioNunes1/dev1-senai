import { Coins, Landmark, Shirt, Wallet, type LucideIcon } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { formatMoney } from '../../shared/lib/format';
import type { ClubDetail } from './api';
import { MAX_SQUAD_SIZE } from './club-labels';

/**
 * Resumo do clube (Figma C04/C05): caixa, valor do elenco e patrimônio exatamente como a
 * API devolve (nada é somado na tela) e o tamanho do elenco.
 */
export function ClubSummaryCards({ club }: { club: ClubDetail }) {
  return (
    <ul aria-label="Resumo do clube" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={Wallet}
        label="Caixa"
        value={formatMoney(club.cash)}
        unit="moedas"
        detail="Só muda por compras e vendas"
      />
      <SummaryCard
        icon={Coins}
        label="Valor do elenco"
        value={formatMoney(club.squad_value)}
        unit="moedas"
        detail="Soma dos valores de mercado"
      />
      <SummaryCard
        icon={Landmark}
        label="Patrimônio"
        value={formatMoney(club.net_worth)}
        unit="moedas"
        detail="Caixa + valor do elenco"
      />
      <SummaryCard
        icon={Shirt}
        label="Elenco"
        value={`${club.players.length} de ${MAX_SQUAD_SIZE}`}
        detail={`Limite de ${MAX_SQUAD_SIZE} jogadores`}
      />
    </ul>
  );
}

type SummaryCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  detail: string;
};

function SummaryCard({ icon: Icon, label, value, unit, detail }: SummaryCardProps) {
  return (
    <li>
      <Card className="flex h-full flex-col gap-1 p-5">
        <p className="flex items-center justify-between gap-2 text-muted-foreground">
          {label}
          <Icon aria-hidden="true" className="size-4 shrink-0" />
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-heading-page text-foreground">{value}</span>
          {unit && <span className="text-muted-foreground">{unit}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </Card>
    </li>
  );
}
