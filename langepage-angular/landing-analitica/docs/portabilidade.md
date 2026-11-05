# Portabilidade — playbook do porte para o ambiente corporativo

Este documento guia a cópia do projeto `landing-analitica` para outro ambiente (repositório corporativo,
registry Nexus, build no pipeline) e a adaptação com dados reais, feita por outra IA (Cursor) sem acesso à
sessão que construiu o projeto. Leia com `AGENTS.md` e `.rules/projeto.md` (regras) ao lado; em caso de conflito, as regras vencem.

Base de comparação em todo o documento: commit `36966f6` = CoreUI Free Angular Admin Template v4.3.13 original. Desde
2026-11-03 o projeto roda em Node 22, Angular 20.3 e CoreUI 5.5 (migração, ADR-021); a infraestrutura segue o template v5.5.
O que difere dele é do projeto; a lista exata e sempre atual está em `docs/inventario.md` (`npm run docs:inventory`).

Artefato irmão: a pasta `../frontend-template-angular` é um snapshot do commit inicial deste projeto mais o tema
claro/escuro, sem as demais evoluções. Serve como **template-base alternativo** para um painel novo; **não** é a fonte
deste porte — copie deste repositório (`landing-analitica`).

---

## 1. Pré-requisitos no destino

| Item | Exigência | Como verificar |
|---|---|---|
| Node.js | 22.x, `^22.12.0` (`engines` em `package.json`, `.nvmrc`). Angular 20 aceita `^20.19 \|\| ^22.12 \|\| ^24` | `node -v` |
| npm | `>= 10.9.4` (recomendado `^11.10.1`), apontando para o **registry Nexus** corporativo pela variável `NPM_REGISTRY` (lida pelo `.npmrc` versionado, 4.1). Nunca assumir o npm público | `npm config get registry` dentro do projeto |
| Angular CLI | Não instalar global; usar a CLI local (`npx ng ...`) | `npx ng version` após `npm ci` |
| Navegador para testes | Chrome/Chromium disponível no runner (Karma usa `ChromeHeadless`) | `which google-chrome` ou `CHROME_BIN` |
| Git | Para `npm run docs:inventory` (usa `git diff` contra `36966f6`); se o destino não tiver esse commit no histórico, ver seção 4.14 | `git log --oneline \| grep 36966f6` |

### 1.1 Pacotes necessários (versões exatas de `package.json`)

Todas as versões abaixo precisam existir no Nexus. Angular/TypeScript/CLI estão **cravados** (sem `^`/`~`) de propósito (R1).

| Pacote | Versão | Papel |
|---|---|---|
| `@angular/animations`, `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/language-service`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/router` | `20.3.14` | Framework |
| `@angular/cdk` | `20.2.14` | Peer do CoreUI |
| `@angular/compiler-cli`, `@angular/localize` (dev) | `20.3.14` | Compilação |
| `@angular/cli`, `@angular/build` (dev) | `20.3.12` | CLI e builder (esbuild) |
| `typescript` (dev) | `5.9.3` | Angular 20 exige `>=5.8 <6.0` |
| `rxjs` | `7.8.2` | Reativo |
| `zone.js` | `0.15.1` | Change detection |
| `tslib` | `2.8.1` | Helpers TS |
| `@coreui/angular`, `@coreui/angular-chartjs`, `@coreui/icons-angular` | `5.5.24` | Componentes CoreUI 5 (standalone) |
| `@coreui/coreui` | `5.4.3` | SCSS/CSS do CoreUI |
| `@coreui/chartjs` | `4.1.0` | Estilos do tooltip Chart.js |
| `@coreui/icons` | `3.0.1` | Ícones (`cil*`, `cib*`, `cif*`) |
| `@coreui/utils` | `2.0.2` | `getStyle`, `hexToRgba` |
| `chart.js` | `4.5.1` | Gráficos (Normativos Recebidos, Cascata, classificação, e-mails, sparklines) |
| `ngx-scrollbar` | `13.0.3` | Scroll do menu lateral (layout do CoreUI 5.5) |
| `@fontsource/inter` | `5.3.0` | Fonte Inter (identidade da marca) |
| `exceljs` | `4.4.0` | Exportação XLSX (R9), carregado sob demanda |
| `@types/jasmine` `5.1.13`, `@types/node` `22.19.1`, `jasmine-core` `5.12.1`, `karma` `6.4.4`, `karma-chrome-launcher` `3.2.0`, `karma-coverage` `2.2.1`, `karma-jasmine` `5.1.0`, `karma-jasmine-html-reporter` `2.1.0` (dev) | — | Testes (Karma/Jasmine pelo `@angular/build:karma`) |

PDF (R9): `jspdf` e `jspdf-autotable` não estão no `package.json` desde a migração; entram quando a exportação PDF for pedida.

### 1.2 Se um pacote faltar no Nexus

1. **Pedir o espelhamento** do pacote/versão no Nexus. Não instalar de URL, CDN, git ou do npm público (R2). Não pôr host nem credencial no `.npmrc` versionado (4.1).
2. Enquanto não chega, só é aceitável remover do `package.json` o que **não é importado pelo código**:
   - `exceljs`: usado pela exportação Excel do gráfico Normativos Recebidos (`core/export/xlsx-export.ts`); sem ele, o botão "Exportar Excel" mostra "Não foi possível gerar o arquivo Excel." e o resto funciona.
   - `@fontsource/inter`: remover também as 8 entradas `node_modules/@fontsource/inter/...css` de `angular.json` (em `build.options.styles` **e** `test.options.styles`). A pilha `$brand-font-family` em `src/scss/_brand.scss` cai para `system-ui, -apple-system, "Segoe UI", Roboto, ...`. Registre a perda em `docs/design-system.md`.
3. Nunca substituir por outra versão **major** (R1). Se só a versão exata faltar (ex.: `20.3.14` → `20.3.16`), use o patch disponível na mesma linha `20.3.x` e registre em `docs/dependencias-e-ambiente.md` e no `changelog.md`.

### 1.3 `package-lock.json` e Nexus

O lock atual (regenerado na migração, 2026-11-03) tem todas as entradas `resolved` em `https://registry.npmjs.org/...`. O npm 10/11 reescreve esse host para o
registry configurado (`replace-registry-host`, padrão `npmjs`; o registry é o `NPM_REGISTRY` lido pelo `.npmrc`), então
`npm ci` baixa do Nexus sem mudar o lock. Se falhar (ex.: 404 em `resolved`, ou integridade divergente porque o Nexus
serve outro tarball), regenere o lock **no ambiente corporativo**, com `NPM_REGISTRY` e a credencial definidos (na
esteira ou numa estação com acesso ao Nexus), e commite:

```bash
rm -rf node_modules package-lock.json
npm install            # resolve no Nexus; as versões exatas estão no package.json
git add package-lock.json
```

Confira depois que `npm ls --depth=0` mostra as mesmas versões da tabela 1.1 e que `grep -c registry.npmjs.org package-lock.json` é `0`.

---

## 2. O que copiar e o que não copiar

Categorias:

- **PRODUTO**: código do painel. Copiar sempre.
- **TEMPLATE CoreUI**: demo do template (traduzida para pt-BR). Copiar se o destino parte do zero; **pular** se o destino já tem base CoreUI 5 / Angular 20 (cenário B).
- **CONFIG**: copiar **e revisar** (nomes, caminhos, versões).
- **GERADO / NÃO COPIAR**.

