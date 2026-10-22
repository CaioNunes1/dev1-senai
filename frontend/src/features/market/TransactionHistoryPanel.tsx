import { Download, History, LoaderCircle, SearchX } from 'lucide-react';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { useApiAction } from '../../shared/hooks/use-api-action';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { useToast } from '../../shared/hooks/toast';
import { saveFile } from '../../shared/lib/download';
import { exportClubTransactions, type TransactionHistory } from './api';
import {
  describeFilters,
  hasActiveFilters,
  historyPlayerOptions,
  NO_TRANSACTION_FILTERS,
  type TransactionFilters,
} from './transaction-filters';
import { TransactionFiltersBar } from './TransactionFiltersBar';
import { TransactionsTable } from './TransactionsTable';
import { TransactionSummaryBar } from './TransactionSummaryBar';
import { useClubTransactions } from './use-transactions';

type TransactionHistoryPanelProps = {
  clubId: number;
  /** Histórico sem filtro, já carregado pela página (contagem da aba e jogadores do filtro). */
  allHistory: ApiQuery<TransactionHistory>;
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
};

/**
 * Aba Histórico do clube (RN17, RN18; Figma H01–H05 e E05). Sem filtro, mostra o histórico
 * que a página já carregou; com filtro, consulta a API com ele. Tabela e totais saem sempre
 * da mesma resposta, e o CSV é o da API, pedido com os mesmos filtros.
 */
export function TransactionHistoryPanel({
  clubId,
  allHistory,
  filters,
  onFiltersChange,
}: TransactionHistoryPanelProps) {
  const filtered = hasActiveFilters(filters);
  const filteredHistory = useClubTransactions(clubId, filters, filtered);
  const history = filtered ? filteredHistory : allHistory;
  const playerOptions = historyPlayerOptions(allHistory.data?.data ?? []);
  const showToast = useToast();

  const exporter = useApiAction(
    async (exportFilters: TransactionFilters) => ({
      file: await exportClubTransactions(clubId, exportFilters),
      exportFilters,
    }),
    {
      onSuccess: ({ file, exportFilters }) => {
        const fileName = `historico-clube-${clubId}.csv`;
        saveFile(file, fileName);
        const player = playerOptions.find(
          (option) => option.value === String(exportFilters.playerId),
        );
        showToast({
          variant: 'success',
          title: 'CSV baixado',
          description: `${fileName}, ${describeFilters(exportFilters, player?.label)}.`,
        });
      },
    },
  );

  function changeFilters(next: TransactionFilters) {
    exporter.clearError();
    onFiltersChange(next);
  }

  const refused =
    filtered && (history.error?.status === 400 || history.error?.status === 404)
      ? history.error
      : undefined;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-heading-card">Histórico de transações</h2>
              <p className="text-muted-foreground">
                Da mais recente para a mais antiga, com o nome e os valores do momento de cada
                operação.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={exporter.isPending || history.error !== undefined}
              onClick={() => void exporter.run(filters)}
            >
              {exporter.isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {exporter.isPending ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </div>
          <TransactionFiltersBar
            filters={filters}
            playerOptions={playerOptions}
            playersUnavailable={
              allHistory.data === undefined && filters.playerId === undefined
                ? 'Os jogadores do filtro saem do histórico, que ainda não carregou.'
                : undefined
            }
            onChange={changeFilters}
          />
          {exporter.error && (
            <Alert variant="destructive" title="Não foi possível exportar o CSV">
              {exporter.error.message} Nenhum arquivo foi baixado; tente de novo.
            </Alert>
          )}
        </div>
        <div className="border-t border-border">
          {refused ? (
            <div className="p-4">
              <Alert variant="destructive" title="O filtro foi recusado">
                {refused.message}
              </Alert>
            </div>
          ) : (
            <TransactionsTable
              history={history}
              empty={
                filtered ? (
                  <EmptyState
                    icon={SearchX}
                    title="Nenhuma transação com esses filtros"
                    description="Nenhuma compra ou venda deste clube corresponde aos filtros. Os totais abaixo são do mesmo conjunto."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => changeFilters(NO_TRANSACTION_FILTERS)}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={History}
                    title="Nenhuma transação ainda"
                    description="As compras e vendas do clube aparecem aqui, com os totais logo abaixo."
                  />
                )
              }
            />
          )}
          {history.error === undefined && <TransactionSummaryBar summary={history.data?.summary} />}
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        Valores em moedas, gravados pela API em cada operação; datas no horário de Brasília. Os
        totais e o CSV usam os mesmos filtros da tabela.
      </p>
    </>
  );
}
