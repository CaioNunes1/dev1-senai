import { Club, Prisma } from '@prisma/client';
import { ResourceNotFoundError } from '../common/errors/domain-errors';

export const CLUB_NOT_FOUND = 'Clube não encontrado.';

/** Trava a linha do clube até o fim da transação: o caixa e o elenco não mudam no meio da operação. */
export async function lockClub(tx: Prisma.TransactionClient, id: number): Promise<Club> {
  const locked = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM clubes WHERE id = ${id} FOR UPDATE`;
  if (locked.length === 0) {
    throw new ResourceNotFoundError(CLUB_NOT_FOUND);
  }
  return tx.club.findUniqueOrThrow({ where: { id } });
}
