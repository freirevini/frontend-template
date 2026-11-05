# 3. Guia de implementação: a Agenda Normativa em Streamlit

Receita para construir o painel em Streamlit com o máximo de fidelidade à landing (cenário B de
`04-cenarios-e-riscos.md`). Cada passo aponta para o arquivo correspondente do protótipo em `poc/`, que já roda. Os
valores (cores, textos, limites, nomes de arquivo) são os da landing; não invente outros: `01-diagnostico-landing.md`
e `docs/glossario-ptbr.md` são a fonte.

Convenções do texto: "terminal" = prompt de comando no destino (PowerShell, bash ou terminal do Cursor); "arquivo" = criar
ou editar o arquivo indicado.

## 3.1 Pré-requisitos

| Item | Exigência | Como verificar (terminal) |
|---|---|---|
| Python | **3.11**, padrão homologado no ambiente corporativo (imagens base `pacotedocker-sgen-base-*` / `genaigke-sgen-base-sample`; conformidade Veracode/SonarQube). Streamlit 1.66 exige `>=3.11`; o protótipo rodou em 3.12.13 sem usar nada além de 3.11 | `python --version` no container do sample |
| Pacotes | **Streamlit homologado: `>= 1.38.0`, faixa 1.38.x a 1.40.x** (compatível com `pylib-sgen-base-genai-framework` 0.20.0); `plotly`, `pandas`, `openpyxl` e as dependências transitivas do Streamlit. O protótipo usou 1.66.1: o que muda em 1.40 está em 3.17 e em `04-cenarios-e-riscos.md` §4.10 | `pip install -r requirements.txt -i <proxy PyPI do Nexus corporativo>` (repositório `pypi-all/simple`; endereço no portal do Titan Sample); nunca URL/git. Se faltar versão, pedir espelhamento (mesma regra da R2) |
| Hospedagem | um processo Python por instância com HTTP **e WebSocket** (`/_stcore/*`); para este produto: **GKE/Titan** (3.14) | ver 3.14 |
| Navegador | Edge/Chrome atuais (CSS `:has()`, `scroll-margin-top`) | — |
| Fonte e ícones | `inter-latin-{400,500,600,700}-normal.woff2` (de `node_modules/@fontsource/inter/files/`) e os SVGs usados (`node_modules/@coreui/icons/svg/free/cil-*.svg`) copiados para `static/`; sem CDN | `poc/static/` já contém |

Ambiente local de desenvolvimento (terminal, na pasta do projeto):

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt      # Windows: .venv\Scripts\pip
.venv/bin/streamlit run app.py                 # abre http://localhost:8501
```

## 3.2 Estrutura de pastas

```
agenda-normativa-streamlit/
  .streamlit/config.toml     tema claro/escuro/sidebar, fontes, servidor
  app.py                     entrada: page config, navegação, CSS, sidebar, header, rodapé, chat
  core/
    tokens.py                tokens da marca claro/escuro (porte de _brand.scss/_theme-dark.scss) e --brand-* em :root
    period.py                porte de period-range.ts (granularidade, presets, validação, rótulos pt-BR)
    data.py                  carga dos dados e derivações (porte de *-derive.ts, waterfall.model.ts)
    charts.py                figuras Plotly (Normativos Recebidos, sparkline, rosca, e-mails, cascata)
    ui.py                    CSS, cards, chips, filtro de período, cards de segmento, âncoras, clicklist (v2), ícones
    xlsx.py                  openpyxl: mesma planilha do xlsx-export.ts
    chat.py                  mock do agente (porte do chat-mock-server.ts), estado, markdown seguro, widget
  views/
    inicio.py  triagent.py  scalation.py  analitico.py   (uma página = um arquivo, como uma pasta em views/ hoje)
  static/
    app.css  fonts/  icons/  img/          servidos em /app/static/... (server.enableStaticServing)
  data/                      mocks (os mesmos JSON de src/assets/data) até o BFF
  requirements.txt
  tests/                     pytest + streamlit.testing (3.15)
