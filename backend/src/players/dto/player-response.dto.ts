import { ApiProperty } from '@nestjs/swagger';
import { CONDITIONS, Condition, POSITIONS, Position } from '../domain/player.types';

/** Formato de `GET /players/{id}` (README › 2.1.2). */
export class PlayerResponse {
  @ApiProperty({ example: 2 }) id: number;
  @ApiProperty({ example: 'Meia Lua' }) name: string;
  @ApiProperty({ enum: POSITIONS, example: 'MEI' }) position: Position;
  @ApiProperty({ example: 85 }) agility: number;
  @ApiProperty({ example: 25 }) age: number;
  @ApiProperty({ enum: CONDITIONS, example: 'MAL_CONDICIONADO' }) condition: Condition;
  @ApiProperty({ example: 40.0, description: 'Calculado no cadastro (RN06).' }) base_value: number;
  @ApiProperty({ example: 37.0, description: 'Calculado a cada consulta (RN05).' })
  market_value: number;
  @ApiProperty({ example: 70 }) pace: number;
  @ApiProperty({ example: 68 }) shooting: number;
  @ApiProperty({ example: 82 }) passing: number;
  @ApiProperty({ example: 79 }) dribbling: number;
  @ApiProperty({ example: 55 }) defending: number;
  @ApiProperty({ example: 64 }) physical: number;
  @ApiProperty({ example: 86 }) potential: number;
  @ApiProperty({ example: 75, description: 'Calculado a cada consulta (RN06).' }) overall: number;
  @ApiProperty({ example: null, nullable: true, type: Number }) club_id: number | null;
}

class PageMetaResponse {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 10 }) limit: number;
  @ApiProperty({ example: 23 }) total_items: number;
  @ApiProperty({ example: 3 }) total_pages: number;
}

/** Formato de `GET /players` (RN07). */
export class PlayerPageResponse {
  @ApiProperty({ type: [PlayerResponse] }) data: PlayerResponse[];
  @ApiProperty({ type: PageMetaResponse }) meta: PageMetaResponse;
}
