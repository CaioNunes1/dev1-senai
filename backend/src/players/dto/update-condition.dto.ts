import { ApiProperty } from '@nestjs/swagger';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';
import { CONDITIONS, Condition } from '../domain/player.types';
import { conditionRule } from './player-input.rules';

/** Corpo de `PATCH /players/{id}/condition`. */
export class UpdateConditionDto {
  @ApiProperty({
    enum: CONDITIONS,
    example: 'MAL_CONDICIONADO',
    description: 'De DOENTE não vai direto para APTO (409).',
  })
  @SatisfiesRule(conditionRule)
  condition: Condition;
}
