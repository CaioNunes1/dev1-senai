# Progresso

## Estado atual

- **Etapas concluídas:** 1 — Fundação do backend; 3.1 — Domínio de jogadores (15/10/2026); 2 — Modelo de dados e migrations; 4.1 — Cadastro de clubes (17/10/2026); 3.2, 3.3 e 3.4 — API de jogadores completa; 4.2 — consulta e listagem de clubes; compra; 4.3 — elenco com contratos; venda; **5.1 — Fundação do frontend**; **5.2 — Listagem de jogadores** (18/10/2026).
- **Backend:** 11 das 19 rotas do enunciado prontas. Faltam histórico e CSV (RN17–RN18), escalação (RN19), partidas e classificação (RN20–RN21).
- **Frontend:** layout do Figma, rotas, cliente HTTP, menu de clubes e **tela de jogadores** integrada a `GET /players` (busca, filtros, ordenação, paginação e estados). Clubes, partidas e classificação ainda provisórias.
- **Próxima etapa:** 5.3 — operações de jogadores (aguarda autorização do usuário).
- **⚠️ Commits em `frontend/`:** o barema exige ≥10 commits com push em ≥3 dias distintos; 5 commits da 5.1 em 18/10 (4 em `frontend/`, já no `origin`); a 5.2 ainda não foi commitada. Prazo: 23/10.
- **Repositório:** `origin` = `github.com/CaioNunes1/dev1-senai`. Em 18/10, a branch `main` local estava em dia com `origin/main` (último commit `84c5924`, docs da 5.1).

## Pendências e bloqueios

| Item | Responsável | Situação |
| --- | --- | --- |
| Iniciar o Docker Desktop e validar `docker compose up -d db` + conexão do Prisma | — | ✅ resolvido: porta do host trocada para **5433** (ver abaixo) |
| Node.js 22 local (máquina tem v24.15.0; `engines` pede 22.x) | usuário | decidir. O frontend exige Node ≥ 22.12 (Vite 8); as dependências foram escolhidas para não exigir 22.22 (ADR-016) |
| `user.email` noreply no Git (o 1º commit saiu com o Gmail pessoal; recomendação, não eliminatória) | usuário | pendente para os próximos commits |
| Commits: ≥10 em `backend/` e ≥10 em `frontend/`, push em ≥3 dias distintos por pasta | usuário | 1º dia de push: 17/10 |
| Acesso ao Figma | — | ✅ 18/10: lido pela cópia `Gin5aRF66GIyoTTOUbEygQ` (o conector recusou o arquivo oficial por falta de permissão de edição). Tokens e mapeamento em `docs/frontend-design.md`. Telas mobile fora do escopo por decisão do usuário |
| Conferir errata | agente, a cada etapa | 17/10: nenhuma errata no repositório oficial; issue #4 (Spring) não nos afeta |
| Vulnerabilidades do `npm audit` (exigem majors; ver ADR-001) | revisão final | risco aceito |

## Etapas

| # | Etapa | Status | Testes | Observações |
| --- | --- | --- | --- | --- |
| 0 | Planejamento | ✅ | — | docs criados |
| 1 | Fundação do backend | ✅ | 24 unitários + 28 e2e passando | ADR-012 nasceu de bug pego pelos testes (`/01` aceito) |
| 2 | Modelo de dados | ✅ | estrutura e unicidades conferidas no banco; 171 unitários + 28 e2e sem regressão | migration `20261017213311_init` |
| 3.1 | Domínio de jogadores (RN02–RN06) | ✅ | 147 testes de domínio (total 171 unitários + 28 e2e) | sem dependências novas; 3 mutações detectadas pelos testes |
| 3.2 | Cadastro e consulta de jogadores | ✅ 18/10 | ver "Etapas 3.2–3.4" | |
| 3.3 | Edição, condição e exclusão de jogadores | ✅ 18/10 | ver "Etapas 3.2–3.4" | DOENTE sai da escalação na mesma transação |
| 3.4 | Listagem de jogadores (RN07) | ✅ 18/10 | ver "Etapas 3.2–3.4" | ADR-004 implementada |
| 4.1 | Cadastro de clubes (RN10) | ✅ | 259 unitários + 70 e2e passando (88 + 42 novos) | ADR-013, ADR-014, ADR-015 |
| 4.2 | Consulta e listagem de clubes | ✅ 18/10 | ver "Mercado" | `GET /clubs`, `GET /clubs/{id}` |
| — | Compra (RN12–RN14) | ✅ 18/10 | ver "Mercado" | `POST /players/{id}/buy` |
| 4.3 | Elenco com contratos (RN11, RN15) | ✅ 18/10 | ver "Mercado" | dias e % de multa na consulta |
| — | Venda (RN15–RN16) | ✅ 18/10 | ver "Mercado" | `POST /players/{id}/sell` |
| 5.1 | Fundação do frontend | ✅ 18/10 | ver "Etapa 5.1" | ADR-016, ADR-017, ADR-018; implementação da ADR-009 |
| 5.2 | Listagem de jogadores (F1 Jogadores, parte) | ✅ 18/10 | ver "Etapa 5.2" | ADR-019; 1 bug achado na aplicação real |

