# Plano de migração — Node 22, Angular 20, CoreUI 5.5

**Data:** 2026-11-03 · **Situação:** aprovado em 2026-11-03 (Angular 20.3; P6 nesta entrega; `jspdf` removido;
nenhum commit pelo agente); **executado em 2026-11-03** (ver §10) · **Escopo:** `landing-analitica` (P0–P5, P7) e
`frontend-template-angular` (P6)

Premissa dada pelo ambiente de destino: Node.js `^22.12.0`, npm `>= 10.9.4` (recomendado `^11.10.1`). O projeto hoje
declara Node 18 (`engines`, `.nvmrc`) e Angular 15.2.8, que só suporta Node 14/16/18. Em 2026-11-03 o `npm run verify`
passou em Node 22.23 + npm 11.21 numa cópia limpa (414 testes), mas sem suporte oficial e com `EBADENGINE` no `npm ci`.
Este plano leva o projeto para a linha suportada mantendo tudo o que foi desenvolvido.

## 1. Alvo e premissas

| Item | Hoje | Alvo | Motivo |
|---|---|---|---|
| Node | 18.x (`.nvmrc`, `engines <19`) | `^22.12.0` | exigência do destino |
| npm | `>= 9` | `>= 10.9.4` | exigência do destino; lockfile v3 já é o formato do npm 10/11 |
| Angular | 15.2.8 | **20.3.x** (LTS até 2027-05) | único requisito de Node igual ao do destino (`^20.19 \|\| ^22.12 \|\| ^24`); mesma versão do clone CoreUI 5.5 em `LangePageAgenda/`, que vira o exemplo vivo |
| TypeScript | 4.9.5 | 5.9.x | Angular 20 exige `>= 5.8 < 6.0` |
| CoreUI | `@coreui/angular` 4.4.7, `coreui` 4.2.6, `chartjs` 3.1 | 5.5.24, 5.4.3, 4.1.0 | 5.5 exige Angular `^20.0.3` |
| Chart.js | 3.9 | 4.5 | exigido por `@coreui/angular-chartjs` 5.5 |
| Scrollbar | `ngx-perfect-scrollbar` 10 (View Engine) | `ngx-scrollbar` 13 | o ngcc saiu no Angular 16; biblioteca View Engine não compila mais |

O que não muda: RxJS 7.8, `@coreui/icons` 3.0, `@coreui/utils` 2.0, `@fontsource/inter` 5.3 (ADR-005), `exceljs` 4.4
(ADR-017), Karma 6.4 + ChromeHeadless, roteamento por hash (ADR-001), tema próprio por tokens `--app-*` (ADR-003/004),
pt-BR (ADR-008), orçamento de CSS por componente (ADR-009), contratos e mocks de dados (ADR-002, ADR-015), fichas (R15).

**Se o destino for Angular 21 ou 22:** dizer antes de P1. O caminho é o mesmo; mudam as versões da tabela da §2 e,
no 21+, o runner padrão (Vitest), que fica fora deste plano.

**Nexus (R2):** antes de P1, confirmar que cada pacote da §2 existe no Nexus na versão exata. Pacote ausente vira
Pergunta Aberta, não substituição silenciosa.

## 2. Mapa de versões (também é a lista para o Nexus)

