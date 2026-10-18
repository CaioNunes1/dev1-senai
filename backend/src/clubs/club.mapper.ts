import { Club, Contract, Player } from '@prisma/client';
import { formatBrasiliaDateTime } from '../common/domain/datetime';
import { Cents, centsToNumber } from '../common/domain/money';
import { calculateRemainingDays, penaltyRateFor } from '../market/domain/loyalty-penalty';
import { toPlayerResponse } from '../players/player.mapper';
import { decimalToCents } from '../prisma/decimal';
import {
  ClubResponse,
  ContractSummaryResponse,
  SquadPlayerResponse,
} from './dto/club-response.dto';

/** Converte o clube gravado na resposta da API; patrimônio = caixa + valor do elenco (RN11). */
export function toClubResponse(club: Club, squadValue: Cents): ClubResponse {
  const cash = decimalToCents(club.cash);
  return {
    id: club.id,
    name: club.name,
    acronym: club.acronym,
    cash: centsToNumber(cash),
    squad_value: centsToNumber(squadValue),
    net_worth: centsToNumber(cash + squadValue),
  };
}

/** Jogador do elenco com o contrato ativo: fim da fidelidade, dias restantes e % de multa agora. */
export function toSquadPlayerResponse(
  player: Player,
  marketValue: Cents,
  activeContract: Contract | undefined,
  now: Date,
): SquadPlayerResponse {
  return {
    ...toPlayerResponse(player, marketValue),
    contract: activeContract ? toContractSummary(activeContract, now) : null,
  };
}

function toContractSummary(contract: Contract, now: Date): ContractSummaryResponse {
  const remainingDays = calculateRemainingDays(contract.loyaltyUntil, now);
  return {
    purchase_value: centsToNumber(decimalToCents(contract.purchaseValue)),
    loyalty_until: formatBrasiliaDateTime(contract.loyaltyUntil),
    remaining_days: remainingDays,
    penalty_rate: penaltyRateFor(remainingDays),
  };
}
