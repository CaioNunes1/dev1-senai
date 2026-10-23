# Progresso

## Estado atual

- **Etapas concluídas:** todas as funcionalidades obrigatórias do enunciado, no backend e no frontend (22/10/2026). Fundação, jogadores, clubes, mercado (compra, venda, histórico, CSV) e Liga (escalação, partidas, classificação).
- **Backend:** as 19 rotas do enunciado prontas (Liga em 22/10: `GET/PUT /clubs/{id}/lineup`, `POST/GET /matches`, `GET /matches/{id}`, `GET /standings`).
- **Frontend:** layout do Figma, rotas, cliente HTTP, menu de clubes e **tela de jogadores completa**: lista (busca, filtros, ordenação, paginação, estados) e cadastro, edição, condição e exclusão. **Clubes completos**: lista com as 3 ordenações da API, cadastro (RN10) e página do clube com resumo e elenco com contratos. Venda pela página do clube, abas Elenco/Escalação/Histórico, tela de partidas (nova partida, histórico com filtro, partida com os 6 duelos) e classificação (22/10).
- **Mercado (Etapa 6, numeração do usuário em 19/10):**
  - 6.1 (compra no backend): já estava implementada desde 18/10; foi revisada contra o prompt em 19/10 e ganhou testes de concorrência, rollback e reflexo nas consultas.
  - 6.2 (venda no backend): também já implementada em 18/10; revisada em 19/10 e ganhou testes de concorrência, rollback e reflexo nas consultas.
  - 6.3 (histórico, `summary` e CSV no backend): ✅ implementada em 20/10.
  - 6.4 (tela de compra): ✅ 21/10.
  - 6.5 (tela de venda): ✅ 22/10.
  - 6.6 (aba Histórico, filtros, resumo e CSV na tela): ✅ 21/10 (pedida antes da 6.5).
- **Liga (Etapa 7, sprint final de 22/10):** 7.1 escalação no backend ✅; 7.2 aba Escalação ✅; 7.3 partidas, histórico e classificação no backend ✅; 7.4 telas de partidas e classificação ✅.
- **Próxima etapa:** entrega (commits, push, hash no e-mail até 23/10 às 20h). Pendente de decisão: índice único de contrato ATIVO (ADR-023, proposta).
- **Git (auditoria de 22/10):** `backend/` com 11 commits e push confirmado em 18, 19 e 20/10 (eventos do GitHub); `frontend/` com 16 commits e push confirmado em 18 e 19/10; o push de 22/10 (6.4 e 6.6) já está no `origin`, mas ainda não aparecia nos eventos da API do GitHub. Fazer push do trabalho da sprint final em 22 ou 23/10 garante o 3º dia do frontend.
- **Repositório:** `origin` = `github.com/CaioNunes1/dev1-senai`. Em 18/10, a branch `main` local estava em dia com `origin/main` (último commit `292b86f`, docs da 5.2).

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
| 5.3 | Operações de jogadores (F1 Jogadores; F2 formulários; F3 mensagens) | ✅ 18/10 | ver "Etapa 5.3" | ADR-020; React Hook Form + Zod instalados |
| 5.4 | Clubes: lista, cadastro e página do clube (F1 Clubes; F2 formulário; F3) | ✅ 18/10 | ver "Etapa 5.4" | ADR-021; sem bibliotecas novas |

### Sprint final — 6.5 e Liga (7.1–7.4) (22/10/2026)

