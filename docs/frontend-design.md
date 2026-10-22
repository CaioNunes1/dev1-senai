# Frontend — telas, design system e mapeamento

Fontes: README oficial › "🖥️ Frontend" (funcionalidades obrigatórias, que **prevalecem** sobre o mockup) e barema › F1–F5. O mockup orienta fluxo e disposição; fidelidade visual não pontua. A banca usa o Chrome em **1366 × 768**; 375 px só no diferencial de responsividade (F5).

Legenda usada abaixo: **[O]** obrigatório pelo README/barema · **[M]** opcional, só no mockup · **[D]** decisão própria.

## 1. Referência visual

| Fonte | Acesso | Uso |
| --- | --- | --- |
| Figma "Passe" (cópia do candidato `Gin5aRF66GIyoTTOUbEygQ`, duplicada do oficial `oevjrS0eaqL3VHSvKYB8GS`) — página "Sistema de design" (`0:1`) | ✅ conector Figma, 18/10/2026 | tokens (variáveis), componentes e descrições de uso |
| Página "Telas · Desktop" (`2:2`) | ✅ | 62 frames de 1440 px, referência das telas |
| Página "Telas · Mobile" | não usada | decisão do usuário (18/10): telas mobile do Figma **não** serão implementadas; o layout só não pode quebrar em 375 px |

O conector só lê arquivos em que a conta tem permissão de edição; por isso a leitura é feita na cópia. O mockup v1.0 é congelado (README), então a cópia não diverge do oficial.

## 2. Design tokens (implementados em `frontend/src/styles/index.css`, bloco `@theme`)

Os nomes seguem as variáveis do Figma (padrão shadcn/ui). Componentes usam **só** tokens semânticos; nenhum hexadecimal fora do `@theme`. Valores do **tema claro**, lidos com `get_variable_defs` nos nós `9:59415` (cores), `9:59922` (tipografia, sombras) e `52:124895` (J01).

### Cores

| Grupo | Token → valor |
| --- | --- |
| Base | `background` #FFFFFF · `foreground` #09090B · `card` #FFFFFF · `card-foreground` #09090B · `popover` #FFFFFF · `popover-foreground` #09090B · `muted` #F4F4F5 · `muted-subtle` #FAFAFA (cabeçalho de tabela, rodapé de totais) · `muted-foreground` #686872 · `accent` #F4F4F5 · `accent-foreground` #18181B · `border` #E4E4E7 · `input` #91919B (borda de campo) · `ring` #155DFC · `overlay` #00000080 |
| Ação | `primary` #155DFC · `primary-hover` #1447E6 · `primary-foreground` #FFFFFF · `primary-soft` #EFF6FF (linha recém-criada, ícone da página) · `primary-soft-foreground` #1447E6 · `secondary` #F4F4F5 · `secondary-foreground` #18181B |
| Status | `success` #00813A · `success-soft` #F0FDF4 · `success-soft-foreground` #016630 · `success-soft-border` #B9F8CF · `warning` #B55200 · `warning-soft` #FFFBEB · `warning-soft-foreground` #953D00 · `warning-soft-border` #FEE685 · `destructive` #E40016 · `destructive-foreground` #FFFFFF · `destructive-soft` #FEF2F2 · `destructive-soft-foreground` #BF000F · `destructive-soft-border` #FFCACA |
| Sidebar | `sidebar` #FAFAFA · `sidebar-foreground` #09090B · `sidebar-accent` #F4F4F5 · `sidebar-accent-foreground` #18181B · `sidebar-border` #E4E4E7 |
| Avatares | `avatar-{violet,pink,cyan,teal,zinc}` e `-foreground`: #EDE9FE/#7008E7 · #FCE7F3/#C2005C · #CEFAFE/#005F78 · #CBFBF1/#005F5A · #E4E4E7/#3F3F46 |

Não incluídos por enquanto: `chart-1` #155DFC, `chart-2` #91C5FF, `chart-positive` #00A447, `chart-warning` #DA7700, `chart-negative` #E40016 (nenhuma tela obrigatória tem gráfico) e o **tema escuro** (o Figma tem os valores nas amostras, mas a alternância de tema é [M]).

### Tipografia

Fonte **Geist** (400, 500, 600), números com `tabular-nums` (aplicado no `body`). Escala:

