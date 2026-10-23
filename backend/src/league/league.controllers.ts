import { Body, Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { resourceLocation } from '../common/http/api.constants';
import { ParseIdPipe } from '../common/http/parse-id.pipe';
import { LineupDto, MatchListQueryPipe, PlayMatchDto } from './dto/league-requests';
import {
  LineupResponse,
  MatchResponse,
  MatchSummaryResponse,
  StandingResponse,
} from './dto/league-responses';
import { LineupService } from './lineup.service';
import { MatchesService } from './matches.service';

@ApiTags('Liga')
@Controller('clubs')
export class LineupController {
  constructor(private readonly lineupService: LineupService) {}

  @Get(':id/lineup')
  @ApiOkResponse({ type: LineupResponse })
  @ApiNotFoundResponse({ description: 'Clube inexistente.' })
  find(@Param('id', ParseIdPipe) id: number): Promise<LineupResponse> {
    return this.lineupService.find(id);
  }

  @Put(':id/lineup')
  @ApiOkResponse({ type: LineupResponse })
  @ApiBadRequestResponse({ description: 'formation ou player_ids fora do formato.' })
  @ApiNotFoundResponse({ description: 'Clube ou jogador inexistente (inclusive excluído).' })
  @ApiConflictResponse({ description: 'Fora do elenco, DOENTE ou posições que não fecham.' })
  replace(@Param('id', ParseIdPipe) id: number, @Body() body: LineupDto): Promise<LineupResponse> {
    return this.lineupService.replace(id, body);
  }
}

@ApiTags('Liga')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @ApiCreatedResponse({ type: MatchResponse, description: 'Partida jogada e gravada.' })
  @ApiBadRequestResponse({ description: 'Ids inválidos ou mandante igual ao visitante.' })
  @ApiNotFoundResponse({ description: 'Clube inexistente.' })
  @ApiConflictResponse({ description: 'Escalação incompleta no mandante ou no visitante.' })
  async play(
    @Body() body: PlayMatchDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MatchResponse> {
    const match = await this.matchesService.play(body);
    response.location(resourceLocation('matches', match.id));
    return match;
  }

  @Get()
  @ApiQuery({ name: 'club_id', required: false, description: 'Mandante ou visitante.' })
  @ApiOkResponse({ type: [MatchSummaryResponse] })
  @ApiBadRequestResponse({ description: 'club_id inválido.' })
  @ApiNotFoundResponse({ description: 'Clube do filtro inexistente.' })
  list(@Query(MatchListQueryPipe) clubId: number | undefined): Promise<MatchSummaryResponse[]> {
    return this.matchesService.list(clubId);
  }

  @Get(':id')
  @ApiOkResponse({ type: MatchResponse })
  @ApiNotFoundResponse({ description: 'Partida inexistente.' })
  findOne(@Param('id', ParseIdPipe) id: number): Promise<MatchResponse> {
    return this.matchesService.findById(id);
  }
}

@ApiTags('Liga')
@Controller('standings')
export class StandingsController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOkResponse({ type: [StandingResponse] })
  standings(): Promise<StandingResponse[]> {
    return this.matchesService.standings();
  }
}
