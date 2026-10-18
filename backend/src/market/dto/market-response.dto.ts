import { ApiProperty } from '@nestjs/swagger';

const TRANSACTION_TYPES = ['COMPRA', 'VENDA'];

/** Transação do histórico, com os valores e o nome do momento (RN17). */
export class TransactionResponse {
  @ApiProperty({ example: 10 }) id: number;
  @ApiProperty({ example: 1 }) club_id: number;
  @ApiProperty({ example: 2 }) player_id: number;
  @ApiProperty({ example: 'Meia Lua' }) player_name: string;
  @ApiProperty({ enum: TRANSACTION_TYPES, example: 'COMPRA' }) type: string;
  @ApiProperty({ example: 37.0, description: 'Valor de mercado no momento.' }) value: number;
  @ApiProperty({ example: 1.85, description: 'Taxa de compra ou comissão de venda.' })
  fee: number;
  @ApiProperty({ example: 0.0, description: 'Multa por fidelidade.' }) penalty: number;
  @ApiProperty({ example: null, nullable: true, type: Number, description: 'Lucro da venda.' })
  profit: number | null;
  @ApiProperty({ example: -38.85, description: 'Variação do caixa, com sinal.' })
  cash_change: number;
  @ApiProperty({ example: '2026-11-02T10:15:00-03:00' }) created_at: string;
}

export class PurchaseContractResponse {
  @ApiProperty({ example: 37.0 }) purchase_value: number;
  @ApiProperty({ example: '2027-03-02T10:15:00-03:00' }) loyalty_until: string;
  @ApiProperty({ example: 'ATIVO' }) status: string;
}

/** Resposta de `POST /players/{id}/buy` (README › 2.3.1). */
export class PurchaseResponse extends TransactionResponse {
  @ApiProperty({ type: PurchaseContractResponse }) contract: PurchaseContractResponse;
  @ApiProperty({ example: 261.15, description: 'Caixa do clube depois da compra.' })
  club_cash: number;
}

/** Resposta de `POST /players/{id}/sell` (README › 2.3.2). */
export class SaleResponse extends TransactionResponse {
  @ApiProperty({ example: 37.0 }) purchase_value: number;
  @ApiProperty({ example: 117 }) remaining_days: number;
  @ApiProperty({ example: 10 }) penalty_rate: number;
  @ApiProperty({ enum: ['ENCERRADO', 'RESCINDIDO'], example: 'RESCINDIDO' })
  contract_status: string;
  @ApiProperty({ example: 296.85, description: 'Caixa do clube depois da venda.' })
  club_cash: number;
}
