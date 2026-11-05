# 07. Como aplicar a identidade em outra landing

Receita para levar o visual da Agenda Normativa a uma landing nova criada a partir deste template (ou a qualquer projeto
Angular 15 + CoreUI 4.4 com as mesmas regras). Cada passo diz o que copiar de `anexos/`, o que adaptar e como conferir.
Siga na ordem; os passos 1 a 6 dão a identidade completa, os demais trazem componentes conforme a necessidade.

## 0. Antes de começar

- Node 18 (`nvm use 18`), dependências instaladas (`npm ci`), build de produção passando no estado atual.
- Ler `README.md` desta pasta (seção 2: versões e o que é proibido) e `docs/portabilidade.md` do template.
- Decidir a **marca**: produto da própria instituição (usa o símbolo e o rodapé como estão) ou outra marca (troca nome, SVG e dados
  do rodapé; a paleta pode ficar ou ser trocada, ver `01-identidade-e-tokens.md`, 6).
- Conferir no Nexus se existe `@fontsource/inter@5.3.0` (R2). Se não existir, seguir sem ele (passo 1).
- Qualquer conflito com as regras do projeto de destino: parar e perguntar (R11).

## 1. Fonte

```bash
npm install --save-exact @fontsource/inter@5.3.0
```

Em `angular.json`, nos arrays `styles` de `build` **e** de `test`, antes de `src/scss/styles.scss`, as oito linhas de
`02-tipografia-e-layout.md`, 1.1. Sem o pacote: pule este passo (a pilha cai para a fonte do sistema). Registre a
dependência (ou a ausência dela) em `docs/dependencias-e-ambiente.md`.

## 2. Tokens, tema escuro e estilos globais

Copiar de `anexos/scss/` para `src/scss/`:

| Arquivo | Ação |
|---|---|
| `_brand.scss` | **Novo.** Fonte da verdade da paleta |
| `_variables.scss` | **Substituir** (o do template não tem sobrescritas) |
| `_theme-dark.scss` | **Substituir** (o do template usa outra paleta escura, `#1b1f27`/`#242a34`) |
| `_typography.scss`, `_components.scss`, `_filter-chips.scss` | **Novos** |
| `_layout.scss`, `_fixes.scss`, `_scrollbar.scss`, `_charts.scss`, `_custom.scss` | **Substituir** |
| `styles.scss` | **Substituir**, com dois ajustes abaixo |
| `_stat-card.scss`, `_classification-card.scss`, `_analytic-table.scss`, `_emails-card.scss`, `_chat-widget.scss` | Só se o componente correspondente for reproduzido; senão, **remover** o `@import` dele de `_custom.scss` (ou de `styles.scss`, no caso do chat) |

Ajustes em `styles.scss`:

1. Sem chat flutuante: apagar `@import "chat-widget";`.
2. Se o projeto **mantiver as páginas de demonstração do template** (`views/base`, `views/buttons`, ..., componentes
   `src/components/docs-*`), manter `@import "examples";` logo depois de `@import "layout";` (o template importa e as
   páginas dependem dele). Se forem removidas, o import sai.

Conferir: `ng build --configuration production`; abrir a página e alternar Claro/Escuro (o seletor já existe no
template).

## 3. Serviço de tema

Substituir `src/app/core/services/theme.service.ts` pelo anexo `core/services/theme.service.ts.txt` (renomeando para
`.ts`) e trocar a chave `COLOR_MODE_STORAGE_KEY` pelo nome do projeto (ex.: `'minha-landing.color-mode'`). A versão do
anexo passa fonte e tooltip para os defaults do Chart.js. Se o projeto tiver o teste `theme.service.spec.ts`, ajustar a
chave lá também. `AppComponent` já injeta o serviço no template.

## 4. `index.html`, título e idioma

- Usar `anexos/index.html` como base: `<html lang="pt-BR">`, `description`, os dois `<meta name="theme-color">`
  (`#223ad2` claro, `#0f1319` escuro), favicon SVG, `<title>`, `<noscript>` e "Carregando..." em pt-BR. Remover o
  comentário de cabeçalho do CoreUI.
- `AppComponent.title`: nome do produto.
- `AppModule` (`anexos/app/app.module.ts.txt`): `registerLocaleData(localePt, 'pt-BR')`,
  `{ provide: LOCALE_ID, useValue: 'pt-BR' }`, `{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }`. O
  `HashLocationStrategy` o template já tem.

