import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './test-app';
import { TestClock } from './test-clock';
import { resetTestDatabase } from './test-database';

type Attributes = Partial<Record<'shooting' | 'passing' | 'dribbling' | 'defending', number>>;

/** Jogador com os atributos em 50, exceto os informados (só os da partida importam). */
const playerBody = (name: string, position: string, attributes: Attributes = {}) => ({
  name,
  position,
  age: 25,
  agility: 50,
  pace: 50,
  shooting: 50,
  passing: 50,
  dribbling: 50,
  defending: 50,
  physical: 50,
  potential: 99,
  ...attributes,
});

/** Titulares do exemplo da RN20, na ordem do elenco. */
const AGUIAS = [
  playerBody('Rui Prado', 'GOL', { defending: 77 }),
  playerBody('Téo Brandão', 'ZAG', { defending: 84 }),
  playerBody('Davi Lins', 'LAT', { dribbling: 74, defending: 66 }),
  playerBody('Lauro Neves', 'MEI', { passing: 82 }),
  playerBody('Otto Rangel', 'ATA', { shooting: 75 }),
];
const DELTA = [
  playerBody('Ivo Teles', 'GOL', { defending: 72 }),
  playerBody('Hugo Vaz', 'ZAG', { defending: 84 }),
  playerBody('Lino Matos', 'LAT', { dribbling: 79, defending: 63 }),
  playerBody('Nei Soares', 'MEI', { passing: 70 }),
  playerBody('Ugo Falcão', 'ATA', { shooting: 81 }),
];

interface LineupBody {
  formation: string | null;
  complete: boolean;
  players: { id: number; name: string }[];
}

interface DuelBody {
  order: number;
  attacking_club_id: number;
  attacker: { player_name: string; attribute: string; value: number; condition: string };
  defender: { player_name: string; value: number };
  goal: boolean;
}

/** Nomes válidos (2 palavras, sem dígitos) para escalações genéricas. */
const NAMES = ['Ana Lima', 'Bia Rocha', 'Caio Melo', 'Dani Reis', 'Edu Paz'];

const MATCH_MOMENT = '2026-11-12T15:00-03:00';

