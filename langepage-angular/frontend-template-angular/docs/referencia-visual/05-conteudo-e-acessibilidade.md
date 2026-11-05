# 05. Conteúdo, ícones, exportação e acessibilidade

Idioma, formatos, textos padrão, ícones, planilhas exportadas e os critérios de acessibilidade aplicados na Agenda
Normativa.

## 1. Idioma

- Todo texto visível em **português do Brasil**: menu, títulos, breadcrumbs, rótulos, botões, placeholders, mensagens,
  `aria-label`, `title`, `alt`, legendas de gráficos, colunas e nomes de arquivos exportados.
- Código, nomes de arquivos de código e comentários em inglês.
- `<html lang="pt-BR">`; no `AppModule`: `registerLocaleData(localePt, 'pt-BR')`, `{ provide: LOCALE_ID, useValue: 'pt-BR' }`
  e `{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }` (`anexos/app/app.module.ts.txt`).
- Formatar sempre com os pipes do Angular (`number`, `percent`, `date`) ou `Intl` em `pt-BR`; nunca montar número ou
  data à mão.
- Termos de interface vêm de um glossário (na origem, `docs/glossario-ptbr.md`): "Início", "Painéis", "Tema" (Claro /
  Escuro / Automático), "Trilha de navegação", "Exportar Excel", "Gráfico" / "Tabela", "Personalizado", "Últimos",
  "Remover filtro", "Anterior" / "Próxima". Rótulos de cor contextual: Primário, Secundário, Sucesso, Perigo, Alerta,
  Informação, Claro, Escuro.

## 2. Formatos

| Dado | Formato | Como |
|---|---|---|
| Data no header (≥ 768 px) | "quarta-feira, 28 de outubro de 2026" | `Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })` |
| Data no header (< 768 px), listas e tabelas | "28/10/2026" | `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })` ou `date: 'dd/MM/yyyy'` |
| `<time datetime>` e `<input type="date">` | "2026-10-28" | data local, sem conversão para UTC |
| Período (subtítulo) | "Janeiro a dezembro de 2021", "25 a 31 de dezembro de 2021", "Janeiro de 2020 a dezembro de 2021", "2017 a 2021" | `buildTrafficPeriod` (`period-range.ts.txt`) |
| Rótulo de eixo | "Janeiro" (mesmo ano), "Jan/21" (anos diferentes), "Seg 27/12" (dia), "2021" (ano) | idem |
| Inteiro | "1.553" | `number: '1.0-0'` ou `Intl.NumberFormat('pt-BR')` |
| Média | "4,6" | `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })` |
| Percentual de participação | "34%" | `percent: '1.0-0'` ou `Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })` |
| Percentual da cascata | "20%", "12,5%" | `style: 'percent', maximumFractionDigits: 1` |
| Moeda compacta | "R$ 15 mi", "R$ 1,2 bi" | `Intl.NumberFormat('pt-BR', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 })` |
| Negativo | "−R$ 15 mi", "−30%" | sinal de menos tipográfico (U+2212 "−"), não hífen |
| Sem base | "—" | travessão quando não há base para percentual |
| Contagem | "1 norma", "7 normas", "1 e-mail", "14 e-mails" | função de plural (`countLabel(n, singular, plural)`) |
| Valor + participação | "2.439 normas (34%)" | legenda do gráfico de linhas |
| Faixa da paginação | "1–15 de 573" | travessão curto (U+2013) entre os números |
| Ordenação alfabética | "Órgão" antes de "Tema", "2" antes de "10" | `Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })` |
| Nome de arquivo exportado | `normativos-recebidos-2021-01-01-a-2021-12-31.xlsx` | minúsculas, hífens, sem acento, datas `yyyy-MM-dd`, sufixo do filtro quando houver (`-a-classificar-atacado`) |

## 3. Textos padrão

