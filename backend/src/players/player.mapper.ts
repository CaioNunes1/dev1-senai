import { Player } from '@prisma/client';
import { Cents, centsToNumber } from '../common/domain/money';
import { decimalToCents } from '../prisma/decimal';
import { calculateMarketValue } from './domain/market-value';
import { calculateOverall } from './domain/overall';
import { PlayerResponse } from './dto/player-response.dto';

/** RN05: valor de mercado do jogador gravado, calculado no momento da consulta. */
export function marketValueOf(player: Player): Cents {
  return calculateMarketValue({
    baseValue: decimalToCents(player.baseValue),
    condition: player.condition,
    agility: player.agility,
    age: player.age,
  });
}

/** Converte o jogador gravado na resposta da API, com o overall e o valor de mercado do momento. */
export function toPlayerResponse(
  player: Player,
  marketValue: Cents = marketValueOf(player),
): PlayerResponse {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    agility: player.agility,
    age: player.age,
    condition: player.condition,
    base_value: centsToNumber(decimalToCents(player.baseValue)),
    market_value: centsToNumber(marketValue),
    pace: player.pace,
    shooting: player.shooting,
    passing: player.passing,
    dribbling: player.dribbling,
    defending: player.defending,
    physical: player.physical,
    potential: player.potential,
    overall: calculateOverall(player.position, player),
    club_id: player.clubId,
  };
}
