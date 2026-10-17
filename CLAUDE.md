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
| Subir banco | `docker compose up -d db` | raiz |
| Instalar | `npm ci` (roda `prisma generate`) | backend |
| Build / executar | `npm run build` · `npm run start:prod` · `npm run start:dev` | backend |
| Testes | `npm test` (unitários) · `npm run test:e2e` | backend |
| Qualidade | `npm run lint` · `npm run format:check` | backend |

Notas da Etapa 1:
- Versões fixadas: Nest 11, TypeScript 5.9, Prisma 6, ESLint 9 (motivos na ADR-001). Não atualizar majors sem nova ADR.
- Nunca usar `ValidationPipe`/`ParseIntPipe` padrão: usar `StrictValidationPipe` (global) e `ParseIdPipe` (ADR-012).
- Lançar `InvalidInputError` / `ResourceNotFoundError` / `BusinessRuleError`, não `HttpException`.
- Para parar um servidor iniciado em teste manual, encerrar **pelo PID**, nunca todos os processos `node`.
