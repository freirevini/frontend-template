# Contratos de dados

Fontes de dados do produto (páginas Início, Triagent e Scalation, e o chat do agente): o contrato **v1** com o BFF, como
os dados estão hoje (mock), as interfaces TypeScript exatas, as validações que existem no código e a receita para trocar
o mock pela API. Complementa `docs/arquitetura.md`. Regras aplicáveis: R4 (HTTP e BFF), R5 (autenticação), R6
(ambientes), R12 (pt-BR). Decisões: ADR-023 (adequação aos padrões corporativos), ADR-002 (mock até o contrato).

## 1. Situação atual e contrato v1

**Contrato:** `docs/contratos/openapi-agenda-normativa-v1.yaml` (OpenAPI 3.0.3, rascunho contract-first entregue ao
time do BFF `sboot-<sigla>-base-bff-agenda-normativa`). É a fonte dos nomes de recurso, campo, parâmetro e erro; este
documento explica como cada um chega à tela e o de-para com as interfaces do front (seção 11). Enquanto o BFF não
publicar o v1, os mocks de `src/assets/data/` continuam (ADR-002). Desde a Fase 5 do plano de adequação cada serviço de
dados tem os dois caminhos, escolhidos por `dataMock` na configuração de execução (`assets/env.json`): `true` (padrão) lê
os mocks no formato de hoje, com o mesmo comportamento e visual; `false` chama o recurso v1 pelo `ApiService` e converte a
resposta por um adaptador puro por recurso (`*.adapter.ts`, seção 11), já testado com fixtures no formato do OpenAPI.

Para ligar a página aos dados de produção (tabelas da camada `dvry_corp_compliance`, domínios, receita do adaptador),
usar `docs/mapeamento-de-dados.md`.

| Fonte | Componente | Origem hoje | v1 (relativo a `apiBase`) |
|---|---|---|---|
| Cards de segmento | `<app-widgets-dropdown>` (Triagent, Scalation) e `<app-segment-overview>` (Início) | Mock `src/assets/data/dashboard-segments.json` via `SegmentCardsService` (`src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`) | `GET /v1/segmentos` |
| Normativos Recebidos (séries, legenda) | card "Normativos Recebidos" em `DashboardComponent` | Valores aleatórios em memória (`src/app/views/dashboard/dashboard-charts-data.ts`) | `GET /v1/normativos-recebidos` |
| Filtro de período | `<app-period-filter>` | Lógica local (`period/period-range.ts`, `period-filter/period-filter.component.ts`) | vira os parâmetros `granularidade`, `inicio`, `fim` |
| Normas Aplicáveis (pizza) e Assunto das Normas Aplicáveis | `<app-applicability-chart>`, `<app-themes-list>` | Mock `src/assets/data/dashboard-classificacao.json` + `aggregateClassification` | `GET /v1/normas-classificadas/resumo` |
| Tabela Analítica | `<app-analytic-table>` | Mesmo mock + `filterClassified`, paginação no front | `GET /v1/normas-classificadas` (paginado) |
| Fluxo de e-mail - Triagem (indicadores e barras) | `<app-emails-chart>` | Mock `src/assets/data/dashboard-emails.json` + `aggregateEmails` | `GET /v1/emails-sugestao/resumo` |
| Últimos e-mails e normas de um e-mail | `<app-emails-chart>` | Mesmo mock | `GET /v1/emails-sugestao?size=5&sort=dataEnvio,desc` |
| Cascata do resultado | `<app-waterfall-chart>` | Mock `src/assets/data/dashboard-waterfall.json` + `deriveWaterfall` | `GET /v1/cascatas-resultado` |
| Saudação do chat (primeiro nome) | `<app-chat-widget>` | `user.firstName` do mock do chat (`chatMock: true`); com `chatMock: false`, `UserService.firstName$()` (Fase 4) | `GET /v1/usuarios/me` |
| Chat do agente (seção 9) | `<app-chat-widget>` | Mock `src/assets/data/chat-fluxo-mock.json` + `ChatMockServer` (`environment.chatMock`) | `/v1/agente/sessoes/...` |

`src/assets/data/` contém os mocks `dashboard-segments.json`, `dashboard-classificacao.json`, `dashboard-emails.json`,
`dashboard-waterfall.json` e `chat-fluxo-mock.json`. "Origem hoje" é o caminho com `dataMock: true`; com `dataMock: false`
os blocos de dados usam a coluna v1 (o chat segue `chatMock`, seção 9).

### 1.1 Endpoints: proposta antiga → v1

As rotas `/conforme/...` nunca existiram no BFF: eram a proposta anterior ao ADR-023. Desde a Fase 4 o `ApiService`
acrescenta `/v1` a todo caminho; o `ChatApiService` ainda usa os caminhos antigos do chat, que ficam
`apiBase` + `/v1/conforme/chat/...` (só o mock responde) até a Fase 6 trocar os payloads; código novo usa só os recursos v1.

| Antes (proposta) | v1 | Mudança |
|---|---|---|
| `GET /conforme/triagent/segmentos?start&end` | `GET /v1/segmentos?dataReferencia` | fotografia numa data, não período |
| `GET /conforme/triagent/trafego?period&start&end` | `GET /v1/normativos-recebidos?granularidade&inicio&fim` | recurso com o nome da tela; `Day/Month/Year` → `DIA/MES/ANO` |
| `GET /conforme/triagent/classificacoes?start&end&segmento` (todas as linhas) | `GET /v1/normas-classificadas?inicio&fim&segmento&aplicavel&tema&page&size&sort` + `GET /v1/normas-classificadas/resumo?inicio&fim&segmento&tema&temasDe` | paginação obrigatória; pizza e temas já agregados |
| `GET /conforme/triagent/emails-sugestao?start&end` (todas as linhas) | `GET /v1/emails-sugestao?inicio&fim&segmento&page&size&sort` + `GET /v1/emails-sugestao/resumo?granularidade&inicio&fim&segmento` | idem |
| `GET /conforme/triagent/cascata?period&start&end` | `GET /v1/cascatas-resultado?granularidade&inicio&fim` | plural kebab-case |
| `user` em `POST /conforme/chat/sessao` | `GET /v1/usuarios/me` | nome fora do chat (S4 do ADR-023) |
| `POST /conforme/chat/sessao` | `POST /v1/agente/sessoes` (201) | |
| `POST /conforme/chat/mensagem` | `POST /v1/agente/sessoes/{sessaoId}/mensagens` | `sessionId` vai no caminho |
| `POST /conforme/chat/arquivo` (veredito na mesma resposta) | `POST /v1/agente/sessoes/{sessaoId}/arquivos` (202) + `GET /v1/agente/sessoes/{sessaoId}/arquivos/{arquivoId}` | quarentena com antivírus assíncrona (seção 9.7) |
| `POST /conforme/chat/feedback` | `POST /v1/agente/sessoes/{sessaoId}/avaliacoes` (204) | |
| `POST /conforme/chat/cancelar` | `POST /v1/agente/sessoes/{sessaoId}/cancelamentos` | |
| `DELETE /conforme/chat/sessao/{id}` | `DELETE /v1/agente/sessoes/{sessaoId}` (204) | |

## 2. Camada HTTP (R4, ADR-023)

### 2.1 Serviço base

Toda chamada passa por `src/app/core/services/api.service.ts` (`get`, `post` com JSON ou `FormData`, `postMultipart`,
`delete`), que monta `apiBase` + `/v1` (`API_VERSION_PREFIX`) + caminho do recurso: `get('/segmentos')` →
`/api/v1/segmentos`. `apiBase` vem da configuração de execução (`assets/env.json`, lida antes do
bootstrap; valor `/api` em todos os ambientes, porque o Ingress roteia `/api/*` ao BFF). Até a Fase 3 do plano de
adequação o mesmo valor ficava num campo do `environment.ts`. Caminhos do contrato v1 começam por `/v1/`; nunca URL absoluta,
`localhost`, `appdes` ou `appuat` no código (R6).

- O cookie de sessão vai sozinho (mesma origem); não há token no front (seção 8).
- Datas em query string: `yyyy-MM-dd` local. `toInputDate(date)` de `period/period-range.ts` produz esse formato sem
  deslocamento de fuso; `fromInputDate` faz o caminho inverso.
- Enumerações do v1 chegam em MAIÚSCULAS (`ATACADO`, `MES`, `APLICAVEL`); os adaptadores convertem para os valores do
  front (seção 11.7) e o resto do código não muda.

### 2.2 Paginação

| Regra | Valor |
|---|---|
| Parâmetros | `page` (0 = primeira), `size` (1 a 100; padrão 20), `sort=campo,asc\|desc` (repetível) |
| Envelope | Spring `Page`: `content`, `totalElements`, `totalPages`, `number`, `size` (suposição S6; campos extras ignorados) |
| Tabela Analítica | `size=15` (`ANALYTIC_PAGE_SIZE`); página da tela `p` (1, 2...) → `page=p-1`; "1–15 de N" usa `totalElements`; ordenação padrão `dataClassificacao,desc`, desempate `codigo,asc` no servidor; `numero` ordena pelo valor |
| Ordenação permitida | normas: `dataClassificacao`, `orgao`, `tipo`, `numero`, `tema`, `segmento`, `aplicavel`, `area`, `diretoria`, `codigo`; e-mails: `dataEnvio`, `segmento`, `id`. Outro campo: 400 `VAL-005` |
| Últimos e-mails | `size=5` (`LATEST_EMAILS`), `sort=dataEnvio,desc` |
| Excel (D5) | o front pede `size=100` página a página até 5.000 linhas (no máximo 50 pedidos, em sequência) e monta com `exceljs` (`xlsx-export.ts`); com `totalElements` > 5.000 não exporta parcial e mostra o texto `EXPORT_LIMIT_TEXT` (seção 2.4). Implementação: `collectPages` (`src/app/core/http/api-page.ts`; para depois da 1ª página se o total passar do teto) e `AnalyticTableComponent.exportXlsx` (sem pedido nenhum se o total da tela já passa do teto; botão "Buscando linhas... N de M" enquanto as páginas chegam; filtro novo ou saída da página cancela os pedidos). Com `dataMock: true` as páginas saem do mock local, mesmo resultado de antes |
| Implementação (Fase 5) | `DataPage` (`items`, `total`, `page`, `size`) e `fromSpringPage` em `src/app/core/http/api-page.ts`; parâmetros da tabela em `normasPageParams` (`classification.adapter.ts`): `sort` = coluna da tela + `dataClassificacao,desc` + `codigo,asc` (no máximo 3, os mesmos desempates do mock); o mock emula a mesma página com `pageClassified` (`classification-derive.ts`) |
| Mudou filtro ou ordenação | volta para `page=0`; pedido anterior é cancelado (`switchMap`) |

### 2.3 Agregados

Gráficos e indicadores não baixam linhas: leem os resumos já agregados pelo BFF a partir da API da Ilha de Dados.

| Bloco | Recurso | O front ainda calcula |
|---|---|---|
| Pizza e lista de temas | `normas-classificadas/resumo`: `total`, `aplicaveis`, `naoAplicaveis`, `totalTemas`, `temas[]` (até 10, maior primeiro, empate pelo nome; com 11 temas vêm os 11), `outrosTemas` (`quantidade`, `temasAgrupados`) | `applicableShare`, `share` e `width` de cada tema, rótulo "Outros temas" |
| Indicadores e barras de e-mails | `emails-sugestao/resumo`: `totalEmails`, `totalNormas`, `normasDistintas`, `mediaNormasPorEmail`, `normasPorSegmento[]`, `periodos[]` (um por intervalo, vazios incluídos) | rótulos e subtítulo pt-BR (`buildTrafficPeriod`), cores e pilhas |
| Normativos Recebidos | `normativos-recebidos`: `pontos[]` e, por segmento, `classificadas[]` e `aClassificar[]` | linha "Normas a Classificar" somada ou filtrada, legenda (total e participação) |
| Cards de segmento | `segmentos`: `total`, `aClassificar`, `tendencia[]` | ícone e rótulo pelo `id` |
| Cascata | `cascatas-resultado`: etapas e partes do período | `buildWaterfall` (colunas, níveis, base, resultado), formato moeda e % |

Os mesmos filtros cruzados de hoje viram parâmetros: segmento da página → `segmento`; fatia da pizza → `aplicavel`
(tabela) e `temasDe` (lista de temas); tema escolhido → `tema`.

### 2.4 Erros (Problem Details, RFC 7807)

Toda resposta 4xx/5xx do BFF vem em `application/problem+json` com `timestamp`, `status`, `code`, `message`,
`details[]` e `traceId` (schema `ProblemDetail` do OpenAPI). O front **nunca** mostra `message` nem `details`: escolhe um
texto próprio em pt-BR pelo status HTTP e pela família do `code` e acrescenta o `traceId` como "código de suporte"
(D6). O catálogo de códigos do chassi não foi recebido (S10): os números abaixo são a proposta do contrato; código
desconhecido cai no texto do status.

| HTTP | `code` (família e proposta) | Ação do front | Constante do texto (pt-BR) |
|---|---|---|---|
| 401 | `AUT-001` não autenticado | interceptor redireciona para `loginUrl` com a URL atual; nenhum texto | — |
| 403 | `AUT-002` sem permissão; `AUT-003` CSRF inválido | mensagem no bloco | `HTTP_ERROR_TEXTS.forbidden`: "Você não tem acesso a esta informação." |
| 400 | `VAL-001` entrada inválida; `VAL-005` paginação ou ordenação | mensagem no bloco | `HTTP_ERROR_TEXTS.badRequest`: "Não foi possível processar o pedido. Confira os filtros e tente novamente." |
| 404 | `NEG-002` (agente: sessão ou arquivo) | dados: mensagem; chat: abre sessão nova (`SESSION_NOT_FOUND`) | `HTTP_ERROR_TEXTS.notFound`: "A informação pedida não foi encontrada." |
| 413 | `VAL-003` arquivo; `VAL-004` envio acima de 9 MB; sem corpo quando o gateway recusa acima de 10 MB | chat | `CHAT_ERROR_TEXTS.FILE_TOO_LARGE`, `CHAT_ERROR_TEXTS.SEND_TOO_LARGE` (seção 9.3) |
| 415 | `VAL-002` tipo de arquivo | chat | `CHAT_ERROR_TEXTS.FILE_TYPE_NOT_ALLOWED` |
| 422 | `NEG-001` ação fora do passo; `NEG-003` cota de 20 MB da sessão | chat | `CHAT_ERROR_TEXTS.INVALID_ACTION`, `CHAT_ERROR_TEXTS.SESSION_QUOTA_EXCEEDED` |
| 429 | sem código (gateway) | mensagem; respeitar `Retry-After` | `HTTP_ERROR_TEXTS.rateLimited`: "Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente." |
| 500 | `SIS-003` | mensagem | `HTTP_ERROR_TEXTS.serverError`: "Não foi possível carregar os dados agora. Tente novamente em instantes." |
| 502, 503 | `SIS-001` | mensagem | `HTTP_ERROR_TEXTS.serverError` |
| 504 | `SIS-002` | mensagem | `HTTP_ERROR_TEXTS.timeout`: "O servidor demorou a responder. Tente novamente em instantes." |
| 0 (rede) | — | mensagem | `HTTP_ERROR_TEXTS.network`: "Sem conexão com o servidor. Verifique a rede e tente novamente." |

