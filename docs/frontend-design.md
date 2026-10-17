# Frontend — estrutura, telas e identidade visual

Fontes: README oficial › "🖥️ Frontend" (funcionalidades obrigatórias, que **prevalecem** sobre o mockup) e barema › F1–F5. O mockup orienta fluxo e disposição; fidelidade visual não pontua.

## 1. Estado da referência visual

| Fonte | Acesso | Situação |
| --- | --- | --- |
| `docs/mockup-tela-inicial.png` (repo oficial) | ✅ | analisado; cores extraídas por amostragem de pixels |
| Figma — "Telas · Desktop" | ❌ | conector Figma não autorizado nesta sessão |
| Figma — "Telas · Mobile" | ❌ | idem |
| Figma — "Sistema de design" | ❌ | idem |

**Pendente:** autorizar o conector Figma no claude.ai (Configurações › Conectores) **ou** exportar as três páginas como PNG/PDF para uma pasta local fora do repositório. Até lá, só os tokens abaixo marcados como "medido" são confiáveis; o resto é provisório e será confirmado.

## 2. Design tokens

Valores **medidos** na imagem da tela inicial (1440 × 900). Todos coincidem com a paleta padrão do Tailwind CSS v4, o que indica que o mockup foi feito sobre ela — por isso o Tailwind v4 dispensa uma paleta customizada.

| Token | Valor medido | Equivalente Tailwind v4 | Uso observado |
| --- | --- | --- | --- |
| `primary` | `#155DFC` | `blue-600` | botão "Iniciar", logotipo, ícones dos cards |
| `primary-subtle` | `#EFF6FF` | `blue-50` | fundo dos ícones dos cards |
| `text` | `#09090B` | `zinc-950` | título, títulos de cards, texto do badge |
| `text-muted` | `#686872` (amostra com antialiasing) | provável `zinc-500` | subtítulo, descrições, contadores, rodapé |
| `border` | `#E4E4E7` | `zinc-200` | bordas de cards e badge |
| `surface-muted` | `#F4F4F5` | `zinc-100` | tecla "Enter" (kbd) |
| `success` | `#00813A` | provável `green-700` | ponto "Liga Fictícia 2026" |
| `background` | `#FFFFFF` | `white` | fundo |

A confirmar no Figma (não inventar): família tipográfica (sans geométrica no texto, monoespaçada nos números "01…06"), escala de tamanhos, raios de borda, sombras, cores de erro/alerta e das condições (APTO / MAL_CONDICIONADO / DOENTE), conjunto de ícones.

## 3. Navegação e telas

A tela inicial do mockup apresenta o fluxo em 6 passos: Jogadores → Clubes → Compra → Venda → Histórico → Liga. Tela inicial, contadores e "últimas partidas" são **opcionais** (README).

| Rota | Tela | Conteúdo obrigatório | Barema |
| --- | --- | --- | --- |
| `/players` | Jogadores | tabela (nome, posição, overall, agilidade, idade, condição, valor base, valor de mercado, clube/"Livre"), paginação 10/pág + total, busca, filtros combináveis, ordenações, Excluir (livres, com confirmação), Cadastrar/Editar/Alterar condição, **Comprar** (livres) | F01–F04, F06 |
| `/clubs` | Clubes | tabela (nome, sigla, caixa, valor do elenco, patrimônio), ordenação nome / patrimônio desc, criar clube | F05, F07 |
| `/clubs/:id` | Clube — aba **Elenco** | caixa, valor do elenco, patrimônio; elenco na ordem da API com valor de mercado, fim da fidelidade, dias restantes, % multa; **Vender** com confirmação e resultado | F07, F08 |
| `/clubs/:id` | Clube — aba **Histórico** | tabela (data/hora, tipo, jogador, valor, taxa/comissão, multa, lucro, variação com +/−), filtro por tipos e jogador, `summary` abaixo, Exportar CSV | F09–F11 |
| `/clubs/:id` | Clube — aba **Escalação** | formação + 1 seletor por vaga (GOL + setores), sem DOENTE; aviso de escalação incompleta | F12 |
| `/matches` | Partidas | escolher mandante/visitante e jogar; resultado com placar + 6 duelos; histórico com filtro por clube; detalhe com duelos | F13, F14 |
| `/standings` | Classificação | tabela na ordem da API | F14 |

## 4. Componentes compartilhados (evitam duplicação — F2 › Componentes)

| Componente | Responsabilidade |
| --- | --- |
| `DataTable` | cabeçalho, linhas, estados **carregando / vazio / erro**, rolagem horizontal interna (375px) |
| `FormField` | rótulo + controle + mensagem de erro junto ao campo |
| `Feedback` (toast/alerta) | sucesso e `message` da API |
| `ConfirmDialog` | confirmação de excluir, vender, comprar |
| `ActionButton` | desabilita durante envio + guarda síncrona contra duplo clique |
| `Pagination`, `Tabs`, `Badge` (condição, tipo de transação, resultado do duelo) | |

## 5. Formatação e datas

- Moeda: `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` → `1.234,50`.
- Datas exibidas: a API já devolve `-03:00`; formatação com `timeZone: 'America/Sao_Paulo'` → `02/11/2026 10:15`.
- Data digitada: `<input type="datetime-local">` devolve `AAAA-MM-DDTHH:MM`; envia-se `${valor}-03:00` (independe do fuso do navegador).
- Variação de caixa: prefixo `+` para entrada e `-` para saída.

## 6. Formulários (F2 › Formulários — os 7)

Cadastro de jogador, edição, alteração de condição, criação de clube, compra, escalação, nova partida. Validação no cliente (Zod) **apenas** de obrigatórios, tamanhos (nome jogador 3–100, clube 3–60, sigla 3) e faixas de um campo (agilidade 1–100, idade 16–45, atributos/potencial 1–99). Regras cruzadas e de estado ficam na API; a tela mostra o `message`. Bloqueios preventivos permitidos: "só livres" + clube, DOENTE → APTO, posição de jogador com clube, idade menor que a atual.

## 7. Responsividade (diferencial F5, 1 ponto)

Telas de jogadores e do clube (com histórico) utilizáveis em 375px sem rolagem horizontal da página: tabelas rolam dentro do próprio quadro; filtros empilham; ações continuam acessíveis. Referência: página "Telas · Mobile" do Figma (pendente de acesso).
