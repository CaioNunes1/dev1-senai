# Roadmap incremental

Prazo: **sexta-feira, 23/10/2026, 20h (Brasília)**. Hoje: 15/10. Errata prevista para 16/10.

## Restrições que moldam a ordem

1. **Pontos:** B1 e F1 valem 60 de 100 e são tudo-ou-nada por item → regras corretas antes de diferenciais.
2. **Git (B4/F4):** ≥10 commits em `backend/` **e** ≥10 em `frontend/`, com push em **≥3 dias distintos para cada pasta** → o frontend começa cedo e avança intercalado com o backend.
3. **Dependências:** jogadores → clubes → compra → venda → histórico → escalação → partidas. Cada tela depende do endpoint correspondente.
4. **Ambiente da banca:** o README precisa funcionar numa máquina limpa → ensaio final obrigatório.

## Visão geral

| # | Etapa | Pasta | Barema | Dia sugerido |
| --- | --- | --- | --- | --- |
| 0 | Planejamento (esta) | docs | — | 15/10 |
| 1 | Fundação do backend | backend, raiz | B2, B5 (lint, logs) | 15–16/10 |
| 2 | Modelo de dados e migrations | backend | B3 | 16/10 |
| 3 | Domínio de jogadores (cálculos puros) | backend | B05, B06, B5 (testes) | 16/10 |
| 4 | API de jogadores (CRUD + condição + exclusão) | backend | B01–B04, B06, B08 | 17/10 |
| 5 | Frontend: fundação (5.1 ✅ 18/10), jogadores (5.2–5.3 ✅), clubes (5.4 ✅) | frontend | F2, F3, F5 (lint) | 18–20/10 |
| 6 | Listagem de jogadores (API) | backend | B07 | 17–18/10 |
| 7 | Tela de jogadores | frontend | F01–F04 | 18/10 |
| 8 | Clubes (API + telas) | ambos | B09, F05 | 18–19/10 |
| 9 | Compra + consulta do clube com contratos | backend | B10–B13 | 19/10 |
| 10 | Venda | backend | B14–B17 | 19–20/10 |
| 11 | Telas de compra, venda e página do clube | frontend | F06–F08 | 20/10 |
| 12 | Histórico e CSV (API + tela) | ambos | B18, B19, F09–F11 | 20–21/10 |
| 13 | Escalação (API + aba) | ambos | B20, F12 | 21/10 |
| 14 | Partidas e classificação (API + telas) | ambos | B21, B22, F13, F14 | 21–22/10 |
| 15 | Diferenciais: Docker completo, Swagger revisado, responsividade, testes frontend | ambos | B5, F5 | 22/10 |
| 16 | README final, ensaio em ambiente limpo, revisão pelo barema | raiz | B4, F4, B3 | 23/10 (até ~16h) |

Swagger, logs e lint são configurados na Etapa 1 e mantidos a cada etapa (mais barato que no fim).

---

## Etapa 1 — Fundação do backend ✅ (15/10/2026)

> Ajustes em relação ao plano: o `Clock` passou para a Etapa 4, quando houver quem o use (evita código sem uso, que pesa em B2). A conexão real com o PostgreSQL não foi validada porque o Docker Desktop não estava em execução; a validação passa para o início da Etapa 2.

- **Objetivo:** API NestJS vazia, mas com todas as convenções transversais funcionando e verificadas.
- **Regras:** V1, V8, V9, Convenções da API (prefixo, `message`, `Content-Type`, CORS), logs.
- **Arquivos:** `.gitignore`, `.editorconfig`, `.nvmrc` (22), `docker-compose.yml` (serviço `db`), `README.md` (esqueleto com as 8 seções), `backend/` (Nest, `config/`, `common/http`, `common/errors`, `common/clock`, `main.ts`), ESLint, Prettier, Jest, `.env.example`.
- **Dependências:** aprovação da arquitetura; decisão sobre Node 22 local; `git init`.
- **Critérios de aceite:**
  - `GET /api/v1/rota-inexistente` → 404 com `{"message": "..."}` e `Content-Type: application/json`.
  - JSON malformado → 400 com `message` string.
  - corpo array/primitivo num endpoint de teste → 400.
  - `ParseIdPipe`: `abc`, `0`, `-1`, `1.5`, `01`, `2147483648` → 404; `1` aceito.
  - erro inesperado → 500 sem stack trace no corpo.
  - CORS libera só `CORS_ORIGIN`; `*` nunca.
  - uma linha de log por requisição (data/hora, método, caminho, status) via `Logger` do Nest.
  - Swagger abre em `/api/docs`.
  - `npm run lint`, `npm run format:check`, `npm test`, `npm run build` sem erros.
