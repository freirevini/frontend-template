# Dependências e ambiente

Referência de `package.json`, toolchain, `angular.json`, environments, proxy, comandos e CI do `landing-analitica`. Regras relacionadas: R1, R2, R6, R7, R9 em `.rules/projeto.md`. `npm run docs:check` confere que todo pacote de `package.json` está citado aqui.

## 1. Dependências (`package.json`)

Origem: "template" = já existia no CoreUI Free Angular Admin Template v4.3.13 (commit `36966f6`); "v5.5" = trocado na migração
para Node 22 / Angular 20 (2026-11-03, ADR-021) pela versão do CoreUI Free Angular Admin Template v5.5.24 (clone de
referência na pasta pai); "projeto" = adicionado por este projeto. Todas as versões são exatas, sem `^`/`~` (R1); o
`package-lock.json` foi regenerado do zero na migração.

### 1.1 `dependencies`

| Pacote | Versão | Origem | Motivo | Nexus / observação |
|---|---|---|---|---|
| `@angular/animations` | `20.3.14` | v5.5 | `provideAnimations()` (CoreUI usa animações em sidebar e dropdown). | Mesma versão para todos os `@angular/*` (exceto `cdk`). |
| `@angular/cdk` | `20.2.14` | v5.5 | Peer do `@coreui/angular` 5.5 (overlay, a11y). | Linha do CDK é 20.2. |
| `@angular/common` | `20.3.14` | v5.5 | Núcleo; `registerLocaleData(localePt)`, `HttpClient` (`provideHttpClient`). | — |
| `@angular/compiler` | `20.3.14` | v5.5 | Compilador de templates. | — |
| `@angular/core` | `20.3.14` | v5.5 | Núcleo. | — |
| `@angular/forms` | `20.3.14` | v5.5 | `ReactiveFormsModule` (formulário "De/Até" do filtro de período, campo do chat). | — |
| `@angular/language-service` | `20.3.14` | v5.5 | Suporte de IDE; não entra no bundle. | Pode ir para `devDependencies`, sem efeito no build. |
| `@angular/platform-browser` | `20.3.14` | v5.5 | `bootstrapApplication` em `src/main.ts`; `Title`. | — |
| `@angular/platform-browser-dynamic` | `20.3.14` | v5.5 | Peer de pacotes de teste; o app não usa `platformBrowserDynamic`. | Mantido como no template v5.5. |
| `@angular/router` | `20.3.14` | v5.5 | `provideRouter` com caminho limpo (`PathLocationStrategy`, sem `withHashLocation`), rotas lazy com `loadChildren` → `routes.ts`. | — |
| `@coreui/angular` | `5.5.24` | v5.5 | Componentes standalone (`c-card`, `c-sidebar`, `c-header`, `c-button-group`, `c-widget-stat-a/d`, `c-breadcrumb-router`…). | API 5.x: https://coreui.io/angular/docs/. Peer `@angular/core ^20.0.3`. |
| `@coreui/angular-chartjs` | `5.5.24` | v5.5 | `<c-chart>` (`ChartjsComponent`) sobre Chart.js 4; mesmas entradas do 4.x (`type`, `data`, `options`, `redraw`, `customTooltips`, `height`). **Não usar `[redraw]="true"`** nesta versão: `chartUpdate` destrói o gráfico e `chartRender` não o recria (a referência antiga continua em `chart`), então o canvas some na primeira troca de dados (E-011); sem `redraw`, dados e opções novos atualizam o mesmo gráfico. | — |
| `@coreui/chartjs` | `4.1.0` | v5.5 | Tooltip externo e SCSS de gráficos (`@coreui/chartjs/scss/coreui-chartjs`). | — |
| `@coreui/coreui` | `5.4.3` | v5.5 | SCSS base (`@coreui/coreui/scss/coreui`); gera as variáveis `--cui-*` e o modo escuro por `data-coreui-theme`. | Importado com `@import` (aviso silenciado, D-007). |
| `@coreui/icons` | `3.0.1` | template | Conjuntos de ícones SVG (`cil*`, `cib*`, `cif*`), subconjunto em `src/app/icons/icon-subset.ts`. | Mesma versão de antes. |
| `@coreui/icons-angular` | `5.5.24` | v5.5 | Diretiva `cIcon` (`IconDirective`) e `IconSetService`. | — |
| `@coreui/utils` | `2.0.2` | v5.5 | `getStyle()` e `hexToRgba()` usados para ler tokens CSS nos gráficos. | — |
| `@fontsource/inter` | `5.3.0` | projeto | Fonte Inter (base da marca) servida localmente, sem CDN (ADR-005). Arquivos CSS/woff2 referenciados em `angular.json`. | Pacote só com CSS e fontes, sem dependências. Não verificado no Nexus. Se faltar: remover as oito entradas `node_modules/@fontsource/inter/*.css` de `angular.json` (`build` e `test`) e `"Inter",` de `$brand-font-family` em `src/scss/_brand.scss`; a pilha cai para `system-ui`. |
| `chart.js` | `4.5.1` | v5.5 | Gráficos (Normativos Recebidos, Cascata, classificação, e-mails, mini-gráficos dos cards). | ESM no 4.x (sai de `allowedCommonJsDependencies`). Eixo sem linha: `border: { display: false }` (no 3.x era `grid.drawBorder`). |
| `exceljs` | `4.4.0` | projeto | Exportação XLSX gerada no navegador (R9). | Usado em `src/app/core/export/xlsx-export.ts` via `import('exceljs/dist/exceljs.min.js')` (build de navegador, chunk lazy de ~924 kB, só no clique). As tipagens do pacote exigem tipos do Node; por isso o módulo é declarado em `src/declarations.d.ts` e tipado localmente. `exceljs/dist/exceljs.min.js` é CommonJS e fica em `allowedCommonJsDependencies`. Confirmar no Nexus. |
| `ngx-scrollbar` | `13.0.3` | v5.5 | `<ng-scrollbar>` no menu lateral (`default-layout.component.html`), como no layout do CoreUI 5.5. | Substitui, desde a migração, `ngx-perfect-scrollbar` (biblioteca View Engine, não compila no Angular 16+). Peer `@angular/core >=16`. |
| `rxjs` | `7.8.2` | v5.5 | Observables (`BehaviorSubject`, `takeUntil`, `shareReplay`, `switchMap`). | R1: 7.8.x. |
| `tslib` | `2.8.1` | v5.5 | Helpers do TypeScript (`importHelpers: true`). | — |
| `zone.js` | `0.15.1` | v5.5 | Detecção de mudanças; polyfill em `angular.json`. | R1: 0.15.x. |

