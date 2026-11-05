# Página Triagent (`/triagent`)

<!-- page-data-hash: d3317d953d86 -->

Painel de triagem das normas: cards de segmento com filtro "a classificar", gráfico "Normativos Recebidos" por período,
classificação (pizza de aplicáveis e lista de temas), "Fluxo de e-mail - Triagem" e a Tabela Analítica com Excel e botão
do Agente da Agenda. É a página com mais dados; portá-la sozinha exige cinco fontes. Cada serviço de dados lê o mock
(`dataMock: true` no `env.json`, padrão) ou o BFF no contrato v1 (`dataMock: false`, `docs/contratos/openapi-agenda-normativa-v1.yaml`)
pelo `ApiService`, com um adaptador puro por recurso; os componentes não sabem a origem (Fase 5, ADR-023).

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/triagent` (caminho limpo; seção por âncora: `/triagent#tabela-analitica`); `/dashboard` redireciona para cá |
| Rotas / componente | `src/app/views/dashboard/routes.ts` / `dashboard.component.ts` (`app-dashboard`, standalone, pasta mantida do template) |
| Título (breadcrumb) | `Triagent` (`views/dashboard/routes.ts`) |
| Menu | grupo "Triagent" (`cil-speedometer`) em `_nav.ts`, subitens por seção |
| Seções (`id`) | `#segmentos`, `#normativos-recebidos`, `#normas-aplicaveis`, `#assunto-das-normas`, `#fluxo-de-email`, `#tabela-analitica` |

## 2. Blocos (ordem da tela)

| # | Bloco | Componente | Entradas / saídas | O que o usuário faz |
|---|---|---|---|---|
| 1 | Cards de segmento | `<app-widgets-dropdown [activeSegment] (toClassifySelect)>` (`src/app/views/widgets/widgets-dropdown/`) | entra `segmentFilter`; sai o `id` do segmento clicado | clica no selo "N a classificar" e filtra a página inteira; clica de novo e limpa |
| 2 | Normativos Recebidos (linhas por segmento + "Normas a Classificar" tracejada) | `dashboard.component.*` + `DashboardChartsData` (`dashboard-charts-data.ts`) + `<app-period-filter>` + plugin `traffic-value-labels.plugin.ts` | estado da página: `trafficPeriod`, `trafficRange`, `trafficBounds`, `highlighted`, `trafficView` | Dia/Mês/Ano, presets, personalizado; clica na legenda para destacar; Gráfico/Tabela; "Exportar Excel" |
| 3 | Normas Aplicáveis (rosca aplicáveis × não aplicáveis) | `<app-applicability-chart [period] [bounds] [segmentFilter] [applicabilityFilter] [themeFilter] (applicabilitySelect)>` (`classification/`) | recebe os filtros da página; emite fatia clicada | clica na fatia e filtra temas e tabela |
| 4 | Assunto das Normas Aplicáveis (barras por tema, top 10 + "Outros temas") | `<app-themes-list ... (themeSelect)>` (`classification/`) | idem; emite tema clicado | clica no tema e filtra pizza e tabela |
| 5 | Fluxo de e-mail - Triagem (barras empilhadas por segmento; indicadores; "Últimos e-mails") | `<app-emails-chart [segmentFilter]>` (`emails/`) | filtro de período **próprio** (`<app-period-filter>` interno, só Dia/Mês: `periodOptions`) | período; abre um e-mail e vê as normas; "Exportar Excel" |
| 6 | Tabela Analítica (normas classificadas, 15 por página, ordenável) | `<app-analytic-table [period] [bounds] [segmentFilter] [applicabilityFilter] [themeFilter]>` (`analytic-table/`) | recebe todos os filtros; usa `ChatLauncherService` | ordena, pagina, "Exportar Excel", "Perguntar ao Agente da Agenda" por linha |

Estado compartilhado em `dashboard.component.ts`: `segmentFilter` (cards → tudo), `applicabilityFilter` e `themeFilter`
(pizza ↔ temas ↔ tabela), `trafficPeriod`/`trafficBounds` (gráfico 2 → blocos 3, 4 e 6). O bloco 5 tem período próprio.
Faixa `.segment-filter-notice` aparece com o filtro de segmento ativo.