| Situação | Texto |
|---|---|
| Carregando (bloco) | Spinner + "Carregando dados..." (`label="Carregando..."` no `c-spinner`) |
| Carregando (subtítulo) | "Carregando período..." |
| Carregando (app) | "Carregando..." no `index.html` |
| Sem JavaScript | "É preciso habilitar o JavaScript para usar este painel." |
| Erro de carga | "Não foi possível carregar os dados da cascata." / "...a classificação das normas." / "...os e-mails." / "...a tabela analítica." / "...os segmentos." |
| Vazio | "Nenhuma norma classificada neste período." / "Nenhuma norma aplicável neste período." / "Nenhum e-mail enviado neste período." / "Nenhuma norma para os filtros aplicados." |
| Exportação | "Exportar Excel" → "Gerando arquivo..." → erro "Não foi possível gerar o arquivo Excel." |
| Filtro ativo | "Filtro: **<valor>**. Aplicado a <blocos>. Clique fora ou pressione Esc para remover." + "Remover filtro" |
| Filtros da tabela | "Filtros aplicados:" + pílulas, ou "Sem filtros: todas as normas classificadas no período do gráfico Normativos Recebidos." |
| Validação de período | "Informe as duas datas." / "A data inicial deve ser anterior ou igual à data final." / "Para Dia, escolha até 92 dias ou use Mês." |
| Período ajustado | "O intervalo personalizado não cabe nesta visão; mostrando os últimos 12 meses." |
| Títulos de botões de alternância | "Destacar Atacado no gráfico" / "Mostrar todas as séries"; "Filtrar a página pelas normas a classificar de Atacado" / "Remover filtro de normas a classificar" |

Tom: frases curtas e impessoais ("Não foi possível...", "Nenhuma..."), sem exclamação, dizendo o que aconteceu e, quando
houver, o que fazer.

## 4. Ícones

`@coreui/icons` 3.x (conjunto "free", traço fino) via `<svg cIcon name="...">` de `@coreui/icons-angular`. Todo ícone
usado precisa estar registrado em `icon-subset.ts` (o `AppComponent` faz `iconSetService.icons = { ...iconSubset }`).
Ícone decorativo leva `aria-hidden="true"`; botão só com ícone leva `aria-label` e `title`. Tamanhos: `size="sm"` em
chips e botões pequenos, `size="lg"` no header e no chat, `1rem` nos cards de segmento.

| Função | Ícone |
|---|---|
| Menu: Início, painel 1, painel 2, analítico | `cil-home`, `cil-speedometer`, `cil-layers`, `cil-chart-line` (forma com hífen no `_nav.ts`) |
| Abrir/fechar menu | `cilMenu` |
| Tema claro / escuro / automático | `cilSun` / `cilMoon` / `cilContrast` |
| Segmentos | `cilTruck` (Atacado), `cilBuilding` (Corporativo), `cilDevices` (Plataforma), `cilCart` (Varejo) |
| Visão gráfico / tabela | `cilChartLine` / `cilList` |
| Exportar Excel | `cilSpreadsheet` |
| Intervalo personalizado | `cilCalendar` |
| Filtro ativo | `cilFilter` |
| Ordenação | `cilArrowTop` / `cilArrowBottom` |
| Expandir item | `cilChevronRight` (gira 90°) |
| Perguntar ao assistente | `cilSpeech` |
| Chat: abrir, enviar, anexar, baixar | `cilCommentSquare`, `cilPaperPlane`, `cilPaperclip`, `cilCloudDownload` |
| Chat: expandir, reduzir, minimizar, voltar | `cilResizeWidth`, `cilFullscreenExit`, `cilMinus`, `cilChevronLeft` |
| Chat: avaliação | `cilThumbUp` / `cilThumbDown` |

O `icon-subset.ts` da origem ainda traz ícones do template sem uso (bandeiras, cartões, redes sociais); numa landing
nova, registre só os que a tela usa.

## 5. Exportação para Excel

Gerada no navegador com `exceljs` (R9), carregado sob demanda (`import('exceljs/dist/exceljs.min.js')`, fora do bundle
inicial). Anexo: `anexos/app/core/export/xlsx-export.ts.txt` (`buildXlsxWorkbook`, `downloadXlsx`, interfaces
`XlsxTable`/`XlsxColumn`). Requisitos de configuração:

- `angular.json` → `allowedCommonJsDependencies`: incluir `"exceljs/dist/exceljs.min.js"` (o template só lista `chart.js`
  e `@coreui/chartjs`).
- `src/declarations.d.ts`: `declare module 'exceljs/dist/exceljs.min.js';` (os tipos do pacote exigem tipos do Node;
  o anexo tipa localmente só o que usa).

Formato da planilha:

