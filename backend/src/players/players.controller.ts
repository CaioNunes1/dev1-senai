import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Page } from '../common/domain/pagination';
import { resourceLocation } from '../common/http/api.constants';
import { ParseIdPipe } from '../common/http/parse-id.pipe';
import { PLAYER_SORT_OPTIONS } from './domain/player-listing';
import { CONDITIONS, POSITIONS } from './domain/player.types';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerListQuery, PlayerListQueryPipe } from './dto/player-list-query';
import { PlayerPageResponse, PlayerResponse } from './dto/player-response.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@ApiTags('Jogadores')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiQuery({
    name: 'search',
    required: false,
    description: '2 a 100 caracteres; ignora maiúsculas e acentos.',
  })
  @ApiQuery({ name: 'position', required: false, enum: POSITIONS })
  @ApiQuery({ name: 'condition', required: false, enum: CONDITIONS })
  @ApiQuery({ name: 'free', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'club_id', required: false, type: Number })
  @ApiQuery({ name: 'min_age', required: false, type: Number, description: '16 a 45.' })
  @ApiQuery({ name: 'max_age', required: false, type: Number, description: '16 a 45.' })
  @ApiQuery({
    name: 'min_value',
    required: false,
    type: String,
    description: '0 a 550, até 2 casas (valor de mercado).',
  })
  @ApiQuery({
    name: 'max_value',
    required: false,
    type: String,
    description: '0 a 550, até 2 casas (valor de mercado).',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: `Até dois, separados por vírgula: ${PLAYER_SORT_OPTIONS.join(', ')}. Padrão: name.`,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Padrão: 1.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '1 a 50. Padrão: 10.' })
  @ApiOkResponse({ type: PlayerPageResponse })
  @ApiBadRequestResponse({ description: 'Parâmetro inválido ou combinação contraditória.' })
  @ApiNotFoundResponse({ description: 'club_id inexistente.' })
  list(@Query(PlayerListQueryPipe) query: PlayerListQuery): Promise<Page<PlayerResponse>> {
    return this.playersService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PlayerResponse })
  @ApiNotFoundResponse({ description: 'Jogador inexistente ou excluído.' })
  findOne(@Param('id', ParseIdPipe) id: number): Promise<PlayerResponse> {
    return this.playersService.findById(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PlayerResponse })
  @ApiBadRequestResponse({ description: 'Corpo inválido ou fora dos limites.' })
  async create(
    @Body() body: CreatePlayerDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlayerResponse> {
    const player = await this.playersService.create(body);
    response.location(resourceLocation('players', player.id));
    return player;
  }

  @Put(':id')
  @ApiOkResponse({ type: PlayerResponse })
  @ApiBadRequestResponse({ description: 'Corpo inválido.' })
  @ApiNotFoundResponse({ description: 'Jogador inexistente ou excluído.' })
  @ApiConflictResponse({
    description: 'Mudança de posição de jogador com clube; idade menor que a atual.',
  })
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdatePlayerDto,
  ): Promise<PlayerResponse> {
    return this.playersService.update(id, body);
  }

  @Patch(':id/condition')
  @ApiOkResponse({ type: PlayerResponse })
  @ApiBadRequestResponse({ description: 'condition ausente, nula ou fora da lista.' })
  @ApiNotFoundResponse({ description: 'Jogador inexistente ou excluído.' })
  @ApiConflictResponse({ description: 'De DOENTE direto para APTO.' })
  changeCondition(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateConditionDto,
  ): Promise<PlayerResponse> {
    return this.playersService.changeCondition(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Jogador excluído logicamente.' })
  @ApiNotFoundResponse({ description: 'Jogador inexistente ou já excluído.' })
  @ApiConflictResponse({ description: 'Jogador que está num clube.' })
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.playersService.remove(id);
  }
}