- **Testes:** e2e do filtro de erros, do `ParseIdPipe` e do corpo não-objeto; unitário do `ParseIdPipe`.
- **Validação:** `cd backend && npm ci && npm run lint && npm run format:check && npm test && npm run test:e2e && npm run build`.
- **Commits sugeridos:** `chore: inicializa repositório com docker compose do banco` · `feat(backend): cria api nestjs com prefixo /api/v1, cors e logs` · `feat(backend): adiciona tratamento central de erros e validação de ids`.

## Etapa 2 — Modelo de dados e migrations ✅ (17/10/2026)

- **Objetivo:** schema Prisma com as 7 tabelas e a migration inicial.
- **Regras:** "3. Estrutura de tabelas", RN10 (unicidade), B3.
- **Arquivos:** `backend/prisma/schema.prisma`, `prisma/migrations/*`, `src/prisma/`.
- **Critérios de aceite:** `migrate deploy` cria as 7 tabelas com nomes exatos (conferir com `\d` no psql); `migrate reset --force` recria vazio; as 4 inserções diretas de B3 se comportam como esperado.
- **Testes:** script/e2e que confere as unicidades no banco.
- **Validação:** `npx prisma migrate reset --force && npx prisma migrate deploy`; `docker compose exec db psql -U ... -c '\d+ clubes'`.
- **Commit:** `feat(backend): modela as sete tabelas do domínio com prisma`.

## Etapa 3 — Jogadores, dividida em subetapas (definido pelo usuário em 15/10/2026)

| Subetapa | Escopo | Etapa original | Depende de |
| --- | --- | --- | --- |
| 3.1 ✅ | Regras de domínio e cálculos (RN02–RN06) | 3 | — |
| 3.2 ✅ | `POST /players`, `GET /players/{id}`, DTOs, persistência | 4 (parte) | Etapa 2 ✅ |
| 3.3 ✅ | `PUT`, `PATCH /condition`, `DELETE` (RN08, RN09) | 4 (parte) | 3.2 |
| 3.4 ✅ | `GET /players` (RN07) | 6 | 3.2 |

> A Etapa 2 foi executada depois da 3.1 (17/10/2026). Hoje não há mais pendências de banco para a 3.2.

### Etapa 3.1 — Domínio de jogadores ✅ (15/10/2026)

- **Objetivo:** funções puras e 100% testadas: `money` (centavos, arredondamento), `text` (V4, normalização, comparador), `datetime` (RN01), `overall`, `baseValue`, `marketValue`.
- **Regras:** Arredondamento, Ordem alfabética, RN01–RN06.
- **Critérios de aceite:** todas as linhas das tabelas oficiais de RN05 (10), overall (5), valor base (9) e amostras da ficha-exemplo passam; casos-limite (agilidade 30/31/79/80, idade 21/22/31/32, teto exato −40%, piso).
- **Validação:** `npm test`.
- **Commits:** `feat(backend): implementa arredondamento monetário em centavos` · `feat(backend): calcula overall, valor base e valor de mercado`.

## Etapa 4 — API de jogadores

- **Objetivo:** `POST`, `GET /{id}`, `PUT`, `PATCH /condition`, `DELETE`.
- **Regras:** V1–V8, limites, RN06, RN08, RN09 (a saída da escalação no PATCH entra na Etapa 13).
- **Critérios de aceite:** exemplo "Meia Lua" (201 + `Location`, valor base 40,00, MAL_CONDICIONADO → 37,00); cada linha de "Limites de cada campo" com aceite e recusa; campos controlados ignorados; DOENTE→APTO 409; idade menor 409; excluído = 404 em todos.
- **Commits:** `feat(backend): cadastra e consulta jogadores` · `feat(backend): edita jogador e altera condição física` · `feat(backend): exclui jogador logicamente`.