| Estilo do Figma | Tamanho/linha · peso · espaçamento | Classe |
| --- | --- | --- |
| Heading/Página | 24/32 · 600 · −2,5% | `text-heading-page` |
| Heading/Dialog | 18/24 · 600 · −1% | `text-heading-dialog` |
| Heading/Card | 16/24 · 600 · −1% | `text-heading-card` |
| Display/KPI | 24/32 · 600 · −2,5% · tabular | `text-heading-page` |
| Body/Base | 16/24 · 400 | `text-base` (padrão do Tailwind = Figma) |
| Body/Sm (Medium, SemiBold) | 14/20 · 400 (500, 600) | `text-sm` + `font-medium`/`font-semibold` |
| Caption/Xs (Medium) | 12/16 · 400 (500) | `text-xs` |

Heading/Página mobile (20/28) não foi criado (telas mobile fora do escopo).

### Raios, espaçamento, sombras e medidas

| Token | Valor | Uso medido nos frames |
| --- | --- | --- |
| `rounded-sm` | 6 px | monograma do clube, itens de menu |
| `rounded-md` | 8 px | botões, campos, itens da sidebar |
| `rounded-lg` | 10 px | alertas, dialogs, abas |
| `rounded-xl` | 12 px | cards, caixa do ícone da página, rodapé da sidebar |
| `rounded-2xl` | 14 px | painel principal |
| espaçamento | grade de 4 px (escala padrão do Tailwind) | — |
| `shadow-xs` / `sm` / `md` / `lg` | iguais aos Shadow/xs…lg do Figma | botões e cards / painel / popovers / dialogs e toasts |
| foco | `ring-3 ring-ring/50` | Focus/Ring: 3 px, primary a 50% |
| `w-sidebar` / `w-sidebar-collapsed` | 256 / 48 px | Sidebar aberta e recolhida |
| `h-topbar` | 56 px | Topbar |

**Divergência no Figma:** a tabela "Raios" do sistema de design diz `rounded-xl · 14 px · Cards e painel`, mas os frames desenham cards com 12 px e o painel com 14 px. Seguimos os frames (o que a tela mostra).

### Layout (frame J01 `52:124895`)

- Sidebar 256 px em `sidebar`; painel ("SidebarInset", variant inset) com margem 8 px (topo, direita, baixo), `rounded-2xl`, `shadow-sm`, fundo `background`.
- Topbar 56 px, borda inferior, padding 16: botão recolher (`PanelLeft`), separador 1×16, trilha (`ChevronRight` 14 px, último item em `foreground`), botão "Atualizar dados" (`RefreshCw`).
- Conteúdo: padding 28 (topo) / 32 (lados) / 40 (base), blocos com espaço de 24.
- PageHeader: ícone 22 px numa caixa 48 px (`primary-soft`, borda `primary`, `rounded-xl`), título `Heading/Página`, descrição `Body/Sm` em `muted-foreground`, ações à direita.
- Ícones: **Lucide** (as descrições dos componentes do Figma indicam o nome de cada um, ex.: "Lucide users"), 16 px por padrão.

## 3. Mapeamento: frames do Figma → rotas → barema