Saíram na migração: `ngx-perfect-scrollbar` (trocado por `ngx-scrollbar`), `jspdf` e `jspdf-autotable` (não eram
importados; voltam com a exportação PDF, R9, na versão do Nexus compatível com Angular 20).

### 1.2 `devDependencies`

| Pacote | Versão | Origem | Motivo | Nexus / observação |
|---|---|---|---|---|
| `@angular/build` | `20.3.12` | v5.5 | Builders `application` (esbuild), `dev-server`, `karma`, `extract-i18n`. | Substitui `@angular-devkit/build-angular`. |
| `@angular/cli` | `20.3.12` | v5.5 | `ng` local (`npx ng`, scripts `npm`). | Não instalar CLI global. |
| `@angular/compiler-cli` | `20.3.14` | v5.5 | Compilação AOT. | — |
| `@angular/localize` | `20.3.14` | v5.5 | `/// <reference types="@angular/localize" />` em `src/main.ts`; polyfill `@angular/localize/init`; `types` em `tsconfig.app.json` e `tsconfig.spec.json`. | Herdado do template; não há tradução i18n em uso e nenhum `$localize` no código do projeto. |
| `@types/jasmine` | `5.1.13` | v5.5 | Tipos dos testes. | — |
| `@types/node` | `22.19.1` | v5.5 | Tipos de Node 22 (scripts, Karma). | — |
| `jasmine-core` | `5.12.1` | v5.5 | Framework de testes. | — |
| `karma` | `6.4.4` | v5.5 | Runner de testes (`karma.conf.js`). | Marcado como descontinuado upstream; funciona no `@angular/build:karma` 20. |
| `karma-chrome-launcher` | `3.2.0` | template | Abre Chrome/ChromeHeadless. | Pipeline precisa de Chrome instalado ou `CHROME_BIN`. |
| `karma-coverage` | `2.2.1` | v5.5 | Cobertura em `coverage/landing-analitica`. | — |
| `karma-jasmine` | `5.1.0` | template | Adaptador Jasmine. | — |
| `karma-jasmine-html-reporter` | `2.1.0` | v5.5 | Relatório HTML (`kjhtml`). | — |
| `typescript` | `5.9.3` | v5.5 | Compilador; Angular 20 exige `>=5.8 <6.0`. | — |

### 1.3 Pacote