| Verificação | Resultado |
| --- | --- |
| Referência antes de mudar | backend 578 unitários + 274 e2e; frontend 340 testes |
| 6.5 venda (frontend) | "Vender" em cada jogador do elenco; confirmação (Figma V01) com o contrato e aviso de titular; resultado (V02) com valor de compra, valor de venda, dias restantes, multa (% e valor), lucro, comissão, crédito, contrato e novo caixa da resposta; `refreshAll`; "Ver histórico"; 404/409 com o `message`; falha de rede confere o jogador antes de deixar tentar de novo; o resultado continua na tela se a recarga do clube falhar. 9 testes |
| 7.1 e 7.3 Liga (backend) | módulo `league`: domínio puro (`formation`, `match-engine`, `standings`), `LineupService`, `MatchesService`, controllers. Sem migration (as tabelas já existiam). 39 unitários com os exemplos oficiais (6 duelos do Águias × Delta, 74 × 0,85 → 63, empate sem gol, as 4 formações, os dois MEI do 1-2-1, classificação com 6 clubes e o exemplo 2.4.3) e 32 e2e (escalação válida nas 4 formações, substituição integral, caixa igual, 10 corpos 400, 404 de clube/jogador/excluído, 409 de outro clube/livre/DOENTE/posições, titular vendido ou DOENTE sai e a formação fica; partida oficial com 201 + Location e os 6 duelos, sem mudar caixa nem escalação, duelos guardados mesmo depois de editar o jogador, 5 corpos 400, 404, 409, rollback com trigger; histórico ordenado com desempate por id, filtro e erros, 404 de partida; classificação zerada e do exemplo 2.4.3) |
| Mutações (backend) | empate vira gol → 2 falharam; sem a redução de 15% → 5; desempate sem gols marcados → 1; goleiro fora da conta → 1; código restaurado |
| 7.2 escalação (frontend) | aba Escalação (C06–C11): 4 formações, vagas por setor, opções só da posição, sem DOENTE e sem repetir; troca de formação avisa quem saiu; PUT com os 5 ids; selo Completa/Incompleta/Sem escalação da API; aviso de clube que não pode jogar; "Salvar" desabilitado sem mudança (evita reenvio). 13 testes |
| 7.4 Liga (frontend) | Partidas (L01/L02/L04): histórico na ordem da API com filtro `?club_id=`, nova partida com validação de campos e o `message` do 409; partida (L03) em `/matches/:id` com placar e os 6 duelos; Classificação (L05) com as 10 colunas na ordem da API. 11 testes |
| `npm test` (backend) | 29 suítes, 617 testes ok |
| `npm run test:e2e` (backend) | 5 suítes, 306 testes ok |
| `npm test` (frontend) | 21 arquivos, 373 testes ok |
| Lint, formatação, build | ok nas duas pastas; JS do frontend 521,7 kB (159,4 kB gzip); nenhuma dependência nova |
| Aplicação real | cópia isolada (backend 3001 com `passe_test`, Vite 5174, Chrome headless): 3 clubes e 10 jogadores criados e comprados pela API; escalação dos dois clubes pela tela; Gama sem escalação → 409 com o `message`; partida pela tela = exemplo oficial (1 × 2, 63 × 63 sem gol, 79 × 56 gol), clique duplo → 1 partida; classificação = exemplo 2.4.3; venda do titular pela tela com aviso e os 8 valores; histórico com a VENDA; escalação incompleta; nova partida recusada (409). 1366 × 768 e 375 px sem rolagem horizontal |
| Docker completo (diferencial) | `backend/Dockerfile`, `frontend/Dockerfile` (imagem pública `node:22-bookworm-slim`), serviços `api` e `web` no `docker-compose.yml`; `docker compose up -d db` continua igual. Validado num projeto isolado (`-p passe-check`, portas 5434/3002/5175): banco novo vazio com migrations, `/players` e `/standings` 200, Swagger 200, CORS da interface, logs por requisição e a lista de jogadores aberta no Chrome. O volume `passe-check_db-data` ficou (apagar com `docker volume rm passe-check_db-data`) |
| Não validado | Playwright (não configurado); leitor de tela real; Docker numa máquina Ubuntu limpa (validado só no Docker Desktop do Windows) |

### Etapa 6.6 — histórico, filtros, resumo e CSV na página do clube (21/10/2026)

