import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessRuleError } from '../common/errors/domain-errors';
import { centsToDecimal } from '../prisma/decimal';
import { isUniqueConstraintViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { toClubResponse } from './club.mapper';
import { INITIAL_CASH, MAX_CLUBS, toUniqueNameKey } from './domain/club.rules';
import { ClubResponse } from './dto/club-response.dto';
import { CreateClubDto } from './dto/create-club.dto';

/**
 * Chave do lock transacional (`pg_advisory_xact_lock`) que enfileira as criações de clube:
 * a contagem do limite de 20 e a checagem de nome e sigla não sofrem corrida entre pedidos.
 */
const CLUB_CREATION_LOCK_KEY = 10_001;

/** RN10: o clube nasce sem jogadores, então o valor do elenco é zero. */
const NEW_CLUB_SQUAD_VALUE = 0;

const DUPLICATE_CLUB_MESSAGE = 'Já existe um clube com esse nome ou essa sigla.';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

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
