# Design system

<!-- tokens-hash: 98590731c42f -->

Carimbo acima: hash dos arquivos de tokens (`_variables.scss`, `_theme-dark.scss` e `_brand.scss` se existir).
Ao mudar tokens, revise as tabelas deste documento e atualize o carimbo com o valor que `npm run docs:check` indicar.

## Cores

- Tema claro: cores padrão do CoreUI 5.4 (sem `_variables.scss`; o template v5.5 não sobrescreve variáveis).
- Tema escuro: escuro nativo do CoreUI 5 (`data-coreui-theme="dark"`) mais `src/scss/_theme-dark.scss`, ativado por
  `<html data-theme="dark">` (ThemeService grava os dois atributos) e importado por último, vencendo o nativo. Redefine as
  variáveis `--cui-*` globais e por componente (card, header, footer, dropdown, tabelas, formulários, modais etc.).
- Regra: componentes usam `var(--cui-*)` ou `var(--app-*)`; cor fixa só nos arquivos de tokens (R10).

| Variável SCSS (escuro) | Valor | Uso |
|---|---|---|
| `$dark-page-bg` | `#1b1f27` | Fundo da página |
| `$dark-surface` | `#242a34` | Cards, header, footer, dropdowns |
| `$dark-surface-alt` | `#2d3440` | Superfície secundária, campos desabilitados |
| `$dark-border` | `#3a4250` | Bordas |
| `$dark-input-bg` / `$dark-input-border` | `#1f242d` / `#4a5363` | Campos |
| `$dark-text` / `$dark-text-medium` / `$dark-text-disabled` | branco 87% / 60% / 38% | Texto |
| `$dark-link` / `$dark-link-hover` | `#a39bff` / `#c1bbff` | Links |

## Gráficos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--app-chart-color` | `#666` | branco 60% | Texto de eixos (defaults do Chart.js) |
| `--app-chart-grid-color` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.1)` | Grades |

O ThemeService lê esses tokens e aplica nos defaults do Chart.js a cada troca de tema. Ao criar paletas de séries,
validar contraste (≥ 3:1 contra o card) e separação para daltonismo nos dois temas antes de usar.

## Identidade visual de referência

Este template usa as cores padrão do CoreUI. A identidade completa da landing **Agenda Normativa** (paleta da marca,
fonte Inter, componentes, gráficos validados para daltonismo, tema escuro próprio) está documentada em
`docs/referencia-visual/`, com a receita de aplicação em `docs/referencia-visual/07-aplicacao.md`. Ao aplicá-la, este
documento passa a ter as tabelas de tokens dela e o carimbo `tokens-hash` muda.

## Componentes do tema

- Seletor de tema no header: ícones `cilSun`, `cilMoon`, `cilContrast`; rótulos "Claro", "Escuro", "Automático".
- Classe `dark-theme` no `<html>`: reaproveita regras do próprio template (`_examples.scss`).
