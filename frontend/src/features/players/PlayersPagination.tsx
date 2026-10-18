import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import type { PageMeta } from './api';
import { visiblePages } from './pagination';

type PlayersPaginationProps = {
  meta: PageMeta;
  shownCount: number;
  onPageChange: (page: number) => void;
};

/** Rodapé da tabela (Figma: CardFooter · Paginação): resumo e navegação pelos metadados da API. */
export function PlayersPagination({ meta, shownCount, onPageChange }: PlayersPaginationProps) {
  const first = (meta.page - 1) * meta.limit + 1;
  const summary =
    shownCount > 0
      ? `Mostrando ${first}–${first + shownCount - 1} de ${playersText(meta.total_items)}`
      : playersText(meta.total_items);

  return (
    <nav
      aria-label="Paginação dos jogadores"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
    >
      <p className="text-muted-foreground">{summary}</p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Anterior"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        {visiblePages(meta.page, meta.total_pages).map((page, index) =>
          page === 'gap' ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === meta.page ? 'outline' : 'ghost'}
              size="icon"
              aria-label={`Página ${page}`}
              aria-current={page === meta.page ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Próxima"
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function playersText(count: number): string {
  return count === 1 ? '1 jogador' : `${count} jogadores`;
}
