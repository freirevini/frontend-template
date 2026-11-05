# Changelog — landing-analitica

Histórico por entrega, em ordem cronológica. Toda entrega nova acrescenta uma entrada aqui (R13).
Formato: data · título · o que mudou · arquivos principais. Base: CoreUI Free Angular Admin Template v4.3.13 (commit `36966f6`).

---

## 2026-10-27

### 1. Base CoreUI v4.3 (Angular 15) + regras e ambientes
Único commit próprio até aqui (`4648cc5 chore: base CoreUI v4.3 (Angular 15) + regras e ambientes`); as entregas seguintes estão no working tree.
- Projeto renomeado para `landing-analitica` (chave em `angular.json`, `outputPath`, `browserTarget`, `package.json`).
- Versões cravadas (sem `^`): Angular `15.2.8`, CLI/builder `15.2.7`, TypeScript `4.9.5`; `engines` `node >=18.16.0 <19`, `npm >= 9`.
- Dependências de exportação adicionadas (ainda sem uso): `exceljs 4.4.0`, `jspdf 2.5.2`, `jspdf-autotable 3.8.4`.
- Ambientes `environment.ts`/`environment.prod.ts` com a base da API `'/api'` (campo renomeado para `apiBase` e movido para `assets/env.json` na Fase 3); `fileReplacements` no build de produção; `proxy.conf.json` com placeholder `http://HOST_DEV_BFF:PORTA` ligado ao `ng serve`.
- Regras R1–R11 em `CLAUDE.md` e cópia idêntica em `.cursor/rules/regras-projeto.mdc`.
- Arquivos: `CLAUDE.md`, `.cursor/rules/regras-projeto.mdc`, `angular.json`, `package.json`, `package-lock.json`, `proxy.conf.json`, `src/environments/environment.ts`, `src/environments/environment.prod.ts`.

### 2. Temas claro, escuro e automático (`ThemeService`)
- `ThemeService` (`providedIn: 'root'`) com modos `light` | `dark` | `auto`; aplica `data-theme` e a classe `dark-theme` (gancho já usado por `_examples.scss`) no `<html>`; segue `prefers-color-scheme` no modo automático; persiste a preferência em `localStorage` (`landing-analitica.color-mode`); copia os tokens `--app-chart-*` para `Chart.defaults` (cor, grade, fonte, tooltip) e atualiza os gráficos abertos.
- Tema escuro do CoreUI 4.x (que não tem modo escuro nativo) em `_theme-dark.scss`, sobrescrevendo as variáveis `--cui-*`.
- Seletor no header (dropdown "Tema" com Claro/Escuro/Automático, ícones `cilSun`/`cilMoon`/`cilContrast`); `AppComponent` injeta o serviço para aplicar o tema salvo no bootstrap.
- R10 atualizada: temas sem dependência nova; não portar `ColorModeService` da 5.x; componentes usam `var(--cui-*)`.
- Arquivos: `src/app/core/services/theme.service.ts` (+ `.spec.ts`), `src/scss/_theme-dark.scss`, `src/scss/styles.scss`, `src/app/containers/default-layout/default-header/*`, `src/app/app.component.ts`, `src/app/icons/icon-subset.ts`.

### 3. Header com data atual e sem ícones/links de demonstração
- Removidos do header os ícones de notificações (`cilBell`), tarefas (`cilTask`), mensagens (`cilEnvelopeOpen`), o menu de usuário com avatar e os links de demonstração (`/dashboard`, `/users`, `/settings`); restam o botão do menu lateral, a data e o seletor de tema.
- Data corrente em pt-BR via `Intl.DateTimeFormat`: longa ("terça-feira, 27 de outubro de 2026") a partir de `md`, curta (`27/10/2026`) abaixo; `<time datetime="yyyy-MM-dd">`; `today$` reavaliado a cada 60 s (`interval` + `distinctUntilChanged`) para virar à meia-noite; `toHeaderDate()` exportado para testes.
- Arquivos: `src/app/containers/default-layout/default-header/default-header.component.ts`, `.html`, `.scss`, `.spec.ts`.

### 4. Tradução completa para pt-BR + regra R12 + glossário
- Todo texto visível traduzido: menu lateral (`_nav.ts`), títulos de rota/breadcrumb nos `*-routing.module.ts`, telas de demonstração (`views/base`, `buttons`, `charts`, `forms`, `icons`, `notifications`, `pages`, `theme`, `widgets`), componentes de documentação (`src/components/docs-callout`, `docs-example`), `index.html` (`lang="pt-BR"`, `noscript`, "Carregando...").
- `AppModule`: `registerLocaleData(localePt, 'pt-BR')`, `LOCALE_ID` `pt-BR`, `DEFAULT_CURRENCY_CODE` `BRL`; datas `dd/mm/aaaa`, números `1.234,56`, moeda `R$` com pipes/`Intl`.
- R12 (idioma oficial pt-BR) criada; `docs/glossario-ptbr.md` com os termos oficiais de navegação, interface, formulários, indicadores e "Não traduzir".
- Arquivos: `src/app/app.module.ts`, `src/app/containers/default-layout/_nav.ts`, `src/app/app-routing.module.ts`, todos os `src/app/views/**/*.html|*.ts` listados em `docs/inventario.md`, `src/index.html`, `docs/glossario-ptbr.md`, `CLAUDE.md`.

### 5. Remoção da marca CoreUI (logo próprio, favicon, rodapé, metadados, nome `landing-analitica`)
- Logo próprio do painel ("Painel Analítico") em `src/assets/img/brand/logo.svg` (200×46) e `logo-narrow.svg` (46×46), ligados em `default-layout.component.html`; `favicon.svg` novo em `src/assets/`; `favicon.ico` e `angular.ico` removidos de `angular.json`.
- Apagados os SVGs `coreui-*.svg`, o componente `docs-link`, `.github/**` e o `CHANGELOG.md` do template; tela de ícones renomeada de `coreui-icons.component.*` para `icons.component.*`.
- Rodapé "Painel Analítico © {ano}" (sem links); `index.html` com título, `description` e `theme-color` próprios; `README.md` reescrito; `karma.conf.js` com `coverage/landing-analitica`.
- R8 estendida: nenhuma marca, nome ou link do CoreUI em telas, metadados, favicon ou nome do projeto; `LICENSE` (MIT) permanece.
- Arquivos: `src/assets/img/brand/*`, `src/assets/favicon.svg`, `src/app/containers/default-layout/default-layout.component.html`, `default-footer/*`, `src/index.html`, `src/app/views/icons/*`, `src/components/*`, `angular.json`, `karma.conf.js`, `README.md`, `CLAUDE.md`.

### 6. Painel como página inicial e, depois, páginas Início / Triagent / Scalation / Analítico
- Primeiro o painel (`views/dashboard`) passou a ser a rota raiz; em seguida a estrutura definitiva: `''` → Início (`views/home`, vazia, `data.title: ''` para não repetir o breadcrumb), `triagent` → painel (`views/dashboard`, título "Triagent"), `scalation` → `views/scalation` (vazia), `analitico` → `views/analytics` (vazia, título "Analítico"); `dashboard` redireciona para `triagent` (links antigos).
- Menu lateral com os 4 itens do produto no topo (`cil-home` com `exact: true`, `cil-speedometer` + selo "NOVO", `cil-layers`, `cil-chart-line`); seção "Páginas do produto" no glossário ("Triagent" e "Scalation" não se traduzem).
- Arquivos: `src/app/app-routing.module.ts`, `src/app/containers/default-layout/_nav.ts`, `src/app/views/home/**`, `src/app/views/scalation/**`, `src/app/views/analytics/**`, `src/app/views/dashboard/dashboard-routing.module.ts`, `docs/glossario-ptbr.md`.

### 7. Gráfico de cascata (waterfall) — "Cascata do resultado"
- `<app-waterfall-chart>` no painel: barras flutuantes Chart.js 3 (`type: 'bar'`, dados `[low, high]`) com etapas `total` (Receita bruta, Resultado) e `decrease` (Deduções, Custos, Despesas), até 3 componentes por etapa em rampas de cor; plugins próprios para conectores entre colunas e rótulos dentro dos segmentos (valor + nome quando cabe; contraste automático do texto).
- Modelo `buildWaterfall()` valida os dados e calcula saldos; alternância `R$` / `% da receita` e `Gráfico` / `Tabela` (tabela acessível com `caption`, `rowspan` por etapa, "Saldo após a etapa"); resumo "Resultado <valor> (<x>% da receita bruta)"; `aria-label` descritivo; estados `loading`/`error`.
- Dados mock em `src/assets/data/dashboard-waterfall.json` (base anual 2021, `unitScale` 1 000 000, `currency` BRL) lidos por `WaterfallDataService` via `HttpClient` (`HttpClientModule` adicionado ao `AppModule`). Formatação compacta pt-BR ("R$ 15 mi", sinal `−`).
- Arquivos: `src/app/views/dashboard/waterfall/waterfall-chart.component.ts|html|scss|spec.ts`, `waterfall-data.service.ts`, `waterfall.model.ts` (+ spec), `waterfall-format.ts`, `src/assets/data/dashboard-waterfall.json`, `src/app/views/dashboard/dashboard.module.ts`, `src/app/app.module.ts`, `docs/glossario-ptbr.md`.

### 8. Gráfico de tráfego com valores nos pontos, eixo Y oculto e períodos Dia/Mês/Ano
- Plugin `trafficValueLabelsPlugin` escreve o valor acima de cada ponto (Inter 600 11px, cor `--app-chart-color`, halo na cor do card), empilha rótulos no mesmo x e pula pontos quando a densidade não permite; eixo Y com `ticks.display: false` mantendo as gridlines; eixo X sem grade; `layout.padding` para os rótulos.
- Granularidade Dia/Mês/Ano com rótulos pt-BR (`Seg 27/10`, `Janeiro`…`Dezembro`, `Jan/21` fora do mesmo ano, anos) e subtítulo do período ("Outubro a dezembro de 2021").
- Arquivos: `src/app/views/dashboard/traffic-value-labels.plugin.ts`, `src/app/views/dashboard/dashboard-charts-data.ts` (+ `.spec.ts`), `dashboard.component.ts|html`.

### 9. Cards de segmento (Atacado, Corporativo, Plataforma, Varejo)
- Os quatro widgets do template viraram cards de segmento em ordem alfabética, com quantidade de normas (só o número: 54, 62, 25, 44), variação percentual em pt-BR, ícones `cilTruck`, `cilBuilding`, `cilDevices`, `cilCart` (adicionados ao subset) e sparkline padronizada (linha + pontos, faixa vertical calculada por card); menus suspensos dos widgets removidos.
- Glossário: seção "Segmentos de negócio".
- Arquivos: `src/app/views/widgets/widgets-dropdown/widgets-dropdown.component.html|ts|scss`, `src/app/icons/icon-subset.ts`, `docs/glossario-ptbr.md`.

### 10. Tráfego por segmento, legenda interativa e "Normas a Classificar" filtrada por segmento
- Séries fixas em `TRAFFIC_SERIES`: Atacado, Corporativo, Plataforma, Varejo e a linha tracejada "Normas a Classificar" (`TO_CLASSIFY_INDEX`, sempre a última), cores em `--app-series-1..4` e `--app-series-reference`.
- Legenda no rodapé do card substitui a do Chart.js: botões com total ("1.234 normas (28%)") e barra de participação; clique destaca a série (`fill`, borda 3px) e esmaece as demais; segundo clique mostra todas; com um segmento selecionado a tracejada continua ativa mostrando só as normas a classificar daquele segmento ("Normas a Classificar · Atacado"). `aria-pressed`, `title` e `role="group"` para acessibilidade.
- Anel de 2px na cor do card nos pontos (`chartSurfaceColor`) para separar linhas sobrepostas; cores relidas quando o tema muda (`appliedTheme$`).
- Arquivos: `src/app/views/dashboard/dashboard-charts-data.ts`, `dashboard.component.ts|html|scss`, `src/scss/_brand.scss`, `src/scss/_theme-dark.scss`, `docs/glossario-ptbr.md`.

### 11. Filtros de período em chips + intervalo personalizado
- Chips `.filter-chip` (pílula, `is-active`) com "Últimos" 7/15/30 dias, 3/6/12 meses, 3/5 anos (`TRAFFIC_RANGES`, padrão 7/12/5) e "Personalizado" (ícone `cilCalendar`) que abre campos "De"/"Até" (`<input type="date">`, Reactive Forms) com "Aplicar"/"Cancelar".
- Validação `validateCustomRange()`: "Informe as duas datas.", "A data inicial deve ser anterior ou igual à data final.", limites 92 dias / 60 meses / 30 anos; ao trocar a granularidade, o intervalo personalizado é mantido se couber, senão volta ao preset padrão com aviso ("O intervalo personalizado não cabe nesta visão; mostrando os últimos <N>.").
- Arquivos: `src/scss/_filter-chips.scss`, `src/app/views/dashboard/dashboard-charts-data.ts`, `dashboard.component.html`, `docs/glossario-ptbr.md`.

## 2026-10-28

