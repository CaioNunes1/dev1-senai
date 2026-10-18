import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './test-app';
import { resetTestDatabase } from './test-database';

type Body = Record<string, unknown>;

/** "Meia Lua" dos exemplos oficiais (README › 2.1.3). */
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

/** Resposta oficial do cadastro do Meia Lua (base 40,00; overall 75), com o id deste banco. */
const MEIA_LUA_RESPONSE = {
  id: 1,
  ...MEIA_LUA,
  condition: 'APTO',
  base_value: 40,
  market_value: 40,
  overall: 75,
  club_id: null,
};

/**
 * Jogador com os seis atributos iguais a `overall` (os pesos somam 100, então o overall
 * é esse valor em qualquer posição) e potencial igual ao maior atributo.
 */
function playerBody(
  name: string,
  position: string,
  age: number,
  overall: number,
  extra: Body = {},
) {
  return {
    name,
    position,
    age,
    agility: 50,
    pace: overall,
    shooting: overall,
    passing: overall,
    dribbling: overall,
    defending: overall,
    physical: overall,
    potential: overall,
    ...extra,
  };
}

describe('Jogadores (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const createPlayer = (body: Body) => http().post('/api/v1/players').send(body);
  const createdId = async (body: Body): Promise<number> => {
    const response = await createPlayer(body);
    expect(response.status).toBe(201);
    return response.body.id as number;
  };
  const changeCondition = (id: number | string, condition: unknown) =>
    http().patch(`/api/v1/players/${id}/condition`).send({ condition });
  const updatePlayer = (id: number | string, body: Body) =>
    http().put(`/api/v1/players/${id}`).send(body);

  /** Põe o jogador num clube direto no banco (a compra ainda não existe; RN12 vem depois). */
  async function placeInClub(playerId: number): Promise<number> {
    const club = await http().post('/api/v1/clubs').send({ name: 'Águias FC', acronym: 'AGU' });
    await prisma.player.update({
      where: { id: playerId },
      data: { clubId: club.body.id as number },
    });
    return club.body.id as number;
  }

  function expectError(response: request.Response, status: number): void {
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toBe('');
  }

  describe('POST /players (RN06, V1–V7)', () => {
    it('cadastra o Meia Lua do exemplo oficial: 201, Location e valores calculados', async () => {
      const response = await createPlayer(MEIA_LUA);

      expect(response.status).toBe(201);
      expect(response.headers.location).toBe('/api/v1/players/1');
      expect(response.body).toEqual(MEIA_LUA_RESPONSE);
      const stored = await prisma.player.findUniqueOrThrow({ where: { id: 1 } });
      expect(stored.baseValue.toFixed(2)).toBe('40.00');
    });

    it('ignora campos calculados, controlados e desconhecidos (V7)', async () => {
      const response = await createPlayer({
        ...MEIA_LUA,
        id: 50,
        base_value: 999,
        market_value: 999,
        overall: 1,
        condition: 'DOENTE',
        club_id: 1,
        cash: 10,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(MEIA_LUA_RESPONSE);
    });

    it('aceita inteiro escrito como 85.0 (V2)', async () => {
      const raw = JSON.stringify(MEIA_LUA).replace('"agility":85', '"agility":85.0');
      const response = await http()
        .post('/api/v1/players')
        .set('Content-Type', 'application/json')
        .send(raw);

      expect(response.status).toBe(201);
      expect(response.body.agility).toBe(85);
    });

    it('normaliza os espaços do nome (V4)', async () => {
      const response = await createPlayer({ ...MEIA_LUA, name: '  Meia   Lua ' });
      expect(response.body.name).toBe('Meia Lua');
    });

    it('jovem promessa: overall 45, potencial 90, 18 anos → base 3,63 e mercado 3,99', async () => {
      // base: 5 × 0,50 = 2,50 × 145 ÷ 100 = 3,625 → 3,63; mercado: 3,63 × 1,10 = 3,993 → 3,99
      const response = await createPlayer(
        playerBody('Novo Talento', 'MEI', 18, 45, { potential: 90 }),
      );
      expect(response.body).toMatchObject({ overall: 45, base_value: 3.63, market_value: 3.99 });
    });

    it('33 anos com potencial igual ao maior atributo: base 46,00 e mercado 41,40', async () => {
      const response = await createPlayer(playerBody('Veterano Firme', 'GOL', 33, 76));
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ overall: 76, base_value: 46, market_value: 41.4 });
    });

    it.each<[string, Body]>([
      ['nome ausente', { name: undefined }],
      ['nome nulo', { name: null }],
      ['nome com uma palavra', { name: 'Meia' }],
      ['nome com dígito', { name: 'Meia Lua 2' }],
      ['nome com 2 caracteres', { name: 'Ab' }],
      ['nome com tabulação', { name: 'Meia\tLua' }],
      ['nome com 101 caracteres', { name: `${'a'.repeat(50)} ${'b'.repeat(50)}` }],
      ['posição em minúsculas', { position: 'mei' }],
      ['posição desconhecida', { position: 'PIV' }],
      ['agilidade como texto', { agility: '85' }],
      ['agilidade fracionária', { agility: 50.5 }],
      ['agilidade 0', { agility: 0 }],
      ['agilidade 101', { agility: 101 }],
      ['agilidade 86 com 35 anos', { agility: 86, age: 35, potential: 82 }],
      ['idade 15', { age: 15 }],
      ['idade 46', { age: 46 }],
      ['atributo 0', { pace: 0 }],
      ['atributo 100', { pace: 100 }],
      ['atributo nulo', { pace: null }],
      [
        'soma dos atributos 481',
        {
          pace: 99,
          shooting: 99,
          passing: 99,
          dribbling: 99,
          defending: 84,
          physical: 1,
          potential: 99,
        },
      ],
      ['potencial menor que o maior atributo', { potential: 81 }],
      ['potencial maior que o maior atributo com 33 anos', { age: 33, potential: 86 }],
      ['campo em outro formato (Agility)', { agility: undefined, Agility: 85 }],
    ])('recusa %s com 400, sem gravar', async (_description, change) => {
      expectError(await createPlayer({ ...MEIA_LUA, ...change }), 400);
      expect(await prisma.player.count()).toBe(0);
    });

    it('aceita a soma exatamente 480 e agilidade 85 com 35 anos', async () => {
      const response = await createPlayer({
        ...MEIA_LUA,
        age: 35,
        agility: 85,
        pace: 99,
        shooting: 99,
        passing: 99,
        dribbling: 99,
        defending: 83,
        physical: 1,
        potential: 99,
      });
      expect(response.status).toBe(201);
    });

    it.each([
      ['array', '[]'],
      ['número', '10'],
      ['JSON malformado', '{"name":'],
    ])('recusa corpo %s com 400', async (_description, raw) => {
      const response = await http()
        .post('/api/v1/players')
        .set('Content-Type', 'application/json')
        .send(raw);
      expectError(response, 400);
    });
  });

  describe('GET /players/{id}', () => {
    it('devolve o jogador com overall e valor de mercado do momento', async () => {
      await createPlayer(MEIA_LUA);
      const response = await http().get('/api/v1/players/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(MEIA_LUA_RESPONSE);
    });

    it.each(['999', 'abc', '0', '01'])('id %s → 404', async (id) => {
      expectError(await http().get(`/api/v1/players/${id}`), 404);
    });
  });

  describe('PATCH /players/{id}/condition', () => {
    it('MAL_CONDICIONADO muda o valor de mercado para 37,00 (exemplo oficial)', async () => {
      const id = await createdId(MEIA_LUA);
      const response = await changeCondition(id, 'MAL_CONDICIONADO');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        condition: 'MAL_CONDICIONADO',
        base_value: 40,
        market_value: 37,
      });
    });

    it('de DOENTE direto para APTO → 409, sem mudar', async () => {
      const id = await createdId(MEIA_LUA);
      await changeCondition(id, 'DOENTE');

      expectError(await changeCondition(id, 'APTO'), 409);
      expect((await http().get(`/api/v1/players/${id}`)).body.condition).toBe('DOENTE');
    });

    it('de DOENTE para MAL_CONDICIONADO e depois para APTO é aceito', async () => {
      const id = await createdId(MEIA_LUA);
      await changeCondition(id, 'DOENTE');

      expect((await changeCondition(id, 'MAL_CONDICIONADO')).status).toBe(200);
      expect((await changeCondition(id, 'APTO')).body.condition).toBe('APTO');
    });

    it('enviar a condição atual é aceito, sem mudança', async () => {
      const id = await createdId(MEIA_LUA);
      const response = await changeCondition(id, 'APTO');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(MEIA_LUA_RESPONSE);
    });

    it('ignora outros campos do corpo (V7)', async () => {
      const id = await createdId(MEIA_LUA);
      const response = await http()
        .patch(`/api/v1/players/${id}/condition`)
        .send({ condition: 'MAL_CONDICIONADO', name: 'Outro Nome', age: 40 });

      expect(response.body).toMatchObject({ name: 'Meia Lua', age: 25 });
    });

    it.each([
      ['minúsculas', 'apto'],
      ['fora da lista', 'LESIONADO'],
      ['nula', null],
      ['ausente', undefined],
    ])('condição %s → 400', async (_description, condition) => {
      const id = await createdId(MEIA_LUA);
      expectError(await changeCondition(id, condition), 400);
    });

    it('jogador inexistente → 404', async () => {
      expectError(await changeCondition(999, 'APTO'), 404);
    });

    it('quem passa a DOENTE sai da escalação; a formação continua (RN19)', async () => {
      const id = await createdId(MEIA_LUA);
      const clubId = await placeInClub(id);
      await prisma.club.update({ where: { id: clubId }, data: { formation: '2-1-1' } });
      await prisma.lineupSlot.create({ data: { clubId, playerId: id } });

      await changeCondition(id, 'MAL_CONDICIONADO');
      expect(await prisma.lineupSlot.count()).toBe(1);

      expect((await changeCondition(id, 'DOENTE')).status).toBe(200);
      expect(await prisma.lineupSlot.count()).toBe(0);
      const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
      expect(club.formation).toBe('2-1-1');
    });
  });

  describe('PUT /players/{id} (RN08)', () => {
    const daviMelo = playerBody('Davi Melo', 'ZAG', 22, 70);

    it('edita nome, posição, agilidade e idade; valor base e indicadores não mudam', async () => {
      const id = await createdId(daviMelo);
      const response = await updatePlayer(id, {
        name: 'Davi Melo',
        position: 'MEI',
        agility: 70,
        age: 23,
        pace: 1,
        potential: 99,
        base_value: 1,
        condition: 'DOENTE',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        position: 'MEI',
        agility: 70,
        age: 23,
        condition: 'APTO',
        pace: 70,
        potential: 70,
        base_value: 30,
        overall: 70,
        club_id: null,
      });
    });

    it('o valor base continua o do cadastro quando a idade muda (RN06)', async () => {
      const id = await createdId(playerBody('Ana Lima', 'ATA', 21, 70, { potential: 84 }));
      expect((await http().get(`/api/v1/players/${id}`)).body.base_value).toBe(34.2);

      const response = await updatePlayer(id, {
        name: 'Ana Lima',
        position: 'ATA',
        agility: 50,
        age: 22,
      });
      // base 34,20 gravado no cadastro (jovem promessa); com 22 anos, sem o +10% da RN04
      expect(response.body).toMatchObject({ base_value: 34.2, market_value: 34.2 });
    });

    it('idade menor que a atual → 409, sem gravar', async () => {
      const id = await createdId(daviMelo);
      expectError(
        await updatePlayer(id, { name: 'Davi Melo', position: 'ZAG', agility: 60, age: 21 }),
        409,
      );
      expect((await http().get(`/api/v1/players/${id}`)).body).toMatchObject({
        age: 22,
        agility: 50,
      });
    });

    it('jogador com clube não muda de posição (409), mas pode manter a mesma', async () => {
      const id = await createdId(daviMelo);
      await placeInClub(id);

      expectError(
        await updatePlayer(id, { name: 'Davi Melo', position: 'MEI', agility: 60, age: 22 }),
        409,
      );
      const samePosition = await updatePlayer(id, {
        name: 'Davi Melo Filho',
        position: 'ZAG',
        agility: 60,
        age: 22,
      });
      expect(samePosition.status).toBe(200);
      expect(samePosition.body).toMatchObject({ name: 'Davi Melo Filho', club_id: 1 });
    });

    it.each<[string, Body]>([
      ['sem a idade', { name: 'Davi Melo', position: 'ZAG', agility: 60 }],
      ['nome inválido', { name: 'Davi', position: 'ZAG', agility: 60, age: 23 }],
      ['agilidade 90 com 36 anos', { name: 'Davi Melo', position: 'ZAG', agility: 90, age: 36 }],
    ])('%s → 400', async (_description, body) => {
      const id = await createdId(daviMelo);
      expectError(await updatePlayer(id, body), 400);
    });

    it('jogador inexistente → 404', async () => {
      expectError(
        await updatePlayer(999, { name: 'Davi Melo', position: 'ZAG', agility: 60, age: 23 }),
        404,
      );
    });
  });

  describe('DELETE /players/{id} (RN09)', () => {
    it('exclui logicamente o jogador livre: 204 sem corpo, e ele passa a inexistente', async () => {
      const id = await createdId(MEIA_LUA);
      const response = await http().delete(`/api/v1/players/${id}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expectError(await http().get(`/api/v1/players/${id}`), 404);
      expectError(
        await updatePlayer(id, { name: 'Meia Lua', position: 'MEI', agility: 85, age: 25 }),
        404,
      );
      expectError(await changeCondition(id, 'DOENTE'), 404);
      expectError(await http().delete(`/api/v1/players/${id}`), 404);
      expect((await http().get('/api/v1/players')).body.meta.total_items).toBe(0);

      const stored = await prisma.player.findUniqueOrThrow({ where: { id } });
      expect(stored.deletedAt).toBeInstanceOf(Date);
    });

    it('jogador num clube → 409, e continua ativo', async () => {
      const id = await createdId(MEIA_LUA);
      await placeInClub(id);

      expectError(await http().delete(`/api/v1/players/${id}`), 409);
      expect((await http().get(`/api/v1/players/${id}`)).status).toBe(200);
    });

    it('jogador inexistente → 404', async () => {
      expectError(await http().delete('/api/v1/players/999'), 404);
    });
  });

  describe('GET /players (RN07)', () => {
    const list = (query = '') => http().get(`/api/v1/players${query}`);
    const names = async (query = '') =>
      ((await list(query)).body.data as { name: string }[]).map((player) => player.name);

    it('sem jogadores: 200 com data vazio e meta zerado', async () => {
      const response = await list();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: [],
        meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 },
      });
    });

    describe('com o elenco de exemplo', () => {
      // criados em ordem que contraria o nome nos empates (Meia antes de João; Gama antes de Delta),
      // para que o desempate pelo nome (e não pelo id) seja de fato verificado.
      // valores de mercado: João 30,00; Meia 40,00; Ana Lima 11,00 (19 anos);
      // Ana-Maria 41,40 (33 anos); Épsilon 100,00; Delta 12,00; Gama 12,00
      beforeEach(async () => {
        await createdId(playerBody('Meia Lua', 'MEI', 25, 75));
        await createdId(playerBody('João Silva', 'MEI', 25, 70));
        await createdId(playerBody('Ana Lima', 'ATA', 19, 60));
        await createdId(playerBody('Ana-Maria Souza', 'GOL', 33, 76));
        await createdId(playerBody('Épsilon Rocha', 'ZAG', 28, 85, { shooting: 1, dribbling: 1 }));
        await createdId(playerBody('Gama Reis', 'ZAG', 22, 61));
        await createdId(playerBody('Delta Costa', 'LAT', 30, 61));
      });

      it('ordena pelo nome por padrão, com itens no formato de GET /players/{id}', async () => {
        const response = await list();

        expect(response.body.meta).toEqual({ page: 1, limit: 10, total_items: 7, total_pages: 1 });
        expect(await names()).toEqual([
          'Ana Lima',
          'Ana-Maria Souza',
          'Delta Costa',
          'Épsilon Rocha',
          'Gama Reis',
          'João Silva',
          'Meia Lua',
        ]);
        expect(response.body.data[1]).toMatchObject({
          id: 4,
          overall: 76,
          base_value: 46,
          market_value: 41.4,
          club_id: null,
        });
      });

      it.each([
        [
          'value_desc',
          [
            'Épsilon Rocha',
            'Ana-Maria Souza',
            'Meia Lua',
            'João Silva',
            'Delta Costa',
            'Gama Reis',
            'Ana Lima',
          ],
        ],
        [
          'value_asc',
          [
            'Ana Lima',
            'Delta Costa',
            'Gama Reis',
            'João Silva',
            'Meia Lua',
            'Ana-Maria Souza',
            'Épsilon Rocha',
          ],
        ],
        [
          'age_asc',
          [
            'Ana Lima',
            'Gama Reis',
            'João Silva',
            'Meia Lua',
            'Épsilon Rocha',
            'Delta Costa',
            'Ana-Maria Souza',
          ],
        ],
        [
          'position',
          [
            'Ana-Maria Souza',
            'Épsilon Rocha',
            'Gama Reis',
            'Delta Costa',
            'João Silva',
            'Meia Lua',
            'Ana Lima',
          ],
        ],
        [
          'position,value_asc',
          [
            'Ana-Maria Souza',
            'Gama Reis',
            'Épsilon Rocha',
            'Delta Costa',
            'João Silva',
            'Meia Lua',
            'Ana Lima',
          ],
        ],
      ])('sort=%s', async (sort, expected) => {
        expect(await names(`?sort=${sort}`)).toEqual(expected);
      });

      it.each([
        ['?search=joao', ['João Silva']],
        ['?search=LUA', ['Meia Lua']],
        ['?search=%20%20ana%20', ['Ana Lima', 'Ana-Maria Souza']],
        ['?position=ZAG', ['Épsilon Rocha', 'Gama Reis']],
        ['?min_value=12&max_value=40', ['Delta Costa', 'Gama Reis', 'João Silva', 'Meia Lua']],
        ['?min_age=25&max_age=30', ['Delta Costa', 'Épsilon Rocha', 'João Silva', 'Meia Lua']],
        ['?min_age=30', ['Ana-Maria Souza', 'Delta Costa']],
        ['?position=MEI&min_value=35&sort=value_desc', ['Meia Lua']],
        ['?free=true&max_age=19', ['Ana Lima']],
        ['?free=false', []],
      ])('filtra %s', async (query, expected) => {
        expect(await names(query)).toEqual(expected);
      });

      it('filtro por condição e valor de mercado usam a condição atual', async () => {
        await changeCondition(7, 'MAL_CONDICIONADO');
        // Delta: 12,00 × 0,85 = 10,20
        expect(await names('?condition=MAL_CONDICIONADO')).toEqual(['Delta Costa']);
        expect(await names('?max_value=10.2')).toEqual(['Delta Costa']);
      });

      it('filtros de clube: club_id, free=false e free=false com club_id', async () => {
        const clubId = await placeInClub(6);

        expect(await names(`?club_id=${clubId}`)).toEqual(['Gama Reis']);
        expect(await names('?free=false')).toEqual(['Gama Reis']);
        expect(await names(`?free=false&club_id=${clubId}`)).toEqual(['Gama Reis']);
        expect(await names('?free=true')).not.toContain('Gama Reis');
        expect((await list(`?club_id=${clubId}`)).body.data[0].club_id).toBe(clubId);
      });

      it('jogador excluído não aparece', async () => {
        await http().delete('/api/v1/players/2');
        expect(await names()).not.toContain('João Silva');
      });

      it.each([
        '?position=mei',
        '?position=',
        '?sort=POSITION',
        '?sort=value_asc,value_desc',
        '?sort=name,%20age_asc',
        '?search=a',
        '?search=%20%20',
        '?free=TRUE',
        '?free=true&club_id=1',
        '?club_id=abc',
        '?page=0',
        '?limit=51',
        '?min_age=30&max_age=20',
        '?min_value=1,5',
        '?min_value=20&max_value=10',
      ])('%s → 400', async (query) => {
        expectError(await list(query), 400);
      });

      it('club_id de clube inexistente → 404', async () => {
        expectError(await list('?club_id=999'), 404);
      });
    });

    describe('paginação (tabela oficial com 23 jogadores)', () => {
      beforeEach(async () => {
        for (let index = 0; index < 23; index += 1) {
          await createdId(playerBody(`Jogador ${String.fromCharCode(65 + index)}`, 'MEI', 25, 60));
        }
      });

      it.each([
        [10, 1, 10, 'Jogador A', 3],
        [10, 3, 3, 'Jogador U', 3],
        [10, 4, 0, undefined, 3],
        [50, 1, 23, 'Jogador A', 1],
      ])('limit %i, page %i → %i itens', async (limit, page, items, first, totalPages) => {
        const response = await list(`?limit=${limit}&page=${page}`);

        expect(response.body.data).toHaveLength(items);
        expect(response.body.data[0]?.name).toBe(first);
        expect(response.body.meta).toEqual({
          page,
          limit,
          total_items: 23,
          total_pages: totalPages,
        });
      });

      it('padrão de 10 por página', async () => {
        expect((await list()).body.meta).toEqual({
          page: 1,
          limit: 10,
          total_items: 23,
          total_pages: 3,
        });
      });
    });
  });
});