- `name`: `landing-analitica`; `version`: `0.1.0`; `private: true`; `license`: `MIT`.
- `engines`: `node ^22.12.0`, `npm >= 10.9.4` (exigência do ambiente de destino; npm recomendado `^11.10.1`).
- `scripts`: `ng`, `start` (`ng serve`), `build` (`ng build`), `build:prod` (`ng build --configuration production`), `watch`, `test` (`ng test`), `test:ci` (`ng test --watch=false --browsers=ChromeHeadless`), `e2e` (`npm --prefix e2e test`: smoke Playwright da seção 1.5, fora do `verify`), `docs:inventory` (`node scripts/docs-inventory.js`), `docs:check` (`node scripts/docs-check.js`), `rules:check` (`bash .rules/check.sh`), `hooks:install` (`git config core.hooksPath .githooks`), `verify` (`docs:check` → `rules:check` → `build:prod` → `test:ci`, para no primeiro erro).
- `package-lock.json` (lockfile v3) tem os `resolved` em `https://registry.npmjs.org/`. Na esteira, o `npm ci` baixa do Nexus mesmo assim: o npm 10/11 troca esse host pelo `registry` configurado (`replace-registry-host`, padrão `npmjs`), e o `.npmrc` aponta para `NPM_REGISTRY` (seção 1.4). Se o Nexus servir tarball com integridade diferente (404 em `resolved` ou `EINTEGRITY`), o lock é regenerado no ambiente corporativo (`rm -rf node_modules package-lock.json && npm install`, mesmas versões exatas) e commitado; depois `grep -c registry.npmjs.org package-lock.json` dá `0` (`docs/portabilidade.md` 1.3).
- npm 11 avisa `install-scripts` para `core-js`, `esbuild` e `fsevents` (scripts de instalação sem `allowScripts`): informativo; os scripts rodam e o build passa.

### 1.4 Registry npm (`.npmrc`)

Regra corporativa: `.npmrc` obrigatório apontando para o proxy npm do Nexus (`npm-all`) com `always-auth=true`
(ADR-023, Fase 7). Nenhum host interno nem credencial é versionado (R6): o `.npmrc` da raiz (e o de `e2e/`, porque o npm
só lê o `.npmrc` do pacote que está instalando) tem três linhas efetivas:

```ini
registry=${NPM_REGISTRY}
registry${NPM_REGISTRY?}=https://registry.npmjs.org/
always-auth=true
```

- **Esteira:** `NPM_REGISTRY` = URL do `npm-all` do Nexus, vinda de uma credencial *Secret text* do Jenkins
  (`npm-registry-url`, mascarada no log) e exportada para **todos** os comandos `npm` (o npm 10 recusa até `npm run`
  com o registry inválido). O token vai num *user config* separado: credencial *Secret file* (`npm-userconfig`) com a
  linha de autenticação do registry (`//<caminho do registry>/:_auth=...` ou `:_authToken=...`), entregue ao npm por
  `NPM_CONFIG_USERCONFIG` no `npm ci` e como segredo BuildKit (`--secret id=npmrc`) no `docker build`. Nada disso
  fica no repositório nem na imagem final.
- **Estação de trabalho sem a variável:** a segunda linha é o fallback. Com npm 11.6 ou mais novo, `${NPM_REGISTRY?}`
  vira texto vazio quando a variável não existe; a chave passa a ser `registry` e, por ser a última, vale o registry
  público. Com a variável definida, a chave vira `registry<url>`, que não é configuração do npm e é ignorada. O npm
  não tem sintaxe de valor padrão (`${VAR:-padrão}` fica literal).
- **npm 10 (inclui o 10.9.x das imagens Node 22):** não conhece `${VAR?}`. Com `NPM_REGISTRY` definida funciona igual
  (a segunda chave fica literal e é ignorada); sem ela, todo comando `npm` falha com `ERR_INVALID_URL`. Na estação com
  npm 10: `export NPM_REGISTRY=https://registry.npmjs.org/` (ou a URL do Nexus).
- `always-auth` não existe mais desde o npm 9 (a autenticação vai sempre que há credencial para o registry): fica por
  exigência da regra corporativa e gera o aviso `Unknown project config "always-auth"` (seção 7).

Comportamento medido em 2026-11-04, dentro do projeto, com `npm config get registry` (URL fictícia
`https://nexus.example.invalid/...` no lugar do Nexus):

| npm | `NPM_REGISTRY` | Registry resolvido | Observação |
|---|---|---|---|
| 11.21.1 | ausente | `https://registry.npmjs.org/` | `npm view left-pad version` respondeu `1.3.0` (GET 200 no registry público) |
| 11.21.1 | definida | a URL da variável | `npm run rules:check` também funciona |
| 10.8.2 | ausente | `${NPM_REGISTRY}` (literal) | `npm view` e `npm run` falham com `ERR_INVALID_URL` |
| 10.8.2 | definida | a URL da variável | — |