| Verificação | Resultado |
| --- | --- |
| Referência antes de mudar | 15 arquivos, 265 testes ok |
| Testes novos (75) | **Filtros** (34, `transaction-filters.test.ts`): parâmetros da API para cada combinação (os dois tipos = sem `type`), leitura e gravação na URL, `player_id` inválido ignorado (0, -1, abc, 2.5, " 2", 02, 2147483648), último tipo não desmarca, opções de jogador (nome mais recente, nomes iguais com id, histórico vazio), descrição para o aviso. **Cliente HTTP** (6): `apiDownload` com query, `Accept`, bytes iguais (acentos, aspas, `;`, LF), CSV só com cabeçalho, 400/404 em JSON → `ApiError` com o `message`, sucesso em JSON recusado, falha de rede. **Formatação** (7): `formatSignedMoney` (+, -, zero, -0, milhar). **Download** (1): mesmo `Blob`, nome, link removido, URL liberada. **Aba** (26, API falsa que filtra como o backend e devolve totais próprios por consulta, diferentes da soma das linhas): abas com contagens, Escalação desabilitada sem pedido, troca sem recarregar o clube, teclado (setas/Home/End pulando a Escalação), filtros mantidos ao voltar e zerados ao trocar de clube pelo menu; 8 colunas na ordem da API com nome histórico, data UTC → Brasília, lucro nulo como "–", sinais e cores; 5 totais da API, positivo e negativo; só compra, só venda, jogador vendido, combinados preservando o outro filtro, limpar sem nova consulta, jogador excluído (404), 400, vazio filtrado, clube sem transações, falha de rede com nova tentativa, resposta atrasada descartada, "Atualizar dados"; CSV sem filtro, com tipo, jogador e os dois (mesma query da tabela), só cabeçalho, 400 e 404 sem download e com nova tentativa, botão desabilitado e clique duplo = 1 pedido. **Compra → histórico** (1, em `BuyPlayer.test.tsx`): a compra feita na tela aparece no histórico do clube consultado de novo |
| Mutações | tabela sempre com o histórico completo → 12 falharam; CSV sem filtros → 1; lucro nulo vira número → 2; variação do caixa sem sinal → 2; resposta antiga não descartada → 1; download sem conferir `Content-Type` → 1; opções de jogador sem o histórico → 8; sem trava de clique duplo → 1; código restaurado |
| `npm test` | 18 arquivos, 340 testes ok |
| `npm run lint` / `format:check` / `build` / `npm audit` | ok; JS 494,7 kB (152,7 kB gzip), antes 480 kB; nenhuma dependência nova; 0 vulnerabilidades |
| Aplicação real | cópia isolada (backend 3001 com `passe_test`, Vite 5174, Chrome headless). Dados pela API só no `passe_test`: vendas de Bruno e de Juca (a tela de venda não existe), Juca renomeado antes da venda, Bruno excluído depois, jogadora Eva criada. **Compra pela tela** (Eva → Clube Alfa): aba passou de "Histórico 4" para "Histórico 5", linha nova no topo, total pago 110,21 → 119,21. **Filtros:** só vendas (95,07 recebidos, multas 10,56), só compras, jogador 5 com o nome histórico "Juca Craque Validação" na compra e "Juca Renomeado" na venda, VENDA + jogador 5 (82,47); jogador excluído → "O filtro foi recusado / Jogador não encontrado.", sem totais e com exportação desabilitada; "Limpar filtros" → 4 linhas e totais completos. **CSV:** `export?type=VENDA&player_id=5` e `export?type=COMPRA` com a mesma query da tabela; arquivo `historico-clube-1.csv` igual byte a byte à resposta da API (300 bytes, sem BOM, sem CR); aviso "CSV baixado". Clube sem transações: vazio + totais 0,00 |
| Larguras | 1366 × 768: página 1366, tabela 1021 em 1021 (sem rolagem), abas sem rolagem. 375 px: página 375; abas 327 em 327 (ícones das abas escondidos e espaço menor abaixo de 640 px); tabela rola dentro do quadro (896 em 325); totais em 2 colunas |
| Não validado | Playwright (não configurado); leitor de tela real; download em navegadores além do Chrome; venda pela tela (6.5 não existe) |

Diferenças em relação ao Figma (§3.5): "Jogador" sem ": todos" quando não há filtro; aviso do CSV com os filtros em texto; a Escalação aparece desabilitada com "Em breve".

### Etapa 6.4 — compra no frontend (21/10/2026)

