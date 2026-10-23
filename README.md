# Passe — Mercado de jogadores da liga

Estudo de Caso SENAI/PE – CÓD. 237 Desenvolvedor I (Fullstack). Enunciado oficial: [isi-tics/desafio-isi-dev-1](https://github.com/isi-tics/desafio-isi-dev-1).

Sistema de uma liga fictícia: cadastro de jogadores e clubes, compra e venda com contrato e multa, histórico financeiro com exportação CSV, escalação, partidas por duelos e classificação. API NestJS + PostgreSQL e interface React, seguindo o mockup do Figma.

Documentação de apoio: [docs/](docs/) (arquitetura, modelo de dados, decisões, progresso e registro de testes).

## 1. Pré-requisitos

| Ferramenta | Versão |
| --- | --- |
| Node.js (com npm) | 22 LTS (22.12 ou superior, exigido pelo Vite) |
| Docker Engine com Docker Compose v2 | 24 ou superior |
| PostgreSQL | 16 (imagem pública `postgres:16-alpine`, iniciada pelo Docker Compose) |

## 2. Banco de dados

O banco é criado vazio pelas migrations versionadas em `backend/prisma/migrations` (sem jogadores, clubes, transações nem partidas).

```bash
# Na raiz do repositório: inicia o PostgreSQL (porta 5433 no host)
docker compose up -d db

# Na pasta backend: cria as tabelas
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
```

Recriar o banco do zero (apaga tudo e aplica as migrations de novo; o banco volta vazio):

```bash
# Na pasta backend
npx prisma migrate reset --force
```

## 3. Instalar e executar

```bash
# Banco de dados (na raiz do repositório)
docker compose up -d db

# Backend (na pasta backend)
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run build
npm run start:prod
```

- Origem da API: `http://localhost:3000` (as rotas ficam sob `/api/v1`).
- Documentação interativa (Swagger): `http://localhost:3000/api/docs`.

```bash
# Frontend (em outro terminal, a partir da raiz do repositório)
cd frontend
npm ci
npm run dev
```

- Interface: `http://localhost:5173` (a API precisa estar no ar; sem `frontend/.env`, o frontend usa a API em `http://localhost:3000`).
- Arquivos de trava versionados: `backend/package-lock.json` e `frontend/package-lock.json` (`npm ci` instala exatamente essas versões).

### Alternativa: tudo com Docker (um comando)

```bash
# Na raiz do repositório: sobe banco, API e interface (o build leva alguns minutos na primeira vez)
docker compose up -d --build
```

- Interface: `http://localhost:5173`; origem da API: `http://localhost:3000` (Swagger em `/api/docs`).
- A API aplica as migrations ao subir; o banco novo começa vazio. As portas 5173, 3000 e 5433 precisam estar livres (não rode ao mesmo tempo o `npm run start:prod` e o `npm run dev` da seção acima).
- Recriar o banco do zero no Docker: `docker compose down -v` e `docker compose up -d --build`.
- Logs da API: `docker compose logs -f api`.

### Testes e qualidade (na pasta backend)

```bash
npm test              # testes unitários (terminam sozinhos)
npm run test:e2e      # testes e2e da API (exigem o banco ligado; usam o banco separado passe_test, criado sozinho)
npm run lint          # ESLint
npm run format:check  # Prettier, só verifica
```

### Testes e qualidade (na pasta frontend)

```bash
npm test              # testes de componente com Vitest (terminam sozinhos, sem modo de observação)
npm run lint          # ESLint
npm run format:check  # Prettier, só verifica
npm run build         # checagem de tipos + build de produção em dist/
```

Os logs da API saem no terminal do `npm run start:prod`: uma linha por requisição, com data e hora, método, caminho e status (Logger do NestJS).

## 4. Variáveis de ambiente

Backend, arquivo de exemplo [backend/.env.example](backend/.env.example):

| Variável | Uso | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | conexão do Prisma com o PostgreSQL | `postgresql://passe:passe@localhost:5433/passe?schema=public` |
| `PORT` | porta HTTP da API (padrão 3000) | `3000` |
| `CORS_ORIGIN` | origens do frontend liberadas no CORS, separadas por vírgula (nunca `*`) | `http://localhost:5173` |
| `TEST_DATABASE_URL` | opcional, só nos testes e2e: banco de testes (o nome precisa terminar em `_test`) | `postgresql://passe:passe@localhost:5433/passe_test?schema=public` |

No Docker Compose, as variáveis da API já estão no `docker-compose.yml`; `DB_PORT`, `API_PORT` e `WEB_PORT` (opcionais, padrão 5433, 3000 e 5173) mudam as portas do host.

Frontend, arquivo de exemplo [frontend/.env.example](frontend/.env.example) (opcional; para usar, `cp .env.example .env` na pasta frontend antes do `npm run dev`):

| Variável | Uso | Exemplo |
| --- | --- | --- |
| `VITE_API_URL` | origem da API, sem `/api/v1` (o frontend acrescenta o prefixo); padrão `http://localhost:3000` | `http://localhost:3000` |

## 5. Estrutura de pastas e bibliotecas

```text
backend/              API NestJS
├── prisma/           schema do Prisma e migrations versionadas
├── src/
│   ├── common/       erros, pipes, filtro de exceções, logs, relógio, validação e funções de domínio comuns
│   ├── config/       leitura e validação das variáveis de ambiente
│   ├── players/      jogadores (RN02–RN09): domínio puro (overall, valor base, valor de mercado), DTOs, service
│   ├── clubs/        clubes (RN10–RN11)
│   ├── market/       compra, venda, contratos, histórico e CSV (RN12–RN18)
│   ├── league/       escalação, partidas e classificação (RN19–RN21)
│   └── prisma/       PrismaService e conversão de valores
└── test/             testes e2e (banco passe_test)
frontend/             interface React (Vite)
├── public/           favicon
└── src/
    ├── app/          rotas e layout (menu lateral, topo, trilha)
    ├── features/     telas e chamadas à API por funcionalidade (players, clubs, market, league)
    ├── shared/       cliente HTTP, hooks de dados e componentes reutilizáveis
    ├── styles/       Tailwind CSS e tokens do design system
    └── test/         configuração e utilitários dos testes
docs/                 planejamento, arquitetura, decisões (ADRs) e progresso
```

Bibliotecas do backend além da stack obrigatória:

| Biblioteca | Motivo |
| --- | --- |
| `@nestjs/config` | carregar o `.env` e validar as variáveis na inicialização |
| `@nestjs/swagger` | documentação interativa da API gerada a partir dos DTOs |
| `@prisma/client`, `prisma` | ORM com migrations versionadas e consultas parametrizadas |
| `class-validator`, `class-transformer` | validação declarativa dos corpos de requisição (DTOs) |
| `jest`, `ts-jest`, `supertest`, `@nestjs/testing` | testes unitários e e2e |
| `eslint`, `typescript-eslint`, `eslint-config-prettier`, `prettier` | lint e formatação |

Bibliotecas do frontend além da stack obrigatória (React + Vite):

| Biblioteca | Motivo |
| --- | --- |
| `react-router` | rotas no modo biblioteca (`BrowserRouter`, `Routes`) |
| `tailwindcss`, `@tailwindcss/vite` | estilos com os tokens do design system do mockup |
| `lucide-react` | ícones; é o conjunto usado no mockup do Figma |
| `@fontsource-variable/geist` | fonte Geist do mockup, servida pelo próprio build |
| `react-hook-form` | estado dos formulários (jogador, clube e compra), sem redesenhar a tela a cada tecla |
| `zod`, `@hookform/resolvers` | validação dos campos antes de enviar, com o tipo do corpo da API inferido do schema |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` | testes de componente |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `globals`, `prettier` | lint e formatação |

## 6. Decisões e premissas

Detalhes que o enunciado não definiu ou deixou à escolha; o registro completo, com alternativas, está em [docs/decisions.md](docs/decisions.md) (ADR-001 a ADR-026).

- **Dinheiro:** inteiro em centavos no domínio, `NUMERIC` no banco, um único arredondamento (meio para longe do zero) no resultado de cada cálculo (ADR-002).
- **"Agora":** um relógio injetável (`Clock`) em todas as regras de data; datas de saída sempre com `-03:00` (ADR-008).
- **Validação:** corpo com campo de tipo errado (ex.: `"10"` no lugar de `10`) é recusado com 400, sem conversão automática; ids de URL fora do formato respondem 404 (ADR-012).
- **Concorrência:** compra, venda, escalação e partida rodam numa transação, travando jogador antes do clube (`SELECT … FOR UPDATE`), para não haver dupla compra nem venda de quem saiu do clube (ADR-007). A criação de clube é serializada para o limite de 20 (ADR-014).
- **Unicidade do nome do clube:** coluna normalizada (minúsculas, acentos mantidos) com índice único (ADR-006).
- **Listagem de jogadores:** filtros simples no banco; valor de mercado e ordenação calculados na aplicação, com a função única do domínio (ADR-004).
- **Histórico e CSV:** a mesma consulta e os mesmos filtros nos dois endpoints; CSV em UTF-8 sem BOM, com LF (ADR-022).
- **Escalação e partida:** a partida trava os dois clubes durante o cálculo, para uma venda simultânea não tirar um titular no meio; os duelos são gravados com os dados do momento e nunca recalculados (ADR-026).
- **Mensagens de erro:** em português, com o valor que causou a recusa quando ajuda (ex.: custo e limite de caixa).
- **Interface:** componentes próprios com os tokens do Figma, sem biblioteca de componentes (ADR-017); depois de cada ação gravada, todas as consultas abertas são refeitas na API, sem recarregar a página (ADR-009); compra e venda conferem o jogador antes de deixar tentar de novo após falha de rede, para não duplicar a operação (ADR-024).
- **Datas digitadas na tela:** a fidelidade é digitada em campos de data e hora e enviada como `AAAA-MM-DDTHH:MM-03:00`, sem depender do fuso do navegador (ADR-024).
- **Opcionais do mockup não implementados:** tela inicial, contadores do menu, cartão "Última partida" da sidebar, campo "Em campo" com os jogadores desenhados e lista de reservas da escalação.

## 7. Funcionalidades não implementadas

Todas as funcionalidades obrigatórias do enunciado estão implementadas (API e interface). Não implementados:

- **Índice único de contrato ATIVO no banco** (ADR-023): a regra é garantida pela transação com trava do jogador; o índice ficou como proposta.
- Elementos opcionais do mockup listados no fim da seção 6.

## 8. Uso de inteligência artificial

- **Ferramenta:** Claude Code (modelo Claude Opus, da Anthropic), no VS Code, com o conector do Figma para ler os frames do mockup.
- **Onde:** em todo o projeto: planejamento das etapas, código do backend e do frontend, testes unitários, e2e e de componente, documentação (`docs/`) e este README. Os commits com participação da IA trazem o co-autor (aceito pela issue #2 do repositório oficial).
- **Como:** em etapas pequenas definidas por mim, cada uma com um prompt próprio; a IA lia o enunciado, o código existente e as ADRs, implementava só a etapa, rodava testes, lint e build, validava a aplicação real num banco de teste separado e parava para a minha revisão antes de seguir. O registro de cada sessão, com arquivos e verificações, está em [docs/progress.md](docs/progress.md#registro-de-uso-de-ia-base-para-a-seção-obrigatória-do-readme).
- **Por quê:** acelerar a escrita de código e testes repetitivos e conferir as regras do enunciado e os exemplos oficiais com mais testes do que eu escreveria sozinho no prazo.
- **O que foi aceito, alterado ou descartado:** aceitei a arquitetura em camadas, as funções puras de domínio e os testes com os exemplos oficiais. Alterei a ordem das etapas, os textos da interface e algumas decisões propostas (ex.: tela mobile fora do escopo visual, só sem rolagem horizontal). Descartei sugestões que fugiam da stack (bibliotecas de cache e de componentes) e a migration do índice de contrato ativo, que ficou só como proposta. Revisei e commitei cada etapa manualmente.