### Etapa 5.2 — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` (frontend) | 7 arquivos, 105 testes ok (79 novos): montagem dos query params, faixas de idade e valor (aceites e recusas), páginas visíveis, `formatMoney`, e tela integrada com a API simulada — 9 colunas e valores sem recálculo, "Livre", clube pela lista de `GET /clubs` (1 pedido), total de `meta`, carregamento, vazio, erro com `message`, falha de rede ≠ lista vazia, busca com acento e debounce (1 pedido), busca de 1 caractere não enviada, posição, condição, clube, abas `free`, bloqueio `free=true` + `club_id` nos dois sentidos, faixas válidas e inválidas (erro junto ao campo, sem pedido), combinação, remoção por chip, limpar filtros, 6 ordenações, paginação (próxima, anterior, número, última, volta à 1 ao filtrar), página além da última, resposta atrasada descartada, pedido cancelado sem erro |
| Mutações | página que não volta à 1 → 1 teste falhou; resposta antiga sem descarte → **sobreviveu** na 1ª versão (a tela não mostrava o dado velho, mas voltava a "carregando"); teste reforçado → passou a falhar; `free=true` com `club_id` → 1 falhou; ordenação local na tela → 1 falhou; código restaurado |
| Bug achado na aplicação real | página 3 → filtrar → "Limpar filtros" consultava `page=3` (a página antiga voltava com os mesmos filtros). Corrigido (ADR-019, item 2) e coberto por teste que falha sem a correção |
| `npm run lint` / `npm run format:check` / `npm run build` | ok; build com 304 kB de JS (96 kB gzip) |
| Exports sem uso | busca por símbolo exportado usado só no próprio arquivo: 4 encontrados (inclusive `DataRefresh`, da 5.1) e o `export` removido |
| Aplicação real (backend em `node dist/main.js` com `DATABASE_URL` do `passe_test`; Vite) | 23 jogadores, 4 clubes e 11 compras cadastrados **pela API** no banco de teste (limpo antes com o mesmo `TRUNCATE` dos e2e); o banco de desenvolvimento não foi tocado. Pedidos conferidos pelo protocolo DevTools: paginação `page=2`/`3`; filtros combinados `position=MEI&condition=MAL_CONDICIONADO&min_age=18&max_age=30` → volta à página 1; `search=joao` encontrou "João Silva"; `search=zzz` → vazio com "Limpar filtros"; `free=true` desabilita o clube; `club_id=1` desabilita "Livres"; `sort=value_desc` e `sort=position` na ordem da API; `min_value=10.5&max_value=40` a partir de "10,5"; "1e3" recusado junto ao campo; backend parado → erro E03 com a mensagem de conexão |
| Build de produção (`vite preview`) | 1 pedido inicial; 4 letras digitadas rápido → 1 pedido de busca (no `npm run dev` o 1º pedido aparece 2 vezes pelo StrictMode do React; o primeiro é cancelado) |
| Larguras | 1366 × 768: sem rolagem horizontal; tabela de 1036 px cabe inteira; popover abre pelo lado que cabe. 375 px: `scrollWidth` = 375; tabela rola dentro do card; paginação cabe (Anterior/Próxima só com ícone) |
| Não validado | Node 22 (máquina com Node 24); leitor de tela real (acessibilidade conferida por papéis/rótulos nos testes) |

