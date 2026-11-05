# Página Scalation (`/scalation`)

<!-- page-data-hash: 92a8d46e2004 -->

Cards de segmento (tom petróleo, sem filtro) e o gráfico "Cascata do resultado" com filtro de período, unidade
(`R$` / `% da receita`) e visão Gráfico/Tabela. O card "Tráfego e vendas" é demo do template, não produto.

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/scalation` (caminho limpo; seção por âncora: `/scalation#cascata`) |
| Rotas / componente | `src/app/views/scalation/routes.ts` / `scalation.component.ts` (`app-scalation`, standalone, sem lógica) |
| Título (breadcrumb) | `Scalation` (`views/scalation/routes.ts`) |
| Menu | grupo "Scalation" (`cil-layers`) em `_nav.ts`, subitens por seção (`section(...)`) |
| Seções (`id`) | `#segmentos` (Normas por segmento), `#cascata` (Cascata do resultado), `#trafego-e-vendas` (Tráfego e vendas) |

## 2. Blocos (ordem da tela)

| # | Bloco | Componente | Entradas / saídas | O que o usuário faz |
|---|---|---|---|---|
| 1 | Cards de segmento | `<app-widgets-dropdown tone="petrol" [filterable]="false">` (`src/app/views/widgets/widgets-dropdown/`) | `tone`, `filterable=false` (sem `activeSegment` nem `toClassifySelect`) | só lê |
| 2 | Cascata do resultado | `<app-waterfall-chart>` (`src/app/views/scalation/waterfall/waterfall-chart.component.ts`) | sem entradas; estado interno: `period`, `bounds`, `unit`, visão | escolhe período (Dia/Mês/Ano, presets, personalizado), unidade `R$`/`%`, Gráfico/Tabela |
| 3 | Tráfego e vendas (demo) | HTML estático em `scalation.component.html` | valores literais | nada; **não portar** (arquitetura §10.1) |

Filtro de período do bloco 2: `<app-period-filter>` (`src/app/views/dashboard/period-filter/`), o mesmo do Triagent, mas
com estado próprio (os dois painéis não compartilham período).

## 3. Dados consumidos

### Bloco 1 — Cards de segmento

- Serviço: `SegmentCardsService.getSegments()` (`src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`).
- Mock: `src/assets/data/dashboard-segments.json` (`dataMock: true`); v1: `GET /v1/segmentos` + `fromSegmentosV1` (campos v1
  na ficha `inicio.md`). Interface `SegmentCardsData` / `SegmentCard`.
- Campos: `SegmentCardsData.asOf` (referência, não exibido), `SegmentCardsData.segments` (4 cards), `SegmentCard.id`
  (domínio §4.1), `SegmentCard.label` (nome), `SegmentCard.icon` (ícone; não buscar), `SegmentCard.total` (número grande),
  `SegmentCard.toClassify` (selo "N a classificar", sem botão de filtro aqui), `SegmentCard.trend` (minigráfico de linha).
  Tabela completa em `docs/mapeamento-de-dados.md` §3.1 e na ficha `triagent.md`.

### Bloco 2 — Cascata do resultado

- Serviço: `WaterfallDataService.getWaterfall(period, bounds)` em `src/app/views/scalation/waterfall/waterfall-data.service.ts`.
- Mock: `src/assets/data/dashboard-waterfall.json` (base anual 2021). Hoje `deriveWaterfall(base, period, bounds)`
  (`waterfall-derive.ts`) deriva qualquer período da base; com dados reais o BFF devolve a cascata do período e a derivação sai.
- v1 (`dataMock: false`): `GET /v1/cascatas-resultado?granularidade&inicio&fim` pelo `ApiService`, adaptador `fromCascataV1`
  (`waterfall.adapter.ts`), sem derivação: `period` ← `periodo` (ausente: `buildTrafficPeriod`), `currency` ← `moeda`,
  `unitScale` ← `escalaUnidade`, `steps` ← `etapas[]` (`id`, `label` ← `rotulo`, `kind` ← `tipo` `TOTAL`/`REDUCAO`,
  `parts` ← `partes[]` com `rotulo`/`valor`). Erro: "Não foi possível carregar os dados da cascata." ou o texto do status,
  com "Código de suporte: …".
