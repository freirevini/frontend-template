# Design system do painel

<!-- tokens-hash: 00476eb67523 -->

Documento de referência da identidade visual do `landing-analitica`. Descreve os tokens, o tema escuro, a paleta de gráficos, a tipografia, os componentes de interface e a acessibilidade, sempre apontando o arquivo onde cada valor está. Regras relacionadas: R8 e R10 em `CLAUDE.md`.

## 1. Carimbo `tokens-hash`

A linha `<!-- tokens-hash: ... -->` logo abaixo do título é um carimbo verificado por `npm run docs:check` (`scripts/docs-check.js`, verificação 4). O script calcula o SHA-1 da concatenação de `src/scss/_brand.scss`, `src/scss/_variables.scss` e `src/scss/_theme-dark.scss` (nesta ordem), pega os 12 primeiros caracteres hexadecimais e compara com o carimbo. Se forem diferentes, a verificação falha com a mensagem "Tokens mudaram: revise docs/design-system.md e atualize o carimbo".

Procedimento ao alterar qualquer um dos três arquivos:

1. Revisar as tabelas das seções 2, 3 e 5 deste documento e corrigir o que mudou.
2. Recalcular o carimbo no diretório do projeto:

   ```bash
   cat src/scss/_brand.scss src/scss/_variables.scss src/scss/_theme-dark.scss | shasum | cut -c1-12
   ```

3. Substituir o valor na linha do carimbo e rodar `npm run docs:check`.

O carimbo existe para impedir que tokens mudem sem revisão da documentação, não para substituí-la.

## 2. Origem e arquitetura dos tokens

A paleta vem do design system público da instituição: os tokens foram lidos do CSS servido pelo site institucional em 2026-10-28 (escalas *interactive*, *highlight*, *success*, *warning*, *error*, *content* e *surface*). Os valores foram copiados para `src/scss/_brand.scss` como variáveis SCSS `$brand-*` e expostos como propriedades CSS `--brand-*` em `:root`. Nenhum arquivo, fonte ou logotipo da instituição foi copiado; só valores de cor, raio e elevação.

Três arquivos formam a fonte da verdade e são os únicos onde cor fixa é permitida (R10):

| Arquivo | Papel |
|---|---|
| `src/scss/_brand.scss` | Variáveis SCSS `$brand-*` (paleta, superfícies, raios, elevações, fonte) e propriedades CSS do tema claro em `:root`: `--brand-*`, `--app-chart-*`, `--app-series-*`, `--app-wf-*`. |
| `src/scss/_variables.scss` | Sobrescritas das variáveis SCSS do CoreUI 5 (`$primary`, `$body-secondary-color`, `$body-tertiary-color`, `$body-emphasis-color`, `$card-border-radius`, `$sidebar-bg`, `$sidebar-brand-color` etc.) usando `$brand-*`. Importado antes de `@coreui/coreui/scss/coreui`, portanto todas as `--cui-*` geradas pelo CoreUI já saem com a marca. |
| `src/scss/_theme-dark.scss` | Bloco `:root[data-theme="dark"]` que redefine `--brand-*`, `--app-*` e as `--cui-*` globais e por componente para o tema escuro; vence os padrões `[data-coreui-theme=dark]` do CoreUI 5 por especificidade. |

Ordem de importação em `src/scss/styles.scss`: `brand` → `variables` → `@coreui/coreui/scss/coreui` → `@coreui/chartjs/scss/coreui-chartjs` → `layout` → `fixes` (que importa `scrollbar` e `charts`) → `examples` → `theme-dark` → `custom` (que importa `typography`, `components` e `filter-chips`).

Regra de uso em componentes: `var(--brand-*)`, `var(--cui-*)` ou `var(--app-*)`. Nunca `#hex`, `rgb()` ou nome de cor em `.component.scss`, em template ou em TypeScript. Exceções conhecidas e aceitas, todas fora da interface do produto: as telas de exemplo guardadas em `base-de-conhecimento/` (fora do build: `paginas/widgets/widgets-brand` com cores de redes sociais, `paginas/charts/charts.component.ts`, `base/cards`, `base/placeholders`, `forms/form-controls`, `toast-simple`) e os valores de *fallback* usados quando o canvas não consegue ler CSS (`fallbackColor` em `src/app/views/dashboard/dashboard-charts-data.ts`, `FALLBACK_TOTAL`/`FALLBACK_DECREASE` em `src/app/views/scalation/waterfall/waterfall-chart.component.ts`, `'#666'`/`'#fff'` em `traffic-value-labels.plugin.ts`). Esses fallbacks repetem os valores claros de `_brand.scss` e precisam ser atualizados junto com eles.

### 2.1 Variáveis SCSS `$brand-*` (`src/scss/_brand.scss`)

