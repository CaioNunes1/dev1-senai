import { Injectable, PipeTransform } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { parseIntegerParam, RawQuery } from '../../common/validation/query-params';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';
import { Formation, FORMATIONS, isFormation, STARTERS } from '../domain/formation';

/** Maior id que a correção envia (README › "Filtros e query params"). */
const ID_RANGE = { min: 1, max: 2_147_483_647 };

function isId(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= ID_RANGE.min &&
    value <= ID_RANGE.max
  );
}

export function formationRule(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return 'O campo formation é obrigatório.';
  }
  return isFormation(value) ? undefined : `O campo formation deve ser ${FORMATIONS.join(', ')}.`;
}

/** RN19: exatamente 5 ids, distintos e inteiros positivos (inexistente → 404, no service). */
export function playerIdsRule(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return 'O campo player_ids é obrigatório.';
  }
  if (!Array.isArray(value)) {
    return 'O campo player_ids deve ser uma lista de ids.';
  }
  if (value.length !== STARTERS) {
    return `O campo player_ids deve ter exatamente ${STARTERS} ids; foram enviados ${value.length}.`;
  }
  if (!value.every(isId)) {
    return 'Os ids de player_ids devem ser números inteiros positivos.';
  }
  if (new Set(value).size !== value.length) {
    return 'O campo player_ids não pode repetir jogadores.';
  }
  return undefined;
}

/** Corpo de `PUT /clubs/{id}/lineup` (README › 2.4.1). */
export class LineupDto {
  @ApiProperty({ enum: FORMATIONS, example: '2-1-1' })
  @SatisfiesRule(formationRule)
  formation: Formation;

  @ApiProperty({ type: [Number], example: [34, 31, 30, 33, 32], description: '5 titulares.' })
  @SatisfiesRule(playerIdsRule)
  player_ids: number[];
}

function clubIdRule(field: string) {
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null) {
      return `O campo ${field} é obrigatório.`;
    }
    return isId(value) ? undefined : `O campo ${field} deve ser um número inteiro positivo.`;
  };
}

/** Visitante: além do formato, precisa ser diferente do mandante (400, RN20 › 1). */
export function awayClubIdRule(value: unknown, object: object): string | undefined {
  const formatError = clubIdRule('away_club_id')(value);
  if (formatError) {
    return formatError;
  }
  const home = (object as { home_club_id?: unknown }).home_club_id;
  return home === value ? 'O mandante e o visitante precisam ser clubes diferentes.' : undefined;
}

/** Corpo de `POST /matches` (README › 2.4.2). */
export class PlayMatchDto {
  @ApiProperty({ example: 1, description: 'Clube mandante.' })
  @SatisfiesRule(clubIdRule('home_club_id'))
  home_club_id: number;

  @ApiProperty({ example: 2, description: 'Clube visitante, diferente do mandante.' })
  @SatisfiesRule(awayClubIdRule)
  away_club_id: number;
}

/** `GET /matches?club_id=`: inteiro positivo, como os demais ids (RN21). */
@Injectable()
export class MatchListQueryPipe implements PipeTransform<RawQuery, number | undefined> {
  transform(query: RawQuery): number | undefined {
    return parseIntegerParam(query, 'club_id', ID_RANGE);
  }
}
