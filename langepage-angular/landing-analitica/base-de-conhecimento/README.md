# Base de conhecimento de componentes

Páginas de demonstração do template CoreUI Free v4.3 que saíram do app em 2026-10-28 (decisão do usuário, ADR-016): grupos
**Tema**, **Componentes** e **Extras** do menu antigo. Ficam aqui como **referência de código** para quem (pessoa ou IA) for
criar ou alterar páginas do produto.

> **Histórico:** o código destas demos é da base 4.x (NgModules, `*ngIf`, API do CoreUI 4) e não foi migrado. O app foi para
> Angular 20.3 + CoreUI 5.5 em 2026-11-03 (ADR-021): use a demo para saber **qual componente** existe e como fica na tela, e
> escreva o código na API 5.5 com o idioma da R3 (standalone, `@if`/`@for`). A versão 5.5 de cada demo está no clone de
> referência da pasta pai (`../src/app/views/<pasta>/`, mesma organização).

- **Fora do build e dos testes:** esta pasta não está em `src/`, então `ng build`, `ng test` e o `tsconfig` não a enxergam. Os
  imports relativos dos arquivos apontam para os caminhos antigos em `src/app/views/` e não compilam aqui.
- **Nunca importar** nada desta pasta no app. Para usar um componente, copiar o padrão para o módulo do produto (seção 2).
- Regra de uso: R14 em `.rules/projeto.md` (índice em `AGENTS.md`).

## 1. Quando consultar