| Verificação | Resultado |
| --- | --- |
| Referência antes de mudar | 13 arquivos, 220 testes ok |
| Testes novos (45) | **Datas e schema** (29): Brasília → UTC em fuso diferente (os testes rodam em UTC), datas inexistentes (30/02, 29/02 fora de ano bissexto), horas inválidas, corpo exato `{ club_id: número, loyalty_until: "AAAA-MM-DDTHH:MM-03:00" }` sem segundos nem `Z`, passado, igual a agora, +1 minuto, exatamente 1.095 dias e 1 minuto a mais (relógio fixo). **Integração** (16, API falsa com estado): "Comprar" só em livre e item do menu desabilitado com o motivo; diálogo com o jogador certo, foco no clube e data sugerida; 2ª página com "Livres"; validações sem POST; cancelar e voltar sem POST; revisão com a frase e o valor de referência; clique duplo = 1 POST com o corpo exato; botões desabilitados ao enviar; resultado com os números da resposta (diferentes do valor de referência); lista, menu, filtro "Livres", filtro por clube e página do clube (caixa, patrimônio, elenco com contrato) atualizados; 409 (caixa, elenco) e 400 voltam ao formulário com os dados; 404 recarrega a lista; falha de rede com jogador livre → "Tentar de novo"; com o jogador já num clube → só "Fechar"; consulta falhou → "Conferir de novo"; sem clubes → aviso e "Revisar" desabilitado; "Comprar jogadores" da página do clube |
| Mutações | data por `toISOString` → 3 falharam; Brasília pelo fuso local → 4; sem `refreshAll` → 1; falha de rede sem conferir o jogador → 3; código restaurado |
| `npm test` | 15 arquivos, 265 testes ok (o de cadastro de jogador estourou 5 s com a suíte em paralelo uma vez; `testTimeout` 15 s) |
| `npm run lint` / `format:check` / `build` | ok; JS 480 kB (148,7 kB gzip), antes 465 kB; nenhuma dependência nova; `npm audit` 0 vulnerabilidades |
| Aplicação real | cópia isolada (backend 3001 com `passe_test`, Vite 5174). O `passe_test` já tinha 20 clubes (sobra do e2e); jogadores criados pela API só nele. **A:** data passada e acima de 1.095 dias recusadas na tela; revisão; clique duplo → 1 POST com `"2027-03-02T10:15-03:00"`; resultado 14,00 / 0,00 / 14,00 / ATIVO / caixa 286,00; tabela com o clube, "Livres" sem o jogador; página do clube com caixa 286,00, patrimônio 300,00 e contrato (132 dias, 10%). **B:** custo 96,21 com caixa 130,29 → 409 com o `message`; campos mantidos; caixa e elenco iguais na API. **C:** jogador comprado por fora com a tela aberta → 409 "não está livre", lista recarregada, nenhuma transação no clube que tentou. **Página do clube:** "Comprar jogadores" → lista em "Livres" com aviso e clube já escolhido |
| Larguras | 1366 × 768: a tabela de jogadores passou a 1099 px em 1021 com o botão "Comprar" → nome com quebra de linha → 1021 px; diálogos inteiros na tela. 375 px: `scrollWidth` = 375; diálogo com 343 px; formulário, revisão e resultado (91,63 + 4,58 = 96,21; caixa 189,79) visíveis |
| Não validado | Playwright não está configurado (não foi criado); leitor de tela real; seletor nativo de data em navegadores diferentes do Chrome |

Diferenças em relação ao Figma (§3.4): passo de revisão antes de enviar; recuperação da falha de rede com consulta do jogador.

### Etapa 6.3 — histórico, summary e CSV no backend (20/10/2026)

| Verificação | Resultado |
| --- | --- |
| Referência antes de mudar | 530 unitários + 238 e2e ok |
| Endpoints | `GET /clubs/{id}/transactions` (`data` + `summary`) e `GET /clubs/{id}/transactions/export` (`text/csv; charset=utf-8`, `Content-Disposition`), com o mesmo pipe de filtros e a mesma consulta (ADR-022) |
| Testes unitários novos (48) | **Filtros:** `type` (4 válidos, 10 inválidos, repetido na URL) e `player_id` (3 válidos, 10 inválidos). **Summary:** exemplo completo e só VENDA do README, só COMPRA, lucro positivo/negativo/zero, vazio. **CSV:** exemplo do README byte a byte, sem BOM e sem CR, só cabeçalho, ordem recebida, negativos, zero, sem milhar, acentos, aspas e `;` |
| Testes e2e novos (36) | **A+B:** compra e venda oficiais e depois renomear e deixar Doente; o histórico continua igual ao README 2.3.3, e o CSV igual ao 2.3.4 byte a byte. **Conciliação:** 300,00 + soma = 296,85. **C:** jogador excluído continua no histórico geral; `player_id` dele → 404 em JSON nos dois endpoints; nenhuma transação apagada. **D:** 2 clubes, 3 jogadores, prejuízo; 8 combinações de filtro com linhas, `summary` e CSV correspondentes. **F:** mesmo `created_at` → id decrescente (relógio fixo, sem depender de velocidade). Leitura não altera nada (snapshot antes e depois). Compra recusada não aparece. **E:** clube sem transações → `data` vazia, `summary` zero e CSV só com o cabeçalho. 14 filtros inválidos (400/404) e 4 ids de clube (404), sempre em JSON. Escape com nomes criados pela API |
| Mutações | sem desempate por id → 1 falhou; lucro sem sinal → 5 e2e + 1 unitário; CSV com CRLF → 6 e2e + 6 unitários; filtro aceitando jogador excluído → 1; sem escape → 1 e2e + 1 unitário; código restaurado |
| `npm test` | 26 suítes, 578 testes ok |
| `npm run test:e2e` | 4 suítes, 274 testes ok (103 no mercado) |
| Lint, formatação, build | ok |
| Índice de contrato ATIVO | só análise (ADR-023); bancos `passe` e `passe_test` sem violações (consulta somente leitura); migration **não** criada |