Diferenças em relação ao Figma, todas registradas em `docs/frontend-design.md` §3.1: sem "Novo jogador", "Comprar" e menu "⋯" (etapas seguintes); contagem só na aba ativa; estados dentro do card (abas e ordenação continuam visíveis); chip também para busca e situação; avatares com cores escolhidas pelo id (decorativas).

### Etapa 5.1 — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` (frontend) | 3 arquivos, 26 testes ok: cliente HTTP (URL base, query params, corpo JSON, `message` da API em 400/404/409, resposta sem `message`, falha de rede, corpo vazio), trilha de navegação, layout integrado às rotas (raiz → jogadores, menu ativo, clubes da API na ordem recebida, navegação até um clube, erro com "Tentar de novo", lista vazia, "Atualizar dados") |
| Mutações | `message` da API trocado por texto genérico → 4 testes falharam; versão de atualização removida da consulta → 1 teste falhou; código restaurado |
| `npm run lint` / `npm run format:check` / `npm run build` | ok, sem avisos; build com 279 kB de JS (89 kB gzip) |
| `npm install` | 0 vulnerabilidades |
| Aplicação real (backend `node dist/main.js` + `npm run dev`, banco de dev vazio) | rotas carregam; menu mostra "Nenhum clube cadastrado." vindo da API; trilha "Mercado › Clubes › Clube 99" em clube inexistente; com o backend parado, o menu mostra a mensagem de falha de conexão e "Tentar de novo" |
| Larguras (Chrome headless, protocolo DevTools) | 1366 × 768: sem rolagem horizontal, painel e menu como no J01; menu recolhido em 48 px como o nó `9:18078`; 375 × 812: `scrollWidth` = 375, menu abre sobreposto com fundo `overlay` |
| Comparação visual com o Figma | J01 (estrutura), E04 (trilha do clube), Sidebar aberta e recolhida: medidas, cores, fonte e ícones conferem. Diferenças: listadas abaixo |
| `npm ci` (instalação limpa pelo lockfile) | ok, seguido de testes, lint, formatação e build de novo sem erros; levou cerca de 10 min nesta máquina (Windows) |
| Não validado | Node 22 (executado com o Node 24.15.0 da máquina); menu com clubes reais na aplicação no ar (o banco de dev está vazio e não foi alterado; o caso está coberto pelos testes de componente) |

Diferenças em relação ao Figma, todas intencionais:
- Rodapé da sidebar só com "Horário de Brasília (UTC−3)": o resumo "Liga Fictícia 2026 / Última partida" depende dos endpoints da liga.
- Sem contadores no menu e sem o "+" de novo clube (opcionais; o "+" entra com o cadastro de clubes, se fizer sentido).
- Páginas com conteúdo provisório ("será implementada na Etapa 5.x"), a substituir nas próximas etapas; páginas de partidas e classificação aguardam os endpoints.
- A raiz `/` redireciona para `/players`; a tela inicial (W01) é opcional.
- Cards com raio de 12 px (como nos frames), apesar da tabela de raios do Figma dizer 14 px para cards.

