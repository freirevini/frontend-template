# Arquitetura

Descrição do código do `landing-analitica` para quem vai copiá-lo para outro ambiente (Nexus, BFF, dados reais)
e adaptá-lo sem acesso a esta sessão. Tudo aqui é verificável lendo os arquivos citados. Regras do projeto:
`AGENTS.md` (índice) e `.rules/projeto.md` (texto vinculante). Termos de interface: `docs/glossario-ptbr.md`. Contratos de dados e receita de troca do
mock pela API: `docs/contratos-de-dados.md`.

## 1. Visão geral

| Item | Valor | Onde conferir |
|---|---|---|
| Base | CoreUI Free Angular Admin Template v4.3 (commit `36966f6`, v4.3.13), migrada para a infraestrutura do v5.5 em 2026-11-03 (ADR-021) | `docs/inventario.md`, `docs/planejamento/migracao-node22-angular20.md` |
| Framework | Angular 20.3.14, TypeScript 5.9.3, RxJS 7.8, zone.js 0.15, Node 22 (`^22.12.0`), npm `>= 10.9.4` | `package.json`, `.nvmrc` |
| UI | `@coreui/angular` 5.5.24, `@coreui/icons-angular` 5.5.24, `@coreui/angular-chartjs` 5.5.24, `@coreui/coreui` 5.4.3, Chart.js 4.5.1, `ngx-scrollbar` 13 | `package.json` |
| Arquitetura Angular | Componentes standalone (sem NgModule), `bootstrapApplication`, rotas de página em `views/<pasta>/routes.ts` carregadas por `loadChildren`, templates com `@if`/`@for` | `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts` |
| Estratégia de URL | Caminho limpo (`PathLocationStrategy`, padrão do `provideRouter`): `/triagent`, `/triagent#tabela-analitica` (o fragmento é só âncora de seção); `<base href="/">`; o servidor web devolve `index.html` para qualquer caminho desconhecido (`nginx/default.conf`, `try_files`). Rota por hash é reprovada pelo padrão corporativo (ADR-023) e `docs:check` acusa `withHashLocation` | `src/app/app.config.ts`, `src/index.html`, `nginx/default.conf` |
| Locale | `LOCALE_ID` = `pt-BR`, `DEFAULT_CURRENCY_CODE` = `BRL`, `registerLocaleData(localePt, 'pt-BR')` | `src/app/app.config.ts` |
| Título da aba | "Agenda Normativa" (`Title.setTitle` em `AppComponent`) | `src/app/app.component.ts` |
| HTTP | `provideAppHttpClient()` em `app.config.ts`; os serviços de dados leem os mocks de `assets/data` (`dataMock: true`) ou o BFF no contrato v1 pelo `ApiService` (`dataMock: false`, §2.4 de `contratos-de-dados.md`); o chat usa `ApiService` | `src/app/app.config.ts`, `core/services/api.service.ts` |
| Configuração por ambiente | Em tempo de execução: `src/assets/env.json` (`apiBase`, `loginUrl`, `chatMock`, `dataMock`, `footerEntities`) lido antes do bootstrap por `RuntimeConfigService`; a mesma imagem é promovida entre ambientes e cada um monta o seu `env.json` (ConfigMap). `environment.ts`/`environment.prod.ts` só com `production`. Proxy `/api` só no `ng serve` | `src/assets/env.json`, `src/app/core/config/`, `src/environments/`, `proxy.conf.json` |
| Imagem | `Dockerfile` multi-stage: build com Node 22 (`ARG NODE_IMAGE`), runtime Nginx não-root (`ARG WEB_IMAGE`) servindo `dist/landing-analitica/browser` na porta 8080; `/api` é roteado pelo Ingress, não pelo Nginx | `Dockerfile`, `nginx/default.conf`, `.dockerignore` |
| Orçamentos de build | `initial` 1500kb aviso / 6mb erro; `anyComponentStyle` 2kb aviso / **4kb erro** | `angular.json` → `configurations.production.budgets` |

### Páginas do produto

| Página (menu) | URL | Rotas lazy (`routes.ts`) → componente | Pasta | Estado |
|---|---|---|---|---|
| Início | `/` | `HomeComponent` | `src/app/views/home` | Visão geral dos quatro segmentos (`<app-segment-overview>`: nome, ícone e cor do segmento, tendência, normas e a classificar) |
| Triagent | `/triagent` | `DashboardComponent` | `src/app/views/dashboard` | Painel (cards de segmento, Normativos Recebidos, Normas Aplicáveis, Assunto das Normas Aplicáveis, Fluxo de e-mail - Triagem, Tabela Analítica) |
| Scalation | `/scalation` | `ScalationComponent` | `src/app/views/scalation` | Cards de segmento (tom petróleo, sem filtro), Cascata do resultado e card "Tráfego e vendas" (sobra do template) |
| Analítico | `/analitico` | `AnalyticsComponent` | `src/app/views/analytics` | Vazia |

Redirecionamentos (`src/app/app.routes.ts`): `/dashboard` → `/triagent` (`pathMatch: 'full'`, mantém
favoritos antigos) e `**` → `/` (qualquer endereço desconhecido, inclusive as antigas rotas de demo como
`/base/cards`, `/404` ou `/login`, volta ao Início). As páginas de demonstração do template estão em `base-de-conhecimento/`
(fora do build; ADR-016, R14).

"Triagent" e "Scalation" são nomes próprios do produto e não se traduzem. A pasta do Triagent continua se chamando
`views/dashboard` (nome herdado do template); a rota é `triagent`.

## 2. Diagrama de roteamento e rotas lazy

```
main.ts — bootstrapApplication(AppComponent, appConfig)   AppComponent: <router-outlet />
└── app.config.ts — provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top',
    │               anchorScrolling: 'enabled' }), withEnabledBlockingInitialNavigation())  [caminho limpo, sem hash];
    │               RuntimeConfigService.load() (assets/env.json, antes do bootstrap); ViewportScroller.setOffset
    │               (header fixo); provideHttpClient(); provideAnimations(); LOCALE_ID pt-BR; DEFAULT_CURRENCY_CODE BRL;
    │               FOOTER_ENTITIES ← footerEntities do env.json
    └── app.routes.ts
        ├── ''            DefaultLayoutComponent   data.title = 'Início'        [eager, standalone]
        │   ├── ''        (pathMatch full, data.title = '')  → lazy views/home/routes.ts        PRODUTO
        │   │       └── '' HomeComponent → <app-segment-overview>  (views/widgets/segment-overview)
        │   ├── triagent                                     → lazy views/dashboard/routes.ts   PRODUTO
        │   │       └── '' DashboardComponent  data.title = 'Triagent'
        │   │           ├── <app-widgets-dropdown>   (views/widgets/widgets-dropdown)
        │   │           ├── card "Normativos Recebidos"  + <app-period-filter> + <c-chart> + legenda interativa
        │   │           ├── <app-applicability-chart> + <app-themes-list>  (período do gráfico acima + filtros cruzados)
        │   │           ├── <app-emails-chart>       (+ <app-period-filter> próprio; recebe segmentFilter)
        │   │           └── <app-analytic-table>     (todos os filtros da página; Exportar Excel)
        │   ├── scalation                                    → lazy views/scalation/routes.ts   PRODUTO
        │   │       └── '' ScalationComponent  data.title = 'Scalation'
        │   │           ├── <app-widgets-dropdown tone="petrol">
        │   │           ├── <app-waterfall-chart>    (+ <app-period-filter> próprio)
        │   │           └── sobra do template: card "Tráfego e vendas"
        │   ├── analitico                                    → lazy views/analytics/routes.ts   PRODUTO
        │   └── dashboard  (pathMatch full)                  → redirectTo 'triagent'
        └── **        → redirectTo ''

(Páginas de demo do template: base-de-conhecimento/, fora do build — ver R14.)
```

Sem NgModules: cada componente declara em `imports` o que usa (componentes CoreUI, `ChartjsComponent`, `IconDirective`,
outros componentes do produto). `HomeComponent`, `DashboardComponent` e `ScalationComponent` importam diretamente
`SegmentOverviewComponent` / `WidgetsDropdownComponent` de `views/widgets/`; `DashboardComponent`, `EmailsChartComponent` e
`WaterfallChartComponent` importam `PeriodFilterComponent`. Cada página carrega só o que importa (chunk lazy próprio).

## 3. Mapa de pastas

### Raiz e configuração

| Caminho | Propósito |
|---|---|
| `angular.json` | Projeto `landing-analitica`; estilos globais (`@fontsource/inter` 400/500/600/700 + `src/scss/styles.scss`); assets `src/assets`; builders `@angular/build` (`application`, `dev-server`, `karma`, `extract-i18n`); `allowedCommonJsDependencies` só para `exceljs/dist/exceljs.min.js`; `stylePreprocessorOptions.sass.silenceDeprecations: ['import']`; `proxyConfig: proxy.conf.json` no serve. |
| `proxy.conf.json` | Proxy de `/api` para `http://HOST_DEV_BFF:PORTA` (placeholder a trocar localmente; nunca versionar host real — R6). |
| `Dockerfile`, `.dockerignore` | Imagem única promovida entre ambientes. Estágio `build`: `ARG NODE_IMAGE` (Node 22 do registry corporativo; `node:22` público só como valor provisório), `npm ci --ignore-scripts=false`, `npm run build:prod`. Estágio final: `ARG WEB_IMAGE` (Nginx não-root; `nginxinc/nginx-unprivileged:1.27-alpine` provisório até a imagem corporativa), copia `dist/landing-analitica/browser` e `nginx/default.conf`, porta 8080. |
| `nginx/default.conf`, `nginx/security-headers.conf` | Servidor web da imagem: `listen 8080`; `gzip_types` com `text/javascript`; `try_files $uri $uri/ /index.html` (fallback de SPA para as rotas limpas); `index.html` e `assets/env.json` sem cache; bundles com hash no nome com cache longo (`immutable`); cabeçalhos `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e CSP com `default-src`/`script-src`/`connect-src 'self'` e `style-src 'self' 'unsafe-inline'` (texto exato e motivo em `docs/portabilidade.md` 4.8; o build de produção desliga `inlineCritical` para não haver script inline); `/api/` não é encaminhado daqui (o Ingress roteia para o BFF; se a chamada chegar ao contêiner, 404). |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json` | `strict`, `strictTemplates`, `typeCheckHostBindings`, target ES2022, `module: preserve`, `moduleResolution: bundler`, `isolatedModules`; sem `skipLibCheck`; sem aliases de caminho (o antigo `@docs-components/*` foi para a base de conhecimento com `src/components`). |
| `karma.conf.js` | Runner Karma + Jasmine (builder `@angular/build:karma`, specs descobertas sem `test.ts`), Chrome, reporters `progress` e `kjhtml`, cobertura em `coverage/landing-analitica`. |
| `scripts/docs-check.js`, `scripts/docs-inventory.js` | Verificação e inventário da documentação viva (R13): `npm run docs:check`, `npm run docs:inventory`. |
| `AGENTS.md`, `.rules/` | Regras para qualquer IA: `AGENTS.md` (entrada, comandos, índice com uma linha por regra) e `.rules/` (`projeto.md` texto vinculante, `escopo.md`, `testes.md`, `erros.md`, `decisoes.md`, `check.sh`). |
| `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/` | Ponteiros de cada ferramenta para `AGENTS.md` (sem texto de regra; `docs:check` verificação 9). `.agents/workflows/pronto.md` = checklist `/pronto` do Antigravity. |
| `.githooks/`, `.nvmrc` | Hooks de git (`pre-commit`: `docs:check` + `rules:check`; `commit-msg`: correção exige entrada em `.rules/erros.md` e teste), instalados por `npm run hooks:install`; `.nvmrc` = 22 para `nvm use`. |
| `docs/` | Documentação em pt-BR (este arquivo, glossário, inventário gerado, contratos, mapeamento, `paginas/` com uma ficha por página para porte isolado — R15). |

### `src/`

| Caminho | Propósito |
|---|---|
| `src/main.ts` | `bootstrapApplication(AppComponent, appConfig)`; referencia `@angular/localize`. |
| `src/index.html` | `<html lang="pt-BR">`, `<base href="/">` (D2: front na raiz do domínio; em subcaminho, `ng build --base-href /caminho/`), `theme-color` claro/escuro, favicon `assets/favicon.svg`, spinner "Carregando...". |
| `src/environments/environment.ts` / `environment.prod.ts` | Só flags de build: `{ production }`. `fileReplacements` troca um pelo outro no build de produção. O que muda por ambiente fica em `src/assets/env.json`. |
| `src/declarations.d.ts` | Declarações de módulos sem tipos. |

### `src/app/`

