# Arquitetura

Como o app está organizado, como uma interação vira tela e onde cada responsabilidade mora. Regras: R3 (idioma do
Streamlit), R4 (BFF), R5 (identidade), R10 (tokens). Estado (2026-11-04): fases F0–F9 executadas; o código de `src/`
roda em Streamlit 1.40.2 e é o descrito aqui. F10 (integração no ambiente corporativo) pendente.

## 1. Visão geral

Um processo Streamlit (porta 8501) serve o app inteiro. Cada aba do navegador abre uma sessão WebSocket
(`/_stcore/*`); cada interação roda de novo o script de entrada `src/app.py` do topo ao fim (rerun), com o
`st.session_state` da sessão preservado. Não há frontend separado: o HTML sai do Streamlit, o visual da marca vem de
`src/static/*.css` e dos tokens de `src/core/tokens.py`; o único JavaScript é o dos componentes v1 versionados em
`src/components/` e dos trechos passados a `compat.run_js` (R3).

```
navegador ──WebSocket /_stcore──▶ Streamlit (src/app.py)
                                   ├─ src/views/<slug>.py        (página atual)
                                   ├─ src/core/*                  (dados, período, gráficos, UI, chat, Excel, compat)
                                   ├─ src/components/theme_probe  (iframe v1: tema aplicado, largura da janela)
                                   └─ src/core/api.py ──HTTP──▶ BFF <bff.base_url>/v1/...   (ou data/*.json em mock)
```

## 2. Estrutura do repositório