### Etapa 6.2 — venda no backend: revisão e testes (19/10/2026)

O prompt detalhado da 6.2 não foi enviado (só "agora o prompt 6.2"). A venda (`POST /players/{id}/sell`) foi conferida contra o texto oficial (RN15, RN16, exemplo 2.3.2, saída da escalação da RN19), e nenhum código de produção mudou. Entraram só testes.

| Verificação | Resultado |
| --- | --- |
| Regras conferidas | dias restantes arredondados para cima (0 se o fim já passou ou é o momento); faixas 0/5/10/20%; multa com teto de 10,00; lucro = valor na venda − valor do contrato (sem a taxa); comissão progressiva arredondada uma vez, só com lucro; crédito = valor − multa − comissão; RESCINDIDO com multa e ENCERRADO sem; jogador livre; saída da escalação mantendo a formação; transação VENDA (`fee` = comissão, `profit` com sinal); 409 para jogador livre; 404 para inexistente ou excluído |
| Já cobertos antes | tabelas oficiais da RN15 (7 linhas + 3 da ficha-exemplo), comissão (6) e crédito (4 + teto) em testes unitários; exemplo 2.3.2 resposta por resposta; faixas e teto pela API; conciliação do caixa |
| Testes novos (e2e) | duas vendas do mesmo jogador ao mesmo tempo → 200 + 409, caixa creditado uma vez (294,00), 1 VENDA; venda e compra do mesmo jogador por outro clube ao mesmo tempo → venda 200, compra 200 ou 409 conforme a ordem, no máximo 1 contrato ATIVO coerente com o clube do jogador e caixa de cada clube = 300,00 + soma das variações; falha provocada pelo PostgreSQL (trigger temporário só no `passe_test`) ao gravar o contrato RESCINDIDO, a saída da escalação ou a transação VENDA → 500 genérico, caixa 258,00, jogador no clube, contrato ATIVO, titular na escalação, nenhuma VENDA, e a venda seguinte funciona; depois da venda, `GET /players/{id}`, `?free=true`, `?club_id=`, `GET /clubs?sort=net_worth_desc` e `GET /clubs/{id}` com o novo estado |
| Refatoração de teste | o trigger de falha virou o helper `withFailureOn(tabela, evento, ação)`, usado pela compra e pela venda |
| Mutações | venda sem `$transaction` → 3 testes de rollback falharam; venda sem travar o jogador → o teste de duas vendas simultâneas falhou; código restaurado |
| `npm test` | 23 suítes, 530 testes ok |
| `npm run test:e2e` | 4 suítes, 238 testes ok (67 no mercado) |
| Lint, formatação, build | ok; o trigger de teste não ficou no banco |

### Etapa 6.1 — compra no backend: revisão e testes (19/10/2026)

A compra (`POST /players/{id}/buy`, módulo `market`) já existia desde 18/10. Na 6.1 ela foi conferida item a item contra o prompt da etapa (RN01, RN12–RN14, RN17, V1–V9), e nenhum código de produção mudou. Entraram só testes.

| Verificação | Resultado |
| --- | --- |
| Testes novos (e2e) | o mesmo clube comprando 2 jogadores ao mesmo tempo com caixa 100,00 e custo 50,00 cada → 200 + 409, caixa 50,00, 1 contrato, 1 transação; clube com 11 jogadores e 2 compras simultâneas → só o 12º entra; falha provocada pelo PostgreSQL (trigger temporário só no `passe_test`, removido no `finally`) na gravação do **contrato** e da **transação** → 500 com mensagem genérica, caixa 300,00, jogador livre, nenhum contrato ou transação; depois da compra, `GET /players/{id}`, `?free=true`, `?club_id=`, `GET /clubs?sort=net_worth_desc` e `GET /clubs/{id}` com caixa 258,00, elenco 40,00, patrimônio 298,00, 120 dias e 10% |
| Teste novo (unitário) | limite de 50% nos valores mínimos e com caixa ímpar em centavos (custo 1 × caixa 1/2/0; 5 e 6 × 11; 150,00 e 150,01 × 300,00) |
| Mutações | compra sem `$transaction` → 4 testes falharam (rollback e concorrência); clube sem `FOR UPDATE` → os 2 de concorrência no mesmo clube falharam; código restaurado |
| `npm test` | 23 suítes, 530 testes ok |
| `npm run test:e2e` | 4 suítes, 232 testes ok (61 no mercado) |
| Lint, formatação, build | ok |
| Banco | só `passe_test`; o trigger e a função de teste não ficaram no banco (conferido em `pg_trigger`/`pg_proc`) |
| Não feito | índice único parcial de contrato ATIVO por jogador: proposto na ADR-007, depende de autorização (migration estrutural) |