Formas testadas e descartadas: só `registry=${NPM_REGISTRY}` (sem a variável, `ERR_INVALID_URL` no npm 10 e 11);
`registry=${NPM_REGISTRY:-https://registry.npmjs.org/}` (o npm não interpreta `:-`; fica literal mesmo com a variável
definida); só `registry=${NPM_REGISTRY?}` (vazio sem a variável: `ERR_INVALID_URL`). O suporte a `${VAR?}` entrou no
`@npmcli/config` 10.4 (npm 11.6); o npm 10.9 usa o `@npmcli/config` 9.0.0, sem ele (conferido no código-fonte, como o
10.8.2 testado).

### 1.5 Pacote `e2e/` (smoke E2E, Playwright)

Pasta com `package.json` próprio (`landing-analitica-e2e`, `private`, `engines` `node ^22.12.0`), fora do build do app
(`tsconfig.app.json` e `tsconfig.spec.json` excluem `e2e/**`; o Karma só procura `*.spec.ts` dentro de `src/`) e fora do
`npm run verify` (precisa do app no ar e de navegador). Não instalado neste repositório e sem `package-lock.json` até a
primeira instalação no Nexus.

| Pacote | Versão | Motivo | Nexus / observação |
|---|---|---|---|
| `@playwright/test` | `1.64.1` | Runner e API do smoke E2E (ADR-023, D8 a). Traz `playwright` e `playwright-core` na mesma versão exata. | `engines` `node >=20`. Os navegadores **não** vêm do npm: usar imagem com os navegadores da 1.64.1, `npx playwright install` com espelho do Nexus (`PLAYWRIGHT_DOWNLOAD_HOST`) ou o Chrome/Chromium da máquina por `E2E_CHROME_BIN`/`CHROME_BIN`. Confirmar no Nexus. |
| `@types/node` | `22.19.1` | Tipos de `process.env` no `playwright.config.ts` e nas specs (verificação de tipos e IDE). | Mesma versão da raiz. |

- `scripts`: `test` (`playwright test`), `report` (`playwright show-report`). Na raiz, `npm run e2e`.
- `playwright.config.ts`: `baseURL` = `E2E_BASE_URL` (padrão `http://localhost:4300`); Chromium desktop 1440×900,
  `pt-BR`, fuso `America/Sao_Paulo`, tema claro do sistema; com `CI`, 1 worker, 1 nova tentativa, relatórios `list`,
  JUnit (`e2e/test-results/junit.xml`) e HTML (`e2e/playwright-report/`); `trace` e captura de tela só em falha.
- `support/fixtures.ts`: todo teste falha se a página lançar erro não tratado (`pageerror`).
- Specs (`e2e/specs/`): `pages.spec.ts` (as quatro páginas por URL direta e após recarregar, status < 400, rota
  inexistente volta ao Início), `sidebar.spec.ts` (Triagent › Tabela Analítica rola até a seção e o grupo continua
  aberto, E-006), `theme.spec.ts` (Escuro/Claro em `data-theme` e `data-coreui-theme`, escolha mantida após recarregar),
  `chat.spec.ts` (abre o Agente da Agenda, "Consultar uma norma", pergunta e recebe resposta; o `env.json` é servido
  com `chatMock: true` pelo próprio teste, para não depender do BFF), `export.spec.ts` ("Exportar Excel" da Tabela
  Analítica baixa `tabela-analitica-*.xlsx`).
- Verificado em 2026-11-04: `tsc --noEmit` sem erros (TypeScript 5.9.3, tipos do `@playwright/test` 1.59.1 já presentes
  na máquina, `@types/node` 22.19.1) e os 9 testes verdes contra o build de produção servido com fallback para
  `index.html`, com o Chrome do sistema (`E2E_CHROME_BIN`). A 1.64.1 em si não foi instalada aqui.

## 2. Toolchain

| Item | Valor | Observação |
|---|---|---|
| Node.js | 22.x, `^22.12.0` (`engines`) | Angular 20 aceita `^20.19 \|\| ^22.12 \|\| ^24`; o destino exige 22. Com nvm: `nvm install 22 && nvm use` (lê `.nvmrc`, que contém `22`). |
| npm | `>= 10.9.4` (recomendado `^11.10.1`) | Verificado com npm 11.21. |
| Angular CLI | local, `@angular/cli` 20.3.12 | Usar `npx ng ...` ou os scripts `npm`. `cli.analytics: false` em `angular.json`. |
| TypeScript | 5.9.3 | `target` ES2022, `module: preserve`, `moduleResolution: bundler`, `isolatedModules`, `esModuleInterop`, `strict`, `strictTemplates`, `typeCheckHostBindings`, `noPropertyAccessFromIndexSignature`, `useDefineForClassFields: false` (`tsconfig.json`). Sem `skipLibCheck`. |
| Registry | `NPM_REGISTRY` (esteira: Nexus `npm-all`); sem a variável, npm público (npm 11.6+) | `.npmrc` versionado só com referência à variável e `always-auth=true`, sem host nem credencial (seção 1.4). |
| Versões congeladas | Node 22, Angular 20.3.x, TS 5.9.x, RxJS 7.8.x, zone.js 0.15.x, `@coreui/angular` 5.5.x, `@coreui/coreui` 5.4.x, chart.js 4.5.x | Proibido `ng update` e subir major sem aprovação (R1). |
| Dependência nova | só com `peerDependencies`/`engines` compatíveis, disponível no Nexus, versão exata | Sem URL, CDN ou git (R2). |
| Editor | `.editorconfig`: UTF-8, 2 espaços, aspas simples em `.ts` | — |

