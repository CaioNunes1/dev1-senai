import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './test-app';
import { TestClock } from './test-clock';
import { resetTestDatabase } from './test-database';

/** "Meia Lua" dos exemplos oficiais: base 40,00; MAL_CONDICIONADO com agilidade 85 → 37,00. */
const MEIA_LUA = {
  name: 'Meia Lua',
  position: 'MEI',
  agility: 85,
  age: 25,
  pace: 70,
  shooting: 68,
  passing: 82,
  dribbling: 79,
  defending: 55,
  physical: 64,
  potential: 86,
};

/** Jogador com os seis atributos iguais a `overall`, 25 anos e agilidade 50. */
const playerBody = (name: string, position: string, overall: number) => ({
  name,
  position,
  age: 25,
  agility: 50,
  pace: overall,
  shooting: overall,
  passing: overall,
  dribbling: overall,
  defending: overall,
  physical: overall,
  potential: overall,
});

/** Instante da compra do exemplo 2.3.1; o relógio de teste começa nele. */
const PURCHASE_MOMENT = '2026-11-02T10:15-03:00';

describe('Mercado e clubes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let clock: TestClock;

  beforeAll(async () => {
    ({ app, prisma, clock } = await createTestApp());
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
    clock.setBrasilia(PURCHASE_MOMENT);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function createClub(name: string, acronym: string): Promise<number> {
    const response = await http().post('/api/v1/clubs').send({ name, acronym });
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  async function createPlayer(body: object): Promise<number> {
    const response = await http().post('/api/v1/players').send(body);
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  /** Cria um jogador APTO de 25 anos com o valor base pedido (fixture direto no banco). */
  async function playerWorth(baseValue: string, name = 'Jogador Teste'): Promise<number> {
    const id = await createPlayer(playerBody(name, 'MEI', 60));
    await prisma.player.update({ where: { id }, data: { baseValue } });
    return id;
  }

  const buy = (playerId: number | string, body: object) =>
    http().post(`/api/v1/players/${playerId}/buy`).send(body);
  const sell = (playerId: number | string) => http().post(`/api/v1/players/${playerId}/sell`);

  async function bought(playerId: number, clubId: number, loyaltyUntil = '2027-03-02T10:15-03:00') {
    const response = await buy(playerId, { club_id: clubId, loyalty_until: loyaltyUntil });
    expect(response.status).toBe(200);
    return response;
  }

  function expectError(response: request.Response, status: number): void {
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toBe('');
  }

  /**
   * Provoca um erro do PostgreSQL ao gravar em `table` durante `run` (trigger só no banco de
   * teste, removido no fim), para conferir que a operação inteira é desfeita.
   */
  async function withFailureOn(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    run: () => Promise<void>,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION falha_provocada_e2e() RETURNS trigger AS $$
       BEGIN RAISE EXCEPTION 'falha provocada pelo teste'; END $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER falha_provocada_e2e BEFORE ${event} ON "${table}"
       FOR EACH ROW EXECUTE FUNCTION falha_provocada_e2e()`,
    );
    try {
      await run();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS falha_provocada_e2e ON "${table}"`);
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS falha_provocada_e2e()');
    }
  }

  /** Nada foi gravado: caixa inicial, sem contratos e sem transações. */
  async function expectNothingRecorded(clubId: number): Promise<void> {
    const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
    expect(club.cash.toFixed(2)).toBe('300.00');
    expect(await prisma.contract.count()).toBe(0);
    expect(await prisma.marketTransaction.count()).toBe(0);
  }

  describe('fluxo oficial do Meia Lua no Águias FC (README 2.3.1, 2.2.2 e 2.3.2)', () => {
    it('compra, consulta do clube e venda com os valores do enunciado', async () => {
      const clubId = await createClub('Águias FC', 'AGU');
      const playerId = await createPlayer(MEIA_LUA);
      await http()
        .patch(`/api/v1/players/${playerId}/condition`)
        .send({ condition: 'MAL_CONDICIONADO' });

      const purchase = await buy(playerId, {
        club_id: clubId,
        loyalty_until: '2027-03-02T10:15-03:00',
      });
      expect(purchase.status).toBe(200);
      expect(purchase.body).toEqual({
        id: 1,
        club_id: 1,
        player_id: 1,
        player_name: 'Meia Lua',
        type: 'COMPRA',
        value: 37,
        fee: 1.85,
        penalty: 0,
        profit: null,
        cash_change: -38.85,
        created_at: '2026-11-02T10:15:00-03:00',
        contract: {
          purchase_value: 37,
          loyalty_until: '2027-03-02T10:15:00-03:00',
          status: 'ATIVO',
        },
        club_cash: 261.15,
      });

      const club = await http().get(`/api/v1/clubs/${clubId}`);
      expect(club.status).toBe(200);
      expect(club.body).toMatchObject({
        id: 1,
        name: 'Águias FC',
        acronym: 'AGU',
        cash: 261.15,
        squad_value: 37,
        net_worth: 298.15,
      });
      expect(club.body.players).toEqual([
        {
          id: 1,
          ...MEIA_LUA,
          condition: 'MAL_CONDICIONADO',
          base_value: 40,
          market_value: 37,
          overall: 75,
          club_id: 1,
          contract: {
            purchase_value: 37,
            loyalty_until: '2027-03-02T10:15:00-03:00',
            remaining_days: 120,
            penalty_rate: 10,
          },
        },
      ]);

      await http().patch(`/api/v1/players/${playerId}/condition`).send({ condition: 'APTO' });
      clock.setBrasilia('2026-11-05T16:40-03:00');
      const sale = await sell(playerId);
      expect(sale.status).toBe(200);
      expect(sale.body).toEqual({
        id: 2,
        club_id: 1,
        player_id: 1,
        player_name: 'Meia Lua',
        type: 'VENDA',
        value: 40,
        fee: 0.3,
        penalty: 4,
        profit: 3,
        cash_change: 35.7,
        created_at: '2026-11-05T16:40:00-03:00',
        purchase_value: 37,
        remaining_days: 117,
        penalty_rate: 10,
        contract_status: 'RESCINDIDO',
        club_cash: 296.85,
      });

      const player = await http().get(`/api/v1/players/${playerId}`);
      expect(player.body.club_id).toBeNull();
      const contract = await prisma.contract.findFirstOrThrow();
      expect(contract.status).toBe('RESCINDIDO');
      expect(contract.endedAt?.toISOString()).toBe('2026-11-05T19:40:00.000Z');
      const afterSale = await http().get(`/api/v1/clubs/${clubId}`);
      expect(afterSale.body).toMatchObject({
        cash: 296.85,
        squad_value: 0,
        net_worth: 296.85,
        players: [],
      });
    });
  });

  describe('POST /players/{id}/buy', () => {
    let clubId: number;
    let playerId: number;

    beforeEach(async () => {
      clubId = await createClub('Águias FC', 'AGU');
      playerId = await createPlayer(MEIA_LUA);
    });

    it.each<[string, object]>([
      ['club_id ausente', { loyalty_until: '2027-03-02T10:15-03:00' }],
      ['club_id nulo', { club_id: null, loyalty_until: '2027-03-02T10:15-03:00' }],
      ['club_id como texto', { club_id: '1', loyalty_until: '2027-03-02T10:15-03:00' }],
      ['club_id zero', { club_id: 0, loyalty_until: '2027-03-02T10:15-03:00' }],
      ['club_id negativo', { club_id: -1, loyalty_until: '2027-03-02T10:15-03:00' }],
      ['club_id fracionário', { club_id: 1.5, loyalty_until: '2027-03-02T10:15-03:00' }],
      ['loyalty_until ausente', { club_id: 1 }],
      ['loyalty_until sem −03:00', { club_id: 1, loyalty_until: '2027-03-02T10:15' }],
      ['loyalty_until em UTC', { club_id: 1, loyalty_until: '2027-03-02T13:15Z' }],
      ['loyalty_until com segundos', { club_id: 1, loyalty_until: '2027-03-02T10:15:00-03:00' }],
      ['loyalty_until 30 de fevereiro', { club_id: 1, loyalty_until: '2027-02-30T10:15-03:00' }],
      ['loyalty_until 24:00', { club_id: 1, loyalty_until: '2027-03-02T24:00-03:00' }],
      ['loyalty_until no passado', { club_id: 1, loyalty_until: '2026-11-01T10:15-03:00' }],
      ['loyalty_until igual ao momento da compra', { club_id: 1, loyalty_until: PURCHASE_MOMENT }],
      [
        'loyalty_until 1.095 dias e 1 minuto depois',
        { club_id: 1, loyalty_until: '2029-11-01T10:16-03:00' },
      ],
    ])('%s → 400, sem gravar', async (_description, body) => {
      expectError(await buy(playerId, body), 400);
      await expectNothingRecorded(clubId);
    });

    it('aceita fidelidade de exatamente 1.095 dias', async () => {
      const response = await buy(playerId, {
        club_id: clubId,
        loyalty_until: '2029-11-01T10:15-03:00',
      });
      expect(response.status).toBe(200);
    });

    it.each([
      ['jogador inexistente', 999, 1],
      ['clube inexistente', 1, 999],
    ])('%s → 404, sem gravar', async (_description, player, club) => {
      expectError(
        await buy(player, { club_id: club, loyalty_until: '2027-03-02T10:15-03:00' }),
        404,
      );
      await expectNothingRecorded(clubId);
    });

    it('jogador excluído → 404', async () => {
      await http().delete(`/api/v1/players/${playerId}`);
      expectError(
        await buy(playerId, { club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' }),
        404,
      );
    });

    it('jogador que já tem clube → 409', async () => {
      await bought(playerId, clubId);
      const otherClub = await createClub('Delta FC', 'DLT');
      expectError(
        await buy(playerId, { club_id: otherClub, loyalty_until: '2027-03-02T10:15-03:00' }),
        409,
      );
    });

    it.each([
      // caixa, valor base (APTO, 25 anos = valor de mercado), taxa, custo, aceita
      ['300.00', '28.00', 0, 28, true],
      ['300.00', '30.00', 0, 30, true],
      ['300.00', '30.01', 1.5, 31.51, true],
      ['100.00', '47.62', 2.38, 50, true],
      ['100.00', '48.00', 2.4, 50.4, false],
    ])(
      'RN13: caixa %s, valor %s → taxa %d, custo %d, aceita: %p',
      async (cash, baseValue, fee, cost, accepted) => {
        await prisma.club.update({ where: { id: clubId }, data: { cash } });
        const id = await playerWorth(baseValue);
        const response = await buy(id, {
          club_id: clubId,
          loyalty_until: '2027-03-02T10:15-03:00',
        });

        if (accepted) {
          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({ fee, cash_change: -cost });
          expect(response.body.club_cash).toBeCloseTo(Number(cash) - cost, 10);
        } else {
          expectError(response, 409);
          expect(
            (await prisma.club.findUniqueOrThrow({ where: { id: clubId } })).cash.toFixed(2),
          ).toBe(cash);
          expect(await prisma.marketTransaction.count()).toBe(0);
        }
      },
    );

    it('RN14: o 13º jogador do elenco → 409', async () => {
      for (let index = 0; index < 12; index += 1) {
        const id = await createPlayer(
          playerBody(`Jogador ${String.fromCharCode(65 + index)}`, 'MEI', 40),
        );
        await bought(id, clubId);
      }
      const extra = await createPlayer(playerBody('Jogador Extra', 'MEI', 40));
      expectError(
        await buy(extra, { club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' }),
        409,
      );
      expect(await prisma.player.count({ where: { clubId } })).toBe(12);
    });

    it('RN12: o clube que vendeu não recompra, mas outro clube pode', async () => {
      await bought(playerId, clubId);
      await sell(playerId);

      expectError(
        await buy(playerId, { club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' }),
        409,
      );
      const otherClub = await createClub('Delta FC', 'DLT');
      expect((await bought(playerId, otherClub)).body.club_id).toBe(otherClub);
    });

    it('dois clubes comprando o mesmo jogador ao mesmo tempo: só uma compra grava', async () => {
      const otherClub = await createClub('Delta FC', 'DLT');
      const responses = await Promise.all(
        [clubId, otherClub].map((club) =>
          buy(playerId, { club_id: club, loyalty_until: '2027-03-02T10:15-03:00' }),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(await prisma.contract.count()).toBe(1);
      expect(await prisma.marketTransaction.count()).toBe(1);
    });

    it('o mesmo clube comprando dois jogadores ao mesmo tempo: a 2ª compra vê o caixa já debitado', async () => {
      // caixa 100,00; cada compra custa 50,00 (47,62 + 2,38): a 1ª cabe; depois sobra 50,00 e a 2ª passa de 25,00
      await prisma.club.update({ where: { id: clubId }, data: { cash: '100.00' } });
      const first = await playerWorth('47.62', 'Jogador Um');
      const second = await playerWorth('47.62', 'Jogador Dois');

      const responses = await Promise.all(
        [first, second].map((id) =>
          buy(id, { club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' }),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
      expect(club.cash.toFixed(2)).toBe('50.00');
      expect(await prisma.player.count({ where: { clubId } })).toBe(1);
      expect(await prisma.contract.count()).toBe(1);
      expect(await prisma.marketTransaction.count()).toBe(1);
    });

    it('o mesmo clube com 11 jogadores comprando dois ao mesmo tempo: só o 12º entra', async () => {
      for (let index = 0; index < 11; index += 1) {
        const id = await createPlayer(
          playerBody(`Jogador ${String.fromCharCode(65 + index)}`, 'MEI', 40),
        );
        await bought(id, clubId);
      }
      const candidates = await Promise.all([
        createPlayer(playerBody('Jogador Extra', 'MEI', 40)),
        createPlayer(playerBody('Jogador Outro', 'MEI', 40)),
      ]);

      const responses = await Promise.all(
        candidates.map((id) =>
          buy(id, { club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' }),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(await prisma.player.count({ where: { clubId } })).toBe(12);
      expect(await prisma.contract.count({ where: { status: 'ATIVO' } })).toBe(12);
    });

    it.each([
      ['do contrato', 'contratos'],
      ['da transação COMPRA', 'transacoes'],
    ])(
      'falha na gravação %s desfaz a compra inteira (caixa, vínculo, contrato e histórico)',
      async (_description, table) => {
        await withFailureOn(table, 'INSERT', async () => {
          const response = await buy(playerId, {
            club_id: clubId,
            loyalty_until: '2027-03-02T10:15-03:00',
          });

          expectError(response, 500);
          expect(response.body.message).not.toContain('falha provocada');
          await expectNothingRecorded(clubId);
          const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
          expect(player.clubId).toBeNull();
        });

        expect((await bought(playerId, clubId)).body.club_cash).toBe(258);
      },
    );

    it('depois da compra, as consultas de jogadores e clubes mostram o novo estado', async () => {
      const otherClub = await createClub('Delta FC', 'DLT');
      const before = await http().get('/api/v1/clubs?sort=net_worth_desc');
      expect((before.body as { name: string }[]).map((club) => club.name)).toEqual([
        'Águias FC',
        'Delta FC',
      ]);

      await bought(playerId, otherClub);

      const player = await http().get(`/api/v1/players/${playerId}`);
      expect(player.body).toMatchObject({ id: playerId, club_id: otherClub, market_value: 40 });
      const free = await http().get('/api/v1/players?free=true');
      expect(free.body.meta.total_items).toBe(0);
      const inClub = await http().get(`/api/v1/players?club_id=${otherClub}`);
      expect((inClub.body.data as { id: number }[]).map((row) => row.id)).toEqual([playerId]);

      const byNetWorth = await http().get('/api/v1/clubs?sort=net_worth_desc');
      expect(byNetWorth.body).toEqual([
        {
          id: clubId,
          name: 'Águias FC',
          acronym: 'AGU',
          cash: 300,
          squad_value: 0,
          net_worth: 300,
        },
        {
          id: otherClub,
          name: 'Delta FC',
          acronym: 'DLT',
          cash: 258,
          squad_value: 40,
          net_worth: 298,
        },
      ]);
      const detail = await http().get(`/api/v1/clubs/${otherClub}`);
      expect(detail.body).toMatchObject({ cash: 258, squad_value: 40, net_worth: 298 });
      expect(detail.body.players[0]).toMatchObject({
        id: playerId,
        contract: {
          purchase_value: 40,
          loyalty_until: '2027-03-02T10:15:00-03:00',
          remaining_days: 120,
          penalty_rate: 10,
        },
      });
    });
  });

  describe('POST /players/{id}/sell', () => {
    let clubId: number;

    beforeEach(async () => {
      clubId = await createClub('Águias FC', 'AGU');
    });

    /** Compra em 02/11 e vende em 03/11/2026 às 10:15, com o fim da fidelidade pedido. */
    async function sellWithLoyalty(loyaltyUntil: string): Promise<request.Response> {
      const playerId = await createPlayer(MEIA_LUA);
      await bought(playerId, clubId, loyaltyUntil);
      clock.setBrasilia('2026-11-03T10:15-03:00');
      return sell(playerId);
    }

    it.each([
      // fim da fidelidade (venda em 03/11/2026 10:15), dias, %, multa, situação
      ['2026-11-03T10:15-03:00', 'é o próprio momento', 0, 0, 0, 'ENCERRADO'],
      ['2026-11-13T12:15-03:00', '10 dias e 2 horas', 11, 5, 2, 'RESCINDIDO'],
      ['2026-12-03T10:15-03:00', 'exatamente 30 dias', 30, 5, 2, 'RESCINDIDO'],
      ['2026-12-03T10:16-03:00', '30 dias e 1 minuto', 31, 10, 4, 'RESCINDIDO'],
      ['2027-05-02T10:15-03:00', 'exatamente 180 dias', 180, 10, 4, 'RESCINDIDO'],
      ['2027-05-02T10:16-03:00', '180 dias e 1 minuto', 181, 20, 8, 'RESCINDIDO'],
    ])(
      'RN15: fidelidade até %s (%s) → %i dias, %i%%, multa %d, %s',
      async (loyaltyUntil, _description, days, rate, penalty, status) => {
        const response = await sellWithLoyalty(loyaltyUntil);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          value: 40,
          remaining_days: days,
          penalty_rate: rate,
          penalty,
          profit: 0,
          fee: 0,
          cash_change: 40 - penalty,
          contract_status: status,
        });
      },
    );

    it('RN15: fidelidade já vencida → 0 dia e contrato ENCERRADO', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      await bought(playerId, clubId, '2026-11-03T10:15-03:00');
      clock.setBrasilia('2026-11-10T10:15-03:00');

      expect((await sell(playerId)).body).toMatchObject({
        remaining_days: 0,
        penalty: 0,
        contract_status: 'ENCERRADO',
      });
    });

    it('RN16: prejuízo sem comissão — compra 50,00, venda 42,50, multa 20% = 8,50, crédito 34,00', async () => {
      const playerId = await playerWorth('50.00');
      await bought(playerId, clubId, '2027-06-01T10:15-03:00');
      await http()
        .patch(`/api/v1/players/${playerId}/condition`)
        .send({ condition: 'MAL_CONDICIONADO' });

      expect((await sell(playerId)).body).toMatchObject({
        value: 42.5,
        penalty: 8.5,
        profit: -7.5,
        fee: 0,
        cash_change: 34,
        club_cash: 300 - 50 - 2.5 + 34,
      });
    });

    it('RN15 + RN16: multa limitada a 10,00 e comissão progressiva — compra 60,00, venda 75,00', async () => {
      const playerId = await playerWorth('60.00');
      await bought(playerId, clubId, '2027-06-01T10:15-03:00');
      await prisma.player.update({ where: { id: playerId }, data: { baseValue: '75.00' } });

      expect((await sell(playerId)).body).toMatchObject({
        purchase_value: 60,
        value: 75,
        penalty: 10,
        profit: 15,
        fee: 2,
        cash_change: 63,
      });
    });

    it('o vendido volta a ficar livre e sai da escalação; a formação continua', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      await bought(playerId, clubId);
      await prisma.club.update({ where: { id: clubId }, data: { formation: '2-1-1' } });
      await prisma.lineupSlot.create({ data: { clubId, playerId } });

      await sell(playerId);

      expect(await prisma.lineupSlot.count()).toBe(0);
      expect((await prisma.club.findUniqueOrThrow({ where: { id: clubId } })).formation).toBe(
        '2-1-1',
      );
      const free = await http().get('/api/v1/players?free=true');
      const freeIds = (free.body.data as { id: number }[]).map((player) => player.id);
      expect(freeIds).toContain(playerId);
    });

    it('conciliação do caixa: 300,00 + soma das variações = caixa atual (RN17)', async () => {
      const first = await createPlayer(MEIA_LUA);
      const second = await playerWorth('31.00', 'Outro Jogador');
      await bought(first, clubId);
      await bought(second, clubId);
      await sell(first);

      const transactions = await prisma.marketTransaction.findMany();
      const sum = transactions.reduce(
        (total, transaction) => total + Number(transaction.cashChange),
        0,
      );
      const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
      expect((300 + sum).toFixed(2)).toBe(club.cash.toFixed(2));
    });

    it('jogador livre → 409, sem gravar', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      expectError(await sell(playerId), 409);
      await expectNothingRecorded(clubId);
    });

    it.each(['999', 'abc', '01'])('jogador %s → 404', async (id) => {
      expectError(await sell(id), 404);
    });

    it('duas vendas do mesmo jogador ao mesmo tempo: só uma credita o caixa', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      await bought(playerId, clubId);

      const responses = await Promise.all([sell(playerId), sell(playerId)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
      // 300,00 − 42,00 (compra de 40,00 + 2,00) + 36,00 (40,00 − multa de 4,00, sem lucro)
      expect(club.cash.toFixed(2)).toBe('294.00');
      expect(await prisma.marketTransaction.count({ where: { type: 'VENDA' } })).toBe(1);
      expect((await prisma.contract.findFirstOrThrow()).status).toBe('RESCINDIDO');
    });

    it('venda e compra do mesmo jogador por outro clube ao mesmo tempo: estado sempre consistente', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      await bought(playerId, clubId);
      const otherClub = await createClub('Delta FC', 'DLT');

      const [sale, purchase] = await Promise.all([
        sell(playerId),
        buy(playerId, { club_id: otherClub, loyalty_until: '2027-03-02T10:15-03:00' }),
      ]);

      // A venda trava o jogador primeiro ou espera a compra recusar; a compra só passa depois da venda.
      expect(sale.status).toBe(200);
      expect([200, 409]).toContain(purchase.status);
      const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
      const active = await prisma.contract.findMany({ where: { status: 'ATIVO' } });
      expect(active.length).toBeLessThanOrEqual(1);
      expect(player.clubId).toBe(active[0]?.clubId ?? null);
      for (const id of [clubId, otherClub]) {
        const club = await prisma.club.findUniqueOrThrow({ where: { id } });
        const changes = await prisma.marketTransaction.findMany({ where: { clubId: id } });
        const sum = changes.reduce((total, change) => total + Number(change.cashChange), 0);
        expect((300 + sum).toFixed(2)).toBe(club.cash.toFixed(2));
      }
    });

    it.each<[string, string, 'INSERT' | 'UPDATE' | 'DELETE']>([
      ['do contrato (RESCINDIDO)', 'contratos', 'UPDATE'],
      ['da saída da escalação', 'escalacoes', 'DELETE'],
      ['da transação VENDA', 'transacoes', 'INSERT'],
    ])(
      'falha na gravação %s desfaz a venda inteira (caixa, vínculo, contrato, escalação e histórico)',
      async (_description, table, event) => {
        const playerId = await createPlayer(MEIA_LUA);
        await bought(playerId, clubId);
        await prisma.club.update({ where: { id: clubId }, data: { formation: '2-1-1' } });
        await prisma.lineupSlot.create({ data: { clubId, playerId } });

        await withFailureOn(table, event, async () => {
          const response = await sell(playerId);

          expectError(response, 500);
          expect(response.body.message).not.toContain('falha provocada');
          const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
          expect(club.cash.toFixed(2)).toBe('258.00');
          const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
          expect(player.clubId).toBe(clubId);
          expect((await prisma.contract.findFirstOrThrow()).status).toBe('ATIVO');
          expect(await prisma.lineupSlot.count()).toBe(1);
          expect(await prisma.marketTransaction.count({ where: { type: 'VENDA' } })).toBe(0);
        });

        expect((await sell(playerId)).body).toMatchObject({ cash_change: 36, club_cash: 294 });
      },
    );

    it('depois da venda, as consultas de jogadores e clubes mostram o novo estado', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      const otherClub = await createClub('Delta FC', 'DLT');
      await bought(playerId, clubId);
      const before = await http().get('/api/v1/clubs?sort=net_worth_desc');
      expect((before.body as { name: string }[]).map((club) => club.name)).toEqual([
        'Delta FC',
        'Águias FC',
      ]);

      await sell(playerId);

      expect((await http().get(`/api/v1/players/${playerId}`)).body.club_id).toBeNull();
      const free = await http().get('/api/v1/players?free=true');
      expect((free.body.data as { id: number }[]).map((row) => row.id)).toEqual([playerId]);
      const inClub = await http().get(`/api/v1/players?club_id=${clubId}`);
      expect(inClub.body.meta.total_items).toBe(0);
      const byNetWorth = await http().get('/api/v1/clubs?sort=net_worth_desc');
      expect(byNetWorth.body).toEqual([
        {
          id: otherClub,
          name: 'Delta FC',
          acronym: 'DLT',
          cash: 300,
          squad_value: 0,
          net_worth: 300,
        },
        {
          id: clubId,
          name: 'Águias FC',
          acronym: 'AGU',
          cash: 294,
          squad_value: 0,
          net_worth: 294,
        },
      ]);
      expect((await http().get(`/api/v1/clubs/${clubId}`)).body).toMatchObject({
        cash: 294,
        squad_value: 0,
        net_worth: 294,
        players: [],
      });
    });

    it('jogador excluído → 404', async () => {
      const playerId = await createPlayer(MEIA_LUA);
      await http().delete(`/api/v1/players/${playerId}`);
      expectError(await sell(playerId), 404);
    });
  });

  describe('GET /clubs e GET /clubs/{id} (RN11)', () => {
    it('sem clubes: 200 com lista vazia', async () => {
      const response = await http().get('/api/v1/clubs');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('ordena pelo nome ou pelo patrimônio, com desempate pelo nome', async () => {
      // criados em ordem que contraria o nome no empate de patrimônio (Gama antes de Delta)
      const aguias = await createClub('Águias FC', 'AGU');
      const gama = await createClub('Gama SC', 'GSC');
      const delta = await createClub('Delta FC', 'DFC');
      await bought(await createPlayer(MEIA_LUA), aguias); // 40,00 + taxa 2,00 → patrimônio 298,00
      await bought(await playerWorth('30.00'), delta); // sem taxa → patrimônio 300,00
      const names = async (query: string) =>
        ((await http().get(`/api/v1/clubs${query}`)).body as { name: string }[]).map(
          (club) => club.name,
        );

      expect(await names('')).toEqual(['Águias FC', 'Delta FC', 'Gama SC']);
      expect(await names('?sort=name')).toEqual(['Águias FC', 'Delta FC', 'Gama SC']);
      expect(await names('?sort=net_worth_desc')).toEqual(['Delta FC', 'Gama SC', 'Águias FC']);
      expect(await names('?sort=net_worth_asc')).toEqual(['Águias FC', 'Delta FC', 'Gama SC']);

      const list = await http().get('/api/v1/clubs?sort=net_worth_desc');
      expect(list.body[0]).toEqual({
        id: delta,
        name: 'Delta FC',
        acronym: 'DFC',
        cash: 270,
        squad_value: 30,
        net_worth: 300,
      });
      expect(list.body[2]).toMatchObject({
        id: aguias,
        cash: 258,
        squad_value: 40,
        net_worth: 298,
      });
      expect(gama).toBeLessThan(delta);
    });

    it.each(['?sort=NAME', '?sort=', '?sort=net_worth', '?sort=name,net_worth_asc'])(
      '%s → 400',
      async (query) => {
        expectError(await http().get(`/api/v1/clubs${query}`), 400);
      },
    );

    it('elenco na ordem GOL, ZAG, LAT, MEI, ATA, depois nome e id, com o contrato de cada um', async () => {
      const clubId = await createClub('Águias FC', 'AGU');
      const ids: Record<string, number> = {};
      for (const [name, position] of [
        ['Otto Rangel', 'ATA'],
        ['Téo Brandão', 'ZAG'],
        ['Lauro Neves', 'MEI'],
        ['Ábner Costa', 'ZAG'],
        ['Davi Lins', 'LAT'],
        ['Rui Prado', 'GOL'],
      ]) {
        ids[name] = await createPlayer(playerBody(name, position, 42));
        await bought(ids[name], clubId, '2026-12-01T10:15-03:00');
      }

      const club = await http().get(`/api/v1/clubs/${clubId}`);
      const squad = club.body.players as { name: string; contract: object }[];
      expect(squad.map((player) => player.name)).toEqual([
        'Rui Prado',
        'Ábner Costa',
        'Téo Brandão',
        'Davi Lins',
        'Lauro Neves',
        'Otto Rangel',
      ]);
      expect(squad[0].contract).toEqual({
        purchase_value: 1,
        loyalty_until: '2026-12-01T10:15:00-03:00',
        remaining_days: 29,
        penalty_rate: 5,
      });
      expect(club.body).toMatchObject({ cash: 294, squad_value: 6, net_worth: 300 });
    });

    it('dias restantes e % de multa são do momento da consulta', async () => {
      const clubId = await createClub('Águias FC', 'AGU');
      await bought(await createPlayer(MEIA_LUA), clubId, '2026-12-01T10:15-03:00');

      clock.setBrasilia('2026-11-30T10:15-03:00');
      expect((await http().get(`/api/v1/clubs/${clubId}`)).body.players[0].contract).toMatchObject({
        remaining_days: 1,
        penalty_rate: 5,
      });
      clock.setBrasilia('2026-12-01T10:15-03:00');
      expect((await http().get(`/api/v1/clubs/${clubId}`)).body.players[0].contract).toMatchObject({
        remaining_days: 0,
        penalty_rate: 0,
      });
    });

    it.each(['999', 'abc', '0'])('clube %s → 404', async (id) => {
      expectError(await http().get(`/api/v1/clubs/${id}`), 404);
    });
  });

  describe('GET /clubs/{id}/transactions e /export (RN17, RN18)', () => {
    const CSV_HEADER_LINE =
      'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n';
    const ZERO_SUMMARY = {
      total_spent: 0,
      total_received: 0,
      total_fees: 0,
      total_penalties: 0,
      total_profit: 0,
    };

    const history = (clubId: number | string, query = '') =>
      http().get(`/api/v1/clubs/${clubId}/transactions${query}`);

    /** Exportação com o corpo cru (bytes), para conferir BOM, LF e UTF-8. */
    const exportCsv = (clubId: number | string, query = '') =>
      http()
        .get(`/api/v1/clubs/${clubId}/transactions/export${query}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

    function expectCsv(response: request.Response, expected: string): void {
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      const bytes = response.body as Buffer;
      expect(bytes.equals(Buffer.from(expected, 'utf8'))).toBe(true);
      expect(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
    }

    /** Fluxo oficial do Meia Lua: compra em 02/11 (37,00 + 1,85) e venda em 05/11 (40,00). */
    async function meiaLuaBoughtAndSold(): Promise<{ clubId: number; playerId: number }> {
      const clubId = await createClub('Águias FC', 'AGU');
      const playerId = await createPlayer(MEIA_LUA);
      await http()
        .patch(`/api/v1/players/${playerId}/condition`)
        .send({ condition: 'MAL_CONDICIONADO' });
      await bought(playerId, clubId);
      await http().patch(`/api/v1/players/${playerId}/condition`).send({ condition: 'APTO' });
      clock.setBrasilia('2026-11-05T16:40-03:00');
      expect((await sell(playerId)).status).toBe(200);
      return { clubId, playerId };
    }

    const OFFICIAL_SALE = {
      id: 2,
      club_id: 1,
      player_id: 1,
      player_name: 'Meia Lua',
      type: 'VENDA',
      value: 40,
      fee: 0.3,
      penalty: 4,
      profit: 3,
      cash_change: 35.7,
      created_at: '2026-11-05T16:40:00-03:00',
    };
    const OFFICIAL_PURCHASE = {
      id: 1,
      club_id: 1,
      player_id: 1,
      player_name: 'Meia Lua',
      type: 'COMPRA',
      value: 37,
      fee: 1.85,
      penalty: 0,
      profit: null,
      cash_change: -38.85,
      created_at: '2026-11-02T10:15:00-03:00',
    };
    const OFFICIAL_CSV_SALE =
      '2026-11-05T16:40:00-03:00;VENDA;Meia Lua;40,00;0,30;4,00;3,00;35,70\n';
    const OFFICIAL_CSV_PURCHASE =
      '2026-11-02T10:15:00-03:00;COMPRA;Meia Lua;37,00;1,85;0,00;;-38,85\n';

    it('A + B: compra e venda do exemplo, depois de renomear e mudar a condição, mostram os valores do momento', async () => {
      const { clubId, playerId } = await meiaLuaBoughtAndSold();
      await http()
        .put(`/api/v1/players/${playerId}`)
        .send({ name: 'Meia Lua Renomeado', position: 'MEI', agility: 85, age: 26 });
      await http().patch(`/api/v1/players/${playerId}/condition`).send({ condition: 'DOENTE' });
      expect((await http().get(`/api/v1/players/${playerId}`)).body.market_value).not.toBe(40);

      const full = await history(clubId);
      expect(full.status).toBe(200);
      expect(full.headers['content-type']).toMatch(/^application\/json/);
      expect(full.body).toEqual({
        data: [OFFICIAL_SALE, OFFICIAL_PURCHASE],
        summary: {
          total_spent: 38.85,
          total_received: 35.7,
          total_fees: 2.15,
          total_penalties: 4,
          total_profit: 3,
        },
      });

      expect((await history(clubId, '?type=VENDA')).body).toEqual({
        data: [OFFICIAL_SALE],
        summary: {
          ...ZERO_SUMMARY,
          total_received: 35.7,
          total_fees: 0.3,
          total_penalties: 4,
          total_profit: 3,
        },
      });
      expectCsv(
        await exportCsv(clubId),
        CSV_HEADER_LINE + OFFICIAL_CSV_SALE + OFFICIAL_CSV_PURCHASE,
      );
      expectCsv(await exportCsv(clubId, '?type=VENDA'), CSV_HEADER_LINE + OFFICIAL_CSV_SALE);
    });

    it('conciliação: 300,00 + soma de cash_change do histórico completo = caixa do clube (296,85)', async () => {
      const { clubId } = await meiaLuaBoughtAndSold();

      const transactions = (await history(clubId)).body.data as { cash_change: number }[];
      const cashChangeCents = transactions.reduce(
        (total, transaction) => total + Math.round(transaction.cash_change * 100),
        0,
      );
      const club = await http().get(`/api/v1/clubs/${clubId}`);
      expect(30000 + cashChangeCents).toBe(Math.round(club.body.cash * 100));
      expect(club.body.cash).toBe(296.85);
    });

    it('C: jogador excluído continua no histórico geral; filtrar por ele → 404 nos dois endpoints', async () => {
      const { clubId, playerId } = await meiaLuaBoughtAndSold();
      expect((await http().delete(`/api/v1/players/${playerId}`)).status).toBe(204);

      expect((await history(clubId)).body.data).toEqual([OFFICIAL_SALE, OFFICIAL_PURCHASE]);
      expectCsv(
        await exportCsv(clubId),
        CSV_HEADER_LINE + OFFICIAL_CSV_SALE + OFFICIAL_CSV_PURCHASE,
      );
      expectError(await history(clubId, `?player_id=${playerId}`), 404);
      const exported = await exportCsv(clubId, `?player_id=${playerId}`);
      expect(exported.status).toBe(404);
      expect(exported.headers['content-type']).toMatch(/^application\/json/);
      expect(JSON.parse((exported.body as Buffer).toString('utf8'))).toEqual({
        message: 'Jogador não encontrado.',
      });
      expect(await prisma.marketTransaction.count()).toBe(2);
    });

    describe('D e F: dois clubes, três jogadores, filtros e empate de data e hora', () => {
      let aguias: number;
      let delta: number;
      let first: number;
      let second: number;
      let third: number;

      /**
       * Águias: compra Um (20,00) às 10:15 e Dois (40,00 + 2,00) às 10:20; vende Um às 10:30 por
       * 15,00 (multa 10% = 1,50; prejuízo 5,00). Delta: às 10:40, no mesmo instante, compra Um
       * (15,00) e Três (10,00).
       */
      beforeEach(async () => {
        aguias = await createClub('Águias FC', 'AGU');
        delta = await createClub('Delta FC', 'DLT');
        first = await playerWorth('20.00', 'Jogador Um');
        second = await playerWorth('40.00', 'Jogador Dois');
        third = await playerWorth('10.00', 'Jogador Três');
        await bought(first, aguias);
        clock.setBrasilia('2026-11-02T10:20-03:00');
        await bought(second, aguias);
        await prisma.player.update({ where: { id: first }, data: { baseValue: '15.00' } });
        clock.setBrasilia('2026-11-02T10:30-03:00');
        expect((await sell(first)).body).toMatchObject({ value: 15, penalty: 1.5, profit: -5 });
        clock.setBrasilia('2026-11-02T10:40-03:00');
        await bought(first, delta);
        await bought(third, delta);
      });

      const rows = (response: request.Response) =>
        (response.body.data as { id: number; type: string; player_name: string }[]).map(
          (row) => `${row.id} ${row.type} ${row.player_name}`,
        );

      it.each([
        [
          '',
          ['3 VENDA Jogador Um', '2 COMPRA Jogador Dois', '1 COMPRA Jogador Um'],
          {
            total_spent: 62,
            total_received: 13.5,
            total_fees: 2,
            total_penalties: 1.5,
            total_profit: -5,
          },
        ],
        [
          '?type=COMPRA',
          ['2 COMPRA Jogador Dois', '1 COMPRA Jogador Um'],
          { total_spent: 62, total_fees: 2 },
        ],
        [
          '?type=VENDA',
          ['3 VENDA Jogador Um'],
          { total_received: 13.5, total_penalties: 1.5, total_profit: -5 },
        ],
        [
          '?type=VENDA,COMPRA',
          ['3 VENDA Jogador Um', '2 COMPRA Jogador Dois', '1 COMPRA Jogador Um'],
          {
            total_spent: 62,
            total_received: 13.5,
            total_fees: 2,
            total_penalties: 1.5,
            total_profit: -5,
          },
        ],
        [
          '?player_id=1',
          ['3 VENDA Jogador Um', '1 COMPRA Jogador Um'],
          { total_spent: 20, total_received: 13.5, total_penalties: 1.5, total_profit: -5 },
        ],
        ['?type=COMPRA&player_id=1', ['1 COMPRA Jogador Um'], { total_spent: 20 }],
        [
          '?player_id=1&type=VENDA',
          ['3 VENDA Jogador Um'],
          { total_received: 13.5, total_penalties: 1.5, total_profit: -5 },
        ],
        ['?player_id=3', [], {}],
      ])(
        'Águias%s → linhas, summary e CSV correspondentes',
        async (query, expectedRows, summary) => {
          const response = await history(aguias, query);
          expect(response.status).toBe(200);
          expect(rows(response)).toEqual(expectedRows);
          expect(response.body.summary).toEqual({ ...ZERO_SUMMARY, ...summary });

          const csv = (await exportCsv(aguias, query)).body as Buffer;
          const csvLines = csv.toString('utf8').split('\n').slice(1, -1);
          const fromJson = (response.body.data as { type: string; player_name: string }[]).map(
            (row) => `${row.type};${row.player_name}`,
          );
          expect(csvLines.map((line) => line.split(';').slice(1, 3).join(';'))).toEqual(fromJson);
        },
      );

      it('exporta o histórico completo do Águias com prejuízo negativo e lucro vazio nas compras', async () => {
        expectCsv(
          await exportCsv(aguias),
          CSV_HEADER_LINE +
            '2026-11-02T10:30:00-03:00;VENDA;Jogador Um;15,00;0,00;1,50;-5,00;13,50\n' +
            '2026-11-02T10:20:00-03:00;COMPRA;Jogador Dois;40,00;2,00;0,00;;-42,00\n' +
            '2026-11-02T10:15:00-03:00;COMPRA;Jogador Um;20,00;0,00;0,00;;-20,00\n',
        );
      });

      it('F: mesmo created_at → id decrescente, igual no JSON e no CSV; um clube não vê o outro', async () => {
        const response = await history(delta);
        expect(rows(response)).toEqual(['5 COMPRA Jogador Três', '4 COMPRA Jogador Um']);
        expect(
          new Set((response.body.data as { created_at: string }[]).map((row) => row.created_at)),
        ).toEqual(new Set(['2026-11-02T10:40:00-03:00']));
        expect(response.body.summary).toEqual({ ...ZERO_SUMMARY, total_spent: 25 });
        expectCsv(
          await exportCsv(delta),
          CSV_HEADER_LINE +
            '2026-11-02T10:40:00-03:00;COMPRA;Jogador Três;10,00;0,00;0,00;;-10,00\n' +
            '2026-11-02T10:40:00-03:00;COMPRA;Jogador Um;15,00;0,00;0,00;;-15,00\n',
        );
      });

      it('conciliação dos dois clubes e leitura sem efeito colateral', async () => {
        const snapshot = async () => ({
          clubs: await prisma.club.findMany({ orderBy: { id: 'asc' } }),
          players: await prisma.player.findMany({ orderBy: { id: 'asc' } }),
          contracts: await prisma.contract.findMany({ orderBy: { id: 'asc' } }),
          transactions: await prisma.marketTransaction.findMany({ orderBy: { id: 'asc' } }),
        });
        const before = await snapshot();

        for (const clubId of [aguias, delta]) {
          const changes = (await history(clubId)).body.data as { cash_change: number }[];
          const total = changes.reduce((sum, row) => sum + Math.round(row.cash_change * 100), 0);
          const club = await http().get(`/api/v1/clubs/${clubId}`);
          expect(30000 + total).toBe(Math.round(club.body.cash * 100));
          await exportCsv(clubId, '?type=COMPRA');
        }

        expect(await snapshot()).toEqual(before);
      });

      it('compra recusada não aparece no histórico', async () => {
        expectError(
          await buy(first, { club_id: aguias, loyalty_until: '2027-03-02T10:15-03:00' }),
          409,
        );
        expect(rows(await history(aguias))).toHaveLength(3);
      });
    });

    it('E: clube sem transações → data vazia, summary zerado e CSV só com o cabeçalho', async () => {
      const clubId = await createClub('Águias FC', 'AGU');

      expect((await history(clubId)).body).toEqual({ data: [], summary: ZERO_SUMMARY });
      expectCsv(await exportCsv(clubId), CSV_HEADER_LINE);
      expectCsv(await exportCsv(clubId, '?type=VENDA'), CSV_HEADER_LINE);
    });

    it.each([
      ['?type=', 400],
      ['?type=compra', 400],
      ['?type=COMPRA,COMPRA', 400],
      ['?type=COMPRA,%20VENDA', 400],
      ['?type=COMPRA,OUTRO', 400],
      ['?type=COMPRA&type=VENDA', 400],
      ['?player_id=', 400],
      ['?player_id=0', 400],
      ['?player_id=01', 400],
      ['?player_id=-1', 400],
      ['?player_id=1.5', 400],
      ['?player_id=1e2', 400],
      ['?player_id=abc', 400],
      ['?player_id=999', 404],
    ])('filtro %s → %i em JSON nos dois endpoints', async (query, status) => {
      const clubId = await createClub('Águias FC', 'AGU');
      await createPlayer(MEIA_LUA);

      expectError(await history(clubId, query), status);
      const exported = await exportCsv(clubId, query);
      expect(exported.status).toBe(status);
      expect(exported.headers['content-type']).toMatch(/^application\/json/);
      expect(typeof JSON.parse((exported.body as Buffer).toString('utf8')).message).toBe('string');
    });

    it.each(['999', 'abc', '0', '01'])('clube %s → 404 nos dois endpoints', async (id) => {
      expectError(await history(id), 404);
      const exported = await exportCsv(id);
      expect(exported.status).toBe(404);
      expect(exported.headers['content-type']).toMatch(/^application\/json/);
    });

    it('nome com aspas e ponto e vírgula sai escapado no CSV, com o nome gravado', async () => {
      const clubId = await createClub('Águias FC', 'AGU');
      const quoted = await playerWorth('20.00', 'Zé "Foguete" Lima');
      const semicolon = await playerWorth('10.00', 'Ana; Bia');
      await bought(quoted, clubId);
      clock.setBrasilia('2026-11-02T10:16-03:00');
      await bought(semicolon, clubId);

      expect(
        ((await history(clubId)).body.data as { player_name: string }[]).map(
          (row) => row.player_name,
        ),
      ).toEqual(['Ana; Bia', 'Zé "Foguete" Lima']);
      expectCsv(
        await exportCsv(clubId),
        CSV_HEADER_LINE +
          '2026-11-02T10:16:00-03:00;COMPRA;"Ana; Bia";10,00;0,00;0,00;;-10,00\n' +
          '2026-11-02T10:15:00-03:00;COMPRA;"Zé ""Foguete"" Lima";20,00;0,00;0,00;;-20,00\n',
      );
    });

    it('a exportação traz Content-Disposition com nome de arquivo', async () => {
      const clubId = await createClub('Águias FC', 'AGU');
      expect((await exportCsv(clubId)).headers['content-disposition']).toBe(
        `attachment; filename="transacoes-clube-${clubId}.csv"`,
      );
    });
  });
});
