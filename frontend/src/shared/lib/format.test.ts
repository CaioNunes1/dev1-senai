import { describe, expect, it } from 'vitest';
import {
  formatBrasiliaDateTime,
  formatInteger,
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from './format';

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

describe('formatBrasiliaDateTime', () => {
  it('mostra data e hora da API no horário de Brasília', () => {
    expect(formatBrasiliaDateTime('2027-03-02T10:15:00-03:00')).toEqual({
      date: '02/03/2027',
      time: '10:15',
    });
  });

  it('converte para Brasília mesmo quando o instante vem em outro fuso', () => {
    expect(formatBrasiliaDateTime('2026-12-11T02:30:00Z')).toEqual({
      date: '10/12/2026',
      time: '23:30',
    });
  });

  it('devolve o texto como veio quando não é uma data', () => {
    expect(formatBrasiliaDateTime('amanhã')).toEqual({ date: 'amanhã', time: '' });
  });
});

describe('formatInteger e formatPercent', () => {
  it.each([
    [0, '0'],
    [29, '29'],
    [1089, '1.089'],
  ])('dias %d → %s', (value, expected) => {
    expect(formatInteger(value)).toBe(expected);
  });

  it.each([
    [0, '0%'],
    [5, '5%'],
    [20, '20%'],
  ])('multa %d → %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe('formatSignedMoney', () => {
  it.each([
    [35.7, '+35,70'],
    [-38.85, '-38,85'],
    [3, '+3,00'],
    [-5.7, '-5,70'],
    [0, '0,00'],
    [-0, '0,00'],
    [1744.14, '+1.744,14'],
  ])('%d → %s', (value, expected) => {
    expect(formatSignedMoney(value)).toBe(expected);
  });
});
