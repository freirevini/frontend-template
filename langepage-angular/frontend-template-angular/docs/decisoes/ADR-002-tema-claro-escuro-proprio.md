# ADR-002 — Tema claro/escuro próprio sobre CoreUI 4

**Contexto.** CoreUI 4.x não tem modo escuro; o `ColorModeService` é da 5.x (Angular 16+).

**Decisão.** `ThemeService` próprio com `data-theme` no `<html>`, `_theme-dark.scss` sobrescrevendo `--cui-*`, modo
automático por `prefers-color-scheme`, defaults do Chart.js por tokens `--app-chart-*`, `import('chart.js')` dinâmico
para não inflar o bundle inicial.

**Consequências.** Todo componente novo usa variáveis CSS (R10); cores fixas só nos arquivos de tokens.

**Revisão (2026-11-03, ADR-004):** com o CoreUI 5 o `ThemeService` continua a única fonte do tema, grava também
`data-coreui-theme` (escuro nativo) e o `_theme-dark.scss` é importado por último; o `ColorModeService` do CoreUI não é usado.