### Etapa 5.4 — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` (frontend) | 13 arquivos, 220 testes ok (65 novos). **Schema:** nome com os mesmos casos do backend; sigla (formato, letras iguais, correspondência com o nome sem acento); só confere a sigla com o nome válido. **Formatadores:** data em Brasília a partir de um instante em UTC; dias com milhar; %. **Lista e cadastro** (16, API falsa com estado): 5 colunas e valores da API; sem paginação; por nome, 1 só `GET /clubs`, sem `sort`; `net_worth_desc`/`asc` pela API; ordem da resposta preservada; `?sort=` na URL e ida e volta da página do clube; vazio com "Novo clube"; carregando; falha de rede com nova tentativa; erros junto aos campos sem POST; corpo só com `name` (normalizado, com acentos) e `acronym`; lista e menu atualizados com 1 `GET` a mais; aviso com os valores do 201; com ordem por patrimônio, o novo clube na posição da API; clique duplo = 1 POST; 409 de nome, de sigla e do limite com dados mantidos e correção; 400 e falha de rede sem falso sucesso. **Página do clube** (9): URL direta, resumo, elenco na ordem da API, contrato (compra, fidelidade, dias, %), fuso, sem contrato ("—"), elenco vazio 300/0/300, 404 com volta, id inválido, falha de rede ≠ vazio, "Atualizar dados" |
| Fuso dos testes | `TZ=UTC` no Vitest (`vite.config.ts`): esta máquina está em America/Sao_Paulo, e sem isso a mutação "formatador sem fuso" passaria |
| Mutações | formatador sem `timeZone` → 4 falharam; tabela de clubes reordenada por nome → 3; sigla sem conferência com o nome → 3; sem `refreshAll` depois de criar → 2; elenco reordenado por nome → 1; código restaurado |
| `npm run lint` / `format:check` / `build` | ok; JS 465 kB (144,6 kB gzip), antes 450 kB; nenhuma dependência nova; `npm audit` 0 vulnerabilidades |
| Exports sem uso | nenhum |
| Regressão | os 155 testes das etapas 5.1–5.3 continuam passando (só o mock do teste do layout ganhou a resposta de `GET /clubs/{id}`). Na aplicação real: lista de jogadores, filtro por clube (21 opções), edição com posição travada, cadastro abrindo e navegação entre telas |
| Aplicação real | cópia isolada: backend na 3001 com `passe_test`, Vite na 5174 (portas 3000/5173 livres; o banco `passe` não foi usado). **Lista:** 4 clubes com valores da API; nome → patrimônio desc (Gama 300,00 → Águias 295,40) → asc, com `?sort=` na URL. **Cadastro:** "Águias 2" + "ag" → 2 erros sem pedido; "águias fc"/AFC → 409 de nome com dados mantidos; "Arara Gaúcha"/AGU → 409 de sigla; "  Leões   da Serra "/LDS com clique duplo → **1 POST** com "Leões da Serra", aviso 300,00/0,00/300,00 da resposta, linha destacada na posição da API (ordem asc mantida), menu atualizado. **Limite:** 15 clubes criados pela API no `passe_test` (total 20); 21º pela tela → aviso + 409 "A liga já tem o máximo de 20 clubes." **Página do clube:** Águias FC com 6 jogadores e **contratos reais** (comprados pela API em validação anterior): ordem GOL → ATA, 18/10/2027 10:00, 365 dias, 20%; Gama SC 300,00/0,00/300,00 com elenco vazio; `/clubs/99` e `/clubs/abc` → 404 com volta; URL direta (F5) ok; lista → clube → lista pela trilha |
| Larguras | 1366 × 768: o elenco cortava "% de multa" (1048 px em 1021) → larguras fixas retiradas e nome com quebra de linha → 1021 px, sem rolagem interna. 375 px: `scrollWidth` = 375 na lista e no clube; tabelas rolam no card; cards em 1 coluna; diálogo de 343 px com o 409 visível; menu sobreposto |
| Não validado | estado vazio da lista **na aplicação real** (a limpeza do `passe_test` foi negada pela permissão; coberto só pelos testes); Node 22; leitor de tela real; F07 de ponta a ponta pela tela (compra e venda ainda sem tela) |