| Caminho | Propósito |
|---|---|
| `app.config.ts` | Providers da aplicação: roteador com caminho limpo e rolagem por âncora, leitura de `assets/env.json` antes do bootstrap (`provideAppInitializer` → `RuntimeConfigService.load()`), `FOOTER_ENTITIES` a partir de `footerEntities`, `MOCK_SOURCES` a partir de `dataMock`/`chatMock` (selo "Dados simulados"), deslocamento do header fixo (`ViewportScroller.setOffset`), `provideAppHttpClient()` (`HttpClient` com interceptor de erros/401 e CSRF; §12), `provideAnimations()`, serviços de `SidebarModule`/`DropdownModule`, `IconSetService`, locale e moeda; `registerLocaleData` do pt-BR. |
| `app.routes.ts` | Todas as rotas de primeiro nível (ver §2). |
| `app.component.ts` | `<router-outlet>`; define o título da aba, carrega `iconSubset` no `IconSetService` e injeta `ThemeService` para aplicar o tema salvo no bootstrap. O `ngOnInit` assina `router.events` sem efeito (sobra do template). |
| `core/config/runtime-config.service.ts` (+ `.spec.ts`) | `RuntimeConfig` (`apiBase`, `loginUrl`, `chatMock`, `dataMock`, `footerEntities`), `defaultRuntimeConfig(production)` e `DEFAULT_RUNTIME_CONFIG` (padrões do build: `chatMock`/`dataMock` `true` no de desenvolvimento e `false` no de produção, para uma imagem sem ConfigMap nunca mostrar dado fictício como real), `RUNTIME_CONFIG_DEFAULTS` (token com esses padrões, trocado nos testes), `parseRuntimeConfig(raw, defaults)` (chave ausente ou de tipo errado mantém o padrão, uma a uma; corpo que não é objeto registra um `console.error` sem detalhes) e `RuntimeConfigService` (`load()` lê `assets/env.json` por `HttpBackend`, sem interceptors; falha → padrões seguros e um `console.error` sem detalhes; `config` é lido pelo `ApiService`, pelos serviços de dados (`dataMock`), pelo `CHAT_API_CONFIG` e pelo `FOOTER_ENTITIES`). `FooterEntity` mora aqui e é reexportado pelo rodapé. |
| `core/navigation/section-scroll.ts` | `SectionScrollService` (mantém a seção do `#fragment` alinhada enquanto a página carrega) e `stickyHeaderOffset()` (altura do header fixo, usada também pelo `ViewportScroller.setOffset` de `app.config.ts`). |
| `containers/default-layout/` | Layout padrão: `default-layout.component.{ts,html}` (sidebar + header + body + footer; segue âncoras e abre o grupo ativo do menu), `_nav.ts` (itens do menu, com subitens por seção), `default-header/`, `default-footer/`, `index.ts` (barrel). Ver §4. |
| `containers/index.ts` | Barrel de `default-layout`. |
| `core/services/theme.service.ts` (+ `.spec.ts`) | Tema claro/escuro/automático. Ver §5. |
| `core/services/api.service.ts` (+ `.spec.ts`) | Serviço base de API (R4): `get`, `post` (JSON ou `FormData`), `postMultipart`, `delete` e, para quem lê cabeçalhos, `getResponse` e `postMultipartResponse` (resposta inteira; o chat lê o `Retry-After` da quarentena), com `apiBase` da configuração de execução (`RuntimeConfigService`) + `/v1` (`API_VERSION_PREFIX`) + caminho do recurso do contrato, sem `withCredentials` (mesma origem). Usado pelo chat, pelo `UserService` e, com `dataMock: false`, por todos os serviços de dados (Fase 5); parâmetro de query com lista repete a chave (`sort=a&sort=b`). |
| `core/services/user.service.ts` (+ `.spec.ts`) | `UserService.firstName$()`: `GET /v1/usuarios/me` → `primeiroNome` ('' se ausente ou em falha), só em memória; usado pela saudação do chat fora do mock. |
| `core/http/` (+ specs) | Camada HTTP (§12): `api-error.interceptor.ts` (`apiErrorInterceptor`, `provideAppHttpClient`, `isApiUrl`), `api-problem.ts` (`ApiProblem`, `toApiProblem`, `apiProblemText`), `login-redirect.service.ts` (`LoginRedirectService`, `LOGIN_RETURN_PARAM`, `BROWSER_NAVIGATE`, `LOGIN_REDIRECT_AT_KEY`, `LOGIN_LOOP_WINDOW_MS`), `session-expired-notice.component.ts` (`<app-session-expired-notice>`, no layout: texto do 401 e link "Entrar novamente" quando o redirecionamento foi contido), `http-error-texts.ts` (`HTTP_ERROR_TEXTS`, `SUPPORT_CODE_TEXT`, `supportCodeText`, `EXPORT_LIMIT_TEXT`, `EXPORT_MAX_ROWS`, `exportLimitText`), `api-page.ts` (`SpringPage`, `DataPage`, `fromSpringPage`, `localPage`, `collectPages`, `MAX_PAGE_SIZE`; Fase 5), `api-error-text.component.ts` (`<app-api-error-text [error] [fallback]>`: texto pt-BR do erro de um bloco e "Código de suporte: …"; `loadErrorMessage` em `api-problem.ts`). |
| `chat/` | Chat flutuante do agente de normas (em implementação, `docs/planejamento/chat-widget.md`). Widget, mensagens, entrada (componentes standalone), serviços de API e de sessão, servidor mock e markdown próprio. Ver §11. |
| `icons/icon-subset.ts` | Subconjunto de `@coreui/icons` registrado no `IconSetService` (`cil*`, `cib*`, `cif*`). Ícone novo precisa ser adicionado ao objeto `iconSubset` e ao `enum IconSubset`. Ícones do produto: `cilHome`, `cilSpeedometer`, `cilLayers`, `cilChartLine`, `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`, `cilArrowTop/Bottom`, `cilCloudDownload`, `cilCalendar`, `cilList`, `cilSun`, `cilMoon`, `cilContrast`, `cilMenu`. |
| `views/` | Uma pasta por página (`routes.ts` + componente). Classificação abaixo. |

### `src/app/views/` — PRODUTO

| Pasta | Conteúdo |
|---|---|
| `views/home` | `routes.ts` (`''`, `title: ''`), `HomeComponent` (`h1` oculto + `<app-segment-overview>`). Página "Início". |
| `views/dashboard` | Página **Triagent**. `routes.ts` (`''`, `title: 'Triagent'`), componentes standalone `DashboardComponent`, `ApplicabilityChartComponent`, `ThemesListComponent`, `EmailsChartComponent`, `AnalyticTableComponent`, `dashboard.component.{ts,html,scss}` (card Normativos Recebidos + legenda), `dashboard-charts-data.ts` (estado e configuração do gráfico Normativos Recebidos; valores mock ou do BFF por `setTrafficData`), `traffic/` (`traffic-data.service.ts` com `TrafficResponse` e `TrafficDataService`, `traffic.adapter.ts`), `v1-domains.ts` (domínios e parâmetros do contrato v1 comuns aos adaptadores), `traffic-value-labels.plugin.ts` (plugin Chart.js), `period/period-range.ts` (helpers de período), `period-filter/` (componente `<app-period-filter>`), `waterfall/` (Cascata: `waterfall.model.ts`, `waterfall-derive.ts`, `waterfall-data.service.ts`, `waterfall-format.ts`, `waterfall-chart.component.{ts,html,scss}`), `classification/` (Classificação das normas: `classification.model.ts`, `classification-derive.ts`, `classification-data.service.ts`, `classification.adapter.ts`, `classification-view.base.ts`, `applicability-chart.component.{ts,html}`, `themes-list.component.{ts,html}`), `emails/` (E-mails de sugestão: `emails.model.ts`, `emails-derive.ts`, `emails-data.service.ts`, `emails.adapter.ts`, `emails-chart.component.{ts,html,scss}`). Specs ao lado de cada arquivo. |
| `views/scalation` | `routes.ts` (`''`, `title: 'Scalation'`), `ScalationComponent` e `WaterfallChartComponent` (standalone). Página **Scalation**: `<app-widgets-dropdown tone="petrol" [filterable]="false">` (cópia dos cards de segmento, mesmos dados, outra cor, selo só texto), `<app-waterfall-chart>` (pasta `waterfall/`, §6.4) e o card "Tráfego e vendas" (HTML estático do template, sem TypeScript). |
| `views/analytics` | `routes.ts` (`''`, `title: 'Analítico'`), componente vazio. URL `/analitico`. |

### Páginas de demonstração do template → `base-de-conhecimento/` (fora do build)

As telas de demonstração do CoreUI (menu antigo "Tema", "Componentes", "Extras": cores, tipografia, base, botões,
formulários, gráficos, ícones, notificações, widgets, entrar, cadastro, 404, 500) saíram do app em 2026-10-28 (ADR-016,
regra R14) e estão em `base-de-conhecimento/paginas/`, com o invólucro de documentação (`base-de-conhecimento/docs-components/`,
antigo `src/components`) e `estilos/_examples.scss`. Não estão no menu, nas rotas, no build nem nos testes. Índice e receita
de reaproveitamento: `base-de-conhecimento/README.md`.

Em `src/app/views/widgets/` ficam só os componentes do produto: `widgets-dropdown/` (cards de segmento do Triagent e do
Scalation) e `segment-overview/` (visão geral dos segmentos no Início), componentes standalone importados pelas páginas
(sem rotas próprias). A demo `ChartSample` que ficava no arquivo de `widgets-dropdown` saiu na migração (ADR-021).

### `src/scss/`

| Arquivo | Propósito |
|---|---|
| `styles.scss` | Ponto de entrada: `brand` → `variables` → CoreUI → `@coreui/chartjs` → `layout` → `fixes` → `theme-dark` → `custom` (`examples` saiu com as telas de demo). |
| `_brand.scss` | Tokens da marca (única fonte de cores, raios, elevações, fonte Inter). Variáveis SCSS `$brand-*` e CSS `--brand-*`, `--app-chart-*`, `--app-series-1..4`, `--app-series-reference`, `--app-wf-total-1..3`, `--app-wf-decrease-1..3`, `--app-wf-connector`, `--app-export-accent`, `--app-export-muted` (planilhas, sem valor escuro) no `:root` (tema claro). |
| `_variables.scss` | Sobrescritas das variáveis SCSS do CoreUI 5 a partir dos tokens (inclui `$body-secondary-color`, `$body-tertiary-color`, `$body-emphasis-color`, `$sidebar-brand-color`). |
| `_theme-dark.scss` | Valores do tema escuro sob `:root[data-theme="dark"]`: repõe `--brand-*`, `--app-*` e `--cui-*` (globais e por componente: `.sidebar`, `.header`, `.footer`, `.card`, `.dropdown-menu`, `.table`, formulários etc.). |
| `_custom.scss` | Importa `typography`, `components`, `filter-chips`. |
| `_typography.scss` | Tipografia (Inter). |
| `_components.scss` | Cromado dos componentes sobre os tokens: sidebar, header, footer, `.card`, `.btn`, `.brand-icon-btn` (botão quadrado só com ícone), `.brand-segmented` (controle segmentado Dia/Mês/Ano), `.progress-thin`, controles de formulário, `prefers-reduced-motion`. |
| `_filter-chips.scss` | Chips de filtro compartilhados por Normativos Recebidos e Cascata: `.filter-bar`, `.filter-chip` (`.is-active`, `:disabled`), `.filter-date`; variantes em `[data-theme="dark"]`. Não renomear as classes. |
| `_layout.scss`, `_fixes.scss` (importa `_scrollbar.scss` e `_charts.scss`) | Herdados do template: layout e correções (`_examples.scss` foi para `base-de-conhecimento/estilos/`). `_charts.scss` estiliza o tooltip externo do `@coreui/chartjs` com os tokens. |

### `src/assets/`

| Caminho | Propósito |
|---|---|
| `assets/env.json` | Configuração de execução versionada com padrões seguros de dev, sem host: `{ "apiBase": "/api", "loginUrl": "/api/v1/autenticacao/login", "chatMock": true, "dataMock": true, "footerEntities": [] }`. Em cada ambiente, um ConfigMap montado em `/usr/share/nginx/html/assets/env.json` substitui o arquivo (ver `portabilidade.md`). |
| `assets/data/dashboard-waterfall.json` | Mock em arquivo: base anual da Cascata (ver `docs/contratos-de-dados.md`). |
| `assets/data/dashboard-emails.json` | Mock em arquivo: e-mails de sugestão de classificação de 2021 (176 e-mails, 812 normas; ver `docs/contratos-de-dados.md`). |
| `assets/img/brand/brand-mark-white.svg`, `brand-mark.svg` | Símbolo oficial da instituição (do site institucional; branco para a sidebar, azul `#002bab` para fundos claros), recortado ao desenho. |
| `assets/img/brand/brand-logo-white.svg` | Logotipo da instituição (símbolo + palavra) em branco, do rodapé do site institucional, `viewBox` recortado ao desenho. Só no rodapé. |
| `assets/favicon.svg` | Favicon próprio (R8). |
| `assets/images/angular.jpg` | Imagem das telas demo. |

