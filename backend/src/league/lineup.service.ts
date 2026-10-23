import { Injectable } from '@nestjs/common';
import { Player } from '@prisma/client';
import { CLUB_NOT_FOUND, lockClub } from '../clubs/club-locks';
import { BusinessRuleError, ResourceNotFoundError } from '../common/errors/domain-errors';
import { lockActivePlayer } from '../players/player-locks';
import { PrismaService } from '../prisma/prisma.service';
import { formationViolation } from './domain/formation';
import { LineupDto } from './dto/league-requests';
import { LineupResponse } from './dto/league-responses';
import { toLineupResponse } from './league.mapper';

/** RN19: escalação do clube (formação + 5 titulares). Escalar não muda o caixa. */
@Injectable()
export class LineupService {
  constructor(private readonly prisma: PrismaService) {}

  async find(clubId: number): Promise<LineupResponse> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: { lineupSlots: { include: { player: true } } },
    });
    if (!club) {
      throw new ResourceNotFoundError(CLUB_NOT_FOUND);
    }
    const starters = club.lineupSlots
      .map((slot) => slot.player)
      .filter((player) => player.deletedAt === null);
    return toLineupResponse(club.id, club.formation, starters);
  }

  /**
   * RN19 › 3–4: substitui a escalação inteira numa transação. Ordem das conferências: clube
   * (404), jogadores (404), depois elenco, DOENTE e formação (409), sem gravar nada em recusa.
   * Travas: jogadores (por id) antes do clube, a mesma ordem da compra e da venda.
   */
  async replace(clubId: number, input: LineupDto): Promise<LineupResponse> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.club.findUnique({ where: { id: clubId }, select: { id: true } }))) {
        throw new ResourceNotFoundError(CLUB_NOT_FOUND);
      }
      const starters: Player[] = [];
      for (const id of [...input.player_ids].sort((a, b) => a - b)) {
        starters.push(await lockActivePlayer(tx, id));
      }
      await lockClub(tx, clubId);
      for (const player of starters) {
        if (player.clubId !== clubId) {
          throw new BusinessRuleError(`${player.name} não é do elenco deste clube.`);
        }
        if (player.condition === 'DOENTE') {
          throw new BusinessRuleError(`${player.name} está DOENTE e não pode ser escalado.`);
        }
      }
      const violation = formationViolation(
        input.formation,
        starters.map((player) => player.position),
      );
      if (violation) {
        throw new BusinessRuleError(violation);
      }
      await tx.lineupSlot.deleteMany({ where: { clubId } });
      await tx.lineupSlot.createMany({
        data: starters.map((player) => ({ clubId, playerId: player.id })),
      });
      await tx.club.update({ where: { id: clubId }, data: { formation: input.formation } });
      return toLineupResponse(clubId, input.formation, starters);
    });
  }
}
