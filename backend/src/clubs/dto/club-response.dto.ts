import { ApiProperty } from '@nestjs/swagger';
import { PlayerResponse } from '../../players/dto/player-response.dto';

/** Campos mínimos de cada clube (README › 2.2 Clubes). */
export class ClubResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Águias FC' })
  name: string;

  @ApiProperty({ example: 'AGU' })
  acronym: string;

  @ApiProperty({ example: 261.15, description: 'Caixa do clube.' })
  cash: number;

  @ApiProperty({ example: 37.0, description: 'Soma dos valores de mercado do elenco.' })
  squad_value: number;

  @ApiProperty({ example: 298.15, description: 'Patrimônio: caixa + valor do elenco.' })
  net_worth: number;
}

/** Contrato do jogador no elenco, com dias e multa calculados na consulta (RN11, RN15). */
export class ContractSummaryResponse {
  @ApiProperty({ example: 37.0 })
  purchase_value: number;

  @ApiProperty({ example: '2027-03-02T10:15:00-03:00' })
  loyalty_until: string;

  @ApiProperty({ example: 120 })
  remaining_days: number;

  @ApiProperty({ example: 10, description: 'Percentual de multa se fosse vendido agora.' })
  penalty_rate: number;
}

export class SquadPlayerResponse extends PlayerResponse {
  @ApiProperty({ type: ContractSummaryResponse, nullable: true })
  contract: ContractSummaryResponse | null;
}

/** `GET /clubs/{id}`: o clube com o elenco na ordem da RN11 (README › 2.2.2). */
export class ClubDetailResponse extends ClubResponse {
  @ApiProperty({ type: [SquadPlayerResponse] })
  players: SquadPlayerResponse[];
}