| Linha / parte | Estilo |
|---|---|
| Aba | Nome do bloco (até 31 caracteres), ex.: "Normativos Recebidos" |
| 1 | Título em negrito, 14 pt ("Normativos recebidos por segmento") |
| 2 | Subtítulo em itálico, cor `--app-export-muted` (período e filtro: "Janeiro a dezembro de 2021 · filtro: normas a classificar · Atacado") |
| 3 | Em branco |
| 4 (cabeçalho) | Negrito branco sobre preenchimento sólido `--app-export-accent`, alinhamento vertical ao meio; painel congelado abaixo dele; autofiltro em todas as colunas |
| Dados | Uma linha por registro; colunas numéricas com `numFmt: '#,##0'` (o Excel mostra com o separador do usuário) |
| Totais | Negrito, borda superior fina em `--app-export-muted` |
| Larguras | `width` da coluna ou `max(12, tamanho do cabeçalho + 4)` |
| Metadados | `workbook.creator = 'Agenda Normativa'`, `created = new Date()` |
| Download | `Blob` com MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, link temporário com `download`, `URL.revokeObjectURL` em seguida |

Cores da planilha: o utilitário lê só `--app-export-accent` (`#223ad2`) e `--app-export-muted` (`#4b5968`), tokens
definidos no `:root` claro de `_brand.scss` e **sem valor escuro**, de propósito: a planilha é sempre branca e sai igual
em qualquer tema da tela. (Até 2026-10-28 a origem lia `--brand-primary`/`--brand-content-low` do tema ativo e, no escuro,
gerava cabeçalho `#6b7cf0` e subtítulo `#a9b1bd`; corrigido, com teste de regressão em `xlsx-export.spec.ts`.)

## 6. Acessibilidade

### 6.1 Contrastes (WCAG 2.x)

Metas: 4,5:1 para texto normal; 3:1 para texto grande, componentes de interface e marcas de gráfico. Valores calculados
na origem em 2026-10-28.

| Par | Cores | Razão | Situação |
|---|---|---|---|
| Primário sobre card | `#223ad2` / `#ffffff` | 8,06:1 | OK |
| Branco sobre primário (botão, segmentado ativo, chat) | `#ffffff` / `#223ad2` | 8,06:1 | OK |
| Primário sobre `primary-low` (chip ativo) | `#223ad2` / `#edeffc` | 7,05:1 | OK |
| Texto principal sobre card / página | `#20262c` / `#ffffff` · `#f3f5f7` | 15,27:1 · 13,97:1 | OK |
| Texto secundário sobre card / página / `surface-mid` | `#4b5968` / `#ffffff` · `#f3f5f7` · `#eaedf0` | 7,17:1 · 6,56:1 · 6,10:1 | OK |
| Sucesso (texto) | `#288f28` / `#ffffff` | 4,16:1 | Texto grande e componentes; nunca `#36bf36` (2,42:1) em texto |
| Alerta | `#ff6600` / `#ffffff` | 2,94:1 | Só preenchimento; texto de alerta em `#b84900` (5,26:1) |
| Erro | `#dc1832` / `#ffffff` | 4,98:1 | OK |
| Informação | `#1099bc` / `#ffffff` | 3,33:1 | Componentes e marcas; não usar em texto pequeno |
| Desabilitado | `#a7b2be` / `#ffffff` | 2,15:1 | Só decorativo/desabilitado |
| Branco sobre menu lateral | `#ffffff` / `#0e1650` | 16,81:1 | OK (itens a 72% em repouso) |
| Destaque sobre menu lateral | `#31c7ed` / `#0e1650` | 8,42:1 | OK |
| Escuro: primário sobre card / página | `#6b7cf0` / `#171e28` · `#0f1319` | 4,60:1 · 5,11:1 | OK |
| Escuro: `primary-high` sobre card (chip ativo) | `#8491f3` / `#171e28` | 5,85:1 | OK |
| Escuro: link sobre card | `#8c9ae8` / `#171e28` | 6,31:1 | OK |
| Escuro: branco sobre botão primário | `#ffffff` / `#6b7cf0` | 3,64:1 | Rótulo de botão (500, ≥ 14 px); não usar para texto corrido |
| Escuro: branco sobre chat | `#ffffff` / `#5568e7` | 4,65:1 | OK |
| Escuro: texto principal / secundário sobre card | `#eef1f5` · `#a9b1bd` / `#171e28` | 14,80:1 · 7,75:1 | OK |
| Escuro: sucesso / alerta / erro / informação sobre card | `#36bf36` · `#ff8a3d` · `#f0566b` · `#31c7ed` | 6,91 · 7,15 · 4,99 · 8,40:1 | OK |
| Escuro: branco sobre menu lateral | `#ffffff` / `#0c1238` | 18,12:1 | OK |

Séries e rampas de gráficos: `04-graficos.md`, 8.

