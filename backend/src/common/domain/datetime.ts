/**
 * RN01: datas e horas em horário de Brasília, sempre −03:00 (sem horário de verão).
 * Entrada `AAAA-MM-DDTHH:MM-03:00`; saída `AAAA-MM-DDTHH:MM:SS-03:00`.
 */

export const MILLISECONDS_PER_DAY = 86_400_000;

const BRASILIA_OFFSET_HOURS = 3;
const MILLISECONDS_PER_HOUR = 3_600_000;
const INPUT_FORMAT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})-03:00$/;

/**
 * Converte a data e hora enviada à API num instante. Devolve `undefined` para outro
 * formato e para data ou hora inexistente (como 30/02 ou 24:00), que nunca é ajustada.
 */
export function parseBrasiliaDateTime(text: string): Date | undefined {
  const match = INPUT_FORMAT.exec(text);
  if (!match) {
    return undefined;
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }
  if (hour > 23 || minute > 59) {
    return undefined;
  }
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour + BRASILIA_OFFSET_HOURS, minute, 0, 0);
  return instant;
}

/** Formata um instante no horário de Brasília, com segundos (fração descartada). */
export function formatBrasiliaDateTime(instant: Date): string {
  const local = new Date(instant.getTime() - BRASILIA_OFFSET_HOURS * MILLISECONDS_PER_HOUR);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  const date = `${pad(local.getUTCFullYear(), 4)}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
  return `${date}T${time}-03:00`;
}

function daysInMonth(year: number, month: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}
