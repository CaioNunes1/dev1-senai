# Decisões arquiteturais (ADRs)

Formato curto: contexto → decisão → alternativas → consequências. Status: **Proposta** (aguarda aprovação), **Aceita**, **Substituída**.

---

## ADR-001 — Stack: NestJS + Prisma + PostgreSQL / React + Vite

- **Status:** Aceita (15/10/2026)
- **Contexto:** a stack precisa estar na lista do regulamento (item 3.4); tecnologia fora dela elimina. A ficha-exemplo usa exatamente Nest 11 + Prisma + Postgres 16 + React/Vite, o que confirma a aceitação.
- **Decisão:** Node.js 22 LTS, NestJS, Prisma, PostgreSQL 16; React + Vite (`react-ts`), Tailwind v4, React Router no modo declarativo.
- **Alternativas:** Express/Fastify puro (menos estrutura para validação/DI/Swagger); TypeORM (decorators acoplam entidade e banco; migrations menos previsíveis); Next.js (risco de eliminação se Route Handlers calcularem algo).
- **Versões fixadas na Etapa 1** (conferidas com `npm view` em 15/10/2026):

  | Pacote | Escolhida | Mais recente | Motivo |
  | --- | --- | --- | --- |
  | NestJS | 11.2 | 12.1 | o Nest 12 passou a ser ESM (`"type": "module"`); a linha 11 é madura, CommonJS e é a da ficha-exemplo |
  | TypeScript | 5.9 | 7.0 | o `ts-jest` 29 exige TypeScript `<7` |
  | Prisma | 6.19 | 8.0 (RC) | o 8 está em release candidate; o 7 exige driver adapter e mudou a geração do client |
  | ESLint | 9.39 | 10.x | compatível com `typescript-eslint` 8 e `@eslint/js` 9 |
  | Jest | 30.5 + ts-jest 29.4 | — | combinação suportada pelo peer do `ts-jest` |

- **Consequências:** `npm audit` aponta 5 vulnerabilidades em dependências de produção (3 altas em `deepmerge-ts` via `@prisma/config`; 2 moderadas em `js-yaml` via `@nestjs/swagger`). A correção exige versões major (Prisma 7, Swagger 12/Nest 12). Ambas atuam sobre dados controlados pelo projeto (configuração da CLI do Prisma e geração do documento Swagger), não sobre entradas dos usuários da API → risco aceito e reavaliado na revisão final.

## ADR-002 — Dinheiro em centavos inteiros no domínio, NUMERIC no banco

- **Status:** Aceita (15/10/2026)
- **Contexto:** arredondamento meio-para-longe-do-zero, uma única vez, sobre produtos com percentuais fracionários (7,5%). `float` erra (`0.385 * 100`).
- **Decisão:** domínio usa `number` inteiro de centavos; percentuais como razões inteiras (ex.: 7,5% = 75/1000). Um único helper `divideRounded(numerator, denominator)` arredonda meio-para-longe-do-zero com aritmética inteira. Conversão Decimal↔centavos só na fronteira (mapper/service). Banco em `NUMERIC(p,2)`.
- **Alternativas:** `decimal.js` (exato, mas dependência extra e API verbosa no domínio); `Prisma.Decimal` no domínio (acopla domínio ao ORM); centavos também no banco (permitido, mas menos legível para o avaliador de B3 e diverge do tipo sugerido).
- **Consequências:** zero dependências para cálculo; todas as tabelas oficiais viram testes `it.each` exatos. Limite seguro: valores ≪ 2^53 (máx. real ≈ 10^7 centavos × 10^3).
- **Implementação (Etapa 3.1):**
  - `common/domain/rounding.ts` › `divideRoundingHalfAwayFromZero(n, d)`: quociente por resto inteiro (`%`) e subtração; arredonda para longe do zero quando `2 × resto ≥ d`. É o **único** ponto de arredondamento do backend (moeda e overall). Recusa operandos não inteiros, para que nenhum float entre por engano.
  - `common/domain/money.ts` › tipo `Cents` (alias de `number` inteiro), para deixar a unidade explícita nas assinaturas.
  - Percentuais do valor de mercado em **per mille** (15% = 150‰; 7,5% = 75‰): `valor = base × (1000 + total‰) ÷ 1000`, arredondado uma vez. Valor base e overall entram já arredondados nos cálculos seguintes, como manda o enunciado.
  - `Prisma.Decimal` não entra no domínio: a conversão `NUMERIC ↔ Cents` fica no mapper (Etapa 3.2), por exemplo `Number(decimal.toFixed(2).replace('.', ''))`, sem passar por multiplicação em float.

