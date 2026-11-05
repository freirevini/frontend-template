# 2. De-para: cada elemento da landing em Streamlit

Base: Streamlit **1.66.1** (14/10/2026), API conferida por introspecção e no protótipo em `poc/`. Técnicas:

- **Nativo**: widget ou layout do Streamlit sem CSS.
- **Config**: `.streamlit/config.toml` (tema claro e escuro, sidebar, fontes, raio, cores de gráfico).
- **CSS**: regras sobre seletores estáveis: classe `st-key-<chave>` de todo container ou widget criado com `key=`
  (desde 1.39) e atributos `data-testid` (`stSidebar`, `stButtonGroup`, `stPopoverButton`, `stDataFrame`, …). Classes
  `st-emotion-cache-*` nunca entram no CSS (mudam a cada versão).
- **v2**: `st.components.v2.component(name, html=, css=, js=)`: HTML/JS próprio renderizado no DOM da página (não em
  iframe), com `setTriggerValue` devolvendo cliques ao Python. Usado para tudo que é "lista clicável" (legendas, temas).
- **Plotly**: `st.plotly_chart(fig, theme=None, config={"displayModeBar": False})` com as cores dos tokens.

Fidelidade: **Igual** (não se distingue), **Equivalente** (mesma função, detalhe visual diferente), **Aproximado**
(função parecida, diferença perceptível), **Diferente** (outra forma de fazer o mesmo), **Não há** (sem equivalente
razoável).

## 2.1 Chrome: tema, layout, navegação

| Elemento | Streamlit | Técnica | Fidelidade | Observações |
|---|---|---|---|---|
| Tokens claro e escuro | `[theme.light]` e `[theme.dark]` com `primaryColor`, `backgroundColor`, `secondaryBackgroundColor`, `textColor`, `linkColor`, `borderColor`, cores da paleta básica, `dataframe*`, `chartCategoricalColors`; `--brand-*` em `:root` via `st.html("<style>")` para o CSS próprio | Config + CSS | Igual | o viewer escolhe Light / Dark / Use system no menu ⋮ › Settings; `st.context.theme.type` diz ao Python qual está ativo |
| Inter | `[[theme.fontFaces]]` apontando para `static/fonts/*.woff2` com `server.enableStaticServing = true`; `theme.font` e `headingFont` | Config | Igual | sem CDN; 4 pesos latinos (97 kB) |
| Seletor Claro / Escuro / Automático no header | botão `st.popover("Tema")` com três botões; cada um grava `localStorage["stActiveTheme-<pathname>-v2"] = '"Light"' / '"Dark"' / '"System"'` por `st.html(..., unsafe_allow_javascript=True)` e recarrega | CSS + JS | Aproximado | funciona (verificado), mas usa a chave interna do frontend, não uma API; alternativa oficial é o menu ⋮ do Streamlit |
| Modo automático | tema do sistema (`prefers-color-scheme`) é o padrão do Streamlit | Nativo | Igual | |
| Sidebar navy com marca | `[theme.light.sidebar]` / `[theme.dark.sidebar]` (`backgroundColor` `#0e1650` / `#0c1238`, texto branco, `primaryColor` ciano) + `st.html` da marca | Config + CSS | Igual | largura padrão 300 px (256 na landing): ajustável por CSS |
| Itens e grupos do menu | `st.navigation(pages, position="hidden")` + sidebar própria: `st.page_link` para Início / Analítico; `st.expander("Triagent", icon=…)` como grupo; subitens `st.page_link(page, label, query_params={"secao": id})` | Nativo + CSS | Equivalente | ícones são Material (`:material/speed:`), não CoreUI; para o glifo exato, v2 com os SVGs do `@coreui/icons` (os mesmos arquivos) |
| Subitem ativo exato, fillete ciano, fundo do grupo | CSS sobre `.st-key-nav-<página>-<seção>-active` e `details[open]` do expander | CSS | Igual | |
| Abrir e fechar grupo só por clique | expander (`expanded=` na página atual) | Nativo | Equivalente | o chevron fica à direita (CoreUI também) |
| Rotas | `st.Page(url_path="triagent")`; `/` = Início; `/dashboard` → página de 1 linha com `st.switch_page` | Nativo | Diferente | caminhos sem `#` (`/triagent?secao=tabela-analitica` em vez de `/#/triagent#tabela-analitica`); exige que o proxy encaminhe todos os caminhos |
| Rolagem até a seção com offset do header | `st.query_params["secao"]` + `st.html("<script>…scrollTo…", unsafe_allow_javascript=True)` com `ResizeObserver` por 2,5 s (porte do `SectionScrollService`) | JS | Equivalente | verificado (rola a 2 800 px e para no gesto); ids `<div id="…" class="page-section">` |
| Header fixo com toggler, data e breadcrumb | header do próprio Streamlit (toggler do menu, ⋮) + faixa própria `st.container(key="app-header", horizontal=True)` com breadcrumb HTML, data pt-BR e o popover de tema | Nativo + CSS | Aproximado | a faixa não é fixa (pode ser com `position: sticky` no `.st-key-app-header`); o botão ⋮ e o "Deploy" ficam ocultos com `toolbarMode = "minimal"` |
| Breadcrumb automático das rotas | montado à mão a partir de `pg.title` | Código | Equivalente | |
| Rodapé navy | `st.html` ao fim do `app.py` | CSS | Igual | |
| Cards | `st.container(border=True, key="card-<id>")` + CSS (`background`, raio 16 px, sombra, padding) | CSS | Igual | a borda do container é a do tema (`borderColor`) |
| Grid responsivo | `st.columns(4, gap="medium")` empilha abaixo de ~640 px | Nativo | Equivalente | sem o degrau "2 colunas em sm": 1 ou 4 |
| 375 px | sidebar recolhida (`initial_sidebar_state="auto"`), colunas empilhadas, tabelas com rolagem interna | Nativo + CSS | Equivalente | verificado sem rolagem horizontal |
| Scroll fino do menu | CSS `scrollbar-width: thin` no `stSidebar` | CSS | Igual | |
| Acessibilidade | widgets nativos têm ARIA próprio; botões HTML da v2 usam `aria-pressed`/`title` como na landing; `role="status"`/`role="log"` e `aria-live` nos blocos HTML | Misto | Aproximado | o painel do chat não é `role="dialog"` com foco gerido como o Angular |
| `prefers-reduced-motion`, impressão | CSS próprio (`@media`) | CSS | Igual | Plotly: `transition` já desligada |

