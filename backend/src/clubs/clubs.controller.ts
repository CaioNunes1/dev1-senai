import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { resourceLocation } from '../common/http/api.constants';
import { ClubsService } from './clubs.service';
import { ClubResponse } from './dto/club-response.dto';
import { CreateClubDto } from './dto/create-club.dto';

@ApiTags('Clubes')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

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
