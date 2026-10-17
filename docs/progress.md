# Progresso

## Estado atual

- **Etapas concluídas:** 1 — Fundação do backend; 3.1 — Regras de domínio de jogadores (15/10/2026). Aguardando revisão.
- **Atenção:** a Etapa 2 (modelo de dados e migrations) **não foi executada**, e é pré-requisito da 3.2.
- **Próxima etapa sugerida:** 2 — Modelo de dados; depois 3.2 — cadastro e consulta.
- **Repositório:** `git init` feito (branch `main`), **nenhum commit** (aguardando autorização).

## Pendências e bloqueios

| Item | Responsável | Situação |
| --- | --- | --- |
| Iniciar o Docker Desktop e validar `docker compose up -d db` + conexão do Prisma | — | ✅ resolvido: porta do host trocada para **5433** (ver abaixo) |
| Node.js 22 local (máquina tem v24.15.0; `engines` pede 22.x) | usuário | decidir |
| Configurar `user.email` do Git (noreply recomendado pelo enunciado) antes do 1º commit | usuário | pendente |
| Primeiro commit e push (dias de envio contam no barema) | usuário | aguardando autorização |
| Acesso ao Figma (conector ou exportação das 3 páginas) | usuário | pendente |
| Conferir errata (prevista 16/10) | agente, início da próxima sessão | pendente |
| Vulnerabilidades do `npm audit` (exigem majors; ver ADR-001) | revisão final | risco aceito |

## Etapas

| # | Etapa | Status | Testes | Observações |
| --- | --- | --- | --- | --- |
| 0 | Planejamento | ✅ | — | docs criados |
| 1 | Fundação do backend | ✅ | 24 unitários + 28 e2e passando | ADR-012 nasceu de bug pego pelos testes (`/01` aceito) |
| 2 | Modelo de dados | ⏳ | | validar Docker/PostgreSQL primeiro; pré-requisito da 3.2 |
| 3.1 | Domínio de jogadores (RN02–RN06) | ✅ | 147 testes de domínio (total 171 unitários + 28 e2e) | sem dependências novas; 3 mutações detectadas pelos testes |
| 3.2 | Cadastro e consulta | ⏳ | | |

### Banco local na porta 5433 (15/10/2026)

Com o container na `5432`, o Prisma falhava com `P1000` (autenticação), embora `psql` dentro do container funcionasse. O `wslrelay` (repasse de portas do WSL) escutava em `127.0.0.1:5432`/`[::1]:5432`, mais específico que o `0.0.0.0:5432` do Docker, então `localhost:5432` chegava a outro PostgreSQL (do WSL). Decisão do usuário: publicar o banco do projeto na **5433** (`docker-compose.yml`, `.env.example`, README, `test/setup-e2e.ts`). Conexão confirmada pelo Prisma (`current_user = passe`, PostgreSQL 16 Alpine). Na máquina da banca, a porta não faz diferença.

### Etapa 3.1 — o que foi validado

| Verificação | Resultado |
| --- | --- |
| `npm test` | 7 suítes, 171 testes ok (147 novos: arredondamento, overall, valor base, valor de mercado) |
| `npm run test:e2e` | 28 testes ok (sem regressão) |
| `npm run lint` / `npm run format:check` / `npm run build` | ok |
| Mutações manuais (empate para baixo; agilidade 80 fora da faixa; jovem promessa até 20) | detectadas: 10, 4 e 2 testes falharam; código restaurado |

Fontes dos valores esperados: tabelas do README (RN05: 10 linhas; overall: 5; valor base: 9), amostras da ficha-exemplo (B05: 5; B06: 3 overall + 3 valor base) e casos-limite calculados à mão, com a conta escrita em cada caso de teste.

Pendente para a 3.2 (cadastro e consulta):
- schema Prisma de `jogadores` e migration (Etapa 2);
- validação do Docker/PostgreSQL;
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