| Caminho | O que é |
|---|---|
| `src/app.py` | entrada: `st.set_page_config`, `PAGES`/`NAV`, `st.navigation` (oculta), CSS, sidebar própria, faixa do header com seletor de tema, página, rolagem até a seção, rodapé, chat, rerun adiado |
| `src/views/inicio.py` | Início: visão geral dos segmentos (ficha `paginas/inicio.md`) |
| `src/views/triagent.py` | Triagent: cards com filtro, Normativos Recebidos, classificação, Fluxo de e-mail, Tabela Analítica (`paginas/triagent.md`) |
| `src/views/scalation.py` | Scalation: cards petróleo, Cascata do resultado, Tráfego e vendas (`paginas/scalation.md`) |
| `src/views/analitico.py` | Analítico: título oculto (`paginas/analitico.md`) |
| `src/views/dashboard.py` | `/dashboard` → `st.switch_page("views/triagent.py")` (ADR-007); sem ficha |
| `src/core/settings.py` | lê `settings.yaml` com `${VAR:padrão}` (`lru_cache`); booleanos por `parse_bool`; `environment` só `des`/`uat`/`prd`; em `uat`/`prd` recusa configuração insegura (`SettingsError`, §8); `bff_base_url()`, `use_mock_data()`, `chat_mock()`, `DATA_DIR` |
| `src/core/auth.py` | identidade (R5): `current_user()` por `auth.mode` e cabeçalhos de `st.context.headers`; `forward_headers()` (cookie, `authorization`, `x-user-*`) para o BFF |
| `src/core/api.py` | única porta para o BFF (R4): `url` (`bff.base_url` + `/v1` + recurso), `get_json`, `post_json`, `post_multipart`, `delete`; erros RFC 7807 → `ApiError(code, status, problem_code, trace_id, retry_after)` (`code_for`; 403 `AUT-003` → `SESSION_RENEW`); `X-XSRF-TOKEN` do cookie `XSRF-TOKEN` em POST/PUT/PATCH/DELETE (`xsrf_token`); textos pt-BR de erro HTTP, `error_text`, `support_code`, `login_url`, `EXPORT_LIMIT_TEXT`; cabeçalho `x-request-id` por chamada (ADR-009) |
| `src/core/data.py` | carga dos mocks/BFF (`load_json`, `_bff` com `st.cache_data` por usuário: `identity_key`; `_bff_uncached` para o Excel), adaptadores do contrato v1 (`*_from_v1`), resumos (`classification_summary`, `emails_summary`), Tabela Analítica paginada no servidor (`classified_page`, `classified_export` até 5.000 linhas, `server_paging`), validações portadas, derivações do mock (tráfego, classificação, e-mails, cascata), colação pt-BR (`pt_br_key`), moeda compacta |
| `src/core/period.py` | filtro de período: presets, validação do personalizado, rótulos e subtítulos pt-BR, `format_number`/`fmt_int`/`fmt_percent`/`fmt_decimal`/`fmt_date` |
| `src/core/charts.py` | figuras Plotly (`sparkline`, `traffic_chart`, `doughnut`, `emails_chart`, `waterfall_chart`) com cores de `tokens()`; modo `narrow` para telas estreitas |
| `src/core/ui.py` | blocos visuais (card, título com âncora, chips e segmentado obrigatórios, filtro de período, cards de segmento, visão geral, linha de e-mail, faixa de filtro, data do header, bloco com erro `data_error`/`data_error_html`: texto pt-BR, link "Entrar novamente" no 401, código de suporte), ícones como data URI, `inject_css`, `scroll_to_section` |
| `src/core/compat.py` | pontos de troca de versão (§5): tema, JS, listas clicáveis, ação por linha, paginação, grupo horizontal, subitens de seção, escolha obrigatória, rerun adiado, modal "Page not found" |
| `src/core/footer.py` | rodapé: `entities()` lê `footer.entities` do `settings.yaml` (lista YAML ou JSON em `FOOTER_ENTITIES`; inválido = `[]`), `footer_html` (bloco legal só com entidades, texto escapado) |
| `src/core/xlsx.py` | Excel com `openpyxl` no layout da landing (R9); células de texto que começam com `=`, `+`, `-`, `@` recebem `'` |
| `src/core/chat.py` | Agente da Agenda: textos, `safe_markdown`, helpers, `ChatMockServer` (com quarentena simulada), quarentena (`await_quarantine`), adaptadores v1 (`node_from_v1`, `message_from_v1`, `file_status_from_v1`), backends (`MockBackend`, `BffBackend` em `/v1/agente/...`), controlador (`ChatState`; 401 sem nova tentativa), painel (`render_widget`) |
| `src/core/tokens.py` | tokens da marca `LIGHT`/`DARK`, `SEGMENTS`, `tokens()`, `css_variables`, `segment_color`, `with_alpha` |
| `src/components/theme_probe/` | componente v1 sem build (`index.html` + `theme.js`): recebe o tema aplicado pelo Streamlit, reconcilia com o modo de tema (`localStorage`), devolve `{base, mode, narrow}` |
| `src/static/` | `app.css` (chrome, cards, chips, filtro, legendas, rodapé), `chat.css`, `triagent.css`, `scalation.css`; fontes Inter (`fonts/`), ícones CoreUI em SVG (`icons/`), marca e favicon (`img/`); servidos em `/app/static` |
| `data/` | mocks JSON (mesmos da landing) e `chat-fluxo-mock.json` |
| `tests/` | pytest + `streamlit.testing` (`.rules/testes.md`); a contagem atual é a linha `[pytest]` do `bash scripts/verify.sh` |
| `checks/` | capturas e interações por Chrome headless (`shoot.py`, `interact.py`, `probe.py`, `f1_chrome.py`); manual; endereço do app no 1º argumento ou em `CHECK_BASE_URL` (sem host padrão) |
| `scripts/` | `verify.sh`, `docs_check.py` |
| `.streamlit/config.toml`, `settings.yaml` | configuração do servidor e da aplicação (`dependencias-e-ambiente.md`) |
| `Dockerfile`, `k8s/` | placeholders do sample do Titan (`portabilidade.md`) |

## 3. Fluxo de um rerun (`src/app.py`)

1. `st.set_page_config` (título "Agenda Normativa", favicon, `layout="wide"`). `settings()` conferido logo depois:
   `SettingsError` mostra só "Não foi possível iniciar a Agenda Normativa. Contate o suporte." (`st.error`), registra o
   motivo no log do servidor e para (`st.stop()`); os demais módulos de `core` são importados depois dessa conferência
   (`core.data` lê `settings()` ao ser importado). `PAGES` = cinco `st.Page` (`inicio`
   padrão, `triagent`, `scalation`, `analitico`, `dashboard`); `NAV` = itens da sidebar com os subitens por seção.