| Variável | Valor | Uso |
|---|---|---|
| `$brand-blue` | `#223ad2` | Primário / interativo puro. `$primary` do CoreUI, `--brand-primary`, `--app-series-1`, `--app-wf-total-2`. |
| `$brand-blue-high` | `#192a9a` | Hover e pressed do primário. `$link-hover-color`, `--brand-primary-high`. |
| `$brand-blue-deep` | `#17278c` | `--app-wf-total-1`. |
| `$brand-blue-light` | `#cad0f6` | `--brand-primary-light`. |
| `$brand-blue-low` | `#edeffc` | Fundos tingidos (chip ativo, item de menu ativo). `--brand-primary-low`. |
| `$brand-navy` | `#0e1650` | Fundo do menu lateral (derivado de blue-high). `$sidebar-bg`, `--brand-sidebar`. |
| `$brand-navy-deep` | `#0a1040` | Faixa da marca do menu lateral. `$sidebar-brand-bg`, `--brand-sidebar-deep`. |
| `$brand-cyan` | `#31c7ed` | Destaque / secundário puro. `--brand-highlight`; filete do item ativo da sidebar. |
| `$brand-cyan-dark` | `#1099bc` | `$info`, `--brand-highlight-dark`, `--app-series-2`. |
| `$brand-cyan-high` | `#0a5c71` | `--brand-highlight-high`: início do degradê petróleo dos cards de segmento do Scalation. |
| `$brand-cyan-low` | `#ecfafd` | `--brand-highlight-low`. |
| `$brand-pink` | `#e44e83` | Terciário. `--brand-tertiary`. |
| `$brand-pink-dark` | `#dd2264` | Reservado. |
| `$brand-pink-low` | `#fdf2f6` | Reservado. |
| `$brand-purple` | `#ae6ae6` | Acento. `--brand-accent`, `--app-series-4`. |
| `$brand-green` | `#36bf36` | Sucesso puro, só para preenchimentos. `--brand-success-pure`. |
| `$brand-green-dark` | `#288f28` | Sucesso para texto e botões (4,16:1 sobre branco). `$success`, `--brand-success`, `--app-series-3`. |
| `$brand-green-high` | `#1b601b` | Reservado. |
| `$brand-green-low` | `#effaef` | `--brand-success-low`. |
| `$brand-orange` | `#ff6600` | Alerta puro. `$warning`, `--brand-warning`. |
| `$brand-orange-dark` | `#b84900` | Alerta para texto (5,26:1 sobre branco). `--brand-warning-dark`. |
| `$brand-orange-high` | `#8a3700` | Reservado. |
| `$brand-orange-low` | `#fff3eb` | `--brand-warning-low`. |
| `$brand-red` | `#dc1832` | Erro puro. `$danger`, `--brand-danger`, `--app-series-reference`, `--app-wf-decrease-2`. |
| `$brand-red-dark` | `#a51226` | `--brand-danger-dark`, `--app-wf-decrease-1`. |
| `$brand-red-high` | `#931022` | Reservado. |
| `$brand-red-low` | `#fdedef` | `--brand-danger-low`. |
| `$brand-content-high` | `#20262c` | Texto principal. `$body-color`, `$high-emphasis`, `$dark`, `--brand-content-high`, `--app-chart-tooltip-bg`. |
| `$brand-content-pure` | `#363f4a` | `--brand-content-pure`. |
| `$brand-content-low` | `#4b5968` | Texto secundário. `$secondary`, `$medium-emphasis`, `--brand-content-low`, `--app-chart-color`. |
| `$brand-content-disabled` | `#a7b2be` | Desabilitado e decorativo. `$disabled`, `--brand-content-disabled`, `--app-wf-connector`. |
| `$brand-surface-page` | `#f3f5f7` | Fundo da página. `$light`, `--brand-surface-page`. |
| `$brand-surface-card` | `#ffffff` | Fundo de cards, header e footer. `$body-bg`, `--brand-surface-card`. |
| `$brand-surface-mid` | `#eaedf0` | Fundo do seletor segmentado, hover de chips. `--brand-surface-mid`. |
| `$brand-surface-high` | `#dbe0e5` | `--brand-surface-high`. |
| `$brand-border` | `#dbe0e5` | Bordas. `$border-color`, `$card-border-color`, `--brand-border`. |
| `$brand-input-border` | `#c5ccd4` | `$input-border-color`. |
| `$brand-overlay` | `#0f1319` | Cor de sobreposição da marca; origem do fundo escuro. |
| `$brand-dark-page` | `#0f1319` | Fundo da página no escuro. |
| `$brand-dark-card` | `#171e28` | Fundo de card no escuro (superfície usada na validação da paleta). |
| `$brand-dark-alt` | `#1f2733` | Superfície intermediária no escuro. |
| `$brand-dark-border` | `#2b3542` | Bordas no escuro. |
| `$brand-dark-input` | `#121820` | Fundo de inputs no escuro. |
| `$brand-dark-input-border` | `#3a4556` | Borda de inputs no escuro. |
| `$brand-dark-text` | `#eef1f5` | Texto principal no escuro. |
| `$brand-dark-text-medium` | `#a9b1bd` | Texto secundário no escuro. |
| `$brand-dark-text-disabled` | `rgba(255, 255, 255, .38)` | Desabilitado no escuro. |
| `$brand-dark-primary` | `#6b7cf0` | Primário no escuro (4,60:1 sobre `#171e28`). |
| `$brand-dark-primary-high` | `#8491f3` | Hover do primário no escuro. |
| `$brand-dark-primary-low` | `rgba(107, 124, 240, .16)` | Fundo tingido no escuro. |
| `$brand-dark-link` | `#8c9ae8` | Links no escuro; `--brand-primary-light` escuro; `--app-wf-total-3`. |
| `$brand-dark-link-hover` | `#a4b0f2` | Hover de links no escuro. |
| `$brand-dark-sidebar` | `#0c1238` | Menu lateral no escuro. |
| `$brand-dark-sidebar-deep` | `#080d2b` | Faixa da marca no escuro. |
| `$brand-dark-success` | `#36bf36` | Sucesso no escuro. |
| `$brand-dark-warning` | `#ff8a3d` | Alerta no escuro. |
| `$brand-dark-danger` | `#f0566b` | Erro no escuro. |
| `$brand-dark-info` | `#31c7ed` | Informação no escuro. |
| `$brand-radius-xs` / `-sm` / `-md` / `-lg` / `-pill` | `.25rem` / `.5rem` / `1rem` / `1.5rem` / `100px` | Raios da marca (4, 8, 16, 24 px, pílula). |
| `$brand-elevation-1` | `0 4px 4px -2px rgba(11, 23, 35, .24)` | Nível 1. `$box-shadow-sm`. |
| `$brand-elevation-2` | `0 4px 12px 0 rgba(11, 23, 35, .12)` | Nível 2. `$box-shadow`; dropdowns. |
| `$brand-elevation-3` | `0 16px 32px 0 rgba(11, 23, 35, .32)` | Nível 3. `$box-shadow-lg`. |
| `$brand-elevation-card` | `0 2px 8px 0 rgba(11, 23, 35, .06)` | Nível 2 suavizado para cards em repouso. `$card-box-shadow`. |
| `$brand-font-family` | `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `$font-family-sans-serif`, `--brand-font-family`, `--app-chart-font-family`. |

### 2.2 Propriedades CSS: valor claro e valor escuro

Claro: `:root` em `src/scss/_brand.scss`. Escuro: `:root[data-theme="dark"]` em `src/scss/_theme-dark.scss`. "(herda o claro)" significa que o arquivo escuro não redefine o token. `npm run docs:inventory` gera a mesma tabela em `docs/inventario.md`.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--brand-primary` | `#223ad2` | `#6b7cf0` | Ações primárias, chip ativo, foco, filete da legenda. |
| `--brand-primary-high` | `#192a9a` | `#8491f3` | Hover/pressed do primário; chip ativo em hover. |
| `--brand-primary-low` | `#edeffc` | `rgba(107, 124, 240, .16)` | Fundo de chip ativo, item de legenda ativo, item de dropdown ativo, hover do botão de tema. |
| `--brand-primary-light` | `#cad0f6` | `#8c9ae8` | Tom claro do primário. |
| `--brand-primary-rgb` | `34, 58, 210` | `107, 124, 240` | Para `rgba(var(--brand-primary-rgb), a)` (anel de foco de input, hover do segmentado, borda da legenda ativa). |
| `--brand-highlight` | `#31c7ed` | `#31c7ed` | Filete do item ativo da sidebar, brilho do `.brand-stat-card`, ponto do rodapé. |
| `--brand-highlight-dark` | `#1099bc` | `#1099bc` | Variante escura do destaque. |
| `--brand-highlight-low` | `#ecfafd` | `rgba(49, 199, 237, .14)` | Fundo tingido de destaque. |
| `--brand-highlight-high` | `#0a5c71` | (herda o claro) | Tom petróleo dos cards de segmento (`tone="petrol"`): degradê até `--brand-sidebar`, texto branco ≥ 7:1 nas duas pontas; texto do selo ativo. |
| `--brand-tertiary` | `#e44e83` | (herda o claro) | Terciário. |
| `--brand-accent` | `#ae6ae6` | (herda o claro) | Acento. |
| `--brand-success` | `#288f28` | `#36bf36` | Sucesso em texto/botões. |
| `--brand-success-pure` | `#36bf36` | (herda o claro) | Sucesso em preenchimentos. |
| `--brand-success-low` | `#effaef` | `rgba(54, 191, 54, .14)` | Fundo de sucesso. |
| `--brand-warning` | `#ff6600` | `#ff8a3d` | Alerta. |
| `--brand-warning-dark` | `#b84900` | `#ff6600` | Alerta em texto sobre claro. |
| `--brand-warning-low` | `#fff3eb` | `rgba(255, 138, 61, .14)` | Fundo de alerta. |
| `--brand-danger` | `#dc1832` | `#f0566b` | Erro. |
| `--brand-danger-dark` | `#a51226` | `#dc1832` | Erro em hover/texto. |
| `--brand-danger-low` | `#fdedef` | `rgba(240, 86, 107, .14)` | Fundo de erro. |
| `--brand-content-high` | `#20262c` | `#eef1f5` | Títulos, texto principal, item ativo do breadcrumb. |
| `--brand-content-pure` | `#363f4a` | `#eef1f5` | Texto. |
| `--brand-content-low` | `#4b5968` | `#a9b1bd` | Texto secundário, subtítulos, chips em repouso, cabeçalho de tabela, data do header. |
| `--brand-content-disabled` | `#a7b2be` | `rgba(255, 255, 255, .38)` | Desabilitado, divisor do breadcrumb, polegar da barra de rolagem. |
| `--brand-surface-page` | `#f3f5f7` | `#0f1319` | Fundo da página (`.wrapper.bg-light` em `_layout.scss`). |
| `--brand-surface-card` | `#ffffff` | `#171e28` | Chips em repouso (claro), cards. |
| `--brand-surface-mid` | `#eaedf0` | `#1f2733` | Trilho do `.brand-segmented`, hover de chips/legenda/toggler do header, `.progress-thin`. |
| `--brand-surface-high` | `#dbe0e5` | `#2b3542` | Superfície alta. |
| `--brand-border` | `#dbe0e5` | `#2b3542` | Bordas de card, header, footer, chips, dropdown. |
| `--brand-sidebar` | `#0e1650` | `#0c1238` | Menu lateral. |
| `--brand-sidebar-deep` | `#0a1040` | `#080d2b` | Faixa da marca no menu. |
| `--brand-radius-xs` | `.25rem` | (herda o claro) | Itens de dropdown. |
| `--brand-radius-sm` | `.5rem` | (herda o claro) | Botões, inputs, itens de menu, legenda, tooltip de gráfico. |
| `--brand-radius-md` | `1rem` | (herda o claro) | Cards (16px). |
| `--brand-radius-lg` | `1.5rem` | (herda o claro) | Reservado para superfícies grandes. |
| `--brand-radius-pill` | `100px` | (herda o claro) | Chips, segmentado, botão de tema, selos, progresso. |
| `--brand-elevation-1` | `0 4px 4px -2px rgba(11, 23, 35, .24)` | `0 4px 4px -2px rgba(0, 0, 0, .5)` | Botão ativo do segmentado. |
| `--brand-elevation-2` | `0 4px 12px 0 rgba(11, 23, 35, .12)` | `0 4px 12px 0 rgba(0, 0, 0, .4)` | Dropdown do header, tooltip de gráfico. |
| `--brand-elevation-3` | `0 16px 32px 0 rgba(11, 23, 35, .32)` | `0 16px 32px 0 rgba(0, 0, 0, .55)` | Modais e sobreposições. |
| `--brand-elevation-card` | `0 2px 8px 0 rgba(11, 23, 35, .06)` | `0 2px 8px 0 rgba(0, 0, 0, .3)` | Cards em repouso. |
| `--brand-font-family` | pilha Inter (ver 2.1) | (herda o claro) | Fonte do app. |
| `--app-chat-accent` | `#223ad2` (`$brand-blue`) | `#5568e7` (`$brand-dark-chat-accent`) | Fundo sob texto/ícone branco do chat (botão, cabeçalho do painel, bolhas do usuário). Contraste do branco: 8,06:1 no claro, 4,65:1 no escuro (o `--brand-primary` escuro dá 3,64:1). |
| `--app-chart-color` | `#4b5968` | `#a9b1bd` | Texto de eixos e rótulos de valor dos gráficos. |
| `--app-chart-grid-color` | `rgba(32, 38, 44, .08)` | `rgba(255, 255, 255, .08)` | Linhas de grade. |
| `--app-chart-tooltip-bg` | `#20262c` | `#0f1319` | Fundo do tooltip Chart.js. |
| `--app-chart-tooltip-color` | `#ffffff` | `#eef1f5` | Texto do tooltip. |
| `--app-chart-font-family` | pilha Inter | (herda o claro) | Fonte do canvas. |
| `--app-export-accent` | `#223ad2` (`$brand-blue`) | (herda o claro, de propósito) | Planilhas exportadas: fundo do cabeçalho. A planilha é sempre clara, então não muda com o tema da tela. |
| `--app-export-muted` | `#4b5968` (`$brand-content-low`) | (herda o claro, de propósito) | Planilhas exportadas: subtítulo e filete da linha de totais. |
| `--app-series-1` | `#223ad2` | `#4d61e0` | Normativos Recebidos: Atacado. |
| `--app-series-2` | `#1099bc` | `#1099bc` | Normativos Recebidos: Corporativo. |
| `--app-series-3` | `#288f28` | `#2fae2f` | Normativos Recebidos: Plataforma. |
| `--app-series-4` | `#ae6ae6` | `#ae6ae6` | Normativos Recebidos: Varejo. |
| `--app-series-reference` | `#dc1832` | `#e8475c` | Normativos Recebidos: "Normas a Classificar" (linha tracejada). |
| `--app-wf-total-1` | `#17278c` | `#3448d0` | Cascata: 1.º componente de etapa total (mais escuro). |
| `--app-wf-total-2` | `#223ad2` | `#5f71ea` | Cascata: 2.º componente total; cor da legenda "Total". |
| `--app-wf-total-3` | `#8c9ae8` | `#8c9ae8` | Cascata: 3.º componente total (mais claro). |
| `--app-wf-decrease-1` | `#a51226` | `#c0162c` | Cascata: 1.º componente de redução. |
| `--app-wf-decrease-2` | `#dc1832` | `#e8475c` | Cascata: 2.º componente de redução; cor da legenda "Redução". |
| `--app-wf-decrease-3` | `#f07a89` | `#f59aa6` | Cascata: 3.º componente de redução. |
| `--app-wf-connector` | `#a7b2be` (`$brand-content-disabled`) | `#4b5968` (`$brand-content-low`) | Cascata: linha de saldo entre etapas (2,15:1 sobre o card claro, 2,34:1 sobre o escuro; traço fino decorativo, os saldos também estão na tabela e no tooltip). |
| `--app-applicable` | `#0e1650` (`$brand-navy`) | `#a4b0f2` (`$brand-dark-link-hover`) | Classificação das normas: aplicáveis (fatia da pizza e barras de temas). Fora dos azuis dos segmentos. |
| `--app-not-applicable` | `#a7b2be` (`$brand-content-disabled`) | `#4b5968` (`$brand-content-low`) | Classificação das normas: não aplicáveis (cinza neutro; valores sempre escritos ao lado). |

