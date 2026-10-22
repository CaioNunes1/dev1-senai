import { describe, expect, it } from 'vitest';
import { buyPlayerSchema } from './buy-player-schema';
import {
  brasiliaInstant,
  brasiliaParts,
  isRealDate,
  isRealTime,
  suggestedLoyalty,
  toLoyaltyUntil,
} from './loyalty-date';

/** Momento da compra do exemplo 2.3.1: 02/11/2026 às 10:15 de Brasília (13:15 UTC). */
const NOW = new Date('2026-11-02T13:15:00.000Z');
const schema = buyPlayerSchema(() => NOW);

function errorsOf(values: Record<string, string>): Record<string, string> {
  const result = schema.safeParse(values);
  const errors: Record<string, string> = {};
  for (const issue of result.success ? [] : result.error.issues) {
    errors[String(issue.path[0])] ??= issue.message;
  }
  return errors;
}

const VALID = { club_id: '1', loyalty_date: '2027-03-02', loyalty_time: '10:15' };

describe('datas de Brasília (RN01), independentes do fuso do navegador', () => {
  it('os testes rodam fora do fuso de Brasília (TZ=UTC no Vitest)', () => {
    expect(new Date('2026-11-02T13:15:00.000Z').getTimezoneOffset()).toBe(0);
  });

  it('10:15 de Brasília é 13:15 UTC, qualquer que seja o fuso local', () => {
    expect(brasiliaInstant('2027-03-02', '10:15').toISOString()).toBe('2027-03-02T13:15:00.000Z');
    expect(brasiliaInstant('2026-12-31', '22:30').toISOString()).toBe('2027-01-01T01:30:00.000Z');
  });

  it('separa um instante em data e hora de Brasília', () => {
    expect(brasiliaParts(new Date('2027-01-01T01:30:00.000Z'))).toEqual({
      date: '2026-12-31',
      time: '22:30',
    });
  });

  it('sugere um ano depois, no mesmo horário de Brasília', () => {
    expect(suggestedLoyalty(NOW)).toEqual({ date: '2027-11-02', time: '10:15' });
  });

  it.each([
    ['2027-02-28', true],
    ['2028-02-29', true],
    ['2027-02-29', false],
    ['2027-02-30', false],
    ['2027-04-31', false],
    ['2027-13-01', false],
    ['27-03-02', false],
    ['', false],
  ])('data %s existe: %p', (date, expected) => {
    expect(isRealDate(date)).toBe(expected);
  });

  it.each([
    ['00:00', true],
    ['23:59', true],
    ['24:00', false],
    ['10:60', false],
    ['9:15', false],
  ])('hora %s existe: %p', (time, expected) => {
    expect(isRealTime(time)).toBe(expected);
  });

  it('monta o texto da API sem segundos, sem Z e com -03:00', () => {
    expect(toLoyaltyUntil('2027-03-02', '10:15')).toBe('2027-03-02T10:15-03:00');
  });
});

describe('buyPlayerSchema', () => {
  it('converte o formulário no corpo exato da API: club_id número e loyalty_until RN01', () => {
    const body = schema.parse(VALID);
    expect(body).toEqual({ club_id: 1, loyalty_until: '2027-03-02T10:15-03:00' });
    expect(Object.keys(body)).toEqual(['club_id', 'loyalty_until']);
    expect(body.loyalty_until).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}-03:00$/);
  });

  it.each([
    [{ club_id: '' }, 'club_id', 'Escolha o clube comprador.'],
    [{ club_id: '0' }, 'club_id', 'Escolha o clube comprador.'],
    [{ loyalty_date: '' }, 'loyalty_date', 'Informe a data do fim da fidelidade.'],
    [{ loyalty_time: '' }, 'loyalty_time', 'Informe a hora do fim da fidelidade.'],
    [{ loyalty_date: '2027-02-30' }, 'loyalty_date', 'Essa data não existe.'],
    [{ loyalty_time: '24:00' }, 'loyalty_time', 'Use uma hora de 00:00 a 23:59.'],
  ])('%j → erro em %s', (changes, field, message) => {
    expect(errorsOf({ ...VALID, ...changes })[field]).toBe(message);
  });

  it.each([
    ['2026-11-01', '10:15', 'no passado'],
    ['2026-11-02', '10:15', 'igual ao momento da compra'],
  ])('fidelidade em %s %s (%s) → recusada', (date, time) => {
    expect(errorsOf({ ...VALID, loyalty_date: date, loyalty_time: time }).loyalty_date).toBe(
      'O fim da fidelidade precisa ser depois de agora (horário de Brasília).',
    );
  });

  it('um minuto depois de agora é aceito', () => {
    expect(errorsOf({ ...VALID, loyalty_date: '2026-11-02', loyalty_time: '10:16' })).toEqual({});
  });

  it('exatamente 1.095 dias depois é aceito; 1 minuto a mais é recusado', () => {
    expect(errorsOf({ ...VALID, loyalty_date: '2029-11-01', loyalty_time: '10:15' })).toEqual({});
    expect(
      errorsOf({ ...VALID, loyalty_date: '2029-11-01', loyalty_time: '10:16' }).loyalty_date,
    ).toBe('Use no máximo 1.095 dias a partir de agora (até 01/11/2029 às 10:15).');
  });
});