## 4. Layout padrão (`src/app/containers/default-layout`)

- `default-layout.component.html`: `<c-sidebar visible colorScheme="dark" class="sidebar sidebar-fixed">` com `<c-sidebar-brand>`
  (conteúdo próprio, sem `brandFull`/`brandNarrow`: `<a routerLink="/" class="brand-lockup">` com `<img class="brand-mark"
  src="assets/img/brand/brand-mark-white.svg">` e `<span class="brand-name">Agenda <strong>Normativa</strong></span>`),
  e `<ng-scrollbar pointerEventsMethod="scrollbar" visibility="hover">` (`ngx-scrollbar`, como no CoreUI 5.5) envolvendo
  `<c-sidebar-nav [navItems]="navItems" dropdownMode="none">`. `colorScheme="dark"` faz a sidebar azul-marinho usar as cores
  claras de texto do CoreUI 5 nos dois temas. Sem `<c-sidebar-toggler>`:
  o botão de recolher no rodapé da sidebar foi removido e o modo estreito (`unfoldable`/`narrow`) não é usado. A sidebar só
  abre/fecha pelo botão de menu do header (`cSidebarToggle`, telas pequenas).
  Área principal: `<app-default-header class="header header-sticky" sidebarId="sidebar">`, `<c-container breakpoint="lg">`
  com `<router-outlet>`, `<app-default-footer>`. O seletor do componente é `app-dashboard` (nome herdado do template).
- `_nav.ts`: `INavData[]` do menu. Ordem: Início (`/`, `routerLinkActiveOptions.exact` para não ficar ativo em todas as
  páginas); título "Painéis"; grupo **Triagent** com subitens Normas por segmento (`#segmentos`), Normativos Recebidos
  (`#normativos-recebidos`), Normas Aplicáveis (`#normas-aplicaveis`), Assunto das Normas Aplicáveis (`#assunto-das-normas`),
  Fluxo de e-mail - Triagem (`#fluxo-de-email`), Tabela Analítica (`#tabela-analitica`); grupo **Scalation** com Normas por
  segmento (`#segmentos`), Cascata do resultado (`#cascata`), Tráfego e vendas (`#trafego-e-vendas`); Analítico. Subitens
  criados por `section(nome, url, fragment)`: mesmo caminho da página + `linkProps.fragment`, destaque com
  `{ paths: 'exact', fragment: 'exact' }` (só a seção escolhida fica ativa). Os ids das seções estão nos templates das páginas
  (comentário no topo de `dashboard.component.html` e `scalation.component.html`); elementos customizados alvo recebem
  `.page-section` (`display: block`, `_components.scss`). Seção nova = id no template + subitem aqui + teste em `_nav.spec.ts`.
- Navegação por seção: o roteador rola até a âncora (`withInMemoryScrolling({ anchorScrolling: 'enabled' })` e
  `ViewportScroller.setOffset(() => [0, stickyHeaderOffset()])` em `app.config.ts`). Como os cards de cima carregam dados depois e empurram a seção, `SectionScrollService`
  (`core/navigation/section-scroll.ts`) realinha a seção quando a altura da página muda, por até 2,5 s, e para ao primeiro
  gesto do usuário (roda, toque, tecla, clique). `DefaultLayoutComponent` chama `follow(fragment)` a cada `NavigationEnd`.
- Limite do CoreUI (visto no 4.x, mantido no 5.5 por segurança): `SidebarNavGroupComponent.samePath` compara a URL quebrada por "/", então "/triagent#secao" não
  casa com o grupo "/triagent" e o grupo fecharia a cada subitem. Por isso `dropdownMode="none"` (grupos abrem/fecham só no
  clique) e `openActiveGroup()` no layout, após cada navegação, abre o grupo que contém o link ativo (link direto com âncora). No
  CoreUI 5 a classe `show` do grupo não reflete o estado (o `routerLinkActive` do próprio componente a tira), então o grupo
  conta como aberto também quando a lista de subitens tem altura (E-006).
  Clique no menu não limpa os filtros do Triagent (`.sidebar` na exceção de `onDocumentClick`).
- `default-header/`: estende `HeaderComponent` do CoreUI (standalone, `imports` com os componentes de header, dropdown e breadcrumb). Mostra apenas: botão de alternar sidebar (`cHeaderToggler`,
  `aria-label="Alternar menu lateral"`), o selo "Dados simulados" (só com `dataMock` ou `chatMock` ligado; `MOCK_SOURCES`, `mockSourcesText`; estilo `.brand-mock-badge` em `src/scss/_components.scss`, tokens `--brand-warning*`), a data de hoje e o seletor de tema; abaixo do divisor, `<c-breadcrumb-router>`.
  - Data: `today$ = interval(60_000).pipe(startWith(0), map(() => toHeaderDate(new Date())), distinctUntilChanged(iso))`
    renderizada em `<time [attr.datetime]="iso">`, texto longo (`Intl.DateTimeFormat('pt-BR', {weekday:'long', day, month:'long', year})`)
    em `md+` e curto (`dd/mm/aaaa`) abaixo. `toHeaderDate` é exportado e testado.
  - Tema: `<c-dropdown alignment="end" variant="nav-item">` com três `cDropdownItem` (Claro `cilSun`, Escuro `cilMoon`,
    Automático `cilContrast`) → `themeService.setMode(mode)`; o ícone do botão segue `colorMode$`.
- `default-footer/`: estende `FooterComponent`; faixa azul-marinho no estilo do rodapé do site institucional, reduzida ao logotipo (`brand-logo-white.svg`, `alt` "Logotipo da instituição"), a linha "Copyright © {{ currentYear }} todos os direitos reservados" e, só quando a lista não está vazia, razão social, CNPJ e endereço de cada entidade de `FOOTER_ENTITIES` (`InjectionToken<FooterEntity[]>`, `{ name, cnpj, address }`; `app.config.ts` fornece `footerEntities` da configuração de execução `assets/env.json`, vazio no arquivo versionado; dado legal nunca versionado). Sem selos de segurança nem links.

### Breadcrumbs

`<c-breadcrumb-router>` usa `BreadcrumbRouterService` do `@coreui/angular` 5.5, que percorre a árvore de
`ActivatedRoute` a cada `NavigationEnd` e cria um item por rota com `label = route.snapshot.data['title'] || ''`.
O `BreadcrumbRouterComponent` só renderiza itens com `label` preenchido e cuja URL termina em `/` ou seja o último.
Consequências:

- A rota raiz `''` (`DefaultLayoutComponent`) tem `data.title = 'Início'` → primeiro item "Início" com link para `/`.
- A rota filha `''` de `views/home/routes.ts` tem `data.title = ''` de propósito: sem isso ela herdaria/repetiria "Início" e a
  trilha mostraria "Início / Início" na página inicial. Com título vazio o item é descartado e sobra só "Início".
- Em `/triagent` a trilha é "Início / Triagent" (título vem de `views/dashboard/routes.ts`). Mesma lógica para
  "Scalation" e "Analítico". Página nova precisa de `data.title` em pt-BR na sua rota (R12 e glossário).

## 5. Tema (`src/app/core/services/theme.service.ts`)

O projeto tem o próprio modo de cor desde o CoreUI 4 (que não tinha); no CoreUI 5 o `ThemeService` continua a única fonte e
o `ColorModeService` do CoreUI não é usado (R10, ADR-003, ADR-021).

| Aspecto | Implementação |
|---|---|
| Tipos | `ColorMode = 'light' \| 'dark' \| 'auto'`; `AppliedTheme = 'light' \| 'dark'`. |
| Persistência | `localStorage` com a chave exportada `COLOR_MODE_STORAGE_KEY = 'landing-analitica.color-mode'`; leitura e escrita em `try/catch` (modo privado); valor inválido ou ausente → `'light'`. É só a preferência visual (não é token — R5). O único outro valor guardado é o horário da última ida à entrada corporativa em `sessionStorage` (`LoginRedirectService`, §12). |
| Aplicação | `apply()` grava `data-theme="light|dark"` e `data-coreui-theme="light|dark"` (os componentes CoreUI 5 trocam os próprios `--cui-*` por esse atributo; os tokens da marca de `_theme-dark.scss` vencem por especificidade) no `<html>` e alterna a classe `dark-theme`. |
| Modo automático | `matchMedia('(prefers-color-scheme: dark)')`; listener `change` recalcula quando `mode === 'auto'`; removido em `ngOnDestroy`. |
| Observáveis | `mode$: Observable<ColorMode>` (preferência escolhida) e `appliedTheme$: Observable<AppliedTheme>` (tema efetivo), ambos `BehaviorSubject`. Componentes com canvas assinam `appliedTheme$` para redesenhar. |
| Chart.js | `applyChartDefaults()` lê os tokens `--app-chart-color`, `--app-chart-grid-color`, `--app-chart-font-family`, `--app-chart-tooltip-bg`, `--app-chart-tooltip-color` via `getComputedStyle(documentElement)` e faz `import('chart.js')` dinâmico (mantém o Chart.js fora do bundle inicial); registra `registerables`, escreve `Chart.defaults.color/borderColor/font.family` e `Chart.defaults.plugins.tooltip.*` (padding 10, raio 8, título com peso numérico 600, exigência de tipo do Chart.js 4) e chama `chart.update('none')` em todas as instâncias. |
| Instanciação | `providedIn: 'root'`; injetado no construtor de `AppComponent` só para aplicar o tema salvo no bootstrap. |

Cores em `src/scss/_theme-dark.scss` (ver §3). Regra para componentes: usar `var(--cui-*)`, `var(--brand-*)` ou
`var(--app-*)`; nunca cor fixa fora de `_brand.scss`, `_variables.scss`, `_theme-dark.scss`. Fallbacks hex dentro
dos componentes de gráfico existem só para canvas destacado/testes.

## 6. Triagent: componentes (`src/app/views/dashboard`)

Ordem no template `dashboard.component.html`: cards de segmento → card "Normativos Recebidos" →
`<app-emails-chart [segmentFilter]="segmentFilter">`. A Cascata e o card "Tráfego e vendas" estão em `/scalation`; os cards de redes sociais, em `/`.

### 6.1 Cards de segmento (`views/widgets/widgets-dropdown`)

- `<c-widget-stat-a class="brand-stat-card">` em `<c-col sm="6" xl="3">` gerados por `@for` sobre `segments`, na ordem do
  arquivo de dados (alfabética: Atacado `cilTruck`, Corporativo `cilBuilding`, Plataforma `cilDevices`, Varejo `cilCart`).
  Templates `widgetTitleTemplate` (ícone + nome), `widgetValueTemplate` (total de normas + selo
  `<span class="brand-stat-pending">` "N a classificar") e `widgetChartTemplate` (`<c-chart type="line" height="70">`).
  Não há porcentagem de variação nos cards.
- Entradas de aparência: `@Input() tone: 'primary' | 'petrol'` (padrão `'primary'`; `'petrol'` põe a classe `.tone-petrol` no host via `@HostBinding`) e `@Input() filterable = true` (com `false`, o selo "N a classificar" é `<span>` e não emite `toClassifySelect`). Triagent usa o padrão; Scalation, `tone="petrol" [filterable]="false"`.
- Dados: `SegmentCardsService.getSegments()` (`segment-cards.service.ts`, mesmo diretório) lê
  `src/assets/data/dashboard-segments.json` (`dataMock: true`) ou `GET /v1/segmentos` + `fromSegmentosV1`
  (`segment-cards.adapter.ts`, `dataMock: false`) e valida com `validateSegmentCards` (inteiros ≥ 0, a classificar ≤ total).
  Cards que pedem juntos dividem o mesmo pedido (`share()` por origem); depois da resposta nada fica em cache e a próxima
  tela pede de novo.
  Erro de carga ou validação: cards somem e aparece "Não foi possível carregar os segmentos." ou o texto do status, com o
  código de suporte (`<app-api-error-text>`, `role="alert"`).
- "A classificar" é a fotografia atual por segmento (`asOf` no JSON) e fica na mesma escala da linha "Normas a
  Classificar" do gráfico Normativos Recebidos filtrada por segmento (3 a 12 por ponto); os números são mock e não são calculados a partir do
  Normativos Recebidos.
- Sparklines: `trend` de cada segmento (7 pontos, rótulos Janeiro..Julho); `setOptions()` clona `optionsDefault` e ajusta
  `scales.y.min/max` ao intervalo de cada série (padding 30%/15%).
- Cores: gradiente `--brand-primary` → `--brand-primary-high` com texto branco nos dois temas; selo em branco translúcido; no escuro
  uma camada translúcida preta sobre o gradiente (`:host-context([data-theme="dark"])`). SCSS do componente abaixo de 4kb.