## 3. Tema escuro

O tema escuro é do projeto desde o CoreUI 4 (ADR-003). No CoreUI 5 (migração de 2026-11-03, ADR-021) o `ThemeService` continua a única fonte: ele grava também `data-coreui-theme`, para os componentes CoreUI 5 trocarem os próprios `--cui-*`, e os tokens da marca de `_theme-dark.scss` vencem. O `ColorModeService` do CoreUI não é usado.

### 3.1 Mecanismo

1. `ThemeService` (`src/app/core/services/theme.service.ts`, `providedIn: 'root'`) guarda o modo escolhido (`'light' | 'dark' | 'auto'`) em `localStorage` sob a chave `landing-analitica.color-mode` (leitura e escrita em `try/catch`; sem armazenamento, vale só para a sessão). O padrão é `'light'`.
2. `apply()` resolve o tema efetivo (`auto` consulta `matchMedia('(prefers-color-scheme: dark)')` e reage a mudanças do sistema) e, no `<html>`:
   - define `data-theme` e `data-coreui-theme` (`"light"` ou `"dark"`, sempre iguais);
   - alterna a classe `dark-theme` (gancho para SCSS que precise de `@at-root .dark-theme &`; o antigo `_examples.scss` está em `base-de-conhecimento/estilos/`).
3. `applyChartDefaults()` lê `--app-chart-color`, `--app-chart-grid-color`, `--app-chart-font-family`, `--app-chart-tooltip-bg` e `--app-chart-tooltip-color` com `getComputedStyle(documentElement)` e copia para `Chart.defaults` (importação dinâmica de `chart.js`), porque o canvas não lê CSS. Depois chama `chart.update('none')` em todas as instâncias.
4. `appliedTheme$` emite `'light' | 'dark'`; os componentes de gráfico (`DashboardComponent`, `WaterfallChartComponent`) assinam com `takeUntil(destroy$)` e refazem as cores das séries lendo os tokens de novo (`getStyle()` de `@coreui/utils` ou `getComputedStyle`).
5. O seletor fica no header (`default-header.component.html`, dropdown "Tema" com Claro / Escuro / Automático, ícones `cilSun` / `cilMoon` / `cilContrast`). `AppComponent` injeta `ThemeService` para aplicar o modo salvo no bootstrap.
6. `src/index.html` declara `<meta name="theme-color">` para claro (`#223ad2`) e escuro (`#0f1319`) via `media="(prefers-color-scheme: ...)"`.

### 3.2 O que `_theme-dark.scss` sobrescreve

Dentro de `:root[data-theme="dark"]` (`color-scheme: dark`):

| Grupo | Variáveis |
|---|---|
| Tokens da marca | Todos os `--brand-*` de cor e elevação (tabela 2.2). |
| Gráficos | `--app-chart-*`, `--app-series-*`, `--app-wf-*`. |
| CoreUI globais | `--cui-body-bg(-rgb)`, `--cui-body-color(-rgb)`, `--cui-secondary-color(-rgb)`, `--cui-tertiary-color(-rgb)`, `--cui-emphasis-color(-rgb)`, `--cui-secondary-bg`, `--cui-tertiary-bg` (níveis de texto do CoreUI 5, usados por `.text-body-secondary` nos widgets), `--cui-border-color(-translucent)`, `--cui-link-color`, `--cui-link-hover-color`, `--cui-highlight-bg`, `--cui-primary(-rgb)`, `--cui-info(-rgb)`, `--cui-success(-rgb)`, `--cui-warning(-rgb)`, `--cui-danger(-rgb)`, `--cui-light(-rgb)`, `--cui-dark(-rgb)`, `--cui-input-*`, `--cui-form-select-*`, `--cui-input-group-addon-*`, `--cui-form-check-input-bg`. |
| Layout | `.sidebar` (`--cui-sidebar-bg`, `-brand-bg`), `.header` (`--cui-header-*`), `.footer` (`--cui-footer-*`). |
| Botões | `.btn-primary`, `.btn-outline-primary`, `.btn-outline-secondary` (`--cui-btn-*`). |
| Componentes | `.card`, `.dropdown-menu`, `.nav`, `.nav-tabs`, `.nav-pills`, `.navbar`, `.accordion`, `.breadcrumb`, `.pagination`, `.progress`, `.list-group`, `.table`, `.table-light`, `.toast`, `.modal`, `.popover`, `.offcanvas`, `.callout`. |
| Estados com cor fixa no CoreUI (herdado do 4.x, mantido) | `.form-control:disabled/[readonly]`, `.form-select:disabled`, `.form-control:focus`, `.form-select:focus`, seta do `.form-select` (SVG inline `%23c3c8d1`), `.form-check-input(:checked)`, `.btn-close` (filtro de inversão). |
| Utilitários | `.bg-light`, `.bg-white`, `.text-high-emphasis`, `.text-medium-emphasis`, `.text-disabled` (com `!important`), `scrollbar-color`. |

Componentes com estilo próprio para o escuro: `.filter-chip` em `[data-theme="dark"]` (`_filter-chips.scss`) e `.brand-stat-card` via `:host-context([data-theme="dark"])` (`widgets-dropdown.component.scss`).

### 3.3 Regras

- Componente novo precisa funcionar nos dois temas sem código extra: use `var(--cui-*)`, `var(--brand-*)` ou `var(--app-*)`.
- Se um componente CoreUI aparecer com cor fixa no escuro, a correção entra em `_theme-dark.scss` (novo bloco `.classe { --cui-...: ... }`), nunca no `.component.scss`.
- Cor nova entra primeiro como `$brand-*` em `_brand.scss`, depois como `--brand-*` em `:root` e, se precisar, com valor escuro em `_theme-dark.scss`. Em seguida, atualizar a tabela 2.2 e o carimbo.
- Gráficos: nunca `getStyle()` de uma cor `--cui-*` de componente fora do elemento que a define (`--cui-card-bg` é definida em `.card`, por isso `chartSurfaceColor()` lê a partir do canvas).

## 4. Paleta de gráficos

### 4.1 Por que não as cores puras da marca

As cores puras da marca foram pensadas para marca e botões, não para séries lado a lado. Rodando o validador do skill dataviz com a sequência pura (`#223ad2, #31c7ed, #36bf36, #ae6ae6, #dc1832`) sobre `#ffffff`:

- `#31c7ed` (ciano puro) fica fora da faixa de luminosidade (OKLCH L 0,771 > 0,77) e tem contraste 2,00:1 com o branco;
- `#36bf36` (verde puro) tem contraste 2,42:1 com o branco;
- o verificador retorna **FAIL**.

Por isso as séries usam as variantes escuras da mesma família de matiz (`$brand-cyan-dark #1099bc`, `$brand-green-dark #288f28`), que mantêm a identidade da marca e passam em todos os critérios, e o tema escuro usa variantes deslocadas para a superfície `#171e28` (`#4d61e0`, `#2fae2f`, `#e8475c`).

### 4.2 Séries do gráfico Normativos Recebidos (categóricas)

Ordem fixa, igual à da legenda em `TRAFFIC_SERIES` (`src/app/views/dashboard/dashboard-charts-data.ts`): segmentos em ordem alfabética e a referência por último.

| Posição | Série | Token | Claro (sobre `#ffffff`) | Escuro (sobre `#171e28`) |
|---|---|---|---|---|
| 1 | Atacado | `--app-series-1` | `#223ad2` (8,06:1) | `#4d61e0` (3,27:1) |
| 2 | Corporativo | `--app-series-2` | `#1099bc` (3,33:1) | `#1099bc` (5,03:1) |
| 3 | Plataforma | `--app-series-3` | `#288f28` (4,16:1) | `#2fae2f` (5,76:1) |
| 4 | Varejo | `--app-series-4` | `#ae6ae6` (3,50:1) | `#ae6ae6` (4,79:1) |
| 5 | Normas a Classificar | `--app-series-reference` | `#dc1832` (4,98:1), tracejada `[8, 5]` | `#e8475c` (4,38:1), tracejada |

Codificação secundária, além da cor: a referência é tracejada; cada ponto recebe rótulo de valor (`traffic-value-labels.plugin.ts`); a legenda mostra total e participação; os pontos têm anel na cor da superfície do card.

Resultado da validação (2026-10-28, `validate_palette.js`, pares adjacentes):

| Tema | Pior par adjacente (CVD) | Pior par adjacente (visão normal) | Faixa de L | Croma | Contraste ≥ 3:1 | Resultado |
|---|---|---|---|---|---|---|
| Claro, superfície `#ffffff` | `#288f28` ↔ `#1099bc`, ΔE 18,4 (deutan); tritan 8,5 | ΔE 19,5 | 5/5 em 0,43–0,77 | 5/5 ≥ 0,10 | 5/5 | PASS |
| Escuro, superfície `#171e28` | `#1099bc` ↔ `#4d61e0`, ΔE 14,3 (deutan); tritan 3,1 | ΔE 17,0 | 5/5 em 0,48–0,67 | 5/5 ≥ 0,10 | 5/5 | PASS |

Observação: o valor tritan é só informativo no validador (não bloqueia), mas no escuro ele é baixo entre azul e ciano; a linha de referência tracejada e os rótulos de valor compensam.

### 4.3 Rampas da Cascata (ordinais)

