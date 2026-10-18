import { LoaderCircle, RefreshCw, ServerOff } from 'lucide-react';
import type { Key, ReactNode } from 'react';
import type { ApiError } from '../api/http-client';
import { cx } from '../lib/cx';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export type Column<T> = {
  key: string;
  header: string;
  /** Números e valores alinhados à direita (padrão do Figma). */
  align?: 'left' | 'right';
  /** Largura fixa da coluna; sem ela, a coluna ocupa o espaço livre. */
  widthClass?: string;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => Key;
  isLoading: boolean;
  loadingLabel: string;
  error: ApiError | undefined;
  errorTitle: string;
  onRetry: () => void;
  /** Conteúdo mostrado quando a API devolve a lista vazia. */
  empty: ReactNode;
  skeletonRows?: number;
};

/**
 * Tabela com os três estados exigidos nas telas de lista (F3): carregando (esqueleto),
 * vazia e erro com o `message` da API. Ao recarregar, mantém as linhas visíveis.
 * A tabela rola na horizontal dentro do próprio quadro em telas estreitas.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  isLoading,
  loadingLabel,
  error,
  errorTitle,
  onRetry,
  empty,
  skeletonRows = 10,
}: DataTableProps<T>) {
  if (error) {
    return (
      <EmptyState
        role="alert"
        icon={ServerOff}
        title={errorTitle}
        description={error.message}
        action={
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Tentar de novo
          </Button>
        }
      />
    );
  }

  if (rows !== undefined && rows.length === 0 && !isLoading) {
    return empty;
  }

  return (
    <div className="relative">
      {isLoading && (
        <p
          role="status"
          className={cx(
            'flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground',
            rows !== undefined && 'sr-only',
          )}
        >
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {loadingLabel}
        </p>
      )}
      <div className="overflow-x-auto">
        <table
          aria-busy={isLoading}
          className={cx(
            'w-full min-w-4xl border-collapse text-sm transition-opacity',
            isLoading && rows !== undefined && 'opacity-60',
          )}
        >
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted-subtle">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(
                    'h-10 px-2 font-medium whitespace-nowrap text-muted-foreground first:pl-4 last:pr-4',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.widthClass,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === undefined
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <tr
                    key={index}
                    aria-hidden="true"
                    className="h-14 border-b border-border last:border-0"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-2 first:pl-4 last:pr-4">
                        <div
                          className={cx(
                            'h-3 animate-pulse rounded-full bg-muted',
                            column.align === 'right' ? 'ml-auto w-10' : 'w-20',
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={rowKey(row)} className="h-14 border-b border-border last:border-0">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cx(
                          'px-2 whitespace-nowrap first:pl-4 last:pr-4',
                          column.align === 'right' && 'text-right',
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
