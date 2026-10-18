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
| 5 | Fundação do frontend | frontend | F2, F3, F5 (lint) | 17/10 |
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

## Etapa 5 — Fundação do frontend

- **Objetivo:** Vite + React + TS + Tailwind v4 + Router, layout/navegação, `httpClient`, componentes compartilhados (DataTable com 3 estados, FormField, Feedback, ConfirmDialog, ActionButton, Pagination), formatadores, ESLint/Prettier/Vitest.
- **Critérios de aceite:** lint, format:check, `npm test` (≥1 teste de componente) e build sem erros; `ActionButton` com teste de duplo clique = 1 chamada.
- **Commits:** `chore(frontend): cria projeto react com vite, tailwind e lint` · `feat(frontend): adiciona layout, rotas e cliente http` · `feat(frontend): cria componentes compartilhados de tabela, formulário e feedback`.

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
| 4.2 | `GET /clubs` (sort `name`, `net_worth_asc`, `net_worth_desc`) e `GET /clubs/{id}`; valor do elenco e patrimônio calculados | aguardando aprovação |
| 4.3 | Elenco na ordem da RN11, contrato de cada jogador (fim da fidelidade, dias restantes, % de multa) | depende dos jogadores (3.2) e da compra |

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