| Rota | Frames (`node-id`) | Conteúdo | Barema | Etapa |
| --- | --- | --- | --- | --- |
| `/` | W01 `42:63529`, W02 `75:165582` | tela inicial [M]; hoje redireciona para `/players` [D] | — | opcional |
| `/players` | J01 `52:124895` lista · J02 `52:125609` filtros · J03 `52:126173` busca sem acento · J04 `52:126486` só livres × clube · J15 `75:162303` ordenar | tabela, paginação 10/pág + total, busca, filtros combináveis, ordenações [O] | F1 Jogadores, F3 | 5.2 |
| `/players` (dialogs) | J05 `52:127206` novo · J06 `52:128117` erros · J07 `52:129930` cadastrado · J08 `52:130694` menu · J09 `52:131441` editar · J10 `52:133040` condição · J11 `52:133818` · J16 `75:164831` titular · J12 `52:135991` detalhes [M] · J13 `52:135248` excluir · J14 `75:161598` | cadastro, edição, condição, exclusão com confirmação [O] | F1, F2 formulários, F3 mensagens | 5.3 |
| `/players` (compra) | M01 `54:141194` … M08 `75:166330` | escolher clube + fim da fidelidade, resultado com valor, taxa, custo total, fidelidade, novo caixa [O] | F1 Compra | compra (frontend) |
| `/clubs` | C01 `54:138539` lista · C02 `54:138880` novo · C03 `54:139250` recusado · C04 `54:139627` criado · C09 `54:140889` vazia | lista ordenável (nome, patrimônio) + criação [O] | F1 Clubes, F3 | 5.4 |
| `/clubs/:clubId` — Elenco | C05 `54:139956`; E04 `54:149172` clube inexistente | caixa, valor do elenco, patrimônio; elenco na ordem da API com contrato [O] | F1 Clubes | 5.4 |
| `/clubs/:clubId` — Venda | V01 `54:144967` … V05 `75:167030` | confirmação e resultado da venda [O] | F1 Venda | venda (frontend) |
| `/clubs/:clubId` — Escalação | C06 `60:157006`, C07 `60:158030`, C08 `75:160001`, C10 `75:160523`, C11 `75:163024` | formação + titular por vaga, aviso de incompleta [O]; campo "Em campo" [M] | F1 Liga | liga |
| `/clubs/:clubId` — Histórico | H01 `54:146719` … H05 `75:159643`; E05 `54:149306` | tabela, filtros, `summary`, CSV [O] | F1 Histórico | 6.6 |
| `/matches` | L01 `54:149535` histórico · L02 `54:149914` nova · L03 `60:158515` duelos · L04 `54:150565` incompleta; E06 `54:151232` | jogar, placar + 6 duelos, histórico com filtro [O]; campo com jogadores [M] | F1 Liga | liga |
| `/standings` | L05 `54:150880` | tabela na ordem da API [O] | F1 Liga | liga |
| estados | E01 `54:148336` carregando · E02 `54:148765` sem resultados · E03 `54:148977` erro · E07 `75:163564` estados das 6 listas | carregamento, vazio e erro nas 6 listas [O] | F3 | em cada tela |

Elementos do mockup tratados como [M] e ainda não implementados: contadores do menu (Jogadores 23, Clubes 6, Partidas 2), botão "+" de novo clube na sidebar, cartão "Liga Fictícia 2026 / Última partida" no rodapé da sidebar (depende dos endpoints da liga), busca ⌘K e alternância de tema citadas na descrição do componente Sidebar (não aparecem nos frames), detalhes do jogador (J12).

### 3.1 Tela de jogadores (Etapa 5.2) — como foi implementada

Frames consultados: J01 `52:124895` (blocos Filtros `52:125033` e Card · Tabela `52:125076`), J02 `52:125609` (filtros combinados e chips), J04 `52:126486` (Livres × clube), J15 `75:162303` (menu de ordenação), E01 `54:148336`, E02 `54:148765` (card `54:148963`), E03 `54:148977`, E07 `75:163564`.

