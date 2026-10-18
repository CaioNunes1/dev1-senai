import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './test-app';
import { resetTestDatabase } from './test-database';

/** 22 clubes válidos e distintos: "Clube Alfa" → CAL, "Clube Bravo" → CBR... */
const PHONETIC_WORDS = [
  'Alfa',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliett',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
];
const validClub = (index: number) => {
  const word = PHONETIC_WORDS[index];
  return { name: `Clube ${word}`, acronym: `C${word.slice(0, 2).toUpperCase()}` };
};

describe('POST /api/v1/clubs (e2e)', () => {
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

  const createClub = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/clubs')
      .send(body as object);

  const expectRefused = async (response: request.Response, status: number, clubsAfter = 0) => {
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toBe('');
    expect(await prisma.club.count()).toBe(clubsAfter);
  };

  describe('cadastro válido', () => {
    it('responde 201 com Location e os campos mínimos, com caixa de 300,00', async () => {
      const response = await createClub({ name: 'Águias FC', acronym: 'AGU' });

      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.headers.location).toBe('/api/v1/clubs/1');
      expect(response.body).toEqual({
        id: 1,
        name: 'Águias FC',
        acronym: 'AGU',
        cash: 300,
        squad_value: 0,
        net_worth: 300,
      });
    });

    it('grava o clube com caixa 300.00, sem formação e sem jogadores', async () => {
      await createClub({ name: 'Águias FC', acronym: 'AGU' });

      const club = await prisma.club.findUniqueOrThrow({
        where: { id: 1 },
        include: { players: true, lineupSlots: true },
      });
      expect(club.cash.toFixed(2)).toBe('300.00');
      expect(club.formation).toBeNull();
      expect(club.normalizedName).toBe('águias fc');
      expect(club.players).toHaveLength(0);
      expect(club.lineupSlots).toHaveLength(0);
    });

    it('normaliza os espaços do nome antes de gravar (V4)', async () => {
      const response = await createClub({ name: '  Águias   FC ', acronym: 'AGU' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Águias FC');
    });

    it.each([
      ['Tubarões do Norte', 'TDN', 'sigla com letras não consecutivas'],
      ['Mangue FC', 'MNG', 'letras salteadas na mesma palavra'],
      ['Ébano FC', 'EBF', 'primeira letra acentuada'],
      ['Çaçula Futebol Clube', 'CCF', 'cedilha equivale a c'],
      ['Ébano-Clube S.A.', 'ECS', 'hífen e ponto no nome'],
    ])('aceita "%s" com a sigla %s (%s)', async (name, acronym) => {
      const response = await createClub({ name, acronym });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name, acronym, cash: 300 });
    });

    it('ignora campos controlados pelo sistema e desconhecidos (V7)', async () => {
      const response = await createClub({
        name: 'Águias FC',
        acronym: 'AGU',
        id: 99,
        cash: 1000000,
        squad_value: 5,
        net_worth: 5,
        formation: '2-2',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        name: 'Águias FC',
        acronym: 'AGU',
        cash: 300,
        squad_value: 0,
        net_worth: 300,
      });
      const club = await prisma.club.findUniqueOrThrow({ where: { id: 1 } });
      expect(club.formation).toBeNull();
    });
  });

  describe('recusas de formato (400), sem gravar nada', () => {
    it.each([
      ['nome ausente', { acronym: 'AGU' }],
      ['nome nulo', { name: null, acronym: 'AGU' }],
      ['nome vazio', { name: '', acronym: 'AGU' }],
      ['nome só com espaços', { name: '   ', acronym: 'AGU' }],
      ['nome numérico', { name: 123, acronym: 'AGU' }],
      ['nome com menos de 3 caracteres', { name: 'Ab', acronym: 'ABB' }],
      ['nome com 61 caracteres', { name: `${'A'.repeat(30)} ${'B'.repeat(30)}`, acronym: 'ABB' }],
      ['nome com 1 palavra', { name: 'Águias', acronym: 'AGU' }],
      ['nome com 6 palavras', { name: 'Clube Atlético Recreativo Unido da Serra', acronym: 'CAR' }],
      ['nome com dígito', { name: 'Águias FC 2', acronym: 'AGU' }],
      ['nome com símbolo', { name: 'Águias & FC', acronym: 'AGU' }],
      ['nome com tabulação', { name: 'Águias\tFC', acronym: 'AGU' }],
      ['nome com quebra de linha', { name: 'Águias\nFC', acronym: 'AGU' }],
      ['sigla ausente', { name: 'Águias FC' }],
      ['sigla nula', { name: 'Águias FC', acronym: null }],
      ['sigla numérica', { name: 'Águias FC', acronym: 123 }],
      ['sigla com 2 letras', { name: 'Águias FC', acronym: 'AG' }],
      ['sigla com 4 letras', { name: 'Águias FC', acronym: 'AGUA' }],
      ['sigla em minúsculas', { name: 'Águias FC', acronym: 'agu' }],
      ['sigla com número', { name: 'Águias FC', acronym: 'AG1' }],
      ['sigla acentuada', { name: 'Águias FC', acronym: 'ÁGU' }],
      ['sigla que não corresponde ao nome', { name: 'Águias FC', acronym: 'XYZ' }],
      ['sigla que não começa pela primeira letra', { name: 'Águias FC', acronym: 'GFC' }],
      ['sigla com três letras iguais', { name: 'Arara Azul', acronym: 'AAA' }],
    ])('%s', async (_description, body) => {
      await expectRefused(await createClub(body), 400);
    });

    it.each([
      ['array', '[]'],
      ['texto', '"Águias FC"'],
      ['JSON malformado', '{"name": "Águias FC",'],
    ])('corpo que não é objeto: %s', async (_description, rawBody) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/clubs')
        .set('Content-Type', 'application/json')
        .send(rawBody);
      await expectRefused(response, 400);
    });
  });

  describe('regras de negócio (409)', () => {
    beforeEach(async () => {
      expect((await createClub({ name: 'Águias FC', acronym: 'AGU' })).status).toBe(201);
    });

    it('recusa o mesmo nome com maiúsculas e espaços diferentes', async () => {
      await expectRefused(await createClub({ name: '  águias   fc ', acronym: 'AGF' }), 409, 1);
    });

    it('aceita o nome sem acento, que é outro nome, com outra sigla', async () => {
      const response = await createClub({ name: 'Aguias FC', acronym: 'AGI' });
      expect(response.status).toBe(201);
      expect(await prisma.club.count()).toBe(2);
    });

    it('recusa sigla já cadastrada', async () => {
      await expectRefused(await createClub({ name: 'Aguias Unidas', acronym: 'AGU' }), 409, 1);
    });
  });

  describe('limite de 20 clubes (409)', () => {
    it('aceita o 20º clube e recusa o 21º, sem gravar', async () => {
      for (let index = 0; index < 20; index += 1) {
        expect((await createClub(validClub(index))).status).toBe(201);
      }
      await expectRefused(await createClub(validClub(20)), 409, 20);
    });
  });

  describe('pedidos simultâneos', () => {
    it('com o mesmo nome, grava um só clube', async () => {
      const responses = await Promise.all([
        createClub({ name: 'Águias FC', acronym: 'AGU' }),
        createClub({ name: 'águias fc', acronym: 'AGF' }),
        createClub({ name: 'ÁGUIAS FC', acronym: 'AFC' }),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409]);
      expect(await prisma.club.count()).toBe(1);
    });

    it('perto do limite, não passa de 20 clubes', async () => {
      for (let index = 0; index < 18; index += 1) {
        expect((await createClub(validClub(index))).status).toBe(201);
      }
      const responses = await Promise.all(
        [18, 19, 20, 21].map((index) => createClub(validClub(index))),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([201, 201, 409, 409]);
      expect(await prisma.club.count()).toBe(20);
    });
  });
});