Cenários que só fecham de ponta a ponta com as telas de compra e venda (F07): caixa e valor do elenco mudando depois de comprar e vender pela tela; elenco ganhando e perdendo jogadores; ordenação por patrimônio refletindo essas mudanças; contratos em faixas diferentes de dias e multa (5% e 10% só apareceram em testes com respostas simuladas; na aplicação real todos os contratos estão em 365 dias e 20%).

Diferenças em relação ao Figma (registradas em `docs/frontend-design.md` §3.3): depois de criar, a tela fica na lista (o C04 abre o clube); erro do cadastro acima do rodapé, sem destacar o campo; sem as abas Escalação/Histórico e sem "Comprar jogadores", "Vender" e "Ver jogadores livres"; sem o "+" de clube no menu.

### Etapa 5.3 — o que foi validado (18/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm test` (frontend) | 10 arquivos, 155 testes ok (50 novos): `useApiAction` (3 chamadas seguidas = 1 execução, `isPending`, erro preservado e nova tentativa, desmontagem), schemas (conversão texto → número sem virar 0, 11 obrigatórios, nome V4, faixas e limites, regras cruzadas deixadas para a API, idade que não diminui) e 18 de integração com API falsa com estado: cadastro (corpo exato de 11 campos numéricos, resultado do 201, lista recarregada, erros junto aos campos sem POST, 400 com dados mantidos, clique duplo = 1 POST, falha de rede + nova tentativa), edição (`GET` antes, `PUT` com 4 campos, posição travada com clube, idade menor bloqueada, 409), condição (Apto bloqueado de Doente, `PATCH`, valor da resposta, condição atual aceita), exclusão (habilitada só para livre, cancelar sem pedido, `DELETE` 204 com clique duplo = 1 pedido, 409, 404 com recarga, última página vazia volta uma), menu e foco por teclado |
| Mutações | sem trava síncrona → 1 falhou; idade pode diminuir → 2; Apto liberado de Doente → 1; sem recarregar depois de gravar → 3; Excluir liberado com clube → 1; código restaurado |
| `npm run lint` / `format:check` / `build` | ok; JS do build 450 kB (140 kB gzip), antes 304 kB — aumento vindo do Zod |
| `npm install` | 0 vulnerabilidades |
| Exports sem uso | 3 encontrados e o `export` removido |
| Aplicação real | as portas 3000 e 5173 estavam com processos do usuário (`start:prod` no banco de dev) — **não foram tocados**; validação numa cópia isolada (backend na 3001 com `passe_test`, Vite na 5174). Cadastro: 11 erros junto aos campos; recusa 400 da API ("potential deve ser maior ou igual ao maior atributo (74)") no diálogo com dados mantidos; nova tentativa com clique duplo → 1 POST; J07 com 26,00 / 26,00 / 68 (igual ao Figma). Edição de jogador com clube: posições travadas, idade 26 < 27 bloqueada, `PUT` com 4 campos; atributos técnicos iguais na API antes e depois. Condição: Apto desabilitado (Doente), `PATCH` → Mal condicionado (28,29 na API); depois → Apto (30,36). Exclusão: Excluir desabilitado com clube; livre → confirmação, clique duplo → 1 DELETE, aviso, `GET` passa a 404, total 24 → 23 |
| Larguras | 1366 × 768: diálogo de cadastro com rodapé e erro sempre visíveis (rolagem só no conteúdo — ajuste feito depois da 1ª captura, em que "Salvar" ficava abaixo da dobra). 375 px: diálogo com 343 px, rolagem interna, `scrollWidth` = 375; menu da linha aparece inteiro sobre a tabela rolada |
| Não validado | Node 22; leitor de tela real; teclado virtual de celular |