## 5. Marca e casca da página

1. **Assets:** copiar `anexos/assets/favicon.svg` para `src/assets/` e `anexos/assets/img/brand/*.svg` para
   `src/assets/img/brand/`. Outra marca: SVG próprios com as mesmas alturas (1,75rem na sidebar, 2,5rem no rodapé).
   Remover do projeto e das telas os logos do CoreUI (`coreui-*.svg`, `favicon.ico`).
2. **Layout** (`default-layout.component.html`, ver anexo): trocar o `c-sidebar-brand` com `[brandFull]`/`[brandNarrow]`
   do CoreUI pelo link `.brand-lockup` (símbolo + nome); remover `<c-sidebar-toggler>` (o menu fica sempre largo); usar
   `dropdownMode="none"` se o menu tiver subitens de seção (com `openActiveGroup()` do anexo
   `default-layout.component.ts.txt`).
3. **Header** (`default-header.component.*`, ver anexo): deixar só o botão do menu, a data e o seletor de tema; remover
   os links, ícones de notificação e o avatar com menu de conta do template. O `.scss` do header fica vazio (os estilos
   estão em `_components.scss`).
4. **Rodapé** (`default-footer.component.*`, ver anexo): faixa azul-marinho com logo e texto legal; trocar
   `FOOTER_COMPANIES` pelos dados da empresa da landing; remover os links do CoreUI.
5. **Menu** (`_nav.ts`): textos em pt-BR, "Início" com `exact: true`, títulos de seção, subitens com o padrão
   `section(nome, url, fragmento)` quando apontarem para blocos da mesma página.
6. **Ícones** (`icon-subset.ts`): registrar os que a tela usa (`05-conteudo-e-acessibilidade.md`, 4), no mínimo
   `cilMenu`, `cilSun`, `cilMoon`, `cilContrast` e os do menu.
7. **Rolagem até seções** (se houver subitens de seção): copiar `core/navigation/section-scroll.ts.txt` e, no
   `RouterModule.forRoot`, acrescentar `scrollOffset: () => [0, stickyHeaderOffset()]` às opções que o template já tem.

Conferir com `06-telas.md`, 2: menu, header e rodapé iguais nas duas cores de tema.

## 6. Documentação viva (R13)

Mudou tokens, layout, dependências: atualizar no projeto de destino, na mesma entrega,

- `docs/design-system.md`: tabelas de tokens (pode partir das tabelas de `01-identidade-e-tokens.md`) e o carimbo
  `<!-- tokens-hash: ... -->` (valor que `npm run docs:check` indicar; o template inclui `_brand.scss` no cálculo quando
  ele existe);
- `docs/arquitetura.md` (layout, tema, componentes), `docs/dependencias-e-ambiente.md` (`@fontsource/inter`,
  `angular.json`), `docs/changelog.md`;
- ADRs novos para as decisões (paleta e marca adotadas, fonte), como os ADR-004, ADR-005 e ADR-011 da origem;
- `npm run docs:inventory` e `npm run docs:check` até passar.

## 7. Componentes (conforme a necessidade)

Para cada componente, copiar o HTML/SCSS do anexo indicado em `03-componentes.md`, trocar textos e dados, manter as
classes. Regras:

- Estilo reutilizável vai para `src/scss/` (importado por `_custom.scss`); o `.component.scss` fica só com layout
  próprio e abaixo de 2 kB (aviso) / 4 kB (erro).
- Classes compartilhadas (`.filter-bar`, `.filter-chip`, `.filter-date`, `.brand-segmented`, `.brand-stat-card`,
  `.progress-thin`) não são renomeadas.
- Filtro de período: copiar `period/period-range.ts.txt` e `period-filter/*` e declarar o componente num módulo
  compartilhado (na origem, `PeriodFilterModule` importa `CommonModule`, `ReactiveFormsModule`, `ButtonGroupModule`,
  `ButtonModule` e `IconModule`).
- Faixa de filtro ativo: mover `.segment-filter-notice` de `dashboard.component.scss` para `src/scss/` se for usada em
  mais de uma tela.
- Toda tela com dados tem estados de carregando, erro e vazio (`03-componentes.md`, 13) e dados atrás de um serviço que
  monta a URL com `environment.apiBase` (R4); enquanto não houver contrato, dados de demonstração em `src/assets/data/`.