## ADR-003 — Validação com class-validator + exceptionFactory próprio

- **Status:** Aceita (15/10/2026)
- **Contexto:** V1–V7 são estritos (tipo exato, `null` recusado, campos extras ignorados, `message` texto). O barema exige "mecanismo declarado".
- **Decisão:** DTOs com `class-validator` (idiomático no Nest e integrado ao `@nestjs/swagger`, que gera a documentação a partir dos mesmos DTOs). `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: false`, `enableImplicitConversion: false` e `exceptionFactory` que devolve `{ message: string }`. Decorators próprios para V4 (normalização + controle) e regras cruzadas de 400. Query params com parsers/regex estritos reutilizáveis. `ParseIdPipe` próprio (inválido → 404).
- **Alternativas:** Zod + pipe customizado (mais expressivo para regras cruzadas, mas duplica a documentação Swagger ou exige `nestjs-zod`).
- **Consequências:** DTO é fonte única de validação + documentação.

## ADR-004 — Listagem de jogadores: filtros simples no banco, valor de mercado e ordenação na aplicação

- **Status:** Aceita (15/10/2026)
- **Contexto:** filtros/ordenação por valor de mercado (calculado, não gravado) e ordenação por nome normalizado (code point, sem acento) — ambos não mapeiam para SQL padrão nem para a collation do Postgres.
- **Decisão:** o banco filtra o que é coluna (excluído, posição, condição, clube/livre, idade); a aplicação calcula o valor de mercado com **a mesma função do domínio**, aplica busca normalizada, faixa de valor, ordenação e paginação.
- **Alternativas:** expressão SQL do valor de mercado + coluna de nome normalizado com `COLLATE "C"` (escala melhor, mas duplica a fórmula e a regra de normalização — o barema tolera, mas aumenta o risco de divergência).
- **Consequências:** volume esperado pequeno (≤ 20 clubes × 12 + livres; roteiro com dezenas/centenas de jogadores) → desempenho folgado frente ao limite de 10 s. Limite de escala documentado no README.

## ADR-005 — Services acessam o Prisma diretamente; sem camada de repositório genérica

- **Status:** Aceita (15/10/2026)
- **Contexto:** o barema pede que controllers não acessem o banco, não que exista repositório. Repositório genérico adiciona indireção sem ganho.
- **Decisão:** `PrismaService` injetado nos services; extrair `*.repository.ts` apenas para consultas complexas ou com SQL bruto parametrizado (locks).
- **Consequências:** menos arquivos; regras de cálculo continuam testáveis porque vivem em funções puras.

## ADR-006 — Unicidade do nome do clube via coluna normalizada

- **Status:** Aceita (15/10/2026)
- **Contexto:** RN10 — único ignorando maiúsculas, considerando acentos, garantido no banco.
- **Decisão:** coluna adicional `clubes.nome_normalizado` (= nome pós-V4 em minúsculas, acentos preservados) com `UNIQUE`, preenchida pela aplicação.
- **Alternativas:** índice de expressão `UNIQUE (lower(nome))` — mais "puro", mas não é representável no schema Prisma e o `migrate dev` tende a tentar removê-lo (drift); `citext` — ignora maiúsculas, mas depende de extensão.
- **Consequências:** modelo 100% declarado no schema Prisma; a banca sabe preencher a coluna normalizada (barema B3).