- Selo "N a classificar" é um `<button data-segment-filter>` com `aria-pressed`: `@Output() toClassifySelect` emite o `id` do
  segmento e `@Input() activeSegment` marca o card ativo (`.is-filtered`, anel ciano) e esmaece os outros (`.is-dimmed`).

### 6.1.0 Visão geral dos segmentos no Início (`views/widgets/segment-overview`)

- Substitui, desde 2026-10-28, os cards de redes sociais do template (`widgets-brand`, hoje em
  `base-de-conhecimento/paginas/widgets/widgets-brand/`). Um `<c-widget-stat-d class="segment-overview-card">` por segmento
  em `<c-col sm="6" xl="3">`, na ordem do arquivo de dados.
- Cabeçalho: ícone do segmento (`size="xl"`, `aria-hidden`) + nome, e minigráfico de área (`<c-chart type="line" [height]="64">`,
  texto alternativo "Tendência de normas de <segmento>") com o `trend` do segmento (rótulos Janeiro..Julho, como nos cards do Triagent).
  Fundo na cor do segmento nos gráficos: `--segment-color` inline = `var(--app-series-N)`, via `TRAFFIC_SERIES` (`dashboard-charts-data.ts`),
  sob camada preta de 25% (branco ≥ 4,9:1 nos dois temas).
- Corpo (valores do `c-widget-stat-d`): total de normas ("normas") e normas a classificar ("a classificar"), formatados com
  `Intl.NumberFormat('pt-BR')`. Sem selo clicável nem filtro.
- Dados: `SegmentCardsService.getSegments()` (mesmo mock e validação dos cards de segmento). Erro: "Não foi possível carregar os
  segmentos." (`role="alert"`). Sparkline com branco de `--cui-white-rgb` (12% na área, 60% na linha); não depende do tema.

### 6.1.1 Filtro da página por "a classificar" (`dashboard.component.ts`)

- Estado `segmentFilter` (id do segmento ou `null`). `onToClassifySelect(id)` aplica; o mesmo selo de novo, clique fora dos
  selos (`@HostListener('document:click')`, fase de bolha, ignora alvos dentro de `[data-segment-filter]`), Esc
  (`document:keydown.escape`) ou o botão "Remover filtro" removem (`clearSegmentFilter()`).
- Efeito: cards (ativo/esmaecido); Normativos Recebidos com `highlighted = TO_CLASSIFY_INDEX` e `renderMainChart(highlight, segmentIndex(id))`:
  só a linha "Normas a Classificar · <segmento>" fica ativa, com os valores daquele segmento (`toClassifyFocus` em
  `DashboardChartsData`; um segmento destacado na legenda tem prioridade); legenda mostra o filtro; faixa
  `.segment-filter-notice` (`role="status"`) acima do gráfico Normativos Recebidos. A Cascata (agora em `/scalation`) não tem filtro por segmento.
- Remoção na fase de bolha: o controle clicado trata o clique antes (ex.: um item da legenda fica destacado); a remoção só
  desfaz o destaque que o próprio filtro aplicou.
- `segmentIndex(id)` (`dashboard-charts-data.ts`) liga os ids do `dashboard-segments.json` aos `TRAFFIC_SERIES[].id`
  (`atacado`, `corporativo`, `plataforma`, `varejo`; a linha tracejada é `to-classify`).
- `.wrapper` usa `overflow-x: clip` (`_layout.scss`) para tooltips HTML do Chart.js deixadas fora da tela não criarem rolagem
  lateral no celular.

### 6.2 Gráfico "Normativos Recebidos" (`dashboard.component.*`, `dashboard-charts-data.ts`, `traffic-value-labels.plugin.ts`)

- Card com título "Normativos Recebidos" (`id="traffic"`), subtítulo = `mainChart['subtitle']` (ex.: "Janeiro a dezembro de 2021"),
  chips "Forma de exibição" Gráfico | Tabela (`trafficView`), botão "Exportar Excel" (só na visão Tabela),
  `<app-period-filter id="traffic-period" label="Período dos normativos recebidos">` e `<c-chart [type]="'line'" [height]="300" [plugins]="trafficPlugins">`
  (visão Gráfico) ou tabela `.traffic-table` (visão Tabela).
- Origem (Fase 5): com `dataMock: true` os valores são o mock aleatório de sempre (`initMainChart`, eixo y 250); com `false`,
  `TrafficDataService.getTraffic` (`GET /v1/normativos-recebidos`, `switchMap` por período) → `setTrafficData` (eixo y pelo
  maior valor). `trafficState` (`loading`/`ready`/`error`) mostra `.traffic-placeholder` (`_charts.scss`) com "Carregando
  dados..." ou o erro (`<app-api-error-text>`) no lugar do gráfico/tabela; legenda com totais e "Exportar Excel" só com os
  dados prontos. O `TrafficDataService` é `@Optional()` no construtor: o spec que monta o componente à mão segue no mock.
- Tabela: getter `trafficTable` (`DashboardComponent`) monta colunas = séries do gráfico (rótulo, cor, tracejada), linhas = períodos
  e totais por coluna a partir de `mainChart.data`; segue período, destaque da legenda (colunas esmaecidas) e filtro por segmento
  (coluna "Normas a Classificar · <segmento>").
- Exportação: `exportTrafficXlsx()` → `trafficXlsxTable()` (aba "Normativos Recebidos", título "Normativos recebidos por segmento", subtítulo com período e
  filtro, coluna "Período", números `#,##0`, linha "Total"; arquivo `normativos-recebidos-<início>-a-<fim>[-a-classificar-<segmento>].xlsx`) →
  `downloadXlsx()` de `src/app/core/export/xlsx-export.ts` (genérico, reutilizável; clica num link temporário que não entra no
  documento, para o clique não chegar ao `document:click` que limpa os filtros da página). Estado `exporting` ("Gerando arquivo...") e
  `exportError` ("Não foi possível gerar o arquivo Excel.").
- `DashboardChartsData` (`@Injectable({ providedIn: 'any' })`) mantém o estado: `period`, `range` (preset ou `null`),
  `bounds: DateRange`, `labels`, `values: number[][]` (normas classificadas por segmento), `toClassify: number[][]`
  (normas a classificar por segmento), `highlight`. Métodos:
  - `initMainChart(period, range?, custom?)`: valida período/preset (fallback `DEFAULT_TRAFFIC_RANGE`), aceita intervalo
    personalizado só se `validateCustomRange` retornar `null`, monta `labels`/`subtitle` com `buildTrafficPeriod`, gera
    **valores aleatórios** (`random(min,max)` dentro de `TrafficSeries.range`) e chama `renderMainChart(null)`.
  - `renderMainChart(highlight)`: reconstrói `mainChart.data` (objeto novo para o `c-chart` detectar) e `mainChart.options`
    sem gerar dados novos. Série ativa: `borderWidth 3`, `fill` com `hexToRgba(color, 10)`; séries apagadas: borda a 20%,
    pontos ocultos, sem rótulo de valor. Eixo y: `beginAtZero`, **`max: 250` fixo**, ticks ocultos, gridlines só no y.
    Cores lidas de `getStyle(series.colorVar)` em tempo de render (por isso o tema redesenha).
  - `trafficSummary()`: itens da legenda (`label`, `filter`, `color`, `dashed`, `total`, `share`).
- `TRAFFIC_SERIES` (ordem fixa): Atacado `--app-series-1`, Corporativo `--app-series-2`, Plataforma `--app-series-3`,
  Varejo `--app-series-4`, "Normas a Classificar" `--app-series-reference` (`dashed`, sempre a última: `TO_CLASSIFY_INDEX = 4`).
- Legenda interativa (`c-card-footer`): um `<button class="traffic-legend-item">` por série com `aria-pressed`,
  texto "{{ total | number:'1.0-0' }} normas ({{ share | percent:'1.0-0' }})" e barra `progress-thin` proporcional.
  `toggleHighlight(i)`: clique destaca a série (`highlighted = i`), segundo clique volta a `null`. `isLegendDimmed(i)`
  apaga as outras séries, exceto "Normas a Classificar" quando o destaque é um segmento.
- "Normas a Classificar" filtrada por segmento: com um segmento destacado, `seriesValues(TO_CLASSIFY_INDEX)` devolve
  `toClassify[segmento]` e o rótulo vira "Normas a Classificar · <segmento>" (`segmentFilter()`), no gráfico e na legenda.
  Sem destaque, a linha tracejada é a soma dos quatro segmentos ponto a ponto.
- Plugin `trafficValueLabelsPlugin` (`id: 'trafficValueLabels'`, `afterDatasetsDraw`): escreve o valor acima de cada ponto
  dos datasets com `valueLabel: 'point'`, fonte `600 11px` da `--app-chart-font-family`, tinta `--app-chart-color`, halo
  `--cui-card-bg`; empilha rótulos no mesmo x (`LINE_HEIGHT` 13) e pula pontos quando o espaçamento é menor que
  `MIN_LABEL_SPACING` 30px. Lê CSS no momento do desenho, então segue o tema sem rebuild. Números com `Intl.NumberFormat('pt-BR')`.

### 6.3 Filtro de período compartilhado (`period-filter/`, `period/period-range.ts`)

`<app-period-filter>` (componente standalone `PeriodFilterComponent`, importado por `DashboardComponent`, `EmailsChartComponent` e `WaterfallChartComponent`) é usado em Normativos Recebidos e E-mails (Triagent) e na Cascata (Scalation), com estado independente.

| API | Tipo | Padrão | Observação |
|---|---|---|---|
| `@Input() period` | `TrafficPeriod` (`'Day' \| 'Month' \| 'Year'`) | `'Month'` | Granularidade (Dia/Mês/Ano) |
| `@Input() range` | `number \| null` | `DEFAULT_TRAFFIC_RANGE.Month` (12) | Preset "Últimos N"; `null` = personalizado |
| `@Input() bounds` | `DateRange` (`{ start: Date; end: Date }`) | `presetRange('Month', 12)` | Datas exibidas |
| `@Input() label` | `string` | `'Período'` | `aria-label` do grupo |
| `@Input() id` | `string` | `period-filter-<n>` | Prefixo de ids (`<id>-custom-range` no form) |
| `@Input() periods` | `TrafficPeriod[]` | `['Day', 'Month', 'Year']` | Granularidades oferecidas (E-mails usa `['Day', 'Month']`) |
| `@Output() selectionChange` | `EventEmitter<PeriodSelection>` | — | `{ period, range, bounds }` já validado |

Comportamento (`period-filter.component.ts`):

- Presets por granularidade (`TRAFFIC_RANGES`): Dia 7/15/30 dias; Mês 3/6/12 meses; Ano 3/5 anos. Padrões
  (`DEFAULT_TRAFFIC_RANGE`): Dia 7, Mês 12, Ano 5. Todo preset termina em `PERIOD_END = 31/12/2021` (último dia do mock).
- `setPeriod(p)`: se havia intervalo personalizado e ele cabe na nova granularidade, mantém (`range: null`); senão
  aplica o preset padrão e mostra `customNotice` "O intervalo personalizado não cabe nesta visão; mostrando os últimos <N>."
  (`role="status"`).
- `setRange(n)`: emite preset com `presetRange(period, n)`.
- `toggleCustomRange()`: abre o `FormGroup` (`start`, `end`, `<input type="date">`) pré-preenchido com `bounds`;
  `applyCustomRange()` valida com `validateCustomRange` e emite `range: null` ou mostra `customError` (`role="alert"`).
- Limites (`MAX_TRAFFIC_POINTS`): Dia 92 pontos, Mês 60, Ano 30. Mensagens: "Informe as duas datas.",
  "A data inicial deve ser anterior ou igual à data final.", "Para Dia, escolha até 92 dias ou use Mês.",
  "Para Mês, escolha até 60 meses ou use Ano.", "Para Ano, escolha até 30 anos.".
- O componente também atualiza seus próprios inputs ao emitir, então funciona com ou sem o pai religar a seleção.
- `ngOnChanges` limpa `customError` e repreenche o form quando o pai muda `period`/`range`/`bounds`.

`period-range.ts` exporta ainda `buildTrafficPeriod(period, range)` → `{ labels, subtitle }` (rótulos "Seg 27/12",
"Janeiro"/"Jan/21", "2021"; subtítulos "1 a 31 de dezembro de 2021", "Outubro a dezembro de 2021", "2017 a 2021"),
`trafficPointCount`, `presetRange`, `trafficPeriod`, `toInputDate`/`fromInputDate` (yyyy-MM-dd local), `isTrafficPeriod`,
`PERIOD_LABELS`.

### 6.4 Cascata do resultado (`views/scalation/waterfall/`, página Scalation)