### 6.2 Foco visível

Todo controle próprio tem `:focus-visible` explícito com `outline: 2px solid` e `outline-offset: 2px`, sem depender do
`box-shadow` do CoreUI:

- cor `--brand-primary`: `.btn`, `.filter-chip`, `.brand-segmented`, `.theme-toggle`, `.header-toggler`, itens de legenda,
  `button.theme-row`, `.analytic-sort` e `.analytic-ask` (offset `-2px`, dentro da célula), `.emails-item-head` (`-2px`),
  regiões roláveis (`.analytic-scroll`, `.emails-normas`);
- cor `--brand-highlight` (sobre azul-marinho): `.sidebar-nav .nav-link` (offset `-2px`), `.brand-lockup` (offset `4px`), botões e
  lista do chat;
- branco: selo `.brand-stat-pending` (sobre o degradê);
- campos: borda `--brand-primary` + anel `0 0 0 .25rem rgba(var(--brand-primary-rgb), .2)`.

### 6.3 Semântica e ARIA

| Padrão | Implementação |
|---|---|
| Títulos | Uma `<h1 class="visually-hidden">` por página; `h4.card-title` por card com `id` e `aria-labelledby` no `c-card`; `h5` para subtítulos internos ("Últimos e-mails") |
| Grupos de controles | `role="group"` + `aria-label` ("Forma de exibição", "Unidade dos valores", "Granularidade do período", "Período dos normativos recebidos") |
| Alternâncias | `aria-pressed` em chips, segmentado, itens de legenda, selos e linhas filtráveis |
| Expansão | `aria-expanded` + `aria-controls` ("Personalizado", itens da lista de e-mails) |
| Gráficos | `role="img"` + `aria-label` com resumo dos números; visão Tabela equivalente |
| Tabelas | `<caption class="visually-hidden">` com o que a tabela mostra e o período; `scope="col"`, `scope="row"`, `scope="rowgroup"`; `aria-sort` nos cabeçalhos ordenáveis |
| Regiões roláveis | `role="region"`, `tabindex="0"` e `aria-label` que avisa para rolar para o lado |
| Mensagens dinâmicas | Erros e validação em `role="alert"`; faixas de filtro, filtros aplicados e avisos em `role="status"`; página atual da tabela em `aria-live="polite"`; chat em `role="log"` |
| Barras de participação | `role="progressbar"` com `aria-valuenow/min/max` e `aria-label="Participação de Atacado"` |
| Imagens | Símbolo da marca `alt=""` + `aria-hidden` (o nome é texto); logo do rodapé com `alt` = nome da instituição (placeholder `NOME_DA_MARCA`, vindo da configuração de ambiente); chaves de cor e ícones decorativos `aria-hidden` |
| Teclado | `Esc` remove filtros de página; todos os controles são `<button>`/`<a>`/`<input>` nativos |
| Navegação | Link da marca com `aria-label="Agenda Normativa, ir para o início"`; menu de seções leva ao bloco logo abaixo do header |

### 6.4 Movimento reduzido

Com `@media (prefers-reduced-motion: reduce)` saem as transições de `.sidebar-nav .nav-link` (e o filete `::before`),
`.brand-segmented > .btn`, `.theme-toggle`, `.filter-chip`, itens de legenda, linhas de tema, seta da lista de e-mails e as
animações do chat. As transições restantes são curtas (0,15–0,2 s) e só em cor, fundo, borda, opacidade.

### 6.5 Pendências conhecidas na origem

- Blocos herdados do template (cards de redes sociais, "Tráfego e vendas") não passaram por auditoria e não seguem o
  padrão pt-BR de números.
- Branco sobre o botão primário no escuro fica em 3,64:1 (adequado para rótulo de botão, não para texto corrido).

## 7. Verificação antes de entregar

- [ ] Telas em 375, 768 e 1440 px, nos temas claro, escuro e automático, sem rolagem horizontal da página.
- [ ] Navegação só por teclado: foco visível em todo controle, `Esc` remove filtros, ordem lógica.
- [ ] Contraste conferido nos dois temas para todo par novo de texto/fundo.
- [ ] `prefers-reduced-motion` desliga as transições novas.
- [ ] Textos em pt-BR com os formatos da seção 2; termos do glossário.
- [ ] Nenhuma cor fixa fora de `_brand.scss`, `_variables.scss` e `_theme-dark.scss`.
- [ ] `ng build --configuration production` sem erro (budget `anyComponentStyle` 4 kB respeitado).
