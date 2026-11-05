# ADR-003: Tema claro/escuro próprio, sem portar o CoreUI 5

Data: 2026-10-27
Situação: aceita

## Contexto

O produto precisa de temas claro, escuro e automático (R10). O CoreUI 4.x (`@coreui/coreui` 4.2, `@coreui/angular` 4.4) não tem modos de cor; o recurso existe no CoreUI 5 (`ColorModeService`, `data-coreui-theme`, variáveis `--cui-*` com valores por tema). Subir para o CoreUI 5 exigiria Angular 17+, o que viola R1 e R3, e copiar o código de tema da 5.x traria APIs (Signals, `inject` com `DestroyRef`) proibidas na 15.

## Decisão

1. Implementar `ThemeService` (`src/app/core/services/theme.service.ts`) com RxJS (`BehaviorSubject`) e `DOCUMENT`: modos `'light' | 'dark' | 'auto'`, persistência em `localStorage` (`landing-analitica.color-mode`, com `try/catch`), `matchMedia('(prefers-color-scheme: dark)')` para o automático, e aplicação no `<html>` do atributo `data-theme="light|dark"` e da classe `dark-theme` (gancho que o SCSS do template já usa).
2. Cores do tema escuro em `src/scss/_theme-dark.scss`, dentro de `:root[data-theme="dark"]`, redefinindo `--brand-*`, `--app-*` e as `--cui-*` globais e por componente do CoreUI 4 (`.card`, `.dropdown-menu`, `.table`, `.modal` etc.). Os valores vêm de `$brand-dark-*` em `src/scss/_brand.scss`.
3. Chart.js não lê CSS: `ThemeService.applyChartDefaults()` copia `--app-chart-*` para `Chart.defaults` (importação dinâmica de `chart.js`), e os componentes de gráfico assinam `appliedTheme$` para reler as cores das séries.
4. Seletor no header (`default-header.component.html`): dropdown "Tema" com Claro / Escuro / Automático.
5. Não portar `ColorModeService`, `ThemeDirective` nem SCSS de tema do CoreUI 5. Componentes novos usam só `var(--cui-*)`, `var(--brand-*)` e `var(--app-*)`; cor fixa só em `_brand.scss`, `_variables.scss` e `_theme-dark.scss`.

## Consequências

- Nenhuma dependência nova; o tema funciona com as versões congeladas.
- Cada componente CoreUI que usa cor fixa no 4.x precisa de um bloco em `_theme-dark.scss`; a lista atual está em `docs/design-system.md`, seção 3.2. Componentes CoreUI ainda não usados no produto podem precisar de novos blocos.
- `--brand-primary` escuro (`#6b7cf0`) é mais claro que o primário do tema claro; os `.brand-stat-card` compensam com uma camada translúcida escura, e os botões primários no escuro ficam com texto branco em 3,64:1 (aceitável para rótulos de botão).
- Uma eventual migração para CoreUI 5 poderá substituir `_theme-dark.scss` pelos modos nativos; a troca de `data-theme` por `data-coreui-theme` fica concentrada em `ThemeService`.

## Revisão (2026-11-03, ADR-021)

O projeto migrou para CoreUI 5.5. O `ThemeService` continua a única fonte do tema e passou a gravar também
`data-coreui-theme`, como previsto na última consequência acima; `_theme-dark.scss` foi mantido e vence os padrões escuros do
CoreUI 5. O `ColorModeService` continua fora.
