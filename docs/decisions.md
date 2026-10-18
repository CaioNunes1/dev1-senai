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
  - `Prisma.Decimal` não entra no domínio: a conversão `NUMERIC ↔ Cents` fica em `prisma/decimal.ts` (`decimalToCents` = `decimal.times(100).toNumber()`; `centsToDecimal` = `new Decimal(cents).dividedBy(100)`), com aritmética decimal exata, nunca multiplicação em float. Usada pelos mappers e na gravação (Etapa 4.1).

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
- **Aplicada (18/10/2026):** `PUT /players/{id}`, `PATCH /players/{id}/condition` e `DELETE /players/{id}` já travam a linha do jogador ativo (`SELECT id FROM jogadores WHERE id = … AND excluido_em IS NULL FOR UPDATE`, em `PlayersService.lockActivePlayer`) antes das checagens de 409. A compra e a venda vão travar a mesma linha, então essas operações não se cruzam.

## ADR-008 — Relógio injetável

- **Status:** Aceita (15/10/2026); implementada em 18/10/2026
- **Decisão:** provider `Clock` com `now()`; testes fixam o instante.
- **Implementação:** `common/clock/` (`Clock` abstrato, `SystemClock`, `ClockModule` global). Os e2e trocam o provider por `TestClock` (`test/test-clock.ts`), que começa em 02/11/2026 10:15 (−03:00) e permite `setBrasilia()`. Datas gravadas por operações (contrato, transação, exclusão) vêm do `Clock`, não do `now()` do banco, para que "o instante exato do servidor na operação" (RN01) seja o mesmo em toda a operação.
- **Consequências:** RN15 e o limite de 1.095 dias testáveis de forma determinística sem mocks globais de `Date`.

## ADR-009 — Frontend sem biblioteca de cache de dados

- **Status:** Aceita (15/10/2026, com a arquitetura aprovada)
- **Contexto:** o enunciado sugere `useState`/`useEffect`; cada ação precisa refazer a consulta afetada e impedir duplo envio.
- **Decisão:** hooks próprios pequenos (`useQuery`-like com `refetch` e `AbortController`; `useAction` com estado pendente + guarda por `ref`).
- **Alternativa:** TanStack Query (cache, invalidação e estados prontos; +1 dependência a justificar).
- **Implementação (Etapa 5.1, 18/10/2026):** `shared/hooks/use-api-query.ts` carrega com `AbortController`, descarta respostas atrasadas e expõe `data`, `error`, `isLoading` e `retry`. A atualização sem recarregar a página usa uma "versão dos dados" (`DataRefreshProvider`): `refreshAll()` muda a versão e **todas** as consultas abertas recarregam. Com poucas consultas por tela, recarregar tudo é mais simples e mais seguro que escolher o que invalidar (nenhuma ação deixa dado velho na tela, como o caixa no menu de clubes). Quem chama `refreshAll`: o botão "Atualizar dados" do topo (hoje) e o futuro `useApiAction`, depois de cada ação gravada (Etapa 5.3).

## ADR-010 — Formulários com React Hook Form + Zod

- **Status:** Aceita (15/10/2026)
- **Contexto:** 7 formulários com mensagens junto ao campo (F2).
- **Decisão:** RHF (estado de formulário sem re-render a cada tecla) + Zod (schemas tipados, com o tipo do formulário inferido).
- **Alternativa:** formulários controlados à mão (mais código repetido entre 7 formulários → risco em F2 › Componentes).
- **Implementação (Etapa 5.3, 18/10/2026):** `react-hook-form` 7.90, `zod` 4.6 e `@hookform/resolvers` 5.9.1 (o adaptador `zodResolver`; a 5.9.2 tinha saído no dia anterior e não foi usada). Os campos são texto no formulário e o Zod converte para número JSON (vazio, fração ou texto viram erro, nunca 0). O tipo do corpo enviado vem do schema (`useForm<Entrada, unknown, Saída>`). Custo: o JS do build passou de 304 kB para 450 kB (140 kB gzip), quase todo o aumento vem do Zod.

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

## ADR-013 — Uma regra de validação por campo (`SatisfiesRule`)

