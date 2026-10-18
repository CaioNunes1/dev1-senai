import { ApiProperty } from '@nestjs/swagger';
import { NormalizeSpaces } from '../../common/validation/normalize-spaces.decorator';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';
import { acronymRule, clubNameRule } from './club-input.rules';

/** Corpo de `POST /clubs`. Outros campos (como `cash` e `id`) são ignorados (V7). */
export class CreateClubDto {
  @ApiProperty({
    example: 'Águias FC',
    description: '3 a 60 caracteres, 2 a 5 palavras; só letras, espaços, hífen e ponto.',
  })
  @NormalizeSpaces()
  @SatisfiesRule(clubNameRule)
  name: string;

  @ApiProperty({
    example: 'AGU',
    description:
      '3 letras A–Z que aparecem no nome nessa ordem, começando pela primeira letra do nome.',
  })
  @SatisfiesRule(acronymRule)
  acronym: string;
}
