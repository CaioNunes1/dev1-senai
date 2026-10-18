import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

describe('formatMoney', () => {
  it.each([
    [37, '37,00'],
    [40.4, '40,40'],
    [0, '0,00'],
    [1744.14, '1.744,14'],
    [550, '550,00'],
  ])('%d → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});