2. `compat.legacy_pages_session()` **antes** de `st.navigation`: guarda o endereço de uma sessão criada antes do
   primeiro `st.navigation` do processo (§7). `st.navigation(..., position="hidden")`;
   `compat.dismiss_page_not_found(pg.url_path)` fecha o modal falso quando o endereço é uma página real.
3. `ui.inject_css(PAGE_SLUGS)`: monta a sonda de tema (`compat.mount_theme_probe`), lê `tokens()` e injeta num só
   `st.html` (container `brand-css`): `@font-face` da Inter, `:root{--brand-*}`, `app.css` + os demais `src/static/*.css` em
   ordem de nome (comentários removidos e `<` escapado, porque o DOMPurify do `st.html` descarta um `<style>` com
   `<letra`), e as regras só do escuro (`_dark_only`).
4. Seção ativa: `compat.active_section()`; se for de outra página, é limpa.
5. Sidebar própria (`with st.sidebar`): marca (`.brand-lockup`), "Painéis", `st.page_link` para Início e Analítico
   (containers `nav-<slug>[-active]`), `st.expander` para Triagent e Scalation (`nav-group-<slug>[-open]`, aberto na
   página atual) com um `compat.section_link` por seção (`navsub-nav-<slug>-<id>[-active]`).
6. Faixa do header (container `app-header`, fixa em duas linhas): `compat.hstack([9, 1])` com a data pt-BR
   (`ui.header_date`, versão curta em 767 px) e o seletor de tema (`st.popover` em `theme-menu` com botões
   `theme-light`/`theme-dark`/`theme-auto`); divisor; breadcrumb. O botão de recolher a sidebar é o do Streamlit.
   Escolha de tema → `compat.set_theme_mode` (JS que grava o modo e recarrega a página).
7. `pg.run()` executa `src/views/<slug>.py`: cada bloco lê dados de `core/data.py`, desenha com `core/charts.py` e
   `core/ui.py` dentro de `st.container(key=...)` e grava escolhas no `session_state`; mudança de estado que afeta um
   bloco já desenhado chama `compat.request_rerun()`.
8. `ui.scroll_to_section(compat.consume_section())`: rola até a seção pedida por um subitem (JS por iframe, realinha
   por 2,5 s e para no primeiro gesto).
9. Rodapé navy (`app-footer`, `.brand-footer`) por `footer.footer_html`: logotipo, copyright e, se o ambiente
   configurar `footer.entities`, o bloco legal; `chat.render_widget()` (botão flutuante + painel).
10. `compat.flush_rerun()`: limpa a marca do modal e faz **um** `st.rerun()` se alguma etapa pediu.

Clique em widget com `on_click`/`on_change` → callback atualiza o `session_state` antes do rerun (sem `st.rerun`).
Dados: `load_json` (mock, cache único) e `_fetch` (BFF, TTL `cache.ttl_seconds`) usam `st.cache_data`; a chave de
`_fetch` inclui `data.identity_key()` (SHA-256 dos cabeçalhos de identidade repassados, nunca o valor cru): a resposta de
um usuário nunca é servida a outro. `mock_server` do chat usa `st.cache_resource`. Excel da Tabela Analítica: lido só no
clique em "Gerar Excel" e guardado no `session_state` da sessão para a assinatura dos filtros (`paginas/triagent.md`).

### 3.1 Padrão de rerun adiado

`st.rerun()` no meio da página interrompe o run: os widgets abaixo não são enviados ao navegador e o 1.40 descarta o
estado dos que faltaram (chips Gráfico/Tabela voltavam vazios), e o rodapé e o chat não eram desenhados. Por isso a
página só marca `compat.request_rerun()`; `app.py` chama `compat.flush_rerun()` depois de tudo
(`tests/test_compat_ui.py::test_request_rerun_reruns_once_after_the_whole_script_ran`). Escolhas obrigatórias
(`ui._init_choice`, `scalation._required_pills`) são regravadas a cada run para que um primeiro run interrompido pela
sonda de tema não deixe o chip sem seleção (E-002).

