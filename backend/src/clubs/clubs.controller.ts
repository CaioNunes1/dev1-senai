import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
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
import { ClubsService } from './clubs.service';
import { CLUB_SORT_OPTIONS, ClubSortOption } from './domain/club-ordering';
import { ClubSortQueryPipe } from './dto/club-list-query';
import { ClubDetailResponse, ClubResponse } from './dto/club-response.dto';
import { CreateClubDto } from './dto/create-club.dto';

@ApiTags('Clubes')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: CLUB_SORT_OPTIONS,
    description: 'Padrão: name.',
  })
  @ApiOkResponse({ type: [ClubResponse] })
  @ApiBadRequestResponse({ description: 'sort fora da lista.' })
  list(@Query(ClubSortQueryPipe) sort: ClubSortOption): Promise<ClubResponse[]> {
    return this.clubsService.list(sort);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClubDetailResponse })
  @ApiNotFoundResponse({ description: 'Clube inexistente.' })
  findOne(@Param('id', ParseIdPipe) id: number): Promise<ClubDetailResponse> {
    return this.clubsService.findById(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ClubResponse, description: 'Clube criado, com caixa de 300,00.' })
  @ApiBadRequestResponse({ description: 'Nome ou sigla fora do formato.' })
  @ApiConflictResponse({ description: 'Nome ou sigla já cadastrados; limite de 20 clubes.' })
  async create(
    @Body() body: CreateClubDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClubResponse> {
    const club = await this.clubsService.create(body);
    response.location(resourceLocation('clubs', club.id));
    return club;
  }
}
