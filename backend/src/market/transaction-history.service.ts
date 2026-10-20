import { Injectable } from '@nestjs/common';
import { MarketTransaction } from '@prisma/client';
import { CLUB_NOT_FOUND } from '../clubs/club-locks';
import { ResourceNotFoundError } from '../common/errors/domain-errors';
import { PLAYER_NOT_FOUND } from '../players/player-locks';
import { PrismaService } from '../prisma/prisma.service';
import { summarizeTransactions } from './domain/transaction-history';
import { toTransactionsCsv } from './domain/transactions-csv';
import { TransactionHistoryResponse } from './dto/market-response.dto';
import { TransactionFilters } from './dto/transaction-filters';
import {
  toRecordedTransaction,
  toSummaryResponse,
  toTransactionResponse,
} from './transaction.mapper';

/**
 * RN17 e RN18: histórico do clube e a exportação em CSV. Os dois usam a mesma consulta,
 * então selecionam as mesmas transações, na mesma ordem. Só lê o que foi gravado.
 */
@Injectable()
export class TransactionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async history(clubId: number, filters: TransactionFilters): Promise<TransactionHistoryResponse> {
    const transactions = await this.findTransactions(clubId, filters);
    return {
      data: transactions.map(toTransactionResponse),
      summary: toSummaryResponse(summarizeTransactions(transactions.map(toRecordedTransaction))),
    };
  }

  async exportCsv(clubId: number, filters: TransactionFilters): Promise<string> {
    const transactions = await this.findTransactions(clubId, filters);
    return toTransactionsCsv(transactions.map(toRecordedTransaction));
  }

  /**
   * Clube inexistente → 404; jogador do filtro inexistente ou excluído → 404 (RN09).
   * Sem filtro, entram também as transações de jogadores excluídos. Ordem da RN17: da mais
   * recente para a mais antiga e, em empate de data e hora, id decrescente.
   */
  private async findTransactions(
    clubId: number,
    { types, playerId }: TransactionFilters,
  ): Promise<MarketTransaction[]> {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
    if (!club) {
      throw new ResourceNotFoundError(CLUB_NOT_FOUND);
    }
    if (playerId !== undefined) {
      const player = await this.prisma.player.findFirst({
        where: { id: playerId, deletedAt: null },
        select: { id: true },
      });
      if (!player) {
        throw new ResourceNotFoundError(PLAYER_NOT_FOUND);
      }
    }
    return this.prisma.marketTransaction.findMany({
      where: { clubId, playerId, type: types && { in: types } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