Diferenças em relação ao Figma (registradas em `docs/frontend-design.md` §3.2): sem "Ver detalhes" (J12), "Comprar", "Prévia dos atributos" e o alerta de titular (J16, depende de `GET /clubs/{id}/lineup`); asterisco nos obrigatórios; diálogo com rodapé fixo.

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
| 18/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/src/shared/` (Dialog, ConfirmDialog, FormField, Alert, ToastProvider, useApiAction, text.ts), `features/players/` (schemas, diálogos, menu de ações), `app/AppProviders.tsx`, testes, ADR-020 | leitura dos frames J05–J16; formulários com React Hook Form + Zod; ações com trava contra envio duplo; testes com API falsa com estado e mutações; validação no navegador numa cópia isolada com o banco de teste | em revisão pelo candidato |
| 18/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/src/features/clubs/`, `shared/lib/format.ts` (datas em Brasília), `shared/lib/text.ts` (`removeAccents`), `shared/components/button-styles.ts`, `vite.config.ts` (`TZ=UTC` nos testes), testes, ADR-021 | leitura dos frames C01–C05, C09 e E04 e do contrato real de clubes no backend; lista, cadastro e página do clube; testes com API falsa com estado e mutações; validação no navegador numa cópia isolada com o banco de teste, inclusive o limite de 20 clubes | em revisão pelo candidato |
| 19/10/2026 | Claude Code (Claude Opus) | `backend/test/market.e2e-spec.ts`, `backend/src/market/domain/purchase.spec.ts`, ADR-007 | revisão da compra contra o prompt da Etapa 6.1; testes de compras simultâneas, rollback com falha provocada por trigger no banco de teste e consultas depois da compra; mutações para provar os testes | em revisão pelo candidato |
| 19/10/2026 | Claude Code (Claude Opus) | `backend/test/market.e2e-spec.ts`, ADR-007 | revisão da venda contra RN15, RN16 e o exemplo 2.3.2; testes de vendas simultâneas, venda × compra cruzadas, rollback com falha provocada por trigger no banco de teste e consultas depois da venda; mutações para provar os testes | em revisão pelo candidato |
| 20/10/2026 | Claude Code (Claude Opus) | `backend/src/market/` (transactions.controller, transaction-history.service, domain/transaction-history, domain/transactions-csv, dto/transaction-filters, mapper), `test/market.e2e-spec.ts`, ADR-022, ADR-023 | histórico com filtros e `summary`, exportação CSV comparada byte a byte, testes com exemplos oficiais e mutações; análise somente leitura do índice de contrato ativo | em revisão pelo candidato |
| 21/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/src/features/market/` (api, loyalty-date, buy-player-schema, BuyPlayerDialog, PurchaseResultDialog), `shared/components/Select.tsx`, `features/players/` (PlayersTable, PlayerActionsMenu, PlayerDialogs, PlayersPage, use-player-list, PlayerSummary), `features/clubs/ClubDetailPage.tsx`, `vite.config.ts`, testes, ADR-024 | leitura dos frames M01–M08; compra com revisão, datas de Brasília independentes do fuso, recuperação de falha de rede; testes com relógio fixo e API falsa com estado; mutações; validação no navegador com o banco de teste | em revisão pelo candidato |
| 21/10/2026 | Claude Code (Claude Opus) + conector Figma | `frontend/src/shared/components/Tabs.tsx` e `tab-ids.ts`, `shared/api/http-client.ts` (`apiDownload`), `shared/lib/download.ts`, `shared/lib/format.ts` (`formatSignedMoney`), `shared/hooks/use-api-query.ts` (`enabled`), `features/market/` (transaction-filters, use-transactions, TransactionHistoryPanel, TransactionFiltersBar, TransactionsTable, TransactionSummaryBar, signed-tone, api), `features/clubs/ClubDetailPage.tsx`, `test/download-mock.ts`, testes, ADR-025 | leitura dos frames H01–H05, E05 e C05; abas, filtros na URL, resumo da API e download do CSV; testes com API falsa e totais próprios por consulta; mutações; validação no navegador com o banco de teste | em revisão pelo candidato |
| 22/10/2026 | Claude Code (Claude Opus) + conector Figma | `backend/src/league/` (domain, dto, services, controllers, módulo), `test/league.e2e-spec.ts`; `frontend/src/features/market/` (SellPlayerDialog, SaleResultDialog, ResultRow), `features/league/` (api, lineup-slots, LineupPanel, NewMatchDialog, MatchesPage, MatchDetailPage, StandingsPage), `features/clubs/` (ClubDetailPage, SquadTable), navegação, testes, README, ADR-026 | sprint final autorizada pelo usuário: venda na tela, Liga no backend e no frontend, auditoria e README; testes com os exemplos oficiais; mutações; fluxo integrado no navegador com o banco de teste | em revisão pelo candidato |
