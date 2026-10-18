import { Player, Prisma } from '@prisma/client';
import { ResourceNotFoundError } from '../common/errors/domain-errors';

export const PLAYER_NOT_FOUND = 'Jogador não encontrado.';

/**
 * Trava a linha do jogador ativo até o fim da transação (`SELECT … FOR UPDATE`, ADR-007),
 * para que edição, condição, exclusão, compra e venda do mesmo jogador não se cruzem.
 * Jogador excluído conta como inexistente (RN09).
 */
export async function lockActivePlayer(tx: Prisma.TransactionClient, id: number): Promise<Player> {
  const locked = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM jogadores WHERE id = ${id} AND excluido_em IS NULL FOR UPDATE`;
  if (locked.length === 0) {
    throw new ResourceNotFoundError(PLAYER_NOT_FOUND);
  }
  return tx.player.findUniqueOrThrow({ where: { id } });
}
