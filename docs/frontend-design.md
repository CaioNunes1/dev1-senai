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
| `/clubs/:clubId` — Histórico | H01 `54:146719` … H05 `75:159643`; E05 `54:149306` | tabela, filtros, `summary`, CSV [O] | F1 Histórico | histórico |
| `/matches` | L01 `54:149535` histórico · L02 `54:149914` nova · L03 `60:158515` duelos · L04 `54:150565` incompleta; E06 `54:151232` | jogar, placar + 6 duelos, histórico com filtro [O]; campo com jogadores [M] | F1 Liga | liga |
| `/standings` | L05 `54:150880` | tabela na ordem da API [O] | F1 Liga | liga |
| estados | E01 `54:148336` carregando · E02 `54:148765` sem resultados · E03 `54:148977` erro · E07 `75:163564` estados das 6 listas | carregamento, vazio e erro nas 6 listas [O] | F3 | em cada tela |

Elementos do mockup tratados como [M] e ainda não implementados: contadores do menu (Jogadores 23, Clubes 6, Partidas 2), botão "+" de novo clube na sidebar, cartão "Liga Fictícia 2026 / Última partida" no rodapé da sidebar (depende dos endpoints da liga), busca ⌘K e alternância de tema citadas na descrição do componente Sidebar (não aparecem nos frames), detalhes do jogador (J12).

## 4. Componentes

Implementados (Etapa 5.1):

| Componente | Local | Responsabilidade |
| --- | --- | --- |
| `AppLayout`, `Sidebar`, `Topbar` | `app/layout/` | estrutura comum; menu aberto/recolhido (≥1024 px) ou sobreposto (<1024 px); trilha; atualizar dados |
| `Button` | `shared/components/` | variantes `primary`, `outline`, `ghost`; tamanhos `default`, `sm`, `iconSm` (Figma `6:509`) |
| `Card` | `shared/components/` | superfície com borda, `rounded-xl`, `shadow-xs` |
| `PageHeader` | `shared/components/` | ícone, título, descrição e ações |

Previstos, criados quando a primeira tela precisar (evita componente sem uso):

| Componente | Responsabilidade | Primeira tela |
| --- | --- | --- |
| `DataTable` | cabeçalho, linhas, estados **carregando / vazio / erro**, rolagem horizontal interna | 5.2 |
| `Pagination`, `Badge` (condição, tipo, resultado), `Avatar` | | 5.2 |
| `FormField` | rótulo + controle + mensagem de erro junto ao campo | 5.3 |
| `Dialog`, `ConfirmDialog` | formulários e confirmações (excluir, vender) | 5.3 |
| `Toast` / `Alert` | sucesso e `message` da API | 5.3 |
| `useApiAction` | estado pendente + guarda síncrona contra duplo clique + `refreshAll` no sucesso | 5.3 |
| `Tabs` | abas do clube | 5.4 |

## 5. Formatação e datas

- Moeda: `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` → `1.744,14`; unidade "moedas" ao lado do valor em destaque (Figma, Formatação de dados).
- Variação de caixa: sinal sempre visível (`+35,70` / `−45,55`); entrada e lucro em `success`, saída e prejuízo em `destructive`.
- Percentual de multa: `0%`, `5%`, `10%`, `20%`. Dias restantes com separador de milhar (`1.089 dias`). Valor ausente: `–` em `muted-foreground`.
- Datas exibidas: `07/11/2026 10:30`, sempre horário de Brasília (`timeZone: 'America/Sao_Paulo'`).
- Data digitada: `<input type="datetime-local">` devolve `AAAA-MM-DDTHH:MM`; envia-se `${valor}-03:00` (independe do fuso do navegador).

## 6. Formulários (F2 › Formulários — os 7)

Cadastro de jogador, edição, alteração de condição, criação de clube, compra, escalação, nova partida. Validação no cliente (Zod) **apenas** de obrigatórios, tamanhos (nome jogador 3–100, clube 3–60, sigla 3) e faixas de um campo (agilidade 1–100, idade 16–45, atributos/potencial 1–99). Regras cruzadas e de estado ficam na API; a tela mostra o `message`. Bloqueios preventivos permitidos: "só livres" + clube, DOENTE → APTO, posição de jogador com clube, idade menor que a atual.

Regras de escrita do Figma (Escrita e acessibilidade): botões começam com verbo; um botão preenchido (`primary`) por tela; erros dizem como corrigir; status nunca só por cor (badge com texto); rótulo visível em todo campo; foco visível; contraste ≥ 4,5:1.

## 7. Responsividade (diferencial F5, 1 ponto)

Decisão do usuário (18/10/2026): o foco é o desktop e as telas da página "Telas · Mobile" não serão reproduzidas. O layout base já não tem rolagem horizontal em 375 px (menu vira painel sobreposto, padding lateral de 16 px); cada tabela futura rola dentro do próprio quadro, o que mantém o critério do F5 ao alcance sem telas próprias.