### 4.2, compra, 4.3 e venda — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` | 23 suítes, 522 testes ok (novos: datas RN01, taxa e limite RN13, janela da fidelidade, dias/percentual/multa RN15, comissão e acerto RN16, ordem do elenco, ordenação de clubes) |
| `npm run test:e2e` | 4 suítes, 227 testes ok (56 novos em `test/market.e2e-spec.ts`) |
| Exemplos oficiais pela API, com relógio fixo | 2.3.1 (compra: 37,00 + 1,85; caixa 261,15), 2.2.2 (clube: patrimônio 298,15; 120 dias; 10%), 2.3.2 (venda: 117 dias; multa 4,00; comissão 0,30; caixa 296,85; RESCINDIDO), resposta por resposta |
| Tabelas oficiais pela API | RN13 (5 linhas), RN15 (7 faixas, inclusive limites de 30/180 dias e 1 minuto), RN16 (prejuízo; multa limitada a 10,00 com comissão 2,00) |
| Recusas de compra | 15 formatos inválidos → 400 sem gravar (inclusive fidelidade igual ao momento e 1.095 dias + 1 min); 404 jogador/clube/excluído; 409 com clube, acima de 50%, 13º do elenco, recompra |
| Concorrência | dois clubes comprando o mesmo jogador ao mesmo tempo → uma compra só |
| Mutações | limite de 50% sem aceitar igual, dias sem arredondar para cima, comissão sobre prejuízo, venda sem tirar da escalação, recompra liberada: todas detectadas; código restaurado |
| Lint, formatação, build | ok |
| API real (somente leitura) | 11 rotas no Swagger; 400/404 com `message` |

Fixtures: alguns testes ajustam `valor_base` ou o caixa direto no banco para obter valores exatos das tabelas oficiais (ex.: valor de mercado 47,62). O cálculo do valor base já é coberto pela RN06.

### Etapas 3.2–3.4 — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` | 17 suítes, 444 testes ok (novos: regras dos campos, parser dos query params, seleção/ordenação, paginação, transição de condição, ordem alfabética) |
| `npm run test:e2e` | 3 suítes, 171 testes ok (101 novos de jogadores), no banco `passe_test` |
| Exemplos oficiais reproduzidos pela API | cadastro do Meia Lua (base 40,00, overall 75); PATCH MAL_CONDICIONADO → 37,00; edição do Davi Melo; tabela de paginação com 23 jogadores |
| V1–V8 no cadastro | 23 recusas de corpo + 3 corpos não objeto, todas sem gravar; `85.0` aceito como inteiro; campos calculados e `Agility` ignorados |
| RN08 / RN09 | idade menor e posição com clube → 409 sem gravar; excluído → 404 em GET, PUT, PATCH, DELETE e fora da listagem; linha mantida com `excluido_em` |
| RN19 (parte já possível) | PATCH para DOENTE remove a linha de `escalacoes`; a formação do clube continua |
| RN07 | 5 ordenações, 10 combinações de filtro, condição e valor atuais, filtros de clube, 15 parâmetros inválidos → 400, `club_id` inexistente → 404 |
| Mutações | "DOENTE não sai da escalação" e "idade pode diminuir" detectadas. "Sem desempate por nome" **não** foi detectada na primeira versão dos dados de teste (ids na mesma ordem dos nomes); os dados foram reordenados e a mutação passou a falhar em 3 testes unitários e 4 e2e |
| Lint, formatação, build | ok |
| API real (somente leitura) | listagem vazia com `meta` zerado; 400 e 404 com `message`; Swagger lista os 6 endpoints de jogadores |

Observações:
- Os testes que precisam de jogador num clube o colocam direto no banco (`prisma.player.update`), porque a compra (RN12) ainda não existe. Quando ela existir, esses testes podem passar a usar a API.
- PUT, PATCH e DELETE travam a linha do jogador (`SELECT … FOR UPDATE`) na transação, como previsto na ADR-007, para que a futura compra não crie corrida com essas operações.

### Etapa 4.1 — o que foi validado (17/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` | 11 suítes, 259 testes ok (novos: texto/V4, sigla, regras de nome e sigla, conversão Decimal) |
| `npm run test:e2e` | 2 suítes, 70 testes ok, no banco `passe_test`; o banco `passe` continuou com 0 clubes |
| Casos e2e de clubes | 201 + `Location` + campos mínimos; caixa `300.00` gravado; V4; V7; 24 recusas 400 e 3 corpos inválidos, todos sem gravar; nome repetido (maiúsculas/espaços) 409; nome sem acento aceito; sigla repetida 409; 21º clube 409 |
| Concorrência | 3 pedidos com o mesmo nome → 1 gravado; 4 pedidos a partir de 18 clubes → exatamente 20 |
| Mutação (remover o lock) | teste do limite falhou 3 de 3 vezes; lock restaurado |
| Lint, formatação, build | ok |
| API real (pedidos que não gravam) | 400 com `message`; Swagger lista `/api/v1/clubs` |

