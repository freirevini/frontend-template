# Página Início (`/`)

<!-- page-data-hash: 7a5de8d429e1 -->

Visão geral dos quatro segmentos de negócio: um card por segmento com ícone, nome na cor do segmento, minigráfico de
tendência e os números "normas" e "a classificar". Mesmos dados dos cards de segmento do Triagent, sem filtro.

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/`; rota desconhecida (`**`) volta para cá |
| Rotas / componente | `src/app/views/home/routes.ts` / `home.component.ts` (`app-home`, standalone; importa `SegmentOverviewComponent`) |
| Título (breadcrumb) | vazio de propósito (`data.title: ''`), senão o breadcrumb repete "Início" do layout |
| Menu | item "Início" (`cil-home`) em `src/app/containers/default-layout/_nav.ts`, sem subitens |
| Seções (`id`) | nenhuma |

## 2. Blocos (ordem da tela)

| # | Bloco | Componente | Entradas / saídas | O que o usuário faz |
|---|---|---|---|---|
| 1 | Visão geral dos segmentos: 4 cards `c-widget-stat-d` (Atacado, Corporativo, Plataforma, Varejo) | `<app-segment-overview>` (`src/app/views/widgets/segment-overview/segment-overview.component.ts`, standalone) | sem entradas nem saídas; carrega sozinho via `SegmentCardsService.getSegments()` | só lê; sem clique, filtro ou exportação |

Estado de erro: `Não foi possível carregar os segmentos.` (`role="alert"`) se o JSON/API falhar.

## 3. Dados consumidos

### Bloco 1 — Visão geral dos segmentos

- Serviço: `SegmentCardsService.getSegments()` em `src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`
  (`HttpClient`, validação `validateSegmentCards`).
- Mock: `src/assets/data/dashboard-segments.json` (fotografia em `asOf`), com `dataMock: true` no `env.json` (padrão).
- v1 (`dataMock: false`): `GET /v1/segmentos` pelo `ApiService`, adaptador `fromSegmentosV1`
  (`segment-cards.adapter.ts`): `asOf` ← `dataReferencia`, `segments` ← `segmentos[]` (ordem alfabética), `id` ← `id`
  (`ATACADO` → `atacado`), `label` ← `nome`, `icon` pelo `id`, `total` ← `total`, `toClassify` ← `aClassificar`,
  `trend` ← `tendencia`. Erro: "Não foi possível carregar os segmentos." ou o texto do status, com "Código de suporte: …".
- Interface: `SegmentCardsData` / `SegmentCard`. De-para em `docs/mapeamento-de-dados.md` §3.1 (mesma tabela do Triagent).

| Campo | Formato | Exemplo | Onde aparece nesta página | Origem |
|---|---|---|---|---|
| `SegmentCardsData.asOf` | `yyyy-MM-dd` | `2021-12-31` | não exibido (referência dos números) | mapeamento §3.1 |
| `SegmentCardsData.segments` | lista de 4, ordem alfabética (domínio 4.1) | | um card por item | mapeamento §3.1 |
| `SegmentCard.id` | domínio de segmento | `atacado` | escolhe a cor (`--app-series-1..4` via `TRAFFIC_SERIES`) | mapeamento §4.1 |
| `SegmentCard.label` | texto pt-BR | `Atacado` | nome no cabeçalho do card | glossário "Segmentos" |
| `SegmentCard.icon` | nome de ícone do subset | `cilTruck` | ícone do cabeçalho | não buscar: `id` → ícone (§4.1) |
| `SegmentCard.total` | inteiro ≥ 0 | `54` | número "normas" | mapeamento §3.1 |
| `SegmentCard.toClassify` | inteiro ≥ 0, ≤ `total` | `7` | número "a classificar" | mapeamento §3.1 |
| `SegmentCard.trend` | números, mais antigo primeiro (até 12) | `[65, 59, 84]` | minigráfico de área | mapeamento §3.1 |

### Dependência indireta: `src/app/views/dashboard/dashboard-charts-data.ts`

O card lê só `TRAFFIC_SERIES[].id` e `TRAFFIC_SERIES[].colorVar` (cor do segmento). As interfaces desse arquivo não são
consumidas aqui, mas o import existe: `IChartProps.data`, `IChartProps.labels`, `IChartProps.options`, `IChartProps.colors`,
`IChartProps.type`, `IChartProps.legend`, `TrafficSeries.id`, `TrafficSeries.label`, `TrafficSeries.colorVar`,
`TrafficSeries.fallbackColor`, `TrafficSeries.range`, `TrafficSeries.dashed`, `TrafficSummaryItem.label`,
`TrafficSummaryItem.filter`, `TrafficSummaryItem.color`, `TrafficSummaryItem.dashed`, `TrafficSummaryItem.total`,
`TrafficSummaryItem.share` (todos do Triagent, ficha `triagent.md`). Ao portar só o Início, copiar o array `TRAFFIC_SERIES`
(id, label, colorVar) para um arquivo próprio em vez de levar o arquivo inteiro.

## 4. Calculado no front

| Valor na tela | Calculado por |
|---|---|
| Rótulos dos meses do minigráfico (`Jan`…) | `MONTHS.slice(0, trend.length)` em `segment-overview.component.ts` |
| Números formatados `1.234` | `Intl.NumberFormat('pt-BR')` |
| Cor do cabeçalho (série sob camada preta de 25 %, texto branco ≥ 4,9:1) | `--segment-color` + `_components.scss`/`segment-overview.component.scss` |

Nada de agregação: os números vêm prontos do serviço.

## 5. De-para e domínios

- `docs/mapeamento-de-dados.md` §3.1 (cards de segmento) e §4.1 (domínio de segmento: ordem, rótulo, ícone).
- Conferência "reflete exatamente": item 1 da §6 do mapeamento (`total` e `toClassify` = contagem em produção em `asOf`).
- Segmento novo em produção não entra sem decisão (R10, R11): muda paleta validada e glossário.

## 6. O que copiar para portar só esta página

| Item | Caminho | Observação |
|---|---|---|
| Página | `src/app/views/home/**` | `routes.ts`, componente, spec |
| Card de visão geral | `src/app/views/widgets/segment-overview/**` | componente, scss próprio, spec |
| Serviço de dados | `src/app/views/widgets/widgets-dropdown/segment-cards.service.ts` (+ spec), `segment-cards.adapter.ts` (+ spec), `src/app/views/dashboard/v1-domains.ts` | pode mudar para `views/widgets/segment-cards.service.ts`; ajustar import |
| Camada HTTP | `src/app/core/services/api.service.ts`, `src/app/core/config/runtime-config.service.ts` (`dataMock`), `src/app/core/http/**` (`<app-api-error-text>`, textos, interceptor) | só se levar o modo v1 (`dataMock: false`) |
| Cores das séries | `TRAFFIC_SERIES` de `dashboard-charts-data.ts` | copiar só o array (id, label, colorVar); tokens `--app-series-1..4` em `_brand.scss`/`_theme-dark.scss` (ADR-004) |
| Mock | `src/assets/data/dashboard-segments.json` | até o contrato do BFF (R4) |
| Componentes CoreUI | `RowComponent`, `ColComponent`, `WidgetStatDComponent`, `ChartjsComponent`, `IconDirective` | já nos `imports` de `SegmentOverviewComponent` |
| Ícones | `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart` em `src/app/icons/icon-subset.ts` | |
| Estilos globais | nenhum obrigatório além de `_brand.scss`/`_theme-dark.scss` (tokens) | |
| Tema | `ThemeService` só se o destino tiver tema escuro (o Chart.js lê `--app-chart-*`) | |
| Dependências npm | nenhuma além do template (`chart.js` 4.5, `@coreui/angular-chartjs` 5.5) | |
| Glossário | seções "Segmentos de negócio" e "Indicadores e dados" de `docs/glossario-ptbr.md` | |
| Fica de fora | `widgets-dropdown.component.*`, `_stat-card.scss`, filtro "a classificar" | só Triagent/Scalation |

## 7. Verificação

1. Quatro cards na ordem Atacado, Corporativo, Plataforma, Varejo; 1 coluna em 375 px, 2 em `sm`, 4 em `xl`.
2. Cada card com ícone, nome, minigráfico com `trend.length` pontos, "normas" = `total` e "a classificar" = `toClassify`
   formatados em pt-BR.
3. Cores iguais às do gráfico Normativos Recebidos (`--app-series-1..4`), nos temas claro e escuro.
4. JSON/API indisponível: mensagem de erro no lugar dos cards (com `traceId`, "Código de suporte: …"); console sem exceção.
   Com `dataMock: false`, um único `GET /api/v1/segmentos`.
5. `npm run verify` verde; ficha e `mapeamento-de-dados.md` §3.1 com a coluna de produção preenchida.
