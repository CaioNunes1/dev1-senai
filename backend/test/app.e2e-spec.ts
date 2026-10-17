import { Body, Controller, Get, INestApplication, Param, Post, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsIn, IsInt } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { BusinessRuleError } from '../src/common/errors/domain-errors';
import { ParseIdPipe } from '../src/common/http/parse-id.pipe';

class ProbeDto {
  @IsInt({ message: 'age deve ser um número inteiro.' })
  age: number;

  @IsIn(['GOL', 'ATA'], { message: 'position deve ser GOL ou ATA.' })
  position: string;
}

/** Controller usado só neste teste para exercitar o pipeline transversal da API. */
@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): { id: number } {
    return { id };
  }

  @Get('query/echo')
  echoQuery(@Query('free') free: boolean): { free: unknown } {
    return { free };
  }

  @Post('conflict')
  conflict(): never {
    throw new BusinessRuleError('Regra violada.');
  }

  @Get('failure/unexpected')
  fail(): never {
    throw new Error('detalhe interno que não pode vazar');
  }
}

describe('Fundação da API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function expectJsonError(response: request.Response, status: number): void {
    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toBe('');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|at .*\.ts/);
  }

  describe('prefixo /api/v1', () => {
    it('atende rotas sob o prefixo', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/probe/7');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 7 });
    });

    it('não atende rotas fora do prefixo', async () => {
      expectJsonError(await request(app.getHttpServer()).get('/probe/7'), 404);
    });

    it('responde 404 em JSON para caminho inexistente', async () => {
      expectJsonError(await request(app.getHttpServer()).get('/api/v1/inexistente'), 404);
    });
  });

  describe('V8: id na URL', () => {
    it.each(['abc', '0', '-1', '1.5', '01', '2147483648'])(
      'trata "%s" como inexistente',
      async (id) => {
        expectJsonError(await request(app.getHttpServer()).get(`/api/v1/probe/${id}`), 404);
      },
    );
  });

  it('entrega query params como texto, sem conversão implícita (V5)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/probe/query/echo?free=TRUE');
    expect(response.body).toEqual({ free: 'TRUE' });
  });

  describe('V1: corpo da requisição', () => {
    const post = () =>
      request(app.getHttpServer()).post('/api/v1/probe').set('Content-Type', 'application/json');

    it('recusa JSON malformado com 400, sem expor a mensagem do parser', async () => {
      const response = await post().send('{"age": 20,');
      expectJsonError(response, 400);
      expect(response.body.message).not.toMatch(/Unexpected|JSON at position/);
    });

    it.each([
      ['array', '[]'],
      ['texto', '"x"'],
      ['número', '10'],
      ['nulo', 'null'],
    ])('recusa corpo %s com 400', async (_description, body) => {
      expectJsonError(await post().send(body), 400);
    });

    it('recusa pedido sem corpo com 400', async () => {
      expectJsonError(await request(app.getHttpServer()).post('/api/v1/probe'), 400);
    });
  });

  describe('validação declarativa (V2, V5, V6, V7)', () => {
    const post = (body: object) => request(app.getHttpServer()).post('/api/v1/probe').send(body);

    it('aceita corpo válido e ignora campos desconhecidos', async () => {
      const response = await post({ age: 20, position: 'GOL', cash: 999, Age: 1 });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ age: 20, position: 'GOL' });
    });

    it('devolve message como texto, não como lista', async () => {
      const response = await post({ age: 'x', position: 'GOL' });
      expectJsonError(response, 400);
      expect(response.body.message).toBe('age deve ser um número inteiro.');
    });

    it.each([
      ['número enviado como texto', { age: '15', position: 'GOL' }],
      ['inteiro com parte fracionária', { age: 50.5, position: 'GOL' }],
      ['valor de lista em minúsculas', { age: 20, position: 'gol' }],
      ['campo obrigatório nulo', { age: null, position: 'GOL' }],
      ['campo obrigatório ausente', { position: 'GOL' }],
    ])('recusa %s com 400', async (_description, body) => {
      expectJsonError(await post(body), 400);
    });
  });

  describe('tratamento central de erros', () => {
    it('converte regra de negócio em 409', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/probe/conflict');
      expectJsonError(response, 409);
      expect(response.body.message).toBe('Regra violada.');
    });

    it('responde 500 sem expor detalhes internos', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/probe/failure/unexpected');
      expectJsonError(response, 500);
      expect(response.body.message).not.toContain('detalhe interno');
    });
  });

  describe('CORS', () => {
    it('libera a origem configurada', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/probe/1')
        .set('Origin', 'http://localhost:5173');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('não libera outras origens', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/probe/1')
        .set('Origin', 'http://malicioso.example');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  it('publica a documentação interativa', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
  });
});
