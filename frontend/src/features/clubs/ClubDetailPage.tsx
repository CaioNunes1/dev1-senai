import {
  ArrowLeft,
  ClipboardList,
  History,
  LoaderCircle,
  RefreshCw,
  SearchX,
  ServerOff,
  Shirt,
  ShoppingCart,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ROUTES } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { buttonClasses } from '../../shared/components/button-styles';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { tabIds } from '../../shared/components/tab-ids';
import { Tabs } from '../../shared/components/Tabs';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { getLineup } from '../league/api';
import { LineupPanel } from '../league/LineupPanel';
import type { SaleResult } from '../market/api';
import { SaleResultDialog } from '../market/SaleResultDialog';
import { SellPlayerDialog } from '../market/SellPlayerDialog';
import {
  readTransactionFilters,
  writeTransactionFilters,
  type TransactionFilters,
} from '../market/transaction-filters';
import { TransactionHistoryPanel } from '../market/TransactionHistoryPanel';
import { useClubTransactions } from '../market/use-transactions';
import type { PlayersPageState } from '../players/PlayersPage';
import type { ClubDetail, SquadPlayer } from './api';
import { ClubMonogram } from './ClubMonogram';
import { ClubSummaryCards } from './ClubSummaryCards';
import { MAX_SQUAD_SIZE } from './club-labels';
import { SquadTable } from './SquadTable';
import { useClub } from './use-clubs';

/** Abas da página: Elenco, Escalação (RN19) e Histórico (RN17). */
type ClubTab = 'squad' | 'lineup' | 'history';

const TAB_PARAM = 'tab';
const HISTORY_TAB: ClubTab = 'history';
const LINEUP_TAB: ClubTab = 'lineup';

/** Aba na URL (`?tab=history`, `?tab=lineup`); sem ela ou com valor desconhecido, o Elenco. */
function readTab(params: URLSearchParams): ClubTab {
  const tab = params.get(TAB_PARAM);
  return tab === HISTORY_TAB || tab === LINEUP_TAB ? tab : 'squad';
}

/**
 * Página do clube (Figma C04/C05, H01–H05, E04 e E05): `GET /clubs/{id}` com o resumo
 * financeiro e o elenco, tudo como a API devolve, e a aba Histórico com as transações.
 * Funciona por clique na lista, no menu ou pela URL direta. "Comprar jogadores" abre a lista
 * de jogadores livres com este clube já escolhido na compra. O resultado de uma venda fica
 * neste nível: continua visível mesmo se a recarga do clube depois da venda falhar.
 */
export function ClubDetailPage() {
  const { clubId = '' } = useParams();
  const club = useClub(clubId);
  const [, setSearchParams] = useSearchParams();
  const [sale, setSale] = useState<{ result: SaleResult; clubName: string }>();

  return (
    <>
      <ClubBody club={club} onSold={(result, clubName) => setSale({ result, clubName })} />
      {sale && (
        <SaleResultDialog
          result={sale.result}
          clubName={sale.clubName}
          onClose={() => setSale(undefined)}
          onShowHistory={() => {
            setSale(undefined);
            setSearchParams({ [TAB_PARAM]: HISTORY_TAB }, { replace: true });
          }}
        />
      )}
    </>
  );
}

type OnSold = (result: SaleResult, clubName: string) => void;

function ClubBody({ club, onSold }: { club: ApiQuery<ClubDetail>; onSold: OnSold }): ReactNode {
  const { data, error } = club;

  if (error?.status === 404) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={SearchX}
          title="Clube não encontrado"
          description={`${error.message} O endereço pode estar errado ou o clube não existe.`}
          action={<BackToClubs />}
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={ServerOff}
          title="Não foi possível carregar o clube"
          description={error.message}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={club.retry}>
                <RefreshCw aria-hidden="true" />
                Tentar de novo
              </Button>
              <BackToClubs />
            </div>
          }
        />
      </Card>
    );
  }

  if (data === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Carregando clube…
      </p>
    );
  }

  return <ClubContent club={club} data={data} onSold={onSold} />;
}