| Caminho | Categoria | Observações |
|---|---|---|
| `src/main.ts`, `src/app/app.config.ts` | PRODUTO (alterado) | `bootstrapApplication`; providers: roteador com caminho limpo (sem hash) e rolagem por âncora com deslocamento do header, leitura de `assets/env.json` antes do bootstrap (`RuntimeConfigService`), `provideHttpClient()`, `provideAnimations()`, serviços de `SidebarModule`/`DropdownModule`, `registerLocaleData(localePt, 'pt-BR')`, `LOCALE_ID` `pt-BR`, `DEFAULT_CURRENCY_CODE` `BRL`, `IconSetService`, `FOOTER_ENTITIES` ← `footerEntities` do `env.json` (rodapé sem dados legais versionados). Ver seção 3.2 para integrar em app existente |
| `src/app/app.routes.ts`, `src/app/views/*/routes.ts` | PRODUTO (alterado) | Rotas lazy `''` (Início), `triagent`, `scalation`, `analitico`, redirect `dashboard → triagent`, `'**' → ''`. Sem rotas de demo (foram para `base-de-conhecimento/`, R14) |
| `src/app/app.component.ts` | PRODUTO (alterado) | Título "Agenda Normativa"; injeta `ThemeService` para aplicar o tema no bootstrap; `iconSetService.icons = { ...iconSubset }` |
| `src/app/core/config/runtime-config.service.ts` (+ `.spec.ts`), `src/assets/env.json` | PRODUTO (novo) | Configuração em tempo de execução (`apiBase`, `loginUrl`, `chatMock`, `dataMock`, `footerEntities`); ver 4.3 |
| `Dockerfile`, `.dockerignore`, `nginx/default.conf` | CONFIG | Imagem única (build Node 22 + Nginx não-root, porta 8080, fallback de SPA); trocar `NODE_IMAGE`/`WEB_IMAGE` pelas imagens corporativas; ver 4.8 |
| `.npmrc`, `e2e/.npmrc` | CONFIG | Registry por `NPM_REGISTRY` com fallback público e `always-auth=true`, sem host nem credencial; ver 4.1 |
| `Jenkinsfile` | CONFIG | Esteira declarativa (verify, varreduras, imagem, E2E em DES, promoção DES → UAT → PRD); criar no Jenkins as credenciais e variáveis listadas em `docs/dependencias-e-ambiente.md` 6 e trocar os placeholders (deploy, aprovadores de PRD, rótulo do agente) |
| `e2e/**` (sem `node_modules`, `test-results`, `playwright-report`) | CONFIG | Smoke E2E Playwright, pacote separado; ver `docs/dependencias-e-ambiente.md` 1.5 |
| `src/app/core/services/theme.service.ts` (+ `.spec.ts`) | PRODUTO (novo) | Tema claro/escuro/automático; `data-theme` + `data-coreui-theme` + classe `dark-theme` no `<html>`; copia tokens para `Chart.defaults`; chave `localStorage` `landing-analitica.color-mode` |
| `src/app/containers/default-layout/**` | PRODUTO (alterado sobre template) | `_nav.ts` (menu pt-BR; ainda contém seções do template), `default-layout.component.html` (logo próprio, `<ng-scrollbar>`, sidebar `colorScheme="dark"`), `default-header/*` (data atual + seletor de tema, sem ícones/links de demo), `default-footer/*` ("Painel Analítico © ano") |
| `src/app/icons/icon-subset.ts` | PRODUTO (alterado) | Subset do template + `cilMoon`, `cilContrast`, `cilChartLine`, `cilBuilding`, `cilCart`, `cilDevices`, `cilTruck` (e `cilSun`, `cilCalendar`, `cilList`, `cilCloudDownload`, `cilArrowTop/Bottom` já existentes) |
| `src/app/views/home/**` | PRODUTO (novo) | Página Início (`/`), vazia por decisão |
| `src/app/views/scalation/**` | PRODUTO (novo) | Página Scalation (`/scalation`), vazia por decisão |
| `src/app/views/analytics/**` | PRODUTO (novo) | Página Analítico (`/analitico`), vazia por decisão |
| `src/app/views/dashboard/**` | PRODUTO (alterado + novos) | Página Triagent (`/triagent`): `dashboard.component.*`, `dashboard-charts-data.ts` (Normativos Recebidos), `period/period-range.ts`, `period-filter/*` (`<app-period-filter>`), `waterfall/*` (Cascata), `traffic-value-labels.plugin.ts`, specs. Componentes standalone; importa `WidgetsDropdownComponent` de `views/widgets/` |
| `src/app/views/widgets/widgets-dropdown/**`, `src/scss/_stat-card.scss` | PRODUTO (alterado sobre template) | Cards de segmento Atacado/Corporativo/Plataforma/Varejo (`<app-widgets-dropdown>`; azul no Triagent, `tone="petrol"` no Scalation), estilo `.brand-stat-card`; selo `.brand-stat-pending` global |
| `src/app/views/widgets/segment-overview/**` | PRODUTO (novo) | Visão geral dos segmentos no Início (standalone). Os cards sociais `widgets-brand` foram para `base-de-conhecimento/`; `WidgetsModule` e a demo `ChartSample` saíram na migração |
| `base-de-conhecimento/**` | REFERÊNCIA (fora do build) | Páginas de demo do template (Tema, Componentes, Extras), `docs-components/`, `estilos/_examples.scss`, menu e rotas antigos. Índice/receita em `base-de-conhecimento/README.md` (R14, ADR-016). Copiar junto para a IA do destino consultar; não entra no build |
| `src/app/chat/**`, `src/scss/_chat-widget.scss`, `src/assets/data/chat-fluxo-mock.json` | PRODUTO (novo) | Chat do Agente da Agenda (ADR-010/011/012). Ligação, mock → BFF, SSO do Windows, upload e Excel: seção 4.4.1 |
| `src/assets/data/dashboard-waterfall.json` | PRODUTO (novo) | Mock da Cascata (base anual 2021). Contrato em `docs/contratos-de-dados.md` |
| `src/assets/data/dashboard-classificacao.json`, `src/app/views/dashboard/classification/**`, `src/app/views/dashboard/analytic-table/**`, `src/scss/_classification-card.scss`, `src/scss/_analytic-table.scss`, `scripts/gen-classificacao.js` | PRODUTO (novo) | Card "Classificação das normas" (aplicáveis × não aplicáveis e temas) e seu mock (2021, gerado pelo script). Contrato na seção 6.2 de `docs/contratos-de-dados.md`; importar `_classification-card.scss` e `_analytic-table.scss` em `_custom.scss`; Tabela Analítica (linhas filtradas + Excel); tokens `--app-applicable`/`--app-not-applicable` |
| `src/assets/data/dashboard-emails.json`, `src/app/views/dashboard/emails/**`, `src/scss/_emails-card.scss` | PRODUTO (novo) | Card "Fluxo de e-mail - Triagem" e seu mock (2021). Contrato na seção 6.1 de `docs/contratos-de-dados.md`; importar `_emails-card.scss` em `_custom.scss` |
| `src/assets/favicon.svg`, `src/assets/img/brand/brand-mark-white.svg`, `src/assets/img/brand/brand-mark.svg`, `src/assets/img/brand/brand-logo-white.svg` | PRODUTO (novo) | Marca "Agenda Normativa" com o símbolo oficial da instituição (ADR-018). Conferir no destino se o padrão corporativo exige outro arquivo do símbolo |
| `src/assets/images/angular.jpg` | TEMPLATE CoreUI | Era usado só por telas de demo (hoje na base de conhecimento); pode ser apagado se nada mais usar |
| `src/scss/styles.scss` | PRODUTO (alterado) | Ordem de import obrigatória: `brand` → `variables` → `@coreui/coreui` → `@coreui/chartjs` → `layout` → `fixes` → `theme-dark` → `custom` |
| `src/scss/_brand.scss`, `_variables.scss`, `_theme-dark.scss` | PRODUTO (novo/alterado) | Tokens da marca (claro), sobrescritas CoreUI, tema escuro. Único lugar com cor fixa (R10). Hash vigiado por `docs:check` |
| `src/scss/_typography.scss`, `_components.scss`, `_filter-chips.scss`, `_custom.scss`, `_charts.scss`, `_layout.scss` | PRODUTO (novo/alterado) | Tipografia Inter, cromo de sidebar/header/cards/botões/segmented, chips de filtro, tooltip Chart.js, página |
| `src/scss/_fixes.scss`, `_scrollbar.scss` | TEMPLATE CoreUI | Correções e barra de rolagem (`_examples.scss` foi para `base-de-conhecimento/estilos/`) |
| `src/index.html` | PRODUTO (alterado) | `lang="pt-BR"`, `<base href="/">`, título/descrição/`theme-color`, `favicon.svg`, textos pt-BR |
| `src/environments/environment.ts`, `environment.prod.ts` | CONFIG | Só `production`. O que muda por ambiente vai em `src/assets/env.json` (R6) |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `.editorconfig`, `LICENSE` | TEMPLATE CoreUI / CONFIG | `LICENSE` (MIT) **permanece** por exigência da licença (R8). `tsconfig.json` como no template v5.5 (`module: preserve`, `moduleResolution: bundler`, `isolatedModules`, `strict`, `strictTemplates`), sem `skipLibCheck` |
| `angular.json` | CONFIG | Builders `@angular/build`; nome `landing-analitica` (chave do projeto, `outputPath`, `buildTarget` x3), 8 CSS do Inter em `build` e `test`, `fileReplacements`, `proxyConfig`, `allowedCommonJsDependencies` (`exceljs/dist/exceljs.min.js`), `stylePreprocessorOptions.sass.silenceDeprecations: ["import"]`, budgets (`anyComponentStyle` 2kb/4kb) |
| `package.json`, `package-lock.json` | CONFIG | Nome, versão `0.1.0`, scripts (`verify` e os que ele chama), `engines` (`node ^22.12.0`, `npm >= 10.9.4`). Lock: ver 1.3 |
| `karma.conf.js` | CONFIG | Diretório de cobertura `coverage/landing-analitica`; `browsers: ['Chrome']`, `singleRun: false` (ajustar no CI) |
| `proxy.conf.json` | CONFIG | `target` com placeholder `http://HOST_DEV_BFF:PORTA`; só para `ng serve` |
| `AGENTS.md`, `.rules/**`, `.githooks/**`, `.nvmrc` | CONFIG | Regras para qualquer IA (fonte única) e hooks. Copiar sempre; no destino rodar `npm run hooks:install`. `.rules/local.md` (regras locais, fora do git) só se valer no destino |
| `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/**` | CONFIG | Só ponteiros para `AGENTS.md`; nunca colar regra neles (`docs:check` verificação 9). |
| `README.md` | CONFIG | Revisar nome, comandos e caminhos |
| `docs/**` | CONFIG | Esta documentação; `docs/inventario.md` é gerado |
| `scripts/docs-inventory.js`, `scripts/docs-check.js` | CONFIG | Node puro + git; ver 4.14 |
| `.gitignore` | CONFIG | Ignora `dist`, `node_modules`, `.angular/cache`, `coverage`, `.vscode/*` (exceto 4 arquivos) |
| `dist/`, `node_modules/`, `.angular/`, `coverage/`, `out-tsc/` | GERADO — NÃO COPIAR | Recriados por `npm ci`/build/test |
| `.git/` | NÃO COPIAR | O destino tem o próprio histórico. Veja 4.14 sobre o commit `36966f6` |

