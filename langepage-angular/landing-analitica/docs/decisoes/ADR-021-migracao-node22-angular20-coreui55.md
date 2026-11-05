# ADR-021 — Migração para Node 22, Angular 20.3 e CoreUI 5.5

**Data:** 2026-11-03 · **Situação:** aceita (substitui a parte de versões da R1, R2 e R3 anteriores)

## Contexto

O ambiente de destino exige Node.js `^22.12.0` e npm `>= 10.9.4` (recomendado `^11.10.1`). O projeto estava em Angular
15.2.8, TypeScript 4.9.5, CoreUI 4.4 e Chart.js 3.9, com `engines` `node >=18.16.0 <19`. Angular 15 só suporta Node
14/16/18; em Node 22 o `verify` passava, mas com `EBADENGINE` no `npm ci` e sem suporte oficial. Angular 20 é a linha LTS
cujo requisito de Node (`^20.19 || ^22.12 || ^24`) cobre o destino, e o clone do CoreUI Free Angular Admin Template v5.5.24
na pasta pai já roda esse conjunto (Angular 20.3.14, CoreUI 5.5.24, Chart.js 4.5.1). Plano completo e mapa de versões:
`docs/planejamento/migracao-node22-angular20.md`.

## Decisão

1. **Salto único 15 → 20**, sem `ng update` em cadeia: versões e infraestrutura (`package.json`, `angular.json` com
   `@angular/build`, `tsconfig*`, `karma.conf.js`) vêm do clone v5.5; o código do produto fica no lugar e é convertido pelas
   schematics oficiais (`@angular/core:standalone` nos três modos e `@angular/core:control-flow`).
2. **Arquitetura Angular 20**: componentes standalone, `bootstrapApplication` + `src/app/app.config.ts`, rotas em
   `src/app/app.routes.ts` e `src/app/views/<pasta>/routes.ts`, templates com `@if`/`@for`. Mantidos: hash (ADR-001), rolagem
   por âncora com deslocamento do header (`ViewportScroller.setOffset`), `LOCALE_ID` pt-BR, `DEFAULT_CURRENCY_CODE` BRL.
3. **Layout**: o do produto, com as trocas exigidas pelo CoreUI 5: `ngx-perfect-scrollbar` (View Engine, não compila no
   Angular 16+) → `ngx-scrollbar`; `<c-sidebar colorScheme="dark">`; variáveis da navegação sobrescritas em
   `.sidebar .sidebar-nav`; caixa de 4rem da marca, alturas do header e posição do ícone do menu repostas como no CoreUI 4.
   Meta: medir igual ao build Angular 15 (comparação pixel a pixel em 1440 px e 375 px, temas claro e escuro).
4. **Tema** (revisão de ADR-003): o `ThemeService` continua a única fonte e grava também `data-coreui-theme`; os tokens da marca
   de `_theme-dark.scss` vencem os padrões escuros do CoreUI 5. Níveis de texto do CoreUI 5 (`--cui-secondary-color`,
   `--cui-tertiary-color`, `--cui-emphasis-color`) mapeados para os tokens da marca. `ColorModeService` não é usado.
5. **Chart.js 4**: `grid.drawBorder: false` → `border: { display: false }`; peso de fonte numérico.
6. **Sem perda de funcionalidade**: specs mudam só de API (`declarations` → `imports`, `ChatModule` → componente,
   `overrideComponent` para teste raso, `border.display`), nunca de expectativa (exceção registrada em D-007).
7. **Removidos**: `ngx-perfect-scrollbar`, `jspdf`, `jspdf-autotable` (sem uso; voltam com a exportação PDF), `src/test.ts`,
   a demo `ChartSample` e sua exceção de cor no `docs:check`, o NgModule de cada página e do chat.
8. **Regras**: R1, R2 e R3 reescritas para Angular 20; `docs:check` passa a acusar padrões antigos (`@NgModule`,
   `standalone: false`, `*ngIf`/`*ngFor`, `HttpClientModule`, `ngx-perfect-scrollbar`, `ColorModeService`) e frases que
   ainda citem a pilha antiga fora de contexto histórico.

## Consequências

- `npm ci` sem `EBADENGINE` em Node 22 / npm 11; `npm run verify` verde (416 testes: os 414 de antes, 1 novo para
  `data-coreui-theme` e 1 para o grupo do menu que o CoreUI 5 fechava, E-006).
- Diferenças visuais restantes, medidas: suavização das linhas do Chart.js 4 e 1 px a menos na tabela analítica.
- Os SCSS ainda usam `@import`; o aviso de depreciação do Sass está silenciado em `angular.json` até a troca por `@use`
  (antes do Sass 3).
- `exceljs/dist/exceljs.min.js` continua CommonJS e fica em `allowedCommonJsDependencies`.
- `base-de-conhecimento/` mantém as demos 4.x como histórico; a versão 5.5 de cada demo está no clone da pasta pai (R14).
- Karma segue como runner (deprecado upstream); Vitest, padrão do Angular 21+, exige decisão própria.
- `npm audit` lista 54 vulnerabilidades transitivas após a migração; revisar no Nexus.