| Elemento | Figma | Implementação | Origem |
| --- | --- | --- | --- |
| Colunas | 9 obrigatórias + ações | as 9, na ordem do J01; nome com avatar e posição por extenso; clube com sigla e link | [O] + visual do Figma |
| Busca | campo "Buscar por nome" | `search` com debounce de 300 ms; normaliza espaços como a API; 1 caractere não é enviado e mostra orientação; máx. 100 | [O] |
| Posição, condição, clube | SelectTrigger com ícone | `<select>` nativo sob o visual do trigger ("Posição: MEI", "Condição: Mal condicionado") | [O] |
| Idade, valor de mercado | "(Popover)" | popover com mínimo/máximo, validação junto ao campo (16–45 inteiro; 0–550 com até 2 casas, vírgula aceita, enviado com ponto) | [O]; conteúdo do popover [D] (o Figma não desenha o painel aberto) |
| Situação (`free`) | abas Todos/Livres/Em clubes | abas com `aria-pressed`; "Livres" desabilitada com clube escolhido; clube desabilitado com "Livres" + aviso | [O] (bloqueio permitido pelo README) |
| Filtros ativos | chips + "Limpar filtros" | chips removíveis (inclui busca e situação) + "Limpar filtros" (mantém a ordenação) | [M] |
| Ordenação | "Ordenar: nome", 6 opções | `sort` com um critério (as 6 opções do J15); a API aceita 2, o Figma mostra 1 | [O] |
| Paginação | "Mostrando 1–10 de 23 jogadores", Anterior/números/Próxima | `meta` da API; números só de páginas existentes, com reticências acima de 7; em telas estreitas, Anterior/Próxima só com ícone | [O] |
| Agilidade | barra 40 px: vermelha ≤30, verde ≥80 | mesma barra; largura = agilidade %, cores nas faixas da RN03 (só apresentação do número recebido) | [M] |
| Contagem nas abas | "Todos 23 · Livres 7 · Em clubes 16" | só a aba ativa mostra o total (`meta.total_items`); as outras exigiriam 2 consultas extras por mudança de filtro | [D] |
| Estados | E01 esqueleto, E02 vazio, E03 erro | no corpo do card, abaixo das abas e da ordenação (no Figma o card inteiro é trocado); ao recarregar, as linhas ficam visíveis com opacidade e `aria-busy` | [D] |
| Página além da última | — | 200 com `data: []` e `total_items > 0` → "Esta página não tem jogadores" + "Ir para a página N" | [O] RN07 |
| Ações por linha | "Comprar", menu "⋯", "Novo jogador" | "Novo jogador" e menu "⋯" implementados na 5.3 (§3.2); "Comprar" fica para a etapa de compra | 5.3 e compra |

### 3.2 Operações de jogadores (Etapa 5.3) — como foram implementadas

Frames consultados: J05 `52:127206` (novo), J06 `52:128117` (erros), J07 `52:129930` (cadastrado), J08 `52:130694` (menu), J09 `52:131441` (editar), J10 `52:133040` (condição), J11 `52:133818` (condição alterada), J13 `52:135248` (excluir), J14 `75:161598` (excluído), J16 `75:164831` (titular).

| Elemento | Figma | Implementação | Origem |
| --- | --- | --- | --- |
| Novo jogador | botão primário no PageHeader; diálogo grande | `POST /players` com os 11 campos como números; posição em cartões (rádios); valor base e overall "Após salvar" | [O] |
| Validação | erros junto aos campos (J06) | Zod: obrigatórios, nome (V4: 3–100, 2 palavras, sem dígitos, sem controle), faixas de um campo; regras cruzadas só na API (`message` no diálogo) | [O] F2 |
| Resultado do cadastro | J07: valor base, valor de mercado, overall | diálogo com os valores **do 201**; a linha nova fica destacada (`primary-soft`) | [O] |
| Menu "⋯" | J08: Ver detalhes, Editar, Alterar condição, Comprar, Excluir | Editar, Alterar condição e Excluir; Excluir desabilitado com o motivo para jogador com clube; portal com posição fixa; teclado (setas, Home/End, Esc) | [O]; "Ver detalhes" (J12) e "Comprar" não implementados |
| Editar | J09 | carrega `GET /players/{id}`; `PUT` com os 4 campos; posição travada com clube; idade não diminui; dados imutáveis em aviso | [O] RN08 |
| Alterar condição | J10: cartões com descrição e "Atual" | `PATCH`; Apto desabilitado vindo de Doente com o motivo; aviso com o valor de mercado **da resposta** | [O] |
| Excluir | J13: confirmação destrutiva | `DELETE` (204); aviso; volta uma página se a última ficar vazia | [O] RN09 |
| Avisos | J11/J14: toast no canto | `ToastProvider` (some em 6 s; pode fechar) | [O] F3 |
| Titular que fica Doente | J16: alerta "é titular" | **não implementado**: depende de `GET /clubs/{id}/lineup`, que o backend ainda não tem | [M] |
| Prévia dos atributos | J05: barras dos valores digitados | **não implementada** (decorativa) | [M] |

Diferenças visuais [D]: asterisco nos campos obrigatórios (o Figma não mostra; o prompt da etapa pede a indicação); rodapé e aviso de erro fixos no diálogo, com rolagem só no conteúdo (o Figma desenha o diálogo inteiro sem rolagem, em 1440 × 1022).

### 3.3 Clubes (Etapa 5.4) — como foram implementados