- **Status:** Aceita (17/10/2026, Etapa 4.1)
- **Contexto:** campos como o nome do clube têm várias condições em ordem (obrigatório → texto → sem controle → tamanho → caracteres → palavras). Com um decorator por condição, o class-validator avalia todos e pode devolver uma mensagem que não é a da causa real (ex.: "tamanho inválido" para um `null`).
- **Decisão:** cada campo com regra composta usa uma função pura `(value, object) => mensagem | undefined`, aplicada por um único decorator genérico (`common/validation/validation-rule.decorator.ts`). As condições ficam em ordem e são testáveis sem HTTP (`clubs/dto/club-input.rules.ts`). A V4 é aplicada antes por `@NormalizeSpaces()`.
- **Alternativas:** vários decorators do class-validator com `stopAtFirstError` (a ordem de avaliação depende da ordem de registro dos decorators, que é pouco evidente); validação no service (o barema exige mecanismo declarado antes do endpoint).
- **Consequências:** mensagens precisas e regras reaproveitáveis pelo cadastro de jogadores.

## ADR-014 — Criação de clube serializada por advisory lock

- **Status:** Aceita (17/10/2026, Etapa 4.1)
- **Contexto:** o limite de 20 clubes (RN10) depende de uma contagem. Com isolamento READ COMMITTED, dois pedidos simultâneos podem contar 19 e gravar o 20º e o 21º. As unicidades de nome e sigla já têm índice único, mas o limite não tem restrição no banco.
- **Decisão:** a criação roda numa transação que começa com `SELECT pg_advisory_xact_lock(10001)` (SQL parametrizado). As criações de clube entram em fila, e o lock é liberado sozinho no fim da transação. Os índices únicos continuam como última garantia: erro `P2002` vira 409.
- **Alternativas:** isolamento `Serializable` com nova tentativa (mais código para tratar `P2034`); `LOCK TABLE clubes` (bloqueia também as leituras de clubes); trigger no banco (regra fora do código da aplicação).
- **Evidência:** teste e2e com 4 pedidos simultâneos a partir de 18 clubes resulta em exatamente 20. Removendo o lock (mutação temporária), o teste falhou nas 3 execuções.

## ADR-015 — Banco exclusivo para os testes e2e

- **Status:** Aceita (17/10/2026, Etapa 4.1)
- **Decisão:** os e2e usam `passe_test`, no mesmo container, com URL fixa ou `TEST_DATABASE_URL`. O `globalSetup` aplica as migrations (`migrate deploy`, que cria o banco se não existir); cada teste começa com `TRUNCATE … RESTART IDENTITY`. Uma trava recusa limpar qualquer banco cujo nome não termine em `_test`. Os e2e rodam em sequência (`maxWorkers: 1`), porque compartilham o banco.
- **Consequências:** o banco de desenvolvimento nunca é tocado pelos testes; `npm run test:e2e` exige o container do banco ligado. `npm test` (unitários) continua sem depender de banco, que é o comando do diferencial B5.

## ADR-016 — Versões e bibliotecas do frontend

- **Status:** Aceita (18/10/2026, Etapa 5.1)
- **Contexto:** o regulamento aceita React 18+ com Vite (template oficial) e Node 20/22 LTS; React Router só no modo biblioteca. A banca instala o Node 22 e executa `npm ci`; uma dependência que exija versão mais nova do Node quebra a instalação.
- **Decisão** (versões conferidas com `npm view` em 18/10/2026):

  | Pacote | Escolhida | Mais recente | Motivo |
  | --- | --- | --- | --- |
  | React / React DOM | 19.3 | 19.3 | `useEffectEvent` estável (usado no `useApiQuery`) |
  | Vite + `@vitejs/plugin-react` | 8.3 / 6.1 | igual | Node `^20.19 \|\| >=22.12` |
  | React Router | 7.18 | 8.4 | o 8 exige Node `>=22.22`, risco na máquina da banca; o 7 tem o modo biblioteca (`BrowserRouter`/`Routes`) maduro |
  | Tailwind CSS + `@tailwindcss/vite` | 4.3 | igual | tokens em CSS (`@theme`), sem arquivo de configuração |
  | TypeScript | 5.9 | 7.0 | mesma versão do backend; `typescript-eslint` 8 aceita `<6.1` |
  | ESLint | 9.39 | 10.x | mesma linha do backend (ADR-001) |
  | Vitest + jsdom | 4.1 + 29.1 | 5.0 + 30.1 | o jsdom 30 exige Node `>=22.22`; o Vitest 4 aceita Node 20/22 |
  | Testing Library (`react`, `dom`, `jest-dom`, `user-event`) | 16 / 10 / 6 / 14 | — | testes de componente pelo comportamento visível |
  | `lucide-react` | 1.59 | igual | o Figma identifica cada ícone como Lucide (descrição dos componentes `Icon/*`); usar o pacote mantém o traço idêntico sem copiar SVGs |
  | `@fontsource-variable/geist` | 5.3 | igual | fonte Geist do Figma servida pelo próprio build (sem CDN em tempo de execução) |

