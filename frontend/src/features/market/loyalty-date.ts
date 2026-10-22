/**
 * RN01: o fim da fidelidade é digitado e enviado no horário de Brasília (sempre −03:00, sem
 * horário de verão). As contas usam o deslocamento fixo, nunca o fuso do navegador.
 */
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Limites de cada campo › `loyalty_until`: até 1.095 dias depois do momento da compra. */
export const MAX_LOYALTY_DAYS = 1095;

const DATE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_FORMAT = /^(\d{2}):(\d{2})$/;

/** Data `AAAA-MM-DD` que existe no calendário (30/02 não existe). */
export function isRealDate(date: string): boolean {
  const match = DATE_FORMAT.exec(date);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

/** Hora `HH:MM` de 00:00 a 23:59. */
export function isRealTime(time: string): boolean {
  const match = TIME_FORMAT.exec(time);
  return match !== null && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

/** Instante de uma data e hora de Brasília já validadas. */
export function brasiliaInstant(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + BRASILIA_OFFSET_MS);
}

/** Texto enviado à API, exatamente `AAAA-MM-DDTHH:MM-03:00` (sem segundos, sem `Z`). */
export function toLoyaltyUntil(date: string, time: string): string {
  return `${date}T${time}-03:00`;
}

/** Data e hora de Brasília de um instante, no formato dos campos `date` e `time`. */
export function brasiliaParts(instant: Date): { date: string; time: string } {
  const local = new Date(instant.getTime() - BRASILIA_OFFSET_MS);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return {
    date: `${pad(local.getUTCFullYear(), 4)}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/** Último instante aceito: exatamente 1.095 dias depois de `now`. */
export function latestLoyaltyInstant(now: Date): Date {
  return new Date(now.getTime() + MAX_LOYALTY_DAYS * DAY_MS);
}

/** Sugestão do formulário: um ano depois de agora, no mesmo horário de Brasília. */
export function suggestedLoyalty(now: Date): { date: string; time: string } {
  return brasiliaParts(new Date(now.getTime() + 365 * DAY_MS));
}
