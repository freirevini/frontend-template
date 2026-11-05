# ADR-004 — Template recriado sobre o CoreUI v5.5 (Angular 20.3, Node 22)

**Data:** 2026-11-03 · **Situação:** aceita (substitui ADR-001)

**Contexto.** O ambiente de destino exige Node `^22.12.0` e npm `>= 10.9.4`; Angular 15 só suporta Node 18. Este template
era o CoreUI Free Angular Admin Template v4.3.13 mais tema claro/escuro/automático, environments, proxy, regras e docs. O
clone do mesmo template na versão v5.5.24 (Angular 20.3.14, CoreUI 5.5.24, Chart.js 4.5.1) está na pasta pai. Plano geral
da migração: `../landing-analitica/docs/planejamento/migracao-node22-angular20.md` (fase P6).

**Decisão.** Trocar `src/` e a configuração (`angular.json`, `tsconfig*`, `karma.conf.js`, versões do `package.json`) pelos do
v5.5 e reaplicar só o que é deste template: `ThemeService` (+ testes, agora também gravando `data-coreui-theme`), seletor
Claro/Escuro/Automático no header no lugar do `ColorModeService`, `?theme=` da URL ligado ao `ThemeService`, `environments/`
com `fileReplacements`, `_theme-dark.scss` importado por último, `proxy.conf.json`, nome do projeto, orçamento de CSS por
componente, `exceljs`, regras, docs e scripts. Demos continuam compiladas (D-001), agora as do v5.5. Orçamento inicial
7 MB/8 MB, como no v5.5. Saem `ngx-perfect-scrollbar`, `jspdf`, `jspdf-autotable` e o builder `@angular-devkit/build-angular`.

**Consequências.** R1, R2 e R3 passam ao idioma do Angular 20 (standalone, `@if`/`@for`); `npm run verify` verde em Node 22;
54 testes (os do v5.5, mais tema e seletor deste template). As demos 4.x antigas não existem mais aqui (o v4.3.13 original está
no commit `36966f6` da `landing-analitica`). `docs/referencia-visual/` continua um retrato de 2026-10-28 da landing, com
anexos da época do CoreUI 4.

**Revista em 2026-11-04 (ADR-005):** artefato passa a ser a imagem Nginx não-root com `src/assets/env.json` por ambiente; `environment*.ts` ficam só com `production`; rotas limpas no lugar do hash.
