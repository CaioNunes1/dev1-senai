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
});
