const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valor em moedas como a API devolve (ex.: 37 → "37,00"; 1744.14 → "1.744,14"). */
export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

/** Primeira letra minúscula, para compor rótulos (ex.: "Ordenar: nome"). */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('pt-BR') + text.slice(1);
}

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Inteiro com separador de milhar (ex.: dias restantes 1089 → "1.089"). */
export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** Percentual como a API devolve, em pontos (ex.: 10 → "10%"). */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

/** RN01: datas sempre no horário de Brasília, qualquer que seja o fuso do computador. */
const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const brasiliaDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const brasiliaTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Data e hora da API (ex.: "2027-03-02T10:15:00-03:00") → { date: "02/03/2027", time: "10:15" },
 * no horário de Brasília. Texto fora do formato volta como veio, sem quebrar a tela.
 */
export function formatBrasiliaDateTime(value: string): { date: string; time: string } {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return { date: value, time: '' };
  }
  return {
    date: brasiliaDateFormatter.format(instant),
    time: brasiliaTimeFormatter.format(instant),
  };
}