- Código de suporte: `SUPPORT_CODE_TEXT` = "Código de suporte: {traceId}", em linha própria abaixo da mensagem, com o
  valor selecionável para copiar; só aparece quando a resposta trouxe `traceId`.
- Cada bloco mantém a frase dele quando já existe ("Não foi possível carregar os segmentos.", "Não foi possível carregar
  os dados da cascata."); `HTTP_ERROR_TEXTS` cobre os casos de status específico (403, 429, 504, rede).
- Exportação acima do teto: `EXPORT_LIMIT_TEXT` = "A tabela tem {total} linhas e o Excel aceita até 5.000. Refine os
  filtros para exportar."
- `HTTP_ERROR_TEXTS`, `SUPPORT_CODE_TEXT` (e `supportCodeText(traceId)`) existem desde a Fase 4 em
  `src/app/core/http/http-error-texts.ts`; `EXPORT_LIMIT_TEXT`, `EXPORT_MAX_ROWS` (5000) e `exportLimitText(total)` no mesmo
  arquivo desde a Fase 5. Termos no
  `docs/glossario-ptbr.md`; os do chat ficam em `src/app/chat/chat-texts.ts` (seção 9.3).
- Implementação (Fase 4): o interceptor `apiErrorInterceptor` (`src/app/core/http/api-error.interceptor.ts`) converte
  toda falha de chamada ao BFF (URL sob `apiBase`) em `ApiProblem` (`api-problem.ts`: `status`, `code?`, `traceId?`,
  `kind`); o texto sai de `apiProblemText(problem)` (`null` no 401). Do corpo só ficam `code` no formato das famílias
  (`VAL|AUT|NEG|SIS-nnn`) e `traceId` só com letras, dígitos e hífen (até 64); `message` e `details` são descartados.
  Família refina o status: `AUT-002`/`AUT-003` → `forbidden`, `SIS-002` → `timeout`; outro 4xx → `badRequest`; outro
  5xx → `serverError`. Pedidos fora de `apiBase` (mocks de `assets/data/`) passam sem mudança.
- Blocos de dados (Fase 5): `loadErrorMessage(error, frase do bloco)` (`api-problem.ts`) escolhe o texto — frase do bloco
  para 5xx sem família específica, payload inválido ou mock ausente; `HTTP_ERROR_TEXTS` para 400, 403, 404, 429, 504 e
  rede; nada no 401 — e o `<app-api-error-text>` (`api-error-text.component.ts`) mostra o texto e, com `traceId`, a linha
  "Código de suporte: …" com o valor selecionável. Usado pelos cards de segmento, Normativos Recebidos, pizza, temas,
  Tabela Analítica (carga e Excel), e-mails e Cascata.

## 3. Cards de segmento

### Arquivo mock: `src/assets/data/dashboard-segments.json`

```json
{
  "asOf": "2021-12-31",
  "segments": [
    { "id": "atacado", "label": "Atacado", "icon": "cilTruck", "total": 54, "toClassify": 7, "trend": [65, 59, 84, 84, 51, 55, 40] },
    { "id": "corporativo", "label": "Corporativo", "icon": "cilBuilding", "total": 62, "toClassify": 9, "trend": [1, 18, 9, 17, 34, 22, 11] },
    { "id": "plataforma", "label": "Plataforma", "icon": "cilDevices", "total": 25, "toClassify": 4, "trend": [78, 81, 80, 45, 34, 12, 40] },
    { "id": "varejo", "label": "Varejo", "icon": "cilCart", "total": 44, "toClassify": 6, "trend": [85, 65, 23, 12, 98, 34, 84] }
  ]
}
```

### Interfaces exatas (`src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`)

```ts
export interface SegmentCard {
  id: string;
  label: string;
  /** Icon name from src/app/icons/icon-subset.ts. */
  icon: string;
  /** Normas of the segment. */
  total: number;
  /** Normas of the segment still to classify now (same scale as the "Normas a Classificar" line per segment). */
  toClassify: number;
  /** Sparkline values, oldest first. */
  trend: number[];
}

export interface SegmentCardsData {
  /** Reference date of the snapshot (yyyy-MM-dd). */
  asOf: string;
  segments: SegmentCard[];
}
```

### Validações (`validateSegmentCards`, manter)

| Regra | Mensagem |
|---|---|
| Lista vazia | "Nenhum segmento informado." |
| `total` ou `toClassify` não inteiro ou negativo | "Quantidades inválidas no segmento \"<nome>\"." |
| `toClassify > total` | "Normas a classificar maiores que o total no segmento \"<nome>\"." |

Falha de carga ou de validação: o componente esconde os cards e mostra "Não foi possível carregar os segmentos.".

### Onde o dado entra

`WidgetsDropdownComponent.ngOnInit` → `segments` (cards por `@for`) → `setData()` (um sparkline por `trend`) →
`setOptions()` (`min`/`max` por série). O card mostra `total` (pipe `number`) e o selo "`toClassify` a classificar". A ordem
exibida é a do array: manter alfabética (glossário).

### Coerência com o gráfico Normativos Recebidos

`toClassify` é a quantidade atual (`asOf`) de normas a classificar do segmento, na mesma escala da linha "Normas a
Classificar" do gráfico Normativos Recebidos filtrada por segmento. Com dados reais, o BFF deve devolver os dois a partir da mesma fonte, para que
o card e o último ponto da linha filtrada coincidam na data de referência.

### v1: `GET /v1/segmentos` → `SegmentosResposta`

```json
{
  "dataReferencia": "2021-12-31",
  "segmentos": [
    { "id": "ATACADO", "nome": "Atacado", "total": 54, "aClassificar": 7, "tendencia": [65, 59, 84, 84, 51, 55, 40] },
    { "id": "CORPORATIVO", "nome": "Corporativo", "total": 62, "aClassificar": 9, "tendencia": [1, 18, 9, 17, 34, 22, 11] }
  ]
}
```

Parâmetro opcional `dataReferencia` (padrão: última data disponível). O BFF não devolve ícone: o adaptador mapeia `id` →
ícone. De-para campo a campo: seção 11.1.

### Receita de adaptação

Feito na Fase 5 (`segment-cards.adapter.ts`, `SegmentCardsService.getSegments` com `dataMock`); o mock continua até o BFF.

1. Trocar `SegmentCardsService.mockUrl` por `ApiService.get<SegmentosResposta>('/v1/segmentos')` (R4) com um adaptador
   `fromSegmentosV1` (seção 11.1) antes de `validateSegmentCards`, que continua no `pipe`.
2. Ícone por `id` no adaptador (`cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`); rótulo pode vir de `nome` ou do
   domínio 4.1 de `mapeamento-de-dados.md`.
3. Manter o SCSS (`brand-stat-card`, `brand-stat-pending`, `segment-icon`) e o orçamento de 4 kB.

## 4. Normativos Recebidos

### Interfaces exatas (`src/app/views/dashboard/dashboard-charts-data.ts`)

```ts
export interface IChartProps {
  data?: any;
  labels?: any;
  options?: any;
  colors?: any;
  type?: any;
  legend?: any;

  [propName: string]: any;
}

export interface TrafficSeries {
  label: string;
  /** CSS custom property with the series color (light/dark values in src/scss/_theme-dark.scss). */
  colorVar: string;
  fallbackColor: string;
  /** Mock value range; distinct bands keep the lines (and their value labels) apart. */
  range: [number, number];
  /** The reference line: normas still to classify, summed over the segments or filtered to one. */
  dashed?: boolean;
}

/** Legend order: business segments alphabetically, then the "to classify" reference line (always last). */
export const TRAFFIC_SERIES: TrafficSeries[] = [
  { label: 'Atacado', colorVar: '--app-series-1', fallbackColor: '#223ad2', range: [160, 240] },
  { label: 'Corporativo', colorVar: '--app-series-2', fallbackColor: '#1099bc', range: [100, 160] },
  { label: 'Plataforma', colorVar: '--app-series-3', fallbackColor: '#288f28', range: [55, 105] },
  { label: 'Varejo', colorVar: '--app-series-4', fallbackColor: '#ae6ae6', range: [120, 200] },
  { label: 'Normas a Classificar', colorVar: '--app-series-reference', fallbackColor: '#dc1832', range: [3, 12], dashed: true }
];

/** Index of the "Normas a Classificar" line; every other index is a business segment. */
export const TO_CLASSIFY_INDEX = TRAFFIC_SERIES.length - 1;

export interface TrafficSummaryItem {
  label: string;
  /** Segment the item is filtered to (only for "Normas a Classificar" while a segment is selected). */
  filter?: string;
  color: string;
  dashed: boolean;
  total: number;
  /** Share of all normas in the period (0..1). */
  share: number;
}
```

### Estado interno de `DashboardChartsData`

| Campo | Tipo | Significado |
|---|---|---|
| `period` | `TrafficPeriod` | Granularidade (`'Day' \| 'Month' \| 'Year'`), padrão `'Month'` |
| `range` | `number \| null` | Preset "Últimos N" ou `null` (intervalo personalizado) |
| `bounds` | `DateRange` | Datas cobertas |
| `labels` | `string[]` | Um rótulo por ponto (`buildTrafficPeriod`) |
| `values` | `number[][]` | `values[segmento][ponto]`: normas classificadas (4 segmentos, na ordem de `TRAFFIC_SERIES`) |
| `toClassify` | `number[][]` | `toClassify[segmento][ponto]`: normas a classificar por segmento |
| `highlight` | `number \| null` | Índice da série destacada |

Geração mock (`initMainChart`): `values = segments.map(series => labels.map(() => random(series.range)))` e
`toClassify = segments.map(() => labels.map(() => random(3, 12)))`. **Toda chamada gera números novos**, inclusive ao
trocar só o período.

### Cálculos que devem ser mantidos

- Linha "Normas a Classificar" (`seriesValues(TO_CLASSIFY_INDEX)`): sem destaque, soma dos quatro segmentos ponto a ponto;
  com segmento destacado, `toClassify[segmento]` e rótulo "Normas a Classificar · <segmento>".
- Legenda (`trafficSummary()`): `total = soma dos pontos da série` (para a tracejada, da soma ou do segmento filtrado);
  `grandTotal = soma de todos os values + soma de todos os toClassify` (sempre de todos os segmentos, `|| 1` para evitar divisão por zero);
  `share = total / grandTotal`. Exibição no HTML: `{{ total | number:'1.0-0' }} normas ({{ share | percent:'1.0-0' }})` → "1.234 normas (28%)".
- Subtítulo do card e rótulos do eixo x vêm de `buildTrafficPeriod(period, bounds)` (pt-BR; ver §5).
- Rótulos de valor sobre os pontos: `trafficValueLabelsPlugin` com `Intl.NumberFormat('pt-BR')`.

### v1: `GET /v1/normativos-recebidos` → `NormativosRecebidos`

Parâmetros obrigatórios `granularidade` (`DIA`, `MES`, `ANO`), `inicio` e `fim` (`yyyy-MM-dd`, inclusive). Máximo de
pontos igual ao do filtro (`MAX_TRAFFIC_POINTS`: 92 dias, 60 meses, 30 anos); acima disso, 400 `VAL-001`.

```json
{
  "granularidade": "MES",
  "inicio": "2021-10-01",
  "fim": "2021-12-31",
  "pontos": ["2021-10", "2021-11", "2021-12"],
  "segmentos": [
    { "segmento": "ATACADO",     "nome": "Atacado",     "classificadas": [201, 187, 215], "aClassificar": [5, 9, 4] },
    { "segmento": "CORPORATIVO", "nome": "Corporativo", "classificadas": [120, 133, 141], "aClassificar": [7, 3, 6] },
    { "segmento": "PLATAFORMA",  "nome": "Plataforma",  "classificadas": [60, 72, 98],    "aClassificar": [11, 8, 5] },
    { "segmento": "VAREJO",      "nome": "Varejo",      "classificadas": [150, 162, 171], "aClassificar": [4, 6, 10] }
  ]
}
```

Interface do front: `TrafficResponse` / `TrafficSegmentSeries` (`src/app/views/dashboard/traffic/traffic-data.service.ts`,
Fase 5); o adaptador `fromNormativosRecebidosV1` (`traffic/traffic.adapter.ts`) converte o v1 nela (seção 11.2).

### Receita de adaptação

Feito na Fase 5, com uma diferença: o `random()` continua como mock (`dataMock: true`). `TrafficDataService.getTraffic`
chama o v1; `DashboardChartsData.selectPeriod` aplica o período sem gerar valores e `setTrafficData` grava as séries e
calcula o eixo y (maior valor + 10%, múltiplo de 5; 250 fixo só no mock); `DashboardComponent` usa `switchMap` e mostra
carregando/erro (`trafficState`). Passos originais, para referência:

1. Criar `TrafficDataService` (ex.: `src/app/views/dashboard/traffic/traffic-data.service.ts`) com
   `getTraffic(period: TrafficPeriod, bounds: DateRange): Observable<TrafficResponse>` chamando
   `ApiService.get('/v1/normativos-recebidos', { granularidade, inicio: toInputDate(bounds.start), fim: toInputDate(bounds.end) })`
   e o adaptador `fromNormativosRecebidosV1`.
2. Em `DashboardChartsData`:
   - **Remover** `random()` e a geração em `initMainChart`. Transformar `initMainChart` em algo como
     `setTrafficData(period, range, bounds, response)` que preenche `labels` (continuar usando `buildTrafficPeriod`
     para rótulos/subtítulo pt-BR), `values` (`segments[i].classified` na ordem de `TRAFFIC_SERIES`) e `toClassify`
     (`segments[i].toClassify`), e depois chama `renderMainChart`.
   - **Manter**: `TRAFFIC_SERIES`, `TO_CLASSIFY_INDEX`, `renderMainChart` (destaque, cores por token, estilo),
     `trafficSummary`, `seriesValues`, `segmentFilter`, `isSegment`, `seriesColor`, validação de preset/intervalo.
   - **Ajustar** o eixo y: `max: 250` e `stepSize: Math.ceil(250 / 5)` são fixos; calcular a partir do maior valor
     recebido (ou deixar o Chart.js decidir e manter `maxTicksLimit: 5`).
3. Em `DashboardComponent.onTrafficPeriod`, trocar a chamada síncrona por `trafficService.getTraffic(...)` com
   `switchMap` (seleção nova cancela a anterior) e `takeUntil(destroy$)`, no mesmo padrão de `WaterfallChartComponent`;
   estados de carregamento/erro em pt-BR ("Carregando dados...", "Não foi possível carregar os dados dos normativos recebidos.").
4. Ordem dos segmentos: alinhar `segmentos` à ordem de `TRAFFIC_SERIES` pelo `segmento`, nunca confiar na ordem do BFF.
5. Testes: `dashboard-charts-data.spec.ts` e `dashboard.component.spec.ts` instanciam `DashboardChartsData` diretamente;
   alimentar com uma fixture v1 em vez de depender do `random`.

## 5. Filtro de período

### Tipos exatos (`src/app/views/dashboard/period/period-range.ts`, `period-filter/period-filter.component.ts`)

```ts
export type TrafficPeriod = 'Day' | 'Month' | 'Year';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RangeOption {
  count: number;
  label: string;
}

/** Range options per granularity ("Últimos 7 dias" etc.). */
export const TRAFFIC_RANGES: Record<TrafficPeriod, RangeOption[]> = {
  Day: [{ count: 7, label: '7 dias' }, { count: 15, label: '15 dias' }, { count: 30, label: '30 dias' }],
  Month: [{ count: 3, label: '3 meses' }, { count: 6, label: '6 meses' }, { count: 12, label: '12 meses' }],
  Year: [{ count: 3, label: '3 anos' }, { count: 5, label: '5 anos' }]
};

export const DEFAULT_TRAFFIC_RANGE: Record<TrafficPeriod, number> = { Day: 7, Month: 12, Year: 5 };

/** Most points a custom range may have per granularity, so the chart stays readable. */
export const MAX_TRAFFIC_POINTS: Record<TrafficPeriod, number> = { Day: 92, Month: 60, Year: 30 };

/** Visible names of the granularities. */
export const PERIOD_LABELS: Record<TrafficPeriod, string> = { Day: 'Dia', Month: 'Mês', Year: 'Ano' };

/** Validated selection emitted by the filter: granularity, preset (last N) or null for custom, and its dates. */
export interface PeriodSelection {
  period: TrafficPeriod;
  range: number | null;
  bounds: DateRange;
}
```

### Funções e validações

| Função | Regra |
|---|---|
| `presetRange(period, count)` | Intervalo "últimos `count`" terminando em `PERIOD_END = new Date(2021, 11, 31)`. Dia: `end - (count-1)` dias; Mês: dia 1 de `count-1` meses antes; Ano: 1º de janeiro de `count-1` anos antes. |
| `trafficPointCount(period, range)` | Dias (UTC, inclusivo), meses ou anos entre `start` e `end`, inclusivo. |
| `validateCustomRange(period, range)` | Retorna mensagem pt-BR ou `null`: `'Informe as duas datas.'` (falta/inválida); `'A data inicial deve ser anterior ou igual à data final.'`; `'Para Dia, escolha até 92 dias ou use Mês.'` / `'Para Mês, escolha até 60 meses ou use Ano.'` / `'Para Ano, escolha até 30 anos.'` quando `trafficPointCount > MAX_TRAFFIC_POINTS[period]`. |
| `buildTrafficPeriod(period, range)` | `{ labels, subtitle }`. Dia: "Seg 27/12"; Mês: "Janeiro" (mesmo ano) ou "Jan/21"; Ano: "2021". Subtítulos: "1 a 31 de dezembro de 2021", "27 de novembro a 10 de dezembro de 2021", "Outubro a dezembro de 2021", "Janeiro de 2020 a dezembro de 2021", "2017 a 2021"; ponto único: "31 de dezembro de 2021", "Dezembro de 2021", "2021". |
| `toInputDate(date)` / `fromInputDate(text)` | `yyyy-MM-dd` em hora local, sem deslocamento UTC. |
| `isTrafficPeriod(value)` | Type guard. |

Exemplo de `PeriodSelection` (JSON, datas serializadas):

```json
{ "period": "Month", "range": 3, "bounds": { "start": "2021-10-01", "end": "2021-12-31" } }
{ "period": "Day",   "range": null, "bounds": { "start": "2021-12-20", "end": "2022-01-10" } }
```

### Receita de adaptação

- **Manter** todo o `period-range.ts` e o `PeriodFilterComponent`: a validação, as mensagens pt-BR e os limites continuam
  válidos com dados reais (o limite de pontos protege a legibilidade do gráfico, não o mock).
- **Trocar `PERIOD_END`**: hoje é constante (último dia do mock). Com dados reais, usar a data de hoje
  (`new Date()` normalizada para meia-noite local) ou a última data disponível informada pelo BFF. É o único ponto que amarra
  o filtro ao mock; `presetRange` é o único consumidor.
- Enviar ao BFF (v1): `granularidade` (`Day` → `DIA`, `Month` → `MES`, `Year` → `ANO`), `inicio` =
  `toInputDate(bounds.start)`, `fim` = `toInputDate(bounds.end)`. O BFF não precisa conhecer `range`; ele é só a aba
  ativa dos presets. O BFF repete os limites de `MAX_TRAFFIC_POINTS` (400 `VAL-001`).
- Se o BFF impuser outros limites (ex.: histórico máximo), aplicar em `validateCustomRange` para a mensagem aparecer no
  lugar certo (`customError`, `role="alert"`).

## 6. Cascata do resultado

### Arquivo mock: `src/assets/data/dashboard-waterfall.json`

```json
{
  "period": "Janeiro a dezembro de 2021",
  "baseYear": 2021,
  "currency": "BRL",
  "unitScale": 1000000,
  "steps": [
    { "id": "gross-revenue", "label": "Receita bruta", "kind": "total",
      "parts": [ { "label": "Produto A", "value": 15 }, { "label": "Produto B", "value": 10 }, { "label": "Produto C", "value": 25 } ] },
    { "id": "deductions", "label": "Deduções", "kind": "decrease",
      "parts": [ { "label": "Impostos", "value": 15 }, { "label": "Devoluções", "value": 5 } ] },
    { "id": "costs", "label": "Custos", "kind": "decrease",
      "parts": [ { "label": "Matéria-prima", "value": 5 }, { "label": "Logística", "value": 3 } ] },
    { "id": "expenses", "label": "Despesas", "kind": "decrease",
      "parts": [ { "label": "Pessoal", "value": 8 }, { "label": "Marketing", "value": 4 } ] },
    { "id": "net-result", "label": "Resultado", "kind": "total",
      "parts": [ { "label": "Operacional", "value": 6 }, { "label": "Financeiro", "value": 4 } ] }
  ]
}
```

Coerência do exemplo: receita 50 − deduções 20 − custos 8 − despesas 12 = 10 = resultado (6 + 4). Valores em milhões
(`unitScale: 1000000`), moeda `BRL`.

### Interfaces exatas (`src/app/views/scalation/waterfall/waterfall.model.ts`)

```ts
/** A step either starts from zero (total) or hangs from the previous running level (decrease). */
export type WaterfallStepKind = 'total' | 'decrease';

export interface WaterfallPart {
  label: string;
  /** Always a positive amount; the step kind gives the direction. */
  value: number;
}

export interface WaterfallStep {
  id: string;
  label: string;
  kind: WaterfallStepKind;
  parts: WaterfallPart[];
}

export interface WaterfallData {
  /** Subtitle of the period shown (pt-BR). */
  period: string;
  /** Calendar year the base values cover; a range equal to it shows them unchanged. */
  baseYear?: number;
  currency: string;
  /** Multiplier from `value` to currency units (e.g. 1000000 = values in millions). */
  unitScale: number;
  steps: WaterfallStep[];
}

export interface WaterfallSegment {
  stepIndex: number;
  partIndex: number;
  stepLabel: string;
  partLabel: string;
  kind: WaterfallStepKind;
  value: number;
  /** Bar bounds on the value axis. */
  low: number;
  high: number;
}

export interface WaterfallColumn {
  step: WaterfallStep;
  total: number;
  /** Running level before and after this step. */
  start: number;
  end: number;
  segments: WaterfallSegment[];
}

export interface WaterfallModel {
  columns: WaterfallColumn[];
  segments: WaterfallSegment[];
  /** First total (e.g. gross revenue): the base for percentages. */
  base: number;
  result: number;
}

/** Each step holds at most this many parts: the color ramps have three steps. */
export const MAX_PARTS_PER_STEP = 3;
```

`WaterfallData` é o contrato de entrada (o que o JSON e, no futuro, o BFF entregam). `WaterfallModel` é derivado no
cliente por `buildWaterfall(steps)` e não deve vir da API.

### Validações de `buildWaterfall(steps)` (manter)

| Condição | Erro lançado (pt-BR) |
|---|---|
| `steps` vazio | `Cascata sem etapas.` |
| Etapa com 0 partes ou mais de `MAX_PARTS_PER_STEP` (3) | `Etapa "<label>" precisa ter de 1 a 3 componentes.` |
| `part.value` não finito ou negativo | `Valor inválido em "<etapa> / <parte>".` |

Semântica: `total` empilha de zero para cima (`low = cursor`, `high = cursor + value`); `decrease` pende do nível corrente
para baixo (`low = cursor − value`, `high = cursor`). `column.end` = total (para `total`) ou `level − total` (para `decrease`).
`base` = total da primeira etapa `total`; `result` = nível após a última etapa. O componente envolve `buildWaterfall` em
`try/catch` e mostra "Não foi possível carregar os dados da cascata." quando falha.

Regra de negócio implícita no modelo (não validada): a etapa `total` final deve ser igual à receita menos as reduções
(o mock e `deriveWaterfall` garantem isso). O BFF precisa entregar dados coerentes; se não garantir, validar no serviço.

### `deriveWaterfall` (remover com dados reais)

`src/app/views/scalation/waterfall/waterfall-derive.ts` existe só para o mock: escala a base anual pela fração do ano
coberta (`Day` 365, `Month` 12, `Year` 1 pontos/ano), aplica ruído determinístico (FNV-1a com semente
`"<period>|<start>|<end>"`, `ACTIVITY_SWING` 10%, `SEGMENT_SWING` 8%), limita as reduções para o resultado nunca ficar
abaixo de 5% da receita (`MIN_RESULT_SHARE`), recalcula os totais após o primeiro como saldo corrente distribuído nas
proporções da base, arredonda a 3 casas e devolve o ano-base intacto quando `bounds` é exatamente 01/01–31/12 de `baseYear`.
Com dados reais, o período vira parâmetro do endpoint e a derivação sai.

### Onde o dado entra

`WaterfallDataService.getWaterfall(period, bounds)` → `WaterfallChartComponent.selection$` (`switchMap`) →
`buildWaterfall(data.steps)` → `render()`. Campos usados pelo componente: `data.period` (subtítulo e `caption` da tabela),
`data.currency` e `data.unitScale` (`formatCurrency`), `data.steps` (modelo). `baseYear` só é lido por `deriveWaterfall`.

### v1: `GET /v1/cascatas-resultado` → `CascataResultado`

Parâmetros obrigatórios `granularidade`, `inicio`, `fim`. Mesmo conteúdo de `WaterfallData`, já no período pedido, sem
`baseYear`, com nomes pt-BR e `tipo` em maiúsculas:

```json
{
  "periodo": "Outubro a dezembro de 2021",
  "moeda": "BRL",
  "escalaUnidade": 1000000,
  "etapas": [
    { "id": "gross-revenue", "rotulo": "Receita bruta", "tipo": "TOTAL",   "partes": [ { "rotulo": "Produto A", "valor": 3.9 }, { "rotulo": "Produto B", "valor": 2.6 }, { "rotulo": "Produto C", "valor": 6.5 } ] },
    { "id": "deductions",    "rotulo": "Deduções",      "tipo": "REDUCAO", "partes": [ { "rotulo": "Impostos", "valor": 3.9 }, { "rotulo": "Devoluções", "valor": 1.3 } ] },
    { "id": "costs",         "rotulo": "Custos",        "tipo": "REDUCAO", "partes": [ { "rotulo": "Matéria-prima", "valor": 1.3 }, { "rotulo": "Logística", "valor": 0.8 } ] },
    { "id": "expenses",      "rotulo": "Despesas",      "tipo": "REDUCAO", "partes": [ { "rotulo": "Pessoal", "valor": 2.1 }, { "rotulo": "Marketing", "valor": 1.0 } ] },
    { "id": "net-result",    "rotulo": "Resultado",     "tipo": "TOTAL",   "partes": [ { "rotulo": "Operacional", "valor": 1.6 }, { "rotulo": "Financeiro", "valor": 1.0 } ] }
  ]
}
```

`periodo` é opcional: ausente, o adaptador gera o subtítulo com `buildTrafficPeriod(period, bounds).subtitle` (é o que
`deriveWaterfall` faz hoje). `moeda` e `escalaUnidade` vêm do BFF; nunca fixos no componente. De-para: seção 11.5.
A "Cascata do resultado" ainda não tem fonte confirmada em produção (pergunta Q8 do plano).

### Receita de adaptação

Feito na Fase 5 sem apagar o mock: `WaterfallDataService.getWaterfall` com `dataMock: false` chama o v1 e `fromCascataV1`
(`waterfall.adapter.ts`); o `mockUrl`, a base anual e `deriveWaterfall` só rodam com `dataMock: true`. Os passos de
remoção (2) valem quando o mock sair.

1. Em `WaterfallDataService`:
   - **Remover** `mockUrl`, o `shareReplay` da base anual e a chamada a `deriveWaterfall`.
   - `getWaterfall(period, bounds)` passa a ser `this.api.get<CascataResultado>('/v1/cascatas-resultado', { granularidade, inicio: toInputDate(bounds.start), fim: toInputDate(bounds.end) })`
     com `map(fromCascataV1)` (preenche `period` via `buildTrafficPeriod` quando `periodo` vier ausente).
   - A assinatura (`Observable<WaterfallData>`) não muda, então `WaterfallChartComponent` e seu spec continuam válidos.
2. **Remover** `waterfall-derive.ts` e `waterfall-derive.spec.ts`; remover `src/assets/data/dashboard-waterfall.json`
   e atualizar este documento (o `scripts/docs-check.js` exige que todo arquivo de `src/assets/data/` seja citado aqui).
3. **Manter**: `waterfall.model.ts` (interfaces + `buildWaterfall` + validações), `waterfall-format.ts`, o componente
   (estados, chips, tabela, plugins, paleta por tokens) e `MAX_PARTS_PER_STEP` (as rampas de cor `--app-wf-total-1..3` e
   `--app-wf-decrease-1..3` têm três tons; o v1 também limita `partes` a 3).
4. Etapas e componentes são dinâmicos: rótulos, quantidade de etapas e de partes vêm do payload; só a ordem importa.

### 6.1 Fluxo de e-mail - Triagem

Mock `src/assets/data/dashboard-emails.json` (gerado uma vez por script determinístico; 176 e-mails de 2021, 1–8 normas cada):

```json
{
  "asOf": "2021-12-31",
  "emails": [
    {
      "id": "em-2021-12-28-001",
      "sentAt": "2021-12-28T09:14:00-03:00",
      "subject": "Sugestões de classificação — Atacado",
      "segment": "atacado",
      "recipients": 3,
      "normas": [{
        "code": "Resolução CMN 5.123", "orgao": "CMN", "tipo": "Resolução", "numero": "5.123",
        "title": "…", "suggestedClass": "Aplicável", "area": "Gestão de Capital", "diretoria": "Riscos"
      }]
    }
  ]
}
```

| Campo | Regra (`validateEmails`) |
|---|---|
| `id` | Obrigatório e único. |
| `sentAt` | ISO 8601 com deslocamento; o gráfico usa a data e a hora como enviadas (sem converter fuso). |
| `segment` | Um de `atacado`, `corporativo`, `plataforma`, `varejo` (os mesmos ids do gráfico Normativos Recebidos e dos cards). Todas as normas do e-mail pertencem a esse segmento. |
| `subject`, `recipients` | Mantidos no contrato (`recipients` inteiro ≥ 0), mas não exibidos: a lista mostra a data (sem hora), o segmento e o número de normas. |
| `normas[]` | Pelo menos 1. Obrigatórios e não vazios: `code` (identificador completo, usado para "N distintas"), `orgao`, `tipo`, `numero`, `area`, `diretoria`; `title` é o Tema; `suggestedClass` ∈ `Aplicável`, `Aplicável parcialmente`, `Não aplicável`, exibido na coluna "Aplicável ao segmento?" como Sim / Parcialmente / Não (`APPLICABILITY_LABELS`). No mock, `orgao`/`tipo`/`numero` vêm do `code` e Área/Diretoria são fictícias, fixas por tema. |

Contagens: o gráfico soma normas **por envio** (a mesma norma em dois e-mails conta duas vezes); o indicador "N distintas" conta
`code` únicos no período. "Taxa de aceite" não existe até o contrato trazer o retorno do analista.

**v1.** A lista deixa de vir inteira:

- Indicadores e barras: `GET /v1/emails-sugestao/resumo?granularidade&inicio&fim[&segmento]` → `ResumoEmailsSugestao`
  (`totalEmails`, `totalNormas`, `normasDistintas`, `mediaNormasPorEmail`, `normasPorSegmento[]`, `periodos[]` com
  `inicio`, `fim`, `emails`, `normasPorSegmento[]`, `totalNormas`). Substitui o `aggregateEmails` na origem; o front só
  formata (rótulos pela `buildTrafficPeriod`).
- **Pergunta em aberto ao time do BFF:** `fromResumoEmailsV1` (`emails.adapter.ts`) recusa o resumo quando
  `periodos.length` difere da quantidade de pontos que o front calcula para o período (`buildTrafficPeriod`): o card mostra
  o erro de carga em vez de barras deslocadas. Confirmar que o BFF devolve **um item por intervalo, vazios incluídos**, com
  a mesma regra de corte de dia/mês do front (início e fim inclusivos, fuso de Brasília); se o BFF puder omitir vazios,
  o adaptador terá de casar pelos campos `inicio`/`fim`. Sem mudança de código até a resposta.
- "Últimos e-mails" e as normas de cada um: `GET /v1/emails-sugestao?inicio&fim[&segmento]&page=0&size=5&sort=dataEnvio,desc`
  → `PaginaEmailsSugestao` (`content[]` de `EmailSugestao` com `normas[]`).
- `validateEmails` continua sobre os itens da página (mesmas regras, com `segmento` convertido de `ATACADO` para
  `atacado` e `classeSugerida` de `APLICAVEL` para `Aplicável` pelo adaptador, seção 11.4).

### 6.2 Classificação das normas

Mock `src/assets/data/dashboard-classificacao.json` (gerado por `scripts/gen-classificacao.js`, determinístico; 573 normas
classificadas em 2021, 368 aplicáveis):

```json
{
  "asOf": "2021-12-31",
  "normas": [
    {
      "code": "Resolução CMN 4.855", "orgao": "CMN", "tipo": "Resolução", "numero": "4.855", "classifiedAt": "2021-03-02",
      "segment": "varejo", "theme": "Pix: regras de devolução e limites", "applicable": true,
      "area": "Meios de Pagamento", "diretoria": "Operações"
    }
  ]
}
```

| Campo | Regra (`validateClassification`) |
|---|---|
| `code` | Obrigatório e único (uma classificação por norma). |
| `classifiedAt` | Data `YYYY-MM-DD` da classificação; o filtro de período usa as duas pontas inclusive. |
| `segment` | Um de `atacado`, `corporativo`, `plataforma`, `varejo` (filtro por segmento da página). |
| `theme` | Texto não vazio; agrupado como veio (sem normalização). |
| `applicable` | Booleano: aplicável ou não ao banco. |
| `orgao`, `tipo`, `numero`, `area`, `diretoria` | Texto não vazio (colunas da Tabela Analítica). No mock, órgão/tipo/número vêm do `code` e Área/Diretoria são fictícias, fixas por tema (mesmo mapa do mock de e-mails). |

Filtro (`filterClassified`): período (pontas inclusive), segmento, tema e classe; usado pelos cards e pela Tabela Analítica.
Cálculos (`aggregateClassification`): participação = aplicáveis / classificadas; temas só das aplicáveis, 10 nomeados e o
resto em "Outros temas"; % de cada tema sobre as aplicáveis.

**v1.** Linha a linha só na Tabela Analítica, paginada no servidor:

- Pizza e temas: `GET /v1/normas-classificadas/resumo?inicio&fim[&segmento][&tema][&temasDe=APLICAVEIS|NAO_APLICAVEIS]`
  → `ResumoNormasClassificadas` (`dataReferencia`, `total`, `aplicaveis`, `naoAplicaveis`, `totalTemas`, `temas[]`,
  `outrosTemas`). Mesmas regras de `aggregateClassification` (10 temas nomeados, 11 sem agrupar um tema só, empate pelo
  nome em pt-BR), agora no BFF.
- Tabela Analítica: `GET /v1/normas-classificadas?inicio&fim[&segmento][&aplicavel][&tema]&page&size=15&sort=...` →
  `PaginaNormasClassificadas`; filtros, ordenação e páginas no servidor (seção 2.2), mesmos controles e textos na tela.
- Excel: páginas de `size=100` até 5.000 linhas (D5, seção 2.2).
- `validateClassification` continua sobre os itens da página; `filterClassified` e `aggregateClassification` saem do
  caminho de dados reais e ficam só para o mock e os testes de formatação. De-para: seção 11.3.

## 7. Formatação pt-BR

| Onde | Implementação | Exemplo |
|---|---|---|
| Moeda compacta (Cascata) | `formatCurrency(value, unitScale, currency)` em `waterfall-format.ts`: `Intl.NumberFormat('pt-BR', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 })` sobre `Math.abs(value) * unitScale`; negativo recebe prefixo `−` (U+2212). Formatters cacheados por moeda. | `formatCurrency(15, 1e6, 'BRL')` → `R$ 15 mi`; `formatCurrency(-15, 1e6, 'BRL')` → `−R$ 15 mi`; `0.8` → `R$ 800 mil` |
| Porcentagem da receita (Cascata) | `formatShare(value, base)`: `Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })` sobre `|value| / base`; `—` quando `base` é 0; `−` para negativos. | `formatShare(15, 50)` → `30%`; `formatShare(-5, 50)` → `−10%` |
| Legenda do gráfico Normativos Recebidos | Pipes `number:'1.0-0'` e `percent:'1.0-0'` com `LOCALE_ID` pt-BR | `1.234 normas (28%)` |
| Valores sobre os pontos (Normativos Recebidos) | `new Intl.NumberFormat('pt-BR')` no plugin | `1.234` |
| Variação dos cards | Hoje literal no HTML; na adaptação usar `percent:'1.1-1'` | `−12,4%` |
| Datas do header | `Intl.DateTimeFormat('pt-BR', …)` em `toHeaderDate` | `terça-feira, 27 de outubro de 2026` / `27/10/2026` |
| Rótulos e subtítulos de período | `buildTrafficPeriod` (`Intl.DateTimeFormat('pt-BR')` + `MONTHS` em português) | `Seg 27/12`, `Jan/21`, `Outubro a dezembro de 2021` |
| Campos de data do filtro | `toInputDate` / `fromInputDate` (`yyyy-MM-dd`, local) | `2021-12-31` |

`unitScale` e `currency` são lidos do JSON da Cascata (`WaterfallData`); o componente nunca assume milhões ou BRL.
Tabular numerals (`font-variant-numeric: tabular-nums`) nas colunas numéricas e na legenda.

## 8. Autenticação e sessão do usuário (R5, ADR-023)

Implementado na Fase 4 do plano de adequação (`src/app/core/http/`, `UserService`); diferenças e suposições da
implementação estão nas notas "Fase 4" abaixo. Contrato:

- **Identidade:** o BFF (ou o gateway na frente dele) faz Authorization Code + PKCE no IdP corporativo e emite um cookie
  de sessão `HttpOnly`, `Secure`, `SameSite=Lax` (nome definido pelo chassi; o OpenAPI usa `SESSION`, suposição S3).
  O navegador nunca vê token: nada de token em `localStorage`/`sessionStorage`. As únicas chaves são
  `landing-analitica.color-mode` (`localStorage`, preferência de tema) e `landing-analitica.login-redirect-at`
  (`sessionStorage`, só o horário em epoch ms da última ida à entrada corporativa, para quebrar laço de 401; R5). Front e BFF na mesma origem (`/api`), então o cookie vai sozinho, sem `withCredentials`.
- **Renovação:** o BFF renova em silêncio com o refresh token. Sessão inválida ou expirada: **401** (`AUT-001`) e cookies
  limpos.
- **401 → login:** um interceptor funcional do `HttpClient` redireciona para `loginUrl` (chave da configuração de
  execução, suposição S2), preservando a URL atual quando o gateway aceitar parâmetro de retorno (a confirmar). Vale
  também durante uma conversa do chat: a conversa se perde e a sessão do agente expira pelo TTL.
  - Nota Fase 4: `LoginRedirectService` (`src/app/core/http/login-redirect.service.ts`) navega para
    `loginUrl?retorno=<encodeURIComponent(caminho + query + fragmento)>` (`&retorno=` se `loginUrl` já tiver `?`). O nome
    do parâmetro, `retorno` (`LOGIN_RETURN_PARAM`), é **suposição** até o gateway confirmar. Redireciona uma vez por
    página: vários 401 juntos não repetem a navegação. Só chamadas sob `apiBase` disparam; o erro segue como `ApiProblem`
    401 para quem chamou (sem texto).
  - Quebra de laço (2026-11-04): antes de navegar, `BROWSER_NAVIGATE` grava o horário em `sessionStorage`
    (`landing-analitica.login-redirect-at`). Um 401 menos de 60 s depois (`LOGIN_LOOP_WINDOW_MS`; o gateway devolveu o
    usuário ainda sem sessão) não redireciona de novo: a página mostra "Sua sessão expirou e não foi possível entrar de
    novo automaticamente." e o link "Entrar novamente" (mesmo endereço, com `retorno`), que grava o horário ao ser
    seguido. Nenhum token é guardado.
  - **Gateway, exigência de segurança:** aceitar `retorno` só quando começa com uma única `/` seguida de algo que não é
    `/` nem `\` (caminho da mesma origem); recusar `//host`, `/\host`, `http:`/`https:` e qualquer URL absoluta (evita
    redirecionamento aberto). Valor recusado: voltar à raiz do painel.
  - **Em aberto (confirmar com gateway/BFF):** o caminho padrão `loginUrl` = `/api/v1/autenticacao/login` (padrão de
    `defaultRuntimeConfig` e do `env.json` versionado) **não está no OpenAPI v1**: o endpoint de entrada pertence ao
    gateway/BFF e não ao contrato de dados. Até a confirmação é suposição; o ConfigMap de cada ambiente define o valor real.
