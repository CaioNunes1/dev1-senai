import { calculatePenalty, calculateRemainingDays, penaltyRateFor } from './loyalty-penalty';

const now = new Date('2026-11-05T19:40:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const after = (milliseconds: number) => new Date(now.getTime() + milliseconds);

describe('RN15 — dias restantes e percentual (tabela oficial)', () => {
  it.each([
    ['já passou', -DAY, 0, 0],
    ['é o próprio momento', 0, 0, 0],
    ['1 milissegundo', 1, 1, 5],
    ['10 dias e 2 horas', 10 * DAY + 2 * HOUR, 11, 5],
    ['exatamente 30 dias', 30 * DAY, 30, 5],
    ['30 dias e 1 minuto', 30 * DAY + MINUTE, 31, 10],
    ['exatamente 180 dias', 180 * DAY, 180, 10],
    ['180 dias e 1 minuto', 180 * DAY + MINUTE, 181, 20],
    ['200 dias', 200 * DAY, 200, 20],
    [
      '116 dias, 17 horas e 35 minutos (exemplo da venda)',
      116 * DAY + 17 * HOUR + 35 * MINUTE,
      117,
      10,
    ],
    [
      '30 dias, 6 horas, 1 minuto e 29 segundos (ficha-exemplo)',
      30 * DAY + 6 * HOUR + MINUTE + 29_000,
      31,
      10,
    ],
    [
      '199 dias, 23 horas, 57 minutos e 50 segundos (ficha-exemplo)',
      199 * DAY + 23 * HOUR + 57 * MINUTE + 50_000,
      200,
      20,
    ],
  ])('%s → %i dias, %i%%', (_description, offset, days, rate) => {
    const remainingDays = calculateRemainingDays(after(offset), now);
    expect(remainingDays).toBe(days);
    expect(penaltyRateFor(remainingDays)).toBe(rate);
  });
});

describe('RN15 — multa com teto de 10,00', () => {
  it.each([
    [4000, 10, 400, '10% de 40,00'],
    [4250, 20, 850, '20% de 42,50'],
    [3000, 5, 150, '5% de 30,00'],
    [7500, 20, 1000, '20% de 75,00 = 15,00, limitada a 10,00'],
    [5000, 20, 1000, '20% de 50,00 = 10,00, exatamente no teto'],
    [6400, 10, 640, '10% de 64,00 (ficha-exemplo)'],
    [2525, 5, 126, '5% de 25,25 = 1,2625'],
    [2530, 5, 127, '5% de 25,30 = 1,265: meio para longe do zero'],
    [4000, 0, 0, 'sem multa'],
  ])('valor %i com %i%% → %i (%s)', (value, rate, penalty) => {
    expect(calculatePenalty(value, rate)).toBe(penalty);
  });
});