| Pacote | Hoje | Depois |
|---|---|---|
| `@angular/{animations,cdk,common,compiler,core,forms,localize,platform-browser,platform-browser-dynamic,router,language-service,compiler-cli}` | 15.2.8 | 20.3.14 |
| `@angular/cli`, `@angular/build` (substitui `@angular-devkit/build-angular`) | 15.2.7 | 20.3.12 |
| `typescript` | 4.9.5 | 5.9.3 |
| `zone.js` | 0.13.x | 0.15.1 |
| `rxjs`, `tslib` | 7.8.x, 2.x | iguais |
| `@coreui/angular`, `@coreui/angular-chartjs`, `@coreui/icons-angular` | 4.4.7 | 5.5.24 |
| `@coreui/coreui` | 4.2.6 | 5.4.3 |
| `@coreui/chartjs` | 3.1.1 | 4.1.0 |
| `@coreui/icons`, `@coreui/utils` | 3.0.1, 2.0.1 | iguais |
| `chart.js` | 3.9.1 | 4.5.1 |
| `ngx-perfect-scrollbar` | 10.1.1 | **removido** |
| `ngx-scrollbar` | — | 13.0.3 |
| `@fontsource/inter`, `exceljs` | 5.3.0, 4.4.0 | iguais |
| `jspdf`, `jspdf-autotable` | 2.5.2, 3.8.4 | **removidos** (sem uso; voltam com a exportação PDF, R9, na versão que o Nexus tiver) |
| `@types/node` | ^18.16 | ^22.19 |
| `@types/jasmine`, `jasmine-core` | ^4.3, ~4.6 | ^5.1, ^5.12 |
| `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`, `karma-jasmine-html-reporter` | 6.4 / 3.2 / 2.2 / 5.1 / 2.0 | 6.4.4 / 3.2 / 2.2.1 / 5.1 / 2.1 |
| `engines` | `node >=18.16.0 <19`, `npm >= 9` | `node ^22.12.0`, `npm >= 10.9.4` |
| `.nvmrc` | `18` | `22` |

Versões cravadas sem `^`, como hoje (R1). Fonte das versões: `LangePageAgenda/package.json` (clone v5.5.24), que já
compila e testa com esse conjunto.

## 3. Estratégia: um salto, não cinco

**Escolhido: salto direto 15 → 20 usando o clone v5.5 como fonte da infraestrutura**, com o código do produto
mantido no lugar (`src/app/views/**`, `core/**`, `chat/**`, `scss/**`, `assets/**`) e convertido depois pelas
schematics oficiais do Angular. Cada fase termina com `npm run verify` verde; o build nunca fica vermelho entre fases.

Descartado: cadeia `ng update` 15→16→17→18→19→20. Custo: cinco majors do Angular, seis degraus do CoreUI
(4.5 → 4.7 → 5.0 → 5.2 → 5.3 → 5.5, cada um preso a um major do Angular), quebra do `ngx-perfect-scrollbar` logo no
16, troca de TypeScript em quatro degraus, e no fim a configuração legada (`browser` builder, `AppModule`,
`test.ts`) continuaria lá para migrar à mão. O salto chega ao mesmo código final com uma única troca de versões.

Por que é seguro: o código do produto usa pouco da API do CoreUI (módulos `Card`, `Grid`, `Button`, `ButtonGroup`,
`Table`, `Progress`, `Spinner`, `Widget`, `Dropdown`, `Icon`, `Chartjs`; `getStyle`/`hexToRgba`), e todos esses
nomes existem no 5.5. `<c-chart>` mantém as mesmas entradas (`type`, `data`, `options`, `redraw`, `customTooltips`,
`height`). NgModule continua suportado no Angular 20, então as páginas compilam como estão até a fase standalone.
Os 414 testes são a rede de regressão: toda alteração de spec nesta migração é só de API (`declarations` → `imports`,
nomes de módulo), nunca de expectativa.

## 4. O que muda na arquitetura

