# CLAUDE.md — Instruções permanentes do projeto

Projeto de entrega do **Estudo de Caso SENAI/PE – CÓD. 237 Desenvolvedor I (Fullstack)**: mercado de jogadores de uma liga fictícia (jogadores, clubes, compra/venda com contrato, histórico, escalação, partidas e classificação).

## Fontes de requisitos (ordem de prevalência)

1. Regulamento (documento recebido por e-mail; fora da seção 4 e do barema).
2. Erratas (publicadas a partir de 16/10/2026 — conferir antes de cada etapa).
3. [`barema.md`](https://github.com/isi-tics/desafio-isi-dev-1/blob/main/barema.md) — pontuação.
4. [`README.md`](https://github.com/isi-tics/desafio-isi-dev-1/blob/main/README.md) — requisitos (RN01–RN21, V1–V9, contrato da API, tabelas).
5. Informativos: glossário, mockup Figma (v1.0), ficha de avaliação de exemplo.

- Repositório oficial: https://github.com/isi-tics/desafio-isi-dev-1 (snapshot lido: commit `b3fba707`, 13/10/2026). **Nunca commitar nele.**
- Issues com esclarecimentos: #2 (co-author de IA nos commits é aceito; declarar uso no README) e #3 (tipos só são conferidos nas colunas de moeda; ENUM permitido; IDs inteiros; limites podem ficar só na API).
- Figma: https://www.figma.com/design/oevjrS0eaqL3VHSvKYB8GS/Passe — páginas "Telas · Desktop", "Telas · Mobile", "Sistema de design".
- Em caso de dúvida sobre uma regra, **reler o trecho oficial** em vez de confiar em resumos. Não inventar requisitos, telas ou cores.

## Documentação do projeto (ler no início de cada sessão)

| Arquivo | Conteúdo |
| --- | --- |
| [docs/progress.md](docs/progress.md) | Estado atual, próximo passo, registro de uso de IA |
| [docs/roadmap.md](docs/roadmap.md) | Etapas, critérios de aceite, comandos |
| [docs/requirements.md](docs/requirements.md) | Rastreabilidade RN → endpoint → barema → teste; armadilhas |
| [docs/architecture.md](docs/architecture.md) | Módulos, camadas, fluxo de erros |
| [docs/data-model.md](docs/data-model.md) | 7 tabelas, mapeamento Prisma, restrições |
| [docs/frontend-design.md](docs/frontend-design.md) | Estrutura do frontend, tokens, telas |
| [docs/decisions.md](docs/decisions.md) | ADRs (decisões e alternativas) |

## Stack

- Backend: Node.js **22 LTS**, TypeScript, NestJS, Prisma, PostgreSQL 16, Jest + Supertest, class-validator, @nestjs/swagger.
- Frontend: React + Vite (template `react-ts`), Tailwind CSS v4, React Router (**modo declarativo/biblioteca — nunca modo framework**), React Hook Form + Zod, Vitest + Testing Library.
- Infra: Docker Compose (imagens públicas oficiais), ESLint + Prettier nas duas pastas.
- Tecnologia fora da stack do enunciado **elimina** o candidato. Toda biblioteca nova precisa de justificativa registrada em `docs/decisions.md` e, depois, no README.

## Regras de código

- Identificadores em **inglês** (camelCase / PascalCase); mensagens ao usuário em **português**. Exceções definidas pelo enunciado: campos da API em snake_case, valores de lista (`APTO`, `COMPRA`…), nomes de tabelas/colunas (mapeados via `@@map`/`@map`).
- Controllers não calculam regra nem acessam o banco. Cada um dos 6 cálculos (valor de mercado, overall, taxa, multa [dias + %], comissão, placar) existe em **um único lugar**, em funções puras de domínio.
- Dinheiro no domínio: **inteiro em centavos**; um único helper de arredondamento meio-para-longe-do-zero. No banco: `NUMERIC`.
- Datas: entrada estrita `AAAA-MM-DDTHH:MM-03:00`; saída `AAAA-MM-DDTHH:MM:SS-03:00`; "agora" vem de um `Clock` injetável.
- Toda recusa passa pelo filtro global de exceções e responde `{ "message": string }` sem stack trace.
- Compra, venda, partida, escalação e alteração de condição que tira titular: **uma transação do banco** cada.
- Sem código comentado, sem código morto, sem `console.log` (usar `Logger` do Nest).
- Frontend: nenhuma chamada HTTP dentro de componentes (camada `api/` + hooks); nenhuma regra recalculada na tela (exceto custo total = valor + taxa).

## Protocolo de trabalho (obrigatório)

1. Ler este arquivo, `docs/roadmap.md` e `docs/progress.md`.
2. Analisar o código existente antes de alterar.
3. Descrever brevemente a mudança proposta.
4. Implementar **somente** o escopo da etapa autorizada.
5. Não refatorar módulos não relacionados sem justificar.
6. Não alterar silenciosamente contratos públicos, migrations já aplicadas ou decisões registradas (registrar nova ADR).
7. Escrever/atualizar testes pertinentes.
8. Rodar testes, lint e build aplicáveis; informar o que foi e o que não foi validado.
9. Atualizar `docs/progress.md` (e demais docs afetados).
10. Resumir arquivos alterados, decisões e riscos.
11. **Parar e aguardar autorização** para a próxima etapa.

**Proibido sem autorização explícita do usuário:** `git commit`, `git push`, instalação global, ações destrutivas (apagar arquivos/volumes, `migrate reset` fora do banco de teste).

## Comandos (preenchidos conforme as etapas avançam)

| Objetivo | Comando | Pasta |
| --- | --- | --- |
| Subir banco | `docker compose up -d db` (porta **5433** no host) | raiz |
| Criar tabelas | `npx prisma migrate deploy` | backend |
| Nova migration (dev) | `npx prisma migrate dev --name <descricao>` | backend |
| Recriar banco do zero | `npx prisma migrate reset --force` (**só com autorização** no banco de dev) | backend |
| Instalar | `npm ci` (roda `prisma generate`) | backend |
| Build / executar | `npm run build` · `npm run start:prod` · `npm run start:dev` | backend |
| Testes | `npm test` (unitários) · `npm run test:e2e` | backend |
| Qualidade | `npm run lint` · `npm run format:check` | backend |
| Instalar / executar | `npm ci` · `npm run dev` (http://localhost:5173) | frontend |
| Testes / qualidade / build | `npm test` · `npm run lint` · `npm run format:check` · `npm run build` | frontend |

Notas da Etapa 5.1 (frontend):
- Figma lido pela **cópia** `Gin5aRF66GIyoTTOUbEygQ` (o conector exige permissão de edição); "Telas · Desktop" = nó `2:2`. Telas mobile **fora do escopo** (decisão do usuário); o layout só não pode ter rolagem horizontal em 375 px.
- Cores, raios, sombras e medidas só por tokens de `src/styles/index.css` (`@theme`); nada de hexadecimal ou `[valor]` arbitrário nos componentes. Ícones: `lucide-react` (o Figma indica o nome de cada um).
- `fetch` só em `shared/api/http-client.ts`; funções por recurso em `features/*/api.ts`; leitura com `useApiQuery`; depois de cada ação gravada, `refreshAll()` (ADR-009).
- Tipos no formato da API (snake_case), sem conversão (ADR-018). Componentes próprios, sem shadcn/ui (ADR-017); criar um componente compartilhado só quando uma tela o usar.
- Verificação visual: Chrome headless pelo protocolo DevTools (`Emulation.setDeviceMetricsOverride`), porque `--window-size` não desce a 375 px. Encerrar Vite e Chrome pelo PID (portas 5173 e a do DevTools).

Notas da Etapa 1:
- Versões fixadas: Nest 11, TypeScript 5.9, Prisma 6, ESLint 9 (motivos na ADR-001). Não atualizar majors sem nova ADR.
- Nunca usar `ValidationPipe`/`ParseIntPipe` padrão: usar `StrictValidationPipe` (global) e `ParseIdPipe` (ADR-012).
- Lançar `InvalidInputError` / `ResourceNotFoundError` / `BusinessRuleError`, não `HttpException`.
- Para parar um servidor iniciado em teste manual, encerrar **pelo PID**, nunca todos os processos `node`. No Windows, o `kill` do Git Bash não encerra o `node.exe`: usar `Stop-Process -Id <pid>` no PowerShell (achar o PID com `Get-NetTCPConnection -LocalPort 3000`).
- Testes manuais com acentos: não usar `curl` do Git Bash (corrompe acentos); usar `fetch` do Node, o Swagger ou o Postman.

Notas da Etapa 4.1:
- E2E usam o banco `passe_test` (ADR-015); nunca apontar testes para `passe`. `npm run test:e2e` exige o container ligado.
- Campo com regra composta: função pura `(value, object) => mensagem | undefined` + `@SatisfiesRule` (ADR-013); V4 com `@NormalizeSpaces()`.
- Decimal ↔ centavos só por `prisma/decimal.ts`; `Location` por `resourceLocation()` (`common/http/api.constants.ts`).

Notas das Etapas 3.2–3.4:
- Query params: validar e converter com os parsers de `common/validation/query-params.ts` num pipe (`PlayerListQueryPipe` é o modelo); nunca ler `@Query()` cru no service.
- Valor de mercado de um jogador gravado: sempre `marketValueOf(player)` (`players/player.mapper.ts`), que é a única ponte para `calculateMarketValue`.
- Dados de teste com empates devem ter ids em ordem **contrária** à dos nomes, senão o desempate por nome não é verificado (achado por mutação em 18/10).
- Testes e2e completos levam ~1,5 min; rodar em sequência, nunca com outro e2e em paralelo.

Notas de 4.2, compra, 4.3 e venda:
- "Agora" sempre por `Clock` (injetado); nunca `new Date()` em regra de negócio. Nos e2e, `clock.setBrasilia('AAAA-MM-DDTHH:MM-03:00')`.
- Travas: sempre jogador antes de clube (`lockActivePlayer` → `lockClub`), para não haver deadlock entre operações.
- Datas na resposta: `formatBrasiliaDateTime`; entrada: `parseBrasiliaDateTime` (devolve `undefined` se inválida).
- Compra e venda respondem **200** (`@HttpCode(HttpStatus.OK)`), não 201.
- Dias restantes e % de multa só por `market/domain/loyalty-penalty.ts` (venda e consulta do clube usam a mesma função).
