const MAX_PAGE_BUTTONS = 7;

/**
 * Páginas mostradas como botões: todas, quando cabem; senão a primeira, a última e as
 * vizinhas da atual, com reticências nos saltos. Só páginas que existem (1..total_pages).
 */
export function visiblePages(current: number, total: number): Array<number | 'gap'> {
  if (total <= MAX_PAGE_BUTTONS) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1] > 1 ? ['gap' as const, page] : [page],
  );
}