- Interface: `WaterfallData` / `WaterfallStep` / `WaterfallPart` (`src/app/views/scalation/waterfall/waterfall.model.ts`).
  De-para em `docs/mapeamento-de-dados.md` §3.5.

| Campo | Formato | Exemplo | Onde aparece | Origem |
|---|---|---|---|---|
| `WaterfallData.period` | texto pt-BR | `Janeiro a dezembro de 2021` | subtítulo; descrição acessível | mapeamento §3.5 |
| `WaterfallData.baseYear` | inteiro, opcional | `2021` | só a derivação do mock | some com a derivação |
| `WaterfallData.currency` | ISO 4217 | `BRL` | formato `R$` | mapeamento §3.5 |
| `WaterfallData.unitScale` | inteiro | `1000000` | `R$ 15 mi` | mapeamento §3.5 |
| `WaterfallData.steps` | lista ordenada; a 1ª etapa `total` define a base | | colunas, legenda, tabela | mapeamento §3.5 |
| `WaterfallStep.id` | texto único | `gross-revenue` | chave da coluna | mapeamento §3.5 |
| `WaterfallStep.label` | texto pt-BR | `Receita bruta` | eixo x; tabela | mapeamento §3.5 |
| `WaterfallStep.kind` | `total` \| `decrease` | `decrease` | rampa azul/vermelha; sinal | mapeamento §3.5 |
| `WaterfallStep.parts` | 1 a 3 itens (`MAX_PARTS_PER_STEP`) | | segmentos empilhados | mapeamento §3.5 |
| `WaterfallPart.label` | texto pt-BR | `Impostos` | legenda; tooltip; tabela | mapeamento §3.5 |
| `WaterfallPart.value` | número ≥ 0 na unidade `unitScale` | `15` | altura; tabela | mapeamento §3.5 |

Parâmetros da consulta (no v1 viram `granularidade`, `inicio`, `fim`; `periodParams` em `src/app/views/dashboard/v1-domains.ts`): `period` (`Day`/`Month`/`Year`) e `bounds` (`DateRange.start`, `DateRange.end`),
de `src/app/views/dashboard/period/period-range.ts`. `PERIOD_END` fixo em 31/12/2021 (fim do mock): trocar por "hoje" ou
pela data devolvida pelo BFF.

Sem dependência indireta de `src/app/views/dashboard/dashboard-charts-data.ts` desde a migração para componentes standalone
(ADR-021): os cards `widgets-dropdown` e a cascata não importam esse arquivo (antes ele chegava pelo `WidgetsModule`).

## 4. Calculado no front

| Valor na tela | Calculado por |
|---|---|
| Modelo da cascata: `WaterfallModel.columns`, `WaterfallModel.segments`, `WaterfallModel.base` (1ª coluna), `WaterfallModel.result` (última) | `buildWaterfall(steps)` em `waterfall.model.ts` |
| Por coluna: `WaterfallColumn.step`, `WaterfallColumn.total`, `WaterfallColumn.start`, `WaterfallColumn.end`, `WaterfallColumn.segments` | idem |
| Por segmento: `WaterfallSegment.stepIndex`, `WaterfallSegment.partIndex`, `WaterfallSegment.stepLabel`, `WaterfallSegment.partLabel`, `WaterfallSegment.kind`, `WaterfallSegment.value`, `WaterfallSegment.low`, `WaterfallSegment.high` | idem |
| `R$ 15 mi`, `% da receita`, resultado e participação | `formatCurrency`, `formatShare` (`waterfall-format.ts`) |
| Cascata de um período qualquer a partir da base anual | `deriveWaterfall` + `noise` (`waterfall-derive.ts`): **temporário**, remover com dados reais (ADR-006) |
| Rótulos e subtítulo do período, validação do intervalo personalizado | `buildTrafficPeriod`, `validateCustomRange` (`period-range.ts`) |
| Cores das rampas (`--app-wf-*`), conector, tintas de contraste | tokens (ADR-004); fallbacks em `.ts` (R10) |