- **403:** texto `HTTP_ERROR_TEXTS.forbidden` ("Você não tem acesso a esta informação.") no bloco; sem redirecionar.
- **CSRF (suposição S3):** cookie `XSRF-TOKEN` (não `HttpOnly`) emitido pelo BFF e cabeçalho `X-XSRF-TOKEN` em POST, PUT,
  PATCH e DELETE. É o padrão do `HttpClient` (`withXsrfConfiguration` com os nomes padrão), que só envia o cabeçalho para
  URL relativa, o caso do `apiBase`. Falta ou divergência: 403 `AUT-003`.
  Nota Fase 4: `provideAppHttpClient()` (`api-error.interceptor.ts`, usado em `app.config.ts`) declara
  `withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })` explicitamente.
- **Primeiro nome (suposição S4):** `GET /v1/usuarios/me` → `{ "primeiroNome": "Vinicius" }`, chamado quando o chat abre
  a primeira sessão; guardado só em memória; passa pelo filtro `greetingName`. Falha ou campo ausente: saudação sem
  nome, nunca erro na tela. Substitui o `user.firstName` da resposta de sessão.
  Nota Fase 4: `UserService.firstName$()` (`src/app/core/services/user.service.ts`) devolve `primeiroNome` sem espaços
  nas pontas ('' se ausente ou em falha, nunca erro) e guarda o valor só em memória; falha não é guardada (a próxima
  sessão pergunta de novo). Com `chatMock: false`, `ChatApiService.startSession` pede o nome logo depois da resposta da
  sessão e o põe em `user.firstName`, que a saudação já usa; com `chatMock: true` continua o `user` do mock e
  `usuarios/me` não é chamado.
