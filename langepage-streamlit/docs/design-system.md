# Design system

Tokens, tema, tipografia, componentes visuais e paleta de gráficos. Origem: `docs/design-system.md` da landing (mesmos
valores, portados para `src/core/tokens.py`). Regra R10: hex só em `src/core/tokens.py` e no `[theme]` do
`.streamlit/config.toml`.

## 1. Carimbo `tokens-hash`

<!-- tokens-hash: e16d5879b2d0 -->

SHA-1 (12 caracteres) de `src/core/tokens.py`, conferido por `python scripts/docs_check.py`. Mudou `tokens.py`: revise
as tabelas abaixo (valor copiado do arquivo, nunca de memória) e cole o carimbo novo que o check mostra.

## 2. Origem e arquitetura dos tokens

| Camada | Onde | Para quê |
|---|---|---|
| Tema do Streamlit | `.streamlit/config.toml` `[theme]`: `base = "light"`, `primaryColor`, `backgroundColor`, `secondaryBackgroundColor`, `textColor`, `font` | widgets nativos (1.40 aceita só essas chaves) |
| Tokens da marca | `src/core/tokens.py`: `LIGHT`, `DARK` (dicionários), `SEGMENTS` | fonte única dos valores |
| Propriedades CSS | `tokens.css_variables(t)` → `:root{--brand-*;--app-*}`, injetado por `ui.inject_css()` | `src/static/app.css` e HTML de `st.html` usam `var(--brand-*)` |
| Gráficos | `charts.*(tokens(), ...)` | Plotly não lê CSS: recebe a cor do dicionário |
| Excel | `xlsx.py` usa `LIGHT["export_accent"]`/`["export_muted"]` | sempre claro (R9) |

`tokens()` devolve `DARK` quando `theme_type()` é `dark` (ponto de troca, D-003).

## 3. Tokens principais (claro → escuro)

| Token (`tokens.py`) | CSS | Claro | Escuro |
|---|---|---|---|
| `primary` | `--brand-primary` | `#223ad2` | `#6b7cf0` |
| `primary_high` | `--brand-primary-high` | `#192a9a` | `#8491f3` |
| `primary_low` | `--brand-primary-low` | `#edeffc` | `rgba(107, 124, 240, .16)` |
| `highlight` | `--brand-highlight` | `#31c7ed` | `#31c7ed` |
| `highlight_dark` | `--brand-highlight-dark` | `#1099bc` | `#1099bc` |
| `success` | `--brand-success` | `#288f28` | `#36bf36` |
| `warning` | `--brand-warning` | `#ff6600` | `#ff8a3d` |
| `danger` | `--brand-danger` | `#dc1832` | `#f0566b` |
| `content_high` | `--brand-content-high` | `#20262c` | `#eef1f5` |
| `content_low` | `--brand-content-low` | `#4b5968` | `#a9b1bd` |
| `content_disabled` | `--brand-content-disabled` | `#a7b2be` | `rgba(255, 255, 255, .38)` |
| `surface_page` | `--brand-surface-page` | `#f3f5f7` | `#0f1319` |
| `surface_card` | `--brand-surface-card` | `#ffffff` | `#171e28` |
| `surface_mid` | `--brand-surface-mid` | `#eaedf0` | `#1f2733` |
| `surface_high` / `border` | `--brand-surface-high` / `--brand-border` | `#dbe0e5` | `#2b3542` |
| `input_border` | `--brand-input-border` | `#c5ccd4` | `#3a4556` |
| `sidebar` / `sidebar_deep` | `--brand-sidebar` / `--brand-sidebar-deep` | `#0e1650` / `#0a1040` | `#0c1238` / `#080d2b` |
| `chat_accent` | `--app-chat-accent` | `#223ad2` | `#5568e7` |
| `applicable` / `not_applicable` | `--app-applicable` / `--app-not-applicable` | `#0e1650` / `#a7b2be` | `#a4b0f2` / `#a9b1bd` |
| `chart_color` / `chart_grid` | (Plotly) | `#4b5968` / `rgba(32, 38, 44, .08)` | `#a9b1bd` / `rgba(255, 255, 255, .08)` |
| `export_accent` / `export_muted` | (Excel, sem `#`) | `223AD2` / `4B5968` | iguais (só claro) |

Raios: `--brand-radius-xs` .25rem, `-sm` .5rem, `-md` 1rem, `-lg` 1.5rem, `-pill` 100px. Elevações `--brand-elevation-1/2/3/card`
(sombras com `rgba(11, 23, 35, …)` no claro, preto no escuro).

## 4. Paleta de gráficos (validada para daltonismo — não reordenar)

### 4.1 Séries do Normativos Recebidos e cores de segmento (categóricas, ordem fixa)