Módulos do CoreUI usados pelos componentes da origem: `CardModule`, `GridModule`, `ButtonModule`, `ButtonGroupModule`,
`FormModule`, `TableModule`, `SpinnerModule`, `ProgressModule`, `WidgetModule`, `DropdownModule`, `HeaderModule`,
`SidebarModule`, `BreadcrumbModule`, `FooterModule`, `NavModule`, `UtilitiesModule`, `SharedModule`, mais
`ChartjsModule` (`@coreui/angular-chartjs`) e `IconModule` (`@coreui/icons-angular`).

## 8. Gráficos

Seguir `04-graficos.md`: cores lidas dos tokens na montagem, remontagem em `appliedTheme$`, legenda HTML, sem números no
eixo Y, plugins de rótulo, visão Tabela, `role="img"` com resumo. Copiar `chart-colors.ts.txt` e, para linhas,
`traffic-value-labels.plugin.ts.txt`. Séries novas usam `--app-series-1..4` na ordem; mais séries ou outra marca exigem
validar a paleta (`04-graficos.md`, 9) antes de ir para a tela.

## 9. Exportação Excel

Copiar `core/export/xlsx-export.ts.txt`; acrescentar `"exceljs/dist/exceljs.min.js"` em `allowedCommonJsDependencies`
(`angular.json`) e `declare module 'exceljs/dist/exceljs.min.js';` em `src/declarations.d.ts`. Trocar
`workbook.creator` pelo nome do produto. Os tokens `--app-export-accent` e `--app-export-muted` já vêm no `_brand.scss`
do anexo; não os redefina no `_theme-dark.scss` (a planilha deve sair igual nos dois temas).

## 10. Conferência final

- [ ] `ng build --configuration production` sem erro nem aviso de budget.
- [ ] `npm run docs:check` passando.
- [ ] Comparar com as capturas de `06-telas.md` em 1440 px e 375 px, nos dois temas.
- [ ] Checklist de `05-conteudo-e-acessibilidade.md`, 7 (teclado, contraste, movimento reduzido, pt-BR).
- [ ] Nenhum resto do CoreUI na interface: título, favicon, logos, links do rodapé, "Powered by".
- [ ] Nenhuma cor fixa fora dos três arquivos de tokens (`grep -rnE "#[0-9a-fA-F]{3,6}\b" src/app` só deve achar
      reservas documentadas).

## 11. O que adaptar e o que manter

| Manter igual | Adaptar ao projeto |
|---|---|
| Nomes dos tokens (`--brand-*`, `--app-*`) e a ordem de importação | Nome do produto, textos, menu, rotas e ids de seção |
| Escala tipográfica, raios, elevações, espaçamentos | Dados, serviços e modelos (a camada de dados da origem não foi copiada) |
| Mecanismo de tema (`ThemeService` + `_theme-dark.scss`) | Chave do `localStorage` do tema |
| Padrões de componente (chips, segmentado, legenda, tabelas, estados) | Quais componentes entram |
| Regras dos gráficos e a ordem das séries validadas | Rótulos das séries; paleta, se a marca for outra (com revalidação) |
| Formatos pt-BR e textos padrão de estado | Glossário de termos do domínio |
| Acessibilidade (foco, ARIA, contraste, movimento reduzido) | Dados legais do rodapé e SVG de marca, se não for produto da instituição |

## 12. O que não fazer

- Não subir versão de Angular, CoreUI, Chart.js ou TypeScript para "ganhar" algum recurso (R1); não usar Signals, `@if`,
  `@for`, `takeUntilDestroyed` nem a API do CoreUI 5 (R3).
- Não instalar fonte, ícone ou biblioteca de gráfico por CDN ou URL (R2); a Inter só via pacote do Nexus.
- Não colocar cor fixa em componente, template ou TypeScript (fora das reservas documentadas).
- Não reordenar nem trocar cores de séries sem revalidar a paleta.
- Não importar arquivos de `docs/referencia-visual/anexos/` direto no app: copiar para `src/` e ajustar.
- Não redesenhar, distorcer ou recolorir o símbolo da instituição, nem usá-lo em produto de outra marca.
- Não copiar os blocos de demonstração herdados do template (cards de redes sociais, "Tráfego e vendas").
