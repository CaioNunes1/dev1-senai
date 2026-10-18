const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valor em moedas como a API devolve (ex.: 37 → "37,00"; 1744.14 → "1.744,14"). */
export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}