## ADR-007 — Atomicidade e concorrência nas operações financeiras

- **Status:** Aceita (15/10/2026; detalhar na etapa de compra)
- **Decisão:** `prisma.$transaction` interativa por operação; dentro dela, `SELECT … FOR UPDATE` (SQL parametrizado) em clube e jogador antes de validar caixa/elenco/estado.
- **Alternativas:** isolamento `Serializable` com retry (mais genérico, mais difícil de explicar); updates condicionais (`updateMany where clubId: null` + checar `count`) — boa opção para o jogador, mas não cobre o caixa.

## ADR-008 — Relógio injetável

- **Status:** Aceita (15/10/2026)
- **Decisão:** provider `Clock` com `now()`; testes fixam o instante.
- **Consequências:** RN15 e o limite de 1.095 dias testáveis de forma determinística sem mocks globais de `Date`.

## ADR-009 — Frontend sem biblioteca de cache de dados

- **Status:** Aceita (15/10/2026, com a arquitetura aprovada)
- **Contexto:** o enunciado sugere `useState`/`useEffect`; cada ação precisa refazer a consulta afetada e impedir duplo envio.
- **Decisão:** hooks próprios pequenos (`useQuery`-like com `refetch` e `AbortController`; `useAction` com estado pendente + guarda por `ref`).
- **Alternativa:** TanStack Query (cache, invalidação e estados prontos; +1 dependência a justificar).

## ADR-010 — Formulários com React Hook Form + Zod

- **Status:** Aceita (15/10/2026)
- **Contexto:** 7 formulários com mensagens junto ao campo (F2).
- **Decisão:** RHF (estado de formulário sem re-render a cada tecla) + Zod (schemas tipados, com o tipo do formulário inferido).
- **Alternativa:** formulários controlados à mão (mais código repetido entre 7 formulários → risco em F2 › Componentes).

## ADR-011 — Caminho principal de execução: banco em Docker + Node local; Docker completo como diferencial

- **Status:** Aceita (15/10/2026)
- **Contexto:** a banca segue o primeiro caminho do README; se não subir, perdem-se B1, F1, F3.
- **Decisão:** caminho principal no modelo do enunciado (`docker compose up -d db`, `npm ci`, `prisma migrate deploy`, build/start). Perfil `full` do Compose para o diferencial.
- **Consequências:** o caminho principal tem menos peças móveis; o diferencial é verificado separadamente.

## ADR-012 — ValidationPipe sem conversão de primitivos e erros 400 próprios

- **Status:** Aceita (15/10/2026, Etapa 1)
- **Contexto:** os testes e2e mostraram que o `ValidationPipe` global com `transform: true` converte ids e query params pelo tipo TypeScript **antes** dos pipes da rota: `/players/01` virava `1` e passava pelo `ParseIdPipe` (deveria ser 404 pela V8); `free=TRUE` viraria `false` (deveria ser 400 pela V5). Também apareceu que o Nest transforma o erro do body-parser em `BadRequestException` com a mensagem crua do parser (`Unexpected end of JSON input`).
- **Decisão:**
  1. `StrictValidationPipe` (subclasse do `ValidationPipe`) sobrescreve `transformPrimitive` para devolver o valor intacto: DTOs continuam validados e limpos (whitelist), mas ids e query params chegam como texto aos parsers estritos.
  2. A aplicação lança só erros próprios (`InvalidInputError` 400, `ResourceNotFoundError` 404, `BusinessRuleError` 409). O filtro usa a mensagem deles; `HttpException` vinda do framework recebe um texto padrão por status. Isso evita detectar erros comparando textos de mensagens.
- **Alternativas:** `transform: false` (perderia a remoção dos campos extras do corpo, V7); tipar o parâmetro como `string` (o tipo TS seria mentiroso após o pipe); comparar `message.startsWith('Cannot ')` (frágil).
- **Consequências:** services e pipes ficam independentes de classes HTTP do Nest; os testes de regressão estão em `backend/test/app.e2e-spec.ts`.