Cada etapa tem de 1 a 3 componentes (`MAX_PARTS_PER_STEP = 3` em `waterfall.model.ts`); o componente `i` de uma etapa usa `--app-wf-total-i` ou `--app-wf-decrease-i`, do mais escuro para o mais claro. A legenda usa o passo 2 de cada rampa. A linha de saldo usa `--app-wf-connector`.

| Rampa | Tema | Passos | Monotonia de L | ΔL adjacente ≥ 0,06 | Extremo claro vs superfície (≥ 2:1) | Matiz único (≤ 40°) |
|---|---|---|---|---|---|---|
| Total | Claro | `#17278c`, `#223ad2`, `#8c9ae8` | PASS | PASS | `#8c9ae8` 2,66:1 | 8° |
| Redução | Claro | `#a51226`, `#dc1832`, `#f07a89` | PASS | PASS | `#f07a89` 2,68:1 | 10° |
| Total | Escuro | `#3448d0`, `#5f71ea`, `#8c9ae8` | PASS | PASS | `#3448d0` 2,38:1 | 6° |
| Redução | Escuro | `#c0162c`, `#e8475c`, `#f59aa6` | PASS | PASS | `#c0162c` 2,71:1 | 12° |

Os extremos claros ficam abaixo de 3:1 por natureza de rampa; a Cascata compensa com rótulos de valor sobre as barras (`labelPlugin`, tinta `#0b0b0b` ou `#ffffff` escolhida por luminância), tooltip por componente e a visão "Tabela".

### 4.4 Regra de não reordenar

A validação é feita sobre **pares adjacentes na ordem da legenda**. Trocar a ordem das séries, trocar uma cor de posição ou inserir uma série no meio muda os pares e invalida o resultado. Portanto:

- Não reordenar `TRAFFIC_SERIES` nem renomear `--app-series-N` sem revalidar nos dois temas.
- Não trocar um passo de rampa sem revalidar a rampa inteira (ordinal) no tema correspondente.
- Nova série categórica: adicionar no fim, validar com `--pairs adjacent` (linhas e barras) e, se for gráfico de dispersão ou mapa, com `--pairs all`.
- Manter sincronizados os valores escuros em `_theme-dark.scss` e os fallbacks em TypeScript.

### 4.5 Procedimento de revalidação

**Com o script.** O validador é `scripts/validate_palette.js` do skill `dataviz` (fornecido junto com o agente que fez a validação; não está no repositório). Comandos usados:

```bash
# Normativos Recebidos, categórico (ordem da legenda)
node validate_palette.js "#223ad2,#1099bc,#288f28,#ae6ae6,#dc1832" --mode light --surface "#ffffff"
node validate_palette.js "#4d61e0,#1099bc,#2fae2f,#ae6ae6,#e8475c" --mode dark  --surface "#171e28"
# Cascata, rampas ordinais (uma por rampa e tema)
node validate_palette.js "#17278c,#223ad2,#8c9ae8" --ordinal --mode light --surface "#ffffff"
node validate_palette.js "#a51226,#dc1832,#f07a89" --ordinal --mode light --surface "#ffffff"
node validate_palette.js "#3448d0,#5f71ea,#8c9ae8" --ordinal --mode dark  --surface "#171e28"
node validate_palette.js "#c0162c,#e8475c,#f59aa6" --ordinal --mode dark  --surface "#171e28"
```

Saída esperada: todas as linhas `PASS` e `ALL CHECKS PASS`; código de saída 0. `WARN` em "CVD separation" (ΔE entre 6 e 8) ou em "Contrast vs surface" (abaixo de 3:1) só é aceitável com codificação secundária (rótulos diretos, tracejado, textura ou tabela). `FAIL` em qualquer linha bloqueia.

**Sem o script.** Os critérios são todos calculáveis a partir dos hex. Implementar (em Node, Python ou planilha) e aplicar, nesta ordem:

1. Converter sRGB → linear (`c ≤ 0,04045 ? c/12,92 : ((c+0,055)/1,055)^2,4`) → OKLab (matrizes padrão de Björn Ottosson) → OKLCH (`L`, `C = hypot(a, b)`, `h = atan2(b, a)`).
2. **Faixa de luminosidade (categórico):** `L` em [0,43; 0,77] no claro e [0,48; 0,67] no escuro, para toda cor.
3. **Piso de croma (categórico):** `C ≥ 0,10` para toda cor.
4. **Separação para daltonismo (categórico):** simular protanopia e deuteranopia com as matrizes de Machado, Oliveira e Fernandes (2009), severidade 1,0, em RGB linear; converter cada cor simulada para OKLab; ΔE = distância euclidiana em OKLab × 100. Para cada par adjacente, tomar o mínimo entre protan e deutan. Alvo ≥ 8,0; entre 6,0 e 8,0 é WARN; abaixo de 6,0 é FAIL. Tritan só se reporta.
5. **Piso de visão normal (categórico):** ΔE sem simulação ≥ 15,0 no pior par adjacente. FAIL abaixo disso, sem exceção.
6. **Contraste com a superfície:** razão WCAG 2.x `(L1 + 0,05) / (L2 + 0,05)` com luminância relativa `0,2126 R + 0,7152 G + 0,0722 B` em RGB linear. Alvo ≥ 3,0:1 contra `#ffffff` (claro) e `#171e28` (escuro); abaixo exige codificação secundária.
7. **Rampas ordinais (Cascata):** `L` estritamente monótona na ordem dos passos; `|ΔL| ≥ 0,06` entre passos vizinhos; o passo mais claro (claro) ou mais escuro (escuro) com contraste ≥ 2,0:1 contra a superfície; dispersão de matiz ≤ 40°.
8. Repetir para os dois temas e registrar os números neste documento (tabelas 4.2 e 4.3), atualizando a data.

## 5. Tipografia

### 5.1 Fonte

A fonte base da marca é Inter. Ela entra pelo pacote `@fontsource/inter` 5.3.0 (ADR-005), registrado em `angular.json` nos arrays `styles` de `build` e `test`, antes de `src/scss/styles.scss`:

```
node_modules/@fontsource/inter/latin-400.css
node_modules/@fontsource/inter/latin-ext-400.css
node_modules/@fontsource/inter/latin-500.css
node_modules/@fontsource/inter/latin-ext-500.css
node_modules/@fontsource/inter/latin-600.css
node_modules/@fontsource/inter/latin-ext-600.css
node_modules/@fontsource/inter/latin-700.css
node_modules/@fontsource/inter/latin-ext-700.css
```

Pesos disponíveis: 400, 500, 600, 700; subconjuntos `latin` e `latin-ext` (acentos do pt-BR). A pilha `$brand-font-family` começa em `"Inter"` e cai para `system-ui`, `-apple-system`, `"Segoe UI"`, `Roboto`, `"Helvetica Neue"`, `Arial`, `sans-serif`. Se o pacote não estiver disponível no registry, remover as oito linhas de `angular.json` e `"Inter",` de `$brand-font-family`; o visual segue com a fonte do sistema (ver `docs/dependencias-e-ambiente.md`).

A fonte de títulos da marca é proprietária. Não há direito de uso nem arquivo licenciado para distribuição com o painel, então ela não está incluída (comentário da seção Typography de `_brand.scss`). Títulos usam Inter 600.

### 5.2 Hierarquia (`src/scss/_typography.scss` e `_variables.scss`)

