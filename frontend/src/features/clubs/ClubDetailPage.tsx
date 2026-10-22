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
import { Link, useParams, useSearchParams } from 'react-router';
import { ROUTES } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { buttonClasses } from '../../shared/components/button-styles';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { tabIds } from '../../shared/components/tab-ids';
import { Tabs } from '../../shared/components/Tabs';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import {
  readTransactionFilters,
  writeTransactionFilters,
  type TransactionFilters,
} from '../market/transaction-filters';
import { TransactionHistoryPanel } from '../market/TransactionHistoryPanel';
import { useClubTransactions } from '../market/use-transactions';
import type { PlayersPageState } from '../players/PlayersPage';
import type { ClubDetail } from './api';
import { ClubMonogram } from './ClubMonogram';
import { ClubSummaryCards } from './ClubSummaryCards';
import { MAX_SQUAD_SIZE } from './club-labels';
import { SquadTable } from './SquadTable';
import { useClub } from './use-clubs';

/** Abas da página; a Escalação aparece desabilitada até a etapa da Liga. */
type ClubTab = 'squad' | 'lineup' | 'history';

const TAB_PARAM = 'tab';
const HISTORY_TAB: ClubTab = 'history';

/** Aba na URL (`?tab=history`); sem ela ou com valor desconhecido, o Elenco. */
function readTab(params: URLSearchParams): ClubTab {
  return params.get(TAB_PARAM) === HISTORY_TAB ? HISTORY_TAB : 'squad';
}

/**
 * Página do clube (Figma C04/C05, H01–H05, E04 e E05): `GET /clubs/{id}` com o resumo
 * financeiro e o elenco, tudo como a API devolve, e a aba Histórico com as transações.
 * Funciona por clique na lista, no menu ou pela URL direta. "Comprar jogadores" abre a lista
 * de jogadores livres com este clube já escolhido na compra.
 */
export function ClubDetailPage() {
  const { clubId = '' } = useParams();
  const club = useClub(clubId);
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

  return <ClubContent club={club} data={data} />;
}

/**
 * Conteúdo do clube carregado. A aba e os filtros do histórico ficam na URL: trocar de aba não
 * recarrega a página, e abrir outro clube pelo menu começa sem filtros. O histórico sem filtro
 * é carregado aqui uma vez: dá a contagem da aba, os jogadores do filtro e a tabela sem filtro.
 */
function ClubContent({ club, data }: { club: ApiQuery<ClubDetail>; data: ClubDetail }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams);
  const filters = readTransactionFilters(searchParams);
  const allHistory = useClubTransactions(data.id);
  const ids = tabIds('club', tab);

  function selectTab(next: ClubTab) {
    const params = new URLSearchParams(searchParams);
    if (next === HISTORY_TAB) {
      params.set(TAB_PARAM, next);
    } else {
      params.delete(TAB_PARAM);
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
            {
              key: 'lineup',
              label: 'Escalação',
              icon: ClipboardList,
              disabledReason: 'A escalação chega com a etapa da Liga.',
            },
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
          {tab === HISTORY_TAB ? (
            <TransactionHistoryPanel
              clubId={data.id}
              allHistory={allHistory}
              filters={filters}
              onFiltersChange={changeFilters}
            />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
                  <h2 className="text-heading-card">Elenco</h2>
                  <p className="text-muted-foreground">
                    Ordem por posição (GOL, ZAG, LAT, MEI, ATA), depois pelo nome, como a API
                    devolve.
                  </p>
                </div>
                <SquadTable club={club} />
              </Card>
              <p className="text-xs text-muted-foreground">
                Valores em moedas. Valor de mercado, dias restantes e % de multa são calculados pela
                API no momento da consulta; datas no horário de Brasília.
              </p>
            </>
          )}
        </div>
      </div>
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