Observação de ambiente: o `curl` do Git Bash no Windows altera caracteres acentuados ao repassar argumentos (um "Águias FC" enviado por ele foi recusado), mas o mesmo pedido pelo `fetch` do Node foi aceito. Para testes manuais, usar o Swagger (`/api/docs`) ou o Postman. O `kill` do Git Bash também não encerra o `node` do Windows: usar `Stop-Process -Id <pid>` no PowerShell.

Pendências técnicas da 4.1:
- `squad_value` da resposta do POST é 0 por definição (RN10: clube nasce sem jogadores). O cálculo real do valor do elenco entra na 4.2/4.3.
- Testes e2e exigem o container do banco ligado (documentado no README).

### Banco local na porta 5433 (15/10/2026)

Com o container na `5432`, o Prisma falhava com `P1000` (autenticação), embora `psql` dentro do container funcionasse. O `wslrelay` (repasse de portas do WSL) escutava em `127.0.0.1:5432`/`[::1]:5432`, mais específico que o `0.0.0.0:5432` do Docker, então `localhost:5432` chegava a outro PostgreSQL (do WSL). Decisão do usuário: publicar o banco do projeto na **5433** (`docker-compose.yml`, `.env.example`, README, `test/setup-e2e.ts`). Conexão confirmada pelo Prisma (`current_user = passe`, PostgreSQL 16 Alpine). Na máquina da banca, a porta não faz diferença.

### Etapa 2 — o que foi validado (17/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npx prisma validate` / `npx prisma migrate dev --name init` | schema válido; migration criada e aplicada no banco `passe` |
| 71 colunas obrigatórias do enunciado (consulta ao `information_schema`) | todas presentes, nenhuma faltando |
| Colunas de moeda | 8 de 8 `numeric(p,2)` |
| PKs e FKs | todas presentes; PK composta `(clube_id, jogador_id)` em `escalacoes` |
| Unicidades do barema B3 (inserção direta + `ROLLBACK`) | "águias fc" recusado; "Aguias FC" aceito; sigla repetida recusada; jogador em 2 escalações recusado |
| Padrões | `caixa` = 300.00 e `condicao` = APTO |
| `migrate deploy` e `migrate reset --force` | ok num banco temporário (`passe_verificacao_reset`), removido depois; o banco de dev não foi resetado |
| Sequências de id | reiniciadas em 1 depois da simulação (tabelas vazias) |
| Testes, lint, formatação, build | ok |

### Etapa 3.1 — o que foi validado

| Verificação | Resultado |
| --- | --- |
| `npm test` | 7 suítes, 171 testes ok (147 novos: arredondamento, overall, valor base, valor de mercado) |
| `npm run test:e2e` | 28 testes ok (sem regressão) |
| `npm run lint` / `npm run format:check` / `npm run build` | ok |
| Mutações manuais (empate para baixo; agilidade 80 fora da faixa; jovem promessa até 20) | detectadas: 10, 4 e 2 testes falharam; código restaurado |

Fontes dos valores esperados: tabelas do README (RN05: 10 linhas; overall: 5; valor base: 9), amostras da ficha-exemplo (B05: 5; B06: 3 overall + 3 valor base) e casos-limite calculados à mão, com a conta escrita em cada caso de teste.

Pendente para a 3.2 (cadastro e consulta):
- banco de teste separado para os e2e que gravam dados (ex.: `passe_test` no mesmo container, com `migrate deploy` antes da suíte e limpeza entre testes);
- DTO de cadastro (V1–V7, regras cruzadas de 400) e normalização de nome (V4, em `common/domain/text`);
- mapper `Player → resposta` (snake_case, `overall` e `market_value` calculados, conversão `NUMERIC ↔ Cents`);
- service com cálculo do valor base no cadastro; `201` + `Location`; `GET /players/{id}` com excluído = 404.

