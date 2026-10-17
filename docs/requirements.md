# Requisitos e rastreabilidade

Este documento **não substitui** o enunciado. Ele indexa as regras, liga cada uma ao endpoint, ao item do barema e ao teste que a cobre, e lista as armadilhas de interpretação. Para o texto completo e as tabelas de exemplo, consulte o [README oficial](https://github.com/isi-tics/desafio-isi-dev-1/blob/main/README.md) (seções citadas entre parênteses).

Legenda de testes: **U** = unitário de domínio (Jest, sem banco), **E** = e2e da API (Jest + Supertest + Postgres de teste), **C** = componente no frontend (Vitest).

## 1. Peso no barema (para priorizar)

| Bloco | Pontos | Itens |
| --- | --- | --- |
| B1 Roteiro da API | 30 | Jogadores 9 · Clubes 1,5 · Compra 5 · Venda 5 · Clubes c/ elenco 1 · Histórico/CSV 4 · Liga 4,5 |
| B2 Qualidade backend | 10 | camadas, cálculos únicos, validação/erros centralizados, transações, segurança, código morto |
| B3 Banco | 6 | criação/recriação reprodutível, estrutura exata, unicidades |
| B4/F4 README + Git | 2+2 | itens do README; **≥10 commits por pasta, push em ≥3 dias distintos**, ≤50% mensagens genéricas |
| B5 Diferenciais backend | 2 (máx.) | testes, Docker, Swagger, logs, lint/format — 0,5 cada |
| F1 Roteiro da interface | 30 | Jogadores 7 · Clubes 2 · Compra/venda 8 · Histórico 6 · Liga 7 |
| F2 Qualidade frontend | 10 | componentes não duplicados, camada de API, atualização sem reload, 7 formulários, código morto |
| F3 Usabilidade | 6 | mensagens (sucesso + `message` da API; duplo clique = 1 pedido), estados das 6 listas, formatação |
| F5 Diferenciais frontend | 2 (máx.) | responsividade 375px (1), testes (1), lint/format (0,5) |

Itens do roteiro valem **tudo ou nada**: uma verificação errada zera o item.

## 2. Regras gerais (README › "Premissas e regras gerais")

| Regra | Resumo operacional | Onde | Barema | Testes |
| --- | --- | --- | --- | --- |
| Arredondamento | 2 casas, **meio para longe do zero**, uma vez no resultado final; resultado de outra regra entra já arredondado | domínio `money` | B05, B06, B10, B14, B15 | U |
| Ordem alfabética | minúsculas → NFD → remove `Mn` → compara por **code point**; empate → id crescente | domínio `text` | B07, B09, B13, B22 | U + E |
| V1 | corpo deve ser **objeto** JSON; JSON inválido, array ou primitivo → 400; endpoints sem corpo ignoram o corpo | pipe/filtro global | B01, B02 | E |
| V2 | tipo estrito: `"15"` recusado; `50.5` recusado em inteiro, `50.0` aceito | DTO | B01 | E |
| V3 / V7 | campos calculados/controlados e desconhecidos são **ignorados sem erro** (whitelist, não `forbidNonWhitelisted`) | ValidationPipe | B03 | E |
| V4 | trim + colapsa espaços **antes** de validar tamanho; caracteres de controle → 400; vazio = ausente; `search` vazio → 400 | transform no DTO | B01, B07 | U + E |
| V5 | valores de lista case-sensitive (`ata` → 400) | DTO | B01 | E |
| V6 | obrigatório ausente ou `null` → 400 | DTO | B01 | E |
| V8 | id na URL fora de `^[1-9]\d*$` ou > 2147483647 → **404** (não 400); jogador excluído = inexistente | `ParseIdPipe` | B02, B08 | E |
| V9 | 400 formato · 404 inexistente · 409 regra de negócio | filtro global | B02 | E |
| RN01 | entrada `AAAA-MM-DDTHH:MM-03:00` estrita, data inexistente → 400; saída `AAAA-MM-DDTHH:MM:SS-03:00` | domínio `datetime` | B12 | U + E |
| Convenções | prefixo `/api/v1`; snake_case; `201` + `Location` em POST players/clubs/matches; `Content-Type: application/json` inclusive em erros; CORS só para a origem configurada (nunca `*`) | bootstrap | B02, B03 | E |

## 3. Regras de negócio

| RN | Resumo | Endpoints | Barema | Testes |
| --- | --- | --- | --- | --- |
| RN02–RN05 | desconto por condição (0/15/30%), ajuste por agilidade (½ se 80–100; +10 p.p. se 1–30; só fora de APTO), idade (+10% ≤21; −10% ≥32), teto −40%, `base × (100+pct)/100` arredondado, piso 1,00 | GET/POST/PUT/PATCH players, clubs, compra, venda | B05, B13 | U: 10 linhas da tabela RN05 + ficha-exemplo B05; E |
| RN06 | overall = Σ(atributo × peso)/100, inteiro meio-para-cima, **nunca gravado**; valor base progressivo (0,50 · 2,00 · 6,00), jovem promessa `×(100+pot−ovr)/100`, piso 1,00, **gravado só no cadastro** | POST players | B06 | U: 5 overall + 9 valor base; E |
| RN07 | listagem paginada; filtros combinados; `sort` com até 2 critérios + desempate nome, id; `position` na ordem GOL→ATA; `meta.total_pages = ceil(total/limit)` | GET /players | B07, B17 | U (ordenação) + E |
| RN08 | PUT muda só nome/posição/agilidade/idade; com clube não muda posição (409); idade não diminui (409) | PUT /players/{id} | B03, B04, B17 | E |
| RN09 | DELETE lógico (`excluido_em`), 204 sem corpo; só jogador livre (409); excluído = 404 em tudo | DELETE /players/{id} | B08, B17 | E |
| RN10 | clube nasce com 300,00; nome único **case-insensitive, accent-sensitive** (também no banco); sigla única; máx. 20 clubes (409) | POST /clubs | B09, B3 | U (sigla) + E |
| RN11 | elenco ordenado GOL→ATA, nome, id; contrato com fim, dias restantes, % multa; `squad_value`, `net_worth` calculados; `GET /clubs?sort=` | GET /clubs, GET /clubs/{id} | B09, B13, B17 | E |
| RN12 | compra só de livre; preço = valor de mercado atual; clube não recompra quem vendeu; operação atômica (caixa, elenco, contrato ATIVO, transação COMPRA) | POST /players/{id}/buy | B10, B11, B16 | E |
| RN13 | taxa 5% só se valor > 30,00; custo ≤ **exatamente** caixa/2 (sem arredondar) | buy | B10 | U: 5 linhas da tabela |
| RN14 | máx. 12 jogadores no elenco | buy | B11 | E |
| RN15 | dias = `ceil((fim − agora)/1 dia)`, ≤0 → 0; 0%/5%/10%/20%; multa ≤ 10,00; RESCINDIDO com multa, ENCERRADO sem | sell, GET /clubs/{id} | B13, B14 | U: 7 linhas da tabela |
| RN16 | lucro = venda − compra; comissão progressiva (10% até 10,00 + 20% acima), só com lucro > 0, arredondada uma vez; crédito = valor − multa − comissão; jogador volta livre; transação VENDA; livre → 409 | POST /players/{id}/sell | B15, B16 | U: 6 + 5 linhas |
| RN17 | histórico imutável (nome e valores do momento); ordem `created_at desc, id desc`; filtros `type`, `player_id`; `summary`; 300 + Σ`cash_change` = caixa | GET /clubs/{id}/transactions | B18 | E |
| RN18 | CSV `;`, vírgula decimal, LF, UTF-8 sem BOM, cabeçalho sempre, aspas para `;`/`"`, `lucro` vazio na compra, erros em JSON | GET …/transactions/export | B19 | U (formatação) + E |
| RN19 | 1 GOL + 4 de linha por formação (`3-1`, `2-2`, `2-1-1`, `1-2-1`); substitui tudo; 409 fora do elenco/DOENTE/formação; titular sai na venda ou ao virar DOENTE | PUT/GET /clubs/{id}/lineup | B20 | U (formação) + E |
| RN20 | 6 duelos determinísticos; atributo por posição; MAL_CONDICIONADO × 0,85 inteiro meio-para-cima; gol se ataque > defesa; grava partida + formações + 6 duelos atomicamente | POST /matches | B21 | U: exemplo Águias × Delta + 4 formações |
| RN21 | histórico de partidas (desc, id desc), filtro `club_id`; classificação calculada com todos os clubes; desempate pontos, saldo, gols pró, nome, (id) | GET /matches, /matches/{id}, /standings | B22 | U: exemplo 6 clubes; E |

## 4. Ordem das validações por endpoint

Princípio: **400 (formato) → 404 (existência) → 409 (regra de negócio)**. O roteiro nunca combina dois erros (V9), mas a ordem fixa evita gravações parciais e mantém o código previsível.

| Endpoint | 400 | 404 | 409 |
| --- | --- | --- | --- |
| `POST /players` | corpo, tipos, V4, listas, limites, regras cruzadas (idade≥35 → agilidade≤85; Σ atributos ≤480; potencial ≥ maior atributo; idade≥33 → potencial = maior atributo) | — | — |
| `PUT /players/{id}` | corpo, tipos, limites, idade≥35 → agilidade≤85 | id | posição de jogador com clube; idade menor que a atual |
| `PATCH /players/{id}/condition` | `condition` ausente/inválida | id | DOENTE → APTO |
| `DELETE /players/{id}` | — | id (inclui já excluído) | jogador com clube |
| `GET /players` | params (formatos estritos, faixas, contradições, `free=true`+`club_id`, sort repetido) | `club_id` inexistente | — |
| `POST /clubs` | nome (3–60, 2–5 palavras, só letras/espaço/hífen/ponto), sigla (3 letras A–Z, subsequência do nome começando pela 1ª letra, não todas iguais) | — | nome/sigla repetidos; 21º clube |
| `GET /clubs` | `sort` inválido | — | — |
| `POST /players/{id}/buy` | `club_id` (≤0 → 400), `loyalty_until` (formato RN01, futuro, ≤1095 dias) | jogador, clube | jogador com clube; custo > 50% do caixa; elenco cheio; recompra |
| `POST /players/{id}/sell` | — | jogador | jogador livre |
| `GET /clubs/{id}/transactions[/export]` | `type`, `player_id` formato | clube, jogador do filtro (inclui excluído) | — |
| `PUT /clubs/{id}/lineup` | `formation`, `player_ids` (lista de 5 inteiros positivos distintos) | clube, jogadores | fora do elenco, DOENTE, posições não fecham a formação |
| `POST /matches` | ids, mandante = visitante | clubes | escalação incompleta |
| `GET /matches` | `club_id` formato | `club_id` inexistente | — |

## 5. Armadilhas identificadas (riscos de zerar itens)

1. **`message` como array**: o `ValidationPipe` padrão do Nest devolve `message: string[]`. O enunciado exige texto → `exceptionFactory` próprio.
2. **Id inválido na URL é 404**, não 400 (`ParseIntPipe` do Nest devolve 400).
3. **Conversão implícita** de tipos (`enableImplicitConversion`) faria `"15"` passar → manter desligada no corpo; query params validados por regex próprias.
4. **Arredondamento de float** (`0.385 * 100`) → domínio em centavos inteiros com divisão racional arredondada.
5. **Limite de 50% sem arredondar**: comparar `2 × custo ≤ caixa` em centavos.
6. **Dias restantes**: `ceil`, não `floor`/`round` (a ficha-exemplo zerou B14 por isso). Cálculo em um único lugar, reutilizado pela venda e pela consulta do clube.
7. **Ordenação por nome**: collation do Postgres ≠ regra do enunciado → ordenar na aplicação com comparador próprio.
8. **CSV vazio**: deve conter a linha de cabeçalho (a ficha-exemplo zerou B19 por isso).
9. **Unicidade do nome do clube no banco**: "Águias FC" ≠ "Aguias FC", mas "águias fc" = "Águias FC" → coluna normalizada (minúsculas, sem remover acentos) com `UNIQUE`.
10. **Histórico imutável**: nomes e valores do momento gravados na transação/duelo; nunca fazer join para exibir o nome atual.
11. **Escalação**: titular vendido/DOENTE é removido na mesma transação; a formação permanece; `complete=false`.
12. **Frontend**: classificação/elenco na ordem devolvida pela API (a ficha-exemplo zerou F14 por reordenar); exibir os 6 duelos (zerou F13).
13. **Duplo clique**: botão desabilitado **e** guarda síncrona (ref) contra envio duplo.
14. **Datas digitadas na tela** são Brasília independentemente do fuso do navegador → concatenar `-03:00`, não usar `toISOString()`.
15. **Git**: commits em `frontend/` precisam de push em ≥3 dias distintos → começar o frontend cedo.
16. **Ambiente da banca**: Ubuntu 24.04 limpo, comandos copiados literalmente, 30 min, Node instalado só na versão do README → testar o README numa pasta limpa antes da entrega.

## 6. Pontos não definidos pelo enunciado (decidir e registrar no README › "Decisões e premissas")

- Texto das mensagens de erro (português, com valores relevantes).
- Comportamento com corpo JSON inválido enviado a endpoint sem corpo (venda): o parser recusa antes; o roteiro não envia corpo nesses pedidos.
- Barra final nos caminhos (Express é tolerante por padrão; o roteiro não envia).
- Tela inicial e contadores do menu (opcionais).