### 2.1 Arquivos do template **removidos** neste projeto (não copiar; apagar se existirem no destino)

`.github/**` (CODE_OF_CONDUCT, COMMIT_CONVENTION, CONTRIBUTING, FUNDING, ISSUE_TEMPLATE, SUPPORT, workflows `build-check.yml` e `stale.yml`),
`CHANGELOG.md` do CoreUI, `src/assets/angular.ico`, `src/assets/favicon.ico`, `src/assets/img/brand/coreui-*.svg` (5 arquivos),
`src/components/docs-link/**` (R8: nenhuma marca, nome ou link do CoreUI na interface, metadados, favicon ou nome do projeto).

---

## 3. Dois cenários de porte

### 3.1 Cenário A — repositório novo a partir destes arquivos

1. Criar o repositório vazio no Git corporativo; criar no Jenkins as credenciais `npm-registry-url` e `npm-userconfig` e as variáveis da pasta (`docs/dependencias-e-ambiente.md` 6). O `.npmrc` versionado já lê `NPM_REGISTRY` (4.1).
2. Copiar tudo das categorias PRODUTO, TEMPLATE CoreUI e CONFIG (seção 2). Não copiar GERADO nem `.git/`.
3. Revisar CONFIG: nome do projeto (4.7), `proxy.conf.json` (4.2), `karma.conf.js` para o CI (4.6), `Dockerfile` com as imagens corporativas e o ConfigMap do `env.json` (4.3, 4.8).
4. `npm ci` (ou o fluxo da seção 1.3 se o lock não resolver no Nexus).
5. Rodar o checklist da seção 5 inteiro antes do primeiro commit.
6. Primeiro commit: `chore: porte do landing-analitica (Angular 20 / CoreUI 5.5)` em pt-BR (R12). Registrar em `docs/changelog.md`.
7. Se o repositório novo não tiver o commit `36966f6`, ajustar `scripts/docs-inventory.js` (4.14).

### 3.2 Cenário B — integrar em projeto Angular 20 / CoreUI 5 existente

Levar apenas PRODUTO + os trechos de CONFIG indicados. Pular TEMPLATE CoreUI. Destino em outra versão do Angular: parar e
perguntar (R11); o código daqui usa o idioma do Angular 20 (standalone, `@if`/`@for`).

**Arquivos a levar** (todos os componentes são standalone: cada um traz os próprios `imports`)

| Levar | Para onde | Depende de |
|---|---|---|
| `src/app/core/services/theme.service.ts` (+ spec) | `src/app/core/services/` do destino | `DOCUMENT`, RxJS; `chart.js` (import dinâmico) |
| `src/app/views/home/**`, `scalation/**`, `analytics/**` (com `routes.ts`) | `src/app/views/` | Componentes importados por cada página (ver fichas em `docs/paginas/`) |
| `src/app/views/dashboard/**` (com `routes.ts`) | `src/app/views/dashboard/` | `@coreui/angular` 5.5 (componentes de card, grid, botão, tabela, spinner, progress), `@coreui/angular-chartjs` (`ChartjsComponent`), `@coreui/icons-angular` (`IconDirective`), `ReactiveFormsModule`, `HttpClient`, `@coreui/utils`, `ThemeService` |
| `src/app/views/widgets/widgets-dropdown/**`, `segment-overview/**` | `src/app/views/widgets/` | Widgets do CoreUI (`WidgetStatAComponent`, `WidgetStatDComponent`). `segment-overview` importa `TRAFFIC_SERIES` de `views/dashboard/dashboard-charts-data.ts` (cor de cada segmento) e usa o `SegmentCardsService` de `widgets-dropdown` |
| `src/app/containers/default-layout/default-header/*`, `default-footer/*`, `default-layout.component.html`, `_nav.ts` | Layout do destino | Se o destino já tem header próprio, portar só o `<ng-template #themeDropdown>` e `today$`/`toHeaderDate` de `default-header.component.ts` |
| `src/app/chat/**`, `src/app/core/services/api.service.ts`, `src/app/core/export/xlsx-export.ts`, `src/scss/_chat-widget.scss` (+ `chat-fluxo-mock.json` enquanto houver mock) | Mesmos caminhos | `ReactiveFormsModule`, `IconDirective`, `HttpClient` (`provideHttpClient()`); `exceljs`. `ChatWidgetComponent` nos `imports` do layout e `<app-chat-widget>` no template; passo a passo em 4.4.1 |
| `src/assets/data/*.json`, `src/assets/favicon.svg`, `src/assets/img/brand/brand-*.svg` | `src/assets/` | — |
| `src/scss/_brand.scss`, `_variables.scss`, `_theme-dark.scss`, `_typography.scss`, `_components.scss`, `_filter-chips.scss`, `_charts.scss` e os parciais de card | `src/scss/` do destino | Ordem de import (abaixo) |
| `docs/**`, `scripts/docs-*.js`, scripts npm `docs:inventory`/`docs:check`, `AGENTS.md`, `.rules/`, `.githooks/` e os ponteiros (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`) | Raiz | Destino já tem `AGENTS.md`: mesclar no dele e manter um só; regras conflitantes viram pergunta (R11) |

**Registrar as rotas lazy** (em `app.routes.ts` do destino, como filhas do layout):

```ts
{ path: '', pathMatch: 'full', data: { title: '' },
  loadChildren: () => import('./views/home/routes').then((m) => m.routes) },
{ path: 'triagent',
  loadChildren: () => import('./views/dashboard/routes').then((m) => m.routes) },
{ path: 'scalation',
  loadChildren: () => import('./views/scalation/routes').then((m) => m.routes) },
{ path: 'analitico',
  loadChildren: () => import('./views/analytics/routes').then((m) => m.routes) },
{ path: 'dashboard', pathMatch: 'full', redirectTo: 'triagent' },
```

Os títulos de breadcrumb vêm de `data.title` em cada `views/<pasta>/routes.ts` (`Triagent`, `Scalation`, `Analítico`; Início
vazio de propósito). Itens de menu correspondentes estão nos 4 primeiros objetos de `_nav.ts` (ícones `cil-home`,
`cil-speedometer`, `cil-layers`, `cil-chart-line`).

**`app.config.ts` do destino** precisa ter (copiar de `src/app/app.config.ts`):

```ts
registerLocaleData(localePt, 'pt-BR');
// providers:
provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
  withEnabledBlockingInitialNavigation()), // caminho limpo: nunca withHashLocation() (ADR-023)
