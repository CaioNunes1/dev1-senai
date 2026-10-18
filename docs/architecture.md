# Arquitetura

Visão geral: **monólito modular** em NestJS (API REST) + SPA React (Vite) + PostgreSQL, orquestrados por Docker Compose. Sem microserviços, sem CQRS, sem repositórios genéricos: a complexidade do problema está nas **regras de cálculo e nas validações**, e é aí que a arquitetura investe.

```text
.
├── backend/            API NestJS (porta 3000, prefixo /api/v1)
├── frontend/           SPA React + Vite (porta 5173 em dev)
├── docs/               Planejamento e decisões
├── docker-compose.yml  db (padrão) + api/web (perfil "full")
└── README.md           Instruções exigidas pelo enunciado
```

## 1. Backend

### 1.1 Camadas e responsabilidades

| Camada | Responsabilidade | Não faz |
| --- | --- | --- |
| **Controller** | rota, status code, cabeçalho `Location`, delega ao service | regra de negócio, acesso ao banco |
| **DTO** (class-validator) | formato, tipo, limites de um campo, regras cruzadas de formato (400), normalização V4 | consultar banco |
| **Service** | caso de uso: existência (404), regras dependentes de estado (409), transações, chamada às funções de domínio | formatar JSON da resposta |
| **Domain** (funções puras) | cálculos e invariantes: valor de mercado, overall, valor base, taxa, multa, comissão, duelos/placar, classificação, ordenação por nome | I/O, Prisma, Nest |
| **Mapper/Presenter** | converte entidade Prisma + valores calculados → resposta snake_case | calcular regra (chama o domínio) |
| **PrismaService** | acesso ao banco (usado direto pelos services) | — |

Repositório dedicado só onde a consulta é complexa o bastante para poluir o service (ex.: carga dos jogadores para a listagem, locks da compra). Ver ADR-005.

### 1.2 Módulos

```text
backend/src/
├── main.ts                     bootstrap: cria a app, chama configureApp, escuta PORT
├── app.setup.ts                configureApp: prefixo, CORS, pipes, filtro, Swagger (usado também pelos testes e2e)
├── app.module.ts               ConfigModule (validação do .env), PrismaModule, middleware de log
├── config/                     environment.ts: leitura e validação das variáveis de ambiente
├── prisma/                     PrismaModule (global) / PrismaService
├── common/
│   ├── http/                   AllExceptionsFilter, ParseIdPipe, PlainObjectBodyPipe, RequestLoggerMiddleware
│   ├── errors/                 InvalidInputError (400), ResourceNotFoundError (404), BusinessRuleError (409)
│   ├── validation/             StrictValidationPipe, fábrica de erro de validação; depois, decorators e parsers de query
│   ├── clock/                  (Etapa 4) Clock — provider injetável de "agora"
│   └── domain/                 rounding.ts (único arredondamento), money.ts (Cents); depois datetime (RN01), text (V4, ordenação)
├── players/                    RN02–RN09 (✅ 3.1–3.4)
│   ├── domain/                 player.types.ts, player.limits.ts, overall.ts, base-value.ts, market-value.ts,
│   │                           condition-transition.ts, player-listing.ts (busca, faixa de valor, ordenação)
│   ├── dto/                    create-player, update-player, update-condition, player-input.rules,
│   │                           player-list-query (parser + pipe), player-response
│   ├── players.controller.ts  players.service.ts  player.mapper.ts (marketValueOf, toPlayerResponse)
├── clubs/                      RN10, RN11
│   ├── domain/                 club.rules.ts (20 clubes, caixa inicial, chave do nome), acronym.ts (4.1 ✅); club-ordering.ts (4.2)
│   ├── dto/                    create-club.dto.ts, club-input.rules.ts, club-response.dto.ts
│   ├── clubs.controller.ts  clubs.service.ts  club.mapper.ts  clubs.module.ts
├── market/                     RN12–RN18 (compra ✅, venda ✅; histórico e CSV pendentes)
│   ├── domain/                 purchase.ts (taxa, limite 50%, janela da fidelidade), loyalty-penalty.ts (dias + % + multa),
│   │                           sale.ts (lucro, comissão, crédito, situação do contrato); transactions-csv.ts (pendente)
│   ├── dto/                    buy-player.dto.ts, market-response.dto.ts
│   ├── market.controller.ts (POST /players/{id}/buy e /sell)  market.service.ts  transaction.mapper.ts
├── league/                     lineup-membership.ts (saída da escalação, usada na venda e na condição DOENTE); RN19–RN21 pendentes
├── league/                     RN19–RN21 (escalação, partidas, classificação)
│   ├── domain/                 formation.ts, match-engine.ts, standings.ts
```

Dependências entre módulos (sem ciclos):

```text
players ◄── clubs ◄── market
   ▲          ▲         │
   └──────────┴── league ┘ (market chama league para tirar o vendido da escalação)
```