- **Adiadas:** React Hook Form e Zod (ADR-010) entram na Etapa 5.3, com o primeiro formulário; instalar antes deixaria dependências sem uso. (Instaladas na 5.3; versões na ADR-010.)
- **Alternativas:** Axios (o `fetch` nativo basta: um cliente de 100 linhas cobre prefixo, JSON, erros e cancelamento); `prettier-plugin-tailwindcss` (ordenação de classes; dispensável).
- **Consequências:** `npm audit` sem vulnerabilidades na instalação. O `eslint@9` aparece como "não suportado" no npm desde o lançamento do 10; atualizar exige nova ADR para as duas pastas.

## ADR-017 — Componentes próprios com os tokens do Figma, sem shadcn/ui

- **Status:** Aceita (18/10/2026, Etapa 5.1)
- **Contexto:** o design system do Figma foi feito sobre o shadcn/ui (nomes de variáveis, descrições "shadcn/ui Button", "shadcn/ui Sidebar"). O shadcn/ui é permitido pelo enunciado, mas copia componentes para o projeto e traz dependências (Radix, `class-variance-authority`, `tailwind-merge`, `clsx`).
- **Decisão:** componentes próprios, pequenos, criados quando uma tela precisa deles, com os **mesmos nomes de tokens** do Figma em `@theme`. Variantes por mapas de classes (`Button`) e um `cx` de 3 linhas para classes condicionais.
- **Alternativas:** `npx shadcn init` + componentes (fidelidade imediata, mas dezenas de arquivos e variantes sem uso, o que pesa no F2 › código sem uso); MUI (visual diferente do mockup).
- **Consequências:** cada componente tem só as variantes usadas; dialogs e menus precisarão de cuidado próprio com foco e teclado (Etapa 5.3: `<dialog>` nativo).

## ADR-018 — Tipos do frontend no formato da API (snake_case), sem conversão

- **Status:** Aceita (18/10/2026, Etapa 5.1)
- **Contexto:** a API responde em snake_case (`squad_value`, `net_worth`); identificadores do código são em camelCase. O barema (F2 › nomes fora do padrão) não conta campos da API em snake_case.
- **Decisão:** os tipos em `features/*/api.ts` espelham o contrato da API; não há camada de conversão. Variáveis e funções do frontend continuam em camelCase.
- **Alternativas:** converter na camada `api/` (mais código e um ponto a mais de erro, sem ganho para o avaliador; o mesmo nome aparece no Swagger, no README oficial e na tela).
- **Consequências:** a URL base vem de `VITE_API_URL` (origem sem `/api/v1`; o cliente acrescenta o prefixo e aceita a origem já com ele); sem a variável, usa `http://localhost:3000`, para o caminho do README funcionar sem `.env` no frontend.

## ADR-019 — Estado da lista de jogadores e lista de clubes compartilhada