## 5. De-para e domínios

- `docs/mapeamento-de-dados.md` §3.1 (cards) e §3.5 (cascata); domínio §4.1 (segmento).
- Conferência "reflete exatamente": itens 1 e 8 da §6 do mapeamento.
- Sem exportação Excel na cascata ainda (R9 pendente; reusar `downloadXlsx` quando pedido).

## 6. O que copiar para portar só esta página

| Item | Caminho | Observação |
|---|---|---|
| Página | `src/app/views/scalation/**` | `routes.ts`, componente, cascata (`waterfall/*` com specs) |
| Cards de segmento | `src/app/views/widgets/widgets-dropdown/**` | componente standalone; `segment-overview` só se levar o Início |
| Filtro de período | `src/app/views/dashboard/period-filter/**`, `src/app/views/dashboard/period/period-range.ts` | compartilhado com o Triagent; sem outra dependência do Triagent |
| Modo v1 (`dataMock: false`) | `waterfall.adapter.ts`, `segment-cards.adapter.ts` (+ specs), `src/app/views/dashboard/v1-domains.ts`, `src/app/core/services/api.service.ts`, `src/app/core/config/`, `src/app/core/http/**` | só se levar o contrato v1 |
| Mocks | `src/assets/data/dashboard-segments.json`, `src/assets/data/dashboard-waterfall.json` | até o contrato do BFF (R4) |
| Componentes CoreUI | nos `imports` de `ScalationComponent`, `WaterfallChartComponent`, `WidgetsDropdownComponent` e `PeriodFilterComponent` (cards, grid, botões, spinner, tabela, `WidgetStatAComponent`, `ChartjsComponent`, `IconDirective`, `ReactiveFormsModule`) | componentes de progress só pelo card demo |
| Ícones | `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`, `cilCalendar`, `cilList`, `cilChartLine` | `cilUser`, `cilUserFemale`, `cilOptions` só pelo card demo |
| Estilos globais | `src/scss/_filter-chips.scss` (chips e datas do filtro), `_stat-card.scss` (cards, tom petróleo), `_charts.scss` (tooltip), `_components.scss` (`.brand-segmented`, `.brand-icon-btn`), tokens `--app-wf-*` em `_brand.scss`/`_theme-dark.scss` | importados por `_custom.scss`/`styles.scss` |
| Tema | `src/app/core/services/theme.service.ts` (`appliedTheme$` redesenha a cascata) | obrigatório com tema escuro |
| Dependências npm | nenhuma além do template (`chart.js` 4.5, `@coreui/*` 5.5, `@coreui/utils`) | |
| Glossário | "Gráfico de cascata", "Segmentos de negócio", "Datas, números e moeda" | |
| Fica de fora | card "Tráfego e vendas" (`#trafego-e-vendas`), `cif*`/`cibCc*` do subset, `segment-overview` | demo do template |

## 7. Verificação

1. Cards de segmento em tom petróleo, sem botão de filtro, mesmos números do Triagent e do Início.
2. Cascata: etapas `total` em azul (no mock, a primeira e a última), `decrease` em vermelho; legenda e tooltip com `parts`;
   subtítulo do período igual ao do gráfico Normativos Recebidos para o mesmo preset.
3. `R$` ↔ `% da receita` recalcula rótulos; Gráfico ↔ Tabela mostra as mesmas somas; `base` e `result` conferem com a origem;
   trocar período ou unidade mantém o gráfico desenhado (E-011).
4. Período personalizado valida (`Informe as duas datas.`, limites 92 dias / 60 meses / 30 anos).
5. JSON/API indisponível: estado de erro no card (com `traceId`, "Código de suporte: …"), sem subtítulo de período (nunca
   "Carregando período..." nem o período da carga anterior); console limpo. Com
   `dataMock: false`, um `GET /api/v1/cascatas-resultado` por período escolhido (o anterior é cancelado). Temas claro e escuro; 375 px a 1440 px.
6. Com dados reais: `deriveWaterfall` removido, `baseYear` ausente, `npm run verify` verde, mapeamento §3.5 preenchido.