- As rotas antigas da R5 (`/j_security_check`, `/api-security/refresh`, `/api-security/me`, `/api-security/logout`) não
  fazem parte do v1; a R5 é reescrita na fase que implementar o interceptor.

## 9. Chat do agente (`/v1/agente/sessoes/...`)

Widget flutuante do agente de normas (`docs/planejamento/chat-widget.md`); comportamento do agente em
`docs/planejamento/agente-normas-gemini.md` e especificação do backend (BFF que encaminha + orquestrador Python) em
`docs/planejamento/agente-backend-spec.md`. Contrato v1 no OpenAPI (tag "Agente"). O chat passa a exigir a sessão do
usuário (seção 8): o BFF encaminha cada chamada ao orquestrador com `Authorization: Bearer <jwt>`, e uma sessão do agente
só responde ao usuário que a criou (outro usuário recebe 404). `sessaoId` fica só na memória do componente; nada do chat
vai para `localStorage`/`sessionStorage`.

### 9.1 Endpoints (relativos a `apiBase`)

| Método e caminho | Corpo | Resposta |
|---|---|---|
| `POST /v1/agente/sessoes` | (vazio) | 201 `SessaoAgente`: `{ sessaoId, passo, mensagens }` (`mensagens` = boas-vindas **sem** saudação) |
| `POST /v1/agente/sessoes/{sessaoId}/mensagens` | `PedidoMensagem` (JSON): `{ passoId, acao, opcaoId?, texto?, requisicaoId }` | 200 `RespostaAgente`: `{ passo, mensagens }` |
| `POST /v1/agente/sessoes/{sessaoId}/arquivos` | `multipart/form-data`: `passoId`, `requisicaoId`, `arquivos` (1 a 5, campo repetido, na ordem escolhida; soma até 9 MB) | 202 `EnvioArquivosAceito`: `{ requisicaoId, arquivos[] }`, cada um com `status: EM_VERIFICACAO` |
| `GET /v1/agente/sessoes/{sessaoId}/arquivos/{arquivoId}` | — | 200 `ArquivoAgente`: `status`, `motivoRejeicao?`, `avaliacao?` e, quando o envio inteiro terminou, `resposta` (`{ passo, mensagens }`) (seção 9.7) |
| `POST /v1/agente/sessoes/{sessaoId}/cancelamentos` | `PedidoCancelamento` (JSON): `{ requisicaoId }` | 200 `RespostaCancelamento`: `{ passo }` (passo atual depois de desfazer) |
| `POST /v1/agente/sessoes/{sessaoId}/avaliacoes` | `PedidoAvaliacao` (JSON): `{ nota, fonteIds }` | 204 |
| `DELETE /v1/agente/sessoes/{sessaoId}` | — | 204 (idempotente) |