## 3. Dados consumidos

### Bloco 1 — Cards de segmento

- Serviço: `SegmentCardsService.getSegments()` em `src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`.
- Mock: `src/assets/data/dashboard-segments.json`. Interface `SegmentCardsData` / `SegmentCard`. De-para: `docs/mapeamento-de-dados.md` §3.1.
- v1: `GET /v1/segmentos` → `SegmentosResposta`, adaptador `fromSegmentosV1` (`segment-cards.adapter.ts`: domínio do `id`,
  ícone pelo `id`, ordem alfabética). Erro: "Não foi possível carregar os segmentos." ou o texto do status, com o código de suporte.

| Campo | Formato | Exemplo | Onde aparece | Origem | Campo v1 |
|---|---|---|---|---|---|
| `SegmentCardsData.asOf` | `yyyy-MM-dd` | `2021-12-31` | referência (não exibido) | mapeamento §3.1 | `dataReferencia` |
| `SegmentCardsData.segments` | 4 itens, ordem alfabética | | um card por item | mapeamento §3.1 | `segmentos[]` |
| `SegmentCard.id` | domínio §4.1 | `atacado` | chave do filtro "a classificar"; cor | mapeamento §4.1 | `id` (`ATACADO`) |
| `SegmentCard.label` | texto pt-BR | `Atacado` | nome do card; faixa de filtro | glossário | `nome` |
| `SegmentCard.icon` | ícone do subset | `cilTruck` | ícone do card | não buscar | — (front, pelo `id`) |
| `SegmentCard.total` | inteiro ≥ 0 | `54` | número grande | mapeamento §3.1 | `total` |
| `SegmentCard.toClassify` | inteiro ≥ 0, ≤ `total` | `7` | selo/botão "7 a classificar" | mapeamento §3.1 | `aClassificar` |
| `SegmentCard.trend` | números, mais antigo primeiro | `[65, 59, 84]` | minigráfico de linha | mapeamento §3.1 | `tendencia` |

### Bloco 2 — Normativos Recebidos

- Mock (`dataMock: true`): **números aleatórios** gerados por `DashboardChartsData.initMainChart` (`src/app/views/dashboard/dashboard-charts-data.ts`,
  `random(min, max)` dentro de `TRAFFIC_SERIES[].range`; eixo y fixo em 250). Não há mock JSON.