| Área | Hoje | Depois | Observação |
|---|---|---|---|
| Bootstrap | `AppModule` + `platformBrowserDynamic().bootstrapModule` | `bootstrapApplication(AppComponent, appConfig)` em `main.ts`; `app.config.ts` com `provideRouter(routes, withHashLocation(), withInMemoryScrolling({ anchorScrolling: 'enabled' }))`, `provideHttpClient()`, `provideAnimationsAsync()`, `LOCALE_ID` pt-BR, `DEFAULT_CURRENCY_CODE` BRL, `registerLocaleData(localePt)`, `IconSetService`, `Title` | hash mantido (ADR-001); `withViewTransitions` do clone **não** entra (muda comportamento) |
| Rotas | `app-routing.module.ts` + `*-routing.module.ts` (`loadChildren` → NgModule) | `app.routes.ts` + `views/<pasta>/routes.ts` (`loadChildren` → `routes`), `data.title` igual | redirect `dashboard` → `triagent` e `**` → `''` mantidos |
| Componentes | 13 NgModules, 19 componentes declarados | standalone (schematic `ng g @angular/core:standalone`, três passos), `imports` por componente; `WidgetsModule`, `PeriodFilterModule` e os módulos de página somem | sem converter `@Input/@Output` em signals: zero ganho para o porte e 414 specs a tocar; opcional depois |
| Templates | `*ngIf`, `*ngFor`, `ngSwitch` | `@if`, `@for`, `@switch` (schematic `ng g @angular/core:control-flow`) | idioma do Angular 20; o schematic é mecânico |
| Layout | `containers/default-layout` do template 4.3 | `layout/default-layout` do clone 5.5 (`cSidebarToggle`, `ng-scrollbar`, `c-header`, `c-breadcrumb-router`, `c-sidebar-footer`), **reaplicando o que é nosso**: símbolo da marca + "Agenda Normativa", `_nav.ts` com `section(...)` e grupos, dropdown de tema ligado ao `ThemeService`, `<app-chat-widget>`, rodapé institucional, header sem itens de demo, ícones do nosso subset | specs do layout (`_nav`, header, footer, layout) adaptadas às novas diretivas |
| Tema | `ThemeService` grava `data-theme` + classe `dark-theme` em `<html>`; tokens em `_theme-dark.scss` (`:root[data-theme="dark"]`) | `ThemeService` continua a fonte (modo, `localStorage`, `prefers-color-scheme`, `appliedTheme$` redesenha gráficos) e passa a gravar também `data-coreui-theme` para os componentes CoreUI 5 seguirem o tema; `ColorModeService` do CoreUI não é usado | ADR-003 ganha nota de revisão em ADR-021; conflitos entre `--cui-*` escuros e `--app-*` resolvidos em `_fixes.scss`/`_theme-dark.scss` |
| SCSS | `@import "@coreui/coreui/scss/coreui"` 4.2 | mesmo `@import` em 5.4; variáveis renomeadas de sidebar/header conferidas em `_variables.scss`/`_layout.scss`; `_scrollbar.scss` passa a estilizar `ng-scrollbar` | tokens `_brand.scss`/`_theme-dark.scss` não mudam (carimbo `tokens-hash` igual) |
| Gráficos | Chart.js 3: `grid.drawBorder: false` | Chart.js 4: `border: { display: false }` (8 ocorrências em `dashboard-charts-data.ts`, `emails-chart`, `waterfall-chart`, `widgets-dropdown`) | `Chart.defaults.color/font` e `ScriptableContext` existem no 4; `ChartSample` (demo morta) sai junto com a exceção `KNOWN_COLOR_EXCEPTIONS` |
| Build | `@angular-devkit/build-angular:browser` + `allowedCommonJsDependencies` | `@angular/build:application` (esbuild); `allowedCommonJsDependencies` sai; `polyfills: ["zone.js", "@angular/localize/init"]` | mantidos: `fileReplacements` dos `environments`, `budgets` (`anyComponentStyle` 4 kB, ADR-009), fontes `@fontsource/inter` em `styles`, `assets`, `outputPath` |
| Testes | `@angular-devkit/build-angular:karma`, `src/test.ts`, Jasmine 4 | `@angular/build:karma`, sem `test.ts` (o builder descobre `*.spec.ts`), Jasmine 5; `karma.conf.js` mantido com `ChromeHeadlessCI` para `test:ci` | Vitest (padrão do Angular 21+) fica fora |
| `tsconfig` | `moduleResolution: node`, `module: ES2022` | `moduleResolution: bundler`, `module: preserve`, `isolatedModules: true`, `esModuleInterop: true`; `strict*` iguais | `skipLibCheck` **continua false** (gotcha do exceljs em `decisoes.md`); se as tipagens do exceljs falharem no TS 5.9, vale a declaração de módulo (ADR-017), não o `skipLibCheck` |
| Excel | `import('exceljs/dist/exceljs.min.js')` dinâmico | igual; o esbuild empacota o bundle CJS sem a lista de permitidos | conferir tamanho do chunk e o `downloadXlsx` nos dois temas |
| Scripts de docs | leem `app-routing.module.ts`, `*-routing.module.ts`, `src/test.ts`; regex R3 acusa API do 16+ | leem `app.routes.ts` e `views/**/routes.ts` (`loadChildren`/`loadComponent`); R3 invertida (§5); `STALE_CLAIMS` novos para "Angular 15", "Node 18", "ngx-perfect-scrollbar", "app-routing.module"; `INVENTORY_SOURCES` atualizado | verificação 14 (fichas) continua: `page-data-hash` não muda porque as interfaces de dados não mudam |

