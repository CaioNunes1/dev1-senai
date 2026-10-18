import { describe, expect, it } from 'vitest';
import { visiblePages } from './pagination';

describe('visiblePages', () => {
  it.each([
    [1, 0, []],
    [1, 1, [1]],
    [2, 3, [1, 2, 3]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 10, [1, 2, 'gap', 10]],
    [5, 10, [1, 'gap', 4, 5, 6, 'gap', 10]],
    [10, 10, [1, 'gap', 9, 10]],
    [3, 10, [1, 2, 3, 4, 'gap', 10]],
  ])('página %i de %i → %j', (current, total, expected) => {
    expect(visiblePages(current, total)).toEqual(expected);
  });
});