## 3. `angular.json`

Projeto único `landing-analitica` (`projectType: application`, `root: ""`, `sourceRoot: src`, `prefix: app`; schematics geram componentes com `style: scss` e `strict: true`).

### 3.1 `build` (`@angular/build:application`, esbuild)

| Opção | Valor |
|---|---|
| `outputPath` | `dist/landing-analitica` |
| `index` / `browser` | `src/index.html` / `src/main.ts` |
| `polyfills` | `["@angular/localize/init", "zone.js"]` |
| `tsConfig` | `tsconfig.app.json` |
| `inlineStyleLanguage` | `scss` |
| `preserveSymlinks` | `true` |
| `assets` | `["src/assets"]` (inclui `assets/data/*.json`, `assets/img/brand/*.svg`, `assets/favicon.svg`) |
| `styles` | 8 arquivos `node_modules/@fontsource/inter/latin{,-ext}-{400,500,600,700}.css` e depois `src/scss/styles.scss` |
| `scripts` | `[]` |
| `allowedCommonJsDependencies` | `exceljs/dist/exceljs.min.js` (Chart.js 4 e `@coreui/chartjs` 4 são ESM) |
| `stylePreprocessorOptions` | `sass.silenceDeprecations: ["import"]`: os SCSS do projeto ainda usam `@import` (D-007; migrar para `@use` antes do Sass 3) |
| `defaultConfiguration` | `production` |

Configuração `production`: `outputHashing: all`; `fileReplacements` troca `src/environments/environment.ts` por `src/environments/environment.prod.ts`; budgets:

| Tipo | Aviso | Erro |
|---|---|---|
| `initial` | 1500 kB | 6 MB |
| `anyComponentStyle` | 2 kB | 4 kB |

O budget de 4 kB por `.component.scss` é a razão de os estilos compartilhados viverem em `src/scss/` (ADR-009).

Configuração `development`: `optimization: false`, `extractLicenses: false`, `sourceMap: true` (`buildOptimizer`, `vendorChunk` e `namedChunks` não existem no builder `application`). Saída de produção em `dist/landing-analitica/browser/`.

### 3.2 `serve` (`@angular/build:dev-server`)

`options.proxyConfig: proxy.conf.json` vale só para o `ng serve`; o build de produção não tem proxy. `defaultConfiguration: development`; `buildTarget` `landing-analitica:build:development|production`.

### 3.3 `test` (`@angular/build:karma`)

`polyfills: ["zone.js", "zone.js/testing", "@angular/localize/init"]`, sem `src/test.ts` (o builder encontra os `*.spec.ts` e inicializa o `TestBed`), `tsConfig: tsconfig.spec.json`, `karmaConfig: karma.conf.js`, mesmos `assets` e `styles` do build (incluindo as fontes).

`karma.conf.js` (do template, só o diretório de cobertura foi renomeado para `coverage/landing-analitica`): frameworks `jasmine` (o plugin do builder antigo saiu), reporters `progress` e `kjhtml`, `browsers: ['Chrome']`, `singleRun: false`, `autoWatch: true`, porta 9876.

### 3.4 `extract-i18n`

Mantido do template; não usado.

## 4. Environments, proxy e API

| Arquivo | Conteúdo | Observação |
|---|---|---|
| `src/environments/environment.ts` | `{ production: false }` | Desenvolvimento. Só flags de build. |
| `src/environments/environment.prod.ts` | `{ production: true }` | Produção; substitui o anterior via `fileReplacements`. |
| `src/assets/env.json` | `{ "apiBase": "/api", "loginUrl": "/api/v1/autenticacao/login", "chatMock": true, "dataMock": true, "footerEntities": [] }` | Configuração de execução, lida antes do bootstrap por `RuntimeConfigService` (`src/app/core/config/`). Versionado com padrões seguros de dev, sem host. Em cada ambiente, ConfigMap montado em `/usr/share/nginx/html/assets/env.json` (mesma imagem DES → UAT → PRD). Arquivo ausente ou ilegível: padrões acima e um `console.error`; chave de tipo errado: só ela volta ao padrão. |
| `proxy.conf.json` | `"/api"` → `"target": "http://HOST_DEV_BFF:PORTA"`, `secure: false`, `changeOrigin: true`, `logLevel: info` | `HOST_DEV_BFF:PORTA` é um placeholder a ser trocado pelo host do BFF de desenvolvimento **só no ambiente de destino**. Não commitar host real. |