## 2.2 Cards de segmento (Início, Triagent, Scalation)

| Elemento | Streamlit | Técnica | Fidelidade |
|---|---|---|---|
| Card com gradiente e brilho ciano (Triagent), tom petróleo (Scalation), camada escura no tema escuro | `st.container(key="seg-<página>-<id>")` + CSS (`linear-gradient`, `::after` radial); regras extras injetadas só quando `st.context.theme.type == "dark"` | CSS | Igual |
| Ícone + nome, valor 1,75 rem | `st.html` com o SVG do CoreUI inline (`fill: currentColor`) | HTML | Igual |
| Selo "7 a classificar" como botão de filtro | `st.button(type="tertiary")` estilizado como pílula translúcida; `aria-pressed` não existe (estado pela classe do card) | Nativo + CSS | Equivalente |
| Minigráfico branco com pontos / área branca no Início | `st.plotly_chart(sparkline, height=70, theme=None)` com eixos ocultos, `fixedrange`, hover "Normas · Atacado / Janeiro: 65" | Plotly | Equivalente (tooltip do Plotly, não do Chart.js) |
| Card filtrado (anel ciano) e demais a 50 % | classes `is-filtered` / `is-dimmed` por chave + CSS | CSS | Igual |
| Cabeçalho na cor da série (Início) com dois números separados por hairline | `st.html` + CSS por chave (`--segment-color`) | CSS | Igual |
| Erro de carga | `st.html` com a frase | HTML | Igual |

## 2.3 Filtro de período

| Elemento | Streamlit | Técnica | Fidelidade |
|---|---|---|---|
| Segmentado Dia / Mês / Ano | `st.segmented_control(..., on_change=)` dentro de `st.container(key="pf-<id>-gwrap")` + CSS da trilha cinza e do selecionado azul | Nativo + CSS | Igual |
| Chips "Últimos 7 dias…" + "Personalizado" | `st.pills(required=True)` + CSS `.filter-chip` (`[data-testid="stButtonGroup"] button[aria-checked="true"]`) | Nativo + CSS | Igual (ícone de calendário do chip: Material em vez de CoreUI) |
| Formulário De / Até, Aplicar / Cancelar, validação | dois `st.date_input(format="DD/MM/YYYY")` + botões; mensagens iguais (`validate_custom_range`) | Nativo | Equivalente (calendário do Streamlit, meses em inglês no popup) |
| Troca de granularidade mantendo ou descartando o personalizado, com aviso | callbacks `on_change` gravando a seleção em `st.session_state` | Código | Igual |
| Estado independente por card (Tráfego, e-mails, cascata) | uma chave de estado por filtro | Código | Igual |

## 2.4 Gráficos

