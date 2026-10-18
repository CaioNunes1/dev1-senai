import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ParseIdPipe } from '../common/http/parse-id.pipe';
import { BuyPlayerDto } from './dto/buy-player.dto';
import { PurchaseResponse, SaleResponse } from './dto/market-response.dto';
import { MarketService } from './market.service';

@ApiTags('Mercado')
@Controller('players')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post(':id/buy')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PurchaseResponse })
  @ApiBadRequestResponse({ description: 'club_id ou loyalty_until ausentes ou inválidos.' })
  @ApiNotFoundResponse({ description: 'Jogador ou clube inexistente.' })
  @ApiConflictResponse({
    description: 'Jogador com clube; custo acima de 50% do caixa; elenco cheio; recompra.',
  })
  buy(@Param('id', ParseIdPipe) id: number, @Body() body: BuyPlayerDto): Promise<PurchaseResponse> {
    return this.marketService.buy(id, body);
  }

  @Post(':id/sell')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SaleResponse })
  @ApiNotFoundResponse({ description: 'Jogador inexistente ou excluído.' })
  @ApiConflictResponse({ description: 'Jogador livre (sem clube).' })
  sell(@Param('id', ParseIdPipe) id: number): Promise<SaleResponse> {
    return this.marketService.sell(id);
  }
}