## Etapa 5 — Frontend, dividido em subetapas (definido pelo usuário em 18/10/2026)

Prioridades do usuário: arquitetura simples, fidelidade aos fluxos do enunciado, consistência com o design system do Figma, componentes reutilizáveis sem abstração desnecessária, integração real com a API, estados de carregamento/erro/vazio, responsividade, testes. Telas mobile do Figma fora do escopo (só desktop, sem quebrar em 375 px).

| Subetapa | Escopo | Situação |
| --- | --- | --- |
| 5.1 | Fundação: Vite/React/TS, Tailwind + tokens do Figma, layout (sidebar, topo), rotas iniciais, cliente HTTP, lint/format/testes, documentação | ✅ 18/10/2026 |
| 5.2 | Tela de jogadores: lista integrada, tabela do Figma (J01), paginação, filtros, ordenação, estados, rolagem interna da tabela | ✅ 18/10/2026 |
| 5.3 | Operações de jogadores: cadastro, edição, condição, exclusão com confirmação, mensagens; `useApiAction` com guarda de duplo clique | ✅ 18/10/2026 |
| 5.4 | Clubes: lista e ordenação, cadastro, página do clube com resumo financeiro e elenco | ✅ 18/10/2026 |

As telas de compra, venda, histórico e liga são planejadas depois, com os endpoints restantes do backend.

### Etapa 5.1 — Fundação do frontend ✅ (18/10/2026)

- **Critérios de aceite:** `npm run lint`, `npm run format:check`, `npm test` e `npm run build` sem erros; rotas `/players`, `/clubs`, `/clubs/:id`, `/matches`, `/standings` navegáveis pelo menu; menu de clubes vindo de `GET /clubs` com estados de carregamento, vazio e erro; botão "Atualizar dados" recarrega sem recarregar a página; sem rolagem horizontal em 1366 e 375 px.
- **Commits sugeridos:** `chore(frontend): cria projeto react com vite, tailwind, lint e testes` · `feat(frontend): adiciona tokens do figma, layout com menu lateral e rotas` · `feat(frontend): adiciona cliente http e consulta de clubes no menu`.
- **Critério herdado do plano original para a 5.3:** botão de ação com teste de duplo clique = 1 chamada.

### Etapa 5.2 — Listagem de jogadores ✅ (18/10/2026)

- **Critérios de aceite:** `GET /players` com busca, 6 filtros combináveis, `sort` com as 6 opções, `page`/`limit=10`; 9 colunas; clube resolvido pela lista de `GET /clubs`; moeda `37,00`; `free=true` + `club_id` impedido na tela; estados de carregamento, vazio (sem jogadores, sem resultado, página além da última) e erro com `message`; sem rolagem horizontal em 1366 e 375 px.
- **Commits sugeridos (5.2):** `feat(frontend): adiciona tabela com estados, badge e campos de filtro compartilhados` · `feat(frontend): lista jogadores com busca, filtros, ordenação e paginação pela api` · `docs: registra a tela de jogadores e a ADR-019`.

### Etapa 5.3 — Operações de jogadores ✅ (18/10/2026)

- **Critérios de aceite:** cadastro com os 11 campos (números JSON), validação junto ao campo antes de enviar, overall e valor base exibidos da resposta do 201; edição com `GET` antes e `PUT` com 4 campos, RN08 na tela; condição por `PATCH` com Doente → Apto bloqueado; exclusão só de livres, com confirmação e `DELETE` 204; clique duplo = 1 pedido; `message` da API nas recusas; lista atualizada sem recarregar.
- **Commits sugeridos:** `feat(frontend): adiciona diálogo, formulário, avisos e ação com trava contra envio duplo` · `feat(frontend): cadastra jogadores com validação e resultado calculado pela api` · `feat(frontend): edita, altera condição e exclui jogadores pelo menu da tabela` · `docs: registra as operações de jogadores e a ADR-020`.

### Etapa 5.4 — Clubes ✅ (18/10/2026)