| Gráfico | Streamlit | Fidelidade | Diferenças |
|---|---|---|---|
| Normativos Recebidos (linhas + tracejada, valores nos pontos, destaque) | Plotly `go.Scatter` por série: `line.dash="dash"`, `shape="spline"`, `mode="lines+markers+text"` com `textposition="top center"`, marcador 7 px com anel na cor do card, `fill="tozeroy"` a 10 % na série ativa, alfa 20 % nas demais, y 0–250 sem rótulos, 5 linhas de grade, hover unificado | Equivalente | o Plotly não empilha rótulos coincidentes (podem sobrepor em pontos iguais); fonte dos rótulos igual (Inter 600 11); sem animação de 400 ms |
| Legenda com totais, participação e barra; clique destaca | `clicklist` v2 (botões HTML com `data-value`) → `st.session_state["tri-highlight"]` | Igual | |
| Rosca com total no centro | Plotly `go.Pie(hole=.62, sort=False)` + `add_annotation`; fatia escolhida com `pull=.06`, a outra a 16 % | Igual | clique na **fatia** não é capturado (o Plotly do Streamlit seleciona pontos de dispersão/barras, não de pizza): o filtro fica nos botões da legenda, como já existem |
| Barras de temas (HTML) | `clicklist` v2 com a mesma estrutura rótulo | trilha | valor e a linha "Outros temas" | Igual | |
| E-mails empilhados com total acima e legenda clicável | Plotly `go.Bar` × 4, `barmode="stack"`, `add_annotation` por pilha, hover unificado; legenda v2 | Equivalente | raio de 4 px só no topo da pilha não existe no Plotly (bordas retas); tooltip "N e-mails" no cabeçalho exige `hovertemplate` próprio |
| Cascata | Plotly `go.Bar` com `base=low` por parte, `barmode="overlay"`, `width=.6`, texto dentro (`insidetextanchor="middle"`, `uniformtext` esconde quando não cabe), `add_shape` para os conectores, `R$` / `%` por recomputação | Equivalente | cantos retos em vez de raio 4 px; tinta do texto por índice da rampa em vez de contraste calculado (fácil de portar `inkFor`) |
| Tooltips | `hoverlabel` com fundo `#20262c`, Inter 12 | Aproximado | sem a chave de cor em quadrado/linha do Chart.js |
| Redesenho ao trocar o tema | rerun com `st.context.theme.type` → novas figuras | Igual | |
| Alternativa | `st.echarts_chart` (1.64) tem cascata, rosca e barras empilhadas com rótulos nativos; não testado aqui | — | opção se o Plotly ficar aquém |

## 2.5 Tabelas, paginação, exportação

| Elemento | Streamlit | Técnica | Fidelidade |
|---|---|---|---|
| Visão Tabela dos gráficos (cabeçalho com chave de cor, rodapé Total) | `st.dataframe(hide_index=True)` com a linha "Total" anexada; `column_config.NumberColumn(format="localized")` | Nativo | Aproximado (sem chave de cor no cabeçalho nem negrito no rodapé; `st.table` com `Styler` resolve o negrito, sem ordenação) |
| Tabela Analítica: ordenação por coluna com seta | `st.selectbox` da coluna + segmentado ↑/↓ (ordenação feita em Python para valer em todas as páginas) | Nativo | Diferente (cabeçalho do `st.dataframe` também ordena, mas só a página carregada) |
| 15 por página, "1–15 de 573", Anterior / Próxima | `st.pagination(num_pages)` (1.66) + rótulo HTML | Nativo | Equivalente (controle numérico em vez de Anterior / Próxima) |
| Botão "Perguntar ao Agente" por linha | `column_config.ButtonColumn(on_click=…, key=…)`; `st.session_state[key].row` dá a linha | Nativo | Igual |
| Coluna Órgão fixa, rolagem lateral | `TextColumn(pinned=True)`; rolagem interna do grid | Nativo | Igual |
| Excel (título, subtítulo, cabeçalho azul, congelamento, totais, larguras, `numFmt`, autofiltro) | `openpyxl` no servidor, `st.download_button(on_click="ignore")` | Nativo | Igual (conferido abrindo o arquivo) |
| Nome do arquivo por período e filtros | `file_name=` calculado | Nativo | Igual |
| "Gerando arquivo..." e erro de exportação | não há estado de geração (o arquivo é montado antes do clique); erro vira `st.error` | Nativo | Diferente |

## 2.6 Agente da Agenda

