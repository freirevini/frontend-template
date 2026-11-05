# ADR-006: Filtro de período compartilhado (`<app-period-filter>`) e derivação determinística da Cascata por período

Data: 2026-10-28
Situação: aceita (a derivação é temporária, ligada ao mock)

## Contexto

Os cards Tráfego e Cascata do painel Triagent precisavam do mesmo filtro: granularidade (Dia / Mês / Ano), presets "Últimos N" e intervalo personalizado "De / Até", com as mesmas mensagens e limites. Duplicar o controle geraria divergência de comportamento e de acessibilidade. Além disso, o mock da Cascata (`src/assets/data/dashboard-waterfall.json`) é uma base anual única (2021), mas o usuário espera que o gráfico responda ao período escolhido, de forma estável entre recargas.

## Decisão

### Filtro compartilhado

1. Componente `PeriodFilterComponent` (`src/app/views/dashboard/period-filter/`), seletor `<app-period-filter>`, declarado no `DashboardModule`. Entradas: `period` (`'Day' | 'Month' | 'Year'`), `range` (N do preset, ou `null` para personalizado), `bounds` (`{ start, end }`), `label` (nome acessível, ex.: "Período do tráfego", "Período da cascata") e `id` (prefixo dos ids internos). Saída: `selectionChange: PeriodSelection` já validada.
2. Regras de período centralizadas em `src/app/views/dashboard/period/period-range.ts`: `TRAFFIC_RANGES` (Dia 7/15/30, Mês 3/6/12, Ano 3/5), `DEFAULT_TRAFFIC_RANGE` (7, 12, 5), `MAX_TRAFFIC_POINTS` (92 dias, 60 meses, 30 anos), `PERIOD_LABELS`, `presetRange()`, `validateCustomRange()` (mensagens pt-BR do glossário), `buildTrafficPeriod()` (rótulos e subtítulo), `toInputDate()`/`fromInputDate()`. Os presets terminam em `PERIOD_END` (31/12/2021, último dia do mock).
3. O componente é stateless em relação ao pai: recebe a seleção pelos inputs, emite cada mudança validada e também atualiza os inputs localmente, para funcionar com ou sem *two-way binding*. Ao trocar a granularidade, um intervalo personalizado é mantido se ainda couber; senão aplica o preset padrão e mostra o aviso "O intervalo personalizado não cabe nesta visão; mostrando os últimos N".
4. Visual: `.brand-segmented` para a granularidade e `.filter-chip`/`.filter-date` (globais em `src/scss/_filter-chips.scss`) para presets e datas. ARIA: `role="group"` com `aria-label`, `aria-pressed`, `aria-expanded`/`aria-controls`, `role="status"` e `role="alert"`.
5. `DashboardComponent` (Tráfego) e `WaterfallChartComponent` (Cascata) usam o mesmo componente com ids `traffic-period` e `waterfall-period`; cada card mantém sua própria seleção.

### Cascata por período

6. `deriveWaterfall(base, period, bounds)` em `src/app/views/dashboard/waterfall/waterfall-derive.ts` deriva a cascata de qualquer intervalo a partir da base anual, de forma determinística: escala pela fração do ano coberta (`dias/365`, `meses/12`, `anos`), com oscilação pseudoaleatória estável obtida por hash FNV-1a da semente `"{period}|{start}|{end}"` (±10 % no período inteiro, ±8 % por componente). Reduções são limitadas para o resultado nunca ficar abaixo de 5 % da receita bruta; os totais após o primeiro são recalculados como saldo corrente e redistribuídos nas proporções da base; arredondamento a 3 casas. O ano-base exato (01/01 a 31/12 de `baseYear`) devolve os valores originais.
7. `WaterfallDataService.getWaterfall(period, bounds)` aplica a derivação sobre a base cacheada; `WaterfallChartComponent` usa `switchMap` para que uma seleção nova cancele a anterior.

## Consequências

- Um único lugar para regras, textos e acessibilidade do filtro; os dois cards se comportam igual e novos gráficos podem reutilizar o componente.
- O período do mock está preso a 2021; quando o BFF existir, `PERIOD_END` deve virar "hoje" ou vir do contrato.
- A derivação é um artifício do mock (ADR-002): o BFF deve filtrar por período. Ao ligar a API, remover `waterfall-derive.ts` e seus testes (`waterfall-derive.spec.ts`) ou mantê-los só como fallback de demonstração.
- Os valores derivados são plausíveis e estáveis entre recargas, mas não são dados reais; a documentação de contratos (`docs/contratos-de-dados.md`) deixa isso explícito.
- O componente vive na pasta `views/dashboard`; se outra página precisar dele, mover para um módulo compartilhado (`src/app/shared/`), sem mudar o seletor.