Regras (R4, R6):

- Toda chamada HTTP monta a URL como `apiBase` (do `env.json`) + `/v1` + recurso do contrato (`/segmentos`, `/usuarios/me`...), pelo `ApiService`. Nunca URL absoluta no código.
- `environment.ts`/`environment.prod.ts` só com `production`; tudo que muda por ambiente (`apiBase`, `loginUrl`, `chatMock`, `dataMock`, `footerEntities`) fica no `env.json`.
- `chatMock`: `true` usa o agente simulado de `src/assets/data/chat-fluxo-mock.json`; `false` chama o BFF (caminhos do chat sob `/v1`, adequados ao contrato na Fase 6) e pede o primeiro nome em `GET /v1/usuarios/me`. Trocar no `env.json` do ambiente quando os endpoints existirem (`docs/contratos-de-dados.md`), sem novo build.
- `dataMock`: `true` (padrão) faz os blocos de dados (cards, gráficos, Tabela Analítica) lerem os mocks de `src/assets/data/`, como sempre; `false` faz cada serviço de dados chamar o BFF no contrato v1 (`/v1/segmentos`, `/v1/normativos-recebidos`, `/v1/normas-classificadas` paginado e `/resumo`, `/v1/emails-sugestao` e `/resumo`, `/v1/cascatas-resultado`; `docs/contratos-de-dados.md` §2). Trocar no `env.json` do ambiente, sem novo build.
- Para onde `/api` aponta em cada ambiente é configuração do Ingress (rota `/api/*` para o Service do BFF), nunca do front nem do Nginx da imagem.
- Proibido `localhost`, hosts `appdes`/`appuat` ou URLs de backend no código versionado e no `dist/`.
- Com `dataMock: true` os dados vêm de `src/assets/data/` (`dashboard-segments.json`, `dashboard-classificacao.json`, `dashboard-emails.json`, `dashboard-waterfall.json`, lidos pelos serviços de dados com `HttpClient`); com `false`, do BFF pelo `ApiService`. Ver `docs/contratos-de-dados.md` e ADR-002.

## 5. Comandos

