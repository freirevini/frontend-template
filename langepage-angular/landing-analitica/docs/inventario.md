# Inventário do projeto (gerado)

<!-- inventory-hash: 06e9e38fe635 -->

Gerado por `npm run docs:inventory` em 2026-11-04. Não editar à mão: regenerar após mudanças estruturais.
Base de comparação: commit `36966f6` (CoreUI Free Angular Admin Template v4.3.13).

## Rotas

| Arquivo | Caminho | Título | Destino |
| --- | --- | --- | --- |
| `src/app/app.routes.ts` | `''` | Início | `DefaultLayoutComponent` |
| `src/app/app.routes.ts` | `''` |  | `./views/home/routes` |
| `src/app/app.routes.ts` | `triagent` |  | `./views/dashboard/routes` |
| `src/app/app.routes.ts` | `scalation` |  | `./views/scalation/routes` |
| `src/app/app.routes.ts` | `analitico` |  | `./views/analytics/routes` |
| `src/app/app.routes.ts` | `dashboard` |  | `redirect → 'triagent'` |
| `src/app/app.routes.ts` | `**` |  | `redirect → ''` |
| `src/app/views/analytics/routes.ts` | `''` | Analítico | `AnalyticsComponent` |
| `src/app/views/dashboard/routes.ts` | `''` | Triagent | `DashboardComponent` |
| `src/app/views/home/routes.ts` | `''` |  | `HomeComponent` |
| `src/app/views/scalation/routes.ts` | `''` | Scalation | `ScalationComponent` |

## Tokens de design (claro / escuro)

| Token | Claro | Escuro |
| --- | --- | --- |
| `--brand-primary` | `brand-blue` | `brand-dark-primary` |
| `--brand-primary-high` | `brand-blue-high` | `brand-dark-primary-high` |
| `--brand-primary-low` | `brand-blue-low` | `brand-dark-primary-low` |
| `--brand-primary-light` | `brand-blue-light` | `brand-dark-link` |
| `--brand-primary-rgb` | `34, 58, 210` | `107, 124, 240` |
| `--brand-highlight` | `brand-cyan` | `brand-dark-info` |
| `--brand-highlight-dark` | `brand-cyan-dark` | `brand-cyan-dark` |
| `--brand-highlight-low` | `brand-cyan-low` | `rgba(49, 199, 237, .14)` |
| `--brand-highlight-high` | `brand-cyan-high` | `(herda o claro)` |
| `--brand-tertiary` | `brand-pink` | `(herda o claro)` |
| `--brand-accent` | `brand-purple` | `(herda o claro)` |
| `--brand-success` | `brand-green-dark` | `brand-dark-success` |
| `--brand-success-pure` | `brand-green` | `(herda o claro)` |
| `--brand-success-low` | `brand-green-low` | `rgba(54, 191, 54, .14)` |
| `--brand-warning` | `brand-orange` | `brand-dark-warning` |
| `--brand-warning-dark` | `brand-orange-dark` | `brand-orange` |
| `--brand-warning-low` | `brand-orange-low` | `rgba(255, 138, 61, .14)` |
| `--brand-danger` | `brand-red` | `brand-dark-danger` |
| `--brand-danger-dark` | `brand-red-dark` | `brand-red` |
| `--brand-danger-low` | `brand-red-low` | `rgba(240, 86, 107, .14)` |
| `--brand-content-high` | `brand-content-high` | `brand-dark-text` |
| `--brand-content-pure` | `brand-content-pure` | `brand-dark-text` |
| `--brand-content-low` | `brand-content-low` | `brand-dark-text-medium` |
| `--brand-content-disabled` | `brand-content-disabled` | `brand-dark-text-disabled` |
| `--brand-surface-page` | `brand-surface-page` | `brand-dark-page` |
| `--brand-surface-card` | `brand-surface-card` | `brand-dark-card` |
| `--brand-surface-mid` | `brand-surface-mid` | `brand-dark-alt` |
| `--brand-surface-high` | `brand-surface-high` | `brand-dark-border` |
| `--brand-border` | `brand-border` | `brand-dark-border` |
| `--brand-sidebar` | `brand-navy` | `brand-dark-sidebar` |
| `--brand-sidebar-deep` | `brand-navy-deep` | `brand-dark-sidebar-deep` |
| `--brand-radius-xs` | `brand-radius-xs` | `(herda o claro)` |
| `--brand-radius-sm` | `brand-radius-sm` | `(herda o claro)` |
| `--brand-radius-md` | `brand-radius-md` | `(herda o claro)` |
| `--brand-radius-lg` | `brand-radius-lg` | `(herda o claro)` |
| `--brand-radius-pill` | `brand-radius-pill` | `(herda o claro)` |
| `--brand-elevation-1` | `brand-elevation-1` | `0 4px 4px -2px rgba(0, 0, 0, .5)` |
| `--brand-elevation-2` | `brand-elevation-2` | `0 4px 12px 0 rgba(0, 0, 0, .4)` |
| `--brand-elevation-3` | `brand-elevation-3` | `0 16px 32px 0 rgba(0, 0, 0, .55)` |
| `--brand-elevation-card` | `brand-elevation-card` | `0 2px 8px 0 rgba(0, 0, 0, .3)` |
| `--brand-font-family` | `brand-font-family` | `(herda o claro)` |
| `--app-chat-accent` | `brand-blue` | `brand-dark-chat-accent` |
| `--app-chart-color` | `brand-content-low` | `brand-dark-text-medium` |
| `--app-chart-grid-color` | `rgba(32, 38, 44, .08)` | `rgba(255, 255, 255, .08)` |
| `--app-chart-tooltip-bg` | `brand-content-high` | `brand-dark-page` |
| `--app-chart-tooltip-color` | `#ffffff` | `brand-dark-text` |
| `--app-chart-font-family` | `brand-font-family` | `(herda o claro)` |
| `--app-export-accent` | `brand-blue` | `(herda o claro)` |
| `--app-export-muted` | `brand-content-low` | `(herda o claro)` |
| `--app-series-1` | `brand-blue` | `#4d61e0` |
| `--app-series-2` | `brand-cyan-dark` | `brand-cyan-dark` |
| `--app-series-3` | `brand-green-dark` | `#2fae2f` |
| `--app-series-4` | `brand-purple` | `brand-purple` |
| `--app-series-reference` | `brand-red` | `#e8475c` |
| `--app-wf-total-1` | `brand-blue-deep` | `#3448d0` |
| `--app-wf-total-2` | `brand-blue` | `#5f71ea` |
| `--app-wf-total-3` | `#8c9ae8` | `#8c9ae8` |
| `--app-wf-decrease-1` | `brand-red-dark` | `#c0162c` |
| `--app-wf-decrease-2` | `brand-red` | `#e8475c` |
| `--app-wf-decrease-3` | `#f07a89` | `#f59aa6` |
| `--app-wf-connector` | `brand-content-disabled` | `brand-content-low` |
| `--app-applicable` | `brand-navy` | `brand-dark-link-hover` |
| `--app-not-applicable` | `brand-content-disabled` | `brand-content-low` |

## Dependências

