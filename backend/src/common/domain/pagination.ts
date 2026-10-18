export interface PageMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * RN07: a paginação é aplicada depois de buscar, filtrar e ordenar. `total_items` conta
 * todos os itens; `total_pages` = ⌈total ÷ limit⌉ (0 sem itens); página além da última
 * devolve `data` vazio com o `meta` correto.
 */
export function paginate<T>(items: readonly T[], page: number, limit: number): Page<T> {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      page,
      limit,
      total_items: items.length,
      total_pages: Math.ceil(items.length / limit),
    },
  };
}