## 4. Estado (`st.session_state`)

Chave prefixada pelo bloco (R3). As internas de `compat`/`chat` começam com `_brand_` ou são objetos.

| Chave | Dono | Conteúdo |
|---|---|---|
| `_brand_theme` | `compat` | `{"base": light\|dark, "mode": light\|dark\|auto, "narrow": bool}` informado pela sonda |
| `_brand_section_pending`, `_brand_section_active` | `compat.section_link` | seção a rolar (lida uma vez por `consume_section`); `(url_path, id)` do último subitem (destaque) |
| `_brand_rerun_requested`, `_brand_page_not_found`, `_brand_js_<key>` | `compat` | rerun pedido; endereço da sessão legada / `"ok"`; contador por `run_js` (novo iframe a cada chamada) |
| `brand-theme-probe` | componente | valor do componente v1 |
| `theme-light`/`-dark`/`-auto` | header | botões do seletor |
| `nav-<slug>-<id>` | sidebar | botões dos subitens |
| `pf-<key>`, `pf-<key>-open/-notice/-error/-g/-r/-start/-end/-apply/-cancel` | `ui.period_filter` | `PeriodSelection` aplicada; painel Personalizado aberto; aviso de troca; erro de validação; granularidade; faixa (preset ou `custom`); datas e botões |
| `<key>`, `<key>-prev` | `ui.chip_filter`, `ui.segmented`, `scalation._required_pills` | escolha obrigatória e a anterior (`compat.required_choice`) |
| `<key>-pills`, `<key>-clicked`, `<key>-shown` | `compat.clicklist` | widget, valor clicado neste run, valor mostrado como ativo |
| `<key>-page`, `<key>-prev`, `<key>-next` | `compat.pager` | página 1-based e botões |
| `<key>-df`, `<key>-act` | `compat.row_action` | dataframe com seleção de linha e botão de ação |
| `triagent-segment`, `triagent-applicable`, `triagent-theme`, `triagent-highlight`, `triagent-emails-highlight` | Triagent | filtro da página; classe; tema; série destacada (0–4); segmento destacado nos e-mails |
| `triagent-traffic-view`, `triagent-emails-view`, `pf-triagent-traffic`, `pf-triagent-emails` | Triagent | Gráfico/Tabela; períodos |
| `triagent-table-sort`, `triagent-table-dir`, `triagent-table-page`, `triagent-table-signature`, `triagent-table-generation` | Tabela Analítica | coluna; sentido; página; assinatura (período, filtros, ordem); geração (chave nova do dataframe a cada mudança) |
| `segbtn-triagent-<id>-b`, `triagent-*-export`, `triagent-email-<id>` | Triagent | selos, botões de download, tabelas dos e-mails |
| `pf-waterfall`, `wf-unit`, `wf-view` (+ `-prev`) | Scalation | período da cascata; `currency`/`percent`; `chart`/`table` |
| `chat` | `chat.chat_state()` | `ChatState` (mensagens, nó atual, `session_id`, bytes usados, retry, pergunta enfileirada, `open_request`, `upload_round`, erros de arquivo, `table_view`, `auth_required` depois de um 401) |
| `chat-text`, `chat-files-<n>`, `chat-seg-<id>`, `chat-tbl-<id>`, `chat-xls-<id>`, `chat-up-<id>`, `chat-down-<id>`, `chat-sug-<i>`, `chat-retry`, `chat-restart` | chat | entrada, uploader (chave muda a cada envio), filtro de segmento da lista, lista/tabela, Excel, feedback, sugestões, tentar novamente, recomeçar |

Nada de estado em variável global de módulo (o processo é compartilhado entre sessões). O `sessionId` do chat e o
primeiro nome ficam só aqui (R5).

## 5. Pontos de troca de versão (`src/core/compat.py`, `src/core/ui.py`)