Frames consultados: C01 `54:138539` (lista + menu de ordenação), C02 `54:138880` (novo), C03 `54:139250` (recusado), C04 `54:139627` (criado, elenco vazio), C05 `54:139956` (elenco com contratos), C09 `54:140889` (lista vazia), E04 `54:149172` (clube inexistente).

| Elemento | Figma | Implementação | Origem |
| --- | --- | --- | --- |
| Colunas da lista | Clube (sigla + nome), Sigla, Caixa, Valor do elenco, Patrimônio, "Ver clube ›" | as mesmas, valores da API com `formatMoney`; "Ver clube" é link (nome acessível "Ver clube {nome}") | [O] RN11 |
| Contador | "6 clubes · 6 de 20" | tamanho da lista devolvida; 20 é o limite da RN10 (só informativo) | [M] |
| Ordenação | "Ordenar: nome", 3 opções | `?sort=` na URL da tela (`name` some da URL); por nome, a tela usa a consulta do menu (`ClubsContext`, sem 2º `GET /clubs`); por patrimônio, `GET /clubs?sort=net_worth_desc|asc`; nenhuma ordenação na tela (ADR-021) | [O] |
| Sem paginação | — | lista inteira (máx. 20); `DataTable` sem paginação | [O] |
| Estados | C09 vazia, E01/E03 | `DataTable`: esqueleto, vazio com "Novo clube", erro com `message` + "Tentar de novo" | [O] F3 |
| Novo clube | C02: nome, sigla, aviso "começa com 300,00" | `POST /clubs` só com `name` (espaços normalizados, acentos mantidos) e `acronym`; Zod com as regras do backend (ADR-021); com 20 clubes, aviso no diálogo, mas o envio continua (a API decide) | [O] RN10 |
| Recusa | C03: alerta no topo, campo nome em vermelho | `message` da API em `notice` (acima do rodapé, ADR-020); dados mantidos; 409 recarrega a lista | [O]; posição do alerta e campo sem destaque [D] |
| Depois de criar | C04: abre a página do clube + toast | fica na lista (ordenação mantida), linha nova destacada na posição devolvida pela API, menu atualizado, toast com caixa, valor do elenco e patrimônio **do 201** | [D] (prompt da etapa) |
| Cabeçalho do clube | sigla num quadro, "Sigla AGU", "6 de 12 jogadores", "Comprar jogadores" | igual, sem o botão de compra (etapa de compra); volta pela trilha "Clubes" | [O]; compra pendente |
| Resumo | 4 cards: Caixa, Valor do elenco, Patrimônio, Elenco | os 4, valores da API (nada somado na tela); 1 coluna < 640 px, 2 até 1280 px, 4 acima | [O] |
| Abas | Elenco · Escalação · Histórico | implementadas na 6.6 (§3.5) | [O] |
| Elenco | Jogador, Posição, Overall, Condição, Valor de mercado, Valor de compra, Fim da fidelidade (data + hora), Dias restantes, % de multa, "Vender" | as 9 colunas na ordem da API (RN11); data em Brasília (`Intl`, `America/Sao_Paulo`); `remaining_days` e `penalty_rate` como vieram; multa 0% verde com ✓, 20% vermelha, demais amarela; sem contrato ativo → "—"; nome quebra linha para caber em 1366 px; sem "Vender" (etapa de venda) | [O] RN11/RN15 |
| Elenco vazio | C04: "Nenhum jogador no elenco" + "Ver jogadores livres" | mensagem "Este clube ainda não possui jogadores."; sem o botão (a lista de jogadores não abre filtrada por URL) | [D] |
| Clube inexistente | E04 | `GET /clubs/{id}` → 404: `message` da API + "Voltar para clubes"; id fora do formato também vai à API (V8 responde 404) | [O] |

### 3.4 Compra (Etapa 6.4) — como foi implementada

Frames consultados: M01 `54:141194` (confirmação), M02 `54:141877` (enviando), M03 `54:142564` (falha de rede), M04 `54:143254` (recusada por caixa), M05 `54:143944` (concluída), M06 `54:144621` (filtro por clube depois), M07 `75:165726` (elenco cheio), M08 `75:166330` (recompra).

