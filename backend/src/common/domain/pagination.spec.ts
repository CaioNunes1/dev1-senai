import { paginate } from './pagination';

describe('paginate (RN07, tabela oficial)', () => {
  const items = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it.each([
    // itens, limit, page, itens em data, primeiro, último, total_pages
    [23, 10, 1, 10, 1, 10, 3],
    [23, 10, 3, 3, 21, 23, 3],
    [23, 10, 4, 0, undefined, undefined, 3],
    [23, 50, 1, 23, 1, 23, 1],
    [0, 10, 1, 0, undefined, undefined, 0],
  ])(
    '%i itens, limit %i, page %i → %i em data',
    (count, limit, page, dataLength, first, last, totalPages) => {
      const result = paginate(items(count), page, limit);

      expect(result.data).toHaveLength(dataLength);
      expect(result.data[0]).toBe(first);
      expect(result.data.at(-1)).toBe(last);
      expect(result.meta).toEqual({
        page,
        limit,
        total_items: count,
        total_pages: totalPages,
      });
    },
  );
});