### Etapa 1 — o que foi validado

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Instalação | `npm install` (gera `package-lock.json`, roda `prisma generate`) | ok |
| Build | `npm run build` | ok, `dist/main.js` |
| Unitários | `npm test` | 3 suítes, 24 testes ok |
| E2E | `npm run test:e2e` | 1 suíte, 28 testes ok |
| Lint | `npm run lint` | 0 erros, 0 avisos |
| Formatação | `npm run format:check` | ok |
| Inicialização real | `node dist/main` + `curl` | 404/400 em JSON com `message`, `01` → 404, CORS restrito, Swagger 200, 1 linha de log por requisição |
| PostgreSQL | `docker compose up -d db` | **não validado**: Docker Desktop parado |
| Node 22 | — | **não validado**: executado com Node 24.15.0 |

Limitação conhecida: requisições com JSON malformado são recusadas antes do middleware de log e por isso não geram linha de log. O barema verifica o log com uma requisição comum, então o diferencial não é afetado.

## Registro de uso de IA (base para a seção obrigatória do README)

| Data | Ferramenta | Onde | Como / por quê | Aceito / alterado / descartado |
| --- | --- | --- | --- | --- |
| 15/10/2026 | Claude Code (Claude Opus) | `CLAUDE.md`, `docs/*` | leitura do enunciado, barema e issues; proposta de arquitetura, modelo de dados e roadmap | arquitetura aprovada pelo candidato |
| 15/10/2026 | Claude Code (Claude Opus) | `backend/` (fundação), `README.md`, `docker-compose.yml` | geração da estrutura NestJS, pipes, filtro de erros, testes; escolha de versões verificada com `npm view` | em revisão pelo candidato |
| 15/10/2026 | Claude Code (Claude Opus) | `backend/src/common/domain/`, `backend/src/players/domain/` | implementação dos cálculos RN02–RN06 em centavos e dos testes parametrizados a partir das tabelas oficiais | em revisão pelo candidato |
| 17/10/2026 | Claude Code (Claude Opus) | `backend/prisma/schema.prisma`, migration inicial | modelagem das 7 tabelas com `@map`; consultas SQL que conferem estrutura e unicidades | em revisão pelo candidato |
| 17/10/2026 | Claude Code (Claude Opus) | `backend/src/clubs/`, `common/domain/text.ts`, `common/validation/`, `prisma/decimal.ts`, `test/` | `POST /clubs` (RN10), regras de nome e sigla, lock de criação, banco de teste e e2e com concorrência | em revisão pelo candidato |
| 18/10/2026 | Claude Code (Claude Opus) | `backend/src/players/` (dto, controller, service, mapper, domain/player-listing), `common/domain/pagination.ts`, `common/validation/query-params.ts`, `test/players.e2e-spec.ts` | endpoints de jogadores (RN06–RN09, RN07), parser estrito de query params, testes com os exemplos oficiais e checagem por mutação | em revisão pelo candidato |
| 18/10/2026 | Claude Code (Claude Opus) | `backend/src/market/`, `clubs/` (GET), `common/clock/`, `common/domain/datetime.ts`, `league/lineup-membership.ts`, `test/market.e2e-spec.ts` | compra, venda, consulta de clubes com contratos, relógio injetável e testes com os exemplos oficiais em instante fixo | em revisão pelo candidato |
| 18/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/` (configuração, `styles/index.css`, `app/`, `shared/`, `features/*/` páginas provisórias e `clubs/api.ts`), `docs/frontend-design.md`, ADR-016 a 018 | leitura das variáveis e frames do Figma (tokens, medidas do layout, ícones), escolha de versões compatíveis com Node 22 via `npm view`, layout, cliente HTTP, testes com mock de `fetch` e conferência visual com Chrome headless | em revisão pelo candidato |
| 18/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/src/features/players/`, `shared/components/` (DataTable, EmptyState, Badge, Input, FilterSelect), `shared/hooks/use-debounced-value.ts`, `features/clubs/clubs-context.ts`, testes, ADR-019 | leitura dos frames J01, J02, J04, J15 e E01–E07; tela de jogadores integrada à API; testes com API simulada e mutações; validação no navegador com dados controlados no banco de teste | em revisão pelo candidato |
