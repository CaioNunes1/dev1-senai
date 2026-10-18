import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CLUB_NOT_FOUND } from '../clubs/club-locks';
import { Clock } from '../common/clock/clock';
import { Page, paginate } from '../common/domain/pagination';
import { BusinessRuleError, ResourceNotFoundError } from '../common/errors/domain-errors';
import { centsToDecimal } from '../prisma/decimal';
import { removeFromLineup } from '../league/lineup-membership';
import { PrismaService } from '../prisma/prisma.service';
import { calculateBaseValue } from './domain/base-value';
import { canChangeCondition, leavesLineup } from './domain/condition-transition';
import { calculateOverall } from './domain/overall';
import { selectPlayers } from './domain/player-listing';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerListQuery } from './dto/player-list-query';
import { PlayerResponse } from './dto/player-response.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { lockActivePlayer, PLAYER_NOT_FOUND } from './player-locks';
import { marketValueOf, toPlayerResponse } from './player.mapper';

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** RN06: o valor base é calculado uma única vez, no cadastro, e gravado. */
  async create(input: CreatePlayerDto): Promise<PlayerResponse> {
    const overall = calculateOverall(input.position, input);
    const baseValue = calculateBaseValue({
      overall,
      potential: input.potential,
      ageAtRegistration: input.age,
    });
    const player = await this.prisma.player.create({
      data: {
        name: input.name,
        position: input.position,
        agility: input.agility,
        age: input.age,
        pace: input.pace,
        shooting: input.shooting,
        passing: input.passing,
        dribbling: input.dribbling,
        defending: input.defending,
        physical: input.physical,
        potential: input.potential,
        baseValue: centsToDecimal(baseValue),
      },
    });
    return toPlayerResponse(player);
  }

  async findById(id: number): Promise<PlayerResponse> {
    const player = await this.prisma.player.findFirst({ where: { id, deletedAt: null } });
    if (!player) {
      throw new ResourceNotFoundError(PLAYER_NOT_FOUND);
    }
    return toPlayerResponse(player);
  }

  /** RN08: muda só nome, posição, agilidade e idade; indicadores e valor base continuam. */
  async update(id: number, input: UpdatePlayerDto): Promise<PlayerResponse> {
    const player = await this.prisma.$transaction(async (tx) => {
      const current = await lockActivePlayer(tx, id);
      if (current.clubId !== null && input.position !== current.position) {
        throw new BusinessRuleError('Jogador com clube não pode mudar de posição.');
      }
      if (input.age < current.age) {
        throw new BusinessRuleError(
          `A idade não pode diminuir (atual: ${current.age}, enviada: ${input.age}).`,
        );
      }
      return tx.player.update({
        where: { id },
        data: {
          name: input.name,
          position: input.position,
          agility: input.agility,
          age: input.age,
        },
      });
    });
    return toPlayerResponse(player);
  }

  /**
   * Altera a condição física. De DOENTE não vai direto para APTO; enviar a condição atual
   * não muda nada. Quem passa a DOENTE sai da escalação na mesma transação (RN19).
   */
  async changeCondition(id: number, input: UpdateConditionDto): Promise<PlayerResponse> {
    const player = await this.prisma.$transaction(async (tx) => {
      const current = await lockActivePlayer(tx, id);
      if (current.condition === input.condition) {
        return current;
      }
      if (!canChangeCondition(current.condition, input.condition)) {
        throw new BusinessRuleError(
          `Jogador ${current.condition} não pode passar direto para ${input.condition}.`,
        );
      }
      if (leavesLineup(input.condition)) {
        await removeFromLineup(tx, id);
      }
      return tx.player.update({ where: { id }, data: { condition: input.condition } });
    });
    return toPlayerResponse(player);
  }

  /** RN09: exclusão lógica, só de jogador livre; nada é apagado do banco. */
  async remove(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockActivePlayer(tx, id);
      if (current.clubId !== null) {
        throw new BusinessRuleError(
          'Só jogador livre pode ser excluído; este jogador está num clube.',
        );
      }
      await tx.player.update({ where: { id }, data: { deletedAt: this.clock.now() } });
    });
  }

  /**
   * RN07: o banco aplica os filtros que são colunas; a aplicação calcula o valor de
   * mercado (com a mesma função das demais respostas) e faz busca, faixa de valor,
   * ordenação e paginação (ADR-004).
   */
  async list(query: PlayerListQuery): Promise<Page<PlayerResponse>> {
    if (query.clubId !== undefined) {
      await this.ensureClubExists(query.clubId);
    }
    const players = await this.prisma.player.findMany({ where: this.columnFilters(query) });
    const selected = selectPlayers(
      players.map((player) => ({ ...player, marketValue: marketValueOf(player) })),
      query,
    );
    const page = paginate(selected, query.page, query.limit);
    return {
      data: page.data.map((player) => toPlayerResponse(player, player.marketValue)),
      meta: page.meta,
    };
  }

  private columnFilters(query: PlayerListQuery): Prisma.PlayerWhereInput {
    const filters: Prisma.PlayerWhereInput[] = [
      { deletedAt: null },
      { age: { gte: query.minAge, lte: query.maxAge } },
    ];
    if (query.position) filters.push({ position: query.position });
    if (query.condition) filters.push({ condition: query.condition });
    if (query.free === true) filters.push({ clubId: null });
    if (query.free === false) filters.push({ clubId: { not: null } });
    if (query.clubId !== undefined) filters.push({ clubId: query.clubId });
    return { AND: filters };
  }

  private async ensureClubExists(clubId: number): Promise<void> {
    if (!(await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } }))) {
      throw new ResourceNotFoundError(CLUB_NOT_FOUND);
    }
  }
}
