import { ApiProperty } from '@nestjs/swagger';
import { NormalizeSpaces } from '../../common/validation/normalize-spaces.decorator';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';
import { POSITIONS, Position } from '../domain/player.types';
import { ageRule, agilityRule, playerNameRule, positionRule } from './player-input.rules';

/**
 * Corpo de `PUT /players/{id}` (RN08): exige os quatro campos, mesmo que só um mude.
 * Indicadores, potencial, valor base, condição e clube enviados são ignorados (V7).
 */
export class UpdatePlayerDto {
  @ApiProperty({ example: 'Davi Melo' })
  @NormalizeSpaces()
  @SatisfiesRule(playerNameRule)
  name: string;

  @ApiProperty({
    enum: POSITIONS,
    example: 'MEI',
    description: 'Jogador com clube não muda de posição (409).',
  })
  @SatisfiesRule(positionRule)
  position: Position;

  @ApiProperty({ example: 70 })
  @SatisfiesRule(agilityRule)
  agility: number;

  @ApiProperty({ example: 23, description: 'Não pode ser menor que a idade atual (409).' })
  @SatisfiesRule(ageRule)
  age: number;
}
