import { ApiProperty } from '@nestjs/swagger';
import { parseBrasiliaDateTime } from '../../common/domain/datetime';
import { SatisfiesRule } from '../../common/validation/validation-rule.decorator';

const MAX_ID = 2_147_483_647;

/** `club_id`: inteiro positivo; 0 ou negativo → 400 (clube inexistente → 404, no service). */
export function clubIdRule(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return 'O campo club_id é obrigatório.';
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_ID) {
    return 'O campo club_id deve ser um número inteiro positivo.';
  }
  return undefined;
}

/**
 * `loyalty_until`: formato da RN01 (`AAAA-MM-DDTHH:MM-03:00`) e data existente.
 * A janela de tempo (futuro e até 1.095 dias) depende do momento da compra e é
 * conferida no service.
 */
export function loyaltyUntilRule(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return 'O campo loyalty_until é obrigatório.';
  }
  if (typeof value !== 'string' || parseBrasiliaDateTime(value) === undefined) {
    return 'O campo loyalty_until deve ser uma data e hora existente no formato AAAA-MM-DDTHH:MM-03:00.';
  }
  return undefined;
}

/** Corpo de `POST /players/{id}/buy`. */
export class BuyPlayerDto {
  @ApiProperty({ example: 1, description: 'Clube comprador.' })
  @SatisfiesRule(clubIdRule)
  club_id: number;

  @ApiProperty({
    example: '2027-03-02T10:15-03:00',
    description: 'Fim da fidelidade: depois do momento da compra e até 1.095 dias depois.',
  })
  @SatisfiesRule(loyaltyUntilRule)
  loyalty_until: string;
}