```

Regras que valem igual: uma página por arquivo, texto visível em pt-BR, código em inglês, cor só por token, versões
exatas, nada de CDN, docs atualizados na mesma entrega.

**No GKE/Titan o projeto nasce do sample, não desta árvore.** O Cookiecutter da Plataforma Titan gera o repositório a
partir de `streamlit-sgen-base-ia-sample` com `Dockerfile` (base corporativa, usuário não-root), `.streamlit/config.toml` (porta
8501, CORS interno, rotas `/_stcore/*`), `settings.yaml` (aplicação e `auth.mode`), `k8s/` ou templates Helm (ingress
com timeout e WebSocket), `src/` ou `app/` (`app.py`, páginas, cliente HTTP do BFF) e `requirements.txt` apontando para
o Nexus. Mapeamento: `poc/core` e `poc/views` vão para `src/`; o `app.py` do protótipo substitui o ponto de entrada do
sample mantendo o que o sample faz de autenticação; as tabelas `[theme*]` e `[[theme.fontFaces]]` entram no
`config.toml` do sample sem mexer nas chaves de servidor dele; `static/` fica ao lado de `app.py`
(`server.enableStaticServing = true`); o cliente HTTP do sample é a base de `core/data.py` e `core/chat.py` (3.12).

## 3.3 Tema (`.streamlit/config.toml`)

O arquivo completo está em `poc/.streamlit/config.toml`. O que importa:

```toml
[server]
enableStaticServing = true        # /app/static/... (fontes, ícones, imagens)
headless = true
maxUploadSize = 20                # limite do chat (20 MB por conversa é validado no servidor)

[client]
toolbarMode = "minimal"           # sem "Deploy"; o menu ⋮ fica (Settings traz o tema)
showSidebarNavigation = false     # a sidebar é montada à mão (3.5)

[theme]
base = "light"
font = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
headingFont = "Inter, ..."
baseRadius = "0.5rem"             # marca sm
headingFontWeights = [600, 600, 600, 600, 600, 600]
showWidgetBorder = true
showSidebarBorder = false

[[theme.fontFaces]]               # uma tabela por peso: 400, 500, 600, 700
family = "Inter"
url = "app/static/fonts/inter-latin-400-normal.woff2"
weight = 400
style = "normal"

[theme.light]                     # tokens claros de _brand.scss
primaryColor = "#223ad2"
backgroundColor = "#f3f5f7"       # página
secondaryBackgroundColor = "#ffffff"
textColor = "#20262c"
linkColor = "#223ad2"
borderColor = "#dbe0e5"
dataframeHeaderBackgroundColor = "#eaedf0"
chartCategoricalColors = ["#223ad2", "#1099bc", "#288f28", "#ae6ae6", "#dc1832", "#0e1650", "#a7b2be", "#17278c", "#8c9ae8", "#f07a89"]

[theme.light.sidebar]
primaryColor = "#31c7ed"
backgroundColor = "#0e1650"
secondaryBackgroundColor = "#0a1040"
textColor = "#ffffff"

[theme.dark]                      # tokens escuros de _theme-dark.scss
primaryColor = "#6b7cf0"
backgroundColor = "#0f1319"
secondaryBackgroundColor = "#171e28"
textColor = "#eef1f5"
linkColor = "#8c9ae8"
borderColor = "#2b3542"
chartCategoricalColors = ["#4d61e0", "#1099bc", "#2fae2f", "#ae6ae6", "#e8475c", "#a4b0f2", "#a9b1bd", "#3448d0", "#8c9ae8", "#f59aa6"]

[theme.dark.sidebar]
backgroundColor = "#0c1238"
secondaryBackgroundColor = "#080d2b"
```

- `base`, `fontFaces` e `showSidebarBorder` não podem variar entre claro e escuro; o resto pode.
- O viewer troca o tema em ⋮ › Settings (Light / Dark / Use system setting). O Python lê a escolha em
  `st.context.theme.type` e o script reexecuta quando ela muda: é assim que o CSS próprio e as figuras Plotly
  acompanham (`core/tokens.py: tokens()`).
- Seletor Claro / Escuro / Automático no header (como na landing): `app.py` grava a chave interna do frontend
  (`localStorage["stActiveTheme-<pathname>-v2"]` com `"Light"`, `"Dark"` ou `"System"`) e recarrega. Funciona em 1.66,
  mas é detalhe de implementação do Streamlit: registrar como risco e testar a cada atualização de versão. Se quebrar,
  o menu ⋮ continua funcionando.

## 3.4 CSS do chrome (`static/app.css` + `core/ui.py: inject_css`)

Só dois tipos de seletor entram no CSS:

1. `st-key-<chave>`: classe que o Streamlit põe no elemento de qualquer `st.container(key=…)` ou widget com `key`.
   Exemplos do protótipo: `.st-key-card-normativos-recebidos`, `[class*="st-key-seg-"]`, `.st-key-chat-fab`,
   `.st-key-app-header`, `.st-key-nav-triagent-tabela-analitica-active`.
2. `data-testid` dos elementos internos: `stSidebar`, `stSidebarHeader`, `stHeader`, `stMainBlockContainer`,
   `stButtonGroup` (pills e segmented), `stPageLink`, `stExpander`, `stPopoverButton`, `stPopoverBody`,
   `stBaseButton-tertiary|secondary|primary`, `stDataFrame`, `stPlotlyChart`, `stChatInput`, `stFileUploader`.

Nunca `st-emotion-cache-*`. As variáveis `--brand-*` são escritas em `:root` pelo Python a cada execução com os valores
do tema ativo, e regras que só valem no escuro (camada preta sobre os cards de segmento, chips transparentes) são
anexadas quando `st.context.theme.type == "dark"`. Blocos do `app.css`: chrome (header, faixa, sidebar, marca, menu),
cards, chips e segmentado, cards de segmento, visão geral do Início, faixa de filtro, legenda do Tráfego, cards de
classificação, e-mails, tabela, cascata, rodapé, chat.

## 3.5 Navegação, sidebar e seções (`app.py`)

```python
pages = {
    "inicio": st.Page("views/inicio.py", title="Início", default=True),
    "triagent": st.Page("views/triagent.py", title="Triagent", url_path="triagent"),
    "scalation": st.Page("views/scalation.py", title="Scalation", url_path="scalation"),
    "analitico": st.Page("views/analitico.py", title="Analítico", url_path="analitico"),
}
pg = st.navigation(list(pages.values()), position="hidden")   # a sidebar é nossa
with st.sidebar:
    st.html('<a class="brand-lockup" href="./">…símbolo da marca… Agenda <strong>Normativa</strong></a>')
    st.page_link(pages["inicio"], label="Início", icon=":material/home:")
    st.html('<p class="brand-nav-title">Painéis</p>')
    with st.expander("Triagent", icon=":material/speed:", expanded=(atual == "triagent")):
        for rotulo, secao in SUBITENS["triagent"]:
            with st.container(key=f"nav-triagent-{secao}{'-active' if ativo else ''}"):
                st.page_link(pages["triagent"], label=rotulo, query_params={"secao": secao})
pg.run()
```

- Subitem = `st.page_link` com `query_params={"secao": id}`; a página lê `st.query_params.get("secao")` e, no fim,
  chama `scroll_to_section(id)` (`core/ui.py`), que injeta um script (`st.html(..., unsafe_allow_javascript=True)`)
  alinhando `#<id>` 88 px abaixo do topo e realinhando por 2,5 s (porte do `SectionScrollService`).
- `/dashboard` → arquivo `views/dashboard.py` com uma linha `st.switch_page("views/triagent.py")`.
- Breadcrumb e data: faixa `st.container(key="app-header", horizontal=True)` com HTML; data por `header_date(date.today())`.
- Ícones do menu: Material (`:material/…:`). Para os glifos CoreUI, trocar a sidebar por um componente v2 (3.8) com os
  SVGs de `static/icons/`.

## 3.6 Cards, filtro de período, chips (`core/ui.py`)

- Card: `with card("normativos-recebidos"):` → `st.container(border=True, key="card-…")`; título e subtítulo por
  `card_title(título, subtítulo, anchor=id)` (o `anchor` escreve o `id` da seção).
- Cabeçalho com controles à direita: `st.container(horizontal=True, vertical_alignment="top", key="…-head")` com o
  título, `st.pills` Gráfico/Tabela e o `st.download_button`.
- Filtro de período: `period_filter("traffic", periods=("Day","Month","Year"), label=…)` devolve
  `PeriodSelection(period, range, bounds)`. Estado em `st.session_state["pf-traffic"]`; callbacks `on_change` fazem a
  regra "personalizado que ainda cabe é mantido, senão preset com aviso"; formulário De/Até com `st.date_input` e as
  mensagens de `validate_custom_range` (idênticas à landing). Granularidade = `st.segmented_control` dentro de um
  container `…-gwrap` (para o CSS da trilha cinza); presets = `st.pills(required=True)`.
- Cards de segmento: `segment_cards("triagent", segmentos, active=filtro)` devolve o `id` clicado;
  `segment_overview(segmentos)` para o Início. O minigráfico é `charts.sparkline` (Plotly, 70 px, `theme=None`).
- Faixa de filtro: `filter_notice("segment", html)` devolve `True` quando "Remover filtro" é clicado.

## 3.7 Gráficos (`core/charts.py`)

| Figura | Função | Pontos de atenção |
|---|---|---|
| Normativos Recebidos | `traffic_chart(t, data, highlighted, focus, surface)` | `line.shape="spline"`, `dash="dash"` na referência, `mode="lines+markers+text"`, `textposition="top center"`, `fill="tozeroy"` com alfa 10 % na série ativa, `with_alpha(cor, .2)` nas apagadas; `yaxis.range=[0,250]`, `showticklabels=False`, `gridcolor` do token; `margin.b=28` para os rótulos |
| Minigráficos | `sparkline(t, trend, labels, label, height, area)` | linha branca a 60 %, pontos brancos 8 px, eixos ocultos, `fixedrange=True` |
| Rosca | `doughnut(t, aplicaveis, nao_aplicaveis, picked, surface)` | `hole=.62`, `sort=False`, `pull` na fatia escolhida, anotação central `<b>573</b><br>classificadas` |
| E-mails | `emails_chart(t, buckets, positions, highlighted, surface)` | `barmode="stack"`, anotação com o total por pilha, `hovermode="x unified"` |
| Cascata | `waterfall_chart(t, model, unit, unit_scale, surface)` | `go.Bar(base=low, y=high-low)` por parte, `barmode="overlay"`, `add_shape` para os conectores, texto dentro com `uniformtext.mode="hide"` |

Sempre `st.plotly_chart(fig, height=…, config={"displayModeBar": False, "responsive": True}, theme=None, key=…)`.
`theme=None` é obrigatório: o tema "streamlit" do Plotly repinta fundos e fontes.

## 3.8 Listas clicáveis com Components v2 (`core/ui.py: clicklist`)

A landing tem quatro "listas que filtram ao clicar" (legenda do Tráfego, legenda da rosca, barras de temas, legenda dos
e-mails). Em Streamlit elas são um componente de 12 linhas:

```python
_CLICKLIST_JS = """
export default function(component) {
  const { parentElement, data, setTriggerValue } = component;
  let host = parentElement.querySelector('.brand-clicklist');
  if (!host) { host = document.createElement('div'); host.className = 'brand-clicklist'; parentElement.appendChild(host); }
  host.innerHTML = data;                                   // HTML confiável, gerado pelo Python
  host.querySelectorAll('[data-value]').forEach((el) =>
    el.addEventListener('click', () => setTriggerValue('picked', el.getAttribute('data-value'))));
  return () => host.remove();
}"""
_clicklist = st.components.v2.component("brand_clicklist", js=_CLICKLIST_JS, isolate_styles=False)

def clicklist(key, markup):
    result = _clicklist(key=key, data=markup, on_picked_change=lambda: None)
    return getattr(result, "picked", None)     # valor clicado nesta execução, ou None
```

Uso (tema clicado filtra a rosca):

```python
picked = clicklist("themes", f'<ol class="brand-theme-bars">{linhas_html}</ol>')
if picked is not None:
    S["tri-theme"] = None if S["tri-theme"] == picked else picked
    st.rerun()
```

Regras: o HTML passado é **confiável** (gerado pelo Python, com `html.escape` em todo texto de dado); `isolate_styles=False`
para o CSS global valer; a função JS roda de novo quando `data` muda, por isso o `host` é reaproveitado. O mesmo
padrão serve para um menu lateral com os SVGs do CoreUI ou para um painel de chat 100 % HTML.

## 3.9 Tabela Analítica (`views/triagent.py`, bloco 6)

- Linhas filtradas por `filter_classified(normas, bounds, segment, theme, applicable)` e ordenadas em Python (data ISO,
  número `"4.855"` → 4855, texto sem acento em minúsculas; desempate pela data mais nova e pelo código), porque a
  ordenação nativa do `st.dataframe` só vê a página carregada.
- Controles: `st.selectbox` (coluna) + `st.segmented_control` (↑ Crescente / ↓ Decrescente), `st.pagination(num_pages)`
  e o rótulo "1–15 de 573".
- Grid: `st.dataframe(frame, hide_index=True, column_config={"Tema": TextColumn(width="large"), "Agente da Agenda":
  ButtonColumn("", type="tertiary", on_click=ask_agent, key="analytic-ask")})`. No callback,
  `st.session_state["analytic-ask"].row` é a linha clicada: montar "Quais são os pontos principais da Resolução CMN nº
  4.855?" e chamar `chat.ask()`.
- Excel: `build_xlsx(XlsxTable(...))` → `st.download_button("Exportar Excel", data=bytes, file_name=…, mime=XLSX_MIME,
  on_click="ignore")`. Nome do arquivo e subtítulo iguais aos da landing (`analytic_xlsx()`).

## 3.10 Excel (`core/xlsx.py`)

`build_xlsx(XlsxTable)` reproduz `xlsx-export.ts`: título (negrito 14), subtítulo (itálico, `FF4B5968`), linha em branco,
cabeçalho (negrito branco sobre `FF223AD2`, alinhamento vertical ao centro), linhas, totais (negrito, borda superior fina),
larguras (`width` ou `len(header)+4`, mínimo 12), `number_format` por coluna (`#,##0`), `freeze_panes` abaixo do
cabeçalho e `auto_filter` na linha do cabeçalho. Atenção: definir `freeze_panes` **depois** de todas as linhas, com uma
string (`"A5"`), senão o openpyxl desloca o `append` seguinte uma linha para baixo.

## 3.11 Agente da Agenda (`core/chat.py`)

- **Estado** (`ChatState` em `st.session_state["chat"]`): `session_id`, `node`, `messages`, `has_interaction`,
  `closed`, `used_bytes`, `open`, `ask_queue`. Uma conversa por sessão do navegador; some ao fechar a aba (como hoje).
- **Mock** (`ChatMockServer`, um por processo via `st.cache_resource`): porte do `chat-mock-server.ts` com o mesmo
  `chat-fluxo-mock.json` (nós, transições, `back`, `askNode`, listas, cenários por palavra-chave, limites de rodadas e de
  fora de escopo, cenários de arquivo com `summary`). Erros viram `ChatRequestError(code)` e os 7 textos de
  `CHAT_ERROR_TEXTS`.
- **Widget**: `render_widget()` no fim do `app.py` → `st.container(key="chat-fab")` (fixo por CSS) › `st.popover(label,
  icon=":material/chat_bubble:")` › cabeçalho (título + Recomeçar) › `st.container(height=360, key="chat-log")` com os
  balões em `st.html` (`message_html`, porte do template) e `st.feedback("thumbs")` sob cada resposta avaliável ›
  sugestões (`st.button` por chip) › `st.chat_input(placeholder, max_chars=1000)` ou `st.file_uploader(...)` conforme o
  nó.
- **BFF real**: trocar as chamadas de `mock_server()` por `requests.post(f"{API}/conforme/chat/sessao")`,
  `/mensagem` (JSON com `sessionId`, `nodeId`, `action`, `optionId|text`, `requestId`), `/arquivo` (`files=[("files",
  (nome, bytes, tipo))]`), `/feedback`, `/cancelar` e `DELETE /sessao/{id}`; manter `requestId` por pedido (`uuid4`).
  O servidor Streamlit faz as chamadas (o navegador nunca vê o BFF). Alternativa: orquestrar o Gemini no próprio
  Streamlit com `google-genai`, o que muda a arquitetura (ADR-011 coloca a orquestração no BFF).
- O que fica diferente: "Parar" (sem cancelamento de pedido em curso), efeito de digitação (só com `st.write_stream`
  em texto simples), colar print com Ctrl+V (verificar `st.chat_input(accept_file="multiple")`), expandir o painel e
  tela cheia no celular (CSS adicional), textos internos do `file_uploader` em inglês (ocultar por CSS).

## 3.12 Dados reais

- No GKE/Titan os dados chegam **exclusivamente** pelo BFF Atlante (chassi: BFF → Orquestrador → Átomos); o Streamlit
  não abre conexão com banco nem com o Unity Catalog. Usar o cliente HTTP do sample (ele já carrega o cookie/JWT da
  sessão para o BFF).
- Hoje: `core/data.py` lê os JSON (`@st.cache_data`). Com o BFF: trocar cada `load_json` por `requests.get(f"{API}
  {caminho}", params=…, timeout=10).json()` nas mesmas funções, mantendo as validações (`validateSegmentCards`,
  `validateClassification`, `validateEmails` portadas) e as derivações; `@st.cache_data(ttl=300)` por endpoint e por
  parâmetros e por usuário quando a resposta depender dele; `API` vem de `settings.yaml`/variável de ambiente, nunca de
  código (R6).
- Endpoints (`docs/contratos-de-dados.md`): `GET /conforme/triagent/segmentos`, `/trafego?period&start&end`,
  `/classificacoes?start&end&segmento`, `/emails-sugestao?start&end`, `/cascata?period&start&end`.
- Normativos Recebidos: substituir o mock aleatório (`traffic()`) pelo `TrafficResponse` (`points`, `segments[].classified`,
  `toClassify`), sem mudar `traffic_series`.
- Cascata: remover `derive_waterfall` quando o BFF devolver a cascata do período.

## 3.13 Autenticação e usuário

Confirmado pela arquitetura em 2026-11-04 (`04-cenarios-e-riscos.md` §4.8, pergunta 5):

| Caminho | Como a identidade chega | No código |
|---|---|---|
| GKE/Titan (este produto) | **sem `st.login`**: cabeçalhos HTTP injetados pelo Ingress Gateway corporativo (`x-user-id`, `x-user-email` ou JWT) e cookie de sessão autenticado pelo BFF Spring Boot; `auth.mode` em `settings.yaml` do sample | `st.context.headers.get("x-user-email")` / `x-user-id` alimentam a saudação do chat e a auditoria; o cliente HTTP do sample repassa o cookie/JWT ao BFF; nada em `localStorage` (R5) |
| Databricks Apps (variante sem agente) | SSO (OAuth/OIDC) do workspace; usuário em `X-Forwarded-Email` / `X-Forwarded-User` | `st.context.headers.get("X-Forwarded-Email")` |
| `st.login()` / `st.user` | não se aplica no ambiente corporativo (o padrão N3 não usa) | — |

Nenhum token no navegador além do cookie de sessão. O `secrets.toml` não é versionado. Configuração por ambiente
(resposta da arquitetura, 2026-11-04): nunca em código; no GKE/Titan ConfigMaps e Secrets do Kubernetes (Secret
Manager corporativo) injetam as variáveis, lidas por `settings.yaml`:

| Variável | DES | UAT | PRD |
|---|---|---|---|
| `ENVIRONMENT` / `ENV` | `des` | `uat` | `prd` |
| `AUTH_MODE` (`settings.yaml`) | `none` ou `mock` (dev local/inicial) | `gateway` / `oidc` | `gateway` / `oidc` (estrito) |
| `BFF_BASE_URL` | host do BFF de GenAI de DES | host de UAT | host de PRD (valores na resposta da arquitetura; nunca no repositório) |
| Esteira | deploy contínuo na branch `develop` | branch `release/*` via Jenkins/GHA | tag com GMUD aprovada no Portal Tech |

`BFF_BASE_URL` faz o papel do `apiBase` + `proxy.conf.json` da landing; `AUTH_MODE=mock` permite rodar o
protótipo sem gateway, como o `chatMock: true` hoje.

## 3.14 Hospedagem

O Streamlit precisa de um processo permanente com WebSocket (`/_stcore/*`). No ambiente corporativo há dois caminhos homologados
(arquitetura, 2026-11-04) e um padrão de proxy. **Para este produto vale o (b)**: o parecer HML-1143 veda IA
generativa, LLM, RAG e agentes no Databricks Apps, e a Agenda Normativa tem o Agente da Agenda.

**a) Databricks Apps** (só DataViz puro / consumo do Lakehouse; homologação HML-1143; esteira PEPD-1491 via
**Databricks Asset Bundles** e componente `dbxapp-*`): `databricks.yml` com o recurso `apps` e targets por ambiente,
`app.yaml` com `command: ["streamlit", "run", "app.py"]` e `requirements.txt` (a arquitetura cita `streamlit>=1.38.0` /
`1.40.x` como referência; conferir a aba Environment e fixar a versão). O Databricks hospeda o processo, faz o túnel
WebSocket e aplica o SSO/OIDC do workspace; dados pelo Unity Catalog com grants por catálogo/schema. Caberia apenas a
uma variante da Agenda Normativa **sem** o agente.

**b) GKE corporativo (genaigke / Plataforma Titan)**, padrão N3 "Streamlit e Titan Frontend Sample": o container
Streamlit roda no Kubernetes e conversa com o ecossistema do banco **só** pelo BFF Spring Boot (chassi Atlante: BFF →
Orquestrador → Átomos), o mesmo desenho da landing (`/conforme/...`). Gerar o projeto pelo Cookiecutter do sample
(`streamlit-sgen-base-ia-sample`, projeto SGEN-BASE do Bitbucket corporativo; documentação no portal do Titan Sample e
no Confluence "N3 - Streamlit"): ele já traz `Dockerfile` não-root, `config.toml` com porta 8501, CORS interno e rotas
`/_stcore/*`, `settings.yaml` com `auth.mode`, `k8s/`/Helm com o ingress corporativo anotado para timeout e upgrade de
WebSocket (sem isso a conexão cai com 403/502), cliente HTTP do BFF e `requirements.txt` no Nexus. Esteira: Portal
Tech / Bitbucket / Jenkins / GKE. No `config.toml` do sample acrescentar só as tabelas de tema (3.3) e
`server.enableStaticServing = true`; manter `server.baseUrlPath`, CORS e XSRF como o sample define. Mais de uma réplica
exige afinidade de sessão no ingress.

**c) Apache como proxy** (quando o processo for exposto por Apache HTTP Server): `mod_proxy_wstunnel` é mandatório.

```
# httpd.conf (módulos: proxy, proxy_http, proxy_wstunnel, rewrite)
ProxyPreserveHost On
ProxyPass        /agenda http://127.0.0.1:8501/agenda
ProxyPassReverse /agenda http://127.0.0.1:8501/agenda
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^/agenda/(.*) ws://127.0.0.1:8501/agenda/$1 [P,L]
```

Dockerfile: o do sample (imagem base `pacotedocker-sgen-base-*` com Python 3.11, usuário não-root); fora do ambiente corporativo,
`python:3.11-slim`, `pip install -r requirements.txt`, `CMD streamlit run app.py --server.port 8501`.

O que **não** serve: Apache servindo só arquivos estáticos (modelo atual da landing), funções serverless sem
WebSocket, hospedagem que mata processos ociosos em segundos.

## 3.15 Testes e verificação

- `pytest` sobre `core/` (período, derivações, Excel, mock do chat): portar os casos dos `*.spec.ts` que não dependem
  de DOM (ex.: `period-range.spec.ts`, `classification-derive.spec.ts`, `waterfall-derive.spec.ts`, `chat-mock-server.spec.ts`).
- `streamlit.testing.v1.AppTest.from_file("views/triagent.py")` para o que é tela: `at.run()`, `at.session_state`,
  `at.button[...]`, `at.markdown`, sem navegador (confirmar o suporte a `st.components.v2` e a `st.navigation` na
  versão usada; o protótipo não cobriu).
- Visual: `poc/checks/shoot.py` (Chrome headless por CDP) tira as capturas em 1440/375 px e nos dois temas;
  `poc/checks/interact.py` exercita filtro, legenda, seção, chat, tema e celular.
- Checklist de pronto (equivalente à §7 das fichas):
  1. Quatro cards na ordem Atacado, Corporativo, Plataforma, Varejo; números iguais aos do mock/BFF; 1 coluna em
     375 px.
  2. Normativos Recebidos: Dia/Mês/Ano, presets, personalizado com as três validações; legenda destaca; Tabela =
     Gráfico; Excel com as mesmas linhas e totais.
  3. Pizza e temas: totais batem com `count(*)` da fonte; filtro cruzado nos dois sentidos; faixa de filtro.
  4. Fluxo de e-mail: indicadores, barras, legenda, 5 últimos com as normas; Excel.
  5. Tabela Analítica: "1–15 de N" com o N da pizza; ordenação; botão do agente abre o chat com a norma; Excel.
  6. Cascata: `R$` ↔ `%`, Gráfico ↔ Tabela, resultado e participação conferem.
  7. Chat: saudação, cinco opções, resposta com fontes, esclarecimento, fora de escopo, upload, feedback, Encerrar,
     Recomeçar.
  8. Temas claro e escuro, 375 e 1440 px; console do navegador limpo; nenhum host interno no código.

## 3.16 Ordem de construção sugerida

1. Tema e chrome (3.3–3.5) com as quatro páginas vazias: 1 dia.
2. `core/period.py`, `core/data.py`, testes dos cálculos: 2 dias.
3. Início e cards de segmento + filtro de período: 2 dias.
4. Normativos Recebidos (gráfico, tabela, legenda v2, Excel): 2 dias.
5. Classificação (rosca, temas, filtros cruzados) e Tabela Analítica: 3 dias.
6. E-mails e Cascata: 3 dias.
7. Chat (mock, widget, BFF): 4 dias.
8. Dados reais, autenticação, hospedagem, testes de tela, ajustes de fidelidade nos dois temas e em 375 px: 5 dias.

Total indicativo: 20–25 dias úteis de uma pessoa com Python e Streamlit (sem o backend), mais 5–8 dias das
adaptações de 3.17 para a versão homologada. O protótipo em `poc/` já cobre os passos 1 a 7 em forma de esqueleto; o
que falta nele está listado em `poc/README.md`.

## 3.17 Adaptações para o Streamlit homologado (1.38–1.40)

O protótipo usa a API de 1.66. Na faixa homologada (conferida em 1.40.2 / Python 3.11; tabela completa em
`04-cenarios-e-riscos.md` §4.10) aplicar, nesta ordem:

1. **`config.toml`**: só `[theme]` com `base = "light"`, `primaryColor`, `backgroundColor`, `secondaryBackgroundColor`,
   `textColor`, `font = "sans serif"`; as demais tabelas (`[theme.light]`, `[theme.dark]`, `[theme.sidebar]`,
   `fontFaces`, `baseRadius`, `headingFont`, `chartCategoricalColors`) não existem e devem sair. Manter `[server]` e
   `[client]` do sample mais `enableStaticServing = true`.
2. **Inter e raios por CSS**: em `core/ui.py: inject_css` acrescentar `@font-face` (um por peso) com
   `src: url("./app/static/fonts/inter-latin-400-normal.woff2")` e `html, body, [class*="st-"], button, input { font-family: Inter, … }`;
   raios de botões e inputs por CSS.
3. **Tema escuro**: CSS do escuro ativado por uma classe no `<html>` (`dark-theme`, como a landing) escrita por um
   script em `st.components.v1.html` que lê `prefers-color-scheme` e a escolha do menu ⋮ (`localStorage`
   `stActiveTheme-…`) no `window.parent`; o Python não sabe o tema (sem `st.context.theme`), então as figuras Plotly
   recebem as cores por um componente v1 mínimo que devolve `theme.base` (ou ficam com a paleta clara). Declarar o
   escuro como parcial na entrega.
4. **JavaScript** (rolagem por seção, seletor de tema): trocar `st.html(..., unsafe_allow_javascript=True)` por
   `st.components.v1.html(script, height=0)`; dentro do script usar `window.parent.document`.
5. **Subitens do menu**: `st.button` por subitem (CSS de link) → `st.session_state["secao"] = id` + `st.switch_page(page)`;
   as páginas leem `st.session_state.pop("secao", None)` em vez de `st.query_params`.
6. **Listas clicáveis**: começar com `st.pills` (legenda do Tráfego, legenda da rosca, temas, legenda dos e-mails); se a
   fidelidade for exigida, componente v1 com `st.components.v1.declare_component("brand_clicklist", path="components/clicklist")`
   e um `index.html` sem build (protocolo: enviar `streamlit:componentReady`, receber `streamlit:render` com `args.data` e
   `args.theme`, responder `streamlit:setFrameHeight` e `streamlit:setComponentValue`), com o CSS da lista dentro do iframe.
7. **Tabela Analítica**: `st.dataframe(on_select="rerun", selection_mode="single-row")` + botão "Perguntar ao Agente da
   Agenda sobre …"; paginação com botões Anterior / Próxima e "Página X de Y"; sem `TextColumn(pinned=True)`.
8. **Layout**: `st.container(horizontal=True)` → `st.columns([...])`; `st.popover(width=)` → CSS; `width="stretch"` →
   `use_container_width=True`; `on_click="ignore"` fora.
9. **Plotly**: `fig.update_layout(height=…)`; `st.plotly_chart(fig, use_container_width=True, theme=None, key=…,
   config={"displayModeBar": False})`: em 1.40 o `config` entra pelos `**kwargs` (conferido no código da versão).
10. **Chips**: `st.segmented_control`/`st.pills` sem `required=`: no `on_change`, se o valor vier `None`, repor o anterior.
11. Rodar `poc/checks/` de novo: as capturas em 1440/375 px e nos dois temas são o critério de aceite.
