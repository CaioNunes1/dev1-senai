import { Injectable } from '@nestjs/common';
import { Club, Player, Prisma } from '@prisma/client';
import { CLUB_NOT_FOUND, lockClub } from '../clubs/club-locks';
import { Clock } from '../common/clock/clock';
import { BusinessRuleError, ResourceNotFoundError } from '../common/errors/domain-errors';
import { PrismaService } from '../prisma/prisma.service';
import { STARTERS } from './domain/formation';
import { Duel, playMatch } from './domain/match-engine';
import { computeStandings } from './domain/standings';
import { PlayMatchDto } from './dto/league-requests';
import { MatchResponse, MatchSummaryResponse, StandingResponse } from './dto/league-responses';
import { toMatchResponse, toMatchSummaryResponse, toStandingResponse } from './league.mapper';

const MATCH_NOT_FOUND = 'Partida não encontrada.';

const WITH_CLUBS = { homeClub: true, awayClub: true } satisfies Prisma.MatchInclude;
const WITH_DUELS = { ...WITH_CLUBS, duels: true } satisfies Prisma.MatchInclude;

interface Lineup {
  club: Club;
  formation: string;
  starters: Player[];
}

/** RN20 e RN21: jogar partidas, histórico e classificação. */
@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /**
   * RN20: confere os clubes (404) e as escalações (409), joga os 6 duelos com os titulares do
   * momento e grava a partida e os duelos numa transação. Não muda caixa, escalação nem
   * jogadores. Os clubes ficam travados, para uma venda não tirar um titular no meio.
   */
  async play(input: PlayMatchDto): Promise<MatchResponse> {
    return this.prisma.$transaction(async (tx) => {
      const [firstId, secondId] = [input.home_club_id, input.away_club_id].sort((a, b) => a - b);
      await lockClub(tx, firstId);
      await lockClub(tx, secondId);
      const home = await this.completeLineup(tx, input.home_club_id);
      const away = await this.completeLineup(tx, input.away_club_id);
      const outcome = playMatch(home.starters, away.starters);
      const match = await tx.match.create({
        data: {
          homeClubId: home.club.id,
          awayClubId: away.club.id,
          homeGoals: outcome.homeGoals,
          awayGoals: outcome.awayGoals,
          homeFormation: home.formation,
          awayFormation: away.formation,
          playedAt: this.clock.now(),
          duels: {
            create: outcome.duels.map((duel) =>
              toDuelRecord(duel, duel.attackingSide === 'home' ? home.club.id : away.club.id),
            ),
          },
        },
        include: WITH_DUELS,
      });
      return toMatchResponse(match);
    });
  }

  /** RN21 › 1: da mais recente para a mais antiga; no mesmo instante, maior id primeiro. */
  async list(clubId: number | undefined): Promise<MatchSummaryResponse[]> {
    if (
      clubId !== undefined &&
      !(await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } }))
    ) {
      throw new ResourceNotFoundError(CLUB_NOT_FOUND);
    }
    const matches = await this.prisma.match.findMany({
      where:
        clubId === undefined ? undefined : { OR: [{ homeClubId: clubId }, { awayClubId: clubId }] },
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
      include: WITH_CLUBS,
    });
    return matches.map(toMatchSummaryResponse);
  }

  async findById(id: number): Promise<MatchResponse> {
    const match = await this.prisma.match.findUnique({ where: { id }, include: WITH_DUELS });
    if (!match) {
      throw new ResourceNotFoundError(MATCH_NOT_FOUND);
    }
    return toMatchResponse(match);
  }

  /** RN21 › 3–5: calculada a cada consulta, com todos os clubes. */
  async standings(): Promise<StandingResponse[]> {
    const [clubs, matches] = await Promise.all([
      this.prisma.club.findMany({ select: { id: true, name: true } }),
      this.prisma.match.findMany({
        select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
      }),
    ]);
    return computeStandings(clubs, matches).map(toStandingResponse);
  }

  /** RN20 › 1: o clube precisa ter a formação e os 5 titulares (RN19). */
  private async completeLineup(tx: Prisma.TransactionClient, clubId: number): Promise<Lineup> {
    const club = await tx.club.findUniqueOrThrow({
      where: { id: clubId },
      include: { lineupSlots: { include: { player: true } } },
    });
    const starters = club.lineupSlots.map((slot) => slot.player);
    if (club.formation === null || starters.length !== STARTERS) {
      throw new BusinessRuleError(
        `O ${club.name} não tem a escalação completa (${STARTERS} titulares) e não pode jogar. ` +
          'Escale o time de novo antes da partida.',
      );
    }
    return { club, formation: club.formation, starters };
  }
}

/** RN20 › 7: o duelo gravado com os dados do momento (nomes, posições, condições e valores). */
function toDuelRecord(
  duel: Duel,
  attackingClubId: number,
): Prisma.MatchDuelUncheckedCreateWithoutMatchInput {
  return {
    order: duel.order,
    attackingClubId,
    attackerId: duel.attacker.player.id,
    defenderId: duel.defender.player.id,
    attackerName: duel.attacker.player.name,
    defenderName: duel.defender.player.name,
    attackerPosition: duel.attacker.player.position,
    defenderPosition: duel.defender.player.position,
    attackerCondition: duel.attacker.player.condition,
    defenderCondition: duel.defender.player.condition,
    attackAttribute: duel.attacker.attribute,
    defenseAttribute: duel.defender.attribute,
    attackValue: duel.attacker.value,
    defenseValue: duel.defender.value,
    goal: duel.goal,
  };
}
