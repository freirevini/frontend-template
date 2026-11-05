# Página Triagent (`/triagent`)

<!-- page-data-hash: 13d612d64d24 -->

Painel de triagem das normas: cards de segmento com filtro "a classificar", gráfico "Normativos Recebidos" por período,
classificação (rosca de aplicáveis e barras de temas, filtro cruzado), "Fluxo de e-mail - Triagem" e Tabela Analítica
com Excel e "Perguntar ao Agente da Agenda". Estado: implementada (F4–F6) e conferida lado a lado com a landing na F9
(§7); diferenças aceitas listadas no fim.

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/triagent` (`st.Page("views/triagent.py", title="Triagent", url_path="triagent")` em `src/app.py`); `/dashboard` (`views/dashboard.py`) faz `st.switch_page` para cá (ADR-007) |
| Arquivo | `src/views/triagent.py` (CSS próprio em `src/static/triagent.css`) |
| Título (breadcrumb) | `Início / Triagent` |
| Menu | grupo "Triagent" em `NAV` de `src/app.py` (ícone `:material/speed:`), subitens por seção (`compat.section_link` → `ui.scroll_to_section`) |
| Seções (`id`) | `segmentos`, `normativos-recebidos`, `normas-aplicaveis`, `assunto-das-normas`, `fluxo-de-email`, `tabela-analitica` |

## 2. Blocos (ordem da tela)

| # | Bloco | Chave (`st-key-*`) / função de `core/` | Estado (`session_state`) | O que o usuário faz |
|---|---|---|---|---|
| 1 | Cards de segmento (4, gradiente azul) + faixa de filtro | `ui.section_anchor("segmentos")`; `ui.segment_cards("triagent", items, active=...)`: containers `seg-triagent-<id>[-filtered\|-dimmed]`, selo-botão `segbtn-triagent-<id>-b`, minigráfico `segchart-triagent-<id>`; faixa `ui.filter_notice("triagent-segment", ...)` (`notice-triagent-segment`, botão `notice-btn-triagent-segment`) | `triagent-segment` (id do segmento ou `None`) | clica no selo "N a classificar": filtra a página inteira (`toggle_segment_filter`); de novo ou "Remover filtro": limpa |
| 2 | Normativos Recebidos (card `card-normativos-recebidos`) | cabeçalho `traffic-head`: `ui.card_title(..., anchor="normativos-recebidos")` + chips Gráfico/Tabela `ui.chip_filter("triagent-traffic-view")` + "Exportar Excel" (`triagent-traffic-export`, só na visão Tabela); `ui.period_filter("triagent-traffic")` (Dia/Mês/Ano); `charts.traffic_chart` (`triagent-traffic-chart`) ou `st.dataframe` (`triagent-traffic-table`, Styler pt-BR, linha Total, colunas apagadas conforme o destaque); legenda HTML `.brand-traffic-legend-row` (total, participação, barra) + chips `compat.clicklist("triagent-traffic-legend")` | `pf-triagent-traffic` (`PeriodSelection`) e auxiliares; `triagent-traffic-view` (+ `-prev`); `triagent-highlight` (índice 0–3 = segmento, 4 = "Normas a Classificar", `None`) | presets e Personalizado; Gráfico/Tabela; destaca uma série pelo chip (de novo, limpa); exporta |
| 3 | Normas Aplicáveis (card `card-normas-aplicaveis`, coluna 5/12) | `charts.doughnut` (`triagent-pie`) com total no centro; legenda HTML `.brand-pie-legend-list` + chips `compat.clicklist("triagent-pie-legend")` (valores `true`/`false`) | `triagent-applicable` (`True`/`False`/`None`) | clica na classe: filtra temas (bloco 4) e tabela (6); de novo, limpa |
| 4 | Assunto das Normas Aplicáveis / Não Aplicáveis (card `card-assunto-das-normas`, coluna 7/12) | barras HTML `.brand-theme-bars` (10 temas + "Outros temas (n temas)") + chips `compat.clicklist("triagent-themes")` | `triagent-theme` (rótulo do tema ou `None`) | clica no tema: filtra a rosca (3) e a tabela (6); de novo, limpa; "Outros temas" não é clicável (como na landing) |
| 3+4 | Faixa de filtro da classificação | `ui.filter_notice("triagent-classification", ...)` | — | "Remover filtro" zera `triagent-applicable` e `triagent-theme` |
| 5 | Fluxo de e-mail - Triagem (card `card-fluxo-de-email`) | cabeçalho `emails-head`: título + chips `ui.chip_filter("triagent-emails-view")` + Excel (`triagent-emails-export`, visão Tabela); `ui.period_filter("triagent-emails", periods=("Day", "Month"))`; indicadores `<dl class="brand-emails-stats">`; `charts.emails_chart` (`triagent-emails-chart`) ou `st.dataframe` (`triagent-emails-table`); legenda HTML `.brand-emails-legend-list` + chips `compat.clicklist("triagent-emails-legend")`; "Últimos e-mails": container `triagent-emails-list` com `ui.email_row` (expander por e-mail, container `triagent-emails-item-<id>-<segmento>`) e `st.dataframe` `triagent-email-<id>` dentro | `pf-triagent-emails` e auxiliares; `triagent-emails-view` (+ `-prev`); `triagent-emails-highlight` (posição do segmento ou `None`) | período próprio (Dia/Mês); Gráfico/Tabela; destaca um segmento; abre um e-mail e vê as normas; exporta |
| 6 | Tabela Analítica (card `card-tabela-analitica`) | cabeçalho `analytic-head`: título com "N normas" + "Gerar Excel" (`triagent-table-export-build`, desabilitado sem linhas, com erro da tabela ou acima de 5.000 linhas), trocado por "Baixar Excel" (`triagent-table-export`) depois de gerado; faixa "Filtros aplicados" (`.brand-analytic-filters`); barra `triagent-table-sortbar`: `st.selectbox` "Ordenar por" (`triagent-table-sort`) + chips `ui.chip_filter("triagent-table-dir")` ↑ Crescente / ↓ Decrescente; `compat.row_action("triagent-table-<geração>-<página>", frame, ...)` (dataframe `…-df` com seleção de uma linha + botão `…-act` "Perguntar ao Agente da Agenda sobre <norma>"); barra `triagent-table-nav`: "1–15 de N" + `compat.pager("triagent-table", N, 15)` (`triagent-table-prev`/`-next`, "Página X de Y") | `triagent-table-sort` (chave da coluna), `triagent-table-dir` (`asc`/`desc`, + `-prev`), `triagent-table-page`, `triagent-table-signature` (período, filtros e ordem da última renderização), `triagent-table-generation` (incrementa a cada mudança de assinatura: nova chave do dataframe descarta a seleção) | ordena, pagina, exporta, seleciona uma linha e pergunta ao agente (`chat.ask`) |

Erros de carga (R6): cada leitura (`segments`, `traffic`, `classification`, `emails`) está em `try/except`; falha
mostra "Não foi possível carregar os segmentos." / "… os normativos recebidos." / "… a classificação das normas." /
"… os e-mails." (`role="alert"`) e `st.stop()` interrompe a página (rodapé e chat de `app.py` não são desenhados nesse
run); a mensagem do servidor nunca aparece. Sem teste dedicado (nível de página): E-006.

Estado compartilhado: filtro de segmento (bloco 1 → todos os blocos), aplicável e tema (3 ↔ 4 ↔ 6), período do bloco 2
(→ 3, 4 e 6). O bloco 5 tem período próprio. Toda mudança de estado feita no corpo da página pede
`compat.request_rerun()`; o `st.rerun()` acontece uma vez no fim de `app.py` (`compat.flush_rerun`), depois do rodapé
e do chat. Período e chips são lidos no início do run (`S.get("pf-triagent-traffic")`) porque os callbacks do filtro já
rodaram. Esc e clique fora não limpam filtros (ADR-005).

## 3. Dados consumidos

Fonte: `core.settings.use_mock_data()` (sem `BFF_BASE_URL`) lê `data/*.json`; com BFF, `core.data._bff` chama o
contrato v1 por `core.api.get_json` (cache `st.cache_data` por caminho + query + usuário, `data.identity_key()`, TTL
`cache.ttl_seconds`) e os
adaptadores `*_from_v1` entregam os mesmos formatos (contratos §1.1, §2, §11; ADR-009). Validações iguais nos dois
modos. Erro de bloco: `ui.data_error(frase do bloco, erro)` (401 "Sua sessão expirou. Entre novamente." + link "Entrar
novamente"; 403 "Você não tem acesso a esta informação."; 403 `AUT-003` "Sua sessão precisa ser renovada. Recarregue a
página."; "Código de suporte: <traceId>" quando houver). Série com ponto que não é inteiro ≥ 0 (tendência dos cards,
`classificadas`/`aClassificar` dos Normativos Recebidos) é recusada em `core/data.py` e mostra a frase do bloco.

### Bloco 1 — `core.data.segments()` → `data/dashboard-segments.json` ou `GET /v1/segmentos`

Campos `asOf`, `segments[]`, `id`, `label`, `icon`, `total`, `toClassify`, `trend` como na ficha `inicio.md` §3; aqui
`toClassify` vira o selo-botão e `id` é o valor de `triagent-segment`. O tooltip do botão muda com o estado
("Filtrar a página pelas normas a classificar de Atacado" / "Remover filtro de normas a classificar").

### Bloco 2 — `core.data.traffic(period, bounds)` + `traffic_series(data, focus)`

| Campo (`TrafficData`) | Formato | Onde aparece |
|---|---|---|
| `labels` | rótulos pt-BR do período (`Seg 27/12`, `Jan/21`, `2021`; `Janeiro` quando o intervalo cabe num ano) | eixo x; coluna "Período" da tabela e do Excel |
| `subtitle` | texto pt-BR (`Janeiro a dezembro de 2021`) | subtítulo dos cards 2, 3, 4 e 6 |
| `values[segmento]` | inteiros por ponto | linhas; tabela; Excel |
| `to_classify[segmento]` | inteiros por ponto | linha tracejada "Normas a Classificar": soma dos quatro, ou só do segmento em foco (destaque na legenda ou filtro da página; o nome ganha " · Atacado") |

Mock: números aleatórios com semente `period|start|end` nas faixas `TRAFFIC_RANGE_BANDS` (160–240, 100–160, 55–105,
120–200) e `TO_CLASSIFY_BAND` (3–12), conferidas com `dashboard-charts-data.ts` da landing
(`tests/test_compat_ui.py::test_traffic_mock_bands_match_the_landing`). BFF: `GET /v1/normativos-recebidos?granularidade&inicio&fim`
→ `traffic_from_v1` + `traffic_from_response` alinha `segments[]` por `segment` e exige um ponto por rótulo (contratos §4). Excel:
`normativos-recebidos-<início>-a-<fim>[-a-classificar-<segmento>].xlsx` (planilha "Normativos Recebidos", colunas
Período + 5 séries, linha Total).

### Blocos 3, 4 e 6 — classificação: `data/dashboard-classificacao.json` (mock) ou `GET /v1/normas-classificadas/resumo` e `GET /v1/normas-classificadas` (BFF)

Rosca e temas: `core.data.classification_summary(bounds, segment, theme, themes_of)` (mock: `aggregate_classification`
sobre `classification()`; BFF: `/resumo` com `inicio`, `fim`, `segmento`, `tema` e `temasDe`). Tabela Analítica:
mock filtra, ordena e pagina a lista de `classification()` na página (`analytic_rows`); BFF (`server_paging()`) pede
só a página visível a `classified_page` (`page` = página da tela − 1, `size=15`, `sort` da coluna escolhida, filtros
`segmento`/`aplicavel`/`tema`). Excel sob demanda, igual nos dois modos: um rerun comum não lê nem monta nada; o clique
em "Gerar Excel" grava `triagent-table-xlsx-request` (assinatura período, segmento, classe, tema, coluna e sentido) e o
run seguinte lê as linhas (mock: a lista filtrada e ordenada; BFF: `classified_export`, páginas de 100 até 5.000 linhas,
sem cache), mostra "Gerando arquivo..." e guarda `{signature, data, note, error}` em `triagent-table-xlsx`; aparece
"Baixar Excel" com o arquivo. Mudou filtro, período ou ordenação: a assinatura difere e o arquivo guardado é descartado
(volta "Gerar Excel"). Acima de 5.000 linhas o botão fica desativado e aparece "A tabela tem N linhas e o Excel aceita
até 5.000. Refine os filtros para exportar."; falha na leitura mostra "Não foi possível gerar o arquivo Excel." (com o
código de suporte) e o botão volta a ficar disponível.
Falha da tabela fica dentro do card: "Não foi possível carregar a tabela analítica.". Campos (nomes internos; v1 em
contratos §5):

| Campo | Formato | Exemplo | Onde aparece |
|---|---|---|---|
| `asOf` | `yyyy-MM-dd` | `2021-12-31` | não exibido |
| `normas[].code` | texto único | `Resolução CMN 4.855` | chave; desempate da ordenação |
| `orgao`, `tipo`, `numero` | texto | `CMN`, `Resolução`, `4.855` | colunas Órgão, Tipo, Número (Número ordena por `act_number`: `4.855` → 4855); nome da norma na pergunta ao agente (`Resolução CMN nº 4.855`) |
| `classifiedAt` | `yyyy-MM-dd` | `2021-03-02` | filtro de período (duas pontas inclusive); coluna "Data da classificação" (`dd/mm/aaaa`) |
| `segment` | domínio de segmento | `varejo` | filtro da página; coluna "Segmento" (rótulo) |
| `theme` | texto | `Pix: regras de devolução e limites` | barras de tema; filtro `triagent-theme`; coluna "Tema" |
| `applicable` | booleano | `true` | rosca; filtro `triagent-applicable`; coluna "Aplicável ao banco?" (Sim/Não) |
| `area`, `diretoria` | texto | `Meios de Pagamento`, `Operações` | colunas Área, Diretoria |

Colunas da Tabela Analítica e do Excel (`ANALYTIC_COLUMNS`, com largura): Data da classificação, Órgão, Tipo, Número,
Tema, Segmento, Aplicável ao banco?, Área, Diretoria. Arquivo
`tabela-analitica-<início>-a-<fim>[-<segmento>][-aplicaveis|-nao-aplicaveis][-tema-<slug>].xlsx`, subtítulo com "N
normas" e "filtros: …"; as linhas saem na ordem da tela, todas as páginas.

### Bloco 5 — `core.data.emails_summary(period, bounds, segment)` → `data/dashboard-emails.json` ou `GET /v1/emails-sugestao/resumo` + `GET /v1/emails-sugestao?page=0&size=5&sort=dataEnvio,desc`

Mock: `aggregate_emails` sobre `emails()`; BFF: indicadores e barras do `/resumo` (um período por rótulo) e os últimos 5
e-mails da página (contratos §6). Campos (nomes internos):

| Campo | Formato | Onde aparece |
|---|---|---|
| `emails[].id` | texto único | chave da linha (`triagent-emails-item-<id>-<segmento>`, dataframe `triagent-email-<id>`) |
| `sentAt` | ISO 8601 com deslocamento (usado como escrito, sem converter fuso) | balde do período (`sent_day`); data `dd/mm/aaaa` na linha (`sent_datetime`); ordem "mais recente primeiro" |
| `subject`, `recipients` | texto; número ≥ 0 | não exibidos (validados) |
| `segment` | domínio de segmento | pilha e cor da barra; amostra de cor na linha; filtro da página |
| `normas[]` (`code`, `orgao`, `tipo`, `numero`, `title`, `suggestedClass`, `area`, `diretoria`) | ≥ 1 por e-mail; `suggestedClass` ∈ `Aplicável` / `Aplicável parcialmente` / `Não aplicável` | "N normas" na linha; "N distintas" (códigos únicos); tabela ao abrir: Órgão, Tipo, Número, Tema (= `title`), "Aplicável ao segmento?" (Sim/Parcialmente/Não), Área, Diretoria |

Excel: `fluxo-email-triagem-<início>-a-<fim>[-<segmento>].xlsx` (planilha "E-mails": Período, E-mails, um segmento por
coluna, Total de normas; linha Total).

## 4. Calculado no app

| Valor na tela | Calculado por |
|---|---|
| Linha "Normas a Classificar" (soma ou segmento em foco), totais e participação da legenda (sobre todas as normas do período), colunas apagadas na tabela | `data.traffic_series`; página (`totals`, `grand`, `legend_dimmed`) |
| Rótulos, subtítulo, validação do personalizado e aviso de troca de granularidade; limites do calendário (`_CUSTOM_RANGE_MIN` = 1º/01 de `PERIOD_END.year − 30` a `PERIOD_END`) | `period.build_traffic_period`, `period.validate_custom_range`, `ui.period_filter` |
| Total, aplicáveis/não aplicáveis e %, top 10 + "Outros temas" (um tema a mais entra nomeado), largura das barras, filtro cruzado | `data.classification_summary` (mock: `filter_classified` + `aggregate_classification`, `TOP_THEMES = 10`; BFF: ranking pronto no `/resumo`, o app calcula %, largura e participação) |
| Ordenação (data ISO, número, texto pt-BR por `pt_br_key`; desempate mais recente → código), páginas de 15, "1–15 de N", volta à página 1 ao mudar filtro/período/ordem | mock: página (`sorted_rows`, `signature`); BFF: servidor (`sort`, `page`, `totalElements`); `compat.pager` nos dois |
| E-mails enviados, normas sugeridas, "N distintas", média por e-mail (1 decimal), barras por balde, últimos 5 | `data.emails_summary` (mock: `aggregate_emails`, `sent_day`; BFF: `/resumo` pronto, rótulos pelo `build_traffic_period`), `LATEST_EMAILS` |
| Datas, números, Sim/Não/Parcialmente, nomes de arquivo (`file_slug`) | `core/period.py`, `APPLICABILITY_LABELS`, página |
| Planilhas | `xlsx.build_xlsx` (layout da landing; células que começam com `=`, `+`, `-`, `@` ganham `'`) |
| Pergunta ao agente | `chat.ask(chat.chat_state(), "Quais são os pontos principais da <tipo> <órgão> nº <número>?")` |
| Números do gráfico Normativos Recebidos | mock: aleatório com semente; BFF: `/v1/normativos-recebidos` |

## 5. De-para e domínios

`docs/contratos-de-dados.md` §3 (cards), §4 (Normativos Recebidos), §5 (classificação), §6 (e-mails), §8 (formatação),
§9 (chat), §11 (enumerações v1). Domínios: segmento; sugestão de classificação (`Aplicável`, `Aplicável parcialmente`, `Não aplicável`);
aplicável ao banco (booleano). De-para com colunas de produção: `docs/mapeamento-de-dados.md` da landing (não portado;
entra com o contrato do BFF na F10).

## 6. O que copiar para portar só esta página

| Item | Caminho |
|---|---|
| Página | `src/views/triagent.py`, `src/static/triagent.css` |
| Núcleo | `src/core/data.py`, `period.py`, `charts.py` (`traffic_chart`, `doughnut`, `emails_chart`, `sparkline`), `ui.py`, `compat.py` (`clicklist`, `row_action`, `pager`, `hstack`, `request_rerun`, `viewport_narrow`), `xlsx.py`, `tokens.py`, `settings.py`, `api.py`, `auth.py` |
| Agente | `src/core/chat.py` (só `chat_state`, `ask`, `TEXTS["askAbout"]`); sem o chat no destino, trocar `compat.row_action` por `st.dataframe` simples |
| Mocks | `data/dashboard-segments.json`, `data/dashboard-classificacao.json`, `data/dashboard-emails.json` |
| Estáticos | `src/static/app.css`, ícones `cil-{truck,building,devices,cart,filter}.svg`, fontes Inter, `src/components/theme_probe/` |
| Pacotes | `streamlit`, `plotly`, `pandas`, `openpyxl`, `pyyaml`, `requests` |
| Glossário | "Nomes dos gráficos do Triagent", "Gráfico Normativos Recebidos", "Classificação das normas", "Tabela Analítica", "Fluxo de e-mail - Triagem", "Segmentos de negócio", "Datas, números e moeda" |
| Fica de fora | `src/views/scalation.py`, cascata, `segment_overview` |

## 7. Verificação

Conferido na F9 (agente da página; `checks/shoot.py`, `checks/interact.py` e `checks/probe.py` em 1440 e 375 px,
claro e escuro; os sete itens ok):

1. ✔ Cards: números = origem em `asOf`; clique no selo filtra tudo, o card fica contornado e os outros apagados, a faixa
   aparece; "Remover filtro" ou o mesmo selo limpa.
2. ✔ Normativos Recebidos: Dia/Mês/Ano e presets; personalizado valida com as três mensagens da landing; aviso ao trocar
   a granularidade com intervalo que não cabe; chip da legenda destaca a série (área sob a linha) e apaga as demais;
   Tabela = Gráfico (linha Total); Excel com as mesmas linhas, totais e nome de arquivo (`tests/test_xlsx.py`).
3. ✔ Rosca: total e aplicáveis do período = contagens da origem; temas somam os aplicáveis (ou não aplicáveis, quando a
   classe escolhida é "Não aplicáveis"; `tests/test_data.py`).
4. ✔ Filtro cruzado nos dois sentidos (classe ↔ tema), respeitando o segmento filtrado; faixa com "Remover filtro".
5. ✔ Tabela Analítica: "1–15 de N" = total da rosca; mesmo N no Excel; ordenação por coluna e sentido com desempates;
   selecionar uma linha e clicar no botão abre o Agente da Agenda com a pergunta sobre a norma.
6. ✔ E-mails: indicadores = contagens da origem; abrir um e-mail lista as normas (Órgão primeiro); chip da legenda
   destaca um segmento; Excel com as linhas visíveis.
7. ✔ Temas claro e escuro; 375 e 1440 px (ticks horizontais e menos rótulos: `tests/test_compat_ui.py`); sem exceção
   na tela; `bash scripts/verify.sh` verde.
8. ✔ Contrato v1 com o BFF simulado (`tests/test_view_triagent.py`, `tests/test_data_v1.py`): a tabela pede ao servidor
   só a página da tela (`page`, `size=15`, `sort`), a página do pager é a pedida, página além do fim mostra a última,
   Excel só no clique de "Gerar Excel" (rerun comum sem pedido de página de 100), "Baixar Excel" com o arquivo, arquivo
   descartado quando filtros ou ordem mudam, acima de 5.000 linhas mostra o texto do limite sem exportar; 401 mostra "Sua sessão expirou. Entre novamente."
   com o link e o código de suporte; 403 mostra "Você não tem acesso a esta informação.". Conferência no navegador com
   o BFF real fica para a F10.

Diferenças aceitas (plano §5, ADR-004 e ADR-005):

- Legenda do Normativos Recebidos, legenda da rosca, barras de tema e legenda dos e-mails são HTML fiel à landing, mas o
  clique vem dos chips `st.pills` logo abaixo (`compat.clicklist`); "Outros temas" não é clicável (como na landing).
- Sem Esc nem clique fora para limpar filtros: só "Remover filtro" ou o mesmo item.
- Tabela Analítica: ordenação por `selectbox` + chips de sentido (não pelo cabeçalho); paginação Anterior/Próxima com
  "Página X de Y"; "Perguntar ao Agente da Agenda" por seleção de linha + botão (sem botão por linha); tabela sem
  chave de cor.
- "Últimos e-mails" como `st.expander` estilizado de linha (seta, data, amostra, "N normas" à direita).
- Chips Gráfico/Tabela sem ícones CoreUI; calendário do `st.date_input` em inglês.