describe('Liga: escalação, partidas e classificação (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let clock: TestClock;

  beforeAll(async () => {
    ({ app, prisma, clock } = await createTestApp());
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
    clock.setBrasilia(MATCH_MOMENT);
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

  /**
   * Elenco montado direto no banco (fixture): a escalação e a partida não dependem de como o
   * jogador chegou ao clube. A venda, que precisa do contrato, usa a compra real (`bought`).
   */
  async function squad(clubId: number, bodies: object[]): Promise<number[]> {
    const ids: number[] = [];
    for (const body of bodies) {
      const id = await createPlayer(body);
      await prisma.player.update({ where: { id }, data: { clubId } });
      ids.push(id);
    }
    return ids;
  }

  async function bought(clubId: number, body: object): Promise<number> {
    const id = await createPlayer(body);
    await prisma.player.update({ where: { id }, data: { baseValue: '10.00' } });
    const response = await http()
      .post(`/api/v1/players/${id}/buy`)
      .send({ club_id: clubId, loyalty_until: '2027-03-02T10:15-03:00' });
    expect(response.status).toBe(200);
    return id;
  }

  const putLineup = (clubId: number | string, body: object) =>
    http().put(`/api/v1/clubs/${clubId}/lineup`).send(body);
  const getLineup = (clubId: number | string) => http().get(`/api/v1/clubs/${clubId}/lineup`);
  const play = (body: object) => http().post('/api/v1/matches').send(body);

  function expectError(response: request.Response, status: number): void {
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toBe('');
  }

  /** Águias FC (1) e Delta FC (2) com os titulares do exemplo, ambos no 2-1-1. */
  async function officialScenario() {
    const aguias = await createClub('Águias FC', 'AGU');
    const delta = await createClub('Delta FC', 'DEL');
    const aguiasIds = await squad(aguias, AGUIAS);
    const deltaIds = await squad(delta, DELTA);
    const condition = await http()
      .patch(`/api/v1/players/${aguiasIds[2]}/condition`)
      .send({ condition: 'MAL_CONDICIONADO' });
    expect(condition.status).toBe(200);
    expect(
      (await putLineup(aguias, { formation: '2-1-1', player_ids: [...aguiasIds].reverse() }))
        .status,
    ).toBe(200);
    expect((await putLineup(delta, { formation: '2-1-1', player_ids: deltaIds })).status).toBe(200);
    return { aguias, delta, aguiasIds, deltaIds };
  }

  describe('escalação (RN19)', () => {
    it('clube sem escalação: formation null, complete false, players vazio', async () => {
      const club = await createClub('Águias FC', 'AGU');

      const response = await getLineup(club);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        club_id: club,
        formation: null,
        complete: false,
        players: [],
      });
    });

    it('escala em qualquer ordem e devolve os titulares na ordem do elenco; o caixa não muda', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const ids = await squad(club, AGUIAS);

      const response = await putLineup(club, {
        formation: '2-1-1',
        player_ids: [...ids].reverse(),
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ club_id: club, formation: '2-1-1', complete: true });
      expect((response.body as LineupBody).players.map((player) => player.name)).toEqual([
        'Rui Prado',
        'Téo Brandão',
        'Davi Lins',
        'Lauro Neves',
        'Otto Rangel',
      ]);
      expect(Object.keys((response.body as LineupBody).players[0]).sort()).toEqual(
        Object.keys((await http().get(`/api/v1/players/${ids[0]}`)).body as object).sort(),
      );
      expect((await getLineup(club)).body).toEqual(response.body);
      expect((await http().get(`/api/v1/clubs/${club}`)).body.cash).toBe(300);
    });

    it.each([
      ['3-1', ['GOL', 'ZAG', 'LAT', 'LAT', 'ATA']],
      ['2-2', ['GOL', 'ZAG', 'LAT', 'ATA', 'ATA']],
      ['1-2-1', ['GOL', 'ZAG', 'MEI', 'MEI', 'ATA']],
    ])('aceita a formação %s', async (formation, positions) => {
      const club = await createClub('Águias FC', 'AGU');
      const ids = await squad(
        club,
        positions.map((position, index) => playerBody(NAMES[index], position)),
      );

      const response = await putLineup(club, { formation, player_ids: ids });

      expect(response.status).toBe(200);
      expect(response.body.complete).toBe(true);
    });

    it('substitui a escalação inteira', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const first = await squad(club, AGUIAS);
      const extra = await squad(club, [playerBody('Zeca Lateral', 'LAT')]);
      await putLineup(club, { formation: '2-1-1', player_ids: first });

      const response = await putLineup(club, {
        formation: '3-1',
        player_ids: [first[0], first[1], first[2], extra[0], first[4]],
      });

      expect(response.status).toBe(200);
      expect(response.body.formation).toBe('3-1');
      expect((response.body as LineupBody).players.map((player) => player.id)).not.toContain(
        first[3],
      );
      expect(await prisma.lineupSlot.count({ where: { clubId: club } })).toBe(5);
    });

    it.each([
      [{ player_ids: [1, 2, 3, 4, 5] }],
      [{ formation: '4-0', player_ids: [1, 2, 3, 4, 5] }],
      [{ formation: '2-1-1' }],
      [{ formation: '2-1-1', player_ids: '1,2,3,4,5' }],
      [{ formation: '2-1-1', player_ids: [1, 2, 3, 4] }],
      [{ formation: '2-1-1', player_ids: [1, 2, 3, 4, 5, 6] }],
      [{ formation: '2-1-1', player_ids: [1, 2, 3, 4, 4] }],
      [{ formation: '2-1-1', player_ids: [0, 2, 3, 4, 5] }],
      [{ formation: '2-1-1', player_ids: ['1', 2, 3, 4, 5] }],
      [{ formation: '2-1-1', player_ids: [1.5, 2, 3, 4, 5] }],
    ])('400 para corpo inválido %j, sem gravar', async (body) => {
      const club = await createClub('Águias FC', 'AGU');

      expectError(await putLineup(club, body), 400);
      expect(await prisma.lineupSlot.count()).toBe(0);
    });

    it('404 para clube inexistente e para jogador inexistente ou excluído', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const ids = await squad(club, AGUIAS);
      const deleted = await createPlayer(playerBody('Ex Jogador', 'ATA'));
      expect((await http().delete(`/api/v1/players/${deleted}`)).status).toBe(204);

      expectError(await putLineup(999, { formation: '2-1-1', player_ids: ids }), 404);
      expectError(await getLineup(999), 404);
      expectError(
        await putLineup(club, { formation: '2-1-1', player_ids: [...ids.slice(0, 4), 9999] }),
        404,
      );
      expectError(
        await putLineup(club, { formation: '2-1-1', player_ids: [...ids.slice(0, 4), deleted] }),
        404,
      );
    });

    it('409 para jogador de outro clube, livre, DOENTE ou posições que não fecham; nada muda', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const other = await createClub('Delta FC', 'DEL');
      const ids = await squad(club, AGUIAS);
      const [foreign] = await squad(other, [playerBody('Ugo Falcão', 'ATA')]);
      const free = await createPlayer(playerBody('Leo Livre', 'ATA'));
      await putLineup(club, { formation: '2-1-1', player_ids: ids });
      const before = (await getLineup(club)).body;

      expectError(
        await putLineup(club, { formation: '2-1-1', player_ids: [...ids.slice(0, 4), foreign] }),
        409,
      );
      expectError(
        await putLineup(club, { formation: '2-1-1', player_ids: [...ids.slice(0, 4), free] }),
        409,
      );
      expectError(await putLineup(club, { formation: '2-2', player_ids: ids }), 409);
      expectError(await putLineup(club, { formation: '3-1', player_ids: ids }), 409);
      await http().patch(`/api/v1/players/${ids[4]}/condition`).send({ condition: 'DOENTE' });
      expectError(await putLineup(club, { formation: '2-1-1', player_ids: ids }), 409);

      const after = (await getLineup(club)).body;
      expect(after.formation).toBe(before.formation);
    });

    it('titular vendido sai da escalação: mesma formação, complete false, sem jogar', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const rival = await createClub('Delta FC', 'DEL');
      const ids = await squad(club, AGUIAS.slice(0, 4));
      const striker = await bought(club, AGUIAS[4]);
      await putLineup(club, { formation: '2-1-1', player_ids: [...ids, striker] });
      await putLineup(rival, { formation: '2-1-1', player_ids: await squad(rival, DELTA) });

      expect((await http().post(`/api/v1/players/${striker}/sell`)).status).toBe(200);

      const lineup = (await getLineup(club)).body as LineupBody;
      expect(lineup).toMatchObject({ formation: '2-1-1', complete: false });
      expect(lineup.players).toHaveLength(4);
      expectError(await play({ home_club_id: club, away_club_id: rival }), 409);
    });

    it('titular que passa a DOENTE sai da escalação e não volta sozinho', async () => {
      const club = await createClub('Águias FC', 'AGU');
      const ids = await squad(club, AGUIAS);
      await putLineup(club, { formation: '2-1-1', player_ids: ids });

      await http().patch(`/api/v1/players/${ids[1]}/condition`).send({ condition: 'DOENTE' });
      await http()
        .patch(`/api/v1/players/${ids[1]}/condition`)
        .send({ condition: 'MAL_CONDICIONADO' });

      const lineup = (await getLineup(club)).body as LineupBody;
      expect(lineup).toMatchObject({ formation: '2-1-1', complete: false });
      expect(lineup.players.map((player) => player.id)).not.toContain(ids[1]);
    });
  });

  describe('partidas (RN20)', () => {
    it('reproduz o exemplo oficial: 201, Location, placar 1 × 2 e os 6 duelos', async () => {
      const { aguias, delta } = await officialScenario();
      const cashBefore = (await http().get('/api/v1/clubs')).body;

      const response = await play({ home_club_id: aguias, away_club_id: delta });

      expect(response.status).toBe(201);
      expect(response.headers.location).toBe(`/api/v1/matches/${response.body.id}`);
      expect(response.body).toMatchObject({
        played_at: '2026-11-12T15:00:00-03:00',
        home: { club_id: aguias, club_name: 'Águias FC', formation: '2-1-1', goals: 1 },
        away: { club_id: delta, club_name: 'Delta FC', formation: '2-1-1', goals: 2 },
        result: 'VISITANTE',
      });
      expect(
        (response.body as { duels: DuelBody[] }).duels.map(
          (duel: {
            order: number;
            attacking_club_id: number;
            attacker: { player_name: string; attribute: string; value: number; condition: string };
            defender: { player_name: string; value: number };
            goal: boolean;
          }) => [
            duel.order,
            duel.attacking_club_id === aguias ? 'AGU' : 'DEL',
            duel.attacker.player_name,
            duel.attacker.attribute,
            duel.attacker.value,
            duel.defender.player_name,
            duel.defender.value,
            duel.goal,
          ],
        ),
      ).toEqual([
        [1, 'AGU', 'Otto Rangel', 'shooting', 75, 'Ivo Teles', 72, true],
        [2, 'AGU', 'Lauro Neves', 'passing', 82, 'Hugo Vaz', 84, false],
        [3, 'AGU', 'Davi Lins', 'dribbling', 63, 'Lino Matos', 63, false],
        [4, 'DEL', 'Ugo Falcão', 'shooting', 81, 'Rui Prado', 77, true],
        [5, 'DEL', 'Nei Soares', 'passing', 70, 'Téo Brandão', 84, false],
        [6, 'DEL', 'Lino Matos', 'dribbling', 79, 'Davi Lins', 56, true],
      ]);
      expect(response.body.duels[2].attacker.condition).toBe('MAL_CONDICIONADO');
      expect((await http().get('/api/v1/clubs')).body).toEqual(cashBefore);
      expect((await getLineup(aguias)).body.complete).toBe(true);
      expect(await prisma.matchDuel.count()).toBe(6);
    });

    it('a partida guardada não muda quando o jogador muda depois', async () => {
      const { aguias, delta, aguiasIds } = await officialScenario();
      const played = (await play({ home_club_id: aguias, away_club_id: delta })).body;

      await http()
        .put(`/api/v1/players/${aguiasIds[4]}`)
        .send({ ...AGUIAS[4], name: 'Otto Renomeado', shooting: 99 });
      await http().patch(`/api/v1/players/${aguiasIds[2]}/condition`).send({ condition: 'APTO' });

      expect((await http().get(`/api/v1/matches/${played.id}`)).body).toEqual(played);
    });

    it.each([
      [{}],
      [{ home_club_id: 1 }],
      [{ home_club_id: 1, away_club_id: 1 }],
      [{ home_club_id: '1', away_club_id: 2 }],
      [{ home_club_id: 0, away_club_id: 2 }],
    ])('400 para %j, sem gravar', async (body) => {
      await officialScenario();
      expectError(await play(body), 400);
      expect(await prisma.match.count()).toBe(0);
    });

    it('404 para clube inexistente e 409 para escalação incompleta, sem gravar', async () => {
      const { aguias } = await officialScenario();
      const empty = await createClub('Gama SC', 'GAM');

      expectError(await play({ home_club_id: aguias, away_club_id: 999 }), 404);
      expectError(await play({ home_club_id: empty, away_club_id: aguias }), 409);
      expectError(await play({ home_club_id: aguias, away_club_id: empty }), 409);
      expect(await prisma.match.count()).toBe(0);
    });

    it('falha ao gravar os duelos desfaz a partida inteira', async () => {
      const { aguias, delta } = await officialScenario();
      await prisma.$executeRawUnsafe(
        `CREATE OR REPLACE FUNCTION falha_provocada_e2e() RETURNS trigger AS $$
         BEGIN RAISE EXCEPTION 'falha provocada pelo teste'; END $$ LANGUAGE plpgsql`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER falha_provocada_e2e BEFORE INSERT ON "duelos_partida"
         FOR EACH ROW EXECUTE FUNCTION falha_provocada_e2e()`,
      );
      try {
        expectError(await play({ home_club_id: aguias, away_club_id: delta }), 500);
      } finally {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS falha_provocada_e2e ON "duelos_partida"',
        );
        await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS falha_provocada_e2e()');
      }
      expect(await prisma.match.count()).toBe(0);
      expect(await prisma.matchDuel.count()).toBe(0);
    });
  });

  describe('histórico e classificação (RN21)', () => {
    it('lista da mais recente para a mais antiga; no mesmo instante, maior id primeiro; filtro por clube', async () => {
      const { aguias, delta } = await officialScenario();
      const gama = await createClub('Gama SC', 'GAM');
      const first = (await play({ home_club_id: aguias, away_club_id: delta })).body.id;
      const second = (await play({ home_club_id: delta, away_club_id: aguias })).body.id;
      clock.setBrasilia('2026-11-11T09:00-03:00');
      const older = (await play({ home_club_id: aguias, away_club_id: delta })).body.id;

      const all = await http().get('/api/v1/matches');
      expect(all.status).toBe(200);
      expect((all.body as { id: number }[]).map((match) => match.id)).toEqual([
        second,
        first,
        older,
      ]);
      expect(all.body[0]).not.toHaveProperty('duels');
      expect((await http().get(`/api/v1/matches?club_id=${delta}`)).body).toHaveLength(3);
      expect((await http().get(`/api/v1/matches?club_id=${gama}`)).body).toEqual([]);
      expectError(await http().get('/api/v1/matches?club_id=999'), 404);
      expectError(await http().get('/api/v1/matches?club_id=abc'), 400);
      expectError(await http().get('/api/v1/matches/999'), 404);
      const detail = await http().get(`/api/v1/matches/${first}`);
      expect((detail.body as { duels: DuelBody[] }).duels.map((duel) => duel.order)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
    });

    it('classificação: todos os clubes, zerados antes de jogar; depois, o exemplo 2.4.3', async () => {
      const { aguias, delta } = await officialScenario();
      const gama = await createClub('Gama SC', 'GAM');

      const before = await http().get('/api/v1/standings');
      expect(before.status).toBe(200);
      expect((before.body as { club_name: string }[]).map((row) => row.club_name)).toEqual([
        'Águias FC',
        'Delta FC',
        'Gama SC',
      ]);

      await play({ home_club_id: aguias, away_club_id: delta });

      expect((await http().get('/api/v1/standings')).body).toEqual([
        {
          position: 1,
          club_id: delta,
          club_name: 'Delta FC',
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          goals_for: 2,
          goals_against: 1,
          goal_difference: 1,
          points: 3,
        },
        {
          position: 2,
          club_id: gama,
          club_name: 'Gama SC',
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        },
        {
          position: 3,
          club_id: aguias,
          club_name: 'Águias FC',
          played: 1,
          wins: 0,
          draws: 0,
          losses: 1,
          goals_for: 1,
          goals_against: 2,
          goal_difference: -1,
          points: 0,
        },
      ]);
    });

    it('sem clubes: classificação e histórico vazios', async () => {
      expect((await http().get('/api/v1/standings')).body).toEqual([]);
      expect((await http().get('/api/v1/matches')).body).toEqual([]);
    });
  });
});
