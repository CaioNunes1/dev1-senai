import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ParseIdPipe } from '../common/http/parse-id.pipe';
import { CSV_HEADER } from './domain/transactions-csv';
import { TransactionHistoryResponse } from './dto/market-response.dto';
import { TransactionFilters, TransactionFiltersPipe } from './dto/transaction-filters';
import { TransactionHistoryService } from './transaction-history.service';

const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

const typeQuery = ApiQuery({
  name: 'type',
  required: false,
  description: 'COMPRA, VENDA ou os dois separados por vírgula (sem espaços, sem repetir).',
});
const playerQuery = ApiQuery({
  name: 'player_id',
  required: false,
  description: 'Só as transações desse jogador no clube; inexistente ou excluído → 404.',
});

@ApiTags('Mercado')
@Controller('clubs')
export class TransactionsController {
  constructor(private readonly historyService: TransactionHistoryService) {}

  @Get(':id/transactions')
  @typeQuery
  @playerQuery
  @ApiOkResponse({ type: TransactionHistoryResponse })
  @ApiBadRequestResponse({ description: 'Filtro inválido.' })
  @ApiNotFoundResponse({ description: 'Clube ou jogador do filtro inexistente.' })
  history(
    @Param('id', ParseIdPipe) id: number,
    @Query(TransactionFiltersPipe) filters: TransactionFilters,
  ): Promise<TransactionHistoryResponse> {
    return this.historyService.history(id, filters);
  }

  /**
   * RN18: o `Content-Type` do CSV só é definido depois que a consulta deu certo; as recusas
   * continuam saindo em JSON pelo filtro global de exceções.
   */
  @Get(':id/transactions/export')
  @typeQuery
  @playerQuery
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV da RN18 (UTF-8 sem BOM, LF).',
    schema: { example: `${CSV_HEADER}\n` },
  })
  @ApiBadRequestResponse({ description: 'Filtro inválido (resposta em JSON).' })
  @ApiNotFoundResponse({
    description: 'Clube ou jogador do filtro inexistente (resposta em JSON).',
  })
  async export(
    @Param('id', ParseIdPipe) id: number,
    @Query(TransactionFiltersPipe) filters: TransactionFilters,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.historyService.exportCsv(id, filters);
    response.setHeader('Content-Type', CSV_CONTENT_TYPE);
    response.setHeader('Content-Disposition', `attachment; filename="transacoes-clube-${id}.csv"`);
    return csv;
  }
}