| Posição | Série | Token | Claro (sobre `#ffffff`) | Escuro (sobre `#171e28`) |
|---|---|---|---|---|
| 1 | Atacado | `series[0]` / `--app-series-1` | `#223ad2` | `#4d61e0` |
| 2 | Corporativo | `series[1]` / `--app-series-2` | `#1099bc` | `#1099bc` |
| 3 | Plataforma | `series[2]` / `--app-series-3` | `#288f28` | `#2fae2f` |
| 4 | Varejo | `series[3]` / `--app-series-4` | `#ae6ae6` | `#ae6ae6` |
| 5 | Normas a Classificar | `series_reference` / `--app-series-reference` | `#dc1832`, tracejada | `#e8475c`, tracejada |

Validação (landing, 2026-10-28, pares adjacentes): PASS nos dois temas. Codificação secundária: referência tracejada,
valor em cada ponto, legenda com total e participação.

### 4.2 Rampas da Cascata (ordinais, componente 1 → 3)

| Rampa | Claro | Escuro |
|---|---|---|
| Total (`wf_total`) | `#17278c`, `#223ad2`, `#8c9ae8` | `#3448d0`, `#5f71ea`, `#8c9ae8` |
| Redução (`wf_decrease`) | `#a51226`, `#dc1832`, `#f07a89` | `#c0162c`, `#e8475c`, `#f59aa6` |
| Conector (`wf_connector`) | `#a7b2be` | `#a9b1bd` |

### 4.3 Regra

A validação vale para a ordem da legenda. Não reordenar `series`, não trocar cor de posição, não inserir série no meio;
série nova vai no fim e é revalidada nos dois temas; passo de rampa trocado revalida a rampa inteira. Procedimento e
critérios (faixa de L, croma, ΔE com simulação de daltonismo, contraste): §4.5 do `design-system.md` da landing.

## 5. Tema escuro (ADR-003)

Streamlit 1.40 aceita um tema só no `[theme]` (o claro da marca). O seletor do header (Claro/Escuro/Automático,
`compat.set_theme_mode`) grava o modo de tema em `localStorage["brand-theme-mode"]` e a chave que o frontend do Streamlit lê,
`stActiveTheme-<pathname>-v1` (`{"name": "Dark"}` para escuro; removida para o claro do `config.toml`), para o endereço
atual e para cada página de `ui.PAGE_SLUGS`, e recarrega a página. "Automático" segue `prefers-color-scheme`
(`theme.js` observa a mudança). A sonda `src/components/theme_probe` informa o tema aplicado a `compat.theme_type()`;
`tokens()` troca o dicionário, `ui.inject_css` injeta as variáveis escuras e `ui._dark_only()` acrescenta as regras só
do escuro (gradiente dos cards com camada preta, chips transparentes, `color-scheme: dark`). Escuro da marca em: página,
sidebar, header, cards, chips e segmentado, gráficos, rodapé e chat. Widgets nativos (date input, dataframe, uploader,
popover, selectbox) ficam no escuro padrão do Streamlit — diferença aceita (D2). A chave do Streamlit não é API pública:
reconferir a cada mudança de versão.

## 6. Tipografia

Inter 400/500/600/700 (`src/static/fonts/inter-latin-*-normal.woff2`, servidas em `/app/static/fonts/`) por `@font-face`
em `app.css`; `font = "sans serif"` no `[theme]` como fallback. Números tabulares (`font-variant-numeric: tabular-nums`)
em tabelas, legendas e indicadores. Hierarquia: título de card 1rem/600, subtítulo .8125rem `--brand-content-low`.

## 7. Componentes visuais (CSS em `src/static/app.css`, seletores `st-key-*`/`data-testid`/`brand-*`)