- v1 (`dataMock: false`): `TrafficDataService.getTraffic(period, bounds)` em `src/app/views/dashboard/traffic/traffic-data.service.ts`
  → `GET /v1/normativos-recebidos?granularidade&inicio&fim` → adaptador `fromNormativosRecebidosV1` (`traffic/traffic.adapter.ts`)
  → `DashboardChartsData.selectPeriod` (rótulos e subtítulo) + `setTrafficData` (valores; eixo y pelo maior valor + 10%).
  `DashboardComponent.trafficState` mostra "Carregando dados..." e o erro ("Não foi possível carregar os dados dos normativos
  recebidos." ou o texto do status, com o código de suporte); legenda e "Exportar Excel" só com os dados prontos.
  De-para em `docs/mapeamento-de-dados.md` §3.2 e `docs/contratos-de-dados.md` §11.2.

| Campo | Formato | Uso | Campo v1 |
|---|---|---|---|
| `TrafficResponse.period` | `Day`/`Month`/`Year` | granularidade devolvida | `granularidade` (`DIA`/`MES`/`ANO`) |
| `TrafficResponse.start`, `TrafficResponse.end` | `yyyy-MM-dd` | período devolvido (referência) | `inicio`, `fim` |
| `TrafficResponse.points` | chave por ponto | um por rótulo do eixo x (rótulos pt-BR vêm de `buildTrafficPeriod`) | `pontos[]` |
| `TrafficResponse.segments` | 4 séries, ordem de `TRAFFIC_SERIES` | linhas por segmento | `segmentos[]` |
| `TrafficSegmentSeries.segment` | domínio §4.1 | série do segmento | `segmento` |
| `TrafficSegmentSeries.label` | texto pt-BR | não exibido (a legenda usa `TRAFFIC_SERIES.label`) | `nome` |
| `TrafficSegmentSeries.classified` | inteiros, um por ponto | linha do segmento; legenda | `classificadas[]` |
| `TrafficSegmentSeries.toClassify` | inteiros, um por ponto | linha "Normas a Classificar" (soma ou do segmento filtrado) | `aClassificar[]` |

- Interfaces exportadas por `dashboard-charts-data.ts` (configuração e resumo, não resposta do BFF):

| Campo | Formato | Uso |
|---|---|---|
| `TrafficSeries.id` | domínio §4.1 ou `to-classify` | chave da série; liga card ↔ linha ↔ e-mails ↔ classificação |
| `TrafficSeries.label` | texto pt-BR | legenda (`Atacado`… `Normas a Classificar`) |
| `TrafficSeries.colorVar` | token `--app-series-1..4`, `--app-series-reference` | cor da linha (validada para daltonismo, ADR-004) |
| `TrafficSeries.fallbackColor` | hex igual ao token claro | fallback do canvas (R10) |
| `TrafficSeries.range` | `[min, max]` | só o mock aleatório (`dataMock: true`) |
| `TrafficSeries.dashed` | booleano | linha tracejada da referência |
| `TrafficSummaryItem.label`, `TrafficSummaryItem.filter`, `TrafficSummaryItem.color`, `TrafficSummaryItem.dashed`, `TrafficSummaryItem.total`, `TrafficSummaryItem.share` | calculados | legenda com total e participação (`trafficSummary()`) |
| `IChartProps.data`, `IChartProps.labels`, `IChartProps.options`, `IChartProps.colors`, `IChartProps.type`, `IChartProps.legend` | objeto Chart.js | configuração do `<c-chart>`; não vem de produção |

Parâmetros: `TrafficPeriod` (`Day`/`Month`/`Year`), `DateRange.start`/`DateRange.end`, `RangeOption.count`/`RangeOption.label`
(`src/app/views/dashboard/period/period-range.ts`). `PERIOD_END` fixo em 31/12/2021 (fim do mock): trocar por "hoje" ou data do BFF.

### Blocos 3, 4 e 6 — Classificação das normas (mesma fonte)

- Serviço: `ClassificationDataService` em `src/app/views/dashboard/classification/classification-data.service.ts`:
  `getSummary(query)` (pizza e temas) e `getNormasPage(query)` (Tabela Analítica, uma página). Validação `validateClassification`
  nos dois modos.
- Mock (`dataMock: true`): `src/assets/data/dashboard-classificacao.json` (gerado por `scripts/gen-classificacao.js`, lido uma
  vez com `shareReplay`); `localClassificationQueries` agrega (`aggregateClassification`) e pagina (`pageClassified`: mesmos
  filtros, ordenação e desempates do servidor) no navegador.
- v1 (`dataMock: false`), adaptadores em `classification/classification.adapter.ts`:
  - pizza e temas: `GET /v1/normas-classificadas/resumo?inicio&fim[&segmento][&tema]&temasDe` → `fromResumoNormasV1`
    (contagens prontas; o front calcula só participações, larguras das barras e o rótulo "Outros temas");
  - tabela: `GET /v1/normas-classificadas?inicio&fim[&segmento][&aplicavel][&tema]&page&size=15&sort=<campo>,<dir>&sort=dataClassificacao,desc&sort=codigo,asc`
    → `fromPaginaNormasV1`; a tela guarda só a página visível; "1–15 de N" usa `totalElements`.
- Pedido da tela (`classification-derive.ts`): `NormasQuery` (`bounds`, `segment`, `applicable`, `theme`, `sort` {`key`,
  `direction`}, `page` a partir de 0, `size`) e `ClassificationSummaryQuery` (`bounds` + `segment`, `theme`, `themesOf`).
  Página devolvida: `DataPage` (`items`, `total`, `page`, `size`; `src/app/core/http/api-page.ts`).
- Interface: `ClassificationData` / `ClassifiedNorma` (`src/app/views/dashboard/classification/classification.model.ts`).
  De-para: `docs/mapeamento-de-dados.md` §3.3.

| Campo | Formato | Exemplo | Onde aparece | Origem | Campo v1 |
|---|---|---|---|---|---|
| `ClassificationData.asOf` | `yyyy-MM-dd` | `2021-12-31` | referência | mapeamento §3.3 | `dataReferencia` (resumo) |
| `ClassificationData.normas` | uma linha por norma classificada | | pizza, temas, tabela (mock) | mapeamento §3.3 | `content[]` (uma página) |
| `ClassifiedNorma.code` | texto único | `Resolução CMN 4.855` | chave; desempate da ordenação; pergunta ao agente | mapeamento §3.3 | `codigo` |
| `ClassifiedNorma.orgao` | texto | `CMN` | coluna "Órgão" | mapeamento §3.3 | `orgao` |
| `ClassifiedNorma.tipo` | texto | `Resolução` | coluna "Tipo" | mapeamento §3.3 | `tipo` |
| `ClassifiedNorma.numero` | texto como publicado | `4.855` | coluna "Número" (ordena pelo valor) | mapeamento §3.3 | `numero` |
| `ClassifiedNorma.classifiedAt` | `yyyy-MM-dd` | `2021-03-02` | filtro de período (bloco 2); coluna "Data da classificação" | mapeamento §3.3 | `dataClassificacao` |
| `ClassifiedNorma.segment` | domínio §4.1 | `varejo` | filtro "a classificar"; coluna "Segmento" | mapeamento §4.1 | `segmento` (`VAREJO`) |
| `ClassifiedNorma.theme` | texto | `Pix: regras de devolução e limites` | barras de tema; filtro; coluna "Tema" | mapeamento §3.3 | `tema` |
| `ClassifiedNorma.applicable` | booleano (domínio §4.3) | `true` | pizza; filtro; coluna "Aplicável ao banco?" | mapeamento §4.3 | `aplicavel` |
| `ClassifiedNorma.area` | texto | `Meios de Pagamento` | coluna "Área" | mapeamento §3.3 | `area` |
| `ClassifiedNorma.diretoria` | texto | `Operações` | coluna "Diretoria" | mapeamento §3.3 | `diretoria` |

Pizza e temas no v1 (`ClassificationAggregate`): `total` ← `total`, `applicable` ← `aplicaveis`, `notApplicable` ←
`naoAplicaveis`, `themesTotal` ← `totalTemas`, `themes[]` ← `temas[]` (`tema`, `quantidade`), `others` ← `outrosTemas`
(`quantidade`, `temasAgrupados`).

Colunas da Tabela Analítica e do Excel (`ANALYTIC_COLUMNS`): Data da classificação, Órgão, Tipo, Número, Tema, Segmento,
Aplicável ao banco?, Área, Diretoria. Arquivo `tabela-analitica-<início>-a-<fim>[-filtros].xlsx`. Excel: páginas de 100
(`collectPages`), uma depois da outra, com "Buscando linhas... N de M" no botão; acima de 5.000 linhas não gera arquivo e
mostra "A tabela tem N linhas e o Excel aceita até 5.000. Refine os filtros para exportar." (`EXPORT_LIMIT_TEXT`, D5); mudar
um filtro ou sair da página cancela os pedidos. No mock as páginas saem do arquivo local (mesmo resultado de antes).

### Bloco 5 — Fluxo de e-mail - Triagem

- Serviço: `EmailsDataService.getAggregate(query)` em `src/app/views/dashboard/emails/emails-data.service.ts`; pedido
  `EmailsQuery` (`EmailsQuery.period`, `EmailsQuery.bounds`: período próprio do card; `EmailsQuery.segment`: filtro da
  página ou `null`). Devolve `EmailsAggregate` (`emails-derive.ts`). Validação `validateEmails` nos dois modos.
- Mock (`dataMock: true`): `src/assets/data/dashboard-emails.json` (lido uma vez) + `aggregateEmails` (`localEmailQueries`).
- v1 (`dataMock: false`), adaptadores em `emails/emails.adapter.ts`: `GET /v1/emails-sugestao/resumo?granularidade&inicio&fim[&segmento]`
  (indicadores e barras, um `periodos[]` por ponto, vazios incluídos) e `GET /v1/emails-sugestao?inicio&fim[&segmento]&page=0&size=5&sort=dataEnvio,desc`
  (últimos e-mails), juntos (`forkJoin`) → `fromResumoEmailsV1`. Rótulos e subtítulo continuam de `buildTrafficPeriod`.
- Interface `EmailsData` / `SuggestionEmail` / `SuggestedNorma` (`src/app/views/dashboard/emails/emails.model.ts`).
  De-para: `docs/mapeamento-de-dados.md` §3.4.

| Campo | Formato | Exemplo | Onde aparece | Origem | Campo v1 |
|---|---|---|---|---|---|
| `EmailsData.asOf` | `yyyy-MM-dd` | `2021-12-31` | referência | mapeamento §3.4 | `dataReferencia` (resumo) |
| `EmailsData.emails` | um item por e-mail enviado | | barras, indicadores, lista (mock) | mapeamento §3.4 | `content[]` (só os 5 últimos) |
| `SuggestionEmail.id` | texto único | `em-2021-12-28-001` | chave da lista | mapeamento §3.4 | `id` |
| `SuggestionEmail.sentAt` | ISO 8601 com fuso | `2021-12-28T09:14:00-03:00` | barra do período; data na lista | mapeamento §3.4 | `dataEnvio` |
| `SuggestionEmail.subject` | texto | `Sugestões de classificação — Atacado` | não exibido | mapeamento §3.4 | `assunto` |
| `SuggestionEmail.segment` | domínio §4.1 | `atacado` | cor/pilha; filtro "a classificar" | mapeamento §4.1 | `segmento` |
| `SuggestionEmail.recipients` | inteiro ≥ 0 | `3` | não exibido | mapeamento §3.4 | `destinatarios` |
| `SuggestionEmail.normas` | lista ≥ 1 | | "N normas"; tabela ao abrir | mapeamento §3.4 | `normas[]` |
| `SuggestedNorma.code` | texto | `Resolução CMN 5.123` | "N distintas" (mock) | mapeamento §3.4 | `codigo` |
| `SuggestedNorma.orgao` | texto | `CMN` | coluna "Órgão" | mapeamento §3.4 | `orgao` |
| `SuggestedNorma.tipo` | texto | `Resolução` | coluna "Tipo" | mapeamento §3.4 | `tipo` |
| `SuggestedNorma.numero` | texto | `5.123` | coluna "Número" | mapeamento §3.4 | `numero` |
| `SuggestedNorma.title` | texto | `Gerenciamento de riscos e de capital` | coluna "Tema" | mapeamento §3.4 | `tema` |
| `SuggestedNorma.suggestedClass` | domínio §4.2 (`SuggestedClass`) | `Aplicável` | coluna "Aplicável ao segmento?" | mapeamento §4.2 | `classeSugerida` (`APLICAVEL`...) |
| `SuggestedNorma.area` | texto | `Gestão de Capital` | coluna "Área" | mapeamento §3.4 | `area` |
| `SuggestedNorma.diretoria` | texto | `Riscos` | coluna "Diretoria" | mapeamento §3.4 | `diretoria` |

Indicadores e barras no v1 (`EmailsAggregate`): `emails` ← `totalEmails`, `normas` ← `totalNormas`, `distinctNormas` ←
`normasDistintas`, `averagePerEmail` ← `mediaNormasPorEmail`, `segmentNormas` ← `normasPorSegmento[]`, `buckets[]` ←
`periodos[]` (`emails`, `normasPorSegmento`, `totalNormas`), `list` ← `content[]` da página de 5.

Excel: `fluxo-email-triagem-<início>-a-<fim>[-segmento].xlsx`.

## 4. Calculado no front

| Valor na tela | Calculado por |
|---|---|
| Linha "Normas a Classificar" somada ou do segmento filtrado; legenda com total e participação; destaque | `DashboardChartsData.seriesValues`, `trafficSummary`, `renderMainChart` |
| Tabela e Excel do gráfico Normativos Recebidos (`normativos-recebidos-<início>-a-<fim>[-a-classificar-<seg>].xlsx`) | `trafficTable()`, `xlsxTable()` em `dashboard.component.ts` |
| Rótulos de período, subtítulo, validação do intervalo personalizado | `buildTrafficPeriod`, `validateCustomRange` (`period-range.ts`) |
| Total classificado, aplicáveis/não aplicáveis e %, top 10 temas + "Outros temas", filtro cruzado | mock: `filterClassified`, `aggregateClassification` (`classification-derive.ts`); v1: contagens do `/resumo`, só %, larguras e rótulo no front (`fromResumoNormasV1`) |
| Linhas da tabela com filtros, ordenação, páginas de 15 | mock: `pageClassified` (`filterClassified` + `sortClassified` + `localPage`); v1: servidor (`page`, `size`, `sort`) |
| Excel da Tabela Analítica (páginas de 100 até 5.000) | `collectPages` (`core/http/api-page.ts`), `exportXlsx`/`xlsxTable` em `analytic-table.component.ts` |
| E-mails enviados, normas sugeridas, "N distintas", média por e-mail, barras por período | mock: `aggregateEmails`, `sentDay` (`emails-derive.ts`); v1: `/resumo` (`fromResumoEmailsV1`), rótulos por `buildTrafficPeriod` |
| Mensagem de erro de cada bloco e "Código de suporte" | `loadErrorMessage` + `<app-api-error-text>` (`core/http/`); textos em `http-error-texts.ts` |
| Datas `dd/mm/aaaa`, números `1.234`, "Sim/Não/Parcialmente" | pipes/`Intl` pt-BR; domínios §4.2 e §4.3 |
| Ícone e rótulo do segmento; cores | domínio §4.1; tokens `--app-series-*`, `--app-applicable`, `--app-not-applicable` |

## 5. De-para e domínios

- `docs/mapeamento-de-dados.md` §3.1 (cards), §3.2 (Normativos Recebidos, proposta), §3.3 (classificação), §3.4 (e-mails);
  domínios §4.1 (segmento), §4.2 (sugestão de classificação), §4.3 (aplicável ao banco); §5 (o que o front calcula).
- Conferência "reflete exatamente": itens 1 a 7 da §6 do mapeamento.
- Receita de ligação por adaptador (`*.adapter.ts`, `PRODUCTION_COLUMNS`, `fromProduction`): §2 do mapeamento. Interfaces,
  componentes e textos não mudam.

## 6. O que copiar para portar só esta página

| Item | Caminho | Observação |
|---|---|---|
| Página | `src/app/views/dashboard/**` | tudo, com specs: componente, `routes.ts`, `dashboard-charts-data.ts`, `chart-colors.ts`, `traffic-value-labels.plugin.ts`, `v1-domains.ts`, `period/`, `period-filter/`, `traffic/`, `classification/`, `emails/`, `analytic-table/` (adaptadores `*.adapter.ts` incluídos) |
| Camada HTTP | `src/app/core/services/api.service.ts`, `src/app/core/config/runtime-config.service.ts` (`dataMock`), `src/app/core/http/**` (`api-page.ts`, `api-problem.ts`, `api-error-text.component.ts`, `http-error-texts.ts`, interceptor) | `provideAppHttpClient()` em `app.config.ts`; `src/assets/env.json` com `dataMock` |
| Cards de segmento | `src/app/views/widgets/widgets-dropdown/**` | componente standalone; `segment-overview` só se levar o Início |
| Mocks | `src/assets/data/dashboard-segments.json`, `dashboard-classificacao.json`, `dashboard-emails.json` | até o contrato do BFF (R4); `scripts/gen-classificacao.js` regenera o de classificação |
| Exportação | `src/app/core/export/xlsx-export.ts` (+ spec), `src/declarations.d.ts`, `exceljs 4.4.0`, `allowedCommonJsDependencies` com `exceljs/dist/exceljs.min.js` (ADR-017) | tokens `--app-export-accent`/`--app-export-muted` em `_brand.scss` |
| Tema | `src/app/core/services/theme.service.ts` | `appliedTheme$` redesenha os gráficos; obrigatório com tema escuro |
| Agente | `src/app/chat/chat-launcher.service.ts` | só o serviço (sem HTTP). Sem o chat no destino: remover o botão e a coluna `.analytic-ask*` da tabela |
| Componentes CoreUI | nos `imports` de cada componente standalone da pasta (cards, grid, botões e grupo de botões, tabela, spinner, `WidgetStatAComponent`, `ChartjsComponent`, `IconDirective`, `ReactiveFormsModule`) | ver `dashboard.component.ts` e os componentes de `classification/`, `emails/`, `analytic-table/`, `period-filter/` |
| Ícones | `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`, `cilArrowTop`, `cilArrowBottom`, `cilCalendar`, `cilChartLine`, `cilChevronRight`, `cilFilter`, `cilList`, `cilSpeech`, `cilSpreadsheet` | `src/app/icons/icon-subset.ts` |
| Estilos globais | `src/scss/_filter-chips.scss`, `_stat-card.scss`, `_emails-card.scss`, `_classification-card.scss`, `_analytic-table.scss`, `_charts.scss`, `_components.scss` (`.brand-segmented`, `.brand-icon-btn`, `.progress-thin`, `.segment-filter-notice`), `_typography.scss` | importados por `_custom.scss`/`styles.scss`; tokens em `_brand.scss`/`_theme-dark.scss` |
| Dependências npm | `exceljs` (exportação); o resto é do template | PDF (`jspdf`) ainda não existe (R9) |
| Glossário | "Nomes dos gráficos do Triagent", "Gráfico Normativos Recebidos", "Classificação das normas", "Tabela Analítica", "Fluxo de e-mail - Triagem", "Segmentos de negócio", "Datas, números e moeda" | `docs/glossario-ptbr.md` |
| Fica de fora | `src/app/views/scalation/**`, `segment-overview`, chat completo (`src/app/chat/**` além do launcher) | |

## 7. Verificação

1. Cards: `total` e `toClassify` = contagem em produção em `asOf`; clique no selo filtra tudo e a faixa de filtro aparece.
2. Normativos Recebidos: Dia/Mês/Ano e presets; personalizado valida; legenda destaca; Tabela = Gráfico; Excel com as
   mesmas linhas e totais; último ponto de "Normas a Classificar" por segmento coerente com `toClassify` do card.
3. Pizza: total e aplicáveis no período = `count(*)` e `count(aplicável)` da fonte §3.3; temas somam os aplicáveis.
4. Filtro cruzado: tema → pizza daquele tema (a rosca continua desenhada, com os números do tema; E-011); fatia → tabela só
   com aquela classe; tudo respeita o segmento filtrado.
5. Tabela Analítica: "1–15 de N" = total da pizza; mesmo N no Excel; ordenação por cada coluna; botão do agente abre o chat
   com a norma da linha. Com `dataMock: false`: cada página, ordenação e filtro é um pedido (`page`, `size=15`, `sort`); o
   Excel faz pedidos de `size=100` em sequência; acima de 5.000 linhas aparece o texto do limite e nada é baixado.
8. Erros com `dataMock: false`: um 5xx com `traceId` mostra a frase do bloco e "Código de suporte: <traceId>"; 403 mostra
   "Você não tem acesso a esta informação."; 401 leva ao login sem texto no bloco (se a volta do login trouxer outro 401
   em menos de 60 s, a página mostra "Entrar novamente" em vez de redirecionar); nunca a mensagem do servidor.
6. E-mails: "E-mails enviados" e "Normas sugeridas" no período = contagens da fonte §3.4; abrir um e-mail lista as normas;
   Excel com as linhas visíveis; trocar o período mantém o gráfico desenhado; no erro de carga não há subtítulo de período
   (nunca "Carregando período...").
7. Temas claro e escuro; 375 px a 1440 px; console limpo; `npm run verify` verde; mapeamento §3.1–§3.4 preenchido.