| Seção | Pacote | Versão |
| --- | --- | --- |
| dependencies | `@angular/animations` | 20.3.14 |
| dependencies | `@angular/cdk` | 20.2.14 |
| dependencies | `@angular/common` | 20.3.14 |
| dependencies | `@angular/compiler` | 20.3.14 |
| dependencies | `@angular/core` | 20.3.14 |
| dependencies | `@angular/forms` | 20.3.14 |
| dependencies | `@angular/language-service` | 20.3.14 |
| dependencies | `@angular/platform-browser` | 20.3.14 |
| dependencies | `@angular/platform-browser-dynamic` | 20.3.14 |
| dependencies | `@angular/router` | 20.3.14 |
| dependencies | `@coreui/angular` | 5.5.24 |
| dependencies | `@coreui/angular-chartjs` | 5.5.24 |
| dependencies | `@coreui/chartjs` | 4.1.0 |
| dependencies | `@coreui/coreui` | 5.4.3 |
| dependencies | `@coreui/icons` | 3.0.1 |
| dependencies | `@coreui/icons-angular` | 5.5.24 |
| dependencies | `@coreui/utils` | 2.0.2 |
| dependencies | `@fontsource/inter` | 5.3.0 |
| dependencies | `chart.js` | 4.5.1 |
| dependencies | `exceljs` | 4.4.0 |
| dependencies | `ngx-scrollbar` | 13.0.3 |
| dependencies | `rxjs` | 7.8.2 |
| dependencies | `tslib` | 2.8.1 |
| dependencies | `zone.js` | 0.15.1 |
| devDependencies | `@angular/build` | 20.3.12 |
| devDependencies | `@angular/cli` | 20.3.12 |
| devDependencies | `@angular/compiler-cli` | 20.3.14 |
| devDependencies | `@angular/localize` | 20.3.14 |
| devDependencies | `@types/jasmine` | 5.1.13 |
| devDependencies | `@types/node` | 22.19.1 |
| devDependencies | `jasmine-core` | 5.12.1 |
| devDependencies | `karma` | 6.4.4 |
| devDependencies | `karma-chrome-launcher` | 3.2.0 |
| devDependencies | `karma-coverage` | 2.2.1 |
| devDependencies | `karma-jasmine` | 5.1.0 |
| devDependencies | `karma-jasmine-html-reporter` | 2.1.0 |
| devDependencies | `typescript` | 5.9.3 |

## Arquivos do projeto em relação ao template CoreUI

Tudo que não está nesta lista é idêntico ao template v4.3.13.

