/**
 * Valor em moedas representado em centavos inteiros (40,05 → 4005).
 * Os cálculos de regra trabalham sempre em centavos; a conversão para o
 * NUMERIC do banco e para o número JSON da API acontece só na fronteira.
 */
export type Cents = number;

/** Valor em moedas como número JSON da resposta (4005 → 40.05). */
export function centsToNumber(cents: Cents): number {
  return cents / 100;
}

/** Valor em moedas com 2 casas e vírgula decimal, para mensagens (5040 → "50,40"). */
export function formatMoney(cents: Cents): string {
  return centsToNumber(cents).toFixed(2).replace('.', ',');
}