## 5. Regras (`AGENTS.md`, `.rules/`) depois da migração

- **R1** Versões congeladas: Angular 20.3, TS 5.9, Node 22, RxJS 7.8, CoreUI 5.5, Chart.js 4.5. Nada de `ng update` sem decisão.
- **R2** Dependência nova só compatível com Angular 20 / Node 22, existente no Nexus, versão exata.
- **R3** Reescrita: de "limites do Angular 15" para "idiomas do Angular 20": componente novo é standalone, template novo
  usa `@if/@for`, DI por `inject()` ou construtor (os dois valem), signals permitidos e não obrigatórios; proibido:
  `@NgModule` novo, `*ngIf/*ngFor` novo, `HttpClientModule`, `BrowserModule`, `ngx-perfect-scrollbar`. O `docs:check`
  passa a acusar esses padrões em vez de acusar `signal(`/`inject(`.
- **R10** Tema: `ThemeService` é a única fonte; `ColorModeService` do CoreUI não entra.
- **R13** Tabela de docs vivos ganha `docs/planejamento/migracao-node22-angular20.md` (este) e perde `app-routing.module.ts` das fontes do inventário.
- `.rules/decisoes.md`: D-007 (salto 15→20 pelo clone; por que não `ng update` em cadeia); gotcha "Node da máquina mais novo que 18" vira "`.nvmrc` = 22; `nvm use` antes de tudo"; gotcha do `karma.conf.js` continua.
- `.rules/erros.md`: entrada só se algo quebrar na migração e exigir correção (`fix`); migração em si é `chore`/`refactor`.
- `.nvmrc`, `engines`, `hooks` iguais em forma; `check.sh` sem mudança.

## 6. Fases

Cada fase termina com `npm run verify` verde (Node 22, npm 11) e não muda expectativa de teste. Commits são do
usuário (um por fase é o recomendado; o agente não commita). Tamanho: P = até 10 arquivos, M = até 40, G = acima.