| Elemento | Regra |
|---|---|
| `body` | `1rem` / `1.5`, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`. |
| `h1`–`h6`, `.h1`–`.h6`, `.card-title` | Peso 600, `letter-spacing: -.01em`, cor `var(--brand-content-high)`. `$headings-font-weight: 600`. |
| `.card-title` | `1.125rem` / `1.35`. |
| `.card-header` (`_components.scss`) | `.9375rem`, 600, `-.01em`, `var(--brand-content-high)`. |
| `.card-subtitle`, `.text-medium-emphasis` | `var(--brand-content-low)` (`!important`). |
| `small`, `.small` | `.8125rem` / `1.4`. |
| `.table td/th`, `.fs-4`, `.fs-5`, `.tabular-nums` | `font-variant-numeric: tabular-nums` (números alinhados). |
| `.table > thead th` | `.75rem`, 600, `letter-spacing: .04em`, maiúsculas, `var(--brand-content-low)`. |
| `.breadcrumb` | `.875rem`, 500; links em `content-low` com hover em `primary`; item ativo em `content-high`; divisor em `content-disabled`. |
| `a` | `text-decoration-thickness: 1px`, `text-underline-offset: .15em`. |
| Botões | `$btn-font-weight: 500`; `$font-weight-semibold: 600`. |
| Menu lateral | `.nav-title` `.6875rem` 600 `.06em`; `.nav-link` `.875rem` 500; subitens `.8125rem` 400. |
| Header | `.header-date` `.875rem` 500 tabular; `.dropdown-header` `.6875rem` 600 maiúsculas. |
| Rodapé | `.8125rem`. |
| Valor dos `.brand-stat-card` | `1.75rem`, 600, `-.02em`, tabular. |

## 6. Componentes de interface

Todos leem só variáveis CSS; o tema escuro se aplica sem código extra, salvo onde indicado.

### 6.1 Cards

| Item | Valor |
|---|---|
| Classe | `.card` (CoreUI `<c-card>`). |
| Arquivos | `src/scss/_variables.scss` (`$card-border-radius: $brand-radius-md` = 16px, `$card-border-color: $brand-border`, `$card-box-shadow: $brand-elevation-card`, `$card-cap-bg: transparent`); `src/scss/_components.scss` (`--cui-card-spacer-y/x: 1.25rem`, `--cui-card-cap-padding-y: .875rem`, `--cui-card-cap-padding-x: 1.25rem`, `.card-header`, `.card-footer`); `src/scss/_theme-dark.scss` (`.card { --cui-card-bg: #171e28; --cui-card-border-color: #2b3542; --cui-card-box-shadow: 0 2px 8px 0 rgba(0,0,0,.3) }`). |
| Tokens | `--brand-radius-md`, `--brand-border`, `--brand-elevation-card`, `--brand-content-high` (header). |
| Estados | Sem hover próprio. Escuro: fundo `#171e28`, borda `#2b3542`, sombra mais forte. |

### 6.2 Cards de segmento (`.brand-stat-card`)

| Item | Valor |
|---|---|
| Classe | `.brand-stat-card` aplicada a `<c-widget-stat-a>`; filhos `.segment-icon`, `.brand-stat-value`, `.brand-stat-pending`, `.brand-stat-chart`. |
| Arquivos | `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.html` e `.scss`; selo `.brand-stat-pending` em `src/scss/_stat-card.scss` (global, por causa do orçamento de 2kb por componente). |
| Tokens | Fundo em `--stat-bg` no `:host`: azul `linear-gradient(135deg, var(--brand-primary), var(--brand-primary-high))` (padrão, Triagent) ou, com `tone="petrol"` (classe `.tone-petrol` no host, Scalation), `linear-gradient(135deg, var(--brand-highlight-high), var(--brand-sidebar))`; texto do selo ativo em `--stat-accent`; texto `rgb(var(--cui-white-rgb))`; brilho `::after` com `radial-gradient(var(--brand-highlight), transparent 70%)` a opacidade .28; `border: 0`. |
| Conteúdo | Título com ícone (`cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`), valor (total de normas) com o selo `.brand-stat-pending` "N a classificar" (pílula branca translúcida: fundo `rgba(var(--cui-white-rgb), .16)`, borda `.28`, raio `var(--brand-radius-pill)`, 0,75rem/600); sem porcentagem; mini-gráfico de linha (`height="70"`). Com `[filterable]="false"` (Scalation) o selo é `<span>` sem interação; com filtro é botão: hover `.26`, foco com contorno branco 2px, ativo (`aria-pressed="true"`) invertido (fundo branco, texto `var(--brand-primary)`); card ativo `.is-filtered` com anel `var(--brand-highlight)` 2px + `--brand-elevation-2`; demais `.is-dimmed` (opacidade .5). |
| Faixa do filtro | `.segment-filter-notice` (`dashboard.component.scss`): fundo `var(--brand-primary-low)`, borda `rgba(var(--brand-primary-rgb), .25)`, raio `var(--brand-radius-sm)`, ícone `cilFilter` em `var(--brand-primary)`, botão `.filter-chip` "Remover filtro". |
| Estados | Sem hover. Escuro: `:host-context([data-theme="dark"]) .brand-stat-card` adiciona uma camada `linear-gradient(135deg, rgba(var(--cui-black-rgb), .16), rgba(var(--cui-black-rgb), .3))` sobre o gradiente, porque `--brand-primary` escuro é mais claro e o texto branco perderia contraste. |
| Orçamento | O `.scss` fica abaixo de 4 KB (ADR-009); usa `::ng-deep` só para `.fs-4` e a linha do título dentro do widget CoreUI. |

### 6.2.1 Menu lateral com subitens por seção

| Item | Valor |
|---|---|
| Estrutura | Título "Painéis" (`.nav-title`, .6875rem/600, 48% branco); grupos Triagent e Scalation com seta; subitens sem ícone em `.nav-group-items` (.8125rem/400). |
| Estados | Subitem ativo: fundo `rgba(white, .1)` + filete `--brand-highlight` à esquerda (mesmo do item ativo); grupo aberto: fundo `rgba(black, .18)`. Estilos em `_components.scss` (`.sidebar-nav`). |
| Alvo da rolagem | Seção para logo abaixo do header fixo + 16px (`stickyHeaderOffset`). |

### 6.2.2 Visão geral dos segmentos (`app-segment-overview`, Início)

| Item | Valor |
|---|---|
| Arquivos | `src/app/views/widgets/segment-overview/segment-overview.component.{html,ts,scss}` (`.scss` < 2 kB). |
| Estrutura | `<c-widget-stat-d class="segment-overview-card">` por segmento (`sm="6" xl="3"`): cabeçalho com `.segment-overview-head` (ícone `size="xl"` + `.segment-overview-name`) e minigráfico de 64 px de ponta a ponta; corpo com dois valores do CoreUI (número `fs-5` 600 tabular, rótulo maiúsculo `small text-medium-emphasis`): "normas" e "a classificar". |
| Cor do cabeçalho | `--segment-color` inline = `var(--app-series-1..4)` (mesma cor do segmento nos gráficos e legendas) sob `linear-gradient(rgba(var(--cui-black-rgb), .25), ...)`; texto e ícone `rgb(var(--cui-white-rgb))`. Contraste do branco com a camada: claro 11,06 / 5,45 / 6,61 / 5,69:1; escuro 7,78 / 5,45 / 4,90 / 5,69:1 (Atacado / Corporativo / Plataforma / Varejo). Sem a camada, Plataforma no escuro ficaria em 2,91:1. |
| Cabeçalho | `--cui-card-cap-padding-x/y: 0` (gráfico encosta nas bordas), `border-bottom: 0`; `.segment-overview-head` com `padding: 1.125rem 1.25rem .5rem` e `gap: .625rem`; nome 1.125rem 600 `-.01em`. |
| Minigráfico | Área: linha branca 60% de 2 px, preenchimento branco 12%, `tension .4`, sem pontos (hover 4 px), eixos ocultos, legenda desligada; tooltip HTML padrão do `c-chart`. Branco lido de `--cui-white-rgb`. |
| Escuro | Automático: `--app-series-*` escuras (`#4d61e0`, `#1099bc`, `#2fae2f`, `#ae6ae6`) com a mesma camada; corpo em `--cui-card-bg`. |
| Acessibilidade | Nome do segmento em texto; ícone `aria-hidden`; canvas com texto alternativo "Tendência de normas de <segmento>". |

### 6.3 Chips de filtro (`.filter-bar`, `.filter-chip`, `.filter-date`)

| Item | Valor |
|---|---|
| Arquivo | `src/scss/_filter-chips.scss` (global, compartilhado por Normativos Recebidos e Cascata; não renomear as classes). |
| `.filter-bar` | `display: flex; flex-wrap: wrap; align-items: center; gap: .5rem`. |
| `.filter-chip` repouso | `min-height: 2rem`, padding `.25rem .875rem`, `.8125rem` 500, cor `--brand-content-low`, fundo `--brand-surface-card`, borda `1px solid var(--brand-border)`, raio `--brand-radius-pill`; ícone `.875rem`. |
| Hover | Cor `--brand-content-high`, fundo `--brand-surface-mid`, borda `--brand-content-disabled`. |
| Foco | `:focus-visible` → `outline: 2px solid var(--brand-primary); outline-offset: 2px`. |
| Ativo `.is-active` | Peso 600, cor `--brand-primary`, fundo `--brand-primary-low`, borda `--brand-primary`; hover em `--brand-primary-high`. |
| Desabilitado | Cor `--brand-content-disabled`, fundo transparente, `cursor: not-allowed`. |
| Escuro (`[data-theme="dark"] .filter-chip`) | Fundo transparente em repouso; hover com borda `--brand-content-low`; ativo com cor `--brand-primary-high`, fundo `--brand-primary-low`, borda `rgba(var(--brand-primary-rgb), .7)`. |
| `.filter-date` | Rótulo + `<input type="date">` na mesma linha; input com `min-height: 2rem`, `.8125rem`, raio pílula. |
| Uso | `period-filter.component.html` (chips "Últimos N", "Personalizado", "Aplicar", "Cancelar"), `waterfall-chart.component.html` (R$ / % da receita; Gráfico / Tabela). |

### 6.4 Seletor segmentado (`.brand-segmented`)

| Item | Valor |
|---|---|
| Arquivo | `src/scss/_components.scss`. |
| Estrutura | `<c-button-group class="brand-segmented">` com botões `cButton color="secondary" variant="outline"` e `[active]`. Usado para Dia / Mês / Ano em `period-filter.component.html`. |
| Trilho | `display: inline-flex; gap: .125rem; padding: .25rem; background: var(--brand-surface-mid); border-radius: var(--brand-radius-pill)`. |
| Botão repouso | `min-width: 3.25rem`, padding `.3125rem .875rem`, `.8125rem` 500, cor `--brand-content-low`, fundo transparente, sem borda, raio pílula. |
| Hover | Cor `--brand-content-high`, fundo `rgba(var(--brand-primary-rgb), .08)`. |
| Ativo (`.btn.active` ou `.btn-check:checked + .btn`) | Texto `rgb(var(--cui-white-rgb))`, fundo `--brand-primary`, sombra `--brand-elevation-1`. |
| Foco | `.btn-check:focus-visible + .btn` e `.btn:focus-visible` (regra geral de `.btn`) → outline 2px `--brand-primary`, offset 2px. |
| Escuro | Automático: `--brand-surface-mid` `#1f2733`, `--brand-primary` `#6b7cf0`. |

### 6.4.1 Tabela e exportação do gráfico Normativos Recebidos (`.traffic-table`, `.traffic-export`)

| Item | Valor |
|---|---|
| Arquivo | `src/app/views/dashboard/dashboard.component.scss`. |
| Tabela | `cTable` pequena com hover; chave de cor da série no cabeçalho (`.traffic-legend-key`, tracejada para "Normas a Classificar"); colunas `.is-dimmed` (opacidade .45) seguem o destaque da legenda e o filtro por segmento; rodapé "Total" com borda superior 2px `var(--brand-border)`; números `tabular-nums`; rola dentro do card no celular (`.table-responsive`). |
| Botão | `cButton color="primary" size="sm"` + `.traffic-export` (pílula `var(--brand-radius-pill)`, ícone `cilSpreadsheet`); só na visão Tabela; desabilitado com "Gerando arquivo..." durante a geração. |
| Planilha | Cabeçalho com fundo `--app-export-accent` e texto branco; subtítulo e filete dos totais em `--app-export-muted`. Os dois tokens não têm valor escuro: a planilha sai igual nos dois temas (antes lia `--brand-primary`/`--brand-content-low` do tema ativo e, no escuro, saía com cabeçalho `#6b7cf0` e subtítulo `#a9b1bd`). |

### 6.5 Botão de ícone (`.brand-icon-btn`)

| Item | Valor |
|---|---|
| Arquivo | `src/scss/_components.scss`. |
| Estrutura | `<button cButton class="brand-icon-btn" color="primary" aria-label="..." title="...">` com `<svg cIcon aria-hidden="true">`. Sem uso no momento (o botão de download do gráfico Normativos Recebidos foi substituído por "Exportar Excel"); classe mantida para botões só com ícone. |
| Medidas | `2.5rem × 2.5rem`, `padding: 0`, raio `--brand-radius-sm`; ícone `1.125rem`. |
| Estados | Herdados de `.btn-primary` do CoreUI (hover/active via `$primary`); no escuro, `.btn-primary` recebe `--cui-btn-bg: #6b7cf0` e hover `#8491f3` em `_theme-dark.scss`. Foco: regra geral `.btn:focus-visible`. |

### 6.5.1 Card de e-mails (`app-emails-chart`)

| Item | Valor |
|---|---|
| Arquivos | `src/app/views/dashboard/emails/emails-chart.component.scss` (cabeçalho, indicadores, gráfico, tabela) e `src/scss/_emails-card.scss` (legenda, lista "Últimos e-mails" e tabela de normas, global por causa do orçamento de 2kb por componente). Só tokens `--brand-*`/`--app-*`/`--cui-*`. |
| Gráfico | Barras empilhadas, uma cor por segmento (`--app-series-1..4`, as mesmas do gráfico Normativos Recebidos); `barPercentage .7`, máximo 56px; 2px de superfície entre segmentos (`borderColor` = `--cui-card-bg` em cima e embaixo); 4px de raio só no topo da pilha; eixo y oculto com grade discreta; total acima da barra em `--brand-content-high` 12px/600 (some se não couber, ex.: 92 dias). Destaque da legenda: demais segmentos a 28% de opacidade. |
| Indicadores | `dl.emails-stats`: rótulo `--brand-content-low` .8125rem, valor 1.5rem/600 `tabular-nums`, nota "N distintas" .75rem. Duas por linha abaixo de 576px. |
| Legenda | Abaixo do gráfico (ou da tabela), centralizada, `margin-top .75rem`. `button.emails-legend-item`: igual ao item da legenda do gráfico Normativos Recebidos (hover `--brand-surface-mid`, `.is-active` `--brand-primary-low`, `.is-dimmed` opacidade .45, foco 2px `--brand-primary`); chave quadrada de .75rem na cor do segmento. |
| Lista | Linha em grade (data `dd/mm/aaaa`, segmento com chave de cor, normas), `aria-expanded` + `aria-controls`, seta `cilChevronRight` que gira 90°; abaixo de 576px a primeira linha tem data e normas e o segmento passa para baixo da data (`grid-template-areas`); movimento reduzido sem transição. |
| Normas do e-mail | `.emails-normas`: região rolável na horizontal (`role="region"`, `tabindex="0"`, foco 2px `--brand-primary`), borda 1px `--brand-border`, raio `--brand-radius-sm`, barra fina (`scrollbar-width: thin`, polegar `--brand-surface-high`). `.emails-normas-table`: 7 colunas, `min-width 56rem`, .8125rem, células sem quebra (Tema quebra entre 14 e 18rem), cabeçalho `--brand-surface-mid` 600 `--brand-content-low`, coluna Órgão fixa (`position: sticky`, fundo `--cui-card-bg`, filete à direita) para a linha seguir identificável ao rolar. Cabe sem rolagem a 1440px; rola no celular. |
| Tabela | `.emails-table`: números `tabular-nums`, rodapé "Total" com borda superior 2px `--brand-border`, colunas `.is-dimmed` seguem o destaque. |

### 6.5.2 Cards de classificação (`app-applicability-chart`, `app-themes-list`)

| Item | Valor |
|---|---|
| Arquivos | `src/scss/_classification-card.scss` (global; os componentes não têm `.scss` próprio). Só tokens. |
| Layout | Dois cards separados em `<c-row class="mb-4 g-4">`: pizza em `lg="5"`, temas em `lg="7"`, ambos `h-100`; empilhados abaixo de 992px. Sem filtro próprio: subtítulo = período do gráfico Normativos Recebidos (+ "· <segmento>" com o filtro da página). |
| Pizza | `<c-chart type="doughnut">` 220px, `cutout 62%`, fatias `--app-applicable` / `--app-not-applicable` (lidas do CSS a cada troca de tema), 2px de borda na cor do card entre as fatias, sem legenda do Chart.js; tooltip "Aplicáveis: 368 (64%)". Centro `.applicability-center`: total 1.75rem/600 + "classificadas" .8125rem. Legenda `dl.applicability-legend` centralizada: chave .75rem, rótulo .8125rem, valor 1.25rem/600 `tabular-nums` e % .875rem `--brand-content-low`. `role="img"` com `aria-label` completo. |
| Temas | `ol.theme-bars` (margem superior 1.25rem), linha em grade rótulo (até 17rem, reticências + `title`) · trilho (barra .5rem, ponta direita 4px, cor `--app-applicable`, mínimo 1.5% visível) · valor (6.5rem, quantidade 600 + % `--brand-content-low`). "Outros temas (N temas)": linha só de texto, filete superior `--brand-border`, texto `--brand-content-low`. Abaixo de 576px o nome do tema vai para a linha de cima. |
| Filtro cruzado | Itens da legenda (`.applicability-legend-item`) e linhas de tema (`button.theme-row`) são botões com os estados do item de legenda do gráfico Normativos Recebidos: hover `--brand-surface-mid`, `.is-active` fundo `--brand-primary-low` e borda `rgba(var(--brand-primary-rgb), .35)`, `.is-dimmed` opacidade .45, foco 2px `--brand-primary`, raio `--brand-radius-sm`; `aria-pressed`. Pizza: fatia escolhida deslocada 10px (com `layout.padding` 10), a outra a 16% de opacidade (a 28% o azul-marinho esmaecido ficava parecido com o cinza); cursor de mão só sobre as fatias. Com "Não aplicáveis" escolhido, as barras de tema usam `--app-not-applicable`. Faixa acima dos cards: `.segment-filter-notice`. |
| Estados | Carregando (spinner), erro, "Nenhuma norma classificada neste período." (pizza) e "Nenhuma norma aplicável/não aplicável neste período." (temas). |

### 6.5.3 Tabela Analítica (`app-analytic-table`)

| Item | Valor |
|---|---|
| Arquivos | `src/scss/_analytic-table.scss` (global). Só tokens. |
| Cabeçalho | Título + subtítulo (período · N normas) à esquerda; "Exportar Excel" (`btn-outline-primary btn-sm`, pílula, ícone `cilSpreadsheet`) à direita. Linha "Filtros aplicados:" com pílulas `.analytic-filter` (texto `--brand-primary` 500, fundo `--brand-primary-low`, raio pílula) ou "Sem filtros: ...". |
| Tabela | `.analytic-scroll`: rolagem lateral, borda 1px `--brand-border`, raio `--brand-radius-sm`, barra fina (`--brand-surface-high`), região focável. `.analytic-table`: `min-width 64rem`, .8125rem, sem quebra (Tema quebra entre 16 e 22rem), datas e números `tabular-nums`, hover de linha do `cTable`. Cabeçalho `--brand-surface-mid`; cada `th` é um botão `.analytic-sort` (600, `--brand-content-low`, ativo/hover `--brand-content-high`, seta `cilArrowTop`/`cilArrowBottom` só na coluna ordenada ou no hover, foco 2px `--brand-primary`). |
| Paginação | `.analytic-pager`: "1–15 de 573" à esquerda; "Anterior" · "Página N de M" · "Próxima" (`.filter-chip`, desabilitado a 45%). |

### 6.6 Legenda do gráfico Normativos Recebidos

| Item | Valor |
|---|---|
| Arquivo | `src/app/views/dashboard/dashboard.component.scss` e `.html` (rodapé do card). |
| Estrutura | `<c-row role="group" aria-label="Legenda do gráfico Normativos Recebidos...">`, um `<button class="traffic-legend-item">` por série com `.traffic-legend-key` (traço de 1rem com `border-top: 3px solid` na cor da série; `--dashed` para a referência), rótulo, `<strong>` "N normas (x%)" e `.progress.progress-thin` com `.progress-bar` na cor da série. |
| Repouso | Coluna flex, padding `.5rem .625rem`, cor `--brand-content-high`, borda transparente, raio `--brand-radius-sm`. |
| Hover | Fundo `--brand-surface-mid`. |
| Ativo `.is-active` | Fundo `--brand-primary-low`, borda `rgba(var(--brand-primary-rgb), .35)`. |
| Esmaecido `.is-dimmed` | `opacity: .45` (séries não destacadas; "Normas a Classificar" permanece ativa quando um segmento está selecionado). |
| Foco | `:focus-visible` → outline 2px `--brand-primary`, offset 2px. |
| `.progress-thin` | `_components.scss`: 4px, raio pílula, trilho `--brand-surface-mid`. |
| Comportamento | Clique destaca a série (`toggleHighlight`), segundo clique mostra todas. |

### 6.7 Legenda da Cascata

`waterfall-chart.component.scss`: `.waterfall-legend` (lista inline, `.875rem`, `--cui-body-color`), `.waterfall-swatch` (`.75rem`, raio 2px, cor do passo 2 da rampa) e `.waterfall-connector` (`1rem`, `border-top: 1px solid var(--app-wf-connector)`). Sem estados interativos.

### 6.8 Menu lateral

| Item | Valor |
|---|---|
| Arquivos | `_variables.scss` (`$sidebar-bg: $brand-navy`, `$sidebar-brand-bg: $brand-navy-deep`, `$sidebar-nav-link-color: rgba(255,255,255,.72)`, `$sidebar-nav-link-active-bg: rgba(255,255,255,.1)`, `$sidebar-nav-group-bg: rgba(0,0,0,.18)`), `_components.scss` (`.sidebar`, `.sidebar-brand`, `.sidebar .sidebar-nav`: no CoreUI 5 as variáveis `--cui-sidebar-nav-*` são declaradas em `.sidebar-nav` e só valem sobrescritas ali), `_theme-dark.scss` (`.sidebar { --cui-sidebar-bg: #0c1238; --cui-sidebar-brand-bg: #080d2b }`), `_scrollbar.scss` (polegar `rgba(var(--cui-white-rgb), .22)`). |
| Itens | `.nav-link` `.875rem` 500, altura 39 px (`--cui-sidebar-nav-link-padding-y: .5625rem`), raio `--brand-radius-sm`; ícone `.nav-icon` 1.25rem × 1.125rem na margem esquerda do link (posição do CoreUI 4, `margin-left` negativo), opacidade .72 → 1 em hover/ativo; cor de ícone ativo `--brand-highlight`. `<c-sidebar colorScheme="dark">` e rolagem por `<ng-scrollbar>`. |
| Ativo | Fundo `rgba(var(--cui-white-rgb), .1)` e filete `::before` de 3px × 1.25rem em `--brand-highlight` na borda esquerda (anima `opacity` e `scaleY`). |
| Hover | `rgba(var(--cui-white-rgb), .06)`. |
| Foco | `outline: 2px solid var(--brand-highlight); outline-offset: -2px`. |
| Selos | Itens do menu sem selo ("NOVO" removido em 2026-10-28); `.nav-link .badge` sem estilo próprio. |
| Marca | `.sidebar-brand` em faixa de 4rem (`flex: 0 0 4rem`, fundo `--cui-sidebar-brand-bg`, cor `$sidebar-brand-color` branco .87; o CoreUI 5 tirou essa caixa e o projeto a repõe), alinhado à esquerda com `padding: 0 1.125rem` e borda inferior `rgba(var(--cui-white-rgb), .08)`. Sem botão de recolher no rodapé da sidebar nem modo estreito. |

### 6.9 Header

| Item | Valor |
|---|---|
| Arquivos | `_variables.scss` (`$header-bg: $brand-surface-card`, `$header-border-color: $brand-border`), `_components.scss` (`.header`), `_theme-dark.scss` (`.header { --cui-header-* }`), `default-header.component.html`. |
| Base | `--cui-header-padding-y: .5rem`, `-x: 1rem`, borda inferior `--brand-border`, sem sombra. Alturas do CoreUI 4 repostas (o 5 não tem mínimo): linha de cima 4rem, linha do breadcrumb 3rem (`min-height` menos o padding, em `_components.scss`); header total 106 px. |
| `.header-toggler` | Cor `--brand-content-low`, raio `--brand-radius-sm`; hover `--brand-content-high` sobre `--brand-surface-mid`; foco outline `--brand-primary`. |
| `.header-date` | Data atual (`<time>`), `.875rem` 500, `--brand-content-low`, tabular. |
| `.theme-toggle` | Botão redondo `2.25rem`, cor `--brand-content-low`; hover e `.show` em `--brand-primary` sobre `--brand-primary-low`; foco outline `--brand-primary`, offset 2px. |
| Dropdown | `min-width: 11rem`, padding `.375rem`, borda `--brand-border`, raio `--brand-radius-sm`, sombra `--brand-elevation-2`; `.dropdown-item` raio `--brand-radius-xs`, ativo em `--brand-primary` sobre `--brand-primary-low`. |
| Breadcrumb | `<c-breadcrumb-router>` abaixo do divisor; estilos em `_typography.scss`. |

### 6.10 Rodapé

`_variables.scss` (`$footer-bg: $brand-navy`, `$footer-border-color: $brand-navy`, `$footer-color: rgba(255,255,255,.72)`), `_components.scss` (`.footer`: `.8125rem`), `_theme-dark.scss` (`.footer { --cui-footer-bg/border-color: #0c1238; --cui-footer-color: rgba(255,255,255,.72) }`). Faixa azul-marinho como a sidebar, no estilo do rodapé do site institucional e mais enxuta. Conteúdo em `default-footer.component.*`: `.footer-logo` (logotipo branco da instituição, `alt` "Logotipo da instituição", 2,5rem de altura) e `.footer-legal` (`.75rem`, entrelinha 1,5; "Copyright © {ano} todos os direitos reservados" e, só quando `FOOTER_ENTITIES` não está vazia (dados da configuração de ambiente), por entidade, nome e CNPJ em `strong` branco, endereço em `rgba(255,255,255,.72)`); padding `1.25rem 1.5rem`; logo acima e dados abaixo, tudo centralizado (`text-align: center`, `max-width: 60rem`). Sem selos de segurança nem links.

### 6.11 Outros

- Botões: `.btn { --cui-btn-border-radius: var(--brand-radius-sm); --cui-btn-font-weight: 500 }`, `:focus-visible` com outline `--brand-primary` e `box-shadow: none`.
- Inputs: `.form-control`, `.form-select` com raio `--brand-radius-sm`; foco com borda `--brand-primary` e `box-shadow: 0 0 0 .25rem rgba(var(--brand-primary-rgb), .2)`.
- Barra de rolagem: `_scrollbar.scss`, fina, polegar `--brand-content-disabled`, hover `--brand-content-low`.
- Tooltip Chart.js externo: `_charts.scss` (`.chartjs-tooltip` com `--app-chart-tooltip-*`, raio `--brand-radius-sm`, sombra `--brand-elevation-2`).
- Fundo da página: `.wrapper.bg-light { background-color: var(--brand-surface-page) !important }` em `_layout.scss`.

## 7. Acessibilidade

### 7.1 Contrastes conferidos (WCAG 2.x, razão de luminância)

Calculados em 2026-10-28 a partir dos valores das tabelas acima. Metas: 4,5:1 para texto normal, 3:1 para texto grande, componentes de interface e marcas de gráfico.

| Par | Cores | Razão | Situação |
|---|---|---|---|
| Primário sobre card (texto, chip ativo, links) | `#223ad2` / `#ffffff` | 8,06:1 | OK |
| Branco sobre primário (botão primário, segmentado ativo) | `#ffffff` / `#223ad2` | 8,06:1 | OK |
| Primário sobre `primary-low` (chip ativo) | `#223ad2` / `#edeffc` | 7,05:1 | OK |
| Texto principal sobre card | `#20262c` / `#ffffff` | 15,27:1 | OK |
| Texto principal sobre página | `#20262c` / `#f3f5f7` | 13,97:1 | OK |
| Texto secundário sobre card | `#4b5968` / `#ffffff` | 7,17:1 | OK |
| Texto secundário sobre página | `#4b5968` / `#f3f5f7` | 6,56:1 | OK |
| Texto secundário sobre `surface-mid` (segmentado em repouso) | `#4b5968` / `#eaedf0` | 6,10:1 | OK |
| Sucesso (texto) sobre branco | `#288f28` / `#ffffff` | 4,16:1 | OK para texto grande e componentes; usar `--brand-success` e não `--brand-success-pure` (2,42:1) em texto |
| Alerta sobre branco | `#ff6600` / `#ffffff` | 2,94:1 | Só preenchimento; texto de alerta usa `--brand-warning-dark` (`#b84900`, 5,26:1) |
| Erro sobre branco | `#dc1832` / `#ffffff` | 4,98:1 | OK |
| Informação (`$info`) sobre branco | `#1099bc` / `#ffffff` | 3,33:1 | OK para componentes e marcas; não usar como texto pequeno |
| Desabilitado sobre card | `#a7b2be` / `#ffffff` | 2,15:1 | Decorativo/desabilitado apenas |
| Branco sobre menu lateral | `#ffffff` / `#0e1650` | 16,81:1 | OK (itens usam alfa .72 em repouso) |
| Destaque sobre menu lateral (filete, ícone ativo) | `#31c7ed` / `#0e1650` | 8,42:1 | OK |
| Escuro: primário sobre card | `#6b7cf0` / `#171e28` | 4,60:1 | OK |
| Escuro: primário sobre página | `#6b7cf0` / `#0f1319` | 5,11:1 | OK |
| Escuro: `primary-high` sobre card (chip ativo) | `#8491f3` / `#171e28` | 5,85:1 | OK |
| Escuro: link sobre card | `#8c9ae8` / `#171e28` | 6,31:1 | OK |
| Escuro: branco sobre primário (botão) | `#ffffff` / `#6b7cf0` | 3,64:1 | OK para texto de botão (peso 500, ≥ 14px); abaixo de 4,5:1 |
| Escuro: texto principal sobre card | `#eef1f5` / `#171e28` | 14,80:1 | OK |
| Escuro: texto secundário sobre card | `#a9b1bd` / `#171e28` | 7,75:1 | OK |
| Escuro: texto secundário sobre `surface-mid` | `#a9b1bd` / `#1f2733` | 6,95:1 | OK |
| Escuro: sucesso / alerta / erro / informação sobre card | `#36bf36` 6,91:1 · `#ff8a3d` 7,15:1 · `#f0566b` 4,99:1 · `#31c7ed` 8,40:1 | — | OK |
| Escuro: branco sobre menu lateral | `#ffffff` / `#0c1238` | 18,12:1 | OK |

Séries e rampas de gráficos: ver 4.2 e 4.3.

### 7.2 Foco visível

Todos os controles interativos próprios têm `:focus-visible` explícito com `outline: 2px solid` e `outline-offset: 2px` (interno `-2px` na sidebar), sem depender do `box-shadow` do CoreUI: `.btn`, `.filter-chip`, `.brand-segmented .btn-check:focus-visible + .btn`, `.theme-toggle`, `.header-toggler`, `.sidebar-nav .nav-link` (cor `--brand-highlight`), `.traffic-legend-item`. Inputs mantêm o anel `rgba(var(--brand-primary-rgb), .2)` de `.25rem`.

### 7.3 Semântica e ARIA

| Onde | O que |
|---|---|
| `period-filter.component.html` | Contêiner `role="group"` com `aria-label` configurável (`label`, ex.: "Período dos normativos recebidos", "Período da cascata"); `<c-button-group role="group" aria-label="Granularidade do período">`; `aria-pressed` em cada botão/chip; "Personalizado" com `aria-expanded` e `aria-controls` apontando para o `<form id="{id}-custom-range">`; aviso de intervalo em `role="status"`; erro de validação em `role="alert"`; `<form aria-label="Intervalo de datas personalizado" novalidate>`; `<label class="filter-date">` envolvendo cada `<input type="date">`. |
| `dashboard.component.html` (Normativos Recebidos) | `<h4 id="traffic">`; botão de download com `aria-label` e `title`, ícone `aria-hidden`; legenda em `role="group"` com instrução no `aria-label`; cada item é `<button>` com `aria-pressed` e `title` dinâmico ("Destacar X no gráfico" / "Mostrar todas as séries"); barra com `role="progressbar"`, `aria-valuenow/min/max` e `aria-label="Participação de X"`; chaves de cor `aria-hidden`. |
| `waterfall-chart.component.html` (Cascata) | `<c-card aria-labelledby="waterfall-title">`; grupos de chips com `role="group"` e `aria-label` ("Unidade dos valores", "Forma de exibição") e `aria-pressed`; gráfico em `<div role="img" [attr.aria-label]="ariaSummary">` com resumo textual das etapas; `<ul class="waterfall-legend" aria-label="Legenda">`; tabela com `<caption class="visually-hidden">`, `scope="col"` e `scope="rowgroup"`; erro em `role="alert"`; spinner com `label="Carregando..."`. |
| `default-header.component.html` | Toggler com `ariaLabel`/`title` "Alternar menu lateral"; botão de tema com `aria-label`/`title` "Alterar tema"; data em `<time [attr.datetime]>` com `title` com a data longa. |
| `default-layout.component.html` | Marca como link com `aria-label="Agenda Normativa, ir para o início"`; símbolo com `alt=""`/`aria-hidden` (decorativo, o nome é texto). |
| `widgets-dropdown.component.html` | Ícones de segmento `aria-hidden`. |
| `src/index.html` | `<html lang="pt-BR">`, `<noscript>` em pt-BR. |
| `home.component.html` | `<h1 class="visually-hidden">Início</h1>`. |

### 7.4 Movimento reduzido

`src/scss/_components.scss` desliga as transições decorativas sob `@media (prefers-reduced-motion: reduce)` para `.sidebar-nav .nav-link`, `.sidebar-nav .nav-link::before`, `.brand-segmented > .btn`, `.theme-toggle` e `.filter-chip`. Transições restantes são de 0,15–0,2 s e só em cor/fundo/borda.

### 7.5 Pendências conhecidas

- Telas herdadas do template (Base, Botões, Formulários, Gráficos, Ícones, Notificações, Widgets, Páginas) não passaram por auditoria de contraste; servem de catálogo e podem sair do produto final.
- `#ffffff` sobre `#6b7cf0` (botão primário no escuro) fica em 3,64:1: adequado para rótulos de botão, insuficiente para texto corrido.

## 8. Marca

- Nome do produto: "Agenda Normativa" (`<title>` em `src/index.html`, `AppComponent.title`, rodapé, criador das planilhas). Na sidebar,
  "Agenda" em Inter 400 e "Normativa" em Inter 700, 1,0625rem, branco, `letter-spacing -.01em` (`.brand-name` em `_components.scss`).
- Símbolo: o oficial da instituição, copiado do SVG público do site institucional (dois `path`), sem alteração de desenho;
  `viewBox` recortado ao desenho para ficar na altura do nome (1,75rem). Arquivos: `src/assets/img/brand/brand-mark-white.svg` (sidebar navy) e
  `brand-mark.svg` (azul `#002bab`), mais `src/assets/favicon.svg` (símbolo branco sobre tile `#002bab`, raio 9). São SVG estáticos e os
  únicos com cor fixa fora dos tokens. Decisão do usuário em 2026-10-28 (ADR-018).
- Sidebar sempre larga (sem `<c-sidebar-toggler>` nem modo estreito), então símbolo e nome aparecem juntos. Foco do link da marca: contorno 2px `--brand-highlight`.
- A fonte de títulos da marca continua fora: é proprietária e não está empacotada.
- Nenhum logo, nome ou link do CoreUI aparece na interface (R8, ADR-007). O `LICENSE` MIT do template permanece na raiz por exigência da licença.

## Agente da Agenda (chat flutuante) — `src/scss/_chat-widget.scss`

Estilos globais do botão `.chat-fab` e do painel `.chat-panel` (ADR-009: CSS de componente ≤ 4 kB). Só variáveis, nos dois temas.

| Elemento | Tokens |
|---|---|
| Botão `.chat-fab` | 52 px de altura, largura pelo conteúdo: ícone `cilCommentSquare` + nome `.chat-fab__name` ("Agente da **Agenda**": 14 px, "Agente da" regular e "Agenda" em 700, como a marca "Agenda **Normativa**"); `--app-chat-accent` (hover escurece 8%), texto e ícone `rgb(var(--cui-white-rgb))`, `--brand-elevation-2`; forma de balão assimétrica: `--brand-radius-pill` em três cantos e `--brand-radius-xs` no inferior direito (aponta para o canto da tela); canto inferior direito (`1.5rem`) |
| Painel `.chat-panel` | 380 × até 600 px (`min(37.5rem, 100vh − 7.5rem)`), fundo `--brand-surface-card`, texto `--brand-content-high`, borda `--brand-border`, `--brand-radius-lg`, `--brand-elevation-3`; abre 5,5 rem acima do botão |
| Cabeçalho | `--app-chat-accent` com texto branco; "Recomeçar" (texto, 13 px; desabilitado com 55% de opacidade até haver interação), "Expandir/Reduzir" (`cilResizeWidth`/`cilFullscreenExit`) e "Minimizar" (`cilMinus`), botões de 44 × 44 px (`.chat-panel__icon`) |
| Expandido (`.chat-panel--wide`) | largura `min(46rem, 100vw − 3rem)` (antes 380 px), mesma altura; bolhas com até 78% da largura; transição de largura de 0,2 s (sem ela com `prefers-reduced-motion`) |
| Indicador (`.chat-fab__dot`) | bolinha de 14 px em `--brand-success-pure` com borda `--brand-surface-card`, no canto do botão quando o painel está minimizado e há conversa |
| Foco visível | `outline` de 2 px em `--brand-highlight` |
| Camadas | botão `z-index` 1035 e painel 1036: acima da sidebar (1030), abaixo de modais (1055) |
| Abaixo de 576 px | painel em tela cheia (`inset: 0`, sem raio), "Expandir" oculto e botão flutuante oculto enquanto aberto |
| Movimento e impressão | `prefers-reduced-motion` remove transição e animação; oculto na impressão |

Lista de mensagens (P3), em `.chat-log` (rolável, `role="log"`):

| Elemento | Estilo |
|---|---|
| Bolha do agente (`.chat-msg--ai`) | fundo `--brand-surface-mid`, texto `--brand-content-high`, `--brand-radius-md` (canto inferior esquerdo `--brand-radius-xs`) |
| Bolha do usuário (`.chat-msg--user`) | fundo `--app-chat-accent`, texto branco, à direita |
| Mensagem do sistema (`.chat-msg--system`) | centralizada, texto pequeno `--brand-content-low`, sem fundo |
| Status | `answer` filete verde `--brand-success`; `need_more_info` ciano `--brand-highlight-dark`; `out_of_scope` e `not_in_data` laranja `--brand-warning`; `error` fundo `--brand-danger-low` e filete `--brand-danger` (o status nunca é só cor: o texto da mensagem o diz) |
| Blocos (`.chat-msg__block`) | "Fontes", "Para continuar, preciso saber:" e "Fale com a equipe responsável", título em caixa alta 12 px, separados por borda `--brand-border`; e-mail do contato como `mailto:` na cor `--cui-link-color` |
| Feedback (`.chat-feedback`) | no fim da bolha, separado por borda `--brand-border`, **em uma linha**: a pergunta (12 px, `--brand-content-low`) ocupa o espaço que sobra (quebra em duas linhas antes de empurrar os botões; mínimo de 96 px) e dois botões compactos de 28 px (`.chat-feedback__button`, ícones de 14 px `cilThumbUp`/`cilThumbDown`, 12 px, texto `--brand-content-high` sobre `--brand-surface-card`, hover com borda `--brand-primary`); depois da nota, só o agradecimento; erro em `--brand-danger` |
| Sugestões (`.chat-suggestions`, `.chat-chip`) | pílulas de 36 px depois da última mensagem, alinhadas à esquerda e quebrando linha: opção do passo e "Recomeçar" com texto e borda `--brand-primary` (hover `--brand-primary-low`); "Voltar" (`.chat-chip--back`) com `cilChevronLeft`, texto `--brand-content-low` e borda `--brand-border`; "Encerrar" (`.chat-chip--end`) logo à direita, mesmo estilo discreto, sem ícone |
| "Digitando" (`.chat-dot`) | três pontos `--brand-content-low`; sem animação com `prefers-reduced-motion` |
| "Ir para o fim" (`.chat-scroll-end`) | pílula `--brand-surface-card` com borda e `--brand-elevation-1`, aparece quando o usuário rola para cima |

Área de entrada (P4), `.chat-input`, com borda superior `--brand-border`; só aparece em passos de texto ou de envio de documento:

| Elemento | Estilo |
|---|---|
| Anexar / tentar novamente (`.chat-option`) | pílula de 44 px, texto e borda `--brand-primary` sobre `--brand-surface-card`, hover `--brand-primary-low`, desabilitada em `--brand-content-disabled` |
| Campo (`.chat-compose__text`) | `textarea` de 1 a 5 linhas (até 120 px), `--brand-radius-md`, borda `--brand-border`; foco com borda `--brand-primary` e anel igual ao dos formulários |
| Enviar / Parar (`.chat-send`) | círculo de 44 px em `--app-chat-accent` com ícone branco; desabilitado em `--brand-surface-high`; "Parar" usa um quadrado CSS (`.chat-stop-icon`) |
| Contador (`.chat-count`) | 11 px, `--brand-content-low`, alinhado à direita; no limite vira negrito `--brand-danger` |
| Dica e erro (`.chat-input__hint`, `.chat-input__error`) | 12 px; erro em `--brand-danger`, anunciado por `role="alert"` |

Verificação do P7 (Chrome headless, 2026-10-28): 1440 px e 768 px (normal e expandido) e 375 px em iframe (o headless tem largura mínima de 500 px), nos dois temas. Contraste medido no navegador (cores computadas, `opacity` incluída): 20 pares, todos acima de 4,5:1 para texto e 3:1 para ícones nos dois temas; menor valor 4,6:1 (opção sobre o fundo do painel no escuro). Estados desabilitados ficam fora da exigência. O primeiro ensaio achou `.chat-msg__source-id` em 3,91:1 (claro) por causa de `opacity: .8`; a opacidade saiu dele e do metadado do arquivo. Alterou `_brand.scss` e `_theme-dark.scss` (token `--app-chat-accent`); `_variables.scss` não mudou. Contraste das bolhas do agente e dos demais estados no P7.