Regra D-003: página chama a função; a função esconde a diferença entre 1.40 e versões novas (plano §4). Contrato
estável; testes cobrem o contrato (`.rules/testes.md` §7).

| Função | Em 1.40 (implementado) | Em 1.51+ / 1.53+ |
|---|---|---|
| `mount_theme_probe(slugs)`, `theme_type()`, `theme_mode()` | componente v1 `src/components/theme_probe` recebe `theme.base` na mensagem de render, reconcilia com `brand-theme-mode` no `localStorage` e devolve `{base, mode, narrow}`; "light" até responder (um rerun) | `st.context.theme.type` |
| `viewport_narrow()` | `narrow` da sonda (`window.parent.innerWidth < 576`, reavaliado no resize) | `st.context` (viewport) |
| `set_theme_mode(mode, slugs)` | `run_js` com `theme.js`: grava `brand-theme-mode` e a chave do Streamlit `stActiveTheme-<pathname>-v1` (`{"name": "Dark"}` ou remove = claro do `config.toml`) para cada página, recarrega | `[theme.light]`/`[theme.dark]` + seletor oficial |
| `run_js(script, key, prelude)` | `components.html` com `height=0` em container `brandjs-<key>`; contador por chave força iframe novo | `st.html(..., unsafe_allow_javascript=True)` |
| `clicklist(key, items, markup, active)` | `st.pills` em container `clicklist-<key>` (ADR-004); `markup` ignorado; devolve o valor clicado uma vez | `st.components.v2.component` com o HTML |
| `row_action(key, frame, label_for_row, **kw)` | `st.dataframe(on_select="rerun", selection_mode="single-row")` + `st.button` em `rowaction-<key>`; dica "Selecione uma linha…" sem seleção | `column_config.ButtonColumn` |
| `pager(key, total_rows, page_size)` | Anterior / "Página X de Y" / Próxima em `pager-<key>` (ADR-005) | `st.pagination` |
| `hstack(spec, key, gap, vertical_alignment)` | `st.columns` dentro de container com chave | `st.container(horizontal=True)` |
| `section_link(page, label, id, active, key)`, `consume_section()`, `active_section()`, `clear_active_section()` | `st.button` em `navsub-<key>[-active]` + estado + `st.switch_page` | `st.page_link(query_params=…)` |
| `required_choice(state_key, previous_key)` | `on_change` que restaura a escolha desmarcada | `required=True` em pills/segmented |
| `request_rerun()`, `flush_rerun()` | rerun adiado (§3.1) | idem (ou fragmentos) |
| `legacy_pages_session()`, `dismiss_page_not_found(url_path)` | fecha o modal "Page not found" da primeira sessão (§7) | remover (corrigido upstream) |
| tema | `[theme]` claro + CSS da marca + `_dark_only` (ADR-003) | `[theme.light]`, `[theme.dark]`, `fontFaces` |

`ui.py` concentra o resto do que depende do 1.40: `svg_data_uri`/`icon` (o `st.html` descarta `<svg>` inline e
`/app/static/*.svg` sai como `text/plain`: ícones viram data URI + máscara CSS), `_stylesheets` (escape do `<`),
`period_filter`, `segment_cards`, `email_row` (rótulo do `st.expander` só aceita Markdown: a data vai em `*ênfase*`
e a contagem em `**negrito**`, a cor do segmento vem da chave do container).

## 6. Como as páginas usam `core/`

- Página não abre arquivo nem chama HTTP: `data.segments()`, `data.traffic(period, bounds)`,
  `data.classification_summary(bounds, segment, theme, themes_of)`, `data.emails_summary(period, bounds, segment)`,
  `data.waterfall(period, bounds)` e, na Tabela Analítica, `data.classification()` (mock) ou `data.classified_page` /
  `data.classified_export` (BFF, `data.server_paging()`); com `bff.base_url` preenchido essas funções chamam o
  contrato v1 por `api.get_json` e adaptam a resposta aos formatos de sempre (`contratos-de-dados.md`, ADR-009).
- Erro de bloco: `ui.data_error(frase do bloco, erro)` (texto pt-BR por `api.error_text`, link "Entrar novamente" no
  401, "Código de suporte: <traceId>" quando houver); nunca a mensagem do servidor.
