import { Injectable } from '@nestjs/common';
import { Player, Prisma } from '@prisma/client';
import { Clock } from '../common/clock/clock';
import { Cents } from '../common/domain/money';
import { BusinessRuleError, ResourceNotFoundError } from '../common/errors/domain-errors';
import { compareRosterOrder } from '../players/domain/roster-order';
import { marketValueOf } from '../players/player.mapper';
import { centsToDecimal, decimalToCents } from '../prisma/decimal';
import { isUniqueConstraintViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CLUB_NOT_FOUND } from './club-locks';
import { toClubResponse, toSquadPlayerResponse } from './club.mapper';
import { ClubSortOption, sortClubs } from './domain/club-ordering';
import { INITIAL_CASH, MAX_CLUBS, toUniqueNameKey } from './domain/club.rules';
import { ClubDetailResponse, ClubResponse } from './dto/club-response.dto';
import { CreateClubDto } from './dto/create-club.dto';

/**
 * Chave do lock transacional (`pg_advisory_xact_lock`) que enfileira as criações de clube:
 * a contagem do limite de 20 e a checagem de nome e sigla não sofrem corrida entre pedidos.
 */
const CLUB_CREATION_LOCK_KEY = 10_001;

/** RN10: o clube nasce sem jogadores, então o valor do elenco é zero. */
const NEW_CLUB_SQUAD_VALUE = 0;

const DUPLICATE_CLUB_MESSAGE = 'Já existe um clube com esse nome ou essa sigla.';

/** Jogadores ativos do elenco, com o contrato ATIVO de cada um. */
const SQUAD_WITH_ACTIVE_CONTRACTS = {
  players: {
    where: { deletedAt: null },
    include: { contracts: { where: { status: 'ATIVO' as const } } },
  },
} satisfies Prisma.ClubInclude;

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async create(input: CreateClubDto): Promise<ClubResponse> {
    const normalizedName = toUniqueNameKey(input.name);
    try {
      const club = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLUB_CREATION_LOCK_KEY})`;
        await this.ensureClubCanBeCreated(tx, normalizedName, input);
        return tx.club.create({
          data: {
            name: input.name,
            normalizedName,
            acronym: input.acronym,
            cash: centsToDecimal(INITIAL_CASH),
          },
        });
      });
      return toClubResponse(club, NEW_CLUB_SQUAD_VALUE);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new BusinessRuleError(DUPLICATE_CLUB_MESSAGE);
      }
      throw error;
    }
  }

  /** RN11: valor do elenco e patrimônio calculados a cada consulta, nunca gravados. */
  async list(sort: ClubSortOption): Promise<ClubResponse[]> {
    const clubs = await this.prisma.club.findMany({
      include: { players: { where: { deletedAt: null } } },
    });
    const valued = clubs.map((club) => {
      const { squadValue } = valueSquad(club.players);
      const netWorth = decimalToCents(club.cash) + squadValue;
      return { club, squadValue, id: club.id, name: club.name, netWorth };
    });
    return sortClubs(valued, sort).map(({ club, squadValue }) => toClubResponse(club, squadValue));
  }

  /** RN11: o clube com o elenco na ordem GOL → ATA, nome e id, e o contrato de cada jogador. */
  async findById(id: number): Promise<ClubDetailResponse> {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: SQUAD_WITH_ACTIVE_CONTRACTS,
    });
    if (!club) {
      throw new ResourceNotFoundError(CLUB_NOT_FOUND);
    }
    const now = this.clock.now();
    const { members, squadValue } = valueSquad(club.players);
    return {
      ...toClubResponse(club, squadValue),
      players: [...members]
        .sort((first, second) => compareRosterOrder(first.player, second.player))
        .map(({ player, marketValue }) =>
          toSquadPlayerResponse(player, marketValue, player.contracts[0], now),
        ),
    };
  }

  private async ensureClubCanBeCreated(
    tx: Prisma.TransactionClient,
    normalizedName: string,
    input: CreateClubDto,
  ): Promise<void> {
    if ((await tx.club.count()) >= MAX_CLUBS) {
      throw new BusinessRuleError(`A liga já tem o máximo de ${MAX_CLUBS} clubes.`);
    }
    if (await tx.club.findUnique({ where: { normalizedName }, select: { id: true } })) {
      throw new BusinessRuleError(`Já existe um clube com o nome "${input.name}".`);
    }
    if (await tx.club.findUnique({ where: { acronym: input.acronym }, select: { id: true } })) {
      throw new BusinessRuleError(`Já existe um clube com a sigla ${input.acronym}.`);
    }
  }
}

/**
 * RN11: valor de mercado de cada jogador do elenco (calculado uma vez) e
 * valor do elenco = soma desses valores.
 */
function valueSquad<T extends Player>(
  players: readonly T[],
): {
  members: { player: T; marketValue: Cents }[];
  squadValue: Cents;
} {
  const members = players.map((player) => ({ player, marketValue: marketValueOf(player) }));
  const squadValue = members.reduce((total, { marketValue }) => total + marketValue, 0);
  return { members, squadValue };
}