| Fase | Entrega | Pronto quando | Tamanho |
|---|---|---|---|
| **P0 Linha de base** | Sem commit pelo agente (decisão do usuário): snapshot do working tree (sem `node_modules`) fora do repositório antes de P1; o usuário commita a linha de base (`chore: regras AGENTS.md + .rules + docs`) e a migração quando quiser; Nexus confirmado para a §2 pelo usuário; Node 22 e npm 11 instalados (`nvm install 22`, `npm i -g npm@11`) | snapshot feito; `npm run verify` verde no Angular 15 (já é) | P |
| **P1 Salto de infra** | `package.json` (§2, `engines`, scripts iguais), `.nvmrc`, `angular.json` do clone adaptado (projeto, `styles` com fontsource, `assets`, `budgets`, `fileReplacements`, karma), `tsconfig*.json`, `karma.conf.js` (`ChromeHeadlessCI`), `main.ts`, `app.config.ts`, `app.routes.ts` (ainda apontando para os módulos de página), `app.component.ts`, `index.html` (`lang="pt-BR"`, `theme-color`), layout do clone com as customizações da §4, `ThemeService` com `data-coreui-theme`, `_scrollbar.scss` para `ng-scrollbar`, Chart.js 4 (`border.display`), remoção de `ngx-perfect-scrollbar`, `jspdf`, `jspdf-autotable`, `src/test.ts`, `allowedCommonJsDependencies`; specs do layout ajustadas | `npm ci` sem `EBADENGINE`; `verify` verde (414 testes); as 4 páginas abrem em `ng serve` nos dois temas; itens visuais da §7 de cada ficha conferidos | G |
| **P2 Standalone** | `ng g @angular/core:standalone` (convert-to-standalone, prune-ng-modules, standalone-bootstrap); `routes.ts` por página; `*-routing.module.ts`, `*.module.ts` removidos; specs com `declarations` (16 arquivos) viram `imports`; `docs-check.js`/`docs-inventory.js` lendo `routes.ts` | `verify` verde; nenhum `@NgModule` em `src/app`; verificação 14 encontra as 4 rotas | G |
| **P3 Control flow e limpeza** | `ng g @angular/core:control-flow`; `ChartSample` e sua exceção de cor removidas; `KNOWN_COLOR_EXCEPTIONS` vazio; `declarations.d.ts` revisto (declaração do exceljs só se o TS 5.9 ainda precisar) | `verify` verde; `grep -r "\*ngIf\|\*ngFor" src/app` vazio | M |
| **P4 Regras e scripts** | §5 inteira: `AGENTS.md` (Stack, Node, R1, R2, R3, R13), `.rules/projeto.md`, `.rules/decisoes.md` (D-007, gotchas), `docs-check.js` (R3 nova, `STALE_CLAIMS`, `INVENTORY_SOURCES`, rotas), `docs-inventory.js`; teste de leitura numa conversa nova (Cursor, Antigravity: comando de teste, "pronto", último erro) | `docs:check` e `check.sh` verdes; hook recusa `fix` sem E-nnn (teste e reversão) | M |
| **P5 Documentação** | `docs/arquitetura.md` (stack, bootstrap, rotas, layout), `dependencias-e-ambiente.md` (tabela §2, `engines`, CI com `node-version-file`), `portabilidade.md` (destino na mesma versão: §3.3 cenário C e §4.13 simplificados; some "reescrever para Angular 15"), `docs/paginas/*.md` (§1 e §6: `routes.ts` e componentes standalone no lugar de `*.module.ts`; carimbos iguais), `design-system.md` (tema e `data-coreui-theme`), `glossario-ptbr.md`, `README.md`, `docs/README.md`, `changelog.md` (uma entrada por fase), `docs/decisoes/ADR-021-migracao-node22-angular20-coreui55.md` + notas de revisão em ADR-001, ADR-003, ADR-016 + índice, `base-de-conhecimento/README.md`; `LangePageAgenda/AGENTS.md` (clone continua referência de layout; subprojetos agora Angular 20) | `docs:check` verde com os novos `STALE_CLAIMS`; `grep -rn "Angular 15\|Node 18"` só no changelog, nos ADRs históricos e neste plano | G |
| **P6 Template** | `frontend-template-angular` refeito a partir da landing migrada sem as views de produto: infra, layout, tema, chat opcional fora, `AGENTS.md`/`.rules` próprios, `docs/` (ADR-001 do template substituída por "Angular 20 e CoreUI 5.5 congelados"), `referencia-visual` conferida; `git init` + hooks | `verify` verde (51 testes ou os que sobrarem); mesma leitura de regras funciona | G |
| **P7 Validação final** | `rm -rf node_modules && npm ci && npm run verify` em Node 22 + npm 11; `npm run hooks:install`; smoke 375 px a 1440 px nos dois temas nas 4 páginas; exportação Excel; chat; merge do branch em `main` com um commit por fase preservado | checklist das fichas §7 inteiro conferido; `main` verde; tag `v1-angular20` | P |

Ordem fixa P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 (P6 nesta entrega, pergunta 2).

## 7. Riscos e mitigação

