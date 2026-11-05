# ADR-009: CSS de componente ≤ 4 kB e estilos globais em `src/scss`

Data: 2026-10-28
Situação: aceita

## Contexto

`angular.json` herdou do template o budget `anyComponentStyle` com aviso em 2 kB e erro em 4 kB por arquivo `.component.scss` na configuração `production`. A regra R7 exige build de produção sem erros. Ao estilizar os cards de segmento, chips, legenda e seletor segmentado, alguns componentes se aproximaram do limite, e o mesmo visual (chips, por exemplo) é usado por mais de um componente. Estilos encapsulados por componente também não conseguem reagir ao tema escuro sem repetir seletores `[data-theme="dark"]` em cada arquivo.

## Decisão

1. Manter o budget `anyComponentStyle` (2 kB aviso / 4 kB erro) como está. Não aumentá-lo para acomodar CSS.
2. Estilos compartilhados ou de "chrome" vivem em `src/scss/`, importados por `styles.scss` via `_custom.scss`:
   - `_typography.scss`: escala tipográfica, tabelas, breadcrumb, links;
   - `_components.scss`: sidebar, header, footer, cards, botões, `.brand-icon-btn`, `.brand-segmented`, `.progress-thin`, inputs, `prefers-reduced-motion`;
   - `_filter-chips.scss`: `.filter-bar`, `.filter-chip`, `.filter-date` (compartilhados por Tráfego e Cascata; classes não devem ser renomeadas);
   - `_charts.scss` (via `_fixes.scss`): tooltip do Chart.js; `_scrollbar.scss`: barra de rolagem; `_layout.scss`: fundo da página.
3. O `.component.scss` fica só com layout específico daquele componente (flex, espaçamentos, dimensões) e com o que precisa de `:host`/`:host-context`. Exemplos: `dashboard.component.scss` (cabeçalho e legenda do Tráfego), `waterfall-chart.component.scss` (cabeçalho, legenda e tabela da Cascata), `widgets-dropdown.component.scss` (`.brand-stat-card`), `period-filter.component.scss` (duas regras), `default-header.component.scss` (vazio, com comentário apontando para `_components.scss`), `default-footer.component.scss` (marca do rodapé).
4. Cor, raio, sombra e fonte só por variável (`--brand-*`, `--cui-*`, `--app-*`); cor fixa só em `_brand.scss`, `_variables.scss` e `_theme-dark.scss` (R10, ADR-003). Sobrescritas do CoreUI por variável SCSS ficam em `_variables.scss`; por variável CSS, em `_components.scss` (claro) e `_theme-dark.scss` (escuro).
5. Prefixo `brand-` para classes utilitárias próprias do painel (`.brand-stat-card`, `.brand-segmented`, `.brand-icon-btn`); classes específicas de um componente usam o nome do componente (`.traffic-*`, `.waterfall-*`, `.period-filter-*`).

## Consequências

- O build de produção passa no budget sem exceções; o aviso de 2 kB serve de sinal para mover CSS para `src/scss/`.
- Estilos globais são visíveis em toda a aplicação: nomes de classe precisam ser específicos para não colidir com o CoreUI (daí os prefixos).
- O tema escuro é tratado uma vez, em `_theme-dark.scss` e nos poucos blocos `[data-theme="dark"]` dos parciais globais, em vez de em cada componente.
- Componente novo com visual reutilizável deve nascer com as classes em `src/scss/` e ser registrado em `docs/design-system.md`, seção 6.
