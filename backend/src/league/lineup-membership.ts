import { Prisma } from '@prisma/client';

/**
 * RN19: o titular sai da escalação quando é vendido ou passa a DOENTE, na mesma transação
 * da operação. A formação do clube continua salva, e a escalação fica incompleta.
 */
export async function removeFromLineup(
  tx: Prisma.TransactionClient,
  playerId: number,
): Promise<void> {
  await tx.lineupSlot.deleteMany({ where: { playerId } });
}