- `market` e `league` importam funções de domínio de `players` (valor de mercado, ordenação) — **nunca reimplementam**.
- Saída da escalação (venda e condição DOENTE) fica em uma função do `league` (`removeFromLineup(tx, playerId)`) chamada dentro da transação de quem a dispara.

### 1.3 Fluxo de uma requisição

```text
HTTP → body-parser (JSON) → RequestLoggerMiddleware
     → ParseIdPipe (404) / PlainObjectBodyPipe (400) / ValidationPipe (400)
     → Controller → Service ─┬─ Domain (puro)
                             └─ Prisma ($transaction quando grava mais de uma tabela)
     → Mapper → JSON
Erros: qualquer exceção → AllExceptionsFilter → { message } + status (400/404/409/500), sem stack
```

### 1.4 Tratamento de erros

- Services, pipes e a validação lançam só erros próprios (`InvalidInputError`, `ResourceNotFoundError`, `BusinessRuleError`) — não `HttpException` — para manter o código independente de HTTP.
- `AllExceptionsFilter` mapeia: erros próprios → 400/404/409 com a mensagem deles; `HttpException` < 500 gerada pelo framework (rota inexistente, JSON malformado) → status original com texto padrão em português; qualquer outro → 500 com mensagem genérica e stack **só no log do servidor**. Prisma `P2002` (corrida em unicidade) → 409 entra quando houver unicidade a proteger (Etapa 8).
- `StrictValidationPipe` (ADR-012): `whitelist: true`, `forbidNonWhitelisted: false`, `transform: true`, sem conversão implícita e **sem conversão de primitivos** (ids e query params chegam como texto); `exceptionFactory` devolve a primeira mensagem como texto.
- `PlainObjectBodyPipe` roda antes e recusa corpo que não é objeto (V1).

### 1.5 Transações e concorrência

- Operações atômicas via `prisma.$transaction(async (tx) => …)`: compra, venda, escalação, partida (+6 duelos), PATCH para DOENTE (+ saída da escalação), criação de clube (contagem ≤ 20).
- Proteção contra corrida (ex.: duas compras simultâneas do mesmo jogador): `SELECT … FOR UPDATE` parametrizado nas linhas de clube e jogador dentro da transação. Decisão final na Etapa de compra (ADR-007).

### 1.6 Tempo

- `Clock` injetável (`now(): Date`). Produção usa o relógio do sistema; testes fixam o instante — necessário para validar RN15 (dias restantes) e o limite de 1.095 dias de forma determinística.
- Banco grava `timestamptz`; formatação de saída sempre em `-03:00` (Brasília não tem horário de verão — RN01).

### 1.7 Observabilidade e documentação

- `RequestLoggerMiddleware` com o `Logger` do Nest: uma linha por requisição com data/hora, método, caminho e status (diferencial B5).
- Swagger em `/api/docs` com `@nestjs/swagger` (diferencial B5), documentado módulo a módulo.

## 2. Frontend

Detalhes de telas e tokens em [frontend-design.md](frontend-design.md).

```text
frontend/src/
├── app/            App, rotas (React Router declarativo), layout, providers
├── shared/
│   ├── api/        httpClient (fetch), ApiError, base URL de VITE_API_URL
│   ├── components/ DataTable (loading/empty/error), FormField, Button, ConfirmDialog,
│   │               Pagination, Feedback/Toast, Tabs, Badge
│   ├── hooks/      useQuery-like (carregar + refetch), useAction (pendente + guarda de duplo envio)
│   └── lib/        formatMoney, formatDateTime, toBrasiliaOffset (datetime-local → -03:00)
├── features/
│   ├── players/    api.ts, hooks, schemas (Zod), components, PlayersPage
│   ├── clubs/      api.ts, ClubsPage, ClubDetailPage (abas Elenco · Histórico · Escalação)
│   ├── market/     BuyDialog, SellDialog, TransactionsTab, export
│   └── league/     LineupTab, MatchesPage, MatchDetail, StandingsPage
└── main.tsx
```

Regras:

- Componentes **não chamam** `fetch`: `features/*/api.ts` (funções tipadas) → hooks → componentes.
- Valores calculados (valor de mercado, multa, classificação…) são **apenas exibidos**. Ordem das listas = ordem da API.
- Após cada uma das 9 ações, o hook refaz a consulta afetada (sem recarregar a página).
- Mensagens: sucesso padronizado; erro mostra o `message` da API.

## 3. Infraestrutura

- `docker-compose.yml`: serviço `db` (`postgres:16-alpine`) usado no caminho principal do README; perfil `full` adiciona `api` (`node:22-alpine`, roda `migrate deploy` + `start:prod`) e `web` (build Vite servido por imagem pública) para o diferencial "um único comando".
- Caminho principal do README (o que a banca executa primeiro): banco em Docker + backend e frontend com `npm ci`, no modelo sugerido pelo enunciado. Reduz o risco de um build de imagem quebrar tudo.
- Variáveis: `backend/.env.example` (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`), `frontend/.env.example` (`VITE_API_URL`). Toda variável lida pelo código precisa estar no `.env.example` e no README (a ficha-exemplo perdeu ponto por isso).