| Arquivo | Papel |
|---|---|
| `waterfall.model.ts` | Interfaces `WaterfallPart`, `WaterfallStep`, `WaterfallData`, `WaterfallSegment`, `WaterfallColumn`, `WaterfallModel`; `MAX_PARTS_PER_STEP = 3`; `buildWaterfall(steps)` calcula colunas, segmentos (`low`/`high`), `base` (primeiro total) e `result` (nível final). Valida: lista vazia, 1..3 partes por etapa, valores finitos e ≥ 0 (lança `Error` em pt-BR). |
| `waterfall-derive.ts` | `deriveWaterfall(base, period, bounds)`: derivação **determinística** do mock anual para qualquer período (escala por fração do ano + ruído FNV-1a semeado por granularidade e datas; mantém resultado ≥ 5% da receita; totais após o primeiro = saldo corrente; ano-base inteiro devolve os valores originais). Só existe por causa do mock. |
| `waterfall-data.service.ts` | `WaterfallDataService` (`providedIn: 'root'`): `HttpClient.get('assets/data/dashboard-waterfall.json')` com `shareReplay(1)` (uma requisição por sessão; erro não é cacheado) e `getWaterfall(period, bounds)` = base → `deriveWaterfall` com `dataMock: true`; com `false`, `GET /v1/cascatas-resultado` + `fromCascataV1` (`waterfall.adapter.ts`), sem ler o mock. |
| `waterfall-format.ts` | `formatCurrency(value, unitScale, currency)` → `Intl.NumberFormat('pt-BR', {style:'currency', notation:'compact', maximumFractionDigits:1})` ("R$ 15 mi", negativo com "−" tipográfico); `formatShare(value, base)` → porcentagem pt-BR ("30%", "—" quando `base` é 0). |
| `waterfall-chart.component.*` | Card "Cascata do resultado": subtítulo `subtitle` (`data.period`; "Carregando período..." durante a carga; nenhum no erro), chips "Unidade dos valores" (R$ / % da receita) e "Forma de exibição" (Gráfico / Tabela), `<app-period-filter id="waterfall-period" label="Período da cascata">`, estados `loading` / `error` ("Não foi possível carregar os dados da cascata.") / `ready`, resumo "Resultado <valor> (<x>% da receita bruta)", legenda (Total, Redução, Saldo entre etapas), `<c-chart type="bar">` (sem `[redraw]`: no CoreUI 5 ele destrói o gráfico e não o desenha de novo, E-011) com barras flutuantes `[low, high]` (um dataset por segmento, `skipNull`, `grouped: false`) ou tabela (`Etapa / Componente / Valor / % da receita bruta / Saldo após a etapa`, `rowspan` por etapa). |

Detalhes do componente: `selection$: BehaviorSubject<PeriodSelection>` + `switchMap` para `getWaterfall` (seleção
nova cancela a anterior; `catchError` → `state = 'error'`); `buildWaterfall` dentro de `try/catch` (dado inválido →
`error`). `render()` lê a paleta dos tokens (`--app-wf-total-1..3`, `--app-wf-decrease-1..3`, `--app-wf-connector`,
`--app-chart-color`, `--app-chart-grid-color`, `--app-chart-font-family`, `--cui-card-bg` do card) e reconstrói
`chartData`/`chartOptions`. Em modo `percent` o eixo y vai até `base` em 5 passos. Plugins locais: `waterfallConnectors`
(linhas de 1px ligando o saldo de uma coluna à próxima) e `waterfallLabels` (valor + nome dentro do segmento quando
cabem; tinta branca ou quase preta por contraste). `ariaSummary` descreve o gráfico para leitores de tela.

### 6.4.1 Classificação das normas (`classification/`)

Dois cards abaixo do gráfico Normativos Recebidos, acima dos e-mails, lado a lado (`<c-row>`, `lg="5"` e `lg="7"`). **Sem filtro de período próprio**: recebem
do `DashboardComponent` o período do gráfico Normativos Recebidos (`[period]="trafficPeriod" [bounds]="trafficBounds"`, atualizados em `renderTraffic()`) e
`[segmentFilter]`. Escolha dos gráficos: ADR-013.

**Filtro cruzado:** clicar num valor de um card filtra o outro. A página guarda `applicabilityFilter` (`true` Aplicáveis, `false` Não
aplicáveis, `null`) e `themeFilter` (tema ou `null`), passa os dois aos cards e alterna com `onApplicabilitySelect`/`onThemeSelect`
(segundo clique remove). A pizza (fatia ou item da legenda, `applicabilitySelect`) faz a lista mostrar os temas daquela classe; o tema
(linha da lista, `themeSelect`) faz a pizza contar só normas daquele tema. Cada card ignora o próprio filtro e só destaca o valor
escolhido. Faixa `.segment-filter-notice` acima dos cards ("Filtro: Não aplicáveis · Tema: Pix ...", botão "Remover filtro").
Esc ou clique fora de um controle de filtro limpa todos os filtros da página; controles marcados com `data-segment-filter` (selos)
ou `data-page-filter` (fatias, legenda, linhas de tema) não limpam os demais. Normativos Recebidos, cards de segmento e e-mails não têm tema nem
aplicabilidade nos dados e não são afetados.

| Arquivo | Papel |
|---|---|
| `classification.model.ts` | `ClassifiedNorma` (`code`, `classifiedAt` YYYY-MM-DD, `segment`, `theme`, `applicable`), `ClassificationData`, `CLASSIFICATION_SEGMENT_IDS` e `validateClassification` (código único, data válida, segmento conhecido, tema e booleano; lança `Error`). |
| `classification-derive.ts` | `aggregateClassification(normas, bounds, { segment, theme, themesOf }, topThemes = TOP_THEMES)`: total, aplicáveis, não aplicáveis, participação (com `theme`, só normas daquele tema); temas de uma classe (`themesOf`, padrão aplicáveis; `themesTotal`), ordenados (empate por nome), `TOP_THEMES = 10` nomeados com `width` relativa ao maior e o resto em `others` ("Outros temas", com quantos temas agrupa; nunca agrupa um tema só). |
| `classification-derive.ts` (Fase 5) | Também `NormasSortKey`, `NormasSort`, `NormasQuery`, `ClassificationSummaryQuery`, `sortClassified` (ordem da tabela: data ISO, número pelo valor, texto pt-BR; desempate data desc e código) e `pageClassified` (emulação local de `GET /v1/normas-classificadas`). |
| `classification-data.service.ts` | `ClassificationDataService`: `getSummary(query)` (pizza e temas) e `getNormasPage(query)` (uma página da Tabela Analítica). `dataMock: true`: `HttpClient.get('assets/data/dashboard-classificacao.json')` + `validateClassification` + `shareReplay(1)` e `localClassificationQueries` (agrega e pagina no navegador); `false`: `GET /v1/normas-classificadas/resumo` e `GET /v1/normas-classificadas` pelo `ApiService` + adaptadores. |
| `classification.adapter.ts` | Tipos `*V1` do OpenAPI e `fromNormaClassificadaV1`, `fromPaginaNormasV1`, `fromResumoNormasV1`, `normasPageParams` (`sort` com os desempates do mock, no máximo 3), `summaryParams` (`temasDe`). |
| `classification-view.base.ts` | `ClassificationViewBase` (`@Directive()` abstrata): `@Input() period`, `bounds`, `segmentFilter`, `applicabilityFilter`, `themeFilter`; `@Output() applicabilitySelect`, `themeSelect`; `filters()` abstrato (opções do resumo); `request()`/`receive()` abstratos (resumo ou página; `summary()`/`applySummary()` prontos para pizza e temas); a cada mudança de entrada um pedido novo (`switchMap` cancela o anterior), estado e `loadProblem`, gancho `onFiltersChange()`, subtítulo (`buildTrafficPeriod`), `filterLabel`, formatação pt-BR; gancho `onAggregate()`. |
| `applicability-chart.component.{ts,html}` | `<app-applicability-chart>`: card "Normas Aplicáveis", `<c-chart type="doughnut">` sem `[redraw]` (no CoreUI 5 ele destrói o gráfico e não o desenha de novo, E-011; dados novos atualizam o mesmo gráfico) (cores lidas de `--app-applicable`/`--app-not-applicable` e refeitas em `ThemeService.appliedTheme$`; `onClick` numa fatia emite a classe), total no centro, legenda em botões com quantidade e %, fatia escolhida deslocada 10px (`pickedOffset`) e a outra a 16% de opacidade, `ariaSummary`. |
| `themes-list.component.{ts,html}` | `<app-themes-list>`: card "Assunto das Normas Aplicáveis" (ou "não aplicáveis" com essa fatia escolhida), linhas em botões com barras HTML ordenadas (tema escolhido destacado, demais esmaecidos) + "Outros temas" só em texto, sem clique. |

Estilos dos dois em `src/scss/_classification-card.scss`.

### 6.4.2 Tabela Analítica (`analytic-table/`)

Seção abaixo dos e-mails: `<app-analytic-table>` recebe os mesmos filtros dos cards de classificação (`[period]`, `[bounds]` do gráfico Normativos Recebidos,
`[segmentFilter]`, `[applicabilityFilter]`, `[themeFilter]`) e lista **uma linha por norma classificada** (`filterClassified`), com
todos os filtros da página aplicados. O filtro de período próprio do card de e-mails não se aplica (é local daquele card).

| Arquivo | Papel |
|---|---|
| `analytic-table.component.{ts,html}` | Estende `ClassificationViewBase` (carga, estados, entradas); `ANALYTIC_COLUMNS` (Data da classificação, Órgão, Tipo, Número, Tema, Segmento, Aplicável ao banco?, Área, Diretoria); ordenação por cabeçalho (`sortBy`, `aria-sort`; data decrescente por padrão; número pelo valor, "4.855" = 4855; texto em ordem pt-BR); páginas de `ANALYTIC_PAGE_SIZE = 15` pedidas ao `ClassificationDataService.getNormasPage` (a tela guarda só a página visível e o `total`; volta à 1 a cada filtro); pílulas "Filtros aplicados"; "Exportar Excel" (`xlsxTable()`: todas as linhas filtradas na ordem da tela, filtros no subtítulo; as linhas vêm de `collectPages` em páginas de 100, em sequência, até `EXPORT_MAX_ROWS` = 5.000 — acima disso só `exportLimitText`, sem arquivo; botão "Buscando linhas... N de M"; filtro novo ou saída cancela; `download` trocável nos specs; arquivo `tabela-analitica-<início>-a-<fim>[-segmento][-aplicaveis\|-nao-aplicaveis][-tema-<slug>].xlsx`). Última coluna sem dado (cabeçalho "Agente da Agenda" só para leitor de tela): botão por linha "Perguntar ao Agente da Agenda sobre <Tipo> <Órgão> nº <Número>" que chama `ChatLauncherService.ask("Quais são os pontos principais da …?")` (M18); fica fora do Excel. O card inteiro tem `data-page-filter`: ordenar, paginar e exportar não limpam os filtros. |

Estilos em `src/scss/_analytic-table.scss`.

### 6.5 Fluxo de e-mail - Triagem (`emails/`)

Substitui a tabela "Usuários" do template. Plano e decisões: `docs/planejamento/emails-sugestao-classificacao.md` e ADR-019.

| Arquivo | Papel |
|---|---|
| `emails.model.ts` | `SuggestionEmail`, `SuggestedNorma`, `EmailsData`, `EMAIL_SEGMENT_IDS` (ids das séries de segmento do gráfico Normativos Recebidos, sem "to-classify") e `validateEmails` (id único, `sentAt` ISO, segmento conhecido, e-mail com ≥ 1 norma, classificação válida; lança `Error`). |
| `emails-derive.ts` | `aggregateEmails(emails, period, bounds, segment)`: um bucket por dia/mês/ano (vazios incluídos, rótulos de `buildTrafficPeriod`), normas por segmento, e-mails, normas por envio, normas distintas (por `code`), média por e-mail, normas por segmento e lista (mais novo primeiro). A data vale como enviada (parte de data de `sentAt`, sem deslocamento de fuso). `sentDay`/`sentDateTime` para o template. |
| `emails-data.service.ts` | `EmailsDataService` (`providedIn: 'root'`): `getAggregate({ period, bounds, segment })`. `dataMock: true`: `HttpClient.get('assets/data/dashboard-emails.json')` + `validateEmails` + `shareReplay(1)` e `aggregateEmails` (`localEmailQueries`); `false`: `GET /v1/emails-sugestao/resumo` + `GET /v1/emails-sugestao` (5 mais recentes) juntos, `fromResumoEmailsV1` (`emails.adapter.ts`). |
| `emails-chart.component.*` | Card "Fluxo de e-mail - Triagem": subtítulo `subtitle` (período; "Carregando período..." durante a carga; nenhum no erro), chips Gráfico/Tabela, "Exportar Excel" (só na tabela), `<app-period-filter id="emails-period" label="Período dos e-mails" [periods]="periodOptions">` (só Dia/Mês), indicadores (E-mails enviados, Normas sugeridas + "N distintas", Média por e-mail), `<c-chart type="bar">` empilhado, sem `[redraw]` (E-011) (um dataset por segmento; cores `--app-series-1..4`; topo arredondado só no último segmento da pilha; total acima da barra pelo plugin `emailsTotalLabels`, só quando cabe), tabela com rodapé "Total", legenda clicável por segmento abaixo do gráfico/tabela e lista "Últimos e-mails" (até 5; data sem hora, segmento e número de normas; abre a tabela de normas com Órgão, Tipo, Número, Tema, "Aplicável ao segmento?" (`applicability()`), Área e Diretoria, rolável na horizontal). `@Input() segmentFilter`: só aquele segmento aparece e o destaque da legenda é limpo. |