- Ao **adicionar ou alterar itens** das páginas do produto (Início, Triagent, Scalation, Analítico) ou ao **criar página nova**.
- Antes de escrever um componente visual do zero: ver se o CoreUI já tem (catálogo da seção 3) e qual componente importar.
- **Não é um limite.** Se o pedido precisar de algo que não está aqui, use outros componentes do CoreUI 5.5
  (https://coreui.io/angular/docs/), Angular 20 ou HTML/SCSS próprio, sempre dentro das regras de `.rules/projeto.md`. Esta base é ponto de partida,
  não lista fechada.
- Componentes **já adaptados ao produto** (preferir a eles antes do demo cru): filtro de período `<app-period-filter>`, chips
  `.filter-chip`, controle `.brand-segmented`, cards `.brand-stat-card`, exportação `core/export/xlsx-export.ts`, tabela rolável e
  ordenável da Tabela Analítica, faixas de filtro `.segment-filter-notice`. Ver `docs/design-system.md` e `docs/arquitetura.md`.

## 2. Como reaproveitar um exemplo (receita)

1. Achar o componente no catálogo (seção 3) e abrir o `.html`/`.ts` indicado.
2. Nos `imports` do componente standalone do produto, importar os componentes/diretivas CoreUI 5.5 equivalentes ao módulo listado
   (ex.: `TableModule` → `TableDirective`; `TooltipModule` → `TooltipDirective`; o módulo inteiro também funciona).
3. Copiar **só o trecho do componente**, sem o invólucro de documentação: `<app-docs-example>`, `<app-docs-callout>` e o
   `DocsComponentsModule` (pasta `docs-components/`) servem apenas para a página de demo.
4. Adaptar ao projeto:
   - textos em pt-BR conforme `docs/glossario-ptbr.md` (R12) — os demos já estão traduzidos, mas conferir termos novos;
   - cores só por tokens `var(--brand-*)`, `var(--cui-*)`, `var(--app-*)` (R10); nada de cor fixa; testar claro e escuro;
   - API do CoreUI **5.5** e idioma do Angular 20 (R1, R3): standalone, `@if`/`@for` no lugar de `*ngIf`/`*ngFor` (histórico das demos);
   - estilo de componente ≤ 2 kB (aviso) / 4 kB (erro); acima disso, `src/scss/_<bloco>.scss` global (ADR-009);
   - dados por serviço com mock em `src/assets/data/` até existir contrato (R4) e mapeamento em `docs/mapeamento-de-dados.md`.
5. Escrever o spec ao lado e atualizar a documentação (R13).

## 3. Catálogo

Rota antiga = endereço quando a página existia no app. "No produto" = onde um equivalente já é usado.

### 3.1 Tema — `paginas/theme/`

| Página | Arquivos | CoreUI | Uso / observação |
|---|---|---|---|
| Cores (`/theme/colors`) | `colors.component.{ts,html}` (inclui `ThemeColorComponent`) | `CardModule`, `GridModule`, `UtilitiesModule` | Amostras de cores do tema; as cores reais do produto estão em `docs/design-system.md` (tokens da marca). |
| Tipografia (`/theme/typography`) | `typography.component.{ts,html}` | `CardModule`, `GridModule`, `NavModule`, `TabsModule` | Escala de títulos, `display-*`, `lead`, listas, citações. Fonte do produto: Inter (tokens). |

### 3.2 Componentes › Base — `paginas/base/`

Módulo `base.module.ts` (importa `AccordionModule`, `BadgeModule`, `BreadcrumbModule`, `ButtonModule`, `CardModule`,
`CarouselModule`, `CollapseModule`, `DropdownModule`, `FormModule`, `GridModule`, `ListGroupModule`, `NavModule`,
`PaginationModule`, `PlaceholderModule`, `PopoverModule`, `ProgressModule`, `SharedModule`, `SpinnerModule`, `TableModule`,
`TabsModule`, `TooltipModule`, `UtilitiesModule`).

| Página (rota antiga) | Pasta | Componente CoreUI | No produto |
|---|---|---|---|
| Acordeão (`/base/accordion`) | `accordion/` | `c-accordion` | — |
| Trilha de navegação (`/base/breadcrumbs`) | `breadcrumbs/` | `c-breadcrumb` | breadcrumb do header (`default-header`) |
| Cartões (`/base/cards`) | `cards/` | `c-card` (header, body, footer, imagem, grupos) | todos os cards das páginas |
| Carrossel (`/base/carousel`) | `carousels/` | `c-carousel` | — |
| Recolher (`/base/collapse`) | `collapses/` | `[cCollapse]` | — |
| Grupo de listas (`/base/list-group`) | `list-groups/` | `ul[cListGroup]` | — |
| Navegação e abas (`/base/navs`) | `navs/` | `c-nav`, `c-nav-item` | — |
| Paginação (`/base/pagination`) | `paginations/` | `ul[cPagination]` | Tabela Analítica usa paginação própria (chips Anterior/Próxima) |
| Espaço reservado (`/base/placeholder`) | `placeholders/` | `[cPlaceholder]` (skeleton) | candidato para estados de carregamento |
| Popovers (`/base/popovers`) | `popovers/` | `[cPopover]` | — |
| Progresso (`/base/progress`) | `progress/` | `c-progress` | `.progress-thin` (design-system) |
| Indicadores de carregamento (`/base/spinners`) | `spinners/` | `c-spinner` | "Carregando dados..." dos cards |
| Tabelas (`/base/tables`) | `tables/` | `table[cTable]` (striped, hover, small, bordered, responsive) | tabelas do Normativos Recebidos, e-mails, Tabela Analítica |
| Abas (`/base/tabs`) | `tabs/` | `c-tabs`, `c-tab-panel` | — |
| Dicas (`/base/tooltips`) | `tooltips/` | `[cTooltip]` | — |

### 3.3 Componentes › Botões — `paginas/buttons/`

Módulo `buttons.module.ts` (`ButtonGroupModule`, `ButtonModule`, `CardModule`, `CollapseModule`, `DropdownModule`, `FormModule`,
`GridModule`, `NavbarModule`, `NavModule`, `SharedModule`, `UtilitiesModule`).

| Página (rota antiga) | Pasta | Componente CoreUI | No produto |
|---|---|---|---|
| Botões (`/buttons/buttons`) | `buttons/` | `[cButton]` (cores, variantes, tamanhos, desabilitado) | "Exportar Excel", `.brand-icon-btn` |
| Grupos de botões (`/buttons/button-groups`) | `button-groups/` | `c-button-group`, `c-button-toolbar` | `.brand-segmented` (Dia/Mês/Ano) |
| Menus suspensos (`/buttons/dropdowns`) | `dropdowns/` | `c-dropdown` | seletor de tema do header |

### 3.4 Componentes › Formulários — `paginas/forms/`

Módulo `forms.module.ts` (`ButtonGroupModule`, `ButtonModule`, `CardModule`, `DropdownModule`, `FormModule`, `GridModule`,
`ListGroupModule`, `SharedModule`, `ReactiveFormsModule`).

| Página (rota antiga) | Pasta | Componente CoreUI | No produto |
|---|---|---|---|
| Controles de formulário (`/forms/form-control`) | `form-controls/` | `input[cFormControl]`, `textarea`, `cLabel`, `cFormText` | datas "De/Até" do filtro de período |
| Seleção (`/forms/select`) | `select/` | `select[cSelect]` | — |
| Caixas de seleção e rádios (`/forms/checks-radios`) | `checks-radios/` | `c-form-check`, `input[cFormCheckInput]`, switch | — |
| Intervalo (`/forms/range`) | `ranges/` | `input[cFormRange]` | — |
| Grupo de entrada (`/forms/input-group`) | `input-groups/` | `c-input-group` | — |
| Rótulos flutuantes (`/forms/floating-labels`) | `floating-labels/` | `[cFormFloating]` | — |
| Layout (`/forms/layout`) | `layout/` | grade de formulário (`c-row`, `c-col`, `cForm`) | — |
| Validação (`/forms/validation`) | `validation/` | `[validated]`, `cFormFeedback` | mensagens de validação do filtro personalizado |

### 3.5 Gráficos, Ícones, Notificações, Widgets

| Página (rota antiga) | Pasta | Componente / módulo | No produto |
|---|---|---|---|
| Gráficos (`/charts`) | `paginas/charts/` | `<c-chart>` (`ChartjsModule`): linha, barra, rosca, pizza, radar, área polar | Normativos Recebidos (linha), Fluxo de e-mail (barra empilhada), Normas Aplicáveis (rosca), Cascata (barra). Cores e regras em `docs/design-system.md` |
| Ícones (`/icons/general`, `/flags`, `/brands`) | `paginas/icons/` | `svg[cIcon]` (`IconModule`), conjuntos `cil*`, `cif*`, `cib*` | ícones `cil*` do subset `src/app/icons/icon-subset.ts` (ícone novo entra no subset) |
| Alertas (`/notifications/alerts`) | `paginas/notifications/alerts/` | `c-alert` | — |
| Selos (`/notifications/badges`) | `paginas/notifications/badges/` | `c-badge` | — |
| Modais (`/notifications/modal`) | `paginas/notifications/modals/` | `c-modal` | — |
| Avisos (`/notifications/toasts`) | `paginas/notifications/toasters/` | `c-toaster`, `c-toast` (declaração comentada no módulo do template) | — |
| Widgets (`/widgets`) | `paginas/widgets/widgets/`, `widgets-e/`, `widgets-brand/` e o routing module histórico da demo | `c-widget-stat-a/b/c/d/e/f` (`WidgetModule`) | **no app:** `views/widgets/widgets-dropdown` (cards de segmento, `c-widget-stat-a`) e `views/widgets/segment-overview` (visão geral do Início, `c-widget-stat-d` no lugar dos cards sociais de `widgets-brand/`) |

### 3.6 Extras › Páginas — `paginas/pages/`

| Página (rota antiga) | Pasta | Observação |
|---|---|---|
| Entrar (`/login`) | `login/` | Layout de referência apenas. Autenticação só via BFF Atlante (R5); não reativar formulário de senha próprio. |
| Cadastro (`/register`) | `register/` | Layout de referência apenas (R5). |
| Erro 404 (`/404`) | `page404/` | Hoje rota desconhecida volta ao Início (`'**' → ''`). Para uma página de erro, partir daqui. |
| Erro 500 (`/500`) | `page500/` | Idem, para erro do servidor. |

### 3.7 Apoio

| Item | Caminho | O que é |
|---|---|---|
| Invólucro de documentação | `docs-components/` (`DocsComponentsModule`: `app-docs-example`, `app-docs-callout`) | Só para páginas de demo. Antigo alias `@docs-components/*` em `tsconfig.app.json` (removido). |
| Estilos dos exemplos | `estilos/_examples.scss` | `.example`, `.callout-info`, `.preview`; era importado em `src/scss/styles.scss`. |
| Menu antigo | `navegacao-original.ts` | Cópia do `_nav.ts` com os grupos Tema, Componentes e Extras. |
| Rotas antigas | `rotas-originais.ts` | Cópia histórica do roteamento da base 4.x (antes da migração) com as rotas de demo, 404, 500, login e cadastro. |

## 4. Restaurar uma página de demo no app (se pedido)

1. Partir da versão 5.5 da demo no clone da pasta pai (`../src/app/views/<pasta>/`, já standalone com `routes.ts`), traduzir
   para pt-BR e aplicar tokens; a cópia 4.x desta pasta serve só de comparação (não compila no Angular 20).
2. Se ela usa `app-docs-example`/`app-docs-callout`: copiar o invólucro 5.5 do clone (`../src/components/`) para `src/components/`,
   recriar o alias `"paths": { "@docs-components/*": ["./src/components/*"] }` em `tsconfig.app.json` e importar os estilos de
   exemplo do clone (`../src/scss/_examples.scss`); `docs-components/` e `estilos/_examples.scss` daqui são a versão 4.x.
3. Registrar `loadChildren` em `src/app/app.routes.ts` (endereços em `rotas-originais.ts`) e, se quiser no menu, o item de `navegacao-original.ts`.
4. Rodar `npm run verify` e atualizar `docs/` (R13) e esta base.

## 5. Manutenção

- Pasta nova em `paginas/` (ou em `paginas/<grupo>/`) precisa aparecer neste README; `npm run docs:check` cobra (verificação 8).
- Componente do produto que vira padrão reutilizável: registrar na seção 1 (lista "já adaptados") e em `docs/design-system.md`.