`DELETE` é chamado ao recomeçar e ao encerrar. Fechar o painel mantém a conversa (ao reabrir ela continua); o TTL de 30
minutos de inatividade cobre o abandono. Toda chamada que muda estado leva o cabeçalho `X-XSRF-TOKEN` (seção 8).

Nota Fase 6 (implementado): `ChatApiService` (`src/app/chat/chat-api.service.ts`) chama exatamente estes caminhos pelo
`ApiService` (`sessionPath` codifica o `sessaoId` com `encodeURIComponent`); os caminhos antigos `/conforme/chat/*` saíram
do código. Os corpos e as respostas passam pelos adaptadores puros de `src/app/chat/chat-v1-adapters.ts` (interfaces v1
escritas à mão, D9: `PassoAgenteV1`, `MensagemAgenteV1`, `SessaoAgenteV1`, `RespostaAgenteV1`, `PedidoMensagemV1`,
`ArquivoAgenteV1`, `EnvioArquivosAceitoV1`, `PedidoAvaliacaoV1`, `PedidoCancelamentoV1`, `RespostaCancelamentoV1`).
Valor fora de domínio (enumeração desconhecida, `sessaoId` ou `passo.id` ausente, `mensagens` que não é lista, 202 sem um
arquivo por documento) lança `ChatContractError`, cuja mensagem cita só o campo, nunca o valor recebido; o widget mostra
`SERVICE_UNAVAILABLE`. Para ler o `Retry-After`, o envio e a consulta usam `ApiService.postMultipartResponse` e
`ApiService.getResponse` (resposta inteira, com cabeçalhos).

A resposta de `sessoes`, `mensagens` e a `resposta` do envio de arquivos trazem em `mensagens` tudo o que deve aparecer:
ao entrar num passo novo, a primeira mensagem do agente é o `enunciado` dele (o front não exibe o enunciado por conta
própria). `acao: RECOMECAR` devolve o mesmo que criar a sessão.

Cada pedido de `mensagens` e `arquivos` leva um `requisicaoId` gerado pelo front (`ChatSessionService`, único por pedido).
"Tentar novamente" repete o **mesmo** `requisicaoId`: se o primeiro envio chegou, o orquestrador devolve a resposta
guardada (Redis) em vez de agir duas vezes. "Parar" com pedido em andamento abandona a requisição no navegador (e a
consulta de arquivos, se houver) e chama `POST .../cancelamentos` com o `requisicaoId`: o orquestrador descarta o pedido
em andamento ou, se já respondeu, desfaz o efeito (passo, rodadas, bytes e objetos de arquivo). A resposta `{ passo }`
substitui o passo na tela, desde que o usuário ainda não tenha feito outra ação; se o cancelamento falhar, nada aparece.
"Parar" durante o efeito de digitação só mostra o resto da resposta, sem chamar o BFF.

### 9.2 Interfaces exatas (`src/app/chat/chat.model.ts`)

As interfaces abaixo são as do front (nomes em inglês, valores minúsculos). Os adaptadores de `chat-v1-adapters.ts`
convertem o v1 nelas e vice-versa (de-para completo na seção 11.6); o widget só conhece estes tipos.

```ts
type ChatRole = 'ai' | 'user' | 'system';
type ChatNodeType = 'menu' | 'free_text' | 'upload' | 'end';
type ChatStatus = 'answer' | 'need_more_info' | 'not_in_data' | 'out_of_scope' | 'error';
type ChatAction = 'option' | 'text' | 'back' | 'restart' | 'ask';
type ChatQuarantineCode = 'FILE_REJECTED_UNSAFE' | 'FILE_CHECK_FAILED' | 'FILE_CONTENT_NOT_SUPPORTED';
type ChatErrorCode = 'INVALID_ACTION' | 'SESSION_NOT_FOUND' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE' | 'SEND_TOO_LARGE'
                   | 'SESSION_QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'FORBIDDEN'
                   | 'FILE_CHECK_TIMEOUT' | ChatQuarantineCode;

interface ChatNode {
  id: string; type: ChatNodeType; prompt: string;            // prompt em pt-BR
  options?: { id: string; label: string }[];                  // só em 'menu'
  input?: { enabled: boolean; placeholder?: string; maxChars?: number };
  upload?: { accept: string[]; maxBytes: number; maxFiles: number; maxSendBytes?: number };   // só em 'upload'
  canGoBack: boolean;
}
interface ChatApiMessage {
  role: ChatRole; text?: string; status?: ChatStatus;
  citations?: { sourceId: string; excerpt: string }[];
  questions?: string[];                                       // perguntas de esclarecimento
  contacts?: { name: string; area: string; channel: string }[];   // quando as rodadas acabam
  quickReplies?: string[];                                    // respostas prontas ao esclarecimento (viram sugestões)
  normList?: { dateLabel?: string; items: ChatNormItem[] };   // lista de normas, filtrável por segmento no front
  transient?: boolean;                                        // nota de progresso: some na próxima ação do usuário
}
interface ChatNormItem { id: string; title: string; detail?: string; segment?: string; date?: string /* yyyy-MM-dd */ }
interface ChatUser { firstName?: string }   // só o primeiro nome; nunca login, e-mail ou matrícula
interface ChatSessionReply { sessionId: string; node: ChatNode; messages: ChatApiMessage[]; user?: ChatUser }
interface ChatMessage extends ChatApiMessage {
  id: string; createdAt: Date; supportCode?: string;          // traceId de um pedido que falhou ("Código de suporte")
  files?: { name: string; sizeBytes: number; accepted?: boolean; checking?: boolean; reason?: string }[];  // checking: na quarentena; reason: recusa da quarentena
}
// ChatApiMessage.fileResults?: { name; sizeBytes; result: ChatFileResult }[] — preenchido só pelo front (tabela de resultados)
interface ChatFileReply extends ChatReply { files: ChatFileResult[] }
interface ChatFileChecking { checking: boolean[] }            // quais documentos do envio ainda estão na quarentena, na ordem
type ChatFileEvent = ChatFileChecking | ChatFileReply;        // sendFiles emite 0..n ChatFileChecking e termina com ChatFileReply
interface ChatMessageRequest { sessionId: string; nodeId: string; action: ChatAction; optionId?: string; text?: string; requestId: string }
interface ChatCancelRequest { sessionId: string; requestId: string }
interface ChatCancelReply { node: ChatNode }
interface ChatFeedbackRequest { sessionId: string; rating: 'useful' | 'not_useful'; sourceIds: string[] }   // 204; sem texto da conversa
interface ChatFileResult { id: string; accepted: boolean; reason?: string; metadata?: { documentKind?: string; issuer?: string; normIdentifier?: string };
                          quarantine?: ChatQuarantineCode }   // REJEITADO na quarentena; reason = texto de CHAT_ERROR_TEXTS
```

Regras do contrato:
- `text` é markdown simples (parágrafos, `**negrito**`, `*itálico*`, listas, links `https`); **nunca HTML**. O widget renderiza só por `safeMarkdown` (`src/app/chat/markdown/safe-markdown.ts`).
- Os valores abaixo são os do front; no v1 são as enumerações da seção 11.7 (`OPCAO`, `TEXTO`...).
- `action: 'option'` exige `optionId` de um `ChatNode.options` do nó atual; `'text'` exige `text` não vazio com até `input.maxChars` (1000); `'back'` só se `canGoBack`; `'restart'` apaga a sessão e devolve o nó inicial.
- `'ask'` (pergunta vinda de outra tela, M18) vale em qualquer nó, exige `text` como `'text'` e é respondida no nó de perguntas do fluxo, sem repetir o `prompt` dele.
- `quickReplies` (só em `need_more_info`): o front mostra como sugestões; escolher uma envia o texto como `action: 'text'`. Somem quando o usuário escreve.
- `normList`: o front mostra título, observação, segmento e data (`dd/mm/aaaa`, rótulo `dateLabel`) e filtra por segmento com botões ("Todos" + segmentos presentes, só quando há mais de um). Com mais de uma norma o usuário pode ver em tabela e, nela, extrair em Excel as linhas visíveis (gerado no navegador, R9; nenhuma rota nova).
- `transient`: mensagem de progresso; o front a remove na próxima ação do usuário (opção, texto, arquivo, "Voltar"). O próprio front usa para o aviso de sessão expirada.
- Saudação: o front acrescenta no começo da primeira mensagem duradoura do agente nas boas-vindas "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (18h–4h), pelo relógio do computador do usuário, seguido do primeiro nome se `GET /v1/usuarios/me` trouxer `primeiroNome` (hoje `user.firstName` do mock) e passar no filtro (`greetingName`: primeira palavra, só letras, capitalizada): "Boa tarde, Vinicius! Sou o Agente da Agenda…". Sem nome: "Boa tarde! Sou o Agente da Agenda…". Vale também ao recomeçar e quando a sessão expira. O nome fica só na memória da conversa; não volta ao BFF nem entra nos eventos `messages$`.
- O orquestrador valida tudo contra o passo atual; o `passoId` enviado serve para detectar tela desatualizada (422 `NEG-001` → `INVALID_ACTION`).
- `status: 'answer'` sempre vem com `citations`; sem fonte válida o servidor devolve `not_in_data`.
- Citações chegam no v1 como `citacoes[].fonteId` e o adaptador converte para `sourceId`; o snake_case (`source_id`) existe só dentro do orquestrador.

Feedback (M10): o botão "Útil / Não útil" aparece sob respostas `answer` e `not_in_data` **sem** `contacts` (`canRateMessage` em `chat.model.ts`); uma avaliação por resposta. O corpo (`POST .../avaliacoes`) leva só a nota e os `fonteIds` das fontes mostradas (vazio em `not_in_data`): nenhum texto de pergunta, resposta ou arquivo, para não registrar conteúdo do usuário. O orquestrador exige sessão existente (404 `NEG-002` → `SESSION_NOT_FOUND`) e `nota` válida (400 `VAL-001`); não exige que o nó atual seja o da resposta (a conversa já pode ter avançado). Avaliar não conta como interação que habilita "Recomeçar" e não depende de o agente estar ocupado. Se o envio falhar, o front desfaz o "Obrigado pelo feedback." e mostra "Não foi possível enviar o feedback. Tente novamente.", sem criar mensagem de erro na conversa. No mock, `ChatMockServer.feedbackLog` guarda as notas.

### 9.3 Erros

Toda resposta não 2xx traz Problem Details (seção 2.4). O `ChatApiService` converte status e `code` num `ChatErrorCode`
e o widget mostra o texto de `CHAT_ERROR_TEXTS` (`src/app/chat/chat-texts.ts`), nunca `message`, acrescido do
"código de suporte" quando houver `traceId`. Os códigos marcados "novo" e os textos alterados entraram na Fase 6
(`FORBIDDEN` já existia desde a Fase 4).