Estilos: a lista de e-mails fica em `src/scss/_emails-card.scss` (global) para o estilo do componente não passar do orçamento de 2kb; o resto fica em `emails-chart.component.scss`.

## 7. Fluxo de dados e estado

| Tema | Como funciona hoje |
|---|---|
| O que é mock | Cards: números fixos no HTML. Normativos Recebidos: `DashboardChartsData.random()` gera valores novos a cada `initMainChart` (toda troca de período muda os números). Cascata: `src/assets/data/dashboard-waterfall.json` + `deriveWaterfall`. E-mails: `src/assets/data/dashboard-emails.json` + `aggregateEmails`. Os serviços de dados ainda não chamam o `ApiService` (só o chat). Sobras do template (Tráfego e vendas, widgets-brand): literais. |
| Onde entra o período | `<app-period-filter>` emite `PeriodSelection`. No Normativos Recebidos, `DashboardComponent.onTrafficPeriod` → `chartsData.initMainChart(period, range ?? undefined, range === null ? bounds : undefined)` → `renderTraffic()`. Na Cascata, `WaterfallChartComponent.onPeriodChange` → `selection$.next` → `getWaterfall(period, bounds)`. Os dois filtros são independentes. |
| Estado do gráfico Normativos Recebidos | Em `DashboardComponent`: `trafficPeriod`, `trafficRange`, `trafficBounds` (religados aos inputs do filtro), `highlighted`, `trafficSummary`, `mainChart`. O destaque é preservado ao mudar o período (`renderTraffic` reaplica `highlighted`). |
| Estado da Cascata | Em `WaterfallChartComponent`: `period`, `range`, `bounds`, `unit`, `view`, `state`, `data`, `model`. Unidade e exibição sobrevivem à troca de período. |
| Tema e gráficos | `ThemeService.appliedTheme$` é assinado em `DashboardComponent.ngOnInit` (→ `renderTraffic()`) e em `WaterfallChartComponent.ngOnInit` (→ `render()`), com `takeUntil(destroy$)`. Como as cores são lidas dos tokens no render, basta reconstruir `data`/`options`. `ThemeService.applyChartDefaults` ainda atualiza `Chart.defaults` e dá `update('none')` em todas as instâncias (texto, grade, tooltip). Os cards de segmento não assinam o tema: usam branco fixo sobre o gradiente. |
| Eventos entre componentes | Só `@Output() selectionChange` do filtro para o pai. Não há serviço de estado global, store ou `@Input` entre Normativos Recebidos e Cascata. |
| Ciclo de vida | `Subject destroy$` + `takeUntil` + `ngOnDestroy` (padrão permitido pela R3). |

## 8. Testes

- Runner: Karma 6.4 + Jasmine 5.12 pelo builder `@angular/build:karma` (`karma.conf.js`, `tsconfig.spec.json`; sem `src/test.ts`,
  o builder encontra os `*.spec.ts`). Padrão do `karma.conf.js` é `singleRun: false` e `browsers: ['Chrome']`.
- Execução única (CI/local): `npm run test:ci` (`ng test --watch=false --browsers=ChromeHeadless`).
- Specs do produto e o que cobrem:

| Spec | Cobre |
|---|---|
| `src/app/app.component.spec.ts` | Criação e título "Agenda Normativa". |
| `src/app/app.routing.spec.ts` | Sobe o `appConfig` real com endereço simulado (`MockPlatformLocation`): URL limpa digitada abre a página (`/analitico`); fragmento de URL limpa rola até a seção (`/triagent#tabela-analitica` → `scrollToAnchor`); endereço desconhecido volta ao Início; `/dashboard` → `/triagent`; subitens do menu com `href` `/triagent#tabela-analitica`, nunca `#/`; link direto de seção abre o grupo do menu (E-006). Falha se `withHashLocation()` voltar. |
| `src/app/core/config/runtime-config.service.spec.ts` | `parseRuntimeConfig` (chaves válidas, barra final do `apiBase`, padrão por chave, entidades incompletas, não-objeto com um erro sem detalhes); `load()` lê `assets/env.json` e aplica; falha mantém os padrões e registra um erro sem o corpo da resposta; padrões do build de produção (`defaultRuntimeConfig(true)`): sem `env.json` ou com corpo que não é objeto, `dataMock` e `chatMock` ficam `false` (E-009). |
| `src/app/core/http/login-redirect.service.spec.ts`, `session-expired-notice.component.spec.ts` | Quebra de laço do 401 (E-010): horário em `sessionStorage` há menos de 60 s → não redireciona e oferece "Entrar novamente"; 60 s ou mais → redireciona; o `BROWSER_NAVIGATE` padrão grava o horário antes de sair; lixo, horário futuro e storage indisponível são ignorados; o aviso mostra o texto pt-BR e o link, e o clique grava o horário. |
| `src/app/core/services/api.service.spec.ts` | Prefixo `apiBase` + `/v1` em toda chamada, parâmetros, JSON e `FormData` sem credenciais, `postMultipart`, `delete`; `apiBase` vindo do `env.json` (mesma imagem, outro BFF). |
| `src/app/core/services/user.service.spec.ts` | `primeiroNome` de `GET /v1/usuarios/me` guardado em memória (segunda chamada sem pedido); campo ausente e falha → ''; falha não fica guardada. |
| `src/app/core/http/api-error.interceptor.spec.ts` | Com o `HttpClient` da aplicação (`provideAppHttpClient` + `provideHttpClientTesting`): 401 → `loginUrl?retorno=<endereço atual codificado>` uma vez só, com `&` se `loginUrl` já tiver query; 403 → "Você não tem acesso a esta informação." sem redirecionar; Problem Details → `status`, `code`, `traceId`, sem `message`/`details`; rede fora → status 0 e texto de conexão; pedido fora de `apiBase` intocado; cabeçalho `X-XSRF-TOKEN` em POST e DELETE (não em GET); `isApiUrl`. |
| `src/app/core/http/api-problem.spec.ts` | `toApiProblem` (corpo objeto ou texto, código e `traceId` fora do formato descartados, erro desconhecido = rede), texto por status e família, constantes pt-BR e `SUPPORT_CODE_TEXT`. |
| `src/app/core/services/theme.service.spec.ts` | Padrão claro; aplica e persiste escuro; modo auto segue `matchMedia`; espelha o tema em `data-coreui-theme`; emite `appliedTheme$`. |
| `src/app/containers/default-layout/default-header/default-header.component.spec.ts` | Header só com toggler, data e seletor; data em pt-BR; três modos de cor. |
| `src/app/containers/default-layout/default-footer/default-footer.component.spec.ts` | Criação. |
| `src/app/views/home/home.component.spec.ts`, `views/scalation/scalation.component.spec.ts` | Título acessível e presença dos blocos da página (visão geral dos segmentos, sem os cards de redes sociais; Cascata e "Tráfego e vendas"), com `NO_ERRORS_SCHEMA`/stub; teste raso por `TestBed.overrideComponent` (filhos standalone não são instanciados). |
| `src/app/views/widgets/segment-overview/segment-overview.component.spec.ts` | Início: um card por segmento com nome e números em pt-BR, cor do cabeçalho pelo token da série, ícone decorativo, minigráfico com o `trend`, mensagem de erro. |
| `src/app/views/analytics/analytics.component.spec.ts` | Página vazia com `h1` acessível. |
| `src/app/views/dashboard/dashboard.component.spec.ts` | Estado inicial (Mês, 12), preset e intervalo personalizado vindos do filtro, destaque mantido ao trocar período. Instancia o componente sem `TestBed`, com `ThemeService` falso. |
| `src/app/views/dashboard/dashboard-charts-data.spec.ts` | Rótulos/subtítulos por faixa e granularidade; presets válidos; intervalo personalizado (contagem, validação, fallback); cinco séries na ordem; estilo dos pontos/eixos; destaque e filtro de "Normas a Classificar"; totais e participações da legenda. |
| `src/app/views/dashboard/period-filter/period-filter.component.spec.ts` | Estado inicial; emissão de preset; troca de granularidade; formulário personalizado (abrir/cancelar, aplicar, mensagens pt-BR, transporte entre granularidades com aviso); seleção vinda do pai. |
| `src/app/views/dashboard/analytic-table/analytic-table.component.spec.ts` | Colunas pt-BR, ordem padrão, reflexo de cada filtro (aplicabilidade, tema, segmento, datas), ordenação (número por valor, inversão), páginas de 15, planilha (linhas, subtítulo, nome do arquivo, sem a coluna do agente), botão "Perguntar ao Agente da Agenda", erro. |
| `src/app/views/dashboard/classification/*.spec.ts` | `validateClassification` (rejeições); `aggregateClassification` (período com as duas pontas, só aplicáveis nos temas, ordem, larguras, "Outros temas" sem agrupar um tema só, segmento, vazio); cards (carregando, pizza com dados/centro/legenda/`aria-label`, temas, sem filtro próprio, seguem datas do gráfico Normativos Recebidos e segmento, vazio, erro). |
| `src/app/views/dashboard/emails/*.spec.ts` | `validateEmails` (rejeições); `aggregateEmails` (buckets dia/mês/ano, intervalo personalizado, filtro de segmento, distintas, média, lista, período vazio); componente (estados, indicadores, filtro de segmento e de período, destaque, tabela, planilha, lista de e-mails). `EmailsDataService` e `ThemeService` entram por `useValue`. |
| `src/app/views/scalation/waterfall/waterfall.model.spec.ts` | `buildWaterfall` (totais, reduções, resultado, rejeições) e formatação ("R$ 15 mi", "−R$ 15 mi", "30%", "—"). |
| `src/app/views/scalation/waterfall/waterfall-derive.spec.ts` | Ano-base intacto, escala proporcional, coerência resultado = receita − reduções, determinismo, resultado nunca engolido. |
| `src/app/views/scalation/waterfall/waterfall-chart.component.spec.ts` | Um dataset por segmento; unidade %; tabela; eixos; chips e filtro; recarga por período preservando unidade/exibição; estado de erro. `WaterfallDataService` é substituído por `useValue` (`of(DATA)` / `throwError`). |
| `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.spec.ts` | Cards: total, "N a classificar", sem porcentagem, sparkline por segmento, mensagem de erro, tom petróleo e selo só texto (`filterable=false`). |
| `src/app/views/widgets/widgets-dropdown/segment-cards.service.spec.ts` | `validateSegmentCards`: consistência, a classificar ≤ total, inteiros ≥ 0; `SegmentCardsService` com `dataMock` `true` (mock) e `false` (`GET /api/v1/segmentos`). |
| Fase 5 — adaptadores e serviços v1 | `segment-cards.adapter.spec.ts`, `traffic/traffic.adapter.spec.ts`, `classification/classification.adapter.spec.ts`, `emails/emails.adapter.spec.ts`, `waterfall/waterfall.adapter.spec.ts` (cada campo do OpenAPI convertido, domínio fora do contrato recusado, resumo v1 = agregado do mock); `classification-data.service.spec.ts` (parâmetros da página, paridade da paginação do mock com a ordenação antiga em todas as colunas), `emails-data.service.spec.ts`, `waterfall-data.service.spec.ts`, `traffic/traffic-data.service.spec.ts` (inclui `DashboardComponent` com dados do BFF), `v1-domains.spec.ts`. |
| Fase 5 — Tabela Analítica e camada HTTP | `analytic-table/analytic-table.paging.spec.ts` (página no servidor, filtros e ordenação como parâmetros, Excel em páginas de 100, teto de 5.000 com o texto do limite, cancelamento, erro com código de suporte, Excel no mock); `core/http/api-page.spec.ts` (`collectPages` sequencial e cancelável), `core/http/api-error-text.component.spec.ts`, `core/http/http-error-texts.spec.ts`. |

As telas demo mantêm os specs "should create" do template. Trocar o mock pela API exige manter os specs acima verdes
(ou substituir o provider do serviço por `useValue`, como já faz o spec da Cascata).

## 9. Convenções

