import { Injectable } from '@nestjs/common';
import { Club, Player, Prisma } from '@prisma/client';
import { lockClub } from '../clubs/club-locks';
import { Clock } from '../common/clock/clock';
import { formatBrasiliaDateTime, parseBrasiliaDateTime } from '../common/domain/datetime';
import { centsToNumber, formatMoney } from '../common/domain/money';
import { BusinessRuleError, InvalidInputError } from '../common/errors/domain-errors';
import { removeFromLineup } from '../league/lineup-membership';
import { lockActivePlayer } from '../players/player-locks';
import { marketValueOf } from '../players/player.mapper';
import { centsToDecimal, decimalToCents } from '../prisma/decimal';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculatePurchaseFee,
  fitsCashLimit,
  isWithinLoyaltyWindow,
  MAX_LOYALTY_DAYS,
  MAX_SQUAD_SIZE,
} from './domain/purchase';
import { settleSale } from './domain/sale';
import { BuyPlayerDto } from './dto/buy-player.dto';
import { PurchaseResponse, SaleResponse } from './dto/market-response.dto';
import { toTransactionResponse } from './transaction.mapper';

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /**
   * RN12–RN14: compra pelo valor de mercado do momento + taxa, dentro de 50% do caixa e
   * do limite de elenco. Numa única transação: desconta o caixa, põe o jogador no elenco,
   * cria o contrato ATIVO e grava a transação COMPRA.
   */
  async buy(playerId: number, input: BuyPlayerDto): Promise<PurchaseResponse> {
    const now = this.clock.now();
    const loyaltyUntil = this.parseLoyaltyUntil(input.loyalty_until, now);

    return this.prisma.$transaction(async (tx) => {
      const player = await lockActivePlayer(tx, playerId);
      const club = await lockClub(tx, input.club_id);
      await this.ensurePlayerCanBeBought(tx, player, club);

      const marketValue = marketValueOf(player);
      const fee = calculatePurchaseFee(marketValue);
      const totalCost = marketValue + fee;
      const cash = decimalToCents(club.cash);
      if (!fitsCashLimit(totalCost, cash)) {
        throw new BusinessRuleError(
          `O custo da compra (${formatMoney(totalCost)}) passa do limite de 50% do caixa (caixa: ${formatMoney(cash)}).`,
        );
      }
      const clubCash = cash - totalCost;

      await tx.club.update({ where: { id: club.id }, data: { cash: centsToDecimal(clubCash) } });
      await tx.player.update({ where: { id: player.id }, data: { clubId: club.id } });
      const contract = await tx.contract.create({
        data: {
          playerId: player.id,
          clubId: club.id,
          purchaseValue: centsToDecimal(marketValue),
          loyaltyUntil,
          status: 'ATIVO',
          startedAt: now,
        },
      });
      const transaction = await tx.marketTransaction.create({
        data: {
          clubId: club.id,
          playerId: player.id,
          playerName: player.name,
          type: 'COMPRA',
          value: centsToDecimal(marketValue),
          fee: centsToDecimal(fee),
          penalty: centsToDecimal(0),
          profit: null,
          cashChange: centsToDecimal(-totalCost),
          createdAt: now,
        },
      });

      return {
        ...toTransactionResponse(transaction),
        contract: {
          purchase_value: centsToNumber(marketValue),
          loyalty_until: formatBrasiliaDateTime(contract.loyaltyUntil),
          status: contract.status,
        },
        club_cash: centsToNumber(clubCash),
      };
    });
  }

  /**
   * RN15–RN16: venda pelo clube atual, pelo valor de mercado do momento, com multa por
   * fidelidade e comissão sobre o lucro. Numa única transação: credita o caixa, libera o
   * jogador, encerra ou rescinde o contrato, tira o jogador da escalação e grava a VENDA.
   */
  async sell(playerId: number): Promise<SaleResponse> {
    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      const player = await lockActivePlayer(tx, playerId);
      if (player.clubId === null) {
        throw new BusinessRuleError('Jogador livre (sem clube) não pode ser vendido.');
      }
      const club = await lockClub(tx, player.clubId);
      const contract = await tx.contract.findFirstOrThrow({
        where: { playerId: player.id, clubId: club.id, status: 'ATIVO' },
      });

      const marketValue = marketValueOf(player);
      const purchaseValue = decimalToCents(contract.purchaseValue);
      const sale = settleSale({
        marketValue,
        purchaseValue,
        loyaltyUntil: contract.loyaltyUntil,
        now,
      });
      const clubCash = decimalToCents(club.cash) + sale.credit;

      await tx.club.update({ where: { id: club.id }, data: { cash: centsToDecimal(clubCash) } });
      await tx.player.update({ where: { id: player.id }, data: { clubId: null } });
      await tx.contract.update({
        where: { id: contract.id },
        data: { status: sale.contractStatus, endedAt: now },
      });
      await removeFromLineup(tx, player.id);
      const transaction = await tx.marketTransaction.create({
        data: {
          clubId: club.id,
          playerId: player.id,
          playerName: player.name,
          type: 'VENDA',
          value: centsToDecimal(marketValue),
          fee: centsToDecimal(sale.commission),
          penalty: centsToDecimal(sale.penalty),
          profit: centsToDecimal(sale.profit),
          cashChange: centsToDecimal(sale.credit),
          createdAt: now,
        },
      });

      return {
        ...toTransactionResponse(transaction),
        purchase_value: centsToNumber(purchaseValue),
        remaining_days: sale.remainingDays,
        penalty_rate: sale.penaltyRate,
        contract_status: sale.contractStatus,
        club_cash: centsToNumber(clubCash),
      };
    });
  }

  /** O formato já foi validado no DTO; aqui entra a janela que depende do momento da compra. */
  private parseLoyaltyUntil(text: string, now: Date): Date {
    const loyaltyUntil = parseBrasiliaDateTime(text);
    if (!loyaltyUntil || !isWithinLoyaltyWindow(loyaltyUntil, now)) {
      throw new InvalidInputError(
        `O fim da fidelidade deve ser depois do momento da compra e até ${MAX_LOYALTY_DAYS} dias depois dele.`,
      );
    }
    return loyaltyUntil;
  }

  private async ensurePlayerCanBeBought(
    tx: Prisma.TransactionClient,
    player: Player,
    club: Club,
  ): Promise<void> {
    if (player.clubId !== null) {
      throw new BusinessRuleError('O jogador não está livre: já pertence a um clube.');
    }
    const soldBefore = await tx.marketTransaction.count({
      where: { clubId: club.id, playerId: player.id, type: 'VENDA' },
    });
    if (soldBefore > 0) {
      throw new BusinessRuleError('Um clube não pode comprar um jogador que ele mesmo já vendeu.');
    }
    const squadSize = await tx.player.count({ where: { clubId: club.id, deletedAt: null } });
    if (squadSize >= MAX_SQUAD_SIZE) {
      throw new BusinessRuleError(`O elenco já tem o máximo de ${MAX_SQUAD_SIZE} jogadores.`);
    }
  }
}