Implementação (`toRequestError` em `chat-api.service.ts`): ordem de decisão = código antigo do corpo (os códigos da
proposta anterior ao v1, se vierem) → código v1 pela tabela abaixo → status (403 → `FORBIDDEN`, 413 sem corpo →
`SEND_TOO_LARGE`, 429 → `RATE_LIMITED`, resto → `SERVICE_UNAVAILABLE`). Entende tanto a `HttpErrorResponse` crua quanto o
`ApiProblem` do interceptor. O `ChatRequestError` leva o `traceId`; `ChatSessionService` o põe em `ChatMessage.supportCode`
da mensagem de erro e o widget mostra, em linha própria abaixo do texto, "Código de suporte: " (`CHAT_SUPPORT_CODE_LABEL`,
derivado de `SUPPORT_CODE_TEXT` de `core/http/http-error-texts.ts`) seguido do valor, selecionável de uma vez
(`user-select: all`). Sem `traceId`, a linha não aparece.

| HTTP | `code` v1 | `ChatErrorCode` do front | Texto (pt-BR) |
|---|---|---|---|
| 400 | `VAL-001` | `INVALID_ACTION` | "Não foi possível processar essa opção. Escolha uma das opções disponíveis." |
| 422 | `NEG-001` (ação fora do passo; `passoId` desatualizado) | `INVALID_ACTION` | idem |
| 404 | `NEG-002` (sessão expirada, inexistente ou de outro usuário) | `SESSION_NOT_FOUND` | `CHAT_TEXTS.sessionExpired`; o widget avisa e abre outra sessão |
| 413 | `VAL-003` (arquivo acima do limite) | `FILE_TOO_LARGE` | alterado na Fase 6: "O arquivo é maior que o permitido. O limite é de 9 MB por envio." |
| 413 | `VAL-004` (envio acima de 9 MB) ou sem corpo (gateway, acima de 10 MB) | `SEND_TOO_LARGE` (novo) | "Os documentos somam mais de 9 MB. Envie menos arquivos por vez." |
| 422 | `NEG-003` (cota de 20 MB da conversa) | `SESSION_QUOTA_EXCEEDED` | "O limite de 20 MB por conversa foi atingido. Recomece para enviar outro documento." |
| 415 | `VAL-002` (extensão ou tipo real fora da lista) | `FILE_TYPE_NOT_ALLOWED` | "Arquivo não aceito. Envie PDF, Word (DOC ou DOCX) ou imagem (PNG, JPG ou WEBP)." |
| 429 | — (gateway) | `RATE_LIMITED` | "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente." |
| 403 | `AUT-002`, `AUT-003` | `FORBIDDEN` (Fase 4) | "Você não tem acesso ao agente." |
| 401 | `AUT-001` | — | interceptor redireciona para `loginUrl` (seção 8) |
| 500, 502, 503, 504, rede | `SIS-001`, `SIS-002`, `SIS-003` ou sem corpo | `SERVICE_UNAVAILABLE` | "Não consegui responder agora. Tente novamente em instantes." |
| — (front) | consulta de quarentena passou de 2 minutos (9.7) | `FILE_CHECK_TIMEOUT` (novo) | "A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes." |

Recusa da **avaliação do conteúdo** (não é norma do setor financeiro) **não** é erro HTTP: o arquivo termina `APROVADO`
com `avaliacao.aceito: false` e `avaliacao.motivo`, e a `resposta` traz uma mensagem `FORA_DO_ESCOPO`; o passo continua
`ENVIO_ARQUIVO` se nenhum for aceito (com pelo menos um aceito, segue a transição `accepted`). Recusa da **quarentena**
também não é erro HTTP: o arquivo termina `REJEITADO` com `motivoRejeicao` (seção 9.7). Problema técnico síncrono em
qualquer arquivo (tipo, tamanho, soma, cota) recusa o envio inteiro com o código da tabela e nada é guardado.

Vários documentos (até 5 por envio, `CHAT_LIMITS.maxFilesPerSend` e `envio.maxArquivos`): o front valida cada um, envia
os válidos juntos e lista os outros ("nome: motivo"). A mensagem do usuário mostra cada arquivo com o veredito. Com mais
de um, o front põe na primeira mensagem do agente da resposta a tabela "Resultado da avaliação dos documentos"
(Arquivo, Resultado, Norma identificada, Observação ou tipo) com "Extrair em Excel" (`chat-file-results.ts`: Arquivo,
Tamanho, Resultado, Norma identificada, Emissor, Tipo de documento, Observação; arquivo
`agente-da-agenda-avaliacao-documentos-<aaaa-mm-dd>.xlsx`). Arquivo `REJEITADO` na quarentena entra na tabela com
Resultado "Recusado na verificação de segurança" (`CHAT_TEXTS.fileQuarantined`) e o motivo da quarentena na Observação.
Colar (Ctrl+V) no passo de upload envia o print copiado (nome
`imagem-colada-<hh>h<mm>m<ss>s.png`) ou os arquivos copiados no Explorer do Windows, com as mesmas validações.

### 9.4 Limites aplicados no front e repetidos no BFF e no orquestrador

| Limite | Valor | Constante |
|---|---|---|
| Corpo de qualquer requisição | 10 MB (Ingress/API Gateway) | — |
| Soma dos arquivos por envio | 9 MB (D4) | `CHAT_LIMITS.maxSendBytes`; o passo pode baixar com `envio.maxBytesPorEnvio` (`upload.maxSendBytes`), nunca subir (`sendLimitOf`) |
| Tamanho de um arquivo | até 9 MB (consequência do limite por envio) | `envio.maxBytesPorArquivo` (`upload.maxBytes`; 20 MB no mock), limitado no front ao limite por envio |
| Soma dos arquivos por conversa | 20 MB (mantido; confirmar com o BFF) | `CHAT_LIMITS.maxSessionBytes` |
| Caracteres por mensagem | 1000 | `CHAT_LIMITS.maxInputChars` (ou `entrada.maxCaracteres`) |
| Extensões | `.pdf .doc .docx .png .jpg .jpeg .webp` (Word: `application/msword`, `…wordprocessingml.document`; tipo vazio aceito, comum no Windows sem Office). `.doc` depende de extrator no orquestrador (risco no ADR-023) | `CHAT_LIMITS.allowedExtensions` / `allowedMimeTypes` |
| Arquivos por envio | 5 | `CHAT_LIMITS.maxFilesPerSend` (e `envio.maxArquivos` do passo) |
| Rodadas de esclarecimento por passo | 3 | decidido no orquestrador; no mock `maxClarificationRounds` |
| Consulta de arquivo em verificação | a cada 2 s (ou `Retry-After`, entre 1 e 10 s), até 2 minutos por envio; 3 falhas seguidas (5xx ou rede) encerram | `FILE_CHECK_INTERVAL_MS`, `FILE_CHECK_TIMEOUT_MS`, `FILE_CHECK_MAX_FAILURES` e `retryAfterMs` em `chat-api.service.ts` |