### 12. Identidade visual da marca, cascata reformulada e filtro de período compartilhado `<app-period-filter>`
Iniciada no fim de 27/10 (`_brand.scss`) e concluída em 28/10.
- **Tokens da marca** em `src/scss/_brand.scss` (única fonte de cores, raios, elevações e fonte): paleta `$brand-blue #223ad2`, `$brand-cyan`, `$brand-green`, `$brand-orange`, `$brand-red`, escalas de conteúdo e superfície, navy da sidebar; CSS vars `--brand-*` (claro) e, em `_theme-dark.scss`, os valores escuros (paleta navy `#0f1319`/`#171e28`) mais todas as `--cui-*` de layout, botões, formulários e componentes; `_variables.scss` sobrescreve o CoreUI (`$primary`, `$font-family-sans-serif`, raios, sombras, cards, `$sidebar-bg: $brand-navy`, header/footer).
- **Fonte Inter** via `@fontsource/inter 5.3.0` (pesos 400/500/600/700 latin + latin-ext) registrada em `angular.json` (build e test); `_typography.scss` (títulos 600, `tabular-nums`, cabeçalhos de tabela, breadcrumb).
- **Componentes** em `_components.scss`: sidebar navy com filete ciano no item ativo e selo "NOVO" ciano, header/footer, cards, botões, `.brand-segmented` (Dia/Mês/Ano), `.brand-icon-btn`, `.progress-thin`, `prefers-reduced-motion`; cards de segmento em gradiente `--brand-primary → --brand-primary-high` com brilho ciano, texto branco e camada escura no tema escuro (`.brand-stat-card`).
- **Paleta de gráficos** `--app-series-*` e `--app-wf-total-1..3` / `--app-wf-decrease-1..3` / `--app-wf-connector`, com valores próprios no tema escuro, validada para daltonismo nos dois temas (não reordenar sem revalidar, R10); `_charts.scss` com o tooltip externo nos tokens.
- **Filtro compartilhado** `<app-period-filter>` (`period-filter/`): inputs `period`, `range`, `bounds`, `label`, `id`; output `selectionChange: PeriodSelection`; helpers extraídos para `period/period-range.ts` (`presetRange`, `buildTrafficPeriod`, `validateCustomRange`, `toInputDate`/`fromInputDate`, `PERIOD_END` = 31/12/2021). Usado pelo Tráfego ("Período do tráfego") e pela Cascata ("Período da cascata").
- **Cascata reformulada**: mesmos filtros de período do Tráfego; dados por período derivados da base anual em `waterfall-derive.ts` (proporcional ao intervalo, ruído determinístico por seed, resultado nunca abaixo de 5% da receita; o ano-base inteiro devolve os valores originais); eixo Y sem números (rótulos dentro dos segmentos); chips `R$`/`% da receita` e `Gráfico`/`Tabela` com `.filter-chip`; conectores e rótulos lidos dos tokens em tempo de render.
- Header/footer e logos ajustados aos tokens; `index.html` com `theme-color` claro/escuro; R10 reescrita com os três arquivos de tokens, as três famílias de variáveis e a proibição de logo/nome da instituição na interface.
- Arquivos: `src/scss/_brand.scss`, `_variables.scss`, `_theme-dark.scss`, `_typography.scss`, `_components.scss`, `_filter-chips.scss`, `_charts.scss`, `_custom.scss`, `_layout.scss`, `styles.scss`, `angular.json`, `package.json`, `src/app/views/dashboard/period/period-range.ts`, `period-filter/period-filter.component.ts|html|scss|spec.ts`, `waterfall/waterfall-derive.ts` (+ spec), `waterfall/waterfall-chart.component.*`, `waterfall/waterfall-data.service.ts`, `dashboard-charts-data.ts`, `dashboard.component.*`, `dashboard.module.ts`, `src/app/views/widgets/widgets-dropdown/*`, `src/app/containers/default-layout/default-header/*`, `default-footer/*`, `src/assets/img/brand/*`, `src/assets/favicon.svg`, `src/index.html`, `src/app/core/services/theme.service.ts`, `CLAUDE.md`, `.cursor/rules/regras-projeto.mdc`, `docs/glossario-ptbr.md`.

### 13. Documentação viva de portabilidade (R13)
- Regra R13 em `CLAUDE.md`/`.mdc` com a tabela "Se mudou → Atualize"; scripts `npm run docs:inventory` (gera `docs/inventario.md`: rotas, tokens, dependências, arquivos vs template `36966f6`) e `npm run docs:check` (verifica documentos obrigatórios, cobertura de `views/`, mocks, dependências, carimbo `tokens-hash`, idade do inventário e seções deste playbook).
- Conjunto de documentos em `docs/`: `README.md`, `portabilidade.md`, `changelog.md`, `arquitetura.md`, `contratos-de-dados.md`, `design-system.md`, `dependencias-e-ambiente.md`, `decisoes/`, além de `glossario-ptbr.md` e `inventario.md`.
- Arquivos: `CLAUDE.md`, `.cursor/rules/regras-projeto.mdc`, `package.json`, `scripts/docs-inventory.js`, `scripts/docs-check.js`, `docs/**`.

### 2026-10-28 — Scripts de documentação portáveis

`scripts/docs-inventory.js` funciona sem o histórico git do template (seção marcada como indisponível; `DOCS_TEMPLATE_COMMIT` permite outro commit base); `scripts/docs-check.js` só exige glossário onde existe a R12 e só confere arquivos de tokens existentes. Mesma regra R13 e scripts aplicados ao template `frontend-template-angular`.

### 2026-10-28 — Planejamento do chat flutuante com Deep Chat

Somente documentação, sem código. `docs/planejamento/chat-deep-chat.md` reúne a leitura da documentação do Deep Chat (`connect`, interceptors, mensagens, estilos, HTML, eventos, métodos), a compatibilidade verificada de `deep-chat@2.5.1` com TypeScript 4.9.5 (Nexus ainda pendente), as regras do projeto que se aplicam, a arquitetura proposta (`ChatModule` com `CUSTOM_ELEMENTS_SCHEMA`, `connect.handler` via `HttpClient`), o catálogo de funções de mensagens `M01`–`M26` e os passos `P0`–`P8`. Índice em `docs/README.md`.

### 2026-10-28 — Rascunho do plano do agente de normas (Gemini via Vertex AI)

Somente documentação. `docs/planejamento/agente-normas-gemini.md`: requisitos (fluxo guiado, linguagem natural ancorada nos dados, PDFs/prints de normas, recusa fora do tema, loop de esclarecimento), topologia front → BFF → orquestrador → Vertex AI, contrato `/conforme/chat/*` proposto, forma do JSON de fluxo, camada LLM (perfis de modelo, saída estruturada, guarda de tema, gate de arquivos, grounding), etapas `E0`–`E9` e decisões `D1`–`D10`. No mesmo dia as decisões foram aprovadas (BFF Atlante Java/Spring Boot orquestra; Gemini 3.8 Flash / 3.1 Pro na região `global`; base CSV/JSON local até homologação no GCP; sessão e arquivos efêmeros; 3 rodadas e contatos; área não logada com proteções) e o plano foi fechado com M27 (upload) e os complementos C1–C7 (JSON no código; chassi Atlante 3.6.2-rc3 / Java 21+; só mock neste ambiente com `LlmGateway` configurável por `agente.llm.*` para o futuro projeto GCP do Vertex; 20 MB por sessão com antivírus do chassi; TTL 30 min; contato mock `contato@compliance.com.br`). Pendência única: C4 (compliance sobre região `global`).

### 2026-10-28 — Cards de segmento com normas a classificar

Cada card mostra o total de normas e o selo "N a classificar" (normas a classificar do segmento hoje), sem a porcentagem de variação. Dados saem do HTML para `src/assets/data/dashboard-segments.json`, lidos por `SegmentCardsService` com validação (`validateSegmentCards`); cards gerados por `*ngFor`. Novos specs do componente e do serviço.

### 2026-10-28 — Filtro da página pelo selo "a classificar"

Clicar no selo "N a classificar" de um card filtra a página pelas normas a classificar daquele segmento: card em destaque e demais esmaecidos, Tráfego só com a linha "Normas a Classificar · <segmento>", legenda e faixa de aviso com "Remover filtro". Clique fora, Esc ou o mesmo selo removem. A Cascata não é filtrada (sem recorte por segmento). `TRAFFIC_SERIES` ganhou `id` e `segmentIndex`; `renderMainChart(highlight, toClassifyFocus)`. `.wrapper` com `overflow-x: clip` contra rolagem lateral causada por tooltips do Chart.js. 10 testes novos.

### 2026-10-28 — Tráfego: Gráfico/Tabela e exportação Excel

Card Tráfego ganhou "Forma de exibição" Gráfico | Tabela (como na Cascata). A tabela mostra uma linha por período, uma coluna por série (seguindo destaque da legenda e filtro por segmento) e totais. Na visão Tabela, "Exportar Excel" gera o `.xlsx` no navegador com `exceljs` carregado sob demanda (`src/app/core/export/xlsx-export.ts`, ADR-017). O botão de download sem função foi removido. 5 testes novos, incluindo leitura de volta da planilha gerada.

### 2026-10-28 — Chat com componente próprio em vez do `deep-chat`

Somente documentação. Para não depender de instalação/Nexus no ambiente corporativo, o widget será um componente Angular próprio (`src/app/chat/`, sem dependência nova). `docs/planejamento/chat-deep-chat.md` foi substituído por `docs/planejamento/chat-widget.md` (comparação e motivo do descarte, arquitetura, catálogo `M01`–`M27` com situação v1/opcional/descartada, passos `P0`–`P8`); `agente-normas-gemini.md` e `docs/README.md` atualizados.

### 2026-10-28 — Marca "Agenda Normativa" com o símbolo da instituição

Nome do produto passa a "Agenda Normativa" (título da aba, rodapé, planilhas). Na sidebar: símbolo oficial da instituição (do SVG público do site institucional, em branco, recortado ao desenho) + "Agenda" regular e "Normativa" em negrito, em HTML/Inter. Favicon com o símbolo. Logos `logo.svg`/`logo-narrow.svg` removidos. R10 e ADR-018 registram a decisão.

### 2026-10-28 — Etapa E0 concluída: ADR-010, ADR-011 e ADR-012

Somente documentação. `ADR-010` (widget de chat próprio, sem `deep-chat`), `ADR-011` (orquestração do agente no BFF Atlante Java/Spring Boot; front só consome `/conforme/chat/*`) e `ADR-012` (Gemini via Vertex AI `global`, perfis `gemini-3.8-flash`/`gemini-3.1-pro`, saída estruturada, `LlmGateway` mock/Vertex, dados restritos aos registros enviados). Índice em `docs/decisoes/README.md`; `P0` e `E0` marcados como concluídos nos planos.

### 2026-10-28 — Etapa E1 e passo P1 do chat

- **E1 (contrato e especificação):** `docs/contratos-de-dados.md` ganhou a seção 9 (endpoints `/conforme/chat/*`, interfaces, erros por código, limites, estrutura do mock, receita de adaptação); `docs/planejamento/agente-backend-spec.md` (pacotes, propriedades `agente.*`, validações, sessão, motor de fluxo, `LlmGateway` mock/Vertex, esquemas de saída, prompts v1, repositório de normas, proteções da área não logada, testes e ordem de implementação); mock `src/assets/data/chat-fluxo-mock.json` (fluxo com menu, texto livre, upload, recusa, esclarecimento e contato `contato@compliance.com.br`, dados fictícios).
- **P1 (base do widget):** `src/app/chat/chat.model.ts`, `chat-texts.ts`, `markdown/safe-markdown.ts` e specs (16 testes: escape de HTML, links só `http(s)`, listas, NUL, entrada hostil longa, texto de todos os códigos de erro). Sem dependência nova. Glossário: seção "Assistente (chat flutuante)".
- Arquivos: `src/app/chat/**`, `src/assets/data/chat-fluxo-mock.json`, `docs/contratos-de-dados.md`, `docs/arquitetura.md`, `docs/glossario-ptbr.md`, `docs/planejamento/*`, `docs/README.md`.

### 2026-10-28 — Passo P2: botão flutuante e painel do assistente

- `ChatModule` e `ChatWidgetComponent` (`<app-chat-widget>`) no fim do `default-layout`: botão flutuante e painel `role="dialog"` com foco gerenciado (entra no painel ao abrir; `Esc` ou fechar devolve ao botão), `aria-expanded`/`aria-controls`/rótulos pt-BR; o painel mostra só o aviso de uso (conversa vem em P3–P5).
- `src/scss/_chat-widget.scss` (importado em `styles.scss`): tokens nos dois temas, tela cheia abaixo de 576 px, `prefers-reduced-motion`, oculto na impressão. Ícone `cilX` adicionado a `icon-subset.ts`.
- 7 testes novos (suíte: 145 passando); build de produção ok, sem dependência nova.
- Arquivos: `src/app/chat/chat.module.ts`, `src/app/chat/chat-widget/*`, `src/scss/_chat-widget.scss`, `src/scss/styles.scss`, `src/app/app.module.ts`, `src/app/containers/default-layout/default-layout.component.html`, `src/app/icons/icon-subset.ts`, `docs/arquitetura.md`, `docs/design-system.md`.

### 2026-10-28 — Passo P3: lista de mensagens do assistente

- `ChatMessagesComponent` (`<app-chat-messages>`) dentro do painel: bolhas por papel, markdown pelo pipe `safeMarkdown`, "Fontes", perguntas de esclarecimento, contatos (e-mail vira `mailto:`), arquivo anexado com tamanho e veredito, indicador "digitando", rolagem automática (não puxa quem rolou para cima, sempre desce nas mensagens do próprio usuário) e botão "Ir para o fim". Textos novos no glossário.
- Token `--app-chat-accent` (claro `#223ad2`, escuro `#5568e7`) em `_brand.scss`/`_theme-dark.scss`: o azul primário do tema escuro dava 3,64:1 com texto branco; o novo dá 4,65:1. Botão, cabeçalho e bolhas do usuário o usam. Carimbo `tokens-hash` atualizado.
- Temporário: `chat-demo-messages.ts` alimenta o painel até o P5.
- Testes: 13 novos (suíte do chat: 36). Verificado no navegador em 1440 px (claro e escuro) e 375 px.
- Arquivos: `src/app/chat/chat-messages/*`, `chat-format.ts` (+ spec), `chat-demo-messages.ts`, `markdown/safe-markdown.pipe.ts`, `chat-texts.ts`, `chat.module.ts`, `chat-widget/*`, `src/scss/_chat-widget.scss`, `_brand.scss`, `_theme-dark.scss`, `docs/design-system.md`, `docs/arquitetura.md`, `docs/glossario-ptbr.md`.

### 2026-10-28 — Passo P4: entrada do assistente (opções, texto, envio e upload)

- `ChatInputComponent` (`<app-chat-input>`): opções do passo como botões; campo de texto com Enter/Shift+Enter, contador, limite de 1.000 caracteres, bloqueio de vazio, "Enviar" que vira "Parar" enquanto o agente responde; upload com "Anexar documento", dica e erros; "Recomeçar" no fim e "Voltar" quando o passo permite; foco no passo novo. `ChatModule` passou a importar `ReactiveFormsModule`.
- `chat-file.ts`: validação do documento no navegador (extensão do passo, tipo, vazio, limite do passo, 20 MB por conversa); o BFF repete. Textos novos no glossário e em `chat-texts.ts`.
- Temporário: `chat-demo-nodes.ts` e manipuladores marcados `TEMPORARY` em `ChatWidgetComponent` simulam um fluxo curto (escolher, escrever com "Parar", anexar, voltar, recomeçar); o P5 os substitui pelo serviço de sessão e apaga junto com `chat-demo-messages.ts`.
- Testes: 32 novos (suíte: 190 passando); build de produção ok. Verificado com Chrome headless em 1440 px (claro, escuro, limite de caracteres, upload com erro).
- Arquivos: `src/app/chat/chat-input/*`, `chat-file.ts` (+ spec), `chat-demo-nodes.ts`, `chat-texts.ts`, `chat.module.ts`, `chat-widget/*`, `src/scss/_chat-widget.scss`, `docs/arquitetura.md`, `docs/design-system.md`, `docs/glossario-ptbr.md`.