- Angular 20 / TS 5.9 (R1, R3): componentes standalone com `imports`, `@if`/`@for`/`@switch`, rotas em `routes.ts`, providers
  em `app.config.ts`; `@Input()`/`@Output()` ou `input()`/`output()`, `FormGroup`/`FormControl`, RxJS `BehaviorSubject`/`switchMap`/
  `takeUntil`. Proibido: `@NgModule` novo, `standalone: false`, `*ngIf`/`*ngFor` novos, `HttpClientModule`, `ngx-perfect-scrollbar`,
  `ColorModeService`. Exemplos de CoreUI 4 / Angular < 20 (inclusive da `base-de-conhecimento/`) devem ser reescritos.
- Idioma (R12): tudo visível em pt-BR (títulos de rota, menu, `aria-label`, `title`, mensagens, legendas); identificadores,
  nomes de arquivos e comentários em inglês. Termos novos entram em `docs/glossario-ptbr.md` antes.
- Formatação: pipes do Angular (`number`, `percent`, `date`, `currency`) ou `Intl` em `pt-BR`; nunca montar número à mão.
- Cores (R10): só `var(--brand-*)`, `var(--cui-*)`, `var(--app-*)`. Paletas de gráfico (`--app-series-*`, `--app-wf-*`) são
  validadas para daltonismo nos dois temas: não trocar nem reordenar sem revalidar. Canvas lê tokens via `getStyle`/`getComputedStyle`
  em tempo de render e redesenha ao mudar `appliedTheme$`.
- Estilo por componente ≤ 4kb (erro de build; aviso a partir de 2kb). Classes compartilhadas (`.filter-chip`, `.brand-segmented`,
  `.brand-icon-btn`, `.progress-thin`) ficam em `src/scss` e não nos componentes.
- Ícones: adicionar ao `iconSubset` + `enum IconSubset` em `src/app/icons/icon-subset.ts`.
- HTTP (R4): serviço base com `apiBase` (configuração de execução) + `/v1` + recurso do contrato
  (`docs/contratos/openapi-agenda-normativa-v1.yaml`); nenhuma URL absoluta; sem endpoint inventado (até o BFF publicar o v1,
  mock em `src/assets/data/`). Serviço base: `src/app/core/services/api.service.ts`; erros e 401 na camada do §12.
- Sem marca de terceiros na interface (R8); prefixos `brand-*`; dados legais por configuração de ambiente; `LICENSE` MIT permanece.
- Documentação viva (R13): alteração de código atualiza o `docs/*.md` correspondente e passa em `npm run docs:check`.

## 10. Pontos de atenção para o porte

Observações verificadas no código que a adaptação deve decidir conscientemente:

1. **Sobras do template fora do Triagent**: `scalation.component.html` renderiza o card "Tráfego e vendas" (valores literais, progress bars). Não é produto. (A tabela "Usuários" foi substituída pelo card de e-mails; os cards de redes sociais do Início, pela visão geral dos segmentos.)
2. **Exportação (R9)**: só XLSX existe (`core/export/xlsx-export.ts`: Normativos Recebidos, e-mails, tabela analítica, chat). CSV,
   PDF e a exportação da Cascata não foram implementados; `jspdf`/`jspdf-autotable` saíram do `package.json` na migração e
   entram, na versão do Nexus compatível com Angular 20, quando o PDF for pedido.
3. **Eixo y do gráfico Normativos Recebidos fixo em 250** (`max: 250`, `stepSize: 50` em `renderMainChart`). Com dados reais, calcular o máximo a partir dos valores.
4. **`PERIOD_END` fixo em 31/12/2021** (`period-range.ts`): presets terminam no último dia do mock. Com dados reais, trocar por
   "hoje" ou pela última data disponível no BFF (um só ponto de mudança).
5. **SCSS com `@import`**: o CoreUI 5 usa módulos Sass (`@use`); `styles.scss` e os parciais ainda usam `@import` (variáveis da marca
   antes do CoreUI) e o aviso de depreciação está silenciado em `angular.json`. Migrar para `@use "@coreui/coreui/scss/coreui" with (...)`
   antes do Sass 3 (D-007).
6. **Mock por padrão**: desde a Fase 5 todo serviço de dados tem o caminho v1 pelo `ApiService`, mas o `env.json` versionado segue `dataMock: true` (mocks de `assets/data/`) até o BFF publicar o contrato; ligar = `"dataMock": false` no ConfigMap (`docs/mapeamento-de-dados.md` §2).
7. Pequenas sobras: `AppComponent.ngOnInit` assina `router.events` sem fazer nada; `DefaultLayoutComponent` usa seletor `app-dashboard`.
8. Diferenças visuais conhecidas da migração para o CoreUI 5.5 (comparação pixel a pixel com o build Angular 15): suavização das
   linhas do Chart.js 4 e 1 px a menos na tabela analítica. Sidebar, header, cards e cores foram ajustados para medir igual.

## 11. Chat do agente (`src/app/chat`) — em implementação

Widget próprio, sem dependência nova (ADR-010); o agente roda no BFF (ADR-011) com Gemini via Vertex (ADR-012). Contrato HTTP
e mock em `docs/contratos-de-dados.md` seção 9; plano em `docs/planejamento/chat-widget.md`; backend em
`docs/planejamento/agente-backend-spec.md`.