Implementação Fase 6 (`validateChatFiles` em `chat-file.ts`, usado pela entrada do chat antes de enviar): cada arquivo é
validado com o limite por arquivo reduzido ao limite por envio; a soma dos aceitos no lote não passa de 9 MB. O arquivo que
passaria da soma fica de fora com `SEND_TOO_LARGE` ("nome: Os documentos somam mais de 9 MB. Envie menos arquivos por
vez."), e os seguintes, menores, ainda podem ir. Cota de 20 MB por conversa e regras por arquivo (`validateChatFile`)
continuam como antes. O BFF repete tudo e responde 413 `VAL-004` (→ `SEND_TOO_LARGE`).

### 9.5 Mock: `src/assets/data/chat-fluxo-mock.json`

Simula o BFF e o orquestrador enquanto eles não existem (ADR-002); o `ChatApiService` lê o arquivo quando `chatMock` é `true` (hoje `true` em todos os ambientes). Formato = interfaces da seção 9.2 (o modelo interno, não o v1: o `ChatMockServer` substitui o BFF **depois** dos adaptadores, que têm testes próprios e são exercitados contra o BFF falso do smoke); o `ChatMockServer` (`chat-mock-server.ts`) aplica as regras abaixo. Quarentena no mock (Fase 6): depois da latência normal, o `ChatApiService` emite `{ checking: [true, …] }` e só entrega o veredito após `MOCK_FILE_CHECK_MS` (1,5 s; `mockFileCheckMs` no `CHAT_API_CONFIG` troca o valor nos testes), para o estado "Verificando o documento..." aparecer. O limite de 9 MB por envio é aplicado pela entrada do chat; o `ChatMockServer` mantém as verificações por arquivo e a cota de 20 MB como antes. Normas, trechos e contato são fictícios (contato: `contato@compliance.com.br`). Estrutura:

| Chave | Conteúdo |
|---|---|
| `start`, `welcome` | nó inicial e mensagens de boas-vindas (`ChatApiMessage[]`, sem saudação) |
| `user` | usuário que o mock "identifica" (`{ "firstName": "Vinicius" }`), devolvido na criação da sessão (no v1 vem de `GET /v1/usuarios/me`) |
| `nodes` | `ChatNode` por id: `inicio` (menu: consultar norma, avaliar documento, normas a classificar, normas não aderentes, próximas normas a entrar em vigor), `normas_classificar`/`normas_nao_aderentes`/`normas_proximas_vigencia` (listas de demonstração, menu com "Nova consulta"), `consultar_tema` (texto), `enviar_arquivo` (upload), `pergunta_sobre_arquivo` (texto), `fim` (menu: "Posso ajudar em mais alguma coisa?" com "Nova consulta") |
| `transitions` | `nó → evento → próximo nó`: opções do menu, `answered` (resposta segura), `accepted` (arquivo aceito) |
| `askNode` | nó de perguntas usado por `action: 'ask'` (`consultar_tema`) |
| `lists` | `ChatNormList` por id de nó (`normas_classificar`, `normas_nao_aderentes`, `normas_proximas_vigencia`); vai como `normList` na mensagem do `prompt` ao entrar no nó |
| `back` | nó para onde `action: 'back'` volta (todo nó com `canGoBack: true` precisa de entrada) |
| `contacts` | listas de contatos por referência (`geral`) |
| `maxClarificationRounds`, `maxOutOfScope` | 3 e 3 |
| `textScenarios` | regras por palavra-chave, na ordem: `fora_do_escopo` (futebol, clima…) e `resposta_com_fontes` (prazo, resolução…) |
| `fallbacks` | `needMoreInfo` (texto com até `minWordsForAnswer`−1 palavras; traz `quickReplies` que levam a uma resposta), `notInData`, `roundsExceeded` e `outOfScopeLimit` (os dois trazem `contactsRef`) |
| `fileScenarios` | `accepted` (com `normIdentifiers`, distribuídos entre os aceitos), `rejected` (nome do arquivo com `filenameKeywords` → recusado), `summary` (texto para vários arquivos com `{total}`, `{accepted}`, `{rejected}`) e `quarantine` (antivírus falso por nome: `filenameKeywords` por motivo — `FILE_REJECTED_UNSAFE`: "virus", "ameaca"; `FILE_CHECK_FAILED`: "senha", "protegido"; `FILE_CONTENT_NOT_SUPPORTED`: "macro", "danificado" — e `messages`, a resposta quando o único documento foi barrado; arquivo barrado não conta na cota); o nó `enviar_arquivo` aceita PDF, Word e imagens, até 5 por vez |

Encerrar (M31): é uma ação do front, sem rota própria. A sugestão "Encerrar" (aparece depois que o usuário interagiu, em qualquer passo que não seja o final) faz o front chamar `DELETE /v1/agente/sessoes/{sessaoId}` (apaga sessão, arquivos e histórico no orquestrador), acrescentar localmente a despedida (`CHAT_TEXTS.farewell`: "Foi um prazer ajudar! … Até logo!") e passar a um passo local `closed` (tipo `end`) em que só resta "Recomeçar". O painel **não** é fechado nem minimizado: a conversa continua visível e minimizar ou recomeçar é escolha do usuário. A despedida não é resposta: sem `status`, sem fontes e sem pedido de feedback. Uma mensagem digitada que seja só despedida ("tchau", "obrigado, era só isso", "pode encerrar"; `isFarewellMessage` em `chat-farewell.ts`) aparece como mensagem do usuário e encerra do mesmo jeito, sem ir ao BFF; com qualquer outra palavra ("obrigado, e qual o prazo?") é enviada normalmente. Depois de encerrada, reabrir o painel não abre sessão nova; só "Recomeçar" abre

Mock de repetição e cancelamento: o `ChatMockServer` guarda as últimas 20 respostas por `requestId` e o estado anterior ao último pedido; `cancel` desfaz esse pedido (o mock responde na hora, então "Parar" durante a latência simulada sempre desfaz).

Regra do mock para texto livre: `fora_do_escopo` → `out_of_scope` (não conta rodada); `resposta_com_fontes` → `answer` e segue `answered`; menos de 3 palavras → `needMoreInfo`; demais → `notInData`; a 3ª rodada sem resposta segura vira `roundsExceeded` com os contatos.

### 9.6 Receita de adaptação

Passos 1 a 4 feitos (Fase 4: erros e saudação; Fase 6: caminhos, adaptadores e quarentena). Falta o 5.

1. Feito: `ChatApiService` chama os caminhos v1 (seção 9.1) pelo `ApiService`, com os adaptadores de
   `chat-v1-adapters.ts` para os nomes e enumerações da seção 11.6; `chat.model.ts` continua como tipo interno do widget.
2. Feito: envio de arquivos: 202 → "Verificando o documento..." e consulta de cada arquivo (seção 9.7); só então
   aplica `resposta` e os vereditos (a mesma lógica do `ChatFileReply`).
3. Feito: Problem Details → `ChatErrorCode` pela tabela 9.3, com "código de suporte"; 401 fica com o interceptor (seção 8).
4. Feito: saudação por `GET /v1/usuarios/me` no lugar de `ChatSessionReply.user`.
5. Pôr `chatMock: false` na configuração de execução, remover `chat-fluxo-mock.json` e `chat-mock-server.ts` (e o ramo
   de mock do `ChatApiService`) só quando o BFF e o orquestrador estiverem no ar em DES.
6. Manter `safeMarkdown` e `CHAT_ERROR_TEXTS`: o front não confia em HTML nem em mensagens de erro do servidor.

### 9.7 Quarentena e consulta de arquivos (suposição S5)

Todo documento vai primeiro para o bucket de quarentena; o antivírus corporativo verifica; só depois o orquestrador abre o
arquivo (páginas, JavaScript em PDF, macro em DOCX, extração de texto) e chama o modelo (gate). Estados de
`ArquivoAgente.status`:

| Estado | Significado | Tela (pt-BR) |
|---|---|---|
| `EM_VERIFICACAO` | na quarentena ou em avaliação | mensagem transitória `CHAT_TEXTS.fileChecking` (novo): "Verificando o documento..." (vários: "Verificando os documentos...") |
| `APROVADO` + `avaliacao.aceito: true` | passou no antivírus e é norma do setor financeiro | veredito "Aceito"; segue o fluxo |
| `APROVADO` + `avaliacao.aceito: false` | passou no antivírus, mas não é norma | veredito "Recusado" com `avaliacao.motivo` |
| `REJEITADO` + `AMEACA_DETECTADA` | antivírus encontrou ameaça; objeto apagado | `CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE` (novo): "O documento não passou na verificação de segurança e foi descartado. Envie outro arquivo." |
| `REJEITADO` + `VERIFICACAO_FALHOU` | antivírus não conseguiu verificar (ex.: protegido por senha) | `CHAT_ERROR_TEXTS.FILE_CHECK_FAILED` (novo): "Não foi possível verificar o documento. Envie uma versão sem senha ou em outro formato." |
| `REJEITADO` + `CONTEUDO_NAO_SUPORTADO` | PDF com JavaScript, DOCX com macro, mais de 200 páginas ou arquivo corrompido | `CHAT_ERROR_TEXTS.FILE_CONTENT_NOT_SUPPORTED` (novo): "Este documento não pode ser avaliado (conteúdo ativo, mais de 200 páginas ou arquivo danificado)." |
| consulta passou de 2 minutos | o front para de consultar e chama `cancelamentos` | `CHAT_ERROR_TEXTS.FILE_CHECK_TIMEOUT` (novo): "A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes." |

Algoritmo do front: depois do 202, a cada 2 s (ou o `Retry-After` recebido) consulta `GET .../arquivos/{arquivoId}` de
cada arquivo ainda `EM_VERIFICACAO`; quando todos saem desse estado, a consulta do último traz `resposta` (`passo` e
`mensagens` do agente para o envio inteiro), que o front aplica como aplica hoje a `ChatFileReply`. Erro 404 na consulta
= sessão expirada (`SESSION_NOT_FOUND`); 5xx repetido três vezes = `SERVICE_UNAVAILABLE`. "Parar" interrompe a consulta
e chama `cancelamentos` com o `requisicaoId` do envio. Bytes contam para a cota da conversa desde o 202; arquivo
`REJEITADO` devolve a cota.

Implementação Fase 6:

- `ChatApiService.sendFiles` devolve `Observable<ChatFileEvent>`: `{ checking }` logo após o 202 e a cada mudança, depois
  a `ChatFileReply` (e completa). As consultas de uma rodada vão juntas (`forkJoin`); a espera seguinte é o `Retry-After`
  da primeira resposta (segundos, mantido entre 1 e 10 s; ausente ou em data HTTP = 2 s). Todos fora de `EM_VERIFICACAO`
  sem `resposta` ainda: a rodada seguinte consulta só o último arquivo. 3 falhas seguidas (5xx, rede ou corpo fora do
  contrato) = `SERVICE_UNAVAILABLE`; uma rodada boa zera a contagem; outro 4xx encerra com o código da tabela 9.3.
- Prazo: 2 minutos contados do 202. Passou: o próprio `ChatApiService` chama `cancelamentos` (sem esperar a resposta) e
  falha com `FILE_CHECK_TIMEOUT`, que aparece como erro com "Tentar novamente" (repete o envio com o mesmo
  `requisicaoId`).
- Cancelar a inscrição ("Parar", "Recomeçar", "Encerrar") para as consultas na hora; "Parar" chama `cancelamentos` pelo
  `ChatSessionService` (o mesmo caminho dos outros pedidos).
- Tela: cada anexo ainda na quarentena mostra "· Verificando o documento..." (`ChatAttachment.checking`) e entra uma nota
  de sistema transitória "Verificando o documento..." (vários: "Verificando os documentos..."), no lugar dos pontos de
  "digitando"; "Parar" continua visível. As duas saem quando o envio termina, falha ou é interrompido. A lista é
  `role="log"` com `aria-live="polite"`, então a nota e a troca para "Documento aceito"/"Documento não aceito" são
  anunciadas pelo leitor de tela. Recusa da quarentena: o anexo mostra "Documento não aceito" e, abaixo, o texto do
  motivo (`ChatAttachment.reason`); a recusa da avaliação de conteúdo continua só na mensagem do agente e na tabela.

## 10. Resumo: remover, trocar, manter

| Item | Ação na adaptação ao v1 |
|---|---|
| `DashboardChartsData.random()` e geração em `initMainChart` | Só no mock; `dataMock: false` usa `GET /v1/normativos-recebidos` (`setTrafficData`, Fase 5). Remover quando o mock sair |
| `max: 250` do eixo y do gráfico Normativos Recebidos | Só no mock; com dados do BFF o máximo é calculado (Fase 5) |
| `PERIOD_END` (31/12/2021) em `period-range.ts` | Trocar por hoje ou pela `dataReferencia` do BFF |
| `SegmentCardsService.mockUrl` e `src/assets/data/dashboard-segments.json` | Feito (Fase 5): `GET /v1/segmentos` + `fromSegmentosV1` com `dataMock: false`; mock e `validateSegmentCards` mantidos |
| `ClassificationDataService` e `src/assets/data/dashboard-classificacao.json` | Feito (Fase 5): `getNormasPage` (`GET /v1/normas-classificadas`, paginado) e `getSummary` (`/resumo`); `aggregateClassification`/`pageClassified` só no mock (`localClassificationQueries`) |
| `EmailsDataService.mockUrl` e `src/assets/data/dashboard-emails.json` | Feito (Fase 5): `getAggregate` = `GET /v1/emails-sugestao/resumo` + `GET /v1/emails-sugestao` (últimos 5); `aggregateEmails` só no mock (`localEmailQueries`); `validateEmails` e o componente mantidos |
| Paginação, ordenação e Excel da Tabela Analítica | Feito (Fase 5): servidor (seção 2.2); Excel percorre páginas de 100 até 5.000 linhas |
| `waterfall-derive.ts` (+ spec), `WaterfallDataService.mockUrl`/`shareReplay` e `src/assets/data/dashboard-waterfall.json` | `GET /v1/cascatas-resultado` ligado na Fase 5 (`dataMock: false`); remover estes quando o mock sair |
| Mensagens de erro dos blocos | Feito (Fase 5): `<app-api-error-text>` com texto pt-BR e código de suporte (seção 2.4) |
| `TRAFFIC_SERIES`, `TO_CLASSIFY_INDEX`, `renderMainChart`, `trafficSummary`, destaque/filtro | Manter |
| `period-range.ts`, `PeriodFilterComponent`, mensagens e limites | Manter |
| `buildWaterfall`, `MAX_PARTS_PER_STEP`, `waterfall-format.ts`, componente da Cascata | Manter |
| Pipes/Intl pt-BR, tokens de cor, assinatura de `appliedTheme$` | Manter |
| Serviço base (`api.service.ts`) | Manter; base `apiBase` (configuração de execução) + `/v1/...` |
| Interceptor de erros e de 401, `HTTP_ERROR_TEXTS`, CSRF | Criado na Fase 4 (`src/app/core/http/`; seções 2.4 e 8) |
| `chat-fluxo-mock.json`, `ChatMockServer` e `chatMock` | Atualizar ao v1 na Fase 6 (inclusive quarentena); trocar pela API com o BFF e o orquestrador em DES; manter `chat.model.ts`, `safe-markdown.ts`, `chat-texts.ts`, `ChatSessionService` |

## 11. De-para de campos: interface do front ↔ schema v1

Uma linha por campo das interfaces de dados. "Só no front" = calculado ou criado pelo widget, nunca vem do BFF. Os nomes
v1 estão em `docs/contratos/openapi-agenda-normativa-v1.yaml` (`components.schemas`). Cada adaptador fica ao lado do
modelo (`*.adapter.ts`, receita em `mapeamento-de-dados.md` §2) e tem spec com uma fixture v1. Adaptadores da Fase 5 (um
por recurso, funções puras; interfaces `*V1` com os nomes do OpenAPI, conferidas nos specs, D9):

| Recurso | Arquivo | Funções |
|---|---|---|
| `GET /v1/segmentos` | `views/widgets/widgets-dropdown/segment-cards.adapter.ts` | `fromSegmentosV1` |
| `GET /v1/normativos-recebidos` | `views/dashboard/traffic/traffic.adapter.ts` | `fromNormativosRecebidosV1` |
| `GET /v1/normas-classificadas` e `/resumo` | `views/dashboard/classification/classification.adapter.ts` | `fromPaginaNormasV1`, `fromNormaClassificadaV1`, `fromResumoNormasV1`, `normasPageParams`, `summaryParams` |
| `GET /v1/emails-sugestao` e `/resumo` | `views/dashboard/emails/emails.adapter.ts` | `fromPaginaEmailsV1`, `fromEmailSugestaoV1`, `fromNormaSugeridaV1`, `fromResumoEmailsV1`, `emailsSummaryParams`, `latestEmailsParams` |
| `GET /v1/cascatas-resultado` | `views/scalation/waterfall/waterfall.adapter.ts` | `fromCascataV1` |
| Domínios e parâmetros comuns | `views/dashboard/v1-domains.ts`, `core/http/api-page.ts` | `segmentFromV1`, `segmentToV1`, `granularityToV1`, `granularityFromV1`, `periodParams`, `rangeParams`, `fromSpringPage` |

### 11.1 Cards de segmento (`SegmentCardsData`, `SegmentCard` ← `SegmentosResposta`, `Segmento`)

| Front | v1 | Conversão |
|---|---|---|
| `SegmentCardsData.asOf` | `SegmentosResposta.dataReferencia` | igual (`yyyy-MM-dd`) |
| `SegmentCardsData.segments` | `SegmentosResposta.segmentos` | ordenar por `TRAFFIC_SERIES` |
| `SegmentCard.id` | `Segmento.id` | `ATACADO` → `atacado` (11.7) |
| `SegmentCard.label` | `Segmento.nome` | igual (ou domínio do front) |
| `SegmentCard.icon` | — | só no front: `id` → ícone |
| `SegmentCard.total` | `Segmento.total` | igual |
| `SegmentCard.toClassify` | `Segmento.aClassificar` | igual |
| `SegmentCard.trend` | `Segmento.tendencia` | igual |

### 11.2 Normativos Recebidos (`TrafficResponse`, proposta ← `NormativosRecebidos`)

| Front | v1 | Conversão |
|---|---|---|
| `TrafficResponse.period` | `NormativosRecebidos.granularidade` | `DIA`/`MES`/`ANO` → `Day`/`Month`/`Year` |
| `TrafficResponse.start` | `NormativosRecebidos.inicio` | igual |
| `TrafficResponse.end` | `NormativosRecebidos.fim` | igual |
| `TrafficResponse.points` | `NormativosRecebidos.pontos` | igual |
| `TrafficResponse.segments` | `NormativosRecebidos.segmentos` | ordenar por `TRAFFIC_SERIES` |
| `segments[].segment` | `SerieSegmento.segmento` | 11.7 |
| `segments[].label` | `SerieSegmento.nome` | igual |
| `segments[].classified` | `SerieSegmento.classificadas` | igual |
| `segments[].toClassify` | `SerieSegmento.aClassificar` | igual |
| `TrafficSeries.*`, `TrafficSummaryItem.*` | — | só no front (cores, legenda, totais e participação) |

### 11.3 Classificação (`ClassificationData`, `ClassifiedNorma`, `ClassificationAggregate`, `ThemeShare`)

| Front | v1 | Conversão |
|---|---|---|
| `ClassificationData.asOf` | `ResumoNormasClassificadas.dataReferencia` | igual |
| `ClassificationData.normas` | `PaginaNormasClassificadas.content` | uma página por vez (a tabela guarda só a página visível) |
| `ClassifiedNorma.code` | `NormaClassificada.codigo` | igual |
| `ClassifiedNorma.orgao` | `NormaClassificada.orgao` | igual |
| `ClassifiedNorma.tipo` | `NormaClassificada.tipo` | igual |
| `ClassifiedNorma.numero` | `NormaClassificada.numero` | igual |
| `ClassifiedNorma.classifiedAt` | `NormaClassificada.dataClassificacao` | igual (`yyyy-MM-dd`) |
| `ClassifiedNorma.segment` | `NormaClassificada.segmento` | 11.7 |
| `ClassifiedNorma.theme` | `NormaClassificada.tema` | igual |
| `ClassifiedNorma.applicable` | `NormaClassificada.aplicavel` | igual |
| `ClassifiedNorma.area` | `NormaClassificada.area` | igual |
| `ClassifiedNorma.diretoria` | `NormaClassificada.diretoria` | igual |
| `ClassificationAggregate.total` | `ResumoNormasClassificadas.total` | igual |
| `ClassificationAggregate.applicable` | `ResumoNormasClassificadas.aplicaveis` | igual |
| `ClassificationAggregate.notApplicable` | `ResumoNormasClassificadas.naoAplicaveis` | igual |
| `ClassificationAggregate.applicableShare` | — | só no front: `aplicaveis / total` (0 sem normas) |
| `ClassificationAggregate.themesTotal` | `ResumoNormasClassificadas.totalTemas` | igual |
| `ClassificationAggregate.themes` | `ResumoNormasClassificadas.temas` | um `ThemeShare` por item |
| `ClassificationAggregate.others` | `ResumoNormasClassificadas.outrosTemas` | `null` → `null` |
| `ThemeShare.label` | `TemaQuantidade.tema` | "Outros temas" no item de `outrosTemas` |
| `ThemeShare.count` | `TemaQuantidade.quantidade` / `OutrosTemas.quantidade` | igual |
| `ThemeShare.share` | — | só no front: `quantidade / totalTemas` |
| `ThemeShare.width` | — | só no front: `quantidade / maior quantidade`; 0 em "Outros temas" |
| `ThemeShare.grouped` | `OutrosTemas.temasAgrupados` | 0 nos temas nomeados |
| `ClassificationFilters.segment`, `.theme`, `.themesOf` | parâmetros `segmento`, `tema`, `temasDe` | `themesOf: true` → `APLICAVEIS` |

### 11.4 E-mails de sugestão (`EmailsData`, `SuggestionEmail`, `SuggestedNorma`, `EmailsAggregate`, `EmailBucket`)

| Front | v1 | Conversão |
|---|---|---|
| `EmailsData.asOf` | `ResumoEmailsSugestao.dataReferencia` | igual |
| `EmailsData.emails` | `PaginaEmailsSugestao.content` | só a página pedida (últimos 5) |
| `SuggestionEmail.id` | `EmailSugestao.id` | igual |
| `SuggestionEmail.sentAt` | `EmailSugestao.dataEnvio` | igual (ISO 8601 com deslocamento) |
| `SuggestionEmail.subject` | `EmailSugestao.assunto` | igual (não exibido) |
| `SuggestionEmail.segment` | `EmailSugestao.segmento` | 11.7 |
| `SuggestionEmail.recipients` | `EmailSugestao.destinatarios` | igual (não exibido) |
| `SuggestionEmail.normas` | `EmailSugestao.normas` | um `SuggestedNorma` por item |
| `SuggestedNorma.code` | `NormaSugerida.codigo` | igual |
| `SuggestedNorma.orgao` | `NormaSugerida.orgao` | igual |
| `SuggestedNorma.tipo` | `NormaSugerida.tipo` | igual |
| `SuggestedNorma.numero` | `NormaSugerida.numero` | igual |
| `SuggestedNorma.title` | `NormaSugerida.tema` | igual |
| `SuggestedNorma.suggestedClass` | `NormaSugerida.classeSugerida` | `APLICAVEL` → `Aplicável` etc. (11.7) |
| `SuggestedNorma.area` | `NormaSugerida.area` | igual |
| `SuggestedNorma.diretoria` | `NormaSugerida.diretoria` | igual |
| `EmailsAggregate.subtitle` | — | só no front: `buildTrafficPeriod(period, bounds).subtitle` |
| `EmailsAggregate.buckets` | `ResumoEmailsSugestao.periodos` | um `EmailBucket` por item, na ordem |
| `EmailsAggregate.emails` | `ResumoEmailsSugestao.totalEmails` | igual |
| `EmailsAggregate.normas` | `ResumoEmailsSugestao.totalNormas` | igual |
| `EmailsAggregate.distinctNormas` | `ResumoEmailsSugestao.normasDistintas` | igual |
| `EmailsAggregate.averagePerEmail` | `ResumoEmailsSugestao.mediaNormasPorEmail` | igual |
| `EmailsAggregate.segmentNormas` | `ResumoEmailsSugestao.normasPorSegmento` | lista de `quantidade` na ordem de `EMAIL_SEGMENT_IDS` |
| `EmailsAggregate.list` | `PaginaEmailsSugestao.content` (`size=5`, `dataEnvio,desc`) | igual |
| `EmailBucket.label` | `PeriodoEmails.inicio` | só no front: rótulo pt-BR por `buildTrafficPeriod` |
| `EmailBucket.emails` | `PeriodoEmails.emails` | igual |
| `EmailBucket.normas` | `PeriodoEmails.normasPorSegmento` | lista de `quantidade` na ordem de `EMAIL_SEGMENT_IDS` |
| `EmailBucket.total` | `PeriodoEmails.totalNormas` | igual |

### 11.5 Cascata (`WaterfallData`, `WaterfallStep`, `WaterfallPart` ← `CascataResultado`)

| Front | v1 | Conversão |
|---|---|---|
| `WaterfallData.period` | `CascataResultado.periodo` | ausente → `buildTrafficPeriod(...).subtitle` |
| `WaterfallData.baseYear` | — | só no mock (sai com `deriveWaterfall`) |
| `WaterfallData.currency` | `CascataResultado.moeda` | igual |
| `WaterfallData.unitScale` | `CascataResultado.escalaUnidade` | igual |
| `WaterfallData.steps` | `CascataResultado.etapas` | na ordem |
| `WaterfallStep.id` | `EtapaCascata.id` | igual |
| `WaterfallStep.label` | `EtapaCascata.rotulo` | igual |
| `WaterfallStep.kind` | `EtapaCascata.tipo` | `TOTAL` → `total`, `REDUCAO` → `decrease` |
| `WaterfallStep.parts` | `EtapaCascata.partes` | na ordem |
| `WaterfallPart.label` | `ParteCascata.rotulo` | igual |
| `WaterfallPart.value` | `ParteCascata.valor` | igual |
| `WaterfallModel.*`, `WaterfallColumn.*`, `WaterfallSegment.*` | — | só no front (`buildWaterfall`) |

### 11.6 Chat do agente (`src/app/chat/chat.model.ts`)

| Front | v1 | Conversão |
|---|---|---|
| `ChatSessionReply.sessionId` | `SessaoAgente.sessaoId` | igual |
| `ChatSessionReply.node` | `SessaoAgente.passo` | `PassoAgente` → `ChatNode` |
| `ChatSessionReply.messages` | `SessaoAgente.mensagens` | `MensagemAgente` → `ChatApiMessage` |
| `ChatSessionReply.user` | `UsuarioAtual` (`GET /v1/usuarios/me`) | sai da sessão (S4) |
| `ChatUser.firstName` | `UsuarioAtual.primeiroNome` | igual, depois `greetingName` |
| `ChatNode.id` | `PassoAgente.id` | igual |
| `ChatNode.type` | `PassoAgente.tipo` | `MENU`/`TEXTO_LIVRE`/`ENVIO_ARQUIVO`/`FIM` → `menu`/`free_text`/`upload`/`end` |
| `ChatNode.prompt` | `PassoAgente.enunciado` | igual |
| `ChatNode.options` | `PassoAgente.opcoes` | na ordem |
| `ChatNode.input` | `PassoAgente.entrada` | ver `ChatInputConfig` |
| `ChatNode.upload` | `PassoAgente.envio` | ver `ChatUploadConfig` |
| `ChatNode.canGoBack` | `PassoAgente.podeVoltar` | igual |
| `ChatOption.id` | `OpcaoPasso.id` | igual |
| `ChatOption.label` | `OpcaoPasso.rotulo` | igual |
| `ChatInputConfig.enabled` | `EntradaPasso.habilitada` | igual |
| `ChatInputConfig.placeholder` | `EntradaPasso.dica` | igual |
| `ChatInputConfig.maxChars` | `EntradaPasso.maxCaracteres` | igual |
| `ChatUploadConfig.accept` | `EnvioPasso.extensoes` | igual |
| `ChatUploadConfig.maxBytes` | `EnvioPasso.maxBytesPorArquivo` | igual |
| `ChatUploadConfig.maxSendBytes` | `EnvioPasso.maxBytesPorEnvio` | igual; nunca acima de `CHAT_LIMITS.maxSendBytes` (9 MB) |
| `ChatUploadConfig.maxFiles` | `EnvioPasso.maxArquivos` | igual |
| `ChatApiMessage.role` | `MensagemAgente.papel` | `AGENTE`/`USUARIO`/`SISTEMA` → `ai`/`user`/`system` |
| `ChatApiMessage.text` | `MensagemAgente.texto` | igual (markdown) |
| `ChatApiMessage.status` | `MensagemAgente.situacao` | `RESPOSTA`/`PRECISA_MAIS_INFORMACAO`/`FORA_DOS_DADOS`/`FORA_DO_ESCOPO` → `answer`/`need_more_info`/`not_in_data`/`out_of_scope`; `error` só no front |
| `ChatApiMessage.citations` | `MensagemAgente.citacoes` | ver `ChatCitation` |
| `ChatApiMessage.questions` | `MensagemAgente.perguntas` | igual |
| `ChatApiMessage.contacts` | `MensagemAgente.contatos` | ver `ChatContact` |
| `ChatApiMessage.quickReplies` | `MensagemAgente.respostasRapidas` | igual |
| `ChatApiMessage.normList` | `MensagemAgente.listaNormas` | ver `ChatNormList` |
| `ChatApiMessage.transient` | `MensagemAgente.transitoria` | igual |
| `ChatApiMessage.fileResults` | — | só no front (tabela de resultados) |
| `ChatCitation.sourceId` | `Citacao.fonteId` | igual |
| `ChatCitation.excerpt` | `Citacao.trecho` | igual |
| `ChatContact.name` | `Contato.nome` | igual |
| `ChatContact.area` | `Contato.area` | igual |
| `ChatContact.channel` | `Contato.canal` | igual |
| `ChatNormList.dateLabel` | `ListaNormas.rotuloData` | igual |
| `ChatNormList.items` | `ListaNormas.itens` | na ordem |
| `ChatNormItem.id` | `ItemListaNormas.id` | igual |
| `ChatNormItem.title` | `ItemListaNormas.titulo` | igual |
| `ChatNormItem.detail` | `ItemListaNormas.detalhe` | igual |
| `ChatNormItem.segment` | `ItemListaNormas.segmento` | igual (nome como na tela) |
| `ChatNormItem.date` | `ItemListaNormas.data` | igual |
| `ChatReply.node` | `RespostaAgente.passo` | `ChatNode` |
| `ChatReply.messages` | `RespostaAgente.mensagens` | `ChatApiMessage[]` |
| `ChatMessageRequest.sessionId` | caminho `{sessaoId}` | sai do corpo |
| `ChatMessageRequest.nodeId` | `PedidoMensagem.passoId` | igual |
| `ChatMessageRequest.action` | `PedidoMensagem.acao` | `option`/`text`/`back`/`restart`/`ask` → `OPCAO`/`TEXTO`/`VOLTAR`/`RECOMECAR`/`PERGUNTAR` |
| `ChatMessageRequest.optionId` | `PedidoMensagem.opcaoId` | igual |
| `ChatMessageRequest.text` | `PedidoMensagem.texto` | igual |
| `ChatMessageRequest.requestId` | `PedidoMensagem.requisicaoId` | igual |
| `ChatFileReply.files` | `ArquivoAgente[]` (consultas da seção 9.7) | um `ChatFileResult` por arquivo, na ordem enviada |
| `ChatFileResult.id` | `ArquivoAgente.arquivoId` | igual |
| `ChatFileResult.accepted` | `ArquivoAgente.avaliacao.aceito` | `REJEITADO` → `false` |
| `ChatFileResult.reason` | `ArquivoAgente.avaliacao.motivo` | `REJEITADO` → texto do `motivoRejeicao` (9.7) |
| `ChatFileResult.metadata` | `ArquivoAgente.avaliacao.metadados` | `tipoDocumento` → `documentKind`, `emissor` → `issuer`, `identificacaoNorma` → `normIdentifier` |
| `ChatCancelRequest.sessionId` | caminho `{sessaoId}` | sai do corpo |
| `ChatCancelRequest.requestId` | `PedidoCancelamento.requisicaoId` | igual |
| `ChatCancelReply.node` | `RespostaCancelamento.passo` | `ChatNode` |
| `ChatFeedbackRequest.sessionId` | caminho `{sessaoId}` | sai do corpo |
| `ChatFeedbackRequest.rating` | `PedidoAvaliacao.nota` | `useful`/`not_useful` → `UTIL`/`NAO_UTIL` |
| `ChatFeedbackRequest.sourceIds` | `PedidoAvaliacao.fonteIds` | igual |
| `ChatApiError.code` | `ProblemDetail.status` + `ProblemDetail.code` | tabela 9.3 |
| `ChatApiError.message` | `ProblemDetail.message` | nunca exibido |
| — | `ProblemDetail.traceId` | "código de suporte" (2.4) |
| `ChatMessage.id`, `.createdAt`, `.feedback`, `.feedbackError`, `.files` | — | só no front |
| `ChatAttachment.name`, `.sizeBytes`, `.accepted` | — | só no front (`accepted` vem do veredito) |
| `ChatFileResultRow.name`, `.sizeBytes`, `.result` | — | só no front |
| `ChatSuggestion.kind`, `.label`, `.option` | — | só no front |

### 11.7 Domínios (enumerações v1 → valores do front)

| Domínio | v1 | Front |
|---|---|---|
| Segmento | `ATACADO`, `CORPORATIVO`, `PLATAFORMA`, `VAREJO` | `atacado`, `corporativo`, `plataforma`, `varejo` |
| Granularidade | `DIA`, `MES`, `ANO` | `Day`, `Month`, `Year` |
| Classe sugerida | `APLICAVEL`, `APLICAVEL_PARCIALMENTE`, `NAO_APLICAVEL` | `Aplicável`, `Aplicável parcialmente`, `Não aplicável` |
| Temas de | `APLICAVEIS`, `NAO_APLICAVEIS` | `themesOf: true`, `false` |
| Tipo de etapa | `TOTAL`, `REDUCAO` | `total`, `decrease` |
| Tipo de passo | `MENU`, `TEXTO_LIVRE`, `ENVIO_ARQUIVO`, `FIM` | `menu`, `free_text`, `upload`, `end` |
| Papel | `AGENTE`, `USUARIO`, `SISTEMA` | `ai`, `user`, `system` |
| Situação | `RESPOSTA`, `PRECISA_MAIS_INFORMACAO`, `FORA_DOS_DADOS`, `FORA_DO_ESCOPO` | `answer`, `need_more_info`, `not_in_data`, `out_of_scope` |
| Ação | `OPCAO`, `TEXTO`, `VOLTAR`, `RECOMECAR`, `PERGUNTAR` | `option`, `text`, `back`, `restart`, `ask` |
| Nota | `UTIL`, `NAO_UTIL` | `useful`, `not_useful` |
| Status do arquivo | `EM_VERIFICACAO`, `APROVADO`, `REJEITADO` | estado do anexo no widget (9.7) |

Valor fora do domínio: o adaptador lança erro e o bloco mostra a mensagem de falha de carga (nunca exibe o valor cru).