| Componente | Como | Seletor |
|---|---|---|
| Card | `ui.card(key)` = `st.container(key="card-<key>")`; a caixa (padding 1.25rem, fundo, borda, raio md, `--brand-elevation-card`) fica no `stVerticalBlockBorderWrapper` pai, porque o 1.40 grava inline em cada filho a largura medida no bloco com chave (padding incluído) e o conteúdo vazaria pela direita; `ui.card_title` = `<h4 class="brand-card-title">` + subtítulo + âncora `.page-section` | `[data-testid="stVerticalBlockBorderWrapper"]:has(> div > [class*="st-key-card-"])`, `.brand-card-head` |
| Cards de segmento (gradiente no wrapper, brilho ciano no canto, `padding: 1rem 0 0`; linhas do widget-stat-a da landing: valor 1.75rem/600 + selo "N a classificar" na mesma linha, nome do segmento com ícone, minigráfico no rodapé de borda a borda com 1rem de recuo da linha; petróleo no Scalation; `-filtered` = contorno ciano, `-dimmed` = opacidade .55) | `ui.segment_cards` (o bloco com chave vira `flex-direction: row; flex-wrap: wrap`: valor e selo-botão com largura própria, título e gráfico na linha inteira; selo como `st.button` em `segbtn-*` ou `<span class="brand-stat-pending">`) | `:has(> div > [class*="st-key-seg-"])`, `[class*="st-key-seg-"]`, `st-key-segbtn-*`, `st-key-seg-scalation` |
| Visão geral (Início) | `ui.segment_overview` | `.brand-overview-*` |
| Chips e segmentado | `ui.chip_filter`, `ui.segmented` (`st.pills`/`st.segmented_control`) | `stButtonGroup` |
| Faixa de filtro + "Remover filtro" | `ui.filter_notice` | `.brand-filter-notice` |
| Sidebar navy, marca, "PAINÉIS", grupos, ativo com filete ciano | `app.py` | `stSidebar`, `.brand-lockup`, `st-key-nav-*` |
| Header fixo (`position: sticky` no wrapper) em duas linhas como o da landing: linha 1 (3rem) data pt-BR à direita + botão redondo do tema (`st.popover` com ícone Material do modo, rótulo só para leitor de tela; menu com "Tema" e três botões, o ativo em `primary`); divisor; linha 2 (2rem) breadcrumb; o header do Streamlit fica transparente e o botão de abrir/fechar a sidebar continua o dele (recuo de 2.75rem na linha 1 quando recolhida) | `app.py`, `compat.hstack` | `st-key-app-header`, `st-key-app-header-top`, `st-key-theme-menu`, `st-key-theme-*`, `.brand-header-date`, `.brand-header-crumbs`, `.brand-breadcrumb` |
| "Últimos e-mails": `st.expander` estilizado como linha da lista da landing (seta do Streamlit movida para a esquerda e girada: direita fechado, baixo aberto; data em `*ênfase*` apagada com a amostra de cor do segmento em `::after`, cor pela chave do container; nome do segmento; "N normas" em `**negrito**` à direita; filetes entre linhas; tabela das normas recuada) | `ui.email_row` / `ui.email_row_label` (`src/static/triagent.css`) | `st-key-triagent-emails-list`, `st-key-triagent-emails-item-<id>-<segmento>` |
| Legendas clicáveis (Normativos Recebidos, rosca, temas, e-mails): HTML fiel à landing (`is-active`/`is-dimmed`) + chips `st.pills` centrados abaixo (`compat.clicklist`, ADR-004) | `views/triagent.py`, `triagent.css` | `.brand-traffic-legend*`, `.brand-pie-legend*`, `.brand-theme-*`, `.brand-emails-legend*`, `st-key-clicklist-*` |
| Cascata: faixa de resultado + legenda, tabela HTML com `rowspan` e números tabulares; card demo "Tráfego e vendas" (`.brand-demo-*`, CoreUI progress) | `views/scalation.py`, `scalation.css` | `st-key-wf-toggles`, `.brand-wf-*`, `st-key-card-trafego-e-vendas` |
| Filtro de período: segmentado Dia/Mês/Ano, "Últimos", chips de faixa + Personalizado, painel De/Até em `surface_mid` | `ui.period_filter` | `st-key-pf-<key>-bar/-gwrap/-ranges/-custom` |
| Pager e ação por linha | `compat.pager`, `compat.row_action` | `st-key-pager-*`, `.brand-pager-label`, `st-key-rowaction-*`, `.brand-row-hint` |
| Rodapé navy | `app.py` | `.brand-footer` |
| Agente da Agenda (botão flutuante, painel 380 × 600, balões) | `core/chat.py` | `st-key-chat-*`, `.chat-*` |

Ícones: SVG do CoreUI em `src/static/icons/` por `ui.icon(name)` (data URI base64 + `mask` CSS sobre `currentColor`,
porque o `st.html` descarta `<svg>` inline e `/app/static/*.svg` sai como `text/plain`; aceita `cil-truck` e
`cilTruck`). Usados pelo código: segmentos `cil-truck`, `cil-building`, `cil-devices`, `cil-cart`; faixa de filtro
`cil-filter`; avatar do chat `cil-speech` (mask em `chat.css`); card demo `cil-user`, `cil-user-female`, `cil-options`,
`cib-google`, `cib-facebook`, `cib-twitter`, `cib-linkedin` (acrescentados na F9). A pasta `icons/` tem só esses
arquivos (os do subconjunto da landing sem uso foram removidos em 2026-11-04;
`tests/test_compat_ui.py::test_every_icon_file_is_used_and_every_used_icon_exists` cobra). No menu, nos chips Gráfico/Tabela do Scalation, no seletor de tema e nos
botões do chat, ícones Material do Streamlit (`:material/...`). Classes da landing sem equivalente aqui (removidas):
`.filter-chip`, `.brand-segmented`, `.emails-item`, `.table-responsive`, `c-card*`; o visual vem dos seletores acima.

## 8. Marca

Símbolo oficial da instituição (`src/static/img/brand-mark.svg`, `brand-mark-white.svg`), logotipo do rodapé
(`brand-logo-white.svg`), favicon (`favicon.svg`). Não redesenhar nem distorcer (R10). Sem marca Streamlit na
interface (R8).
