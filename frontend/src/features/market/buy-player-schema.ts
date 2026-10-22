import { z } from 'zod';
import { formatBrasiliaDateTime, formatInteger } from '../../shared/lib/format';
import type { BuyPlayerBody } from './api';
import {
  brasiliaInstant,
  isRealDate,
  isRealTime,
  latestLoyaltyInstant,
  MAX_LOYALTY_DAYS,
  toLoyaltyUntil,
} from './loyalty-date';

const CLUB_ID = /^[1-9]\d*$/;

/**
 * Formulário de compra (RN01, RN12): clube e fim da fidelidade em data + hora de Brasília.
 * A janela (depois de agora e até 1.095 dias) é só uma ajuda: o momento real é o da API,
 * que confere de novo. Caixa, elenco e recompra ficam só na API (409).
 */
export function buyPlayerSchema(now: () => Date) {
  return z
    .object({
      club_id: z.string().regex(CLUB_ID, 'Escolha o clube comprador.'),
      loyalty_date: z.string().min(1, 'Informe a data do fim da fidelidade.'),
      loyalty_time: z.string().min(1, 'Informe a hora do fim da fidelidade.'),
    })
    .superRefine(({ loyalty_date: date, loyalty_time: time }, context) => {
      if (date !== '' && !isRealDate(date)) {
        context.addIssue({
          code: 'custom',
          path: ['loyalty_date'],
          message: 'Essa data não existe.',
        });
      }
      if (time !== '' && !isRealTime(time)) {
        context.addIssue({
          code: 'custom',
          path: ['loyalty_time'],
          message: 'Use uma hora de 00:00 a 23:59.',
        });
      }
      if (!isRealDate(date) || !isRealTime(time)) {
        return;
      }
      const instant = brasiliaInstant(date, time).getTime();
      const current = now();
      const latest = latestLoyaltyInstant(current);
      if (instant <= current.getTime()) {
        context.addIssue({
          code: 'custom',
          path: ['loyalty_date'],
          message: 'O fim da fidelidade precisa ser depois de agora (horário de Brasília).',
        });
      } else if (instant > latest.getTime()) {
        const { date: latestDate, time: latestTime } = formatBrasiliaDateTime(latest.toISOString());
        context.addIssue({
          code: 'custom',
          path: ['loyalty_date'],
          message: `Use no máximo ${formatInteger(MAX_LOYALTY_DAYS)} dias a partir de agora (até ${latestDate} às ${latestTime}).`,
        });
      }
    })
    .transform((form): BuyPlayerBody => ({
      club_id: Number(form.club_id),
      loyalty_until: toLoyaltyUntil(form.loyalty_date, form.loyalty_time),
    }));
}

/** Valores digitados (texto), antes da conversão para o corpo da API. */
export type BuyPlayerForm = z.input<ReturnType<typeof buyPlayerSchema>>;