- **Critérios de aceite:** `GET /clubs` com as 5 colunas e as 3 ordenações pela API (sem ordenar na tela, sem paginação); cadastro por `POST /clubs` só com `name` e `acronym`, validação RN10 antes de enviar, 400/409 com o `message` e dados mantidos, clique duplo = 1 pedido; lista e menu atualizados sem recarregar e sem consultas repetidas; `/clubs/:id` por clique ou URL direta, resumo e elenco como a API devolve, contrato com data em Brasília, elenco vazio, 404 e falha de rede; sem rolagem horizontal em 1366 e 375 px.
- **Commits sugeridos:** `feat(frontend): lista clubes com ordenação pela api` · `feat(frontend): cadastra clubes com validação de nome e sigla` · `feat(frontend): mostra a página do clube com resumo financeiro e elenco com contratos` · `docs: registra as telas de clubes e a ADR-021`.

## Etapa 6 — Listagem de jogadores (API)

- **Regras:** RN07 + tabela "Filtros e query params".
- **Critérios de aceite:** tabela de paginação oficial; busca sem acento; `sort` com 2 critérios; parâmetro vazio/minúsculo/zero à esquerda → 400; `free=true&club_id` → 400; `club_id` inexistente → 404.
- **Commit:** `feat(backend): lista jogadores com busca, filtros, ordenação e paginação`.

## Etapa 7 — Tela de jogadores (F01–F04)

Tabela, paginação, filtros, ordenação, cadastro/edição/condição com validação de campo, excluir com confirmação. Commits por funcionalidade.

## Etapa 8 — Clubes (backend chamado de "Etapa 4" pelo usuário, dividido em subetapas)

| Subetapa | Escopo | Situação |
| --- | --- | --- |
| 4.1 | `POST /clubs`: RN10 (nome, sigla, unicidade, 20 clubes, caixa 300,00) | ✅ 17/10/2026 |
| 4.2 | `GET /clubs` (sort `name`, `net_worth_asc`, `net_worth_desc`) e `GET /clubs/{id}`; valor do elenco e patrimônio calculados | ✅ 18/10/2026 |
| 4.3 | Elenco na ordem da RN11, contrato de cada jogador (fim da fidelidade, dias restantes, % de multa) | ✅ 18/10/2026 (com a compra) |

Compra (Etapa 9) e venda (Etapa 10) também concluídas no backend em 18/10/2026; as telas correspondentes estão na Etapa 11.

As telas de clubes (frontend) continuam previstas aqui, em commits separados.

## Etapa 9 — Compra

RN12–RN14, RN01 no `loyalty_until`, transação + lock, contrato e transação COMPRA, `GET /clubs/{id}` com `contract` (dias restantes/% multa via função única de RN15). Aceite: tabela RN13 (5 linhas), exemplo 2.3.1, ficha-exemplo B10/B13.

## Etapa 10 — Venda

RN15/RN16, contrato RESCINDIDO/ENCERRADO, transação VENDA, recompra bloqueada (409) e liberada para outro clube, `GET /clubs?sort=net_worth_*`. Aceite: tabelas RN15 (7), comissão (6), crédito (5), exemplo 2.3.2.

## Etapa 11 — Telas de compra e venda (F06–F08)

## Etapa 12 — Histórico e CSV

RN17/RN18 + aba Histórico com filtros, `summary`, exportação (download do blob da API). Aceite: CSV byte a byte (LF, sem BOM, cabeçalho no vazio, aspas).

## Etapa 13 — Escalação

RN19 + saída de titular na venda e no PATCH para DOENTE (transação). Aba Escalação com seletores por vaga.

## Etapa 14 — Partidas e classificação

RN20 (motor de duelos puro, testado com o exemplo Águias × Delta e as 4 formações), RN21; telas de partida, histórico e classificação.

## Etapa 15 — Diferenciais

Compose perfil `full` (um comando), revisão do Swagger (todos os 19 endpoints), responsividade 375px, testes de frontend adicionais.

## Etapa 16 — Revisão final

Clone limpo → seguir o README literalmente (cronometrar < 30 min) → checklist B1–B5/F1–F5 → seção "Uso de inteligência artificial" → hash do commit final.