- **Status:** Aceita (18/10/2026, Etapa 5.2)
- **Contexto:** a lista de jogadores combina busca, 6 filtros, ordenação e página; toda mudança de filtro volta à página 1; respostas atrasadas não podem substituir uma consulta mais nova; a coluna "Clube" e o filtro por clube precisam do nome do clube, mas `GET /players` devolve só `club_id`.
- **Decisão:**
  1. `usePlayerList` guarda filtros (já no formato da API), texto da busca e página. A consulta é montada por uma função pura (`buildPlayerQuery`) e lida com `useApiQuery` (chave = query params), que cancela o pedido anterior e descarta respostas antigas (ADR-009).
  2. A página vale só para a consulta em que foi escolhida: quando os filtros mudam, o estado é ajustado durante a renderização (padrão "estado derivado de props" do React), sem `useEffect`. Voltar aos mesmos filtros depois não restaura a página antiga (bug achado na validação real e coberto por teste).
  3. A busca usa debounce de 300 ms; apagar a busca vale na hora; menos de 2 caracteres não é enviado.
  4. A lista de `GET /clubs` que o layout já carrega para o menu é compartilhada por `ClubsContext`: a tabela e o filtro de clube usam o mesmo pedido, sem um pedido por linha nem por tela.
  5. Filtros ficam no estado da tela, não na URL.
- **Alternativas:** filtros na URL (`useSearchParams`) — sobrevivem ao recarregar, mas exigem validar parâmetros digitados à mão e não são pedidos pelo enunciado; contagem nas três abas (como no Figma) — 2 consultas extras a cada mudança de filtro; um `GET /clubs/{id}` por linha — proibido pelo pedido do usuário e desnecessário.
- **Consequências:** ao sair da tela de jogadores e voltar, os filtros recomeçam vazios.

## ADR-020 — Ações de escrita: diálogo próprio, trava contra envio duplo, avisos e validação dividida

- **Status:** Aceita (18/10/2026, Etapa 5.3)
- **Contexto:** as ações de jogador (cadastrar, editar, alterar condição, excluir) abrem diálogos, precisam impedir o envio duplo (F3: o HAR deve mostrar um só pedido), mostrar sucesso ou o `message` da API e atualizar a lista sem recarregar.
- **Decisão:**
  1. **`Dialog` próprio** (portal, `role="dialog"` + `aria-modal`, foco preso, Esc, foco devolvido a quem abriu). Título, aviso de erro (`notice`) e rodapé ficam fixos; só o conteúdo rola — o cadastro (11 campos) não cabe em 1366 × 768.
  2. **`useApiAction`**: trava síncrona por `ref` (o clique duplo chega antes de o React desabilitar o botão), `isPending` para desabilitar o botão, `error` com o `ApiError` original, callbacks `onSuccess`/`onError` e nenhuma atualização de estado depois de desmontar. O hook **não** atualiza a lista: quem chama decide (`refreshAll`, ADR-009).
  3. **Avisos**: `ToastProvider` (sucesso com `role="status"`, erro com `role="alert"`) para edição, condição e exclusão; o cadastro mostra o resultado num diálogo (Figma J07) com valor base, valor de mercado e overall **da resposta do 201**. Recusas da API aparecem dentro do diálogo, que continua aberto e com os dados.
  4. **Validação dividida**: na tela, só obrigatórios, formato e tamanho do nome (regras V4 iguais às do backend, em `shared/lib/text.ts`), faixas de um campo e os bloqueios que o enunciado permite (idade menor na edição, posição de jogador com clube, Doente → Apto, excluir jogador com clube). Regras que cruzam campos (idade × agilidade, soma dos atributos, potencial) ficam só na API; a tela mostra o `message`.
  5. 404 ou 409 numa ação aberta recarregam a lista (os dados mudaram depois que a tela abriu).
- **Alternativas:** `<dialog>` nativo com `showModal()` (o jsdom dos testes não implementa; os testes não poderiam verificar foco e Esc); biblioteca de componentes (Radix/shadcn, rejeitada na ADR-017); `refreshAll` automático dentro do `useApiAction` (acoplaria o hook à lista, contra o pedido do usuário); repetir no Zod as regras cruzadas (duas fontes da mesma regra).
- **Consequências:** o menu de ações da linha também abre num portal com posição fixa, para não ser cortado pela rolagem da tabela, e fecha ao rolar a página.