| Objetivo | Comando | Observação |
|---|---|---|
| Instalar | `npm ci` | Usa o lockfile; falha se `package.json` e `package-lock.json` divergirem. |
| Desenvolvimento | `npm start` | `ng serve` em `http://localhost:4200`, com proxy de `/api`. Rotas com caminho limpo (`/triagent`, `/triagent#tabela-analitica`); o `ng serve` já devolve `index.html` para qualquer caminho. |
| Build de produção | `npm run build:prod` | Saída em `dist/landing-analitica/browser`. Deve passar sem erros (R7). |
| Imagem do servidor web | `docker build --build-arg NODE_IMAGE=<node22-corporativa> --build-arg WEB_IMAGE=<nginx-nao-root-corporativa> --build-arg NPM_REGISTRY=<npm-all> --secret id=npmrc,src=<user-config-com-token> -t landing-analitica .` | `Dockerfile` multi-stage (build Node 22 + Nginx não-root na porta 8080, `nginx/default.conf`). Sem os `--build-arg`, usa as imagens públicas provisórias (`node:22`, `nginxinc/nginx-unprivileged:1.27-alpine`) e o registry público, só para teste local; `NPM_REGISTRY` e o segredo `npmrc` (BuildKit, opcional) ficam no estágio de build, fora da imagem final. Rodar: `docker run -p 8080:8080 landing-analitica`; outro `env.json`: `-v ./meu-env.json:/usr/share/nginx/html/assets/env.json:ro`. |
| Testes uma vez, headless | `npm run test:ci` | `karma.conf.js` está em modo watch com Chrome; os flags sobrescrevem. Em contêiner sem sandbox pode ser preciso um launcher customizado com `--no-sandbox`. |
| Smoke E2E | `npm --prefix e2e ci` (ou `install`, até existir o lock de `e2e/`) e `npm run e2e` | Playwright contra `E2E_BASE_URL` (padrão `http://localhost:4300`: `docker run --rm -p 4300:8080 landing-analitica` ou `npx ng serve --port 4300`). Sem os navegadores do Playwright: `E2E_CHROME_BIN=<caminho do Chrome>`. Relatório: `npm --prefix e2e run report`. Seção 1.5. |
| Hosts proibidos no `dist` | `grep -rEl "localhost|appdes|appuat|HOST_DEV_BFF|https?://[a-z0-9.-]+\.(DOMINIO_INTERNO)\." dist/landing-analitica \|\| echo "ok: nenhum host proibido"` | Deve imprimir `ok`. Rodar após o build (R6). Trocar `DOMINIO_INTERNO` pelo domínio interno do ambiente (fora do repositório). |
| Verificar documentação | `npm run docs:check` | `scripts/docs-check.js`: documentos obrigatórios presentes, pastas de `views/` citadas em `docs/arquitetura.md`, mocks citados em `docs/contratos-de-dados.md`, dependências citadas aqui, carimbo `tokens-hash` em `docs/design-system.md`, inventário não defasado, seções obrigatórias de `docs/portabilidade.md`. Código de saída 1 lista as pendências. |
| Regenerar inventário | `npm run docs:inventory` | `scripts/docs-inventory.js` escreve `docs/inventario.md` (rotas, tokens claro/escuro, dependências, arquivos alterados em relação ao commit `36966f6` do template). Precisa de `git`. Commitar o resultado. |
| Verificar regras de IA | `npm run rules:check` | `.rules/check.sh` (bash): `AGENTS.md` e `.rules/` presentes, até 12.000 caracteres por arquivo, sem slot sobrando, IDs únicos em `erros.md`/`decisoes.md`, sem segredo. No Windows, rodar no Git Bash ou configurar `script-shell` (portabilidade 4.13). |
| Tudo antes de "pronto" | `npm run verify` | `docs:check` → `rules:check` → `build:prod` → `test:ci`; para no primeiro erro. É a definição de pronto (R7). |
| Ligar hooks de git | `npm run hooks:install` | Uma vez por clone. `pre-commit`: `docs:check` + `rules:check` (segundos). `commit-msg`: commit `fix`/"corrige" sem entrada nova em `.rules/erros.md` e sem `*.spec.ts` alterado é recusado (`[sem-teste: motivo]` na mensagem dispensa o teste). |

Os dois scripts em `scripts/` usam só Node (22) e `git`; nenhuma dependência extra. Foram adicionados pelo mantenedor para a regra R13 (documentação viva).

## 6. CI e esteira (`Jenkinsfile`)

- Testes unitários: Karma + Jasmine pelo builder `@angular/build:karma`, Chrome headless (seção 5), mantidos por
  decisão (ADR-023, D8 a); cobertura em `coverage/landing-analitica` (HTML e `text-summary`). Jest fica para entrega
  separada: trocar `@angular/build:karma` por Jest compatível com Angular 20 (ou pelo builder de testes do Angular 21+)
  e revisar `spyOn`, `fakeAsync` e `jasmine.*` nas specs (`docs/portabilidade.md` 4.6).
- E2E: smoke Playwright em `e2e/` (seção 1.5), rodado pela esteira contra DES.
- `Jenkinsfile` (declarativo, na raiz) — substitui o "só exemplo de CI" da decisão D-004 de `.rules/decisoes.md`:

| Estágio | Onde roda | O que faz |
|---|---|---|
| Checkout | agente `docker` | `checkout scm`; `IMAGE_TAG` = 12 primeiros caracteres do commit |
| Node 22 › `npm ci` | contêiner `NODE_IMAGE` (Node 22 + Chromium headless) | `npm ci` com `NPM_REGISTRY` e o *user config* com token (`NPM_CONFIG_USERCONFIG`) |
| Node 22 › `npm run verify` | mesmo contêiner | `docs:check`, `rules:check`, `build:prod`, `test:ci` (Karma com `CHROME_BIN` da imagem; falha cedo se ausente) e `grep` de hosts proibidos no `dist/` |
| Varreduras | agente `docker` | SonarQube e Veracode em paralelo: **placeholders** (`echo`), com o comando esperado em comentário |
| Imagem | `develop`, `release/*` | `docker build` com `NODE_IMAGE`, `WEB_IMAGE`, `NPM_REGISTRY` e segredo BuildKit `npmrc`; `docker push` em `IMAGE_REPOSITORY:IMAGE_TAG` |
| Imagem do release | tag | não reconstrói: confere que `IMAGE_REPOSITORY:IMAGE_TAG` já existe (construída por `release/*` e validada em UAT) |
| Deploy DES | `develop` | `deployTo('DES')`: **placeholder** do mecanismo da esteira corporativa (Helm, ArgoCD ou kubectl) |
| E2E DES | `develop`, contêiner `PLAYWRIGHT_IMAGE` | `npm --prefix e2e ci` (ou `install` sem lock) e `npm run e2e` com `E2E_BASE_URL` = `E2E_BASE_URL_DES`; publica JUnit e o relatório HTML |
| Deploy UAT | `release/*` | `deployTo('UAT')` (placeholder) |
| Deploy PRD | tag | `when` com `beforeAgent` e `beforeInput` (nenhum executor fica preso esperando a aprovação; o agente só é alocado depois dela); `input` com o número da GMUD (aprovadores: placeholder `PLACEHOLDER-grupo-aprovador-prd`); sem GMUD, falha; depois `deployTo('PRD')` |

