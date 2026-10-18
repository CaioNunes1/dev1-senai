import { Club } from '@prisma/client';
import { Cents, centsToNumber } from '../common/domain/money';
import { decimalToCents } from '../prisma/decimal';
import { ClubResponse } from './dto/club-response.dto';

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
