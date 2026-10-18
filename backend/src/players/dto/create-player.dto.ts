import { ApiProperty } from '@nestjs/swagger';
import { NormalizeSpaces } from '../../common/validation/normalize-spaces.decorator';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';
import { POSITIONS, Position } from '../domain/player.types';
import {
  ageRule,
  agilityRule,
  attributeRule,
  playerNameRule,
  positionRule,
  potentialRule,
} from './player-input.rules';

/**
 * Corpo de `POST /players`. Campos calculados ou controlados (`base_value`, `overall`,
 * `market_value`, `condition`, `club_id`, `id`) e desconhecidos são ignorados (V7).
 */
export class CreatePlayerDto {
  @ApiProperty({
    example: 'Meia Lua',
    description: '3 a 100 caracteres, 2+ palavras, sem dígitos.',
  })
  @NormalizeSpaces()
  @SatisfiesRule(playerNameRule)
  name: string;

  @ApiProperty({ enum: POSITIONS, example: 'MEI' })
  @SatisfiesRule(positionRule)
  position: Position;

  @ApiProperty({ example: 85, description: '1 a 100; com 35 anos ou mais, no máximo 85.' })
  @SatisfiesRule(agilityRule)
  agility: number;

  @ApiProperty({ example: 25, description: '16 a 45.' })
  @SatisfiesRule(ageRule)
  age: number;

  @ApiProperty({ example: 70, description: 'Velocidade, 1 a 99.' })
  @SatisfiesRule(attributeRule('pace'))
  pace: number;

  @ApiProperty({ example: 68, description: 'Finalização, 1 a 99.' })
  @SatisfiesRule(attributeRule('shooting'))
  shooting: number;

  @ApiProperty({ example: 82, description: 'Passe, 1 a 99.' })
  @SatisfiesRule(attributeRule('passing'))
  passing: number;

  @ApiProperty({ example: 79, description: 'Drible, 1 a 99.' })
  @SatisfiesRule(attributeRule('dribbling'))
  dribbling: number;

  @ApiProperty({ example: 55, description: 'Defesa, 1 a 99.' })
  @SatisfiesRule(attributeRule('defending'))
  defending: number;

  @ApiProperty({
    example: 64,
    description: 'Físico, 1 a 99. A soma dos seis atributos vai até 480.',
  })
  @SatisfiesRule(attributeRule('physical'))
  physical: number;

  @ApiProperty({
    example: 86,
    description:
      '1 a 99, ≥ maior atributo; com 33 anos ou mais no cadastro, igual ao maior atributo.',
  })
  @SatisfiesRule(potentialRule)
  potential: number;
}