Configuração no Jenkins (nada disso entra no repositório, R6):

| Nome | Tipo | Conteúdo |
|---|---|---|
| `npm-registry-url` | credencial *Secret text* | URL do proxy npm do Nexus (`npm-all`); vira `NPM_REGISTRY` em todos os estágios |
| `npm-userconfig` | credencial *Secret file* | *user config* do npm com a linha de autenticação do registry |
| `image-registry` | credencial usuário/senha | registry corporativo de imagens (`docker login` no host de `IMAGE_REPOSITORY`) |
| `NODE_IMAGE` | variável da pasta | imagem Node 22 com Chromium headless que define `CHROME_BIN` (Karma) |
| `WEB_IMAGE` | variável da pasta | imagem Nginx não-root corporativa |
| `PLAYWRIGHT_IMAGE` | variável da pasta | imagem Node 22 com os navegadores do Playwright 1.64.1 |
| `IMAGE_REPOSITORY` | variável da pasta | repositório da imagem do app, sem tag |
| `E2E_BASE_URL_DES` | variável da pasta | endereço do painel em DES |

Rótulo do agente (`docker`) e grupo aprovador de PRD são literais marcados como placeholder no topo do `Jenkinsfile`.
Pendências conhecidas: Q9 (a imagem Node 22 de build ser aceita), imagem com Node 22 **e** Chromium para o Karma (se a
`chromium-headless` corporativa não tiver Node 22, derivar uma; se o Chrome recusar rodar sem sandbox no contêiner,
apontar `CHROME_BIN` para um *wrapper* com `--no-sandbox`), builder sem BuildKit (Kaniko não monta `--secret`: anexar a
linha de autenticação a uma cópia do `.npmrc` só no workspace da esteira) e a verificação de commits de correção
(`bash .rules/check.sh --range <base>..HEAD`) em pull requests, se a esteira os construir.

## 7. Avisos conhecidos

| Aviso | Origem | Ação |
|---|---|---|
| Aviso de depreciação `@import` do Sass | `styles.scss` e parciais usam `@import` com o CoreUI 5 (que usa `@use`). | Silenciado em `angular.json` (`silenceDeprecations: ["import"]`); migrar para `@use ... with()` antes do Sass 3 (D-007). |
| Vulnerabilidades em `npm audit` | Em 2026-11-03, após a migração: 54 (1 baixa, 32 moderadas, 19 altas, 2 críticas), em dependências transitivas (toolchain, Karma, `exceljs`). | Revisar com `npm audit` no Nexus; correção que exija subir major segue a R1. Registrar no pipeline as aceitas. |
| `@fontsource/inter` não verificado no Nexus | Pacote novo. | Se indisponível, aplicar o fallback da seção 1.1. |
| Aviso de CommonJS ao importar `exceljs` | `exceljs` é CommonJS. | Resolvido: `exceljs/dist/exceljs.min.js` está em `allowedCommonJsDependencies`. Conferir o `jspdf` quando entrar. |
| `EBADENGINE` no `npm ci` | Node fora de `^22.12.0`. | Usar `nvm use` (`.nvmrc` = 22). |
| `npm warn install-scripts` | npm 11 sem `allowScripts` para `core-js`, `esbuild`, `fsevents`. | Informativo; não bloqueia. |
| `Unknown project config "always-auth"` e `Unknown project config "registry${NPM_REGISTRY?}"` | npm 11 lendo o `.npmrc` (seção 1.4): `always-auth` saiu do npm 9; a segunda chave é o fallback sem a variável. | Informativo; o npm avisa que chave desconhecida "vai parar de funcionar" no próximo major: rever o `.npmrc` antes de adotar o npm 12. |
| `ERR_INVALID_URL` em qualquer comando `npm` | npm 10 sem `NPM_REGISTRY` (não conhece `${VAR?}`). | `export NPM_REGISTRY=...` ou npm 11.6+ (seção 1.4). |
| `karma.conf.js` em modo watch | Template. | Sempre passar `--watch=false --browsers=ChromeHeadless` no CI. |