- Período: `ui.period_filter(key, periods, label)` devolve `PeriodSelection`; a página lê `S["pf-<key>"]` no início
  do run (os callbacks já rodaram) e o subtítulo vem de `period.build_traffic_period`.
- Gráfico: `charts.<figura>(tokens(), ..., narrow=compat.viewport_narrow())` + `ui.chart(fig, key)`; cor só de
  `tokens()` (R10).
- HTML de bloco: `st.html` com texto vindo de dados sempre por `html.escape` (ou `chat.safe_markdown`/`escape_html`
  no chat).
- Excel: `xlsx.build_xlsx(XlsxTable(...))` + `st.download_button` com o nome de arquivo da landing.
- Agente: `chat.ask(chat.chat_state(), pergunta)` a partir da Tabela Analítica; o painel é do layout (`app.py`), não
  da página.
- CSS: cada página pode ter `src/static/<slug>.css`, carregado por `inject_css` com os demais; seletores só
  `st-key-*`, `data-testid` e classes `brand-*`/`chat-*`. A caixa de um card fica no `stVerticalBlockBorderWrapper`
  que contém o container com chave (`:has(> div > .st-key-card-…)`), porque o 1.40 grava inline em cada filho a
  largura medida no bloco com chave, padding incluído.

## 7. Modal "Page not found" da primeira sessão (1.40)

O 1.40 cria cada sessão com `PagesManager.DefaultStrategy` e só troca para a estratégia do `st.navigation` depois da
primeira chamada do processo. A primeira sessão aberta direto em `/triagent` resolve o endereço contra uma pasta
`pages/`, não acha e envia `page_not_found` antes de `app.py` rodar; o `st.navigation` depois executa a página certa,
mas o modal fica. `legacy_pages_session()` (antes do `st.navigation`) guarda `intended_page_name` quando
`mpa_version == 1`; `dismiss_page_not_found()` fecha o modal por JS quando o endereço é uma página real e mantém a
mensagem do Streamlit para endereço realmente inválido; `flush_rerun()` limpa a marca no fim do run, para um run
cortado (`st.switch_page` de `/dashboard`) tentar de novo (E-001).

## 8. Identidade, configuração e ambiente

`settings.yaml` + variáveis (`ENV`, `AUTH_MODE`, `AUTH_LOGIN_URL`, `BFF_BASE_URL`, `CHAT_MOCK`) — tabela em `AGENTS.md` e
`dependencias-e-ambiente.md`. Falha fechada: `environment` fora de `des`/`uat`/`prd` (qualquer caixa) levanta
`SettingsError`; em `uat` e `prd`, também se `auth.mode` não for `gateway`/`oidc` ou se `chat.mock` for verdadeiro; em
`prd`, também com `bff.base_url` vazio. `chat.mock` ausente do arquivo vale `true` só em `des` (`false` em `uat`/`prd`); chave booleana com valor fora de `true`/`false`/`1`/`0`/`sim`/`não`/`nao`/`yes`/`no`/`on`/`off` também
(`parse_bool`, qualquer ambiente). O `app.py` mostra texto genérico pt-BR e para (§3). `auth.current_user()`: `none`/`mock` não leem cabeçalho (mock devolve
`auth.mock_first_name`); `gateway`/`oidc` leem `x-user-id`/`x-user-email` de `st.context.headers`. Só o primeiro nome
vai para a saudação do chat. Sessão expirada no BFF (401): a página ou o chat mostram "Sua sessão expirou. Entre
novamente." com o link para `auth.login_url` (padrão `/`): recarregar pelo gateway refaz a autenticação; o app não
guarda token. `config.toml`: `toolbarMode = "minimal"`, `showSidebarNavigation = false`,
`enableStaticServing = true` (`/app/static`), `maxUploadSize = 20`, `showErrorDetails = false` (R6: exceção não
tratada não mostra o host do BFF; as páginas ainda capturam `ApiError`/`ValueError` e mostram o texto pt-BR).