### 2026-10-28 — Sidebar sem botão de recolher e sem selos "NOVO"

Removido o `<c-sidebar-toggler>` (seta no rodapé da sidebar) e desativado o modo estreito/`unfoldable`: estilos `.sidebar-narrow*`, `.sidebar-toggler` e variáveis `$sidebar-toggler-*`/`--cui-sidebar-toggler-bg` apagados. A sidebar continua abrindo/fechando pelo botão de menu do header em telas pequenas. Removidos também os selos "NOVO" dos itens Triagent e Widgets (`badge` em `_nav.ts`) e o estilo `.nav-link .badge`.

### 2026-10-28 — Passo P5: conversa de ponta a ponta (API, sessão e mock) e remoção do aviso de uso

- **Pedido do usuário:** removido o texto "Não envie dados pessoais. A conversa é apagada ao fim da sessão." do painel (texto, estilo, teste, glossário e documentos). O BFF continua sem pedir dados pessoais nem registrar texto de usuário.
- `ApiService` (`core/services/api.service.ts`): serviço base da R4 (`get`, `post`, `delete`), sem `withCredentials`.
- `ChatApiService` (`/conforme/chat/*` ou mock, conforme `environment.chatMock`; novo campo `chatMock: true` nos dois environments), `ChatMockServer` (simula o BFF com `chat-fluxo-mock.json`: sessões, validações, 3 rodadas, contatos, 3 recusas de assunto, limite de 20 MB), `ChatRequestError` (falha única com código).
- `ChatSessionService`: estado da conversa em memória; opções, texto, documento, voltar, recomeçar, "Parar" e "Tentar novamente"; efeito de digitação palavra por palavra (desligado com `prefers-reduced-motion`); sessão expirada avisa e abre outra.
- Widget ligado ao serviço (abre a sessão na primeira abertura, mantém a conversa ao fechar; botão "Recomeçar" no cabeçalho); `ChatMessagesComponent` ganhou `retryable`/`retry`. Removidos `chat-demo-messages.ts` e `chat-demo-nodes.ts`.
- `chat-fluxo-mock.json`: acrescentados `maxOutOfScope` e `fallbacks.outOfScopeLimit`.
- Bug achado pelos testes: uma resposta síncrona deixava uma assinatura já fechada como "requisição pendente", e "Parar" deixava de funcionar durante a digitação.
- Testes: suíte com 245 passando (os de chat rodam contra o mock real servido pelo Karma). Verificado com Chrome headless em 1440 px (menu, resposta com fontes, 3 rodadas com contato; claro e escuro).
- Arquivos: `src/app/core/services/api.service.ts`, `src/app/chat/*` (serviços, mock server, widget, mensagens), `src/environments/*`, `src/assets/data/chat-fluxo-mock.json`, `src/scss/_chat-widget.scss`, `docs/arquitetura.md`, `docs/contratos-de-dados.md`, `docs/dependencias-e-ambiente.md`, `docs/portabilidade.md`, `docs/design-system.md`, `docs/glossario-ptbr.md`.

### 2026-10-28 — Passos P7 e P8: expandir, minimizar, "Recomeçar" condicionado, verificação final e fechamento

- **Pedidos do usuário:** (1) **expandir** o chat na horizontal mantendo-o flutuante (botão no cabeçalho; some abaixo de 576 px); (2) **minimizar** e voltar à conversa depois: o painel só é escondido (mensagens, rascunho e sessão continuam), o botão flutuante mostra uma bolinha verde e o rótulo "Abrir assistente (conversa em andamento)", e ao voltar o foco vai ao campo e a rolagem ao fim; o botão X virou "Minimizar assistente" e `Esc` minimiza; (3) **"Recomeçar" só habilita depois de qualquer interação do usuário** (opção, texto, documento ou "Voltar"; volta a desabilitar ao recomeçar). A imagem anexada ao pedido não chegou ao chat; a implementação seguiu a descrição.
- `ChatState.hasInteraction`, `ChatInputComponent.focus()`, widget com DOM persistente (`[hidden]`), novos textos no glossário, ícones `cilMinus`, `cilResizeWidth`, `cilFullscreenExit`. Catálogo do chat: M28 (minimizar) e M29 (expandir).
- **P7 (verificação):** 259 testes (a suíte do widget foi reescrita); build de produção ok; auditoria de contraste no navegador (20 pares, todos aprovados nos dois temas; achou e corrigiu `source-id` em 3,91:1 por causa de `opacity`); capturas em 1440 e 768 px (normal e expandido) e 375 px (iframe, pois o headless tem largura mínima de 500 px), claro e escuro; teclado coberto por testes (foco na abertura, `Esc`, retorno do foco, Enter e Shift+Enter).
- **P8 (fechamento R13):** `arquitetura.md`, `design-system.md`, `portabilidade.md` (item 12 do checklist pós-porte), `contratos-de-dados.md` (já atualizado no P5), planos (`chat-widget.md` P7 e P8 concluídos; `agente-normas-gemini.md` E2 concluída), inventário regenerado e `docs:check` passando.
- Arquivos: `src/app/chat/chat-widget/*`, `chat-session.service.ts` (+ spec), `chat-input/chat-input.component.ts` (+ spec), `chat-texts.ts`, `src/app/icons/icon-subset.ts`, `src/scss/_chat-widget.scss`, `docs/*`.

### 2026-10-28 — Passo P6: feedback "Útil / Não útil" (M10)

- Sob respostas (`answer`) e "não encontrei" sem contatos (`not_in_data`), o assistente pergunta "Esta resposta ajudou?" com os botões "Útil" e "Não útil" (ícones de polegar). Uma nota por resposta; depois aparece "Obrigado pelo feedback." Não aparece enquanto a resposta ainda é digitada, nem em recusas, perguntas de esclarecimento, erros ou no encaminhamento à equipe.
- Contrato novo: `POST /conforme/chat/feedback` com `{ sessionId, rating, sourceIds }` (204). Leva só a nota e as fontes mostradas, nunca texto da conversa. `ChatApiService.sendFeedback`, `ChatMockServer.handleFeedback`/`feedbackLog`, `ChatSessionService.rateMessage` (otimista; se falhar, desfaz o agradecimento e mostra "Não foi possível enviar o feedback. Tente novamente."; funciona com o agente ocupado; não habilita "Recomeçar").
- `canRateMessage` em `chat.model.ts`; textos e ícones novos (`cilThumbUp`, `cilThumbDown`); estilos `.chat-feedback*`. Spec do backend e contrato atualizados.
- Testes: 278 passando; build ok; conferido em Chrome headless (claro e escuro; botões, agradecimento).
- Arquivos: `src/app/chat/chat.model.ts` (+ spec), `chat-mock-server.ts`, `chat-api.service.ts`, `chat-session.service.ts`, `chat-messages/*`, `chat-widget/*`, `chat-texts.ts`, `src/app/icons/icon-subset.ts`, `src/scss/_chat-widget.scss`, `docs/*`.

### 2026-10-28 — Card "E-mails de sugestão de classificação"

A tabela "Usuários" (sobra do template) deu lugar a `<app-emails-chart>`: e-mails enviados e normas sugeridas por período, em barras empilhadas por segmento (cores do Tráfego), com indicadores (e-mails, normas e "N distintas", média por e-mail), filtro de período próprio, Gráfico/Tabela, "Exportar Excel", legenda clicável, lista "Últimos e-mails" (até 5, abre as normas) e recorte pelo selo "a classificar". Mock `src/assets/data/dashboard-emails.json` (176 e-mails de 2021) com `validateEmails` e `aggregateEmails`. Removidos `IUser`, `AvatarModule` e `src/assets/img/avatars/`. Estilos da lista em `src/scss/_emails-card.scss`. ADR-019 e plano em `docs/planejamento/emails-sugestao-classificacao.md`.

### 2026-10-28 — Ajustes: feedback em uma linha e "Voltar" como sugestão na conversa

- **Feedback dentro do balão:** a pergunta "Esta resposta ajudou?" e os botões "Útil" / "Não útil" ficam na mesma linha (botões compactos de 28 px; a pergunta usa o espaço que sobra e só quebra em duas linhas, nunca empurra os botões para baixo). Conferido a 375 e 1440 px, claro e escuro.
- **Sugestões na conversa:** as opções do passo, "Voltar" (último, em estilo discreto com seta) e "Recomeçar" (passo final) agora aparecem como sugestões de resposta dentro da lista de mensagens, depois da última mensagem, e somem enquanto o agente responde. O botão "Voltar" que ficava embaixo da caixa de texto foi removido, e a área de entrada só aparece em passos de texto ou de envio de documento. O foco vai à primeira sugestão só em passos sem caixa de texto.
- Código: `chat-suggestions.ts` (+ spec), `ChatSuggestion` em `chat.model.ts`, `ChatMessagesComponent` (`suggestions`, `focusSuggestions`, `suggestionPick`, `focusSuggestion()`), `ChatInputComponent` sem `optionPick`/`back`/`restart`, widget ligado às sugestões, estilos `.chat-suggestions`, `.chat-chip`, `.chat-feedback*`. Glossário: "Sugestões de resposta".
- Arquivos: `src/app/chat/*`, `src/scss/_chat-widget.scss`, `docs/arquitetura.md`, `docs/design-system.md`, `docs/planejamento/chat-widget.md`, `docs/glossario-ptbr.md`.

### 2026-10-28 — Chat: sugestão "Encerrar"

Ao lado direito de "Voltar" entre as sugestões de resposta, nova sugestão "Encerrar" (`ChatSuggestion.kind: 'end'`, `.chat-chip--end`): `ChatSessionService.end()` cancela pedidos em andamento, apaga mensagens e estado da conversa, avisa o BFF (`endSession`) e minimiza o painel; ao reabrir, começa uma sessão limpa. `restart()` passou a usar `end()` + `start()`. Termo no glossário; specs de sugestões, serviço e widget atualizados.

### 2026-10-28 — "Encerrar" com despedida, sem fechar o chat

- **Pedido do usuário:** ao encerrar, o assistente se despede mas **não fecha o chat**; fechar ou minimizar fica por conta do usuário. Isso muda o "Encerrar" da entrada anterior (que apagava a conversa e minimizava o painel).
- Agora "Encerrar" (sugestão por último, disponível depois da primeira interação e em qualquer passo que não seja o final de encerramento, inclusive no passo "Posso ajudar em mais alguma coisa?"): apaga a sessão no BFF (`DELETE`, com arquivos e histórico), **mantém a conversa na tela**, acrescenta a despedida "Foi um prazer ajudar! Obrigado por usar o assistente de normas. Se precisar de algo mais, é só recomeçar a conversa. Até logo!" (digitada palavra por palavra, sem pedido de feedback) e passa a um passo local em que só resta "Recomeçar". O painel continua aberto; reabrir depois de minimizar não abre sessão nova; "Recomeçar" começa uma conversa limpa.
- O passo final do mock (`fim`) virou menu com "Nova consulta" (volta ao início sem apagar a conversa). Uma versão intermediária desta mudança tinha um nó `encerrado` e despedidas escritas no servidor mock; foi desfeita para haver um único mecanismo (no front), e a spec do backend ficou só com o `DELETE`.
- Código: `buildChatSuggestions(node, busy, hasInteraction)`, `ChatSessionService.end()` (+ `closed`), `CHAT_TEXTS.farewell`, widget sem `minimize()` ao encerrar. Catálogo: M31 (substitui o antigo M28 "Encerrar conversa", cujo número colidia com "Minimizar e voltar").
- Testes: 330 passando; conferido no navegador (antes e depois de "Encerrar", inclusive após uma resposta com fontes).
- Arquivos: `src/app/chat/chat-session.service.ts`, `chat-suggestions.ts`, `chat-texts.ts`, `chat-widget/*`, `chat-mock-server.ts`, `src/assets/data/chat-fluxo-mock.json` (+ specs), `docs/*`.

### 2026-10-28 — Rodapé no estilo do site institucional

Rodapé passa de linha única clara para faixa azul-marinho (`$footer-bg: $brand-navy`; escuro `#0c1238`) com o logotipo da instituição (`src/assets/img/brand/brand-logo-white.svg`, copiado do SVG do rodapé do site, `viewBox` recortado), "Copyright © {ano} todos os direitos reservados" e razão social, CNPJ e endereço das duas entidades legais (constante no código; em 2026-11-04 passou à configuração de ambiente). Logo e dados centralizados (logo acima, texto abaixo). Sem selos de segurança e sem links; menor e mais discreto que o do site. Tokens de rodapé alterados (carimbo `tokens-hash` atualizado). Spec do rodapé ampliado.

### 2026-10-28 — Blocos movidos: Cascata e "Tráfego e vendas" para Scalation; cards de redes sociais para Início

Sem alterar o conteúdo. **Scalation**: a pasta `waterfall/` (componente, serviço, modelo, derivação, formatação e specs) passou de `views/dashboard/` para `views/scalation/` (só os imports relativos de `period/` e `period-filter/` mudaram) e o HTML do card "Tráfego e vendas" foi copiado inalterado para `scalation.component.html`. `PeriodFilterComponent` ganhou `PeriodFilterModule`, importado por `DashboardModule` e `ScalationModule`. **Início**: `<app-widgets-brand [withCharts]="true">` (cards de redes sociais) agora está em `home.component.html`; `HomeModule` importa `WidgetsModule` (depois de `HomeRoutingModule`). A faixa do filtro por segmento deixou de citar a Cascata. O Triagent fica com cards de segmento, Tráfego e E-mails de sugestão. Specs de Início e Scalation ampliados.

### 2026-10-28 — Ajustes no card de e-mails de sugestão

- **Filtro de período:** só Dia e Mês (Ano removido). `<app-period-filter>` ganhou `@Input() periods` (padrão Dia/Mês/Ano; Tráfego e Cascata não mudam).
- **Legenda:** passou para baixo do gráfico (e da tabela), centralizada.
- **Últimos e-mails:** data sem hora, só o segmento (sem "Sugestões de classificação —") e o número de normas (sem destinatários).
- **Normas do e-mail:** tabela com Órgão, Tipo, Número, Tema, "Aplicável ao segmento?" (Sim/Parcialmente/Não), Área e Diretoria; região com rolagem lateral, barra fina, coluna Órgão fixa; cabe sem rolagem a 1440px. Celular: data e normas na primeira linha, segmento abaixo.
- **Dados:** `SuggestedNorma` com `orgao`, `tipo`, `numero`, `area`, `diretoria` (validados em `validateEmails`); mock regerado pelo mesmo script, com os mesmos 176 e-mails e 812 normas. `APPLICABILITY_LABELS` no modelo.
- Testes: 335 passando. Arquivos: `views/dashboard/emails/*`, `period-filter/period-filter.component.*`, `src/scss/_emails-card.scss`, `src/assets/data/dashboard-emails.json`, `docs/*`.