| Elemento | Figma | Implementação | Origem |
| --- | --- | --- | --- |
| Botão na linha | "Comprar" (outline, carrinho) só em jogador livre, antes do "⋯" | igual (nome acessível "Comprar {nome}"); o menu "⋯" também tem "Comprar", desabilitado com o motivo para jogador com clube | [O] F06 |
| Diálogo | M01: jogador com valor de mercado, clube com caixa, data + hora, aviso da taxa, "Confirmar compra" | os mesmos campos; o botão do formulário é "Revisar compra" e abre um **passo de revisão** no mesmo diálogo, com a frase "Confirma a compra de … para …, com fidelidade até … às 10h15?", o valor de mercado como referência e o aviso de que taxa e custo são da API (pedido do prompt da etapa) | [O] + [D] |
| Data | campos de data e hora; "enviado com o fuso (−03:00)" | `<input type="date">` + `<input type="time">` (só texto, sem fuso); envio montado como `AAAA-MM-DDTHH:MM-03:00`; validação com o deslocamento fixo de Brasília (ADR-024) | [O] RN01 |
| Enviando | M02: "Comprando…", aviso, botões desabilitados | igual; Esc e X também bloqueados | [O] F3 |
| Recusa | M04/M07/M08: "Compra recusada" + `message` | volta ao formulário com os dados e o `message` (no `notice`, acima do rodapé, ADR-020) | [O] |
| Sem conexão | M03: "Sem conexão" + "Tentar de novo" | antes de liberar "Tentar de novo", consulta `GET /players/{id}`: livre → tenta de novo; já num clube → avisa que a compra pode ter sido concluída e atualiza os dados; consulta falhou → "Conferir de novo" (sem novo POST) | [O] + [D] |
| Resultado | M05: valor, taxa, custo total, fidelidade, contrato, novo caixa, "Ver clube" | igual, com os números do 200; custo total = `cash_change` sem sinal | [O] F06 |
| Depois | M06: tabela e filtro por clube atualizados | `refreshAll()`: lista, menu, filtros e página do clube recarregam pela API | [O] F07 |
| Página do clube | "Comprar jogadores" | abre `/players` em "Livres", com aviso "Comprando para o …" e o clube já escolhido no diálogo (estado da navegação, sem query param novo) | [O] |

### 3.5 Histórico do clube (Etapa 6.6) — como foi implementado

Frames consultados: H01 `54:146719` (histórico completo, abas), H02 `54:147270` (só vendas, CSV exportado), H03 `54:147634` (por jogador), H04 `54:147991` (vazio), H05 `75:159643` (filtro recusado), E05 `54:149306` (erro ao carregar), C05 `54:139956` (aba Elenco).

| Elemento | Figma | Implementação | Origem |
| --- | --- | --- | --- |
| Abas | Elenco 6 · Escalação · Histórico 10, sublinhado na ativa | `Tabs` (padrão WAI-ARIA: setas, Home, End); contagem do elenco e do histórico sem filtro; aba e filtros na URL (`?tab=history&type=VENDA&player_id=2`), então outro clube pelo menu começa sem filtros; abaixo de 640 px os ícones das abas somem para caberem em 375 px | [O] + [D] |
| Escalação | aba com conteúdo (C06) | desabilitada (`aria-disabled`), com "Em breve" e o motivo no `title`; nenhum pedido nem tela de mentira (etapa da Liga) | [D] (prompt) |
| Tabela | Data e hora, Tipo, Jogador, Valor, Taxa ou comissão, Multa, Lucro, Variação do caixa | as 8 colunas na ordem da API; data e hora em Brasília; badge Compra (outline, carrinho) e Venda (secundário, mão com moedas); nome do momento (`player_name`); lucro nulo "–" (leitor de tela: "Não se aplica"); lucro e variação com sinal e cor (verde crédito, vermelho débito) | [O] RN17 |
| Tipo | duas caixas marcáveis | as duas marcadas = todas (sem `type` na URL da API); a última marcada fica desabilitada | [O] |
| Jogador | "Jogador: todos" / "Jogador: Meia Lua" | `FilterSelect` com "Jogador" quando vazio; opções tiradas do histórico sem filtro (inclui vendidos e excluídos; nome da transação mais recente; nomes iguais com o id) | [O] |
| Limpar filtros | link ao lado dos filtros | igual, só com algum filtro ativo; também no vazio filtrado | [O] |
| Totais | 5 blocos abaixo da tabela | os 5 do `summary` da mesma resposta da tabela; lucro total com sinal e cor; 2 colunas no celular | [O] F10 |
| Exportar CSV | botão outline no topo do card; toast "CSV baixado" | `GET …/export` com a mesma query da tabela; arquivo `historico-clube-{id}.csv` com os bytes da API; "Exportando…" e trava contra clique duplo; toast com os filtros em texto; recusa em alerta dentro do card, com nova tentativa | [O] F11 |
| Vazio | H04: "Nenhuma transação ainda" + totais zerados | igual; com filtros, "Nenhuma transação com esses filtros" + "Limpar filtros" e os totais zerados da API | [O] F3 |
| Filtro recusado | H05: alerta "O filtro foi recusado" + `message` | igual (400 e 404 com filtro ativo); sem tabela e sem totais | [O] |
| Erro | E05: card de erro + "Tentar de novo" | `DataTable` com o `message`; totais e exportação indisponíveis até carregar | [O] F3 |

