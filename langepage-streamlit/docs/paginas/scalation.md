# Página Scalation (`/scalation`)

<!-- page-data-hash: 5bcbb244fa2f -->

Cards de segmento em tom petróleo (sem filtro), o gráfico "Cascata do resultado" com filtro de período, unidade
(`R$` / `% da receita`) e visão Gráfico/Tabela, e o card "Tráfego e vendas" (demonstração estática do template).
Estado: implementada (F7) e conferida lado a lado com a landing na F9 (§7).

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/scalation` (`st.Page("views/scalation.py", title="Scalation", url_path="scalation")` em `src/app.py`) |
| Arquivo | `src/views/scalation.py` (CSS próprio em `src/static/scalation.css`) |
| Título (breadcrumb) | `Início / Scalation` |
| Menu | grupo "Scalation" em `NAV` de `src/app.py` (ícone `:material/layers:`), subitens por seção (`compat.section_link`) |
| Seções (`id`) | `segmentos` (Normas por segmento), `cascata` (Cascata do resultado), `trafego-e-vendas` (Tráfego e vendas) |

## 2. Blocos (ordem da tela)

| # | Bloco | Chave (`st-key-*`) / função de `core/` | Estado (`session_state`) | O que o usuário faz |
|---|---|---|---|---|
| 0 | Título oculto `<h1>Scalation</h1>` | `st.html` | — | — |
| 1 | Normas por segmento: 4 cards em tom petróleo | `ui.section_anchor("segmentos")`; `ui.segment_cards("scalation", items, tone="petrol", filterable=False)`: containers `seg-scalation-<id>`, selo "N a classificar" como texto (`.brand-stat-pending`), minigráfico `segchart-scalation-<id>` | nenhum | só lê |
| 2 | Cascata do resultado (card `card-cascata`) | cabeçalho `wf-head` (`compat.hstack([5, 4])`): `ui.card_title(..., anchor="cascata")` + chips em `wf-toggles` (`st.pills` com `compat.required_choice`); `ui.period_filter("waterfall", label="Período da cascata")`; faixa `.brand-wf-bar` (Resultado + legenda); `charts.waterfall_chart` (chave `wf-chart`) ou tabela HTML `.brand-wf-table` | `pf-waterfall` (`PeriodSelection`) e auxiliares `pf-waterfall-*`; `wf-unit` (`currency` \| `percent`) e `wf-unit-prev`; `wf-view` (`chart` \| `table`) e `wf-view-prev` | Dia/Mês/Ano, presets "Últimos …", Personalizado (De/Até, Aplicar/Cancelar); `R$` ↔ `% da receita`; Gráfico ↔ Tabela |
| 3 | Tráfego e vendas (card `card-trafego-e-vendas`, demonstração) | HTML estático em `st.html` (`.brand-demo-*`), âncora `trafego-e-vendas` dentro do HTML; ícones CoreUI `cil-user`, `cil-user-female`, `cib-google`, `cib-facebook`, `cib-twitter`, `cib-linkedin`, botão "Mais opções" (`cil-options`, sem ação) | nenhum | nada; não é produto |

Erros de carga: bloco 1 mostra "Não foi possível carregar os segmentos."; bloco 2 mostra "Não foi possível carregar os
dados da cascata." (`.brand-wf-placeholder`, `role="alert"`) e "Carregando período..." no subtítulo. Os dois passam por
`ui.data_error`/`data_error_html`: no 401 "Sua sessão expirou. Entre novamente." + link "Entrar novamente", no 403 "Você
não tem acesso a esta informação.", e "Código de suporte: <traceId>" quando o BFF mandou `traceId`. O período da Cascata é
próprio (não compartilhado com o Triagent). Os chips são escolha obrigatória: clicar no chip ativo não o desmarca
(`_required_pills` regrava o valor a cada run, E-002).

## 3. Dados consumidos

### Bloco 1 — `core.data.segments()` → `data/dashboard-segments.json` ou `GET /v1/segmentos`

Mesmos campos da ficha `inicio.md` §3; `toClassify` aparece como selo de texto, sem botão; `icon` em qualquer grafia.

### Bloco 2 — `core.data.waterfall(period, bounds)` → `data/dashboard-waterfall.json` ou `GET /v1/cascatas-resultado?granularidade&inicio&fim`

No BFF, `waterfall_from_v1` converte `periodo` → `period`, `moeda` → `currency`, `escalaUnidade` → `unitScale`,
`etapas[]` (`rotulo`, `tipo` `TOTAL`/`REDUCAO`, `partes[]` com `rotulo`, `valor`) → `steps[]` (contratos §7). Campos
(nomes internos):

| Campo | Formato | Exemplo | Onde aparece |
|---|---|---|---|
| `period` | texto pt-BR | `Janeiro a dezembro de 2021` | subtítulo do card; `caption` da tabela; texto oculto do gráfico (no BFF, se vier vazio, o app monta com `period.build_traffic_period`) |
| `baseYear` | inteiro, opcional | `2021` | só a derivação temporária do mock (`derive_waterfall`) |
| `currency` | ISO 4217, obrigatório, 3 letras maiúsculas | `BRL` | símbolo em `data.format_currency` (`R$`, `US$`, `€`) |
| `unitScale` | número finito > 0, obrigatório | `1000000` | `R$ 15 mi` |
| `steps[].id` | texto único | `gross-revenue` | semente da derivação |
| `steps[].label` | texto pt-BR | `Receita bruta` | eixo x (quebra em linhas em 375 px); coluna "Etapa" (`rowspan`) |
| `steps[].kind` | `total` \| `decrease` | `decrease` | rampa azul/vermelha; sinal (`−`) |
| `steps[].parts[]` (`label`, `value`) | 1 a 3; `value ≥ 0` | `Impostos`, `15` | segmentos empilhados com rótulo dentro; tooltip; coluna "Componente" |

`core.data.validate_waterfall(data)` (dentro de `waterfall()`) recusa resposta sem `steps`, sem `currency` de 3 letras
ou sem `unitScale` numérico positivo; `core.data.build_waterfall(steps)` valida (etapa com 1–3 componentes, valores
finitos ≥ 0) e monta `WfModel` (`columns`, `segments`, `base`, `result`). Qualquer recusa cai no `try` da página, que
mostra "Não foi possível carregar os dados da cascata." no lugar do gráfico.

## 4. Calculado no app

| Valor na tela | Calculado por |
|---|---|
| Colunas, segmentos, base e resultado | `data.build_waterfall` (`WfModel`, `WfColumn`, `WfSegment`) |
| "Resultado" e "(x% da receita bruta)" | `data.format_currency(result, unitScale, currency)`, `data.format_share(result, base)` |
| Tabela: Valor, % da receita bruta, Saldo após a etapa | `format_currency`/`format_share` por segmento e `column.end` por etapa (`_waterfall_table`) |
| Cascata de qualquer período a partir da base anual | `data.derive_waterfall`: **temporário**, sai com o endpoint |
| Rótulos e validação do período, subtítulo | `core/period.py` (`validate_custom_range`, `build_traffic_period`) |
| Rampas, conector, tinta dos rótulos | `tokens()` (`wf_total`, `wf_decrease`, `wf_connector`, `on_dark`/`ink_on_light` por componente) |
| Ticks e margens em telas estreitas | `compat.viewport_narrow()` → `charts.waterfall_chart(..., narrow=True)` |
| Cor "info" do card demo | `tokens()["highlight_dark"]` no claro / `["highlight"]` no escuro (inline, `--brand-demo-info`) |

## 5. De-para e domínios

`docs/contratos-de-dados.md` §3 (cards), §7 (cascata), §8 (formatação); domínio de segmento. Sem Excel na cascata
(como na landing); reusar `xlsx.build_xlsx` quando pedido (R9).

## 6. O que copiar para portar só esta página

| Item | Caminho |
|---|---|
| Página | `src/views/scalation.py`, `src/static/scalation.css` |
| Núcleo | `src/core/data.py` (`segments`, `waterfall`, `validate_waterfall`, `build_waterfall`, `derive_waterfall`, `format_currency`, `format_share`), `period.py`, `charts.py` (`waterfall_chart`, `sparkline`), `ui.py` (`card`, `card_title`, `chart`, `icon`, `period_filter`, `section_anchor`, `segment_cards`), `compat.py` (`hstack`, `required_choice`, `viewport_narrow`), `tokens.py`, `settings.py` (+ `api.py`/`auth.py` com BFF) |
| Mocks | `data/dashboard-segments.json`, `data/dashboard-waterfall.json` |
| Estáticos | `src/static/app.css` (cards, tom petróleo `st-key-seg-scalation`, chips, filtro de período), ícones de segmento (`cil-{truck,building,devices,cart}.svg`), ícones do card demo (`cil-user.svg`, `cil-user-female.svg`, `cil-options.svg`, `cib-{google,facebook,twitter,linkedin}.svg`), fontes Inter, `src/components/theme_probe/` |
| Pacotes | `streamlit`, `plotly`, `pyyaml` |
| Glossário | "Gráfico de cascata", "Segmentos de negócio", "Datas, números e moeda" |
| Fica de fora | card "Tráfego e vendas" (demo), `segment_overview`, chat |

## 7. Verificação

Conferido na F9 (agente da página; `checks/shoot.py` e `checks/interact.py`, 1440 e 375 px, claro e escuro):

1. ✔ Cards em tom petróleo, sem botão de filtro, mesmos números do Triagent e do Início.
2. ✔ Cascata: etapas `total` em azul, `decrease` em vermelho; tooltip com valor, componente, etapa, a outra unidade e o
   saldo após a etapa; tabela com `rowspan` por etapa; subtítulo do período igual ao do Normativos Recebidos para o
   mesmo preset.
3. ✔ `R$` ↔ `% da receita` recalcula rótulos, resultado e legenda; Gráfico ↔ Tabela com as mesmas somas
   (`tests/test_data.py`: `build_waterfall`, `derive_*`, `format_currency`, `format_share`).
4. ✔ Período personalizado valida ("Informe as duas datas.", limites 92 dias / 60 meses / 30 anos; `tests/test_period.py`).
5. ✔ 375 px: nomes das etapas em duas linhas, ticks menores, margens recolhidas
   (`tests/test_compat_ui.py::test_waterfall_on_phones_shrinks_ticks_and_takes_the_side_margins_back`); rótulos
   horizontais e ocultos quando não cabem (`::test_waterfall_text_is_horizontal_and_hidden_when_it_does_not_fit`).
6. ✔ Temas claro e escuro; sem exceção na tela; `bash scripts/verify.sh` verde.
7. ✔ Resposta da cascata sem `currency`, sem `unitScale` ou com `unitScale` não numérico mostra o texto de erro pt-BR,
   nunca traceback (`tests/test_view_scalation.py`, E-009).
8. ✔ Contrato v1 com o BFF simulado: a cascata vem de `/v1/cascatas-resultado` (casos acima em v1); 401 na cascata
   mostra "Sua sessão expirou. Entre novamente." com o link e o código de suporte, 403 nos segmentos mostra "Você não
   tem acesso a esta informação." (`tests/test_view_scalation.py::test_cascade_401_shows_session_expired_with_login_link_and_support_code`).

Diferenças aceitas: chips Gráfico/Tabela com ícones Material (`:material/show_chart:`, `:material/list:`) no lugar de
`cilChartLine`/`cilList` (rótulo de `st.pills` aceita só ícone Material); tabela em HTML próprio (não `st.dataframe`)
para manter o `rowspan` da landing; card demo "Tráfego e vendas" com ícones CoreUI e botão "Mais opções" sem ação.