### 2026-10-28 — Cards de segmento no Scalation (tom petróleo)

Cópia dos cards de segmento do Triagent no topo do Scalation, com o mesmo template, fonte, formato e dados, em outra cor da paleta da marca: degradê petróleo `--brand-highlight-high` (`$brand-cyan-high` #0a5c71) até `--brand-sidebar` (navy). Sem duplicar código: `WidgetsDropdownComponent` ganhou `@Input() tone` (`'primary'` | `'petrol'`) e `@Input() filterable`; no Scalation o selo "N a classificar" é só texto, porque a página não tem filtro por segmento. Fundo e cor do selo ativo viraram variáveis (`--stat-bg`, `--stat-accent`); os estilos do selo foram para `src/scss/_stat-card.scss` (global) para o componente não passar de 2kb. Token novo `--brand-highlight-high` em `_brand.scss` (carimbo `tokens-hash` atualizado). `ScalationModule` importa `WidgetsModule`. Conferido claro e escuro a 1440px; 336 testes passando.

### 2026-10-28 — Card "Classificação das normas" no Triagent

Abaixo do Tráfego, novo `<app-classification-card>` com dois painéis e um filtro de período (Dia/Mês), sensível ao filtro de segmento da página: **Aplicabilidade ao banco** (total classificado, Aplicáveis e Não aplicáveis com quantidade e %, barra 100% horizontal) e **Temas das normas aplicáveis** (barras horizontais ordenadas, 10 temas + "Outros temas" só em texto). Escolha dos gráficos e cores em ADR-013. Barras em HTML (valores sempre escritos; claro/escuro por CSS). Tokens novos `--app-applicable` (azul-marinho) e `--app-not-applicable` (cinza), carimbo `tokens-hash` atualizado. Mock `src/assets/data/dashboard-classificacao.json` (573 normas de 2021) gerado por `scripts/gen-classificacao.js`; `validateClassification`, `aggregateClassification`, `ClassificationDataService`. Estilos em `src/scss/_classification-card.scss`. A faixa do filtro por segmento passa a citar a classificação das normas. 352 testes passando; conferido 1440/375px, claro e escuro.

### 2026-10-28 — Classificação das normas em dois cards, guiados pelo Tráfego

A pedido do usuário, o card único "Classificação das normas" (com filtro próprio e barra 100%) virou **dois cards separados, sem filtros**: `<app-applicability-chart>` "Aplicabilidade ao banco" (pizza em anel, total no centro, legenda com quantidade e %) e `<app-themes-list>` "Temas das normas aplicáveis" (barras horizontais, 10 temas + "Outros temas"). Os dois seguem o período/datas do Tráfego (`trafficPeriod`, `trafficBounds`) e o filtro de segmento da página. Base comum `ClassificationViewBase`; removido `classification-card.component.*`. ADR-013 revisado. 353 testes passando; conferido 1440/375px, claro e escuro.

### 2026-10-28 — Filtro cruzado entre a pizza e a lista de temas

Clicar numa fatia (ou item da legenda) da pizza "Aplicabilidade ao banco" filtra a lista de temas por aquela classe (com "Não aplicáveis", o card vira "Temas das normas não aplicáveis", barras em cinza); clicar num tema filtra a pizza para aquele tema (subtítulo "· Tema: <tema>"). Segundo clique remove; faixa "Filtro: ... · Remover filtro" acima dos cards; Esc ou clique fora limpa todos os filtros da página (controles com `data-page-filter`/`data-segment-filter` não limpam os demais). Valor escolhido destacado (fatia deslocada, item/linha `is-active`) e os outros esmaecidos. `aggregateClassification` passou a receber `{ segment, theme, themesOf }` e devolve `themesTotal`; `withAlpha` foi para `views/dashboard/chart-colors.ts` (usado também pelos e-mails). Tráfego, cards de segmento e e-mails não são afetados (não têm tema nem aplicabilidade nos dados). 360 testes passando; conferido claro e escuro clicando nos valores.

### 2026-10-28 — Tabela Analítica

Nova seção abaixo dos e-mails, `<app-analytic-table>` (`views/dashboard/analytic-table/`): uma linha por norma classificada, com todos os filtros da página aplicados (período do Tráfego, selo "a classificar", fatia da pizza, tema da lista) e pílulas "Filtros aplicados". Colunas Data da classificação, Órgão, Tipo, Número, Tema, Segmento, Aplicável ao banco?, Área, Diretoria; ordenação por coluna, 15 linhas por página, rolagem lateral; "Exportar Excel" com todas as linhas filtradas na ordem da tela (`tabela-analitica-<início>-a-<fim>[...].xlsx`). Mock de classificação ganhou `orgao`, `tipo`, `numero`, `area`, `diretoria` (regerado, mesmas 573 normas); `validateClassification` cobra os campos; `filterClassified` extraído e usado pelos cards e pela tabela. Faixas de filtro passam a citar a Tabela Analítica. ADR-014. 367 testes passando; conferido 1440/375px, claro e escuro, com e sem filtros.

### 2026-10-28 — Mapeamento de dados tela × produção (regra R13)

Novo `docs/mapeamento-de-dados.md` para ligar a página Triagent aos dados de produção sem mudar a tela: por bloco (cards de segmento, Tráfego, pizza/temas/Tabela Analítica, e-mails), cada campo do front com formato, exemplo, onde aparece e a coluna "Coluna em produção" para o usuário preencher; domínios (segmento, sugestão de classificação, aplicável ao banco); o que o front calcula; receita do adaptador (`PRODUCTION_COLUMNS` + `fromProduction`); conferência "reflete exatamente"; registro de ligações. R13 atualizada em `CLAUDE.md` e `.cursor/rules/regras-projeto.mdc` (linha nova na tabela + parágrafo de ligação). `docs:check` ganhou a verificação 7 (carimbo `data-contract-hash` das interfaces de dados e todo campo mapeado), testada com um campo novo. README de `docs/`, contratos e checklist da portabilidade apontam para o documento. ADR-015.

### 2026-10-28 — Gráficos do Triagent renomeados

Títulos na tela (pedido do usuário): "Tráfego" → **Normativos Recebidos**; "Aplicabilidade ao banco" → **Normas Aplicáveis**; "Temas das normas aplicáveis" → **Assunto das Normas Aplicáveis** (com a fatia "Não aplicáveis": "Assunto das Normas Não Aplicáveis"); "E-mails de sugestão de classificação" → **Fluxo de e-mail - Triagem**. Junto: faixas de filtro, rótulo do filtro ("Período dos normativos recebidos"), legenda e legenda oculta da tabela, "Sem filtros" da Tabela Analítica e exportações (aba/título "Normativos Recebidos"/"Normativos recebidos por segmento", arquivos `normativos-recebidos-...xlsx` e `fluxo-email-triagem-...xlsx`). Identificadores do código não mudam (R10). "Tema" continua nas colunas e filtros; "Tráfego e vendas" (Scalation) não muda. Documentação viva (arquitetura, contratos, design-system, glossário com tabela de nomes, mapeamento, portabilidade, dependências, README) atualizada; changelog e ADRs anteriores mantidos como histórico. Correção: `docs/arquitetura.md` estava com o conteúdo duplicado por uma edição anterior (expansão de `` $` `` em um `String.replace` do script auxiliar); reconstruído com uma cópia. 368 testes passando.

### 2026-10-28 — Trilha do chat: três opções novas no menu inicial

Menu `inicio` do mock (`src/assets/data/chat-fluxo-mock.json`) ganhou **Normas a Classificar**, **Listar normas não aderentes** e **Listar próximas normas que irão entrar em vigor**, além de "Consultar uma norma" e "Avaliar um documento". Cada uma leva a um nó de menu com lista de demonstração (`normas_classificar`, `normas_nao_aderentes`, `normas_proximas_vigencia`), com "Voltar" e "Nova consulta". Contrato (`contratos-de-dados.md` §9) e exemplo do plano do agente atualizados; o BFF real devolverá as listas a partir da base de normas.

### 2026-10-28 — Chat: ajustes pós-desenvolvimento (Parar no servidor, despedida digitada, respostas prontas, listas, opcionais)

Decisões do usuário: região `global` é definitiva (C4 fechado; ADR-012 atualizada, nada de trocar `VERTEX_LOCATION`); limites de requisição e cotas da área pública saem do projeto, que roda em ambiente controlado (`agente-normas-gemini.md` 6.6 e `agente-backend-spec.md` §3/§10 reescritos; `RATE_LIMITED` fica só como leitura de um 429 do chassi).
- **Parar no servidor (M32):** todo pedido leva `requestId`; "Tentar novamente" repete o mesmo id (o BFF devolve a resposta guardada em vez de agir duas vezes); "Parar" chama `POST /conforme/chat/cancelar` e assume o passo devolvido, salvo se o usuário já agiu. Mock guarda 20 respostas por sessão e desfaz o último pedido.
- **Despedida digitada (M34):** `chat-farewell.ts`; "tchau", "obrigado, era só isso", "pode encerrar" encerram como "Encerrar", sem ir ao BFF; "obrigado, e qual o prazo?" segue como pergunta.
- **Respostas prontas (M33):** `quickReplies` em `need_more_info` viram sugestões; escolher envia o texto. Mock: duas respostas que levam a uma resposta com fontes.
- **Listas de normas (M35):** `normList` (título, observação, segmento, data) com filtro por segmento; as três opções novas do menu usam listas do mock (`lists` em `chat-fluxo-mock.json`); spec do BFF com filtros e colunas novas do `NormasRepository`.
- **Opcionais:** M06 ícone do assistente, M07 nomes visíveis no início de cada sequência, M11 mensagens `transient` (aviso de sessão expirada), M18 `ChatLauncherService` + `action: 'ask'` (botão "Perguntar ao assistente" por linha da Tabela Analítica, fora do Excel), M21/M22 `messages$`/`errors$` sem conteúdo.
- Correção de doc: a linha do widget em `arquitetura.md` ainda dizia que "Encerrar" minimiza o painel.
Arquivos: `src/app/chat/*` (modelo, sessão, API, mock, sugestões, mensagens, widget, `chat-farewell.ts`, `chat-launcher.service.ts`), `src/scss/_chat-widget.scss`, `analytic-table.component.*`, `src/scss/_analytic-table.scss`, `src/assets/data/chat-fluxo-mock.json`; docs: contratos §9, arquitetura §6.4.2/§11, plano do widget (M01–M35), plano e spec do agente, ADR-012, glossário.

### 2026-10-28 — Base de conhecimento de componentes (páginas de demo fora do app)

Grupos **Tema**, **Componentes** e **Extras** saíram do menu, das rotas, do build e dos testes e foram para `base-de-conhecimento/` (`git mv`, histórico preservado): `paginas/{theme,base,buttons,forms,charts,icons,notifications,pages}`, `paginas/widgets/{widgets,widgets-e,widgets-routing.module.ts}`, `docs-components/` (antigo `src/components`), `estilos/_examples.scss`, cópias do menu e das rotas antigas. Inclui Entrar, Cadastro, 404 e 500 (escolha do usuário); rota desconhecida volta ao Início. App: `_nav.ts` só com Início/Triagent/Scalation/Analítico; `app-routing.module.ts` sem rotas de demo; `WidgetsModule` só com `widgets-dropdown`, `widgets-brand` e `ChartSample`; sem alias `@docs-components` e sem `@import "examples"`. `base-de-conhecimento/README.md`: quando consultar (sem se limitar a ela), receita de reaproveitamento, catálogo por página e restauração. Regra **R14** nos dois arquivos de regras; `docs:check` verificação 8. ADR-016. Build ok; 366 testes passando.

### 2026-10-28 — Chat: listas de normas em tabela e extração em Excel

Quando a lista do assistente tem mais de uma norma, aparece "Ver em formato tabela" (alterna com "Ver em formato lista"). Na tabela (Norma, Observação, Segmento e a data da lista, rolável para o lado dentro da bolha), "Extrair em Excel" baixa as linhas visíveis, com o filtro de segmento aplicado: planilha "Normas", título da lista, subtítulo com segmento, quantidade e data de geração, arquivo `assistente-<lista>[-<segmento>]-<aaaa-mm-dd>.xlsx` (exceljs no navegador, R9; mesmo `downloadXlsx` da Tabela Analítica). Datas das listas passam a ser formatadas por `formatNormDate` (`Intl`, UTC). Arquivos: `src/app/chat/chat-norms-export.ts` (+ spec), `chat-messages.component.*`, `chat-texts.ts`, `src/scss/_chat-widget.scss`; docs: arquitetura §11, contratos §9, plano do widget (M35), glossário.

### 2026-10-28 — Menu lateral com subitens por seção

Menu preenchido com o que as páginas já têm: título **"Painéis"**; **Triagent** e **Scalation** viram grupos cujos subitens levam à seção da página (Triagent: Normas por segmento, Normativos Recebidos, Normas Aplicáveis, Assunto das Normas Aplicáveis, Fluxo de e-mail - Triagem, Tabela Analítica; Scalation: Normas por segmento, Cascata do resultado, Tráfego e vendas). URLs com âncora (`/#/triagent#tabela-analitica`), destaque só do subitem escolhido. `SectionScrollService` (`core/navigation/section-scroll.ts`) realinha a seção enquanto os cards carregam; roteador com `scrollOffset` do header fixo. Bug do CoreUI 4 (grupo não reconhece URL com âncora) contornado com `dropdownMode="none"` + `openActiveGroup()` no layout. Clique no menu não limpa os filtros do Triagent. Ids das seções e `.page-section` nos templates. Specs: `_nav.spec.ts`, `section-scroll.spec.ts`, `default-layout.component.spec.ts`, clique no menu no spec do Triagent. Conferido no navegador (clique e link direto). 382 testes passando.

### 2026-10-28 — Chat: assistente renomeado para "Agente da Agenda"

Pedido do usuário. Muda o título do painel, o nome nas mensagens e todos os rótulos (`CHAT_TEXTS`: "Abrir/Minimizar/Expandir/Reduzir Agente da Agenda", "O Agente da Agenda está digitando", "Conversa com o Agente da Agenda", "Mensagem para o Agente da Agenda", despedida "Obrigado por usar o Agente da Agenda."), o botão e a coluna oculta da Tabela Analítica ("Perguntar ao Agente da Agenda sobre…"), a boas-vindas do mock ("Sou o Agente da Agenda, especialista em normas regulatórias do setor financeiro"), o subtítulo e o nome do Excel das listas (`agente-da-agenda-<lista>…xlsx`) e os prompts do BFF na spec. A despedida digitada aceita o nome ("Obrigado, Agente da Agenda!"). Identificadores do código não mudam (R10). Glossário, arquitetura, design system, portabilidade e planos atualizados.

### 2026-10-28 — Chat: nome ao lado do ícone do botão flutuante

Pedido do usuário ("ao lado do ícone, de forma assimétrica e minimalista"). O botão redondo virou um balão com ícone + "Agente da **Agenda**" ("Agenda" em negrito, como a marca "Agenda **Normativa**"): três cantos arredondados e o inferior direito quase reto, apontando para o canto da tela. O nome visível é `aria-hidden` (já está no `aria-label` "Abrir Agente da Agenda", então o nome acessível contém o texto visível). Arquivos: `chat-widget.component.{html,ts}` (+ spec), `src/scss/_chat-widget.scss`; docs: design-system, arquitetura, glossário.

### 2026-10-28 — Chat: saudação pelo horário e pelo nome do usuário

Pedido do usuário ("boa tarde, vinicius", produção em Windows). A primeira mensagem do agente começa com "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (18h–4h), pelo relógio do computador do usuário, e com o primeiro nome quando a sessão traz `user.firstName` ("Boa tarde, Vinicius! Sou o Agente da Agenda…"); sem nome, "Boa tarde! …". O navegador não lê o login do Windows: o nome vem do BFF, que identifica o usuário pela autenticação integrada do Windows e busca o `givenName` no AD (spec 5.1); sem isso, o BFF omite `user`. O front descarta logins, e-mails e números (`greetingName`). Contrato: `ChatUser`, `ChatSessionReply.user`, boas-vindas do BFF sem saudação. Mock: `user: { firstName: "Vinicius" }` e boas-vindas sem "Olá!". Arquivos: `src/app/chat/chat-greeting.ts` (+ spec), `chat-session.service.ts`, `chat.model.ts`, `chat-texts.ts`, `chat-mock-server.ts`, `src/assets/data/chat-fluxo-mock.json`; docs: contratos §9, spec do BFF 5.1, arquitetura, portabilidade 4.4.1, glossário.

### 2026-10-28 — Chat: colar print, vários documentos (PDF e Word) e tabela de resultados

Pedido do usuário. No passo "Avaliar um documento": **colar (Ctrl+V)** em qualquer ponto do painel envia o print copiado (Ferramenta de Captura / Print Screen do Windows; nome `imagem-colada-<hora>.png`) ou os arquivos copiados no Explorer; colar texto continua normal. **Vários arquivos** de uma vez (até 5, seleção múltipla) e **Word** (DOC, DOCX) além de PDF e imagens; tipo vazio é aceito (Windows sem Office) e o BFF confere os bytes. Arquivos inválidos são listados um a um e os válidos seguem juntos em um pedido (`files` repetido; resposta `files[]` na ordem). Com mais de um, a resposta traz a tabela "Resultado da avaliação dos documentos" e **"Extrair em Excel"** (`agente-da-agenda-avaliacao-documentos-<data>.xlsx`). Contrato: `ChatFileReply.files`, `ChatMessage.files`, `fileResults`, `CHAT_LIMITS.maxFilesPerSend`. BFF: validação de DOC/DOCX por magic bytes (sem macro), texto extraído com Apache POI, um julgamento por arquivo. Mock: identificadores por arquivo, resumo para vários, passo seguinte "O que deseja saber sobre o que foi enviado?". Arquivos: `chat-file.ts`, `chat-file-results.ts` (novos testes), `chat-input.component.*`, `chat-widget.component.*`, `chat-session.service.ts`, `chat-api.service.ts`, `chat-mock-server.ts`, `chat-messages.component.*`, `chat.model.ts`, `chat-texts.ts`, `_chat-widget.scss`, `chat-fluxo-mock.json`; docs: contratos §9, spec do BFF, plano do agente, plano do widget (M27, M36, M37), arquitetura, glossário.

### 2026-10-28 — Documentação de porte do chat (R13)

Pedido do usuário: `docs/portabilidade.md` 4.4.1 reescrita como guia completo do chat no ambiente de destino (produção em Windows): o que copiar e onde ligar (módulo, estilos, ícones, Tabela Analítica, exceljs), troca do mock pelo BFF passo a passo e o que cada função exige do BFF, identificação do usuário e saudação no Windows (relógio local; nome via autenticação integrada Kerberos/NTLM no Apache ou no chassi, `givenName` do AD, políticas `AuthServerAllowlist`, cuidado com cabeçalho repassado), documentos no Windows (colar print, arquivos do Explorer, vários arquivos, Word, limites `LimitRequestBody`/`max-request-size`, Apache POI), exportações Excel e políticas de download, pontos de adaptação, roteiro de verificação e tabela de problemas comuns. Seção 2 e cenário B (3.2) passam a listar os arquivos do chat; item 12 do checklist aponta para a verificação em Windows.

### 2026-10-28 — Planilhas com as mesmas cores nos dois temas; conector da cascata documentado

Pedido do usuário (problemas achados ao documentar a identidade visual no template). **Excel:** `xlsx-export.ts` lia
`--brand-primary` e `--brand-content-low` do tema ativo; exportando no tema escuro, o cabeçalho saía `#6b7cf0` e o subtítulo `#a9b1bd`
sobre a planilha branca. Agora usa os tokens novos `--app-export-accent` (`#223ad2`) e `--app-export-muted` (`#4b5968`), definidos
só no `:root` claro de `_brand.scss` (sem valor escuro, de propósito); vale para todas as exportações (Normativos Recebidos,
e-mails, Tabela Analítica, listas do chat). Teste de regressão: planilha gerada com `data-theme="dark"` mantém as cores claras.
**Doc:** `design-system.md` dizia `#a9b1bd` para `--app-wf-connector` no escuro; o SCSS usa `#4b5968` (`$brand-content-low`), corrigido.
Arquivos: `src/scss/_brand.scss`, `src/app/core/export/xlsx-export.ts` (+ spec); docs: design-system (tabela 2.2, 6.4.1, carimbo),
arquitetura, ADR-017, inventário.

### 2026-10-28 — Início: visão geral dos segmentos no lugar dos cards de redes sociais

Pedido do usuário ("remova os logos de redes sociais do início, altere por outros indicando os 4 segmentos"). Os cards
Facebook/Twitter/LinkedIn/Eventos do template saíram do Início; no lugar, `<app-segment-overview>`: um `c-widget-stat-d` por
segmento (Atacado, Corporativo, Plataforma, Varejo) com ícone e nome do segmento num cabeçalho na cor dele nos gráficos
(`--app-series-1..4` sob camada preta de 25%, branco ≥ 4,9:1 nos dois temas), minigráfico de área com o `trend` e os números
"normas" e "a classificar" em pt-BR. Mesmos dados dos cards do Triagent (`SegmentCardsService`); sem filtro. `widgets-brand`
foi para `base-de-conhecimento/paginas/widgets/widgets-brand/` (`git mv`), onde a página de demo de widgets o importa.
Arquivos: `src/app/views/widgets/segment-overview/*` (novo, + spec), `widgets.module.ts`, `views/home/home.component.{html,ts,spec.ts}`;
docs: arquitetura (tabela de páginas, diagrama, 6.1.0, testes), design-system (6.2.2, exceções), contratos, mapeamento (3.1),
portabilidade, glossário, ADR-016, README da base, inventário.

## 2026-11-03

### Regras para qualquer IA: `AGENTS.md` + `.rules/`, verificação mecânica e documentação corrigida

Pedido do usuário (auditoria de regras com foco em Cursor e Antigravity). Decisões em `.rules/decisoes.md` (D-001 a D-005).
- **Fonte única:** `AGENTS.md` (entrada para qualquer IA: projeto, comandos, índice de uma linha por regra, mínimo inline,
  pronto, "não fazer") e `.rules/` (`projeto.md` com o texto vinculante R1–R14, `escopo.md`, `testes.md`, `erros.md`,
  `decisoes.md`, `check.sh`). `CLAUDE.md` virou `@AGENTS.md` + `@.rules/projeto.md`; `.cursor/rules/regras-projeto.mdc`,
  `GEMINI.md` e `.agents/rules/regras.md` (Antigravity) são ponteiros; `.agents/workflows/pronto.md` = `/pronto`.
- **Regras:** R4 aponta para o `ApiService` existente; R7 passa a exigir `npm run verify`; R10 ganhou as exceções de cor
  literal permitidas (fallback de token em canvas, `theme-color`) e perdeu o histórico da marca (está em ADR-018); R11
  registra pedido mantido em `.rules/decisoes.md`; R13 cobre regras e a frase defasada.
- **Registro de erros:** E-001 a E-005 retroativos (Excel no tema escuro, valor de token no doc, grupo do menu com âncora,
  ADR duplicado, regras copiadas e docs defasados).
- **ADR renumerados:** `ADR-010` exportação Excel → ADR-017, `ADR-011` marca → ADR-018, `ADR-012` card de e-mails →
  ADR-019; referências corrigidas e índice em ordem.
- **`docs:check`:** inventário por carimbo `inventory-hash` (antes, data do arquivo); novas verificações 9 (ponteiros),
  10 (ADR), 11 (R10), 12 (frases vigiadas, `STALE_CLAIMS`) e 13 (R3 e R6). Testadas com quebras propositais.
- **Comandos:** `.nvmrc` (18); scripts `build:prod`, `test:ci`, `rules:check`, `hooks:install`, `verify`; hooks
  `.githooks/pre-commit` (`docs:check` + `rules:check`) e `.githooks/commit-msg` (correção exige entrada em `erros.md` e teste).
- **Docs corrigidos:** portabilidade (serviço base, cards de segmento, menu, páginas, specs, imports de estilo, logos, seção
  4.13 e seção 6 para Cursor/Antigravity/Claude Code), arquitetura (raiz, convenções, pontos de atenção), dependências
  (scripts, `.nvmrc`, `allowedCommonJsDependencies`, comandos, exemplo de CI), README, `docs/README.md`, glossário, base de
  conhecimento.
- Verificado: `npm run verify` verde (docs, regras, build de produção, 414 testes).
Arquivos: `AGENTS.md`, `.rules/*`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/**`, `.githooks/*`,
`.nvmrc`, `package.json`, `scripts/docs-check.js`, `scripts/docs-inventory.js`, `docs/**`, `README.md`, `base-de-conhecimento/README.md`.

### Regra R15: ficha por página para portar uma página só (ADR-020)

Pedido do usuário (porte de uma página isolada com de-para alinhado). Nova regra R15 em `.rules/projeto.md` (índice em
`AGENTS.md`) e pasta `docs/paginas/`: `README.md` (modelo e o que o check cobra), `inicio.md`, `triagent.md`, `scalation.md`,
`analitico.md`. Cada ficha: identidade, blocos com entradas/saídas, dados consumidos campo a campo (`Interface.campo`,
formato, exemplo, onde aparece, origem), calculado no front, de-para (aponta para `mapeamento-de-dados.md`), o que copiar
para portar só aquela página, verificação. `docs/mapeamento-de-dados.md` ganhou §3.5 (Cascata) e `waterfall.model.ts`
entrou em `DATA_CONTRACT_FILES`. `docs:check` verificação 14: descobre por `import` os arquivos de dados e mocks de cada
página, exige cada um e cada campo na ficha, carimbo `page-data-hash`. Portabilidade: cenário C (3.3). R13 ganhou a linha
da ficha. Arquivos: `.rules/projeto.md`, `AGENTS.md`, `docs/paginas/*`, `docs/mapeamento-de-dados.md`, `docs/decisoes/ADR-020-*.md`
(+ índice), `docs/README.md`, `docs/portabilidade.md`, `docs/arquitetura.md`, `scripts/docs-check.js`.

### Revisão das regras e fichas (mesmo dia)

- Fichas: Fluxo de e-mail tem período Dia/Mês (não Mês/Ano); a cascata não importa `dashboard-charts-data.ts` (chega só por
  `segment-overview`); `steps` não exige 1ª e última `total` (a 1ª `total` define a base; regra da última não é validada).
- Ponteiros: `CLAUDE.md` e `.cursor/rules/regras-projeto.mdc` importam só `AGENTS.md` (D-006): 129 linhas sempre carregadas em
  vez de 266; `.rules/` é aberto a pedido. Portabilidade §4.7 e §6 atualizados.
- `.rules/projeto.md` R14 encurtada (folga abaixo de 12 kB); comentários do `docs-check.js` renumerados (11 R10, 12 frases vigiadas, 13 R3/R6).

### Plano de migração para Node 22, Angular 20.3 e CoreUI 5.5 (aprovado; execução não iniciada)
Ambiente de destino exige Node `^22.12.0` e npm `>= 10.9.4`. Angular 15 só suporta Node 14/16/18; `npm run verify` passou em
Node 22.23 + npm 11.21 numa cópia limpa (414 testes), mas com `EBADENGINE` e sem suporte oficial.
- `docs/planejamento/migracao-node22-angular20.md`: alvo e premissas, mapa de versões (lista para o Nexus), estratégia de
  salto único 15 → 20 com o clone v5.5 como fonte da infraestrutura (em vez de `ng update` em cadeia), mudanças de
  arquitetura (bootstrap standalone, `routes.ts`, layout do clone com as customizações da marca, `ThemeService` + `data-coreui-theme`,
  Chart.js 4, `@angular/build`), regras depois da migração (R1, R2, R3, R10, R13), fases `P0`–`P7`, riscos, perguntas.
- Nada de código alterado; `docs/README.md` indexa o plano.
- Aprovação (2026-11-03): alvo Angular 20.3; template (P6) nesta entrega; `jspdf` e `jspdf-autotable` removidos na P1;
  nenhum commit feito pelo agente. Respostas registradas na §9 do plano.

### Migração para Node 22, Angular 20.3 e CoreUI 5.5 (ADR-021)
Executado o plano `docs/planejamento/migracao-node22-angular20.md` (P1–P5 na landing; P6 no template). Nada commitado.
- **Versões:** Node `^22.12.0` (`.nvmrc` 22), npm `>= 10.9.4`, Angular 20.3.14, CLI/`@angular/build` 20.3.12, TypeScript 5.9.3,
  zone.js 0.15.1, `@coreui/angular` 5.5.24, `@coreui/coreui` 5.4.3, `@coreui/chartjs` 4.1.0, Chart.js 4.5.1, `ngx-scrollbar`
  13.0.3; tudo exato, lock regenerado. Saíram `ngx-perfect-scrollbar`, `jspdf`, `jspdf-autotable`.
- **Infraestrutura:** builders `@angular/build` (`application`, `dev-server`, `karma`, `extract-i18n`), `tsconfig` do v5.5
  (`module: preserve`, `moduleResolution: bundler`, `isolatedModules`), Karma sem `src/test.ts`, aviso Sass `import`
  silenciado, `exceljs` em `allowedCommonJsDependencies`.
- **Código:** standalone (schematics oficiais) com `bootstrapApplication` + `app.config.ts`, `app.routes.ts` e
  `views/<pasta>/routes.ts`; NgModules removidos (app, rotas, páginas, `WidgetsModule`, `PeriodFilterModule`, `ChatModule`);
  `@if`/`@for` em todos os templates; Chart.js 4 (`border.display`, peso numérico); TS 5.9 (iterador no mock do chat);
  `ChartSample` e diretivas sem uso removidas.
- **Visual:** layout do produto ajustado ao CoreUI 5 para medir igual ao Angular 15 (sidebar `colorScheme="dark"` com
  `ng-scrollbar`, variáveis em `.sidebar .sidebar-nav`, caixa de 4rem da marca, alturas do header, posição do ícone,
  níveis de texto `--cui-secondary/tertiary/emphasis-color`). `ThemeService` grava também `data-coreui-theme` (+1 teste).
  Comparação pixel a pixel das 4 páginas em 1440 px e 375 px, claro e escuro: sobram suavização das linhas do Chart.js 4 e
  1 px na tabela analítica.
- **Testes:** 416 verdes (414 + `data-coreui-theme` + E-006). Specs alteradas só na API (D-007).
- **Correção (E-006):** no CoreUI 5 o grupo do menu fechava ao clicar num subitem (a classe `show` deixou de refletir o
  estado); `openActiveGroup` passa a ler a altura da lista. Achado no smoke funcional comparando com o build Angular 15
  (link de seção, subitem do menu, troca de tema, menu no celular, chat, Excel).
- **Regras e docs:** R1, R2, R3, R10, R12, R13, R14, R15, D-007 e gotchas; `docs:check` acusa padrões antigos no código e a
  pilha antiga nos docs; arquitetura, dependências, portabilidade (cenário B agora Angular 20), design system, fichas
  (Scalation sem a dependência indireta de `dashboard-charts-data.ts`, carimbo novo), base de conhecimento (demos 4.x
  marcadas como histórico), ADR-021 e revisões de ADR-001, ADR-003, ADR-016.

### Estudo: a mesma landing em Streamlit (`docs/planejamento/streamlit/`)
Avaliação pedida pelo produto, sem alterar código nem decisão: dá para replicar a Agenda Normativa em Streamlit e com
que fidelidade. Só acrescenta documentação.
- `README.md` (resposta curta, o que foi verificado, cenários A–D e recomendação), `01-diagnostico-landing.md` (inventário
  bloco a bloco do que existe: tema, layout, páginas, dados, interações, textos, chat, infraestrutura),
  `02-de-para-streamlit.md` (cada elemento → técnica em Streamlit 1.66 → fidelidade; o que não tem equivalente),
  `03-guia-implementacao.md` (ambiente, `config.toml`, CSS em seletores estáveis, navegação, cards, filtros, Plotly,
  Components v2, tabela, Excel, chat, dados reais, autenticação, hospedagem, testes, ordem de construção),
  `04-cenarios-e-riscos.md` (esforço, riscos, segurança, comparação Angular × Streamlit).
- `poc/`: protótipo em Streamlit 1.66.1 (quatro páginas, dois temas com os tokens da marca, Inter local, menu com subitens
  por seção, filtros cruzados, Excel com openpyxl, chat flutuante com o mock do agente) e `poc/checks/` (capturas e testes
  de interação por Chrome headless). Lê os JSON de `src/assets/data/` quando não tem `data/` própria. Fora do build e
  do `npm run verify`.
- Conclusão registrada: fidelidade de 85–90 % no cenário com CSS + Components v2; a condição decisiva é hospedar um
  processo Python com WebSocket (o Apache estático atual não serve). Nenhum ADR criado: a decisão é do produto.
- Arquivos: `docs/planejamento/streamlit/**`, `docs/README.md` (linha de `planejamento/`), este changelog.

## 2026-11-04

### Estudo Streamlit: hospedagem confirmada pela arquitetura corporativa
Resposta da arquitetura incorporada ao estudo: o ambiente corporativo hospeda o processo Python com WebSocket em dois caminhos
homologados, Databricks Apps (HML-1143, esteira PEPD-1491 via Databricks Asset Bundles, SSO/OIDC, Unity Catalog) e GKE
corporativo (genaigke / Plataforma Titan, padrão N3 "Streamlit e Titan Frontend Sample", BFF Spring Boot), com Apache
`mod_proxy_wstunnel` como padrão quando exposto por Apache e segregação DES/UAT/PRD.
- `README.md`: a restrição de hospedagem deixa de existir; recomendação passa a depender do caminho e dos pontos em aberto.
- `03-guia-implementacao.md`: §3.1, §3.13 (identidade por caminho, configuração por ambiente) e §3.14 (Databricks Apps via
  DAB, GKE/Titan a partir do sample, Apache) reescritos; Cloud Run removido (não está entre os homologados).
- `04-cenarios-e-riscos.md`: §4.1 e §4.7 atualizados; risco de hospedagem resolvido; novo risco "versão do Streamlit no
  destino"; §4.8 com as sete perguntas em aberto e como obtê-las; §4.9 com a versão mínima de cada API usada no
  protótipo (1.39 a 1.66, conferida nas notas de versão oficiais).
- Arquivos: `docs/planejamento/streamlit/README.md`, `03-guia-implementacao.md`, `04-cenarios-e-riscos.md`, este changelog.

### Estudo Streamlit: respostas da arquitetura às sete perguntas
Seis das sete perguntas de `04-cenarios-e-riscos.md` §4.8 respondidas (fotos da resposta, transcritas): o parecer
HML-1143 veda IA generativa, LLM, RAG e agentes no Databricks Apps, logo o caminho deste produto é **GKE/Titan** (padrão
N3, BFF Atlante como única fonte de dados); Python 3.11 homologado; repositório base `streamlit-sgen-base-ia-sample`
(Cookiecutter da Plataforma Titan) com `Dockerfile`, `config.toml`, `settings.yaml`, `k8s/`, `src/`, `requirements.txt`;
identidade por cabeçalhos do Ingress (`x-user-id`, `x-user-email` ou JWT) e cookie do BFF, sem `st.login`; no Databricks
Apps a referência de Streamlit é 1.38/1.40 e no GKE/Titan a versão acompanha `pylib-sgen-base-genai-framework` 0.20.0.
- `README.md`, `03-guia-implementacao.md` (§3.1, §3.2, §3.12, §3.13, §3.14) e `04-cenarios-e-riscos.md` (§4.1, §4.4,
  §4.7, §4.8 com as respostas) atualizados; `poc/README.md` aponta para o sample.
- Por regra do projeto, hosts internos, URLs e e-mails da resposta não entraram nos documentos.
- Arquivos: `docs/planejamento/streamlit/README.md`, `03-guia-implementacao.md`, `04-cenarios-e-riscos.md`,
  `poc/README.md`, este changelog.

### Estudo Streamlit: versão homologada (1.38–1.40) e configuração por ambiente
Segunda resposta da arquitetura: Streamlit homologado `>= 1.38.0` (faixa 1.38.x–1.40.x, compatível com
`pylib-sgen-base-genai-framework` 0.20.0 e Python 3.11), instalação só pelo mirror PyPI do Nexus; `config.toml` do sample
(`[server]` porta 8501, `address 0.0.0.0`, `headless`, `enableCORS = false`); ambientes por ConfigMaps/Secrets
(`ENVIRONMENT`, `AUTH_MODE` em `settings.yaml`: `none`/`mock` em DES, `gateway`/`oidc` em UAT e PRD, `BFF_BASE_URL` por
ambiente; esteira `develop` → `release/*` via Jenkins/GHA → tag com GMUD no Portal Tech; Databricks Apps por targets do
DAB).
- Introspecção feita em Streamlit 1.40.2 / Python 3.11.15: faltam `[theme.light]`/`[theme.dark]`, `[theme.sidebar]`,
  `fontFaces`, `st.context.theme`, `st.html(unsafe_allow_javascript)`, Components v2, `st.pagination`, `ButtonColumn`,
  `page_link(query_params)`, `container(horizontal)`, `required` nos chips, `plotly_chart(config/height)`.
- `04-cenarios-e-riscos.md`: §4.4 risco da versão confirmado; §4.8 todas as perguntas respondidas; **§4.10 plano de
  compatibilidade** (substituto e custo por recurso; tema escuro parcial; +5–8 dias). `03-guia-implementacao.md`: §3.1,
  §3.13 (tabela DES/UAT/PRD) e **§3.17 adaptações para 1.40** em 11 passos. `README.md` atualizado.
- Arquivos: `docs/planejamento/streamlit/README.md`, `03-guia-implementacao.md`, `04-cenarios-e-riscos.md`, este changelog.

### Relatório de adequação aos padrões corporativos (`docs/planejamento/adequacao-padroes-corporativos.md`)
Respostas da arquitetura corporativa às perguntas sobre a estrutura (três lotes, 2026-11-04) consolidadas num relatório único
por fases, para aprovação; nenhum código alterado.
- Padrões confirmados: roteamento por hash reprovado (caminho limpo + fallback), imagem web corporativa não-root
  (Apache 2.4 ou Nginx), `baseHref`/config por ambiente, Jest e Cypress/Playwright, BFF `sboot-<sigla>-base-bff-<nome>`
  contract-first, endpoints `/api/v1/<recurso-plural>`, erros RFC 7807, paginação obrigatória e payload ~10 MB, cookie
  de sessão `HttpOnly` + 401 com redirecionamento, orquestração em pods Python (`genaigke`), Vertex AI em `us-central1`
  ou `southamerica-east1` com Gemini 2.5, quarentena com antivírus, sessão no Redis, dados do PDBD pela Ilha de Dados,
  `.npmrc` obrigatório.
- 19 lacunas (L01–L19), fases 0–9, decisões D1–D10 e 10 perguntas restantes. Revisões previstas: ADR-001, ADR-011,
  ADR-012, ADR-017 (ADR-023 na Fase 0).
- Arquivos: `docs/planejamento/adequacao-padroes-corporativos.md`, `docs/README.md`, este changelog.


### Identidade de marca neutra (`brand-*`)
Identificadores e textos de marca passaram a nomes convencionais em todo o projeto (código, estilos, nomes de arquivo,
specs, docs, protótipo Streamlit, entradas antigas deste changelog e dos ADR): prefixos `brand-*`; dados legais por
configuração de ambiente.
- Prefixo de marca convencional: `$brand-*`, `--brand-*`, `.brand-*`; marca da sidebar em `.brand-lockup`, `.brand-mark`,
  `.brand-name`. Carimbo `tokens-hash` atualizado; `docs/inventario.md` regenerado.
- Arquivos de marca renomeados sem mudar o desenho: `src/assets/img/brand/brand-mark.svg`, `brand-mark-white.svg`,
  `brand-logo-white.svg` (e as cópias do `poc/` Streamlit); `aria-label` "Símbolo da instituição".
- Rodapé: razões sociais, CNPJ e endereços saíram do código. `FooterEntity` + `InjectionToken` `FOOTER_ENTITIES`
  (`[]` em `app.config.ts`; a lista virá da configuração de execução `assets/env.json`); bloco legal só com lista não
  vazia; `alt` "Logotipo da instituição"; copyright mantido. Spec do rodapé reescrito (lista vazia e preenchida com dados
  fictícios); spec novo do layout confere marca da sidebar e rodapé.
- Renomeados: ADR-004 (`ADR-004-paleta-da-marca-com-series-validadas-para-daltonismo.md`), ADR-018
  (`ADR-018-marca-agenda-normativa-com-simbolo.md`), `docs/planejamento/adequacao-padroes-corporativos.md`; o ADR previsto
  na Fase 0 desse relatório é o ADR-023.
- Texto: "a instituição", "corporativo", "da marca"; exemplos de login `DOMINIO\vfreire`, e-mail `empresa.com.br`, padrão
  de domínio interno `DOMINIO_INTERNO`. R15 compactada em uma frase (seções no modelo de `docs/paginas/README.md`) para
  `.rules/projeto.md` caber no limite de 12.000 caracteres.
- Arquivos: `.rules/projeto.md` (R10, R15), `.rules/decisoes.md`, `AGENTS.md`, `scripts/docs-check.js`,
  `src/app/containers/default-layout/**`, `src/app/app.config.ts`, `src/scss/*.scss`, `src/assets/img/brand/*`, `docs/**`,
  `base-de-conhecimento/README.md`, specs (`widgets-dropdown`, `chat-greeting`, `default-footer`, `default-layout`).

### Fase 3 — rotas limpas, Nginx e configuração em tempo de execução
Fase 3 do relatório `docs/planejamento/adequacao-padroes-corporativos.md` (lacunas L01, L02, L03; decisões D2, D3, D10;
ADR-023). Nenhuma funcionalidade nova; telas, textos e dados iguais.
- Rotas limpas: `withHashLocation()` saiu de `app.config.ts` (`PathLocationStrategy`, padrão); `<base href="/">`. Rolagem
  por âncora mantida (`withInMemoryScrolling`, deslocamento do header, `SectionScrollService`); subitens do menu viram
  `/triagent#tabela-analitica`; `/dashboard` → `/triagent` e `**` → Início mantidos; `openActiveGroup` (E-006) inalterado.
- Configuração em tempo de execução: `src/assets/env.json` (`apiBase`, `loginUrl`, `chatMock`, `footerEntities`, padrões de
  dev sem host) lido antes do bootstrap por `RuntimeConfigService` (`src/app/core/config/`, `provideAppInitializer`, por
  `HttpBackend`); falha → padrões seguros + um `console.error`; chave de tipo errado volta ao padrão. `ApiService` usa
  `apiBase`; `CHAT_API_CONFIG` lê `chatMock`; `FOOTER_ENTITIES` vem de `footerEntities` (`FooterEntity` movido para
  `runtime-config.service.ts`, reexportado pelo rodapé). `environment*.ts` só com `production`. O nome antigo do campo de base
  da API saiu do projeto inteiro (código, R4, R6, docs, entrada de 2026-10-27 deste changelog, planos).
- Imagem: `Dockerfile` multi-stage (`ARG NODE_IMAGE` Node 22, `npm ci --ignore-scripts=false`, `npm run build:prod`;
  `ARG WEB_IMAGE` Nginx não-root, porta 8080; padrões públicos só provisórios), `.dockerignore`, `nginx/default.conf`
  (`try_files $uri $uri/ /index.html`, `index.html` e `assets/env.json` sem cache, bundles com hash `immutable`, 404 real em
  `/assets/` e `/api/`, gzip) e `nginx/security-headers.conf` (`X-Content-Type-Options`, `Referrer-Policy`, CSP mínima com
  `frame-ancestors 'self'`). `/api/*` fica com o Ingress.
- `docs:check`: verificação 2 e 6 pedem `apiBase` (e `env.json` na portabilidade); R3 acusa `withHashLocation`/
  `HashLocationStrategy`; frase vigiada para endereços com hash e `<base href="./">` fora de `planejamento/`.
- Testes novos: `app.routing.spec.ts` (sobe o `appConfig` real com `MockPlatformLocation`: URL limpa abre a página, fragmento
  rola até a seção, endereço desconhecido → Início, `/dashboard`, `href` dos subitens sem `#/`, grupo do menu aberto por link
  direto; falham com `withHashLocation()`), `runtime-config.service.spec.ts`, e casos novos em `api.service.spec.ts` e
  `chat-api.service.spec.ts`. Specs existentes só trocaram o nome do campo de base da API (asserções iguais).
- Arquivos: `src/app/app.config.ts`, `src/index.html`, `src/app/core/config/*`, `src/assets/env.json`,
  `src/app/core/services/api.service*.ts`, `src/app/chat/chat-api.service*.ts`, `src/environments/*`,
  `src/app/containers/default-layout/default-footer/default-footer.component.ts`, comentários de 4 serviços de dados,
  `src/app/app.routing.spec.ts`, `Dockerfile`, `.dockerignore`, `nginx/*`, `scripts/docs-check.js`, `AGENTS.md`,
  `.rules/projeto.md` (R3, R4, R6), `README.md`, `docs/README.md`, `docs/arquitetura.md`, `docs/portabilidade.md`,
  `docs/dependencias-e-ambiente.md`, `docs/paginas/*.md`, `docs/inventario.md` (regenerado), este changelog.

### Fase 2 — contrato v1 e especificações
Fases 0 e 2 do plano de adequação (`docs/planejamento/adequacao-padroes-corporativos.md`), só documentos; nenhum código
mudou nesta entrega.
- ADR-023 "Adequação aos padrões corporativos": D1–D10 com a opção recomendada, exceto a região do Vertex AI, que fica
  `global` (risco de residência registrado); suposições S1–S10 no lugar das perguntas sem resposta (nome do BFF
  `sboot-<sigla>-base-bff-agenda-normativa`, `loginUrl`, CSRF `XSRF-TOKEN`/`X-XSRF-TOKEN`, `GET /api/v1/usuarios/me`,
  antivírus assíncrono com 202 + consulta, envelope Spring, parecer de compliance pendente com fluxo de documentos
  desligável, Gemini 2.5 Pro/Flash, `dvry_corp_compliance` pela API da Ilha de Dados, erros por família `VAL-`/`AUT-`/
  `NEG-`/`SIS-`). Notas de revisão em ADR-001 (hash), ADR-011 (orquestração, substituído), ADR-012 (modelos e cliente) e
  ADR-017 (Excel até 5.000 linhas); índice atualizado.
- `docs/contratos/openapi-agenda-normativa-v1.yaml`: OpenAPI 3.0.3 contract-first para o time do BFF, servidor `/api/v1`,
  cookie de sessão + `X-XSRF-TOKEN`, Problem Details (`timestamp`, `status`, `code`, `message`, `details[]`, `traceId`)
  em todo 4xx/5xx, 401 documentado; recursos `segmentos`, `normativos-recebidos`, `normas-classificadas` (+ `resumo`),
  `emails-sugestao` (+ `resumo`), `cascatas-resultado`, `usuarios/me` e `agente/sessoes` (mensagens, arquivos com 202 e
  consulta por arquivo, avaliações, cancelamentos); limites de 10 MB por requisição e 9 MB por envio de arquivos. Validado
  com PyYAML, com o esquema oficial do OpenAPI 3.0 e com a resolução de todos os `$ref`.
- `docs/contratos-de-dados.md` reescrito para o v1: endpoints antigo → novo, camada HTTP (`apiBase` + `/v1/...`),
  paginação, agregados, tabela de erros (status/família → constante de texto pt-BR, "código de suporte", 401 →
  `loginUrl`, 403), autenticação e sessão, chat v1 com quarentena (estados e textos pt-BR) e de-para campo a campo de todas
  as interfaces (§11).
- `docs/mapeamento-de-dados.md`: coluna "Campo v1"; colunas de produção "a confirmar em `dvry_corp_compliance`"; receita com
  os dois de-para (BFF e front); domínios com os valores v1; carimbo `data-contract-hash` mantido (interfaces não mudaram).
- `docs/planejamento/agente-backend-spec.md` v2: BFF Java 21 autentica, autoriza e encaminha `/api/v1/agente/*` com
  `Authorization: Bearer`; orquestrador Python (`genaigke` / `pylib-sgen-base-genai-framework`) com fluxo, guarda de tema,
  quarentena + antivírus + inspeção + gate, Q&A e prompts v1; chaves do Redis (Memorystore, TTL 30 min); Vertex AI `global`
  com `gemini-2.5-flash`/`gemini-2.5-pro`; normas pela Ilha de Dados; testes revistos. `agente-normas-gemini.md` alinhado
  (região, modelos, lugar do orquestrador, quarentena, revisão das decisões).
- Arquivos: `docs/decisoes/ADR-023-adequacao-aos-padroes-corporativos.md`, `docs/decisoes/ADR-001-*.md`, `ADR-011-*.md`,
  `ADR-012-*.md`, `ADR-017-*.md`, `docs/decisoes/README.md`, `docs/contratos/openapi-agenda-normativa-v1.yaml`,
  `docs/contratos-de-dados.md`, `docs/mapeamento-de-dados.md`, `docs/planejamento/agente-backend-spec.md`,
  `docs/planejamento/agente-normas-gemini.md`, `docs/planejamento/adequacao-padroes-corporativos.md` (situação e §7), este
  changelog.

### Regras locais não versionadas
- `.rules/local.md` entra no `.gitignore` (seção "Regras locais (não versionadas)"); quando existe, é vinculante como as
  demais (linha em `AGENTS.md`, junto da lista de `.rules/`). Regras, decisões e ADRs versionados seguem sua numeração.
- `scripts/docs-check.js` aplica a verificação de regra local só quando `.rules/local.md` existe e define a regra; o índice
  do `AGENTS.md` continua exigido só para as regras de `.rules/projeto.md`.
- Textos de marca descritos de forma neutra (prefixos `brand-*`; dados legais por configuração de ambiente) em
  `docs/arquitetura.md`, `docs/glossario-ptbr.md`, `docs/design-system.md`, `docs/portabilidade.md`,
  `docs/dependencias-e-ambiente.md`, `docs/planejamento/streamlit/01-diagnostico-landing.md` e entradas antigas deste
  changelog. ADR-002: a base da API é `apiBase` da configuração de execução `assets/env.json`.
- `docs/README.md`: `contratos/` (rascunho OpenAPI v1) e link para `planejamento/adequacao-padroes-corporativos.md`;
  `docs/portabilidade.md`: `.rules/local.md` só é copiado se valer no destino; `docs/inventario.md` regenerado.
- Arquivos: `.gitignore`, `AGENTS.md`, `.rules/projeto.md`, `.rules/decisoes.md`, `scripts/docs-check.js`,
  `docs/decisoes/README.md`, `docs/decisoes/ADR-002-*.md`, os documentos acima, este changelog.

### Fase 4 — camada HTTP, erros e 401
- `ApiService` passa a montar `apiBase` + `/v1` (`API_VERSION_PREFIX`) + recurso do contrato (`get('/segmentos')` →
  `/api/v1/segmentos`); novo `postMultipart`; `get`, `post` e `delete` com as mesmas assinaturas.
- `src/app/core/http/`: `apiErrorInterceptor` funcional (só para URL sob `apiBase`): falha vira `ApiProblem` (`status`,
  `code`, `traceId`, `kind`; `message` e `details` do servidor descartados); 401 → `LoginRedirectService` leva a
  `loginUrl?retorno=<endereço atual codificado>` uma vez por página (nome `retorno` é suposição até o gateway confirmar);
  403 → "Você não tem acesso a esta informação."; `provideAppHttpClient()` (interceptor + `withXsrfConfiguration`
  `XSRF-TOKEN` → `X-XSRF-TOKEN`) substitui o `provideHttpClient()` de `app.config.ts`.
- `http-error-texts.ts`: `HTTP_ERROR_TEXTS`, `SUPPORT_CODE_TEXT` ("Código de suporte: {traceId}") e `supportCodeText`.
- `UserService.firstName$()` (`GET /v1/usuarios/me` → `primeiroNome`, só em memória, '' em falha). Com `chatMock: false`
  o `ChatApiService.startSession` usa esse nome na saudação; com `chatMock: true` continua o nome do mock.
- Chat: `ChatErrorCode` e `CHAT_ERROR_TEXTS` ganham `FORBIDDEN` ("Você não tem acesso ao agente."); `toRequestError`
  entende os códigos v1 do Problem Details (tabela 9.3) e o `ApiProblem` do interceptor, mantendo os 7 códigos antigos;
  `ChatRequestError` leva o `traceId`. `VAL-004` vira `FILE_TOO_LARGE` até `SEND_TOO_LARGE` (Fase 6). Os caminhos do
  chat continuam os antigos, agora sob `/v1` (`/api/v1/conforme/chat/...`), até a Fase 6; os serviços de dados continuam
  lendo `assets/data/` (Fase 5).
- Testes novos: `api-error.interceptor.spec.ts` (401 uma vez com retorno, `&` quando `loginUrl` tem query, 403, Problem
  Details com `traceId`, rede fora, pedido fora de `apiBase`, `X-XSRF-TOKEN` em POST/DELETE e não em GET, `isApiUrl`),
  `api-problem.spec.ts`, `user.service.spec.ts`; em `chat-api.service.spec.ts`, mapeamento dos códigos v1, 403 sem corpo,
  saudação com `usuarios/me`, falha sem nome, `ApiProblem` vindo do interceptor e mock sem `usuarios/me`; em
  `api.service.spec.ts`, `postMultipart`. Ajustes em specs existentes: caminhos esperados com `/v1`
  (`api.service.spec.ts`, `base` de `chat-api.service.spec.ts`), `flush` de `usuarios/me` depois da sessão no teste
  "calls the session endpoints under apiBase" e `FORBIDDEN` na lista de códigos de `chat-texts.spec.ts`.
- Docs: `docs/arquitetura.md` (§12 camada HTTP, tabelas de pastas e testes, convenção HTTP, chat),
  `docs/contratos-de-dados.md` (notas "Fase 4" em §1.1, §2.1, §2.4, §8, §9.3 e §10), `docs/glossario-ptbr.md` (erros de
  comunicação, código de suporte, sem acesso ao agente), `docs/dependencias-e-ambiente.md` e `docs/portabilidade.md`
  (caminho `/v1` e primeiro nome por `usuarios/me`), `docs/inventario.md` regenerado.

### Fase 7 — npmrc, E2E e esteira (ADR-023, L14–L16, D8 a)

- `.npmrc` versionado (raiz e `e2e/`), sem host nem credencial: `registry=${NPM_REGISTRY}`, fallback
  `registry${NPM_REGISTRY?}=https://registry.npmjs.org/` e `always-auth=true`. Medido dentro do projeto: npm 11.21.1
  sem a variável → registry público (`npm view` respondeu); com a variável → a URL dela; npm 10.8.2 sem a variável →
  `ERR_INVALID_URL` (npm 10 não tem `${VAR?}`; exportar `NPM_REGISTRY`). `${NPM_REGISTRY:-...}` não é sintaxe do npm
  (fica literal). Lock sem mudança: `resolved` reescritos pelo npm (`replace-registry-host`) ou lock regenerado no
  ambiente corporativo. Detalhes em `docs/dependencias-e-ambiente.md` 1.4.
- `Dockerfile`: `ARG NPM_REGISTRY` (padrão público, só no estágio de build) e token por segredo BuildKit `npmrc`
  opcional no `npm ci`; `.dockerignore` exclui `e2e`.
- Smoke E2E com Playwright em `e2e/` (pacote próprio: `@playwright/test` 1.64.1 e `@types/node` 22.19.1, versões
  exatas, **não instalados** aqui): as quatro páginas por URL direta e após recarregar, rota inexistente → Início,
  subitem do menu até a seção (grupo continua aberto), troca de tema, chat simulado respondendo, Excel da Tabela
  Analítica. `playwright.config.ts` com `E2E_BASE_URL` (padrão `http://localhost:4300`) e navegador opcional por
  `E2E_CHROME_BIN`/`CHROME_BIN`. Script `e2e` na raiz; `tsconfig.app.json` e `tsconfig.spec.json` excluem `e2e/**`
  (o Karma já só procura specs em `src/`). Verificado com `tsc --noEmit` e execução dos 9 testes (verdes) contra o build
  de produção, usando o Playwright 1.59.1 já presente na máquina e o Chrome do sistema.
- `Jenkinsfile` declarativo: checkout; `npm ci` e `npm run verify` na imagem Node 22 com Chromium headless (`CHROME_BIN`)
  e `grep` de hosts no `dist/`; SonarQube e Veracode como placeholders; imagem com `NODE_IMAGE`/`WEB_IMAGE`/
  `NPM_REGISTRY`; `develop` → DES + E2E contra `E2E_BASE_URL_DES`, `release/*` → UAT, tag + GMUD → PRD (sem
  reconstruir a imagem). Credenciais e variáveis só no Jenkins (lista em `docs/dependencias-e-ambiente.md` 6).
- Docs: `docs/dependencias-e-ambiente.md` (1.3, 1.4, 1.5, 2, 5, 6, 7), `docs/portabilidade.md` (1, 1.2, 1.3, 2, 3.1,
  4.1, 4.6, 4.8, checklist item 15), `README.md`, `docs/inventario.md` regenerado.

### Fase 6 — chat no contrato v1 e quarentena

- `ChatApiService` no contrato v1 (`/v1/agente/sessoes`, `DELETE .../{sessaoId}`, `.../mensagens`, `.../arquivos`,
  `.../arquivos/{arquivoId}`, `.../avaliacoes`, `.../cancelamentos`); os caminhos `/conforme/chat/*` saíram do código.
  Interfaces v1 escritas à mão e adaptadores puros em `src/app/chat/chat-v1-adapters.ts` (D9; valor fora de domínio lança
  `ChatContractError`, que cita só o campo). `ApiService` ganhou `getResponse` e `postMultipartResponse` (resposta com
  cabeçalhos, para o `Retry-After`).
- Quarentena (S5): envio multipart (`passoId`, `requisicaoId`, `arquivos`) → 202 → "Verificando o documento..." no anexo
  e numa nota transitória do registro `aria-live` → consulta de cada arquivo a cada 2 s ou `Retry-After` (1–10 s) até
  `APROVADO`/`REJEITADO` e a `resposta` do envio. Prazo de 2 minutos (`cancelamentos` + `FILE_CHECK_TIMEOUT`), 404 =
  sessão expirada, 3 falhas seguidas = indisponível; "Parar", "Recomeçar" e "Encerrar" param as consultas. Recusa da
  quarentena mostra o motivo em pt-BR no anexo e "Recusado na verificação de segurança" na tabela de documentos.
- Limites: 9 MB somados por envio (D4) validados na entrada do chat (`SEND_TOO_LARGE`; o limite por arquivo cai junto);
  20 MB por conversa e regras por arquivo mantidos; `VAL-004` e 413 sem corpo → `SEND_TOO_LARGE`. Códigos e textos novos
  em `chat-texts.ts`: `SEND_TOO_LARGE`, `FILE_REJECTED_UNSAFE`, `FILE_CHECK_FAILED`, `FILE_CONTENT_NOT_SUPPORTED`,
  `FILE_CHECK_TIMEOUT`, `CHAT_TEXTS.fileChecking`/`fileCheckingMany`/`fileQuarantined`; `FILE_TOO_LARGE` e a dica de
  envio passaram a citar 9 MB por envio.
- "Código de suporte: <traceId>" sob a mensagem de erro do chat quando a resposta trouxe `traceId` (D6;
  `CHAT_SUPPORT_CODE_LABEL` derivado de `SUPPORT_CODE_TEXT`), valor selecionável.
- Mock (`chatMock: true`): quarentena simulada de 1,5 s depois da latência (`MOCK_FILE_CHECK_MS`, trocável por
  `mockFileCheckMs` nos testes) e antivírus falso por nome de arquivo (`fileScenarios.quarantine`: "virus", "senha",
  "macro"...); o restante do mock não mudou e ele continua no modelo interno.
- Testes: adaptadores, caminho/método/corpo de cada endpoint, consulta (aprovado, recusado, `Retry-After`, prazo,
  cancelar a inscrição, 404, falhas seguidas), 9 MB por envio, códigos novos e estados da tela. Specs ajustados só no
  que o contrato mudou: caminhos e corpos v1 em `chat-api.service.spec.ts`, `VAL-004` → `SEND_TOO_LARGE`, lista de
  códigos e texto de 9 MB em `chat-texts.spec.ts`. Smoke no navegador (build de produção, mock e BFF falso, temas claro
  e escuro, 375 px): sem erro de console.
- Docs: `docs/contratos-de-dados.md` §9, `docs/arquitetura.md` (`ApiService` e §11), `docs/glossario-ptbr.md`,
  `docs/planejamento/chat-widget.md`.

### Fase 5 — paginação e agregados no servidor

Plano de adequação aos padrões corporativos, Fase 5 (L06; ADR-023, D5, D6, D9).

- Configuração de execução: `dataMock` (`RuntimeConfig`, `DEFAULT_RUNTIME_CONFIG` e `src/assets/env.json`, padrão `true`).
  `true` mantém os mocks de `src/assets/data/` com o comportamento e o visual de antes; `false` faz cada serviço de dados
  chamar o contrato v1 pelo `ApiService`: `GET /v1/segmentos`, `/v1/normativos-recebidos`, `/v1/normas-classificadas`
  (paginado) e `/resumo`, `/v1/emails-sugestao` (5 mais recentes) e `/resumo`, `/v1/cascatas-resultado`.
- Adaptadores puros, um por recurso, com spec e fixture no formato do OpenAPI (D9): `segment-cards.adapter.ts`,
  `traffic/traffic.adapter.ts`, `classification.adapter.ts`, `emails.adapter.ts`, `waterfall.adapter.ts`, domínios e
  parâmetros comuns em `views/dashboard/v1-domains.ts`; envelope de página em `core/http/api-page.ts` (`DataPage`,
  `fromSpringPage`, `localPage`, `collectPages`). Valor fora de domínio faz o bloco mostrar o erro de carga.
- Tabela Analítica: a tela guarda só a página visível; filtros, ordenação e página vão para
  `ClassificationDataService.getNormasPage` (`page`, `size=15`, `sort` da coluna + `dataClassificacao,desc` +
  `codigo,asc`, `inicio`/`fim`, `segmento`, `aplicavel`, `tema`). No mock, `pageClassified` emula a mesma página com a
  ordenação de antes (paridade testada em todas as colunas e direções).
- Pizza e lista de temas leem `getSummary` (`/resumo` com `temasDe` no v1; `aggregateClassification` no mock); o card de
  e-mails lê `getAggregate` (`/resumo` + últimos 5 no v1; `aggregateEmails` no mock); Normativos Recebidos lê
  `TrafficDataService` com `dataMock: false` (eixo y pelo maior valor; carregando e erro no lugar do gráfico) e mantém o
  mock aleatório com `true`.
- Excel da Tabela Analítica (D5): páginas de 100 pedidas em sequência até 5.000 linhas, "Buscando linhas... N de M" no
  botão, filtro novo ou saída da página cancela; acima de 5.000 não gera arquivo e mostra `EXPORT_LIMIT_TEXT` ("A tabela
  tem {total} linhas e o Excel aceita até 5.000. Refine os filtros para exportar.", `core/http/http-error-texts.ts`).
  Nome do arquivo igual (`tabela-analitica-*.xlsx`).
- Erros dos blocos (D6): `loadErrorMessage` + `<app-api-error-text>` (`core/http/`) em cards de segmento, Normativos
  Recebidos, pizza, temas, Tabela Analítica (carga e Excel), e-mails e Cascata: frase do bloco para 5xx genérico, texto
  de `HTTP_ERROR_TEXTS` para 400/403/404/429/504/rede, nada no 401, e "Código de suporte: …" quando há `traceId`.
- `ApiService.get` aceita lista em parâmetro (`sort=a&sort=b`).
- Regras: R2 (`.npmrc` só com `${NPM_REGISTRY}`, sem host nem token; `~/.npmrc` nunca alterado), R4 (`apiBase` +
  `/v1/<recurso>` do OpenAPI, listagem paginada, adaptador por recurso, `dataMock`) e R5 (cookie de sessão do BFF + XSRF;
  401 → `loginUrl`) reescritas, com as linhas do índice no `AGENTS.md`; D-004 revista (Jenkinsfile da Fase 7);
  `scripts/docs-check.js` ignora `e2e/node_modules`, `e2e/test-results` e `e2e/playwright-report`.
- Specs ajustados só na montagem, sem mudar asserção: provedor do serviço de dados nos specs da pizza, temas, Tabela
  Analítica e e-mails (`localClassificationQueries`/`localEmailQueries` sobre a mesma fixture) e `dataMock: true` nos dois
  `toEqual` da configuração de execução.
- Docs: fichas `triagent.md`, `inicio.md` e `scalation.md` (campo v1 por bloco, carimbo novo da Triagent),
  `contratos-de-dados.md` (§1, §2.2, §2.4, receitas, §10, §11 e a linha de `ChatUploadConfig.maxSendBytes` em §11.6),
  `mapeamento-de-dados.md`, `arquitetura.md`, `portabilidade.md` §4.3 e §4.4, `dependencias-e-ambiente.md`,
  `glossario-ptbr.md`, `README.md`.

### Correções pós-adequação

- Exportar Excel limpava os filtros da página (selo "a classificar", pizza, tema): `downloadXlsx` anexava o link
  temporário ao `<body>` e o clique programático dele subia até o `document:click` do Triagent, tratado como clique fora.
  O link agora é clicado sem entrar no documento (Edge e Chrome baixam do mesmo jeito); clique real fora de um controle
  de filtro continua limpando. Vale para todo download por `downloadXlsx` (Normativos Recebidos, e-mails, Tabela
  Analítica, chat). `.rules/erros.md` E-007.
- Cascata do resultado mostrava "Carregando período..." quando a carga falhava (o subtítulo vinha só de `data.period`).
  Getter `subtitle`: período dos dados quando pronto, "Carregando período..." só durante a carga, nenhum subtítulo no
  erro (nem o período da carga anterior). `.rules/erros.md` E-008.
- Testes novos: `xlsx-export.spec.ts` (o clique do download não chega aos ouvintes do `document`),
  `dashboard.component.spec.ts` (filtros mantidos depois de exportar; clique real fora ainda limpa),
  `waterfall-chart.component.spec.ts` (subtítulo na carga, pronto, erro e erro depois de um período carregado).
- Arquivos: `src/app/core/export/xlsx-export.ts`, `src/app/views/scalation/waterfall/waterfall-chart.component.{ts,html}`,
  specs acima, `docs/arquitetura.md`, `docs/paginas/scalation.md`, `.rules/erros.md`.

### Correções da revisão independente

- Configuração de execução sem mock por acidente (E-009): `defaultRuntimeConfig(production)`; no build de produção, sem
  `env.json` legível os padrões de `dataMock`/`chatMock` são `false` (blocos mostram o erro de carga, nunca dado fictício);
  no de desenvolvimento continuam `true`; o `env.json` versionado mantém os dois `true` (local e demonstração).
  `parseRuntimeConfig` registra um `console.error` sem detalhes quando o corpo não é objeto. Selo "Dados simulados" no
  header sempre que `dataMock` ou `chatMock` está ligado (`MOCK_SOURCES`, `mockSourcesText`, `.brand-mock-badge` só com
  tokens; explicação no `title` e para leitor de tela). Portabilidade §4.3: o ConfigMap de UAT/PRD define os dois `false`.
- CSP completa (E-014): `default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'
  data:; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`
  e `Permissions-Policy` (câmera, microfone, geolocalização, pagamento, USB negados). O build de produção desliga
  `inlineCritical` (o `onload` do CSS crítico seria bloqueado). Conferido no navegador com os cabeçalhos exatos: Início,
  Triagent, Scalation, Analítico, chat e Excel, claro e escuro, 1440 e 375 px, nenhuma violação.
- `gzip_types` com `text/javascript`.
- Laço de 401 (E-010): `BROWSER_NAVIGATE` grava só o horário em `sessionStorage` (`landing-analitica.login-redirect-at`);
  401 menos de 60 s depois não redireciona e `<app-session-expired-notice>` mostra "Sua sessão expirou e não foi possível
  entrar de novo automaticamente." com o link "Entrar novamente". R5, `AGENTS.md` e contratos §8 citam a chave. Contratos
  §8: o gateway aceita `retorno` só com uma única `/` inicial; `loginUrl` padrão (`/api/v1/autenticacao/login`) fora do
  OpenAPI, registrado como item em aberto.
- `Jenkinsfile`, "Deploy PRD": `when { beforeAgent true; beforeInput true; buildingTag() }`; nenhum executor espera a GMUD.
- `SegmentCardsService.getSegments()`: cards que pedem juntos dividem um pedido (`share()` por origem); nada fica em cache
  depois da resposta. Hoje cada página tem um só bloco de segmentos (Início: `segment-overview`; Triagent e Scalation:
  `widgets-dropdown`), então não havia pedido duplicado; a mudança evita o duplicado se os dois aparecerem juntos.
- Contratos §6.1: pergunta em aberto ao BFF sobre `periodos[]` do resumo de e-mails (um item por intervalo, vazios
  incluídos); sem mudança de código.
- Subtítulo do card de e-mails (E-012): "Carregando período..." só durante a carga; nenhum subtítulo no erro.
- Gráficos que sumiam (E-011): rosca "Normas Aplicáveis" ao escolher um tema, e-mails ao trocar período, Cascata ao trocar
  período ou unidade. Causa no `ChartjsComponent` do CoreUI 5.5 com `[redraw]="true"` (destrói e não recria); presente
  desde a migração para o CoreUI 5.5, também no build anterior à Fase 5. `[redraw]` saiu dos três `<c-chart>`.
- `docs:check` (E-013, também no `frontend-template-angular`): a varredura de termos acusa o termo como prefixo colado a
  letras.
- Testes novos: `runtime-config.service.spec.ts` (4), `default-header.component.spec.ts` (4), `login-redirect.service.spec.ts`
  (5), `session-expired-notice.component.spec.ts` (2), `segment-cards.service.spec.ts` (1), `emails-chart.component.spec.ts`
  (3), `applicability-chart.component.spec.ts` (1), `waterfall-chart.component.spec.ts` (1).
- Arquivos: `src/app/core/config/runtime-config.service.ts`, `src/app/core/http/{login-redirect.service.ts,
  session-expired-notice.component.ts,http-error-texts.ts}`, `src/app/containers/default-layout/{default-layout.component.{ts,html},
  default-header/default-header.component.{ts,html}}`, `src/app/app.config.ts`, `src/scss/_components.scss`,
  `src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`, `src/app/views/dashboard/emails/emails-chart.component.{ts,html}`,
  `src/app/views/dashboard/classification/applicability-chart.component.html`,
  `src/app/views/scalation/waterfall/waterfall-chart.component.html`, `nginx/security-headers.conf`, `nginx/default.conf`,
  `angular.json`, `Jenkinsfile`, `scripts/docs-check.js`; docs `portabilidade.md`, `arquitetura.md`,
  `contratos-de-dados.md`, `glossario-ptbr.md`, `dependencias-e-ambiente.md`, `paginas/triagent.md`, `paginas/scalation.md`;
  `.rules/projeto.md` (R5), `.rules/erros.md` (E-009 a E-014; E-001 a E-008 compactadas em uma linha para caber no limite
  de 12.000 caracteres), `AGENTS.md` ("Dados e segurança").