## 4. Componentes

Implementados:

| Componente | Local | Responsabilidade | Etapa |
| --- | --- | --- | --- |
| `AppLayout`, `Sidebar`, `Topbar` | `app/layout/` | estrutura comum; menu aberto/recolhido (≥1024 px) ou sobreposto (<1024 px); trilha; atualizar dados; fornece a lista de clubes (`ClubsContext`) | 5.1 |
| `Button` | `shared/components/` | variantes `primary`, `outline`, `ghost`; tamanhos `default`, `sm`, `icon`, `iconSm` (Figma `6:509`) | 5.1 |
| `Card`, `PageHeader` | `shared/components/` | superfície; ícone, título, descrição e ações | 5.1 |
| `DataTable` | `shared/components/` | colunas configuráveis; estados **carregando** (esqueleto + `role="status"`), **vazio** (conteúdo recebido) e **erro** (`message` + "Tentar de novo"); rolagem horizontal interna | 5.2 |
| `EmptyState` | `shared/components/` | bloco de vazio/erro/não encontrado (E02, E03, E04) | 5.2 |
| `Badge` | `shared/components/` | `outline`, `secondary`, `success`, `warning`, `destructive`, com ponto opcional (Figma `6:560`) | 5.2 |
| `Input`, `FilterSelect` | `shared/components/` | campo de texto (Figma `6:721`); filtro de seleção com ícone (Figma `6:866`) | 5.2 |
| `PlayersFilters`, `RangeFilter`, `PlayersTableToolbar`, `PlayersTable`, `PlayersPagination`, `ConditionBadge`, `PlayerAvatar` | `features/players/` | peças da tela de jogadores; `ConditionBadge` e `PlayerAvatar` serão reaproveitados no elenco do clube | 5.2 |
| `Dialog`, `ConfirmDialog` | `shared/components/` | modal com foco preso, Esc, título/aviso/rodapé fixos; confirmação com variante destrutiva e estado de envio (ADR-020) | 5.3 |
| `FormField`, `Alert` | `shared/components/` | rótulo + campo + dica + erro ligados por `aria-describedby`; aviso info/warning/destructive (Figma `6:978`) | 5.3 |
| `ToastProvider` / `useToast`, `useApiAction` | `shared/hooks/` | avisos de sucesso/erro; ação de escrita com trava síncrona contra envio duplo | 5.3 |
| `PlayerDialogs`, `CreatePlayerDialog`, `CreatedPlayerDialog`, `EditPlayerDialog`, `ConditionDialog`, `DeletePlayerDialog`, `PlayerActionsMenu`, `PositionPicker`, `PlayerSummary` | `features/players/` | operações de jogador | 5.3 |
| `buttonClasses` | `shared/components/button-styles.ts` | classes do `Button` também para links com cara de botão ("Ver clube", "Voltar para clubes") | 5.4 |
| `Select` | `shared/components/` | seleção de formulário com o visual do Input (`<select>` nativo) | 6.4 |
| `BuyPlayerDialog`, `PurchaseResultDialog`, `buy-player-schema`, `loyalty-date` | `features/market/` | compra (formulário, revisão, recuperação de falha de rede, resultado) e datas de Brasília | 6.4 |
| `ClubsTable`, `CreateClubDialog`, `ClubMonogram`, `ClubSummaryCards`, `SquadTable` | `features/clubs/` | lista, cadastro, sigla em quadro, resumo e elenco do clube; o elenco reaproveita `ConditionBadge`, `PlayerAvatar` e `DataTable` | 5.4 |
| `Tabs` (+ `tabIds`) | `shared/components/` | abas acessíveis com contagem e aba desabilitada com motivo | 6.6 |
| `TransactionHistoryPanel`, `TransactionFiltersBar`, `TransactionsTable`, `TransactionSummaryBar`, `transaction-filters`, `use-transactions` | `features/market/` | aba Histórico: filtros, tabela, totais e exportação | 6.6 |