| Risco | Como tratar |
|---|---|
| Tema escuro do CoreUI 5 (`[data-coreui-theme=dark]`, variáveis `--cui-*`) brigando com os tokens `--app-*` | `ThemeService` grava os dois atributos no mesmo instante; conferir cada componente CoreUI usado (card, table, dropdown, sidebar, header, progress) nos dois temas; ajustes em `_fixes.scss`, nunca em `node_modules` |
| `ng-scrollbar` se comporta diferente do `perfect-scrollbar` na sidebar | copiar o uso do clone (`pointerEventsMethod="scrollbar" visibility="hover"`); `_scrollbar.scss` reescrito |
| Orçamento `anyComponentStyle` 4 kB (ADR-009) com o scss de layout do clone (1,1 kB) e os nossos | somar antes; estilo que estourar vai para `src/scss/_layout.scss` |
| `exceljs` dinâmico no esbuild | `ng build` acusa na hora; alternativa é `import('exceljs')` (entrada ESM do pacote) com a mesma declaração de tipos |
| Tipagens do `exceljs` no TS 5.9 sem `skipLibCheck` | manter ADR-017 (módulo declarado em `declarations.d.ts`) |
| Specs do layout acopladas a `ClassToggleService`/`perfect-scrollbar` | reescritas para `cSidebarToggle`/`SidebarService`; expectativas de texto e acessibilidade iguais |
| Chart.js 4 muda defaults (`elements.line.tension`, `interaction`) | comparar os 6 gráficos com a referência visual; `appliedTheme$` continua chamando `chart.update('none')` |
| Pacote ausente no Nexus | Pergunta Aberta antes de P1; nenhuma substituição silenciosa |
| Karma marcado como deprecado upstream | funciona no `@angular/build:karma` 20; troca por Vitest é decisão futura (ADR própria) |

## 8. Fora deste plano

Signals em inputs/outputs, Vitest, SSR, `withViewTransitions`, troca de `HttpClient` direto por `ApiService` nos
serviços de dados (depende do contrato do BFF), exportação PDF (R9), remoção do card demo "Tráfego e vendas".

## 9. Perguntas de aprovação (respondidas em 2026-11-03)

1. Alvo Angular **20.3**: confirmado.
2. P6 (template): nesta entrega.
3. `jspdf` e `jspdf-autotable`: removidos agora; voltam com a exportação PDF (R9).
4. Commits: nenhum pelo agente; o usuário commita a linha de base e as fases.

## Referências

- Requisitos de Node e TypeScript por versão do Angular: https://angular.dev/reference/versions
- CoreUI para Angular, versão por versão do Angular e notas de migração: https://coreui.io/angular/docs/migration/angular-version
- Exemplo vivo: `LangePageAgenda/` (CoreUI Free Angular Admin Template v5.5.24, Angular 20.3.14) — `package.json`, `angular.json`, `src/app/app.config.ts`, `src/app/layout/`
- Fichas por página (o que cada página precisa): `docs/paginas/`

## 10. Execução (2026-11-03)

| Fase | Resultado |
|---|---|
| P0 | Cópia do working tree dos dois projetos fora do repositório (sem `node_modules`); nenhum commit. Nexus não verificado daqui (pacotes vieram do npm público). |
| P1 | Versões da §2 instaladas em Node 22.23 + npm 11.21, lock regenerado; build com 6 erros de tipo (Chart.js 4, TS 5.9) corrigidos; layout ajustado ao CoreUI 5 até medir igual ao Angular 15. |
| P2 | Schematics standalone (3 modos); bootstrap reescrito à mão (o schematic perdeu `registerLocaleData` e o `scrollOffset`); `routes.ts` por página; specs de chat e duas specs rasas ajustadas. |
| P3 | Schematic de control flow (reverter `base-de-conhecimento/`, que ele também reescreve com `--path=./`); `ChartSample` e diretivas sem uso removidas. |
| P4 | Regras e `docs:check` atualizados (§5). |
| P5 | Documentação atualizada; `docs:check` verde. |
| P6 | Template recriado sobre o clone v5.5 (não a partir da landing, para não sincronizar o que não foi pedido) com os acréscimos dele reaplicados: `ThemeService`, seletor Claro/Escuro/Automático, `environments/`, `_theme-dark.scss`, proxy, regras, docs. 54 testes. Detalhes em ADR-004 e D-003 do template. |
| P7 | `npm run verify` verde nos dois projetos; comparação visual registrada no changelog. |

Divergências do plano: P6 partiu do clone v5.5 em vez da landing (acima); E-006 (grupo do menu fechando no CoreUI 5) achado e corrigido no smoke; `allowedCommonJsDependencies` ficou com o `exceljs` (é CommonJS); aviso Sass `import` silenciado em vez
de reescrever os SCSS para `@use` (pendência em D-007).