| Arquivo | Estado | Papel |
|---|---|---|
| `chat.model.ts` | pronto (P1; Fase 6) | Modelo interno (`ChatNode`, `ChatApiMessage`, `ChatReply`, `ChatFileReply`, `ChatFileChecking`/`ChatFileEvent` + `isFileChecking`, `ChatQuarantineCode`, `ChatApiError`…), `ChatMessage` do widget (com `supportCode`; anexos com `checking` e `reason`) e `CHAT_LIMITS` (20 MB por conversa, 9 MB por envio, 1000 caracteres, extensões aceitas) |
| `chat-v1-adapters.ts` (+ spec) | pronto (Fase 6) | Interfaces v1 escritas à mão (D9; tag "Agente" do OpenAPI) e adaptadores puros: `sessionFromV1`, `replyFromV1`, `nodeFromV1`, `messageFromV1`, `cancelReplyFromV1`, `messageRequestToV1`, `feedbackToV1`, `cancelToV1`, `fileFromV1`, `acceptedFilesFromV1`, `fileResultFromV1`, `fileReplyFromV1`, `quarantinedResult` (usado também pelo mock). Valor fora de domínio lança `ChatContractError` (cita o campo, nunca o valor) |
| `chat-texts.ts` | pronto (P1; Fase 6) | `CHAT_TEXTS` (rótulos, `aria-label`, avisos, "Verificando o documento..."), `CHAT_ERROR_TEXTS` por código (inclui `SEND_TOO_LARGE`, recusas da quarentena e `FILE_CHECK_TIMEOUT`) e `CHAT_SUPPORT_CODE_LABEL` ("Código de suporte: ", de `SUPPORT_CODE_TEXT`); termos no glossário |
| `markdown/safe-markdown.ts` (+ spec) | pronto (P1) | `safeMarkdown(text)`: escapa `& < > " '` antes de formatar; só gera `p, br, strong, em, code, ul, ol, li, a` (links `http(s)`); ignora NUL para impedir forjar marcadores; resultado vai em `[innerHTML]` (sanitização do Angular como 2ª barreira) |
| `chat-texts.spec.ts` | pronto (P1) | Todo código de erro tem texto; limites de 20 MB e de 9 MB coerentes com os textos; textos da quarentena e do código de suporte |
| componentes standalone | pronto (P2; NgModule removido na migração para Angular 20) | `ChatWidgetComponent` (importado por `DefaultLayoutComponent`), `ChatMessagesComponent`, `ChatInputComponent`, pipes `SafeMarkdownPipe` e `ChatSuggestionsPipe`; cada um com os próprios `imports` (`ReactiveFormsModule`, `IconDirective`) |
| `chat-widget/chat-widget.component.*` (+ spec) | pronto (P2, P7) | `<app-chat-widget>` no fim de `default-layout.component.html` (`d-print-none`): botão flutuante com ícone e o nome "Agente da **Agenda**" ao lado (visual; `aria-hidden`, o nome já está no `aria-label`) (`aria-expanded`, `aria-controls`; rótulo "Abrir Agente da Agenda", "Abrir Agente da Agenda (conversa em andamento)" ou "Minimizar Agente da Agenda"; bolinha verde quando minimizado com conversa em andamento) e painel `role="dialog"` (`aria-modal="false"`, `aria-labelledby`). **Minimizar só esconde o painel (`hidden`)**: o DOM fica, então mensagens, rascunho de texto e sessão continuam; ao voltar, foco no campo e rolagem no fim. Cabeçalho: "Recomeçar" (desabilitado até o usuário enviar qualquer interação: opção, texto, documento ou "Voltar"), "Expandir/Reduzir Agente da Agenda" (painel mais largo, ainda flutuante; some abaixo de 576 px, onde o painel já é tela cheia; o estado vale enquanto a página estiver aberta) e "Minimizar Agente da Agenda". `Esc` minimiza. Abre a sessão na primeira abertura (`ChatSessionService.start()`). A sugestão "Encerrar" chama `ChatSessionService.end()` (ver a linha do serviço); o painel continua aberto. Uma sugestão de resposta pronta (`reply`) é enviada como texto. Escuta `ChatLauncherService.requests$`: abre o painel e, se vier pergunta, chama `ChatSessionService.ask` (M18) |
| `chat-messages/chat-messages.component.*` (+ spec) | pronto (P3) | `<app-chat-messages [messages] [typing] [retryable] [suggestions] [focusSuggestions] (retry) (rate) (suggestionPick)>`: bolhas por papel, markdown pelo pipe `safeMarkdown`, citações ("Fontes"), perguntas de esclarecimento, contatos (`mailto:` só para e-mail), arquivo anexado com tamanho e veredito ("· Verificando o documento..." enquanto está na quarentena; motivo da recusa da quarentena abaixo), "Código de suporte: <traceId>" (valor selecionável) sob a mensagem de erro que trouxe `traceId`, indicador "digitando" (`role="status"`), `role="log"` com `aria-live="polite"`, rolagem automática que respeita quem rolou para cima, botão "Ir para o fim"; **sugestões de resposta** (`role="group"`, "Sugestões de resposta") no fim da lista, depois da última mensagem: opções do passo, "Recomeçar" e "Voltar" seguido de "Encerrar" (por último, em estilo discreto; "Voltar" com seta); o foco vai à primeira só em passos sem caixa de texto; **nome do autor visível ("Agente da Agenda" com ícone `cilSpeech`, "Você") só na primeira mensagem de cada sequência, nas seguintes só para leitor de tela (M06/M07); **lista de normas** (`normList`: título, observação, segmento, data `dd/mm/aaaa` por `formatNormDate`; botões "Todos" + segmentos com `aria-pressed` quando há mais de um segmento; com mais de uma norma, "Ver em formato tabela" alterna para uma tabela (Norma, Observação, Segmento e a coluna de data com o `dateLabel`; rolagem lateral dentro da bolha, `role="region"` com legenda) e, na tabela, "Extrair em Excel" baixa as linhas visíveis pelo `downloadXlsx` (`core/export`; propriedade `download` trocável nos testes), com "Gerando arquivo..." e alerta se falhar; filtro, formato e estado da exportação guardados só na tela, por mensagem); **feedback** "Esta resposta ajudou? Útil / Não útil" (grupo com `aria-label`) sob respostas e "não encontrei" sem contatos, que vira "Obrigado pelo feedback." (`role="status"`) e mostra alerta se o envio falhar |
| `markdown/safe-markdown.pipe.ts`, `chat-format.ts` (+ spec) | pronto (P3) | Pipe puro `safeMarkdown`; `formatFileSize` (pt-BR) e `isEmail` |
| `chat-input/chat-input.component.*` (+ spec) | pronto (P4, ajustado em 2026-10-28) | `<app-chat-input [node] [sending] [usedBytes]>` com saídas `textSend`, `filesSend` (lista de arquivos válidos, enviados juntos) e `stop`. Só existe em passos com algo para digitar ou anexar (`free_text`, `upload`; em `menu` e `end` não aparece nada embaixo): `free_text` = `textarea` (Enter envia, Shift+Enter quebra linha, Enter durante composição não envia, cresce até 120 px, contador `n/máx`, envio bloqueado se vazio ou acima do limite) com "Parar" no lugar de "Enviar" enquanto o agente responde; `upload` = botão "Anexar documentos" (seleção múltipla quando `upload.maxFiles > 1`) + dica (tipos, limite, "cole com Ctrl+V") + lista de erros por arquivo `role="alert"`; `onPaste(event)` (chamado pelo `(paste)` do painel no widget) envia imagens ou arquivos da área de transferência só no passo `upload` e fora de envio, sem afetar colagem de texto. As opções do passo, "Voltar" e "Recomeçar" **não ficam mais aqui**: são sugestões na conversa (`chat-suggestions.ts`). Foco vai ao campo (ou ao anexar) a cada novo passo; rascunho e erro são limpos ao trocar de passo |
| `chat-suggestions.ts` (+ spec) | pronto (2026-10-28) | `buildChatSuggestions(node, busy, hasInteraction, replies)`, `lastQuickReplies(messages)` e o pipe puro `chatSuggestions` (`node | chatSuggestions: busy : hasInteraction : messages`): opções do menu (no passo `fim`: "Nova consulta"), respostas prontas (`quickReplies` da última mensagem do agente) em passos `free_text`, `Recomeçar` em passos do tipo `end` (depois do encerramento), `Voltar` quando `canGoBack` e, depois da primeira interação do usuário, `Encerrar` por último em todo passo que não seja `end`; nada enquanto o agente responde ou antes da sessão começar |
| `chat-file.ts` (+ spec) | pronto (P4; vários arquivos em 2026-10-28; 9 MB por envio na Fase 6) | `validateChatFile(file, upload, usedBytes)`: extensão do nó, tipo informado pelo navegador (vazio aceito), vazio, limite do nó e 20 MB por conversa; `validateChatFiles(files, upload, usedBytes)`: válidos e problemas por arquivo, cota somada no lote, até `min(upload.maxFiles, CHAT_LIMITS.maxFilesPerSend)` (`TOO_MANY_FILES`), soma do envio até `sendLimitOf(upload)` = 9 MB (`SEND_TOO_LARGE`) e limite por arquivo reduzido a ela; `namePastedFile` ("image.png" da área de transferência vira `imagem-colada-14h05m03s.png`); `fileProblemText`. O BFF repete tudo (nunca confia no navegador) |
| `chat-file-results.ts` (+ spec) | pronto (2026-10-28) | `withFileResults(reply, files)`: com mais de um arquivo, põe `fileResults` (nome, tamanho, `ChatFileResult`) na primeira mensagem duradoura do agente (ou cria uma); `fileResultCells` (texto de cada coluna, tela e Excel; emissor "desconhecido" some; tipos `norma_integral`/`trecho_norma` traduzidos; barrado na quarentena = "Recusado na verificação de segurança"); `fileResultsXlsxTable` (planilha "Documentos") |
| `chat-request-error.ts` | pronto (P5; `traceId` na Fase 4) | `ChatRequestError(code, status, traceId?)`: forma única de falha, venha do BFF ou do mock |
| `chat-mock-server.ts` (+ spec) | pronto (P5) | `ChatMockServer`: simula o BFF com `src/assets/data/chat-fluxo-mock.json` (sessões em memória, validações, 3 rodadas, contatos, limite de 20 MB, `action: 'ask'` pelo `askNode`, listas de normas por nó, respostas guardadas por `requestId` e `cancel`, que desfaz o último pedido; antivírus falso por nome de arquivo em `fileScenarios.quarantine`, Fase 6). Fala o modelo interno, não o v1. Os testes rodam contra o arquivo real. Sai do build quando `chatMock` for falso e o arquivo for removido |
| `chat-api.service.ts` (+ spec) | pronto (P5; contrato v1 na Fase 6) | `ChatApiService` sobre `ApiService` no contrato v1 (`/v1/agente/sessoes`, `.../{sessaoId}` DELETE, `.../mensagens`, `.../arquivos`, `.../arquivos/{arquivoId}`, `.../avaliacoes`, `.../cancelamentos`; corpos pelos adaptadores de `chat-v1-adapters.ts`) ou sobre o `ChatMockServer`, conforme `chatMock` da configuração de execução (fábrica do token `CHAT_API_CONFIG` lê `RuntimeConfigService`, latência de mock de 700 ms para ver "digitando" e "Parar"; quarentena simulada de `MOCK_FILE_CHECK_MS` = 1,5 s). `sendFiles` devolve `ChatFileEvent`: multipart (`passoId`, `requisicaoId`, `arquivos` repetido) → 202 → `{ checking }` → consulta de cada arquivo a cada 2 s ou `Retry-After` (1–10 s) até sair de `EM_VERIFICACAO` e vir a `resposta` → `ChatFileReply`; prazo de 2 minutos (chama `cancelamentos` e falha com `FILE_CHECK_TIMEOUT`), 404 = `SESSION_NOT_FOUND`, 3 falhas seguidas = `SERVICE_UNAVAILABLE`; cancelar a inscrição para as consultas. Todo erro vira `ChatRequestError` com código conhecido: código antigo do corpo, código v1 do Problem Details (tabela 9.3 de `contratos-de-dados.md`) ou status (403 → `FORBIDDEN`, 413 sem corpo → `SEND_TOO_LARGE`, 429 → `RATE_LIMITED`), com o `traceId`. Fora do mock, `startSession` pede o primeiro nome ao `UserService` depois da sessão e o põe em `user.firstName` |
| `chat-session.service.ts` (+ spec) | pronto (P5) | `ChatSessionService`: estado da conversa (`state$`: mensagens, passo, `busy`, `typing`, `usedBytes`, `canRetry`, `hasInteraction`), `start`, `pickOption`, `sendText` (despedida pura encerra como `end`, sem ir ao BFF), `ask` (pergunta de outra tela: espera a sessão ficar livre e envia `action: 'ask'`; reabre se encerrada), `sendFiles` (um pedido com todos os arquivos; durante a quarentena, "Verificando o documento..." em cada anexo e uma nota de sistema transitória no lugar dos pontos de "digitando", retiradas ao fim, na falha, em "Parar" e ao recomeçar ou encerrar; veredito em cada anexo da mensagem do usuário, com o motivo quando a quarentena recusou; tabela de resultados com mais de um; só os bytes aceitos contam na cota), `back`, `restart`, `stop` (com pedido em andamento, chama `cancelRequest` e assume o passo devolvido se o usuário não agiu de novo), `retry` (mesmo `requestId`), `end` ("Encerrar": apaga a sessão no BFF, mantém a conversa na tela, acrescenta a despedida e passa ao passo local `closed`, onde só resta "Recomeçar"; o painel não fecha e reabrir não abre sessão nova), `rateMessage` (feedback otimista: agradece na hora, desfaz com `feedbackError` se falhar; não cria mensagem nem conta como interação); `sessionId` só em memória; efeito de digitação palavra por palavra (desligado com `prefers-reduced-motion`; "Parar" mostra o resto de uma vez); erro vira mensagem com "Tentar novamente" e, havendo `traceId`, `supportCode` ("Código de suporte"); `SESSION_NOT_FOUND` avisa (mensagem `transient`, some na próxima ação) e abre outra sessão; mensagens `transient` somem na próxima ação do usuário (M11); `messages$` (`ChatMessageEvent`, sem texto) e `errors$` (`ChatErrorEvent`) para log ou métrica (M21/M22) |
| `chat-norms-export.ts` (+ spec) | pronto (2026-10-28) | `normListXlsxTable(message, items, segment, today)`: planilha "Normas" com título da lista (texto do agente sem markdown nem dois-pontos), subtítulo (segmento ou "Todos os segmentos", quantidade, data de geração), colunas Norma, Observação, Segmento e data da lista; arquivo `agente-da-agenda-<lista>[-<segmento>]-<aaaa-mm-dd>.xlsx`. `formatNormDate` (ISO → `dd/mm/aaaa` por `Intl` em UTC, sem trocar o dia) e `normListTitle` |
| `chat-greeting.ts` (+ spec) | pronto (2026-10-28) | Saudação: `timeOfDayGreeting(now)` ("Bom dia" 5h–11h, "Boa tarde" 12h–17h, "Boa noite" 18h–4h, por `getHours()` do relógio local), `greetingName(raw)` (primeira palavra, só letras com acento/hífen/apóstrofo, até 40 caracteres, capitalizada; login, e-mail ou número → vazio), `buildGreeting(user, now)` e `withGreeting(messages, greeting)` (prefixa a primeira mensagem duradoura do agente ou cria uma). `ChatSessionService.start` aplica sobre a resposta de `sessao`; o relógio é `ChatSessionService.now`, trocável nos testes |
| `chat-farewell.ts` (+ spec) | pronto (2026-10-28) | `isFarewellMessage(text)`: verdadeiro só se a mensagem inteira for despedida ("tchau", "obrigado, era só isso", "pode encerrar", até 8 palavras, sem acentos); qualquer outra palavra a torna pergunta |
| `chat-launcher.service.ts` (+ spec) | pronto (2026-10-28) | `ChatLauncherService` (raiz, sem dependências): `open()` e `ask(question)` publicam em `requests$`; é o que outras telas injetam (hoje a Tabela Analítica), sem puxar os serviços HTTP do chat |

Os arquivos temporários `chat-demo-messages.ts` e `chat-demo-nodes.ts` (P3/P4) foram removidos no P5.

Regras que valem para todo o módulo: nenhum HTML vindo do BFF é renderizado fora de `safeMarkdown`; texto de erro vem de
`CHAT_ERROR_TEXTS`, nunca da mensagem do servidor; cores só por variáveis (R10); sem dado do chat em storage do navegador.

## 12. Camada HTTP (`src/app/core/http`, Fase 4 do plano de adequação)

Contrato: `docs/contratos-de-dados.md` seções 2 (serviço base, erros) e 8 (autenticação, CSRF, primeiro nome).

```
componente → serviço de dados / ChatApiService / UserService
           → ApiService (apiBase + /v1 + recurso)
           → HttpClient de provideAppHttpClient()
                ├─ apiErrorInterceptor (só URL sob apiBase): falha → ApiProblem; 401 → LoginRedirectService
                └─ XSRF (withXsrfConfiguration): cookie XSRF-TOKEN → cabeçalho X-XSRF-TOKEN em POST/PUT/PATCH/DELETE
```

| Peça | Comportamento |
|---|---|
| `provideAppHttpClient()` (`api-error.interceptor.ts`) | `provideHttpClient(withInterceptors([apiErrorInterceptor]), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))`; único provider de `HttpClient` em `app.config.ts`; os specs da camada usam o mesmo, com `provideHttpClientTesting()`. O `HttpClient` só manda o cabeçalho CSRF para URL relativa, o caso de `apiBase`. |
| `apiErrorInterceptor` | Funcional. Pedido fora de `apiBase` (`isApiUrl`; ex.: `assets/data/*.json`, `assets/env.json`) passa sem mudança. Falha de chamada ao BFF vira `ApiProblem`; 401 chama `LoginRedirectService.redirect()` e o erro segue para quem chamou. `RuntimeConfigService` lê o `env.json` por `HttpBackend`, sem passar por aqui. |
| `ApiProblem` (`api-problem.ts`) | `Error` com `status` (0 = rede), `code?` (só `VAL-`, `AUT-`, `NEG-` ou `SIS-` + 3 dígitos), `traceId?` (só letras, dígitos e hífen) e `kind` (`network`, `unauthenticated`, `forbidden`, `badRequest`, `notFound`, `rateLimited`, `serverError`, `timeout`). `message` e `details` do servidor nunca são guardados. `apiProblemText(problem)` → texto de `HTTP_ERROR_TEXTS` (`null` no 401). |
| `LoginRedirectService` | Navega uma vez por página para `loginUrl` + `retorno=<encodeURIComponent(caminho + query + fragmento)>` (nome do parâmetro é suposição); a navegação passa pelo token `BROWSER_NAVIGATE` (`location.assign`), trocado nos testes, que antes grava em `sessionStorage` só o horário (`landing-analitica.login-redirect-at`, epoch ms; não é token, R5). Quebra de laço: 401 menos de 60 s (`LOGIN_LOOP_WINDOW_MS`) depois da última ida à entrada não redireciona; `manualLoginUrl` (signal) guarda o endereço e `<app-session-expired-notice>` mostra "Sua sessão expirou e não foi possível entrar de novo automaticamente." com o link "Entrar novamente" (o clique também grava o horário). |
| `http-error-texts.ts` | `HTTP_ERROR_TEXTS` (pt-BR, chaves = `kind` exceto 401), `SUPPORT_CODE_TEXT` ("Código de suporte: {traceId}") e `supportCodeText(traceId)`; `EXPORT_LIMIT_TEXT`/`exportLimitText(total)` e `EXPORT_MAX_ROWS` (Excel da Tabela Analítica, D5). |
| `loadErrorMessage` + `<app-api-error-text>` | Erro de um bloco de dados: frase do bloco para 5xx genérico, payload inválido ou mock ausente; `HTTP_ERROR_TEXTS` para 400, 403, 404, 429, 504 e rede; nada no 401; com `traceId`, linha "Código de suporte: …" com o valor selecionável. |
| `UserService` (`core/services/user.service.ts`) | `firstName$()` para a saudação do chat; nunca erro na tela. |

Quem consome: `ChatApiService` (mapeia `ApiProblem` ou `HttpErrorResponse` para `ChatRequestError`), `UserService` e,
desde a Fase 5, todos os blocos de dados (cards de segmento, Normativos Recebidos, pizza, temas, Tabela Analítica e o
Excel dela, e-mails, Cascata) por `<app-api-error-text>`.
