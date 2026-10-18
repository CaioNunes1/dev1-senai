import { Cents } from '../../common/domain/money';

/** RN10: a liga aceita no máximo 20 clubes. */
export const MAX_CLUBS = 20;

/** RN10: o clube nasce com 300,00 em caixa e sem jogadores. */
export const INITIAL_CASH: Cents = 30000;

/**
 * RN10: o nome é único ignorando maiúsculas e minúsculas, mas considerando acentos.
 * Recebe o nome já normalizado pela V4; o resultado é gravado em `clubes.nome_normalizado`,
 * coluna com índice único ("Águias FC" e "águias fc" colidem; "Aguias FC" não).
 */
export function toUniqueNameKey(name: string): string {
  return name.toLowerCase();
}
