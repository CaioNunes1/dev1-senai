/**
 * Valor em moedas representado em centavos inteiros (40,05 → 4005).
 * Os cálculos de regra trabalham sempre em centavos; a conversão para o
 * NUMERIC do banco e para o número JSON da API acontece só na fronteira.
 */
export type Cents = number;
