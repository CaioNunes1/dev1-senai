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
├── market/                     RN12–RN18 (compra ✅, venda ✅, histórico e CSV ✅)
│   ├── domain/                 purchase.ts (taxa, limite 50%, janela da fidelidade), loyalty-penalty.ts (dias + % + multa),
│   │                           sale.ts (lucro, comissão, crédito, situação do contrato); transaction-history.ts (summary em centavos);
│   │                           transactions-csv.ts (CSV da RN18)
│   ├── dto/                    buy-player.dto.ts, market-response.dto.ts
│   ├── dto/transaction-filters.ts  (type e player_id, um pipe para os dois endpoints do histórico)
│   ├── market.controller.ts (POST /players/{id}/buy e /sell)  market.service.ts  transaction.mapper.ts
│   ├── transactions.controller.ts (GET /clubs/{id}/transactions e /export)  transaction-history.service.ts
├── league/                     RN19–RN21 (✅ 22/10)
│   ├── domain/                 formation.ts (4 formações, setores), match-engine.ts (6 duelos, 15% do MAL_CONDICIONADO,
│   │                           placar), standings.ts (pontos e desempates)
│   ├── dto/                    league-requests.ts (LineupDto, PlayMatchDto, MatchListQueryPipe), league-responses.ts
│   ├── lineup.service.ts  matches.service.ts  league.mapper.ts  league.controllers.ts  league.module.ts
│   ├── lineup-membership.ts    saída da escalação, usada na venda e na condição DOENTE
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

Estrutura após a Etapa 5.4 (✅ = existe; o resto entra com a tela que o usa):

```text
frontend/
├── index.html, vite.config.ts (Vite + Tailwind + Vitest), eslint.config.js, .prettierrc, .env.example
├── public/favicon.svg          marca "P" exportada do Figma
└── src/
    ├── main.tsx                 ✅ monta <App/> e importa os estilos
    ├── app/
    │   ├── App.tsx              ✅ BrowserRouter + AppProviders (DataRefreshProvider, ToastProvider)
    │   ├── AppRoutes.tsx        ✅ rotas declarativas (modo biblioteca)
    │   └── layout/              ✅ AppLayout, Sidebar, Topbar, navigation.ts (rotas, menu, trilha)
    ├── shared/
    │   ├── api/http-client.ts   ✅ apiRequest, ApiError, URL base de VITE_API_URL + /api/v1
    │   ├── hooks/               ✅ useApiQuery, useApiAction, DataRefreshProvider/useDataRefresh, ToastProvider/useToast, useDebouncedValue
    │   ├── components/          ✅ Button (+ button-styles), Card, PageHeader, DataTable, EmptyState, Badge, Input, FilterSelect,
    │   │                           FormField, Alert, Dialog, ConfirmDialog, Select, Tabs (+ tab-ids)
    │   └── lib/                 ✅ cx, format (moeda, inteiro, %, data/hora em Brasília), text (regras V4 e removeAccents do backend)
    ├── features/
    │   ├── players/             ✅ api.ts, usePlayerList, player-filters (funções puras), PlayersPage, PlayersFilters, RangeFilter,
    │   │                           PlayersTableToolbar, PlayersTable, PlayersPagination, ConditionBadge, PlayerAvatar,
    │   │                           player-schemas (Zod), PlayerDialogs, Create/Created/Edit/Condition/DeletePlayerDialog,
    │   │                           PlayerActionsMenu, PositionPicker, PlayerSummary
    │   ├── clubs/               ✅ api.ts (GET /clubs, GET /clubs/{id}, POST /clubs), useClubs/useClub, ClubsContext/useClubList,
    │   │                           club-schemas (Zod), club-labels, ClubsPage, ClubsTable, CreateClubDialog, ClubMonogram,
    │   │                           ClubDetailPage, ClubSummaryCards, SquadTable
    │   ├── market/              ✅ api.ts (compra, venda, histórico, CSV), loyalty-date (RN01), buy-player-schema (Zod),
    │   │                           BuyPlayerDialog, PurchaseResultDialog, transaction-filters (única tradução
    │   │                           dos filtros para a API e a URL), use-transactions, TransactionHistoryPanel,
    │   │                           TransactionFiltersBar, TransactionsTable, TransactionSummaryBar, SellPlayerDialog,
    │   │                           SaleResultDialog, ResultRow
    │   └── league/              ✅ api.ts (escalação, partidas, classificação), lineup-slots (vagas por formação), LineupPanel,
    │                               MatchesPage, NewMatchDialog, MatchDetailPage, StandingsPage
    ├── styles/index.css         ✅ Tailwind v4 + tokens do Figma (@theme)
    └── test/                    ✅ setup do Vitest, mock de fetch, downloads falsos (download-mock)
```

Regras:

- Componentes **não chamam** `fetch`: `features/*/api.ts` (funções tipadas, campos no formato da API, ADR-018) → hooks → componentes. A única chamada a `fetch` do projeto está em `shared/api/http-client.ts`.
- Recusas viram `ApiError` com o `message` da API e o `status`; falha de rede vira `ApiError` com `status = null` e texto próprio.
- Arquivos (CSV da RN18): `apiDownload` no mesmo cliente devolve o `Blob` sem alterar os bytes, só quando o `Content-Type` é o pedido; recusas continuam lidas como JSON. `shared/lib/download.ts` entrega o arquivo ao navegador e libera a URL temporária (ADR-025).
- Valores calculados (valor de mercado, multa, classificação…) são **apenas exibidos**. Ordem das listas = ordem da API.
- Ações de escrita usam `useApiAction` (trava síncrona contra envio duplo, `message` da API preservado). No sucesso, quem chama decide: `refreshAll()` recarrega todas as consultas abertas, sem recarregar a página (ADR-009, ADR-020).
- Mensagens: sucesso padronizado; erro mostra o `message` da API.
- Componentes compartilhados só nascem quando uma tela precisa deles (ADR-017); componentes de uma única feature ficam na pasta dela.
- Toda tela de lista usa o `DataTable` (estados de carregamento, vazio e erro num só lugar, F2/F3). Filtrar, ordenar e paginar é sempre papel da API: a tela só monta os query params (ADR-019).

## 3. Infraestrutura

- `docker-compose.yml`: serviço `db` (`postgres:16-alpine`) usado no caminho principal do README; perfil `full` adiciona `api` (`node:22-alpine`, roda `migrate deploy` + `start:prod`) e `web` (build Vite servido por imagem pública) para o diferencial "um único comando".
- Caminho principal do README (o que a banca executa primeiro): banco em Docker + backend e frontend com `npm ci`, no modelo sugerido pelo enunciado. Reduz o risco de um build de imagem quebrar tudo.
- Variáveis: `backend/.env.example` (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`), `frontend/.env.example` (`VITE_API_URL`). Toda variável lida pelo código precisa estar no `.env.example` e no README (a ficha-exemplo perdeu ponto por isso).