| Arquivo | Situação |
| --- | --- |
| `.agents/rules/regras.md` | novo (não commitado) |
| `.agents/workflows/pronto.md` | novo (não commitado) |
| `.cursor/rules/regras-projeto.mdc` | novo |
| `.dockerignore` | novo (não commitado) |
| `.githooks/commit-msg` | novo (não commitado) |
| `.githooks/pre-commit` | novo (não commitado) |
| `.github/CODE_OF_CONDUCT.md` | removido |
| `.github/COMMIT_CONVENTION.md` | removido |
| `.github/CONTRIBUTING.md` | removido |
| `.github/FUNDING.yml` | removido |
| `.github/ISSUE_TEMPLATE/bug_report.md` | removido |
| `.github/ISSUE_TEMPLATE/feature_request.md` | removido |
| `.github/SUPPORT.md` | removido |
| `.github/workflows/build-check.yml` | removido |
| `.github/workflows/stale.yml` | removido |
| `.gitignore` | alterado |
| `.npmrc` | novo (não commitado) |
| `.nvmrc` | novo (não commitado) |
| `.rules/check.sh` | novo (não commitado) |
| `.rules/decisoes.md` | novo (não commitado) |
| `.rules/erros.md` | novo (não commitado) |
| `.rules/escopo.md` | novo (não commitado) |
| `.rules/projeto.md` | novo (não commitado) |
| `.rules/testes.md` | novo (não commitado) |
| `AGENTS.md` | novo (não commitado) |
| `angular.json` | alterado |
| `base-de-conhecimento/navegacao-original.ts` | novo (não commitado) |
| `base-de-conhecimento/README.md` | novo (não commitado) |
| `base-de-conhecimento/rotas-originais.ts` | novo (não commitado) |
| `CHANGELOG.md` | removido |
| `CLAUDE.md` | alterado |
| `cursor/rules/regras-projeto.mdc` | alterado |
| `Dockerfile` | novo (não commitado) |
| `docs/arquitetura.md` | novo (não commitado) |
| `docs/changelog.md` | novo (não commitado) |
| `docs/contratos-de-dados.md` | novo (não commitado) |
| `docs/contratos/openapi-agenda-normativa-v1.yaml` | novo (não commitado) |
| `docs/decisoes/ADR-001-roteamento-por-hash-e-inicio-na-raiz.md` | novo (não commitado) |
| `docs/decisoes/ADR-002-dados-mock-ate-contrato-do-bff.md` | novo (não commitado) |
| `docs/decisoes/ADR-003-tema-claro-escuro-proprio-sem-portar-coreui-5.md` | novo (não commitado) |
| `docs/decisoes/ADR-004-paleta-da-marca-com-series-validadas-para-daltonismo.md` | novo (não commitado) |
| `docs/decisoes/ADR-005-fonte-inter-via-fontsource-em-vez-de-cdn.md` | novo (não commitado) |
| `docs/decisoes/ADR-006-filtro-de-periodo-compartilhado-e-cascata-derivada.md` | novo (não commitado) |
| `docs/decisoes/ADR-007-remocao-da-marca-coreui-da-interface.md` | novo (não commitado) |
| `docs/decisoes/ADR-008-pt-br-como-idioma-oficial-com-glossario.md` | novo (não commitado) |
| `docs/decisoes/ADR-009-css-de-componente-ate-4kb-e-estilos-globais-em-scss.md` | novo (não commitado) |
| `docs/decisoes/ADR-010-widget-de-chat-proprio-sem-deep-chat.md` | novo (não commitado) |
| `docs/decisoes/ADR-011-orquestracao-do-agente-no-bff-atlante.md` | novo (não commitado) |
| `docs/decisoes/ADR-012-gemini-via-vertex-ai-com-saida-estruturada.md` | novo (não commitado) |
| `docs/decisoes/ADR-013-card-de-classificacao-das-normas.md` | novo (não commitado) |
| `docs/decisoes/ADR-014-tabela-analitica-das-normas-classificadas.md` | novo (não commitado) |
| `docs/decisoes/ADR-015-mapeamento-de-dados-de-producao.md` | novo (não commitado) |
| `docs/decisoes/ADR-016-base-de-conhecimento-de-componentes.md` | novo (não commitado) |
| `docs/decisoes/ADR-017-exportacao-excel-com-exceljs-sob-demanda.md` | novo (não commitado) |
| `docs/decisoes/ADR-018-marca-agenda-normativa-com-simbolo.md` | novo (não commitado) |
| `docs/decisoes/ADR-019-card-de-emails-de-sugestao-de-classificacao.md` | novo (não commitado) |
| `docs/decisoes/ADR-020-ficha-por-pagina-para-porte-isolado.md` | novo (não commitado) |
| `docs/decisoes/ADR-021-migracao-node22-angular20-coreui55.md` | novo (não commitado) |
| `docs/decisoes/ADR-023-adequacao-aos-padroes-corporativos.md` | novo (não commitado) |
| `docs/decisoes/README.md` | novo (não commitado) |
| `docs/dependencias-e-ambiente.md` | novo (não commitado) |
| `docs/design-system.md` | novo (não commitado) |
| `docs/glossario-ptbr.md` | novo (não commitado) |
| `docs/inventario.md` | novo (não commitado) |
| `docs/mapeamento-de-dados.md` | novo (não commitado) |
| `docs/paginas/analitico.md` | novo (não commitado) |
| `docs/paginas/inicio.md` | novo (não commitado) |
| `docs/paginas/README.md` | novo (não commitado) |
| `docs/paginas/scalation.md` | novo (não commitado) |
| `docs/paginas/triagent.md` | novo (não commitado) |
| `docs/planejamento/adequacao-padroes-corporativos.md` | novo (não commitado) |
| `docs/planejamento/agente-backend-spec.md` | novo (não commitado) |
| `docs/planejamento/agente-normas-gemini.md` | novo (não commitado) |
| `docs/planejamento/chat-widget.md` | novo (não commitado) |
| `docs/planejamento/emails-sugestao-classificacao.md` | novo (não commitado) |
| `docs/planejamento/migracao-node22-angular20.md` | novo (não commitado) |
| `docs/planejamento/streamlit/01-diagnostico-landing.md` | novo (não commitado) |
| `docs/planejamento/streamlit/02-de-para-streamlit.md` | novo (não commitado) |
| `docs/planejamento/streamlit/03-guia-implementacao.md` | novo (não commitado) |
| `docs/planejamento/streamlit/04-cenarios-e-riscos.md` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/.streamlit/config.toml` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/app.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/checks/interact.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/checks/probe.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/checks/shoot.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/__init__.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/charts.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/chat.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/data.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/period.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/tokens.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/ui.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/core/xlsx.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/README.md` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/requirements.txt` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/app.css` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/fonts/inter-latin-400-normal.woff2` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/fonts/inter-latin-500-normal.woff2` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/fonts/inter-latin-600-normal.woff2` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/fonts/inter-latin-700-normal.woff2` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-arrow-bottom.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-arrow-top.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-building.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-calendar.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-cart.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-chart-line.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-chevron-left.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-chevron-right.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-cloud-download.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-comment-square.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-contrast.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-devices.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-filter.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-fullscreen-exit.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-home.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-layers.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-list.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-menu.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-minus.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-moon.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-paper-plane.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-paperclip.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-resize-width.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-speech.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-speedometer.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-spreadsheet.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-sun.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-thumb-down.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-thumb-up.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/icons/cil-truck.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/img/brand-logo-white.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/img/brand-mark-white.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/img/brand-mark.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/static/img/favicon.svg` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/views/__init__.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/views/analitico.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/views/inicio.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/views/scalation.py` | novo (não commitado) |
| `docs/planejamento/streamlit/poc/views/triagent.py` | novo (não commitado) |
| `docs/planejamento/streamlit/README.md` | novo (não commitado) |
| `docs/portabilidade.md` | novo (não commitado) |
| `docs/README.md` | novo (não commitado) |
| `e2e/.gitignore` | novo (não commitado) |
| `e2e/.npmrc` | novo (não commitado) |
| `e2e/package.json` | novo (não commitado) |
| `e2e/playwright.config.ts` | novo (não commitado) |
| `e2e/specs/chat.spec.ts` | novo (não commitado) |
| `e2e/specs/export.spec.ts` | novo (não commitado) |
| `e2e/specs/pages.spec.ts` | novo (não commitado) |
| `e2e/specs/sidebar.spec.ts` | novo (não commitado) |
| `e2e/specs/theme.spec.ts` | novo (não commitado) |
| `e2e/support/fixtures.ts` | novo (não commitado) |
| `e2e/tsconfig.json` | novo (não commitado) |
| `GEMINI.md` | novo (não commitado) |
| `Jenkinsfile` | novo (não commitado) |
| `karma.conf.js` | alterado |
| `nginx/default.conf` | novo (não commitado) |
| `nginx/security-headers.conf` | novo (não commitado) |
| `package-lock.json` | alterado |
| `package.json` | alterado |
| `proxy.conf.json` | novo |
| `README.md` | alterado |
| `scripts/docs-check.js` | novo (não commitado) |
| `scripts/docs-inventory.js` | novo (não commitado) |
| `scripts/gen-classificacao.js` | novo (não commitado) |
| `src/app/app-routing.module.ts` | removido |
| `src/app/app.component.spec.ts` | alterado |
| `src/app/app.component.ts` | alterado |
| `src/app/app.config.ts` | novo (não commitado) |
| `src/app/app.module.ts` | removido |
| `src/app/app.routes.ts` | novo (não commitado) |
| `src/app/app.routing.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-api.service.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-api.service.ts` | novo (não commitado) |
| `src/app/chat/chat-farewell.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-farewell.ts` | novo (não commitado) |
| `src/app/chat/chat-file-results.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-file-results.ts` | novo (não commitado) |
| `src/app/chat/chat-file.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-file.ts` | novo (não commitado) |
| `src/app/chat/chat-format.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-format.ts` | novo (não commitado) |
| `src/app/chat/chat-greeting.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-greeting.ts` | novo (não commitado) |
| `src/app/chat/chat-input/chat-input.component.html` | novo (não commitado) |
| `src/app/chat/chat-input/chat-input.component.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-input/chat-input.component.ts` | novo (não commitado) |
| `src/app/chat/chat-launcher.service.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-launcher.service.ts` | novo (não commitado) |
| `src/app/chat/chat-messages/chat-messages.component.html` | novo (não commitado) |
| `src/app/chat/chat-messages/chat-messages.component.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-messages/chat-messages.component.ts` | novo (não commitado) |
| `src/app/chat/chat-mock-server.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-mock-server.ts` | novo (não commitado) |
| `src/app/chat/chat-norms-export.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-norms-export.ts` | novo (não commitado) |
| `src/app/chat/chat-request-error.ts` | novo (não commitado) |
| `src/app/chat/chat-session.service.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-session.service.ts` | novo (não commitado) |
| `src/app/chat/chat-suggestions.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-suggestions.ts` | novo (não commitado) |
| `src/app/chat/chat-test-helpers.ts` | novo (não commitado) |
| `src/app/chat/chat-texts.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-texts.ts` | novo (não commitado) |
| `src/app/chat/chat-v1-adapters.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-v1-adapters.ts` | novo (não commitado) |
| `src/app/chat/chat-widget/chat-widget.component.html` | novo (não commitado) |
| `src/app/chat/chat-widget/chat-widget.component.spec.ts` | novo (não commitado) |
| `src/app/chat/chat-widget/chat-widget.component.ts` | novo (não commitado) |
| `src/app/chat/chat.model.spec.ts` | novo (não commitado) |
| `src/app/chat/chat.model.ts` | novo (não commitado) |
| `src/app/chat/markdown/safe-markdown.pipe.ts` | novo (não commitado) |
| `src/app/chat/markdown/safe-markdown.spec.ts` | novo (não commitado) |
| `src/app/chat/markdown/safe-markdown.ts` | novo (não commitado) |
| `src/app/containers/default-layout/_nav.spec.ts` | novo (não commitado) |
| `src/app/containers/default-layout/_nav.ts` | alterado |
| `src/app/containers/default-layout/default-footer/default-footer.component.html` | alterado |
| `src/app/containers/default-layout/default-footer/default-footer.component.scss` | alterado |
| `src/app/containers/default-layout/default-footer/default-footer.component.spec.ts` | alterado |
| `src/app/containers/default-layout/default-footer/default-footer.component.ts` | alterado |
| `src/app/containers/default-layout/default-header/default-header.component.html` | alterado |
| `src/app/containers/default-layout/default-header/default-header.component.scss` | alterado |
| `src/app/containers/default-layout/default-header/default-header.component.spec.ts` | alterado |
| `src/app/containers/default-layout/default-header/default-header.component.ts` | alterado |
| `src/app/containers/default-layout/default-layout.component.html` | alterado |
| `src/app/containers/default-layout/default-layout.component.spec.ts` | novo (não commitado) |
| `src/app/containers/default-layout/default-layout.component.ts` | alterado |
| `src/app/core/config/runtime-config.service.spec.ts` | novo (não commitado) |
| `src/app/core/config/runtime-config.service.ts` | novo (não commitado) |
| `src/app/core/export/xlsx-export.spec.ts` | novo (não commitado) |
| `src/app/core/export/xlsx-export.ts` | novo (não commitado) |
| `src/app/core/http/api-error-text.component.spec.ts` | novo (não commitado) |
| `src/app/core/http/api-error-text.component.ts` | novo (não commitado) |
| `src/app/core/http/api-error.interceptor.spec.ts` | novo (não commitado) |
| `src/app/core/http/api-error.interceptor.ts` | novo (não commitado) |
| `src/app/core/http/api-page.spec.ts` | novo (não commitado) |
| `src/app/core/http/api-page.ts` | novo (não commitado) |
| `src/app/core/http/api-problem.spec.ts` | novo (não commitado) |
| `src/app/core/http/api-problem.ts` | novo (não commitado) |
| `src/app/core/http/http-error-texts.spec.ts` | novo (não commitado) |
| `src/app/core/http/http-error-texts.ts` | novo (não commitado) |
| `src/app/core/http/login-redirect.service.spec.ts` | novo (não commitado) |
| `src/app/core/http/login-redirect.service.ts` | novo (não commitado) |
| `src/app/core/http/session-expired-notice.component.spec.ts` | novo (não commitado) |
| `src/app/core/http/session-expired-notice.component.ts` | novo (não commitado) |
| `src/app/core/navigation/section-scroll.spec.ts` | novo (não commitado) |
| `src/app/core/navigation/section-scroll.ts` | novo (não commitado) |
| `src/app/core/services/api.service.spec.ts` | novo (não commitado) |
| `src/app/core/services/api.service.ts` | novo (não commitado) |
| `src/app/core/services/theme.service.spec.ts` | novo (não commitado) |
| `src/app/core/services/theme.service.ts` | novo (não commitado) |
| `src/app/core/services/user.service.spec.ts` | novo (não commitado) |
| `src/app/core/services/user.service.ts` | novo (não commitado) |
| `src/app/icons/icon-subset.ts` | alterado |
| `src/app/views/analytics/analytics.component.html` | novo (não commitado) |
| `src/app/views/analytics/analytics.component.spec.ts` | novo (não commitado) |
| `src/app/views/analytics/analytics.component.ts` | novo (não commitado) |
| `src/app/views/analytics/routes.ts` | novo (não commitado) |
| `src/app/views/base/accordion/accordions.component.html -> base-de-conhecimento/paginas/base/accordion/accordions.component.html` | RM |
| `src/app/views/base/accordion/accordions.component.scss -> base-de-conhecimento/paginas/base/accordion/accordions.component.scss` | renomeado |
| `src/app/views/base/accordion/accordions.component.spec.ts -> base-de-conhecimento/paginas/base/accordion/accordions.component.spec.ts` | renomeado |
| `src/app/views/base/accordion/accordions.component.ts -> base-de-conhecimento/paginas/base/accordion/accordions.component.ts` | RM |
| `src/app/views/base/base-routing.module.ts -> base-de-conhecimento/paginas/base/base-routing.module.ts` | RM |
| `src/app/views/base/base.module.ts -> base-de-conhecimento/paginas/base/base.module.ts` | renomeado |
| `src/app/views/base/breadcrumbs/breadcrumbs.component.html -> base-de-conhecimento/paginas/base/breadcrumbs/breadcrumbs.component.html` | RM |
| `src/app/views/base/breadcrumbs/breadcrumbs.component.scss -> base-de-conhecimento/paginas/base/breadcrumbs/breadcrumbs.component.scss` | renomeado |
| `src/app/views/base/breadcrumbs/breadcrumbs.component.spec.ts -> base-de-conhecimento/paginas/base/breadcrumbs/breadcrumbs.component.spec.ts` | renomeado |
| `src/app/views/base/breadcrumbs/breadcrumbs.component.ts -> base-de-conhecimento/paginas/base/breadcrumbs/breadcrumbs.component.ts` | RM |
| `src/app/views/base/cards/cards.component.html -> base-de-conhecimento/paginas/base/cards/cards.component.html` | RM |
| `src/app/views/base/cards/cards.component.scss -> base-de-conhecimento/paginas/base/cards/cards.component.scss` | renomeado |
| `src/app/views/base/cards/cards.component.spec.ts -> base-de-conhecimento/paginas/base/cards/cards.component.spec.ts` | renomeado |
| `src/app/views/base/cards/cards.component.ts -> base-de-conhecimento/paginas/base/cards/cards.component.ts` | RM |
| `src/app/views/base/carousels/carousels.component.html -> base-de-conhecimento/paginas/base/carousels/carousels.component.html` | RM |
| `src/app/views/base/carousels/carousels.component.scss -> base-de-conhecimento/paginas/base/carousels/carousels.component.scss` | renomeado |
| `src/app/views/base/carousels/carousels.component.spec.ts -> base-de-conhecimento/paginas/base/carousels/carousels.component.spec.ts` | renomeado |
| `src/app/views/base/carousels/carousels.component.ts -> base-de-conhecimento/paginas/base/carousels/carousels.component.ts` | RM |
| `src/app/views/base/collapses/collapses.component.html -> base-de-conhecimento/paginas/base/collapses/collapses.component.html` | RM |
| `src/app/views/base/collapses/collapses.component.scss -> base-de-conhecimento/paginas/base/collapses/collapses.component.scss` | renomeado |
| `src/app/views/base/collapses/collapses.component.spec.ts -> base-de-conhecimento/paginas/base/collapses/collapses.component.spec.ts` | renomeado |
| `src/app/views/base/collapses/collapses.component.ts -> base-de-conhecimento/paginas/base/collapses/collapses.component.ts` | renomeado |
| `src/app/views/base/list-groups/list-groups.component.html -> base-de-conhecimento/paginas/base/list-groups/list-groups.component.html` | RM |
| `src/app/views/base/list-groups/list-groups.component.scss -> base-de-conhecimento/paginas/base/list-groups/list-groups.component.scss` | renomeado |
| `src/app/views/base/list-groups/list-groups.component.spec.ts -> base-de-conhecimento/paginas/base/list-groups/list-groups.component.spec.ts` | renomeado |
| `src/app/views/base/list-groups/list-groups.component.ts -> base-de-conhecimento/paginas/base/list-groups/list-groups.component.ts` | RM |
| `src/app/views/base/navs/navs.component.html -> base-de-conhecimento/paginas/base/navs/navs.component.html` | RM |
| `src/app/views/base/navs/navs.component.scss -> base-de-conhecimento/paginas/base/navs/navs.component.scss` | renomeado |
| `src/app/views/base/navs/navs.component.spec.ts -> base-de-conhecimento/paginas/base/navs/navs.component.spec.ts` | renomeado |
| `src/app/views/base/navs/navs.component.ts -> base-de-conhecimento/paginas/base/navs/navs.component.ts` | renomeado |
| `src/app/views/base/paginations/paginations.component.html -> base-de-conhecimento/paginas/base/paginations/paginations.component.html` | RM |
| `src/app/views/base/paginations/paginations.component.scss -> base-de-conhecimento/paginas/base/paginations/paginations.component.scss` | renomeado |
| `src/app/views/base/paginations/paginations.component.spec.ts -> base-de-conhecimento/paginas/base/paginations/paginations.component.spec.ts` | renomeado |
| `src/app/views/base/paginations/paginations.component.ts -> base-de-conhecimento/paginas/base/paginations/paginations.component.ts` | renomeado |
| `src/app/views/base/placeholders/placeholders.component.html -> base-de-conhecimento/paginas/base/placeholders/placeholders.component.html` | RM |
| `src/app/views/base/placeholders/placeholders.component.scss -> base-de-conhecimento/paginas/base/placeholders/placeholders.component.scss` | renomeado |
| `src/app/views/base/placeholders/placeholders.component.spec.ts -> base-de-conhecimento/paginas/base/placeholders/placeholders.component.spec.ts` | renomeado |
| `src/app/views/base/placeholders/placeholders.component.ts -> base-de-conhecimento/paginas/base/placeholders/placeholders.component.ts` | renomeado |
| `src/app/views/base/popovers/popovers.component.html -> base-de-conhecimento/paginas/base/popovers/popovers.component.html` | RM |
| `src/app/views/base/popovers/popovers.component.scss -> base-de-conhecimento/paginas/base/popovers/popovers.component.scss` | renomeado |
| `src/app/views/base/popovers/popovers.component.spec.ts -> base-de-conhecimento/paginas/base/popovers/popovers.component.spec.ts` | renomeado |
| `src/app/views/base/popovers/popovers.component.ts -> base-de-conhecimento/paginas/base/popovers/popovers.component.ts` | renomeado |
| `src/app/views/base/progress/progress.component.html -> base-de-conhecimento/paginas/base/progress/progress.component.html` | RM |
| `src/app/views/base/progress/progress.component.scss -> base-de-conhecimento/paginas/base/progress/progress.component.scss` | renomeado |
| `src/app/views/base/progress/progress.component.spec.ts -> base-de-conhecimento/paginas/base/progress/progress.component.spec.ts` | renomeado |
| `src/app/views/base/progress/progress.component.ts -> base-de-conhecimento/paginas/base/progress/progress.component.ts` | renomeado |
| `src/app/views/base/spinners/spinners.component.html -> base-de-conhecimento/paginas/base/spinners/spinners.component.html` | RM |
| `src/app/views/base/spinners/spinners.component.scss -> base-de-conhecimento/paginas/base/spinners/spinners.component.scss` | renomeado |
| `src/app/views/base/spinners/spinners.component.spec.ts -> base-de-conhecimento/paginas/base/spinners/spinners.component.spec.ts` | renomeado |
| `src/app/views/base/spinners/spinners.component.ts -> base-de-conhecimento/paginas/base/spinners/spinners.component.ts` | renomeado |
| `src/app/views/base/tables/tables.component.html -> base-de-conhecimento/paginas/base/tables/tables.component.html` | RM |
| `src/app/views/base/tables/tables.component.scss -> base-de-conhecimento/paginas/base/tables/tables.component.scss` | renomeado |
| `src/app/views/base/tables/tables.component.spec.ts -> base-de-conhecimento/paginas/base/tables/tables.component.spec.ts` | renomeado |
| `src/app/views/base/tables/tables.component.ts -> base-de-conhecimento/paginas/base/tables/tables.component.ts` | renomeado |
| `src/app/views/base/tabs/tabs.component.html -> base-de-conhecimento/paginas/base/tabs/tabs.component.html` | RM |
| `src/app/views/base/tabs/tabs.component.scss -> base-de-conhecimento/paginas/base/tabs/tabs.component.scss` | renomeado |
| `src/app/views/base/tabs/tabs.component.spec.ts -> base-de-conhecimento/paginas/base/tabs/tabs.component.spec.ts` | renomeado |
| `src/app/views/base/tabs/tabs.component.ts -> base-de-conhecimento/paginas/base/tabs/tabs.component.ts` | RM |
| `src/app/views/base/tooltips/tooltips.component.html -> base-de-conhecimento/paginas/base/tooltips/tooltips.component.html` | RM |
| `src/app/views/base/tooltips/tooltips.component.scss -> base-de-conhecimento/paginas/base/tooltips/tooltips.component.scss` | renomeado |
| `src/app/views/base/tooltips/tooltips.component.spec.ts -> base-de-conhecimento/paginas/base/tooltips/tooltips.component.spec.ts` | renomeado |
| `src/app/views/base/tooltips/tooltips.component.ts -> base-de-conhecimento/paginas/base/tooltips/tooltips.component.ts` | renomeado |
| `src/app/views/buttons/button-groups/button-groups.component.html -> base-de-conhecimento/paginas/buttons/button-groups/button-groups.component.html` | RM |
| `src/app/views/buttons/button-groups/button-groups.component.scss -> base-de-conhecimento/paginas/buttons/button-groups/button-groups.component.scss` | renomeado |
| `src/app/views/buttons/button-groups/button-groups.component.spec.ts -> base-de-conhecimento/paginas/buttons/button-groups/button-groups.component.spec.ts` | renomeado |
| `src/app/views/buttons/button-groups/button-groups.component.ts -> base-de-conhecimento/paginas/buttons/button-groups/button-groups.component.ts` | renomeado |
| `src/app/views/buttons/buttons-routing.module.ts -> base-de-conhecimento/paginas/buttons/buttons-routing.module.ts` | RM |
| `src/app/views/buttons/buttons.module.ts -> base-de-conhecimento/paginas/buttons/buttons.module.ts` | renomeado |
| `src/app/views/buttons/buttons/buttons.component.html -> base-de-conhecimento/paginas/buttons/buttons/buttons.component.html` | RM |
| `src/app/views/buttons/buttons/buttons.component.scss -> base-de-conhecimento/paginas/buttons/buttons/buttons.component.scss` | renomeado |
| `src/app/views/buttons/buttons/buttons.component.spec.ts -> base-de-conhecimento/paginas/buttons/buttons/buttons.component.spec.ts` | renomeado |
| `src/app/views/buttons/buttons/buttons.component.ts -> base-de-conhecimento/paginas/buttons/buttons/buttons.component.ts` | RM |
| `src/app/views/buttons/dropdowns/dropdowns.component.html -> base-de-conhecimento/paginas/buttons/dropdowns/dropdowns.component.html` | RM |
| `src/app/views/buttons/dropdowns/dropdowns.component.scss -> base-de-conhecimento/paginas/buttons/dropdowns/dropdowns.component.scss` | renomeado |
| `src/app/views/buttons/dropdowns/dropdowns.component.spec.ts -> base-de-conhecimento/paginas/buttons/dropdowns/dropdowns.component.spec.ts` | renomeado |
| `src/app/views/buttons/dropdowns/dropdowns.component.ts -> base-de-conhecimento/paginas/buttons/dropdowns/dropdowns.component.ts` | RM |
| `src/app/views/charts/charts-routing.module.ts -> base-de-conhecimento/paginas/charts/charts-routing.module.ts` | RM |
| `src/app/views/charts/charts.component.html -> base-de-conhecimento/paginas/charts/charts.component.html` | RM |
| `src/app/views/charts/charts.component.scss -> base-de-conhecimento/paginas/charts/charts.component.scss` | renomeado |
| `src/app/views/charts/charts.component.spec.ts -> base-de-conhecimento/paginas/charts/charts.component.spec.ts` | renomeado |
| `src/app/views/charts/charts.component.ts -> base-de-conhecimento/paginas/charts/charts.component.ts` | RM |
| `src/app/views/charts/charts.module.ts -> base-de-conhecimento/paginas/charts/charts.module.ts` | renomeado |
| `src/app/views/dashboard/analytic-table/analytic-table.component.html` | novo (não commitado) |
| `src/app/views/dashboard/analytic-table/analytic-table.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/analytic-table/analytic-table.component.ts` | novo (não commitado) |
| `src/app/views/dashboard/analytic-table/analytic-table.paging.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/chart-colors.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/applicability-chart.component.html` | novo (não commitado) |
| `src/app/views/dashboard/classification/applicability-chart.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/applicability-chart.component.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification-data.service.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification-data.service.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification-derive.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification-derive.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification-view.base.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification.adapter.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification.adapter.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification.model.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/classification.model.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/themes-list.component.html` | novo (não commitado) |
| `src/app/views/dashboard/classification/themes-list.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/classification/themes-list.component.ts` | novo (não commitado) |
| `src/app/views/dashboard/dashboard-charts-data.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/dashboard-charts-data.ts` | alterado |
| `src/app/views/dashboard/dashboard-routing.module.ts` | removido |
| `src/app/views/dashboard/dashboard.component.html` | alterado |
| `src/app/views/dashboard/dashboard.component.scss` | alterado |
| `src/app/views/dashboard/dashboard.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/dashboard.component.ts` | alterado |
| `src/app/views/dashboard/dashboard.module.ts` | removido |
| `src/app/views/dashboard/emails/emails-chart.component.html` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-chart.component.scss` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-chart.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-chart.component.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-data.service.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-data.service.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-derive.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails-derive.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails.adapter.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails.adapter.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails.model.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/emails/emails.model.ts` | novo (não commitado) |
| `src/app/views/dashboard/period-filter/period-filter.component.html` | novo (não commitado) |
| `src/app/views/dashboard/period-filter/period-filter.component.scss` | novo (não commitado) |
| `src/app/views/dashboard/period-filter/period-filter.component.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/period-filter/period-filter.component.ts` | novo (não commitado) |
| `src/app/views/dashboard/period/period-range.ts` | novo (não commitado) |
| `src/app/views/dashboard/routes.ts` | novo (não commitado) |
| `src/app/views/dashboard/traffic-value-labels.plugin.ts` | novo (não commitado) |
| `src/app/views/dashboard/traffic/traffic-data.service.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/traffic/traffic-data.service.ts` | novo (não commitado) |
| `src/app/views/dashboard/traffic/traffic.adapter.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/traffic/traffic.adapter.ts` | novo (não commitado) |
| `src/app/views/dashboard/v1-domains.spec.ts` | novo (não commitado) |
| `src/app/views/dashboard/v1-domains.ts` | novo (não commitado) |
| `src/app/views/forms/checks-radios/checks-radios.component.html -> base-de-conhecimento/paginas/forms/checks-radios/checks-radios.component.html` | RM |
| `src/app/views/forms/checks-radios/checks-radios.component.scss -> base-de-conhecimento/paginas/forms/checks-radios/checks-radios.component.scss` | renomeado |
| `src/app/views/forms/checks-radios/checks-radios.component.spec.ts -> base-de-conhecimento/paginas/forms/checks-radios/checks-radios.component.spec.ts` | renomeado |
| `src/app/views/forms/checks-radios/checks-radios.component.ts -> base-de-conhecimento/paginas/forms/checks-radios/checks-radios.component.ts` | renomeado |
| `src/app/views/forms/floating-labels/floating-labels.component.html -> base-de-conhecimento/paginas/forms/floating-labels/floating-labels.component.html` | RM |
| `src/app/views/forms/floating-labels/floating-labels.component.scss -> base-de-conhecimento/paginas/forms/floating-labels/floating-labels.component.scss` | renomeado |
| `src/app/views/forms/floating-labels/floating-labels.component.spec.ts -> base-de-conhecimento/paginas/forms/floating-labels/floating-labels.component.spec.ts` | renomeado |
| `src/app/views/forms/floating-labels/floating-labels.component.ts -> base-de-conhecimento/paginas/forms/floating-labels/floating-labels.component.ts` | renomeado |
| `src/app/views/forms/form-controls/form-controls.component.html -> base-de-conhecimento/paginas/forms/form-controls/form-controls.component.html` | RM |
| `src/app/views/forms/form-controls/form-controls.component.scss -> base-de-conhecimento/paginas/forms/form-controls/form-controls.component.scss` | renomeado |
| `src/app/views/forms/form-controls/form-controls.component.spec.ts -> base-de-conhecimento/paginas/forms/form-controls/form-controls.component.spec.ts` | renomeado |
| `src/app/views/forms/form-controls/form-controls.component.ts -> base-de-conhecimento/paginas/forms/form-controls/form-controls.component.ts` | renomeado |
| `src/app/views/forms/forms-routing.module.ts -> base-de-conhecimento/paginas/forms/forms-routing.module.ts` | RM |
| `src/app/views/forms/forms.module.ts -> base-de-conhecimento/paginas/forms/forms.module.ts` | RM |
| `src/app/views/forms/input-groups/input-groups.component.html -> base-de-conhecimento/paginas/forms/input-groups/input-groups.component.html` | RM |
| `src/app/views/forms/input-groups/input-groups.component.scss -> base-de-conhecimento/paginas/forms/input-groups/input-groups.component.scss` | renomeado |
| `src/app/views/forms/input-groups/input-groups.component.spec.ts -> base-de-conhecimento/paginas/forms/input-groups/input-groups.component.spec.ts` | renomeado |
| `src/app/views/forms/input-groups/input-groups.component.ts -> base-de-conhecimento/paginas/forms/input-groups/input-groups.component.ts` | renomeado |
| `src/app/views/forms/layout/layout.component.html -> base-de-conhecimento/paginas/forms/layout/layout.component.html` | RM |
| `src/app/views/forms/layout/layout.component.scss -> base-de-conhecimento/paginas/forms/layout/layout.component.scss` | renomeado |
| `src/app/views/forms/layout/layout.component.spec.ts -> base-de-conhecimento/paginas/forms/layout/layout.component.spec.ts` | renomeado |
| `src/app/views/forms/layout/layout.component.ts -> base-de-conhecimento/paginas/forms/layout/layout.component.ts` | renomeado |
| `src/app/views/forms/ranges/ranges.component.html -> base-de-conhecimento/paginas/forms/ranges/ranges.component.html` | RM |
| `src/app/views/forms/ranges/ranges.component.scss -> base-de-conhecimento/paginas/forms/ranges/ranges.component.scss` | renomeado |
| `src/app/views/forms/ranges/ranges.component.spec.ts -> base-de-conhecimento/paginas/forms/ranges/ranges.component.spec.ts` | renomeado |
| `src/app/views/forms/ranges/ranges.component.ts -> base-de-conhecimento/paginas/forms/ranges/ranges.component.ts` | renomeado |
| `src/app/views/forms/select/select.component.html -> base-de-conhecimento/paginas/forms/select/select.component.html` | RM |
| `src/app/views/forms/select/select.component.scss -> base-de-conhecimento/paginas/forms/select/select.component.scss` | renomeado |
| `src/app/views/forms/select/select.component.spec.ts -> base-de-conhecimento/paginas/forms/select/select.component.spec.ts` | renomeado |
| `src/app/views/forms/select/select.component.ts -> base-de-conhecimento/paginas/forms/select/select.component.ts` | renomeado |
| `src/app/views/forms/validation/validation.component.html -> base-de-conhecimento/paginas/forms/validation/validation.component.html` | RM |
| `src/app/views/forms/validation/validation.component.scss -> base-de-conhecimento/paginas/forms/validation/validation.component.scss` | renomeado |
| `src/app/views/forms/validation/validation.component.spec.ts -> base-de-conhecimento/paginas/forms/validation/validation.component.spec.ts` | renomeado |
| `src/app/views/forms/validation/validation.component.ts -> base-de-conhecimento/paginas/forms/validation/validation.component.ts` | renomeado |
| `src/app/views/home/home.component.html` | novo (não commitado) |
| `src/app/views/home/home.component.spec.ts` | novo (não commitado) |
| `src/app/views/home/home.component.ts` | novo (não commitado) |
| `src/app/views/home/routes.ts` | novo (não commitado) |
| `src/app/views/icons/coreui-icons.component.html -> base-de-conhecimento/paginas/icons/icons.component.html` | RM |
| `src/app/views/icons/coreui-icons.component.ts -> base-de-conhecimento/paginas/icons/icons.component.ts` | RM |
| `src/app/views/icons/icons-routing.module.ts -> base-de-conhecimento/paginas/icons/icons-routing.module.ts` | RM |
| `src/app/views/icons/icons.module.ts -> base-de-conhecimento/paginas/icons/icons.module.ts` | RM |
| `src/app/views/notifications/alerts/alerts.component.html -> base-de-conhecimento/paginas/notifications/alerts/alerts.component.html` | RM |
| `src/app/views/notifications/alerts/alerts.component.scss -> base-de-conhecimento/paginas/notifications/alerts/alerts.component.scss` | renomeado |
| `src/app/views/notifications/alerts/alerts.component.spec.ts -> base-de-conhecimento/paginas/notifications/alerts/alerts.component.spec.ts` | renomeado |
| `src/app/views/notifications/alerts/alerts.component.ts -> base-de-conhecimento/paginas/notifications/alerts/alerts.component.ts` | renomeado |
| `src/app/views/notifications/badges/badges.component.html -> base-de-conhecimento/paginas/notifications/badges/badges.component.html` | RM |
| `src/app/views/notifications/badges/badges.component.scss -> base-de-conhecimento/paginas/notifications/badges/badges.component.scss` | renomeado |
| `src/app/views/notifications/badges/badges.component.spec.ts -> base-de-conhecimento/paginas/notifications/badges/badges.component.spec.ts` | renomeado |
| `src/app/views/notifications/badges/badges.component.ts -> base-de-conhecimento/paginas/notifications/badges/badges.component.ts` | renomeado |
| `src/app/views/notifications/modals/modals.component.html -> base-de-conhecimento/paginas/notifications/modals/modals.component.html` | RM |
| `src/app/views/notifications/modals/modals.component.scss -> base-de-conhecimento/paginas/notifications/modals/modals.component.scss` | renomeado |
| `src/app/views/notifications/modals/modals.component.spec.ts -> base-de-conhecimento/paginas/notifications/modals/modals.component.spec.ts` | renomeado |
| `src/app/views/notifications/modals/modals.component.ts -> base-de-conhecimento/paginas/notifications/modals/modals.component.ts` | renomeado |
| `src/app/views/notifications/notifications-routing.module.ts -> base-de-conhecimento/paginas/notifications/notifications-routing.module.ts` | RM |
| `src/app/views/notifications/notifications.module.ts -> base-de-conhecimento/paginas/notifications/notifications.module.ts` | renomeado |
| `src/app/views/notifications/toasters/toast-simple/toast-sample-icon.component.svg -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast-sample-icon.component.svg` | renomeado |
| `src/app/views/notifications/toasters/toast-simple/toast-sample-icon.component.ts -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast-sample-icon.component.ts` | renomeado |
| `src/app/views/notifications/toasters/toast-simple/toast.component.html -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast.component.html` | RM |
| `src/app/views/notifications/toasters/toast-simple/toast.component.scss -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast.component.scss` | renomeado |
| `src/app/views/notifications/toasters/toast-simple/toast.component.spec.ts -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast.component.spec.ts` | renomeado |
| `src/app/views/notifications/toasters/toast-simple/toast.component.ts -> base-de-conhecimento/paginas/notifications/toasters/toast-simple/toast.component.ts` | renomeado |
| `src/app/views/notifications/toasters/toasters.component.html -> base-de-conhecimento/paginas/notifications/toasters/toasters.component.html` | RM |
| `src/app/views/notifications/toasters/toasters.component.scss -> base-de-conhecimento/paginas/notifications/toasters/toasters.component.scss` | renomeado |
| `src/app/views/notifications/toasters/toasters.component.spec.ts -> base-de-conhecimento/paginas/notifications/toasters/toasters.component.spec.ts` | renomeado |
| `src/app/views/notifications/toasters/toasters.component.ts -> base-de-conhecimento/paginas/notifications/toasters/toasters.component.ts` | RM |
| `src/app/views/pages/login/login.component.html -> base-de-conhecimento/paginas/pages/login/login.component.html` | RM |
| `src/app/views/pages/login/login.component.scss -> base-de-conhecimento/paginas/pages/login/login.component.scss` | renomeado |
| `src/app/views/pages/login/login.component.spec.ts -> base-de-conhecimento/paginas/pages/login/login.component.spec.ts` | renomeado |
| `src/app/views/pages/login/login.component.ts -> base-de-conhecimento/paginas/pages/login/login.component.ts` | renomeado |
| `src/app/views/pages/page404/page404.component.html -> base-de-conhecimento/paginas/pages/page404/page404.component.html` | RM |
| `src/app/views/pages/page404/page404.component.scss -> base-de-conhecimento/paginas/pages/page404/page404.component.scss` | renomeado |
| `src/app/views/pages/page404/page404.component.spec.ts -> base-de-conhecimento/paginas/pages/page404/page404.component.spec.ts` | renomeado |
| `src/app/views/pages/page404/page404.component.ts -> base-de-conhecimento/paginas/pages/page404/page404.component.ts` | renomeado |
| `src/app/views/pages/page500/page500.component.html -> base-de-conhecimento/paginas/pages/page500/page500.component.html` | RM |
| `src/app/views/pages/page500/page500.component.scss -> base-de-conhecimento/paginas/pages/page500/page500.component.scss` | renomeado |
| `src/app/views/pages/page500/page500.component.spec.ts -> base-de-conhecimento/paginas/pages/page500/page500.component.spec.ts` | renomeado |
| `src/app/views/pages/page500/page500.component.ts -> base-de-conhecimento/paginas/pages/page500/page500.component.ts` | renomeado |
| `src/app/views/pages/pages-routing.module.ts -> base-de-conhecimento/paginas/pages/pages-routing.module.ts` | RM |
| `src/app/views/pages/pages.module.ts -> base-de-conhecimento/paginas/pages/pages.module.ts` | renomeado |
| `src/app/views/pages/register/register.component.html -> base-de-conhecimento/paginas/pages/register/register.component.html` | RM |
| `src/app/views/pages/register/register.component.scss -> base-de-conhecimento/paginas/pages/register/register.component.scss` | renomeado |
| `src/app/views/pages/register/register.component.spec.ts -> base-de-conhecimento/paginas/pages/register/register.component.spec.ts` | renomeado |
| `src/app/views/pages/register/register.component.ts -> base-de-conhecimento/paginas/pages/register/register.component.ts` | renomeado |
| `src/app/views/scalation/routes.ts` | novo (não commitado) |
| `src/app/views/scalation/scalation.component.html` | novo (não commitado) |
| `src/app/views/scalation/scalation.component.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/scalation.component.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-chart.component.html` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-chart.component.scss` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-chart.component.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-chart.component.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-data.service.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-data.service.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-derive.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-derive.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall-format.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall.adapter.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall.adapter.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall.model.spec.ts` | novo (não commitado) |
| `src/app/views/scalation/waterfall/waterfall.model.ts` | novo (não commitado) |
| `src/app/views/theme/colors.component.html -> base-de-conhecimento/paginas/theme/colors.component.html` | RM |
| `src/app/views/theme/colors.component.ts -> base-de-conhecimento/paginas/theme/colors.component.ts` | renomeado |
| `src/app/views/theme/theme-routing.module.ts -> base-de-conhecimento/paginas/theme/theme-routing.module.ts` | RM |
| `src/app/views/theme/theme.module.ts -> base-de-conhecimento/paginas/theme/theme.module.ts` | renomeado |
| `src/app/views/theme/typography.component.html -> base-de-conhecimento/paginas/theme/typography.component.html` | RM |
| `src/app/views/theme/typography.component.ts -> base-de-conhecimento/paginas/theme/typography.component.ts` | renomeado |
| `src/app/views/widgets/segment-overview/segment-overview.component.html` | novo (não commitado) |
| `src/app/views/widgets/segment-overview/segment-overview.component.scss` | novo (não commitado) |
| `src/app/views/widgets/segment-overview/segment-overview.component.spec.ts` | novo (não commitado) |
| `src/app/views/widgets/segment-overview/segment-overview.component.ts` | novo (não commitado) |
| `src/app/views/widgets/widgets-brand/widgets-brand.component.html -> base-de-conhecimento/paginas/widgets/widgets-brand/widgets-brand.component.html` | renomeado |
| `src/app/views/widgets/widgets-brand/widgets-brand.component.scss -> base-de-conhecimento/paginas/widgets/widgets-brand/widgets-brand.component.scss` | renomeado |
| `src/app/views/widgets/widgets-brand/widgets-brand.component.spec.ts -> base-de-conhecimento/paginas/widgets/widgets-brand/widgets-brand.component.spec.ts` | renomeado |
| `src/app/views/widgets/widgets-brand/widgets-brand.component.ts -> base-de-conhecimento/paginas/widgets/widgets-brand/widgets-brand.component.ts` | RM |
| `src/app/views/widgets/widgets-dropdown/segment-cards.adapter.spec.ts` | novo (não commitado) |
| `src/app/views/widgets/widgets-dropdown/segment-cards.adapter.ts` | novo (não commitado) |
| `src/app/views/widgets/widgets-dropdown/segment-cards.service.spec.ts` | novo (não commitado) |
| `src/app/views/widgets/widgets-dropdown/segment-cards.service.ts` | novo (não commitado) |
| `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.html` | alterado |
| `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.scss` | alterado |
| `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.spec.ts` | alterado |
| `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.ts` | alterado |
| `src/app/views/widgets/widgets-e/widgets-e.component.html -> base-de-conhecimento/paginas/widgets/widgets-e/widgets-e.component.html` | RM |
| `src/app/views/widgets/widgets-e/widgets-e.component.scss -> base-de-conhecimento/paginas/widgets/widgets-e/widgets-e.component.scss` | renomeado |
| `src/app/views/widgets/widgets-e/widgets-e.component.spec.ts -> base-de-conhecimento/paginas/widgets/widgets-e/widgets-e.component.spec.ts` | renomeado |
| `src/app/views/widgets/widgets-e/widgets-e.component.ts -> base-de-conhecimento/paginas/widgets/widgets-e/widgets-e.component.ts` | RM |
| `src/app/views/widgets/widgets-routing.module.ts -> base-de-conhecimento/paginas/widgets/widgets-routing.module.ts` | renomeado |
| `src/app/views/widgets/widgets.module.ts` | removido |
| `src/app/views/widgets/widgets/widgets.component.html -> base-de-conhecimento/paginas/widgets/widgets/widgets.component.html` | RM |
| `src/app/views/widgets/widgets/widgets.component.scss -> base-de-conhecimento/paginas/widgets/widgets/widgets.component.scss` | renomeado |
| `src/app/views/widgets/widgets/widgets.component.spec.ts -> base-de-conhecimento/paginas/widgets/widgets/widgets.component.spec.ts` | RM |
| `src/app/views/widgets/widgets/widgets.component.ts -> base-de-conhecimento/paginas/widgets/widgets/widgets.component.ts` | renomeado |
| `src/assets/angular.ico` | removido |
| `src/assets/data/chat-fluxo-mock.json` | novo (não commitado) |
| `src/assets/data/dashboard-classificacao.json` | novo (não commitado) |
| `src/assets/data/dashboard-emails.json` | novo (não commitado) |
| `src/assets/data/dashboard-segments.json` | novo (não commitado) |
| `src/assets/data/dashboard-waterfall.json` | novo (não commitado) |
| `src/assets/env.json` | novo (não commitado) |
| `src/assets/favicon.ico` | removido |
| `src/assets/favicon.svg` | novo (não commitado) |
| `src/assets/img/avatars/1.jpg` | removido |
| `src/assets/img/avatars/2.jpg` | removido |
| `src/assets/img/avatars/3.jpg` | removido |
| `src/assets/img/avatars/4.jpg` | removido |
| `src/assets/img/avatars/5.jpg` | removido |
| `src/assets/img/avatars/6.jpg` | removido |
| `src/assets/img/avatars/7.jpg` | removido |
| `src/assets/img/avatars/8.jpg` | removido |
| `src/assets/img/avatars/9.jpg` | removido |
| `src/assets/img/brand/brand-logo-white.svg` | novo (não commitado) |
| `src/assets/img/brand/brand-mark-white.svg` | novo (não commitado) |
| `src/assets/img/brand/brand-mark.svg` | novo (não commitado) |
| `src/assets/img/brand/coreui-angular.svg` | removido |
| `src/assets/img/brand/coreui-base-white.svg` | removido |
| `src/assets/img/brand/coreui-base.svg` | removido |
| `src/assets/img/brand/coreui-signet-white.svg` | removido |
| `src/assets/img/brand/coreui-signet.svg` | removido |
| `src/components/docs-callout/docs-callout.component.html -> base-de-conhecimento/docs-components/docs-callout/docs-callout.component.html` | RM |
| `src/components/docs-callout/docs-callout.component.scss -> base-de-conhecimento/docs-components/docs-callout/docs-callout.component.scss` | renomeado |
| `src/components/docs-callout/docs-callout.component.spec.ts -> base-de-conhecimento/docs-components/docs-callout/docs-callout.component.spec.ts` | renomeado |
| `src/components/docs-callout/docs-callout.component.ts -> base-de-conhecimento/docs-components/docs-callout/docs-callout.component.ts` | RM |
| `src/components/docs-components.module.ts -> base-de-conhecimento/docs-components/docs-components.module.ts` | RM |
| `src/components/docs-example/docs-example.component.html -> base-de-conhecimento/docs-components/docs-example/docs-example.component.html` | RM |
| `src/components/docs-example/docs-example.component.scss -> base-de-conhecimento/docs-components/docs-example/docs-example.component.scss` | renomeado |
| `src/components/docs-example/docs-example.component.spec.ts -> base-de-conhecimento/docs-components/docs-example/docs-example.component.spec.ts` | renomeado |
| `src/components/docs-example/docs-example.component.ts -> base-de-conhecimento/docs-components/docs-example/docs-example.component.ts` | RM |
| `src/components/docs-link/docs-link.component.html` | removido |
| `src/components/docs-link/docs-link.component.scss` | removido |
| `src/components/docs-link/docs-link.component.spec.ts` | removido |
| `src/components/docs-link/docs-link.component.ts` | removido |
| `src/components/index.ts -> base-de-conhecimento/docs-components/index.ts` | renomeado |
| `src/components/public-api.ts -> base-de-conhecimento/docs-components/public-api.ts` | RM |
| `src/declarations.d.ts` | alterado |
| `src/environments/environment.prod.ts` | alterado |
| `src/environments/environment.ts` | alterado |
| `src/index.html` | alterado |
| `src/main.ts` | alterado |
| `src/scss/_analytic-table.scss` | novo (não commitado) |
| `src/scss/_brand.scss` | novo (não commitado) |
| `src/scss/_charts.scss` | alterado |
| `src/scss/_chat-widget.scss` | novo (não commitado) |
| `src/scss/_classification-card.scss` | novo (não commitado) |
| `src/scss/_components.scss` | novo (não commitado) |
| `src/scss/_custom.scss` | alterado |
| `src/scss/_emails-card.scss` | novo (não commitado) |
| `src/scss/_examples.scss -> base-de-conhecimento/estilos/_examples.scss` | renomeado |
| `src/scss/_filter-chips.scss` | novo (não commitado) |
| `src/scss/_fixes.scss` | alterado |
| `src/scss/_layout.scss` | alterado |
| `src/scss/_scrollbar.scss` | alterado |
| `src/scss/_stat-card.scss` | novo (não commitado) |
| `src/scss/_theme-dark.scss` | novo (não commitado) |
| `src/scss/_typography.scss` | novo (não commitado) |
| `src/scss/_variables.scss` | alterado |
| `src/scss/styles.scss` | alterado |
| `src/test.ts` | removido |
| `tsconfig.app.json` | alterado |
| `tsconfig.json` | alterado |
| `tsconfig.spec.json` | alterado |
