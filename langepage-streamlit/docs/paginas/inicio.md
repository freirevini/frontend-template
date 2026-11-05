# Página Início (`/`)

<!-- page-data-hash: 220e9341a654 -->

Visão geral dos quatro segmentos de negócio: um card por segmento com ícone, nome sobre a cor do segmento, minigráfico
de área e os números "normas" e "a classificar". Mesmos dados dos cards do Triagent, sem filtro. Estado: implementada
(F3) e conferida lado a lado com a landing na F9 (§7).

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/` (`st.Page("views/inicio.py", title="Início", default=True)` em `src/app.py`) |
| Arquivo | `src/views/inicio.py` |
| Título (breadcrumb) | só "Início" (`is-current`, sem repetição) |
| Menu | item "Início" em `NAV` de `src/app.py` (ícone `:material/home:`), sem subitens; abaixo dele o rótulo "Painéis" |
| Seções (`id`) | nenhuma |

## 2. Blocos (ordem da tela)

| # | Bloco | Chave (`st-key-*`) / função de `core/` | Estado | O que o usuário faz |
|---|---|---|---|---|
| 0 | Título oculto `<h1 class="visually-hidden">Início</h1>` | `st.html` | — | leitor de tela anuncia a página |
| 1 | Visão geral dos segmentos: 4 cards (Atacado, Corporativo, Plataforma, Varejo) em `st.columns(4)` | `ui.segment_overview(items)`: container `ovw-<id>`, cabeçalho `.brand-overview-head` (ícone + nome, `--segment-color`), minigráfico `charts.sparkline(..., height=64, area=True)` com chave `ovwchart-<id>`, valores `.brand-overview-values` | nenhuma chave de `session_state` | só lê |

Erro de carga (`segments()` levanta `ValueError` do mock/BFF ou `ApiError`): `try/except` na página chama
`ui.data_error("Não foi possível carregar os segmentos.", erro)` (`role="alert"`) no lugar dos cards: no 401 o texto é
"Sua sessão expirou. Entre novamente." com o link "Entrar novamente" (`auth.login_url`), no 403 "Você não tem acesso a
esta informação.", e com `traceId` aparece "Código de suporte: <traceId>"; nenhuma exceção nem mensagem do servidor
chega à tela.

## 3. Dados consumidos

Bloco 1 — `core.data.segments()` → mock `data/dashboard-segments.json` (`load_json`, `st.cache_data`) ou
`GET /v1/segmentos` (`core.api.get_json`, cache por usuário e `cache.ttl_seconds`; `segments_from_v1` converte `id`
`ATACADO` → `atacado`, `nome` → `label`, `aClassificar` → `toClassify`, `tendencia` → `trend` com cada ponto inteiro ≥ 0,
ícone pelo `id`); validado por
`core.data.validate_segment_cards` (contratos §3).

| Campo | Formato | Exemplo | Onde aparece |
|---|---|---|---|
| `asOf` | `yyyy-MM-dd` | `2021-12-31` | não exibido |
| `segments[]` | 4 itens, ordem alfabética | | um card por item, na ordem recebida |
| `id` | domínio de segmento | `atacado` | cor do cabeçalho e do minigráfico (`tokens.segment_color`, CSS `st-key-ovw-<id>`) |
| `label` | texto pt-BR | `Atacado` | nome no cabeçalho; rótulo do tooltip ("Normas · Atacado") |
| `icon` | nome de ícone CoreUI em qualquer grafia (`cilTruck` ou `cil-truck`) | `cilTruck` | ícone do cabeçalho (`ui.icon` resolve o SVG em `src/static/icons/`) |
| `total` | inteiro ≥ 0 | `54` | "normas" |
| `toClassify` | inteiro ≥ 0, ≤ `total` | `7` | "a classificar" |
| `trend` | números, mais antigo primeiro (até 12) | `[65, 59, 84]` | minigráfico de área |

## 4. Calculado no app

- Rótulos do minigráfico: `ui.MONTHS_PT[:len(trend)]` (Janeiro, Fevereiro, …), só no tooltip.
- Números em pt-BR por `period.fmt_int` (`1.234`).
- Cor do cabeçalho e do fundo do gráfico: série do segmento com camada escura (`rgba(--cui-black-rgb, .25)`), texto
  branco; o minigráfico preenche até a borda inferior do card (baseline invisível em `charts.sparkline`).
- Nada de agregação, filtro ou período.

## 5. De-para e domínios

`docs/contratos-de-dados.md` §3 (cards de segmento) e domínio de segmento (ordem, rótulo, cor). Segmento novo muda a
paleta validada (`tokens.series`) e o glossário: decisão (R10, R11).

## 6. O que copiar para portar só esta página

| Item | Caminho |
|---|---|
| Página | `src/views/inicio.py` |
| Núcleo | `src/core/data.py` (`load_json`, `segments`, `validate_segment_cards`), `src/core/ui.py` (`segment_overview`, `icon`, `svg_data_uri`, `inject_css`), `src/core/charts.py` (`sparkline`, `PLOTLY_CONFIG`), `src/core/tokens.py`, `src/core/period.py` (`fmt_int`), `src/core/settings.py`, `src/core/compat.py` (sonda de tema), `src/core/api.py` e `auth.py` (só com BFF) |
| Mock | `data/dashboard-segments.json` |
| Estáticos | `src/static/app.css` (`.brand-overview-*`, `st-key-ovw-*`), `src/static/icons/cil-{truck,building,devices,cart}.svg`, fontes Inter, `src/components/theme_probe/` |
| Pacotes | `streamlit`, `plotly`, `pyyaml` (+ `requests` com BFF) |
| Glossário | "Segmentos de negócio", "Indicadores e dados" |
| Fica de fora | filtro "a classificar" e tom petróleo (`ui.segment_cards`), chat, Excel |

## 7. Verificação

Conferido na F9 (agente da página; capturas de `checks/shoot.py` em 1440 e 375 px, claro e escuro):

1. ✔ Quatro cards na ordem Atacado, Corporativo, Plataforma, Varejo; 1 coluna em 375 px, 4 em 1440 px.
2. ✔ "normas" = `total` e "a classificar" = `toClassify`, formatados em pt-BR; minigráfico com `len(trend)` pontos e
   área até a borda inferior (`tests/test_compat_ui.py::test_overview_area_fills_to_the_bottom_edge`).
3. ✔ Cores iguais às séries do Normativos Recebidos nos temas claro e escuro.
4. ✔ Mock inválido ou BFF indisponível: mensagem de erro, sem exceção na tela.
5. ✔ `bash scripts/verify.sh` verde.

Diferença aceita: nenhuma.
