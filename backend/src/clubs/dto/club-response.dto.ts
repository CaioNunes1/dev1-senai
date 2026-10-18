import { ApiProperty } from '@nestjs/swagger';

/** Campos mínimos de cada clube (README › 2.2 Clubes). */
export class ClubResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Águias FC' })
  name: string;

  @ApiProperty({ example: 'AGU' })
  acronym: string;

  @ApiProperty({ example: 300.0, description: 'Caixa do clube.' })
  cash: number;

  @ApiProperty({ example: 0.0, description: 'Soma dos valores de mercado do elenco.' })
  squad_value: number;

  @ApiProperty({ example: 300.0, description: 'Patrimônio: caixa + valor do elenco.' })
  net_worth: number;
}