Previstos, criados quando a primeira tela precisar (evita componente sem uso):

| Componente | Responsabilidade | Primeira tela |
| --- | --- | --- |
| — | nenhum por enquanto (o `Tabs` entrou na 6.6) | — |

## 5. Formatação e datas

- Moeda: `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` → `1.744,14`; unidade "moedas" ao lado do valor em destaque (Figma, Formatação de dados).
- Variação de caixa: sinal sempre visível (`+35,70` / `−45,55`); entrada e lucro em `success`, saída e prejuízo em `destructive`.
- Percentual de multa: `0%`, `5%`, `10%`, `20%` (`formatPercent`). Dias restantes com separador de milhar (`formatInteger`: `1.089`; a unidade está no cabeçalho "Dias restantes"). Valor ausente: `—` em `muted-foreground`, com texto para leitor de tela.
- Datas exibidas: `07/11/2026` e, abaixo, `10:30` (`formatBrasiliaDateTime`), sempre horário de Brasília (`timeZone: 'America/Sao_Paulo'`). Os testes rodam com `TZ=UTC` (`vite.config.ts`) para provar que a data não depende do fuso do computador.
- Data digitada: `<input type="datetime-local">` devolve `AAAA-MM-DDTHH:MM`; envia-se `${valor}-03:00` (independe do fuso do navegador).

## 6. Formulários (F2 › Formulários — os 7)

Cadastro de jogador, edição, alteração de condição, criação de clube, compra, escalação, nova partida. Validação no cliente (Zod) **apenas** de obrigatórios, tamanhos (nome jogador 3–100, clube 3–60, sigla 3) e faixas de um campo (agilidade 1–100, idade 16–45, atributos/potencial 1–99). Regras cruzadas e de estado ficam na API; a tela mostra o `message`. Bloqueios preventivos permitidos: "só livres" + clube, DOENTE → APTO, posição de jogador com clube, idade menor que a atual. Exceção registrada na ADR-021: a sigla do clube é conferida com o nome no cliente (regra de formato do campo `acronym`, só texto); unicidade e limite de 20 clubes ficam na API.

Regras de escrita do Figma (Escrita e acessibilidade): botões começam com verbo; um botão preenchido (`primary`) por tela; erros dizem como corrigir; status nunca só por cor (badge com texto); rótulo visível em todo campo; foco visível; contraste ≥ 4,5:1.

## 7. Responsividade (diferencial F5, 1 ponto)

Decisão do usuário (18/10/2026): o foco é o desktop e as telas da página "Telas · Mobile" não serão reproduzidas. O layout base já não tem rolagem horizontal em 375 px (menu vira painel sobreposto, padding lateral de 16 px); cada tabela rola dentro do próprio quadro (`DataTable`, largura mínima `min-w-4xl`), o que mantém o critério do F5 ao alcance sem telas próprias.

Jogadores em 375 px (medido na Etapa 5.2): página com `scrollWidth` = 375; filtros empilhados (busca em linha inteira); tabela rola dentro do card (926 px de conteúdo em 325 px); popover de faixa ocupa a largura útil; paginação cabe sem cortar.

Clubes em 375 px (medido na Etapa 5.4): lista e página do clube com `scrollWidth` = 375; tabela de clubes rola no card (896 px em 325 px), elenco também (978 px em 325 px); cards do resumo em 1 coluna; diálogo de cadastro com 343 px e 16 px de margem, erro da API visível; menu sobreposto com os clubes. Em 1366 × 768 o elenco cabe sem rolagem interna (1021 px).