provideAppInitializer(() => inject(RuntimeConfigService).load()), // assets/env.json antes do bootstrap
provideAppInitializer(() => inject(ViewportScroller).setOffset(() => [0, stickyHeaderOffset()])),
provideHttpClient(), provideAnimations(), importProvidersFrom(SidebarModule, DropdownModule), IconSetService,
{ provide: LOCALE_ID, useValue: 'pt-BR' }, { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
{ provide: FOOTER_ENTITIES, useFactory: () => inject(RuntimeConfigService).config.footerEntities }, // dado legal só por env.json
```

O servidor web do destino precisa do fallback de SPA (`try_files ... /index.html` no Nginx ou `FallbackResource /index.html` no Apache; 4.8). Em `AppComponent`, injetar `ThemeService` no
construtor (mesmo sem usar) para o tema salvo ser aplicado no bootstrap, e registrar `iconSetService.icons = { ...iconSubset }`.

**Estilos** — em `styles.scss` do destino, a ordem importa:

```scss
@import "brand";        // tokens da marca: antes de tudo
@import "variables";    // sobrescreve $primary, $font-family-sans-serif, $sidebar-bg... do CoreUI
@import "@coreui/coreui/scss/coreui";
@import "@coreui/chartjs/scss/coreui-chartjs";
@import "layout";
@import "chat-widget";
@import "fixes";
@import "theme-dark";   // :root[data-theme="dark"] re-aponta --brand-*, --app-*, --cui-* (vence [data-coreui-theme=dark])
@import "custom";       // -> typography, components, filter-chips
```

Os parciais usam `@import` (aviso silenciado em `angular.json`, D-007). Se o destino já tem `_variables.scss` próprio, mesclar: as variáveis de `_variables.scss` deste projeto são do CoreUI 5 (`$primary`, `$body-bg`, `$body-secondary-color`, `$card-border-radius`, `$sidebar-*`, `$header-*`, `$footer-*`). Se o destino usa `@use "@coreui/coreui/scss/coreui" with (...)`, passar estas variáveis no `with`. `_charts.scss` deve ser importado onde o destino importa o tooltip do `@coreui/chartjs`.

**Fontes** — adicionar as 8 entradas em `angular.json` (`projects.<nome>.architect.build.options.styles` **e** `test.options.styles`), antes de `styles.scss`:

```json
"node_modules/@fontsource/inter/latin-400.css",
"node_modules/@fontsource/inter/latin-ext-400.css",
"node_modules/@fontsource/inter/latin-500.css",
"node_modules/@fontsource/inter/latin-ext-500.css",
"node_modules/@fontsource/inter/latin-600.css",
"node_modules/@fontsource/inter/latin-ext-600.css",
"node_modules/@fontsource/inter/latin-700.css",
"node_modules/@fontsource/inter/latin-ext-700.css",
```

Também em `angular.json`: `"allowedCommonJsDependencies": ["exceljs/dist/exceljs.min.js"]`, `"stylePreprocessorOptions": { "sass": { "silenceDeprecations": ["import"] } }` e, em `serve.options`, `"proxyConfig": "proxy.conf.json"`.

**Ícones** — garantir no `icon-subset.ts` do destino (import de `@coreui/icons` + objeto + enum): `cilMenu`, `cilSun`, `cilMoon`, `cilContrast` (header), `cilHome`, `cilSpeedometer`, `cilLayers`, `cilChartLine` (menu), `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`, `cilArrowTop`, `cilArrowBottom` (cards de segmento), `cilCalendar` (filtro de período), `cilList`, `cilChartLine` (Cascata), `cilCloudDownload` (botão de download do gráfico Normativos Recebidos), `cilPeople`, `cilUser`, `cilUserFemale`, `cilOptions`, `cibGoogle`, `cibFacebook`, `cibTwitter`, `cibLinkedin`, `cibCc*`, `cif*` (blocos de demo ainda presentes no painel; dispensáveis após 4.4).

**ThemeService** — o header chama `setMode('light'|'dark'|'auto')` e lê `mode$`; gráficos assinam `appliedTheme$` para re-renderizar com as cores do tema (`dashboard.component.ts`, `waterfall-chart.component.ts`). O `ThemeService` grava também `data-coreui-theme`; não usar o `ColorModeService` do CoreUI (R10). Se o destino já usa o `ColorModeService`, parar e perguntar qual dos dois fica (R11).

---

### 3.3 Cenário C — portar uma página só

Cada página tem ficha em `docs/paginas/<slug>.md` (R15, ADR-020): `inicio.md`, `triagent.md`, `scalation.md`, `analitico.md`.
A ficha lista os blocos, cada campo de dados que a página consome, o que o front calcula, as seções do
`docs/mapeamento-de-dados.md` a preencher e a tabela "O que copiar para portar só esta página" (arquivos, módulos CoreUI,
estilos globais, ícones, tokens, serviços, dependências npm, glossário, o que fica de fora). Roteiro:

1. Ler `AGENTS.md`, `.rules/projeto.md` e a ficha da página.
2. Copiar a lista da seção 6 da ficha mais o núcleo de estilos (`_brand.scss`, `_variables.scss`, `_theme-dark.scss`,
   `styles.scss` na ordem da seção 3.2) e os providers de `app.config.ts` da seção 3.2.
3. Preencher "Coluna em produção" nas seções do mapeamento que a ficha indica (seção 5) e ligar por adaptador (mapeamento §2).
4. Rodar a verificação da seção 7 da ficha e o checklist da seção 5 deste documento.

## 4. Pontos prováveis de adaptação (arquivo e trecho)

### 4.1 Registry / `.npmrc`
Regra corporativa: `.npmrc` obrigatório, apontando para o proxy npm do Nexus (`npm-all`) com `always-auth=true`. O
`.npmrc` da raiz e o de `e2e/` são versionados **sem host e sem credencial**:

```ini
registry=${NPM_REGISTRY}
registry${NPM_REGISTRY?}=https://registry.npmjs.org/
always-auth=true
```

- **Esteira:** `NPM_REGISTRY` vem da credencial *Secret text* `npm-registry-url` (URL do `npm-all`) e vale para todos
  os comandos `npm`; o token vem da credencial *Secret file* `npm-userconfig` (um *user config* com a linha
  `//<caminho do registry>/:_auth=...`), passada por `NPM_CONFIG_USERCONFIG` no `npm ci` e como segredo BuildKit
  `npmrc` no `docker build`. O `Jenkinsfile` já faz isso; no destino só se criam as credenciais.
- **Estação de trabalho:** com npm 11.6+, sem a variável, a segunda linha leva ao registry público; com npm 10, exporte
  `NPM_REGISTRY` (Nexus ou público) antes de qualquer comando `npm`, senão `ERR_INVALID_URL`.
- **Lock:** os `resolved` em `registry.npmjs.org` são reescritos pelo npm para o `NPM_REGISTRY` (`replace-registry-host`)
  ou o lock é regenerado no ambiente corporativo (1.3).
- Teste de cada forma do `.npmrc` (npm 10 e 11, com e sem a variável) e motivo do fallback:
  `docs/dependencias-e-ambiente.md` 1.4.

### 4.2 `proxy.conf.json` (só `ng serve`)
```json
{ "/api": { "target": "http://HOST_DEV_BFF:PORTA", "secure": false, "changeOrigin": true, "logLevel": "info" } }
```
Trocar `HOST_DEV_BFF:PORTA` pelo host de desenvolvimento do BFF. Este é o **único** lugar onde um host de dev pode aparecer (R6). Nunca referenciar `appdes`/`appuat` em `src/`.

### 4.3 Configuração em tempo de execução: `assets/env.json` e `apiBase`
Uma só imagem é promovida DES → UAT → PRD; o que muda por ambiente fica em `src/assets/env.json`, lido antes do bootstrap por `RuntimeConfigService` (`src/app/core/config/runtime-config.service.ts`, `provideAppInitializer` em `app.config.ts`):

| Chave | Versionado (dev) | Uso |
|---|---|---|
| `apiBase` | `"/api"` | Prefixo de toda chamada do `ApiService` (R4). Com o Ingress roteando `/api/*` para o BFF na mesma origem, não muda. BFF em subdomínio próprio: a URL dele, só no `env.json` do ambiente (nunca no código) |
| `loginUrl` | `"/api/v1/autenticacao/login"` | Entrada da autenticação corporativa para o redirecionamento do 401 (interceptor da fase 4) |
| `chatMock` | `true` | `true` = agente simulado; `false` = BFF (4.4.1.2). Padrão sem o arquivo: `true` só em build de desenvolvimento, `false` em build de produção |
| `dataMock` | `true` | Blocos de dados: `true` = mocks de `src/assets/data/`; `false` = BFF no contrato v1 (4.4). Mesmo padrão sem o arquivo que `chatMock` |
| `footerEntities` | `[]` | Razão social, CNPJ e endereço do rodapé (`[{ "name", "cnpj", "address" }]`); dado legal nunca versionado |

No cluster, um ConfigMap por ambiente montado como arquivo em `/usr/share/nginx/html/assets/env.json` (`subPath: env.json`) substitui o versionado; o Nginx o serve sem cache, então trocar o ConfigMap e reiniciar o pod basta (sem novo build). Arquivo ausente, ilegível ou que não é um objeto JSON: valem os padrões e o console registra um erro (sem o conteúdo da resposta); chave de tipo errado volta sozinha ao padrão. Os padrões de `chatMock`/`dataMock` dependem do build (`defaultRuntimeConfig(environment.production)`): no build de produção são `false`, então uma imagem com ConfigMap faltando mostra os estados de erro dos blocos, nunca números fictícios; no de desenvolvimento são `true`. O `env.json` versionado (local e demonstração) liga os dois mocks explicitamente. **Em UAT e PRD o ConfigMap tem de definir `"dataMock": false` e `"chatMock": false`.** Com qualquer mock ligado, o header mostra o selo "Dados simulados" (`MOCK_SOURCES`, `default-header.component.ts`), com a explicação no `title` e para leitor de tela. `src/environments/environment*.ts` ficam só com `production`.

### 4.4 Serviços de dados: mock ou contrato v1 (`dataMock`)
Serviço base: `src/app/core/services/api.service.ts` monta `${apiBase}/v1${path}` com o `apiBase` da configuração de execução (R4). Desde a Fase 5 todo serviço de dados tem os dois caminhos e escolhe por `dataMock` do `env.json`: `true` lê `src/assets/data/` (comportamento e visual de antes); `false` chama o recurso v1 de `docs/contratos/openapi-agenda-normativa-v1.yaml` e converte a resposta por um adaptador puro (`*.adapter.ts`, um por recurso, com spec) para as mesmas interfaces. Componentes não sabem a origem. Ligar no ambiente: conferir o OpenAPI do BFF contra os adaptadores (`docs/contratos-de-dados.md` §11), pôr `"dataMock": false` no ConfigMap e fazer a verificação das fichas `docs/paginas/*.md` §7.

| Dado | Mock (`dataMock: true`) | Contrato v1 (`dataMock: false`) |
|---|---|---|
| Cards de segmento (Triagent, Scalation, visão geral do Início) | `SegmentCardsService` lê `src/assets/data/dashboard-segments.json` | `GET /v1/segmentos` → `fromSegmentosV1` (`segment-cards.adapter.ts`); `validateSegmentCards` nos dois |
| Normativos Recebidos (séries por segmento + "Normas a Classificar") | `DashboardChartsData.initMainChart()` gera valores aleatórios dentro de `TRAFFIC_SERIES[i].range` | `TrafficDataService.getTraffic` → `GET /v1/normativos-recebidos` → `fromNormativosRecebidosV1`; `DashboardChartsData.setTrafficData` (eixo y pelo maior valor); `renderMainChart()`, `trafficSummary()` e destaque/filtro intactos |
| Pizza e temas | `ClassificationDataService.getSummary` agrega o mock (`aggregateClassification`) | `GET /v1/normas-classificadas/resumo` → `fromResumoNormasV1` |
| Tabela Analítica e Excel | `getNormasPage` filtra, ordena e pagina o mock (`pageClassified`, mesma semântica do servidor) | `GET /v1/normas-classificadas?page&size=15&sort...` → `fromPaginaNormasV1`; Excel em páginas de 100 até 5.000 linhas (`collectPages`, D5) |
| E-mails (indicadores, barras, últimos 5) | `EmailsDataService.getAggregate` agrega o mock (`aggregateEmails`) | `GET /v1/emails-sugestao/resumo` + `GET /v1/emails-sugestao?size=5&sort=dataEnvio,desc` → `fromResumoEmailsV1` |
| Fim do período dos presets | `src/app/views/dashboard/period/period-range.ts`: `const PERIOD_END = new Date(2021, 11, 31)` ("último dia do mock") | Trocar por `new Date()` (hoje) ou pela data de corte devolvida pela API. Afeta Normativos Recebidos **e** Cascata (mesmos presets) |
| Cascata do resultado | `WaterfallDataService` lê `src/assets/data/dashboard-waterfall.json` e `deriveWaterfall()` deriva qualquer período da base anual 2021 | `GET /v1/cascatas-resultado?granularidade&inicio&fim` → `fromCascataV1` (`waterfall.adapter.ts`), sem derivação; `buildWaterfall` valida. Quando o mock sair: apagar `waterfall-derive.ts` (+ spec) e o JSON |
| Erros de carga (todos os blocos) | mensagem fixa do bloco | `<app-api-error-text>` (`core/http/api-error-text.component.ts`): frase do bloco ou texto do status (`HTTP_ERROR_TEXTS`) e "Código de suporte: …" com o `traceId`; 401 sem texto |
| Exportação (R9) | Normativos Recebidos e E-mails de sugestão: Gráfico/Tabela + "Exportar Excel" (`core/export/xlsx-export.ts`) | Reusar `downloadXlsx` para outras tabelas (Cascata); CSV e PDF (`jspdf` + `jspdf-autotable`) ainda a implementar; nomes de arquivos/colunas em pt-BR (R12) |
| Blocos de demo ainda no painel | `scalation.component.html`: card "Tráfego e vendas" (progressos Segunda…Domingo, Masculino/Feminino, redes sociais) | Remover ou substituir por conteúdo real. Ao remover, limpar os ícones correspondentes do subset (bandeiras `cif*` e cartões `cibCc*` ficaram sem uso desde a troca da tabela "Usuários")
| Menu lateral | `src/app/containers/default-layout/_nav.ts`: só o produto (Início, "Painéis" com Triagent e Scalation e subitens por seção, Analítico) | Nada a apagar; item novo segue o padrão `section(...)` |
| Página vazia | `views/analytics`: só `<h1 class="visually-hidden">` | Conteúdo a definir pelo produto |

### 4.4.1 Chat do Agente da Agenda: porte completo

Esta seção basta para levar o chat a outro ambiente (produção em **Windows**, Edge ou Chrome corporativos). Contrato da API em `contratos-de-dados.md` seção 9; backend em `planejamento/agente-backend-spec.md`; funções do widget (M01–M37) em `planejamento/chat-widget.md`; decisões em ADR-010, ADR-011 e ADR-012.

#### 4.4.1.1 O que copiar e onde ligar

| Item | Caminho | Observação |
|---|---|---|
| Chat | `src/app/chat/**` (copiar a pasta inteira, com os `.spec.ts`) | Componentes standalone (widget, mensagens, entrada) e pipes, serviços (`ChatApiService`, `ChatSessionService`, `ChatLauncherService`), modelo, textos, mock, saudação, despedida, validação de arquivos, exportações |
| Estilos | `src/scss/_chat-widget.scss` + `@import "chat-widget";` em `src/scss/styles.scss` | Só tokens `--brand-*`, `--cui-*`, `--app-*` (R10); `--app-chat-accent` vem de `_brand.scss`/`_theme-dark.scss` |
| Registro | `ChatWidgetComponent` nos `imports` do componente de layout; `<app-chat-widget class="d-print-none"></app-chat-widget>` no fim de `default-layout.component.html`; `provideHttpClient()` em `app.config.ts` | Fora do `<router-outlet>`, para valer em todas as páginas |
| Ícones | `src/app/icons/icon-subset.ts` | Precisam existir: `cilCommentSquare`, `cilSpeech`, `cilMinus`, `cilResizeWidth`, `cilFullscreenExit`, `cilPaperPlane`, `cilPaperclip`, `cilChevronLeft`, `cilThumbUp`, `cilThumbDown`, `cilList`, `cilSpreadsheet`, `cilCloudDownload`. Ícone ausente não quebra o build, só some da tela |
| Botão por linha da Tabela Analítica | `analytic-table.component.{ts,html}` + `.analytic-ask*` em `src/scss/_analytic-table.scss` | Usa só `ChatLauncherService` (sem HTTP). Se o destino não tiver a tabela, nada muda no chat |
| Exportação Excel | `src/app/core/export/xlsx-export.ts` + `exceljs 4.4.0` (já no `package.json`) | Carregado sob demanda (chunk separado); nenhuma dependência nova para o chat |
| Base de API | `src/app/core/services/api.service.ts` | `apiBase` do `env.json` + caminho relativo (R4) |
| Mock | `src/assets/data/chat-fluxo-mock.json` e `chat-mock-server.ts` | Só enquanto `chatMock` do `env.json` for `true` (hoje `true` no arquivo versionado) |

Nada do chat vai para `localStorage`/`sessionStorage`; o `sessionId` e o nome do usuário ficam só na memória da página.

#### 4.4.1.2 Trocar o mock pelo BFF

1. Conferir o OpenAPI do BFF contra `contratos-de-dados.md` 9.1–9.3 e ajustar `chat.model.ts` se algum nome de campo ou código de erro mudar (não mudar textos nem componentes).
2. `"chatMock": false` no `env.json` do ambiente (ConfigMap); o versionado pode continuar `true` até o mock sair (passo 3).
3. Apagar `src/assets/data/chat-fluxo-mock.json`, `src/app/chat/chat-mock-server.ts` (+ spec), `chat-test-helpers.ts`, o ramo `config.mock` de `chat-api.service.ts` (`mockServer()`, `MOCK_URL`, `CHAT_API_CONFIG.mockLatencyMs`) e o `describe` de mock em `chat-api.service.spec.ts` (os testes com `HttpTestingController` contra `/conforme/chat/*` ficam).
4. Rodar `ng test` e `ng build --configuration production`; conferir que `dist/` não tem host proibido (R6).
5. Fazer a verificação manual de 4.4.1.7 no Windows.

O que o BFF precisa entregar para cada função do front:

| Função na tela | Rota / campo | Sem isso no BFF |
|---|---|---|
| Conversa guiada, texto, "Voltar" | `POST /sessao`, `POST /mensagem` (`action` `option`/`text`/`back`) | O chat não funciona |
| "Parar" desfaz no servidor; "Tentar novamente" sem duplicar | `requestId` em todo pedido; `POST /cancelar` | "Parar" só abandona no navegador; uma repetição pode agir duas vezes |
| Perguntar a partir da Tabela Analítica | `action: 'ask'` | O botão abre o chat, mas o pedido volta `INVALID_ACTION` |
| Listas de normas (a classificar, não aderentes, próximas vigências) | `normList` na mensagem ao entrar no nó | Aparece só o texto do passo, sem tabela nem Excel |
| Respostas prontas no esclarecimento | `quickReplies` em `need_more_info` | Só as perguntas, sem os botões |
| Vários documentos e Word | `POST /arquivo` com `files` repetido; `files[]` na resposta; leitura de DOC/DOCX | Envio de mais de um arquivo ou de Word volta erro |
| Saudação com nome | `user.firstName` em `POST /sessao` | Saúda só pelo horário ("Boa tarde!") — funciona |
| Feedback útil/não útil | `POST /feedback` (204) | Aparece "Não foi possível enviar o feedback" |
| Encerrar | `DELETE /sessao/{id}` (204, idempotente) | A sessão expira pelo TTL de 30 min |

#### 4.4.1.3 Identificação do usuário e saudação no Windows

Comportamento: a primeira mensagem do agente começa com "Bom dia" (5h–11h59), "Boa tarde" (12h–17h59) ou "Boa noite" (18h–4h59) e, se houver nome, ", Vinicius!" — ex.: "Boa tarde, Vinicius! Sou o Agente da Agenda…". Repete ao recomeçar e quando a sessão expira. Código: `src/app/chat/chat-greeting.ts` (faixas nas constantes `MORNING_FROM`, `AFTERNOON_FROM`, `EVENING_FROM`).

**Horário.** Vem de `Date#getHours()` do navegador, isto é, do relógio e do fuso configurados no Windows do usuário. Não há configuração no front nem no servidor. Se a saudação sair errada, conferir a hora e o fuso da máquina (Configurações > Hora e idioma; em rede corporativa, a sincronização de horário do domínio). Não usar a hora do servidor: ele pode estar em UTC.

**Nome.** O navegador **não tem acesso** ao usuário logado no Windows (nem por JavaScript, nem por API do Edge/Chrome); qualquer solução no front (pedir o nome, ActiveX, extensão) está fora do escopo. O caminho é:

```
Windows (usuário do domínio)
  └─ Edge/Chrome negocia Kerberos (ou NTLM) automaticamente com o site da intranet
       └─ Apache ou chassi Atlante autentica e conhece o login (ex.: DOMINIO\vfreire)
            └─ BFF busca o nome no AD/LDAP (givenName) e devolve só { "primeiroNome": "Vinicius" } em GET /api/v1/usuarios/me
                 └─ front monta "Boa tarde, Vinicius!"
```

Passos no destino (a confirmar com a infraestrutura; o front não muda):
1. **Autenticação integrada** no site (escolher um): (a) o próprio chassi Atlante com SPNEGO/Kerberos, se oferecer; ou (b) Apache na frente do BFF com `mod_auth_gssapi` (Kerberos) e `keytab` do serviço `HTTP/<host>`, repassando o usuário ao BFF. Se usar cabeçalho para repassar (ex.: `X-Remote-User`), o Apache **precisa apagar** esse cabeçalho vindo do navegador antes de definir o seu (`RequestHeader unset X-Remote-User early` e depois `RequestHeader set X-Remote-User %{REMOTE_USER}s`), senão qualquer um forja o nome; e o BFF só deve aceitar o cabeçalho vindo do Apache.
2. **Navegadores**: o site precisa estar na zona de intranet local do Windows ou nas políticas de grupo `AuthServerAllowlist` (Edge e Chrome) para o Kerberos ser enviado sem pedir senha. Sem isso, o navegador pode mostrar uma janela de login — sinal de que a política não foi aplicada.
3. **Mesma origem**: o front chama `apiBase` (`/api`) no mesmo host do site; o navegador envia a autenticação sozinho. **Não** adicionar `withCredentials` nem interceptor (a decisão de área não logada continua; R5 só vale se houver tela de login).
4. **BFF**: com o login, consultar `givenName` (alternativa: primeira palavra de `displayName`) e devolver `user: { firstName }`. Nunca devolver login, e-mail, matrícula ou nome completo. Falhou ou não identificou: omitir `user` (nunca falhar a sessão). Não registrar o nome em log nem enviá-lo ao Gemini (spec, seção 5.1).
5. **Front** (já pronto): `greetingName` aceita só a primeira palavra feita de letras (acentos, hífen e apóstrofo permitidos, até 40 caracteres) e a capitaliza ("VINICIUS FREIRE" → "Vinicius"); descarta o que parecer login (`DOMINIO\vfreire`, `vinicius.silva`, `x123`, e-mail).
6. **Mock**: o `chat-fluxo-mock.json` traz `"user": { "firstName": "Vinicius" }` só para demonstração; sai junto com o mock.

#### 4.4.1.4 Documentos no Windows: colar, vários arquivos e Word

- **Colar (Ctrl+V)** no passo "Avaliar um documento", com o foco em qualquer ponto do painel: envia o print copiado (Win+Shift+S / Ferramenta de Captura, Print Screen) com o nome `imagem-colada-<hh>h<mm>m<ss>s.png`, ou arquivos copiados no Explorador de Arquivos (Ctrl+C sobre o arquivo; suportado no Edge e no Chrome atuais). Colar texto não é afetado. Código: `ChatInputComponent.onPaste`, ligado por `(paste)` no painel (`chat-widget.component.html`); nome em `namePastedFile` (`chat-file.ts`).
- **Vários arquivos**: até 5 por envio (`CHAT_LIMITS.maxFilesPerSend` e `upload.maxFiles` do nó), seleção múltipla com Ctrl/Shift no diálogo do Windows. Os inválidos aparecem um por linha ("nome: motivo") e os válidos seguem num único pedido.
- **Tipos**: PDF, Word (`.doc`, `.docx`), PNG, JPG/JPEG, WEBP. Em máquinas sem Office o Windows pode não informar o tipo do `.docx`; o front aceita tipo vazio quando a extensão é válida e o BFF confere os bytes (magic bytes). `.docm` (com macro) não é aceito.
- **Limites a alinhar na infraestrutura** (senão o envio falha antes de chegar ao BFF): 20 MB somados por conversa. Apache: `LimitRequestBody` acima de 20 MB mais a sobra do multipart (ex.: 22 MB). Spring Boot no BFF: `spring.servlet.multipart.max-file-size=20MB` e `max-request-size=22MB`. Proxy reverso e WAF com o mesmo teto. Antivírus do chassi: recusa vira `FILE_TYPE_NOT_ALLOWED`.
- **Word no BFF**: o Gemini não lê Word; o BFF extrai o texto com Apache POI (`XWPFDocument`/`HWPFDocument`), dependência nova no BFF que precisa estar no Nexus.
- **Resultado**: com mais de um arquivo, a resposta traz a tabela "Resultado da avaliação dos documentos" (Arquivo, Resultado, Norma identificada, Observação) e "Extrair em Excel".

#### 4.4.1.5 Exportações Excel do chat

Geradas no navegador com `exceljs` (R9), sem rota no BFF, pela mesma `downloadXlsx` da Tabela Analítica. Arquivos: `agente-da-agenda-<lista>[-<segmento>]-<aaaa-mm-dd>.xlsx` (listas de normas, só as linhas visíveis com o filtro) e `agente-da-agenda-avaliacao-documentos-<aaaa-mm-dd>.xlsx` (vários documentos). No Windows o arquivo vai para a pasta Downloads (ou pergunta onde salvar, conforme a política do navegador). Se uma política corporativa bloquear downloads gerados pela página (`blob:`), liberar o site na política `DownloadRestrictions`/lista de sites permitidos; o chat mostra "Não foi possível gerar o arquivo Excel." só quando a geração falha, não quando o navegador bloqueia o download.

#### 4.4.1.6 O que adaptar no destino (sem mudar componentes)

| O quê | Onde |
|---|---|
| Nome do agente ("Agente da Agenda") e todos os textos | `src/app/chat/chat-texts.ts` (`CHAT_TEXTS`, `CHAT_ERROR_TEXTS`); o nome do botão flutuante usa a última palavra em negrito automaticamente |
| Faixas de horário da saudação | `chat-greeting.ts` |
| Palavras de despedida que encerram a conversa | `chat-farewell.ts` |
| Limites (caracteres, 20 MB, 5 arquivos, extensões) | `CHAT_LIMITS` em `chat.model.ts` (o BFF repete os mesmos) |
| Trilhas, opções do menu, listas, contatos | No BFF (`chat-flow.json`); no mock, `chat-fluxo-mock.json` |
| Pergunta enviada pela Tabela Analítica | `askAssistant` em `analytic-table.component.ts` |

#### 4.4.1.7 Verificação no destino (Windows, Edge e Chrome)

1. Botão "Agente da **Agenda**" no canto inferior direito, nos temas claro e escuro.
2. Abrir: a primeira mensagem começa com a saudação certa para a hora do Windows e, com SSO configurado, com o primeiro nome. Mudar o relógio da máquina (ou testar em horários diferentes) confere as três faixas.
3. Escolher "Avaliar um documento"; tirar um print com Win+Shift+S e colar com Ctrl+V no painel: aparece `imagem-colada-….png` com o veredito.
4. Anexar 3 arquivos de uma vez (um PDF, um `.docx`, um não norma): cada um com veredito na mensagem, tabela com 3 linhas e "Extrair em Excel" baixa o arquivo, que abre no Excel com as 7 colunas.
5. Anexar um `.exe` renomeado ou 6 arquivos: mensagens por arquivo; nenhum pedido sai com arquivo inválido.
6. Listas ("Normas a Classificar" etc.): filtro por segmento, "Ver em formato tabela", "Extrair em Excel".
7. Tabela Analítica: botão do agente em uma linha abre o chat e faz a pergunta.
8. "Parar" durante uma resposta e repetir a ação: o passo fica coerente; "Encerrar" e "tchau" despedem-se e só resta "Recomeçar".
9. Console do navegador (F12) sem erros; nenhuma chamada a host diferente do site.

#### 4.4.1.8 Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| Saudação sem nome ("Boa tarde!") | BFF sem SSO, AD sem `givenName`, ou nome com cara de login (descartado pelo front) | Conferir a resposta de `GET /api/v1/usuarios/me` na aba Rede: `primeiroNome` deve ser só o primeiro nome (com `chatMock: true` o nome vem do mock) |
| Janela de usuário e senha ao abrir o site | Site fora da zona de intranet/`AuthServerAllowlist` | Política de grupo dos navegadores (infraestrutura) |
| Saudação no período errado | Relógio ou fuso do Windows errado | Corrigir na máquina; o front não usa a hora do servidor |
| Ctrl+V não envia o print | Foco fora do painel do chat, ou passo diferente de "Avaliar um documento" | Clicar no painel e colar de novo; colar só funciona no passo de upload |
| Arquivo copiado no Explorer não cola | Navegador antigo sem suporte a colar arquivos | Usar "Anexar documentos" |
| Envio de vários arquivos falha com erro de serviço | `LimitRequestBody`/`max-request-size` abaixo de 20 MB | Ajustar os limites (4.4.1.4) |
| `.docx` recusado no BFF | BFF sem Apache POI, ou documento com macro | Instalar POI (Nexus) no BFF; salvar como `.docx` sem macro |
| Excel não baixa | Política do navegador bloqueando downloads `blob:` | Liberar o site na política de downloads |

### 4.5 Autenticação Atlante (somente se houver área logada)
Nada implementado: não há interceptor, guard ou tela de login funcional (o layout de login do template está em `base-de-conhecimento/paginas/pages/login/`, só como referência). Se o destino exigir área logada (R5):
- Interceptor de classe registrado em `HTTP_INTERCEPTORS` (R3) que define `withCredentials: true` em toda chamada a `apiBase`.
- Fluxo exclusivamente via BFF Atlante: `POST /j_security_check`, `/api-security/refresh`, `/api-security/me`, `/api-security/logout`, no mesmo padrão de cookies do app atual (`ng15-rreg-base-agente-regulatorio`). Nada de token em `localStorage`/`sessionStorage`.
- A chave `localStorage` `landing-analitica.color-mode` (`theme.service.ts`, `COLOR_MODE_STORAGE_KEY`) guarda só a preferência de tema; não é credencial. Renomear se o projeto mudar de nome.
- Se o fluxo do app atual não estiver claro, perguntar antes (R5/R11).

### 4.6 CI: Karma → Jest/Cypress
Runner atual: Karma/Jasmine pelo builder `@angular/build:karma` (R7). `karma.conf.js`: `browsers: ['Chrome']`, `singleRun: false`, `autoWatch: true`; no pipeline rode `npm run test:ci` (ou ajuste o arquivo para `singleRun: true` e um launcher `ChromeHeadlessCI` com `--no-sandbox`).
São 46 specs, todas do produto e da infraestrutura (as specs do template foram com as demos para `base-de-conhecimento/`). `npm run test:ci` roda todas uma vez, headless.
Se o CI exigir **Jest** ou **Vitest** (padrão do Angular 21+): usar `jest-preset-angular` compatível com Angular 20 ou o builder `@angular/build:unit-test` (versão exata do Nexus); as specs usam API Jasmine em dois pontos a trocar — `jasmine.createSpy(...).and.callFake(...)` e `spyOn(console, 'error')` em `waterfall-chart.component.spec.ts`; `jasmine.objectContaining(...)` em `period-filter.component.spec.ts` (→ `jest.fn()`, `jest.spyOn`, `expect.objectContaining`). Remover `@types/jasmine`/`karma-*` e trocar `tsconfig.spec.json` (`types: ["jest"]`). **E2E**: smoke Playwright em `e2e/` (pacote separado, `npm run e2e`; `docs/dependencias-e-ambiente.md` 1.5); Cypress não é usado.

### 4.7 Nome do projeto
Ocorrências de `landing-analitica` a renomear em bloco (se o destino usar outro nome):
`angular.json` (chave em `projects`, `outputPath: dist/landing-analitica`, três `buildTarget`), `package.json` (`name`), `karma.conf.js` (`coverage/landing-analitica`), `theme.service.ts` (`COLOR_MODE_STORAGE_KEY = 'landing-analitica.color-mode'`), `AGENTS.md` e `.rules/**` (títulos e textos), `.cursor/rules/regras-projeto.mdc` (`description`), `.agents/workflows/pronto.md`, `README.md`, `docs/**`.
Nome visível "Agenda Normativa": `app.component.ts` (`title`), `index.html` (`<title>`, `description`), `default-footer.component.html`, `default-layout.component.html` (texto e `aria-label` da marca), `core/export/xlsx-export.ts` (`workbook.creator`).

### 4.8 Base href, rotas limpas e imagem do servidor web (Nginx)
`index.html`: `<base href="/">` (front na raiz do domínio de cada ambiente, D2). `app.config.ts`: `provideRouter` sem `withHashLocation()` → URLs `/triagent`, `/scalation`, `/analitico`, `/triagent#tabela-analitica` (o fragmento é só âncora). Rota por hash é reprovada pelo padrão corporativo (ADR-023); `docs:check` acusa `withHashLocation`/`HashLocationStrategy` em `src/app`. Publicar em subcaminho (ex.: `/painel/`): `npx ng build --configuration production --base-href /painel/` e ajustar o `location` do Nginx.

Imagem (`Dockerfile` multi-stage, sem dependência nova no projeto):

| Estágio | Imagem | O que faz |
|---|---|---|
| `build` | `ARG NODE_IMAGE` — Node 22 do registry corporativo (o padrão `node:22` público é só provisório) | `npm ci --ignore-scripts=false` (`.npmrc` versionado + `--build-arg NPM_REGISTRY` + segredo BuildKit `npmrc` com o token, só neste estágio) e `npm run build:prod` |
| final | `ARG WEB_IMAGE` — Nginx não-root corporativo (o padrão `nginxinc/nginx-unprivileged:1.27-alpine` é só provisório) | Copia `dist/landing-analitica/browser` para `/usr/share/nginx/html` e `nginx/default.conf`; usuário não-root; porta **8080** |

`nginx/default.conf` (cabeçalhos de segurança em `nginx/security-headers.conf`, copiado para `/etc/nginx/snippets/` e incluído em cada `location` que define cabeçalho, porque `add_header` não é herdado):

- `try_files $uri $uri/ /index.html;` — qualquer caminho sem arquivo devolve `index.html` (abrir `/triagent` direto ou dar F5 não dá 404); arquivo de `assets/` inexistente responde 404 de verdade.
- `index.html` e `assets/env.json`: `Cache-Control: no-cache` (troca de versão e de ConfigMap valem no próximo carregamento); bundles com hash no nome (`*.js`, `*.css`, fontes): `max-age=31536000, immutable`.
- Cabeçalhos: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` e `Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`. `style-src` aceita `'unsafe-inline'` porque o Angular injeta os estilos dos componentes e o Chart.js põe `style` nos elementos; script inline não é aceito, por isso o build de produção desliga a inserção de CSS crítico (`angular.json`, `optimization.styles.inlineCritical: false`; o `onload` dela seria bloqueado). O download do Excel (link `blob:`) não precisa de diretiva. Validada no navegador em 2026-11-04 com os cabeçalhos exatos deste arquivo: Início, Triagent, Scalation, Analítico, chat e Excel, temas claro e escuro, nenhuma violação no console. BFF em outra origem (`apiBase` absoluto) exige incluí-la em `connect-src`.
- `gzip_types` inclui `text/javascript` (tipo dos `.js` nas versões novas do `mime.types` do Nginx), além de `application/javascript`.
- **`/api/` não passa pelo Nginx**: o Ingress do cluster roteia `/api/*` para o Service do BFF e o resto para este contêiner. Chamada a `/api/` que chega ao contêiner (Ingress sem a rota, teste local) recebe 404 de propósito (`location /api/`), em vez do `index.html`.
- Sem `server_tokens` (versão do Nginx oculta).

Apache 2.4 no lugar do Nginx (se o chassi exigir): `FallbackResource /index.html` no `VirtualHost`, os mesmos `Header set` e `Header set Cache-Control "no-cache"` em `<Files "index.html">` e `<Location "/assets/env.json">`.

Teste local da imagem: `docker build -t landing-analitica .` e `docker run --rm -p 8080:8080 landing-analitica`; abrir `http://localhost:8080/triagent` direto e dar F5; trocar a configuração com `-v "$PWD/meu-env.json:/usr/share/nginx/html/assets/env.json:ro"`.

### 4.9 Título e metadados em `index.html`
`<title>Agenda Normativa</title>`, `<meta name="description" content="Agenda Normativa: acompanhamento de normas por segmento, com gráficos e relatórios para download">`, `<meta name="theme-color" content="#223ad2" media="(prefers-color-scheme: light)">` e `#0f1319` para escuro (mesmos valores de `$brand-blue` e `$brand-dark-page` em `_brand.scss`), `<link rel="icon" href="assets/favicon.svg">`, `<noscript>`/"Carregando..." em pt-BR. Ajustar título/descrição ao produto; manter `lang="pt-BR"` (R12).

### 4.10 Marca e logo
A marca é HTML dentro de `<c-sidebar-brand>` em `default-layout.component.html`: símbolo oficial da instituição (`brand-mark-white.svg`) + "Agenda **Normativa**" (estilos `.brand-lockup`, `.brand-mark` e `.brand-name` em `_components.scss`). Favicon com o mesmo símbolo. No destino, se o padrão corporativo tiver arquivo oficial próprio do símbolo, trocar só os SVGs mantendo o recorte do `viewBox` (ADR-018).

### 4.11 Budget de estilos
`angular.json`: `anyComponentStyle` avisa em 2kb e falha em 4kb. Por isso o selo "N a classificar" dos cards de segmento foi para `src/scss/_stat-card.scss` e a lista do card de e-mails para `_emails-card.scss`; ao estender cards, mover regras para `src/scss/_components.scss` (global, sem budget por componente).

### 4.12 Dependências CommonJS
`allowedCommonJsDependencies: ["exceljs/dist/exceljs.min.js"]` evita o aviso de bundle (Chart.js 4 e `@coreui/chartjs` 4 são ESM). Ao instalar `jspdf` (PDF, R9), conferir o aviso e acrescentar à lista se for CommonJS.

### 4.13 Regras para IA: fonte única e ponteiros
Regras vivem em `AGENTS.md` (entrada e índice) e `.rules/` (texto vinculante, escopo, testes, erros, decisões). `CLAUDE.md`,
`GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/rules/regras.md` só apontam; `docs:check` (verificação 9) falha
se um deles ganhar texto de regra ou perder o ponteiro. Mudança de regra: editar só `AGENTS.md` ou `.rules/` (decisão D-001).
No destino, `npm run hooks:install` uma vez por clone. Windows: os hooks rodam no bash do Git for Windows; para
`npm run rules:check` fora do Git Bash, `npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`.

### 4.14 `scripts/docs-inventory.js` e o commit do template
A seção "Arquivos do projeto em relação ao template" usa o commit `36966f6` (CoreUI v4.3.13). Se o destino não for um repositório git próprio com esse commit, o script não falha: gera o resto do inventário e marca essa seção como indisponível. Para reativá-la: (a) importar o histórico (`git fetch` do repositório de origem antes do primeiro push); ou (b) definir `DOCS_TEMPLATE_COMMIT=<hash>` (por exemplo, o primeiro commit do destino; a seção passa a listar o que mudou desde o porte). `docs:check` falha se `docs/inventario.md` for mais antigo que `package.json`, `src/scss/_brand.scss`, `src/scss/_theme-dark.scss` ou `src/app/app.routes.ts`: regenerar após o porte.

---

## 5. Checklist pós-porte (nesta ordem)

```bash
# 1. Node 22 (`.nvmrc`), instalar exatamente o lock (ver 1.3 se falhar no Nexus) e ligar os hooks de git
nvm use
npm ci
npm run hooks:install

# 2. Build de produção sem erros (avisos de budget são aceitáveis; erros não)
npm run build:prod

# 3. Testes uma vez, sem janela
npm run test:ci

# 4. Nenhum host proibido no artefato (R6). Saída vazia = ok.
grep -rIl -e localhost -e appdes -e appuat dist/landing-analitica || echo "ok: sem hosts proibidos"
# Marca de terceiros na interface (R8): só é aceitável aparecer em dist/**/3rdpartylicenses.txt
grep -rIl "coreui.io" dist/landing-analitica | grep -v 3rdpartylicenses.txt || echo "ok: sem links CoreUI"
```

5. **Temas**: abrir `npx ng serve`, usar o seletor do header (Claro/Escuro/Automático). Conferir `document.documentElement.dataset.theme` e `dataset.coreuiTheme` (`light`/`dark`, sempre iguais), cards em gradiente legíveis nos dois temas, cores dos gráficos (Normativos Recebidos, Cascata, sparklines) trocando sem recarregar, preferência persistindo após F5.
6. **Responsivo 375–1440px**: menu lateral recolhe; header mostra data curta (`dd/mm/aaaa`) abaixo de `md` e longa acima; chips de filtro quebram linha sem scroll horizontal; cards de segmento 1/2/4 colunas; legenda do gráfico Normativos Recebidos 1 coluna em `xs` e 5 em `md`.
7. **Páginas e rotas**: `/` (Início), `/triagent`, `/scalation`, `/analitico`, `/dashboard` → redireciona para `/triagent`, `/qualquer-coisa` → `/` (inclusive antigas rotas de demo, ex.: `/base/cards`, `/404`, `/login`). Abrir cada endereço direto na barra e dar F5: nunca 404 do servidor (fallback de SPA, 4.8). Menu: Início, "Painéis" (Triagent e Scalation como grupos com subitens por seção) e Analítico; clicar num subitem rola até a seção logo abaixo do header e o grupo continua aberto; link direto (ex.: `/scalation#cascata`) abre o grupo e a seção. Breadcrumb com títulos em pt-BR.
8. **Normativos Recebidos**: Dia/Mês/Ano + chips "Últimos"; "Personalizado" valida (`Informe as duas datas.`, data inicial > final, limites 92 dias / 60 meses / 30 anos); clique na legenda destaca a série e filtra "Normas a Classificar · <segmento>"; valores escritos nos pontos; eixo Y sem números.
9. **Cascata**: mesmos filtros de período; `R$` / `% da receita`; `Gráfico` / `Tabela`; subtítulo do período igual ao do gráfico Normativos Recebidos; estado de erro se o JSON/API falhar.
10. **Fonte Inter carregando**: DevTools → Network filtrar `inter` (arquivos `inter-latin-*.woff2` com status 200); Computed → `font-family` de `body` começa por `Inter`.
11. **Console sem erros** nas 4 páginas e ao alternar tema, período, unidade (`R$`/`%`) e forma de exibição (`Gráfico`/`Tabela`).
12. **Agente da Agenda (chat)**: botão flutuante no canto inferior direito; abrir mostra boas-vindas e opções; "Recomeçar" começa desabilitado e habilita após a primeira interação; "Expandir" alarga o painel (some abaixo de 576 px); "Minimizar" (ou `Esc`) esconde e a bolinha verde aparece no botão; ao voltar, conversa e rascunho continuam. Com `chatMock: true`: perguntar "qual o prazo da resolução?" (resposta com Fontes), "oi" três vezes (contato `contato@compliance.com.br`), "como está o clima" (recusa), anexar `.pdf` (aceito) e um nome com "recusa" (recusado). Sob a resposta com Fontes: "Útil"/"Não útil" (uma vez; depois "Obrigado pelo feedback."); no BFF real, `POST /conforme/chat/feedback` responde 204. Teclado: Tab percorre as ações; foco visível. Sem erro no console. Em Windows, seguir também a verificação de 4.4.1.7 (saudação com nome e horário, colar print, vários arquivos e Word, Excel).
13. **Dados de produção**: preencher a coluna "Coluna em produção" e os domínios em `docs/mapeamento-de-dados.md`, ligar cada bloco por adaptador (seção 2 do documento) e fazer a conferência "reflete exatamente" (seção 6).
14. **Documentação**: `npm run docs:inventory` e `npm run docs:check` sem pendências; registrar o porte em `docs/changelog.md`.
15. **Smoke E2E** (automatiza parte dos itens 5, 7, 12 e o Excel): com o app no ar (`docker run --rm -p 4300:8080 landing-analitica`), `npm --prefix e2e ci` (ou `install`, até existir o lock de `e2e/`) e `npm run e2e`; em outro endereço, `E2E_BASE_URL=<url> npm run e2e`. Sem os navegadores do Playwright (download bloqueado), `E2E_CHROME_BIN=<caminho do Chrome ou Edge>`. Na esteira, roda contra DES (`Jenkinsfile`, estágio "E2E DES").

---

## 6. Como usar com Cursor, Antigravity, Claude Code e outras IAs

Toda ferramenta chega às mesmas regras:

| Ferramenta | Como carrega | Conferir |
|---|---|---|
| Cursor | `AGENTS.md` nativo + `.cursor/rules/regras-projeto.mdc` (`alwaysApply`, só ponteiro) | Painel de regras mostra `regras-projeto` |
| Antigravity | `AGENTS.md` nativo (IDE 1.20+) + `.agents/rules/regras.md` (`always_on`); `GEMINI.md` aponta para `AGENTS.md`; `/pronto` = `.agents/workflows/pronto.md` | Conversa nova: perguntar o comando de testes |
| Claude Code | `CLAUDE.md` importa `@AGENTS.md`; `.rules/` é aberto a pedido do `AGENTS.md` | `/memory` lista os dois |
| Copilot, Codex, Windsurf, Zed | `AGENTS.md` nativo | Perguntar o comando de testes |
| Gemini CLI | `GEMINI.md` | idem |

Abra **esta pasta** como raiz do workspace, nunca a pasta pai: lá há o clone do CoreUI 5.5 (mesmas versões, mas com as demos
e a marca CoreUI), que é só referência de layout e não o produto. Teste de leitura em sessão nova: "qual o comando de teste, o que você faz antes de declarar pronto
e qual o último erro registrado em `.rules/erros.md`?" — a resposta deve ser `npm run test:ci`, `npm run verify` e E-006.

Para a adaptação, peça para ler, nesta ordem: `AGENTS.md`, `.rules/projeto.md`, `docs/README.md`, este playbook,
`docs/arquitetura.md`, `docs/contratos-de-dados.md`, `docs/design-system.md`, `docs/dependencias-e-ambiente.md`, `docs/decisoes/`.

Prompt inicial sugerido (ajuste o cenário):

```text
Leia AGENTS.md e todos os arquivos de .rules/; depois docs/README.md, docs/portabilidade.md, docs/arquitetura.md,
docs/contratos-de-dados.md, docs/design-system.md e docs/dependencias-e-ambiente.md.
Não altere versões (R1), não crie endpoints sem OpenAPI (R4), não ponha hosts no código (R6).
Siga a seção 3.<A|B> e depois a seção 4 de docs/portabilidade.md; ao final rode o checklist da seção 5.
Toda mudança atualiza o doc correspondente (R13) e termina com npm run verify verde.
```

O `docs:check` confere, entre outros: documentos obrigatórios, pastas de `src/app/views/` em `arquitetura.md`, mocks em
`contratos-de-dados.md`, dependências em `dependencias-e-ambiente.md`, carimbos `tokens-hash`, `data-contract-hash` e
`inventory-hash`, ponteiros das ferramentas, números de ADR, partes mecânicas de R3/R6/R10 e frases vigiadas sobre o
código (`STALE_CLAIMS`). Lista completa em `docs/README.md`.
