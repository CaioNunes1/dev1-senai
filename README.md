# Passe — Mercado de jogadores da liga

Estudo de Caso SENAI/PE – CÓD. 237 Desenvolvedor I (Fullstack). Enunciado oficial: [isi-tics/desafio-isi-dev-1](https://github.com/isi-tics/desafio-isi-dev-1).

> Projeto em desenvolvimento incremental. Este README é completado a cada etapa; o andamento está em [docs/progress.md](docs/progress.md).

## 1. Pré-requisitos

| Ferramenta | Versão |
| --- | --- |
| Node.js (com npm) | 22 LTS |
| Docker Engine com Docker Compose v2 | 24 ou superior |
| PostgreSQL | 16 (imagem pública `postgres:16-alpine`, iniciada pelo Docker Compose) |

## 2. Banco de dados

```bash
# Na raiz do repositório: inicia o PostgreSQL (porta 5433 no host)
docker compose up -d db

# Na pasta backend: cria as tabelas pelas migrations versionadas
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
# Backend (na pasta backend)
cd backend
cp .env.example .env
npm ci
npm run build
npm run start:prod
```

- Origem da API: `http://localhost:3000` (as rotas ficam sob `/api/v1`).
- Documentação interativa (Swagger): `http://localhost:3000/api/docs`.
- Frontend: entra na Etapa 5.

### Testes e qualidade (na pasta backend)

```bash
npm test              # testes unitários (terminam sozinhos)
npm run test:e2e      # testes e2e da API (exigem o banco ligado; usam o banco separado passe_test)
npm run lint          # ESLint
npm run format:check  # Prettier, só verifica
```

## 4. Variáveis de ambiente

Arquivo de exemplo: [backend/.env.example](backend/.env.example).

| Variável | Uso | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | conexão do Prisma com o PostgreSQL | `postgresql://passe:passe@localhost:5433/passe?schema=public` |
| `PORT` | porta HTTP da API (padrão 3000) | `3000` |
| `CORS_ORIGIN` | origens do frontend liberadas no CORS, separadas por vírgula (nunca `*`) | `http://localhost:5173` |
| `TEST_DATABASE_URL` | opcional, só nos testes e2e: banco de testes (padrão abaixo; o nome precisa terminar em `_test`) | `postgresql://passe:passe@localhost:5433/passe_test?schema=public` |

## 5. Estrutura de pastas e bibliotecas

```text
backend/              API NestJS
├── prisma/           schema do Prisma e migrations versionadas
├── src/
│   ├── common/       erros, pipes, filtro de exceções, logs e validação compartilhados
│   ├── config/       leitura e validação das variáveis de ambiente
│   └── prisma/       PrismaService
└── test/             testes e2e
docs/                 planejamento, arquitetura e decisões
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

## 6. Decisões e premissas

Registradas em [docs/decisions.md](docs/decisions.md); resumo final nesta seção ao término do projeto.

## 7. Funcionalidades não implementadas

Projeto em andamento.

## 8. Uso de inteligência artificial

Registro em andamento em [docs/progress.md](docs/progress.md#registro-de-uso-de-ia-base-para-a-seção-obrigatória-do-readme); a seção final é consolidada na entrega.