| Elemento | Streamlit | Técnica | Fidelidade |
|---|---|---|---|
| Botão flutuante e painel (380 × 600) | `st.container(key="chat-fab")` fixo por CSS + `st.popover(icon=…, width="content")`; `[data-testid="stPopoverBody"]` com 400 px | Nativo + CSS | Equivalente (abre para cima a partir do botão; fecha ao clicar fora; não tem "expandir" nem tela cheia no celular sem CSS extra) |
| Balões, autor com avatar, borda por status, blocos de fontes/perguntas/contatos/lista de normas/tabela de documentos | `st.html` com o mesmo HTML/CSS (porte literal de `_chat-widget.scss`) | HTML + CSS | Igual |
| Markdown seguro | porte de `safe-markdown.ts` (escape + p/br/strong/em/code/ul/ol/li/a) | Código | Igual |
| Sugestões (opções, respostas prontas, Voltar, Encerrar, Recomeçar) | `st.button` em `st.container(horizontal=True)` com CSS de chip | Nativo + CSS | Igual |
| Campo de texto 1000 caracteres, Enter envia, contador | `st.chat_input(max_chars=1000)` dentro do painel | Nativo | Equivalente (sem contador "0/1.000"; placeholder igual) |
| Upload (5 arquivos, tipos, 20 MB por conversa) | `st.file_uploader(accept_multiple_files=True, type=[…])` ou `st.chat_input(accept_file="multiple", file_type=[…])`; cotas validadas no servidor | Nativo | Aproximado (textos internos do uploader em inglês: "Drag and drop files here", "200MB per file" → `server.maxUploadSize = 20`; colar com Ctrl+V só no `chat_input`, a verificar) |
| Feedback Útil / Não útil | `st.feedback("thumbs")` por resposta | Nativo | Equivalente (ícones de polegar, sem os textos) |
| Saudação por hora e nome | porte de `chat-greeting.ts` | Código | Igual |
| Sessão em memória, `requestId`, repetição idempotente | estado em `st.session_state`; mock em `st.cache_resource` (um por processo, como o BFF) | Código | Igual |
| "Parar" durante a resposta | sem equivalente direto (o rerun é síncrono); possível com chamada assíncrona em thread + botão, ou `st.write_stream` com cancelamento por `st.session_state` | Código | Aproximado |
| Efeito de digitação | `st.write_stream` (gerador com `time.sleep`) só para texto simples; nos balões HTML não | Nativo | Aproximado |
| Esc minimiza; foco gerido; ponto verde no botão com conversa | Esc fecha o popover (nativo); foco não gerido; ponto possível por CSS na chave | Nativo + CSS | Aproximado |
| "Tentar novamente", sessão expirada, 7 textos de erro | lógica de `ChatSessionService` portada (`_send`) | Código | Igual |
| Perguntar a partir da tabela | `ButtonColumn` → `chat.ask()` abre o painel com a pergunta | Código | Igual |
| BFF real | `requests`/`httpx` para `/conforme/chat/*` com `multipart` no upload; ou chamar o Gemini direto do Python (`google-genai`) | Código | Igual (contrato mantido) |

## 2.7 Comportamentos sem equivalente limpo

| Comportamento da landing | Em Streamlit | Impacto |
|---|---|---|
| Esc ou clique fora limpa os filtros da página | só com JS global (v2 ou `st.html` com script) chamando `setTriggerValue`; o protótipo usa o botão "Remover filtro" | baixo |
| Rótulos de valor empilhados quando coincidem (plugin do Chart.js) | Plotly não reposiciona textos; sobrepõem em pontos iguais | baixo |
| Tooltips com chave de cor e formatação do CoreUI | `hovertemplate` + `hoverlabel` | baixo |
| Animações (400 ms nos gráficos, painel do chat, chips) | desligadas / nativas do Streamlit | estético |
| Sticky header com breadcrumb | faixa própria (pode ser sticky por CSS) | baixo |
| Contador "0/1.000" no chat, "Gerando arquivo...", "Ir para o fim" | não há; `st.chat_input` corta em `max_chars` | baixo |
| Textos internos dos widgets em inglês (uploader, calendário, menu ⋮) | não há localização do Streamlit; esconder/sobrepor por CSS | médio no uploader |
| `aria-pressed`, `role="dialog"`, foco programado | parcial | médio para leitor de tela |
| URL com `#` e bookmarks `/dashboard` | `url_path` + página de redirecionamento | baixo |
| Build estático | processo Python permanente + WebSocket | **alto: muda a hospedagem** (ver `04-cenarios-e-riscos.md`) |

## 2.8 O que o Streamlit faz melhor ou mais simples

- Tabela analítica com busca, redimensionamento, fixação de coluna e download CSV nativos (`st.dataframe`).
- Excel e CSV em Python (pandas/openpyxl) sem limite de bundle; o mesmo código serve relatórios agendados.
- Dados reais com `st.cache_data(ttl=…)` e chamadas HTTP do servidor (o navegador nunca vê o BFF).
- Agente: Gemini via `google-genai` no mesmo processo, com `st.write_stream` para resposta em fluxo.
- Testes: `streamlit.testing.v1.AppTest` roda a página sem navegador (estado, widgets, textos).
- Menos código de interface: o protótipo inteiro tem ≈ 1 850 linhas de Python e 170 linhas de CSS contra ≈ 6 900
  linhas de TypeScript + 72 kB de templates + SCSS na landing (sem contar os 416 testes).