/**
 * Conteúdo do clube carregado. A aba e os filtros do histórico ficam na URL: trocar de aba não
 * recarrega a página, e abrir outro clube pelo menu começa sem filtros. O histórico sem filtro
 * é carregado aqui uma vez: dá a contagem da aba, os jogadores do filtro e a tabela sem filtro.
 */
function ClubContent({
  club,
  data,
  onSold,
}: {
  club: ApiQuery<ClubDetail>;
  data: ClubDetail;
  onSold: OnSold;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshAll } = useDataRefresh();
  const [selling, setSelling] = useState<SquadPlayer>();
  const tab = readTab(searchParams);
  const filters = readTransactionFilters(searchParams);
  const allHistory = useClubTransactions(data.id);
  const lineup = useApiQuery(`lineup:${data.id}`, (signal) => getLineup(data.id, signal));
  const ids = tabIds('club', tab);

  function selectTab(next: ClubTab) {
    const params = new URLSearchParams(searchParams);
    if (next === 'squad') {
      params.delete(TAB_PARAM);
    } else {
      params.set(TAB_PARAM, next);
    }
    setSearchParams(params, { replace: true });
  }

  function changeFilters(next: TransactionFilters) {
    setSearchParams(writeTransactionFilters(searchParams, next), { replace: true });
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <ClubMonogram acronym={data.acronym} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-heading-page wrap-break-word text-foreground">{data.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Sigla {data.acronym}</Badge>
            <Badge variant="outline">
              <Shirt aria-hidden="true" className="size-3" />
              {data.players.length} de {MAX_SQUAD_SIZE} jogadores
            </Badge>
          </div>
        </div>
        <Link
          to={ROUTES.players}
          state={{ buyerClubId: data.id } satisfies PlayersPageState}
          className={buttonClasses()}
        >
          <ShoppingCart aria-hidden="true" />
          Comprar jogadores
        </Link>
      </header>
      <ClubSummaryCards club={data} />
      <div className="flex flex-col gap-4">
        <Tabs<ClubTab>
          label="Seções do clube"
          idPrefix="club"
          value={tab}
          onChange={selectTab}
          items={[
            { key: 'squad', label: 'Elenco', icon: Shirt, count: data.players.length },
            { key: LINEUP_TAB, label: 'Escalação', icon: ClipboardList },
            {
              key: HISTORY_TAB,
              label: 'Histórico',
              icon: History,
              count: allHistory.data?.data.length,
            },
          ]}
        />
        <div
          role="tabpanel"
          id={ids.panel}
          aria-labelledby={ids.tab}
          className="flex flex-col gap-4"
        >
          {tab === LINEUP_TAB && <LineupPanel club={data} lineup={lineup} />}
          {tab === HISTORY_TAB && (
            <TransactionHistoryPanel
              clubId={data.id}
              allHistory={allHistory}
              filters={filters}
              onFiltersChange={changeFilters}
            />
          )}
          {tab === 'squad' && (
            <>
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
                  <h2 className="text-heading-card">Elenco</h2>
                  <p className="text-muted-foreground">
                    Ordem por posição (GOL, ZAG, LAT, MEI, ATA), depois pelo nome, como a API
                    devolve.
                  </p>
                </div>
                <SquadTable club={club} onSell={setSelling} />
              </Card>
              <p className="text-xs text-muted-foreground">
                Valores em moedas. Valor de mercado, dias restantes e % de multa são calculados pela
                API no momento da consulta; datas no horário de Brasília.
              </p>
            </>
          )}
        </div>
      </div>
      {selling && (
        <SellPlayerDialog
          player={selling}
          clubId={data.id}
          clubName={data.name}
          isStarter={lineup.data?.players.some((player) => player.id === selling.id) ?? false}
          onClose={() => setSelling(undefined)}
          onSold={(result) => {
            setSelling(undefined);
            onSold(result, data.name);
            refreshAll();
          }}
          onRefused={refreshAll}
        />
      )}
    </>
  );
}

function BackToClubs() {
  return (
    <Link to={ROUTES.clubs} className={buttonClasses({ variant: 'outline' })}>
      <ArrowLeft aria-hidden="true" />
      Voltar para clubes
    </Link>
  );
}
