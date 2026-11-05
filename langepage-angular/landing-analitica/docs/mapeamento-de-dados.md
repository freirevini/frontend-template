# Mapeamento de dados: tela × produção

<!-- data-contract-hash: 4e23011e9f1c -->

Documento para ligar **rápido** as páginas aos dados de produção, sem mudar o que a tela mostra. Lista cada campo que a
tela consome, o formato exato que o front espera, o **campo do contrato v1** que o entrega
(`docs/contratos/openapi-agenda-normativa-v1.yaml`, ADR-023) e a **coluna em produção** de onde o BFF o lê.

Caminho do dado em produção: camada `dvry_corp_compliance` do PDBD (BigQuery) → API da Ilha de Dados
(`sboot-pdbd-base-atom-ilha-dados`) → BFF `sboot-<sigla>-base-bff-agenda-normativa` (`/api/v1/...`) → adaptador no front →
interface do front. Nem o front nem o BFF consultam o BigQuery direto. Tabelas e colunas ainda não foram informadas
(pergunta Q8 do plano de adequação): toda célula "Coluna em produção" está como "a confirmar em `dvry_corp_compliance`".

Regra R13: toda mudança em interface de dados, domínio de valores ou campo exibido atualiza este documento na mesma entrega.
O carimbo `data-contract-hash` acima é verificado por `npm run docs:check` (ver seção 7); se as interfaces mudarem, o check falha
até este documento ser revisado e o carimbo atualizado.

Contratos completos (validações, cálculos, endpoints v1, de-para campo a campo com o v1): `docs/contratos-de-dados.md`
(seção 11). Aqui fica o "de-para" com produção.

---

## 1. Como usar (usuário)

1. Para cada linha das tabelas da seção 3, troque "a confirmar em `dvry_corp_compliance`" pelo nome real
   (`dvry_corp_compliance.<tabela>.<coluna>` ou o campo devolvido pela API da Ilha de Dados). Indique também a **origem**
   de cada bloco (tabela/visão e endpoint da Ilha de Dados) na linha "Origem" de cada seção.
2. Preencha os **domínios** da seção 4 (ex.: como produção escreve o segmento "Atacado": `ATC`, `1`, `ATACADO`...).
3. Se um campo não existe em produção, escreva `— sem fonte —`: a IA para e pergunta (R11) em vez de inventar.
4. Pode preencher aqui ou colar a lista no chat ("`dataClassificacao` = `DT_CLASSIFICACAO`, ..."); a IA copia para este
   documento e repassa ao time do BFF (a coluna é lida pelo BFF, não pelo front).

## 2. Receita de ligação (IA)

Objetivo: **a tela continua idêntica**. Só a origem dos dados muda. Estado (Fase 5): os adaptadores do front já existem
(`contratos-de-dados.md` §11, um por recurso, com spec) e cada serviço de dados escolhe a origem por `dataMock` no
`env.json`; ligar = o BFF entregar o v1 com as colunas abaixo e o ambiente pôr `"dataMock": false`. Os passos 2 a 4 abaixo
valem para recurso novo ou para ajustar um adaptador. São dois de-para:

- **BFF:** coluna de `dvry_corp_compliance` (via Ilha de Dados) → campo v1. Responsabilidade do time do BFF, guiada pela
  coluna "Coluna em produção" desta página e pelos domínios da seção 4 (o BFF entrega os valores v1, ex. `ATACADO`).
- **Front:** campo v1 → interface do front. É o adaptador abaixo; de-para completo em `contratos-de-dados.md` §11.

1. **Não alterar** interfaces (`SegmentCard`, `SuggestionEmail`, `SuggestedNorma`, `ClassifiedNorma`, ...), validações
   (`validate*`), componentes, textos nem estilos. Tudo isso já está testado. Agregações (`aggregate*`, `filterClassified`)
   ficam para o mock: com o v1 os resumos chegam prontos (`contratos-de-dados.md` §2.3).
2. Para cada bloco, criar um **adaptador** ao lado do modelo, por exemplo `classification/classification.adapter.ts`:
   - tipos do v1 (`NormaClassificada`, `PaginaNormasClassificadas`, `ResumoNormasClassificadas`...) escritos à mão a partir
     do OpenAPI (D9 do ADR-023);
   - `export function fromV1(item: NormaClassificada): ClassifiedNorma` fazendo só **de-para e conversão de formato**
     (enumerações da seção 4 e de `contratos-de-dados.md` §11.7). Nenhuma regra de negócio no adaptador.
3. No serviço de dados (`*-data.service.ts`), trocar o `mockUrl` pela chamada do serviço base (R4: `apiBase` + `/v1/...`) e
   encadear `map(fromV1...)` **antes** do `validate*`. O componente não muda (a Tabela Analítica passa a pedir página a
   página, `contratos-de-dados.md` §2.2).
4. **Spec do adaptador** com uma amostra v1 anonimizada (3 a 5 itens) como fixture: cada campo convertido, cada domínio da
   seção 4, e um item inválido chegando ao `validate*` com a mensagem esperada. O mesmo spec confere os nomes contra o
   OpenAPI (D9).
5. **Conferir que reflete exatamente** (seção 6) e rodar `npm run verify`.
6. Atualizar este documento (coluna "Coluna em produção" preenchida, origem, data da ligação) e `docs/changelog.md`.

## 3. Campos por bloco da página Triagent

Ordem dos blocos como na tela. "Front" é o nome exato no código; "Formato" é o que o adaptador precisa entregar.

### 3.1 Cards de segmento (topo da página; também no Scalation, tom petróleo, e no Início, visão geral)

Interface `SegmentCardsData` / `SegmentCard` (`src/app/views/widgets/widgets-dropdown/segment-cards.service.ts`).
Mock: `src/assets/data/dashboard-segments.json`. v1: `GET /api/v1/segmentos`. Origem em produção: a confirmar em `dvry_corp_compliance`

| Front | Formato | Exemplo | Onde aparece | Campo v1 | Coluna em produção |
|---|---|---|---|---|---|
| `SegmentCardsData.asOf` | data `yyyy-MM-dd` (fotografia) | `2021-12-31` | referência dos números "a classificar" | `SegmentosResposta.dataReferencia` | a confirmar em `dvry_corp_compliance` |
| `SegmentCardsData.segments` | lista, um item por segmento (4 itens, ordem 4.1) | | os quatro cards | `SegmentosResposta.segmentos` | a confirmar em `dvry_corp_compliance` (uma linha por segmento) |
| `SegmentCard.id` | domínio de segmento (seção 4.1) | `atacado` | chave do filtro "a classificar" | `Segmento.id` | a confirmar em `dvry_corp_compliance` |
| `SegmentCard.label` | texto pt-BR (glossário) | `Atacado` | nome no card | `Segmento.nome` | a confirmar em `dvry_corp_compliance` (pode vir do front, seção 4.1) |
| `SegmentCard.icon` | nome de ícone do subset | `cilTruck` | ícone do card | — | **não buscar**: mapear `id` → ícone no adaptador |
| `SegmentCard.total` | inteiro ≥ 0 | `54` | número grande do card; no Início, "normas" | `Segmento.total` | a confirmar em `dvry_corp_compliance` |
| `SegmentCard.toClassify` | inteiro ≥ 0, ≤ `total` | `7` | selo "7 a classificar"; no Início, "a classificar" | `Segmento.aClassificar` | a confirmar em `dvry_corp_compliance` |
| `SegmentCard.trend` | lista de números, mais antigo primeiro | `[65, 59, 84]` | mini-gráfico de linha (no Início, de área) | `Segmento.tendencia` | a confirmar em `dvry_corp_compliance` |

### 3.2 Normativos Recebidos (gráfico de linhas)

Mock (`dataMock: true`): o código **gera números aleatórios** (`DashboardChartsData.initMainChart`). v1: `GET /api/v1/normativos-recebidos`
→ `fromNormativosRecebidosV1` → `TrafficResponse` / `TrafficSegmentSeries` (`src/app/views/dashboard/traffic/traffic-data.service.ts`,
Fase 5; `docs/contratos-de-dados.md` §4). Origem em produção: a confirmar em `dvry_corp_compliance`

| Front | Formato | Exemplo | Onde aparece | Campo v1 | Coluna em produção |
|---|---|---|---|---|---|
| `TrafficResponse.period` | `Day` \| `Month` \| `Year` | `Month` | granularidade pedida | `NormativosRecebidos.granularidade` | parâmetro `granularidade` (`DIA`, `MES`, `ANO`) |
| `TrafficResponse.start` / `end` | `yyyy-MM-dd` | `2021-01-01` | período do filtro | `NormativosRecebidos.inicio` / `fim` | parâmetros `inicio`, `fim` |
| `TrafficResponse.points[]` | `yyyy-MM-dd`, `yyyy-MM` ou `yyyy`, em ordem | `2021-10` | eixo x | `NormativosRecebidos.pontos` | a confirmar em `dvry_corp_compliance` (data agrupada) |
| `segments[].segment` | domínio de segmento (4.1) | `varejo` | uma linha por segmento | `SerieSegmento.segmento` | a confirmar em `dvry_corp_compliance` |
| `segments[].label` | texto pt-BR | `Varejo` | não exibido (legenda usa `TRAFFIC_SERIES`) | `SerieSegmento.nome` | — (domínio 4.1) |
| `segments[].classified[]` | inteiro ≥ 0 por ponto | `150` | linhas sólidas (Atacado, Corporativo, Plataforma, Varejo) | `SerieSegmento.classificadas` | a confirmar em `dvry_corp_compliance` |
| `segments[].toClassify[]` | inteiro ≥ 0 por ponto | `4` | linha tracejada "Normas a Classificar" (soma ou segmento filtrado) | `SerieSegmento.aClassificar` | a confirmar em `dvry_corp_compliance` |

### 3.3 Normas Aplicáveis (pizza), Assunto das Normas Aplicáveis e Tabela Analítica

Os três blocos usam a **mesma fonte**: uma linha por norma classificada. Interface `ClassificationData` / `ClassifiedNorma`
(`src/app/views/dashboard/classification/classification.model.ts`). Mock: `src/assets/data/dashboard-classificacao.json`.
v1: `GET /api/v1/normas-classificadas` (Tabela Analítica, paginado) e `GET /api/v1/normas-classificadas/resumo` (pizza e
temas). Origem em produção: a confirmar em `dvry_corp_compliance`

| Front | Formato | Exemplo | Onde aparece | Campo v1 | Coluna em produção |
|---|---|---|---|---|---|
| `ClassificationData.asOf` | `yyyy-MM-dd` | `2021-12-31` | referência | `ResumoNormasClassificadas.dataReferencia` | a confirmar em `dvry_corp_compliance` |
| `ClassificationData.normas` | lista, uma linha por norma classificada | | pizza, temas e Tabela Analítica | `PaginaNormasClassificadas.content` | a confirmar em `dvry_corp_compliance` (linhas da origem) |
| `ClassifiedNorma.code` | texto único por norma | `Resolução CMN 4.855` | chave; desempate da ordenação | `NormaClassificada.codigo` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.orgao` | texto | `CMN` | Tabela Analítica "Órgão" | `NormaClassificada.orgao` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.tipo` | texto | `Resolução` | Tabela Analítica "Tipo" | `NormaClassificada.tipo` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.numero` | texto como publicado (milhar com ponto) | `4.855` | Tabela Analítica "Número" (ordena pelo valor) | `NormaClassificada.numero` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.classifiedAt` | `yyyy-MM-dd` (data da classificação, sem hora) | `2021-03-02` | filtro de período do gráfico Normativos Recebidos; "Data da classificação" | `NormaClassificada.dataClassificacao` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.segment` | domínio de segmento (4.1) | `varejo` | filtro "a classificar"; coluna "Segmento" | `NormaClassificada.segmento` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.theme` | texto (agrupado como vier) | `Pix: regras de devolução e limites` | lista de temas; filtro por tema; coluna "Tema" | `NormaClassificada.tema` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.applicable` | booleano (domínio 4.3) | `true` | pizza; filtro por fatia; coluna "Aplicável ao banco?" (Sim/Não) | `NormaClassificada.aplicavel` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.area` | texto | `Meios de Pagamento` | coluna "Área" | `NormaClassificada.area` | a confirmar em `dvry_corp_compliance` |
| `ClassifiedNorma.diretoria` | texto | `Operações` | coluna "Diretoria" | `NormaClassificada.diretoria` | a confirmar em `dvry_corp_compliance` |

### 3.4 Fluxo de e-mail - Triagem

Interfaces `EmailsData` / `SuggestionEmail` / `SuggestedNorma` (`src/app/views/dashboard/emails/emails.model.ts`).
Mock: `src/assets/data/dashboard-emails.json`. v1: `GET /api/v1/emails-sugestao` (lista paginada) e
`GET /api/v1/emails-sugestao/resumo` (indicadores e barras). Origem em produção: a confirmar em `dvry_corp_compliance`

| Front | Formato | Exemplo | Onde aparece | Campo v1 | Coluna em produção |
|---|---|---|---|---|---|
| `EmailsData.asOf` | `yyyy-MM-dd` | `2021-12-31` | referência | `ResumoEmailsSugestao.dataReferencia` | a confirmar em `dvry_corp_compliance` |
| `EmailsData.emails` | lista, um item por e-mail enviado | | gráfico, indicadores, "Últimos e-mails" | `PaginaEmailsSugestao.content` | a confirmar em `dvry_corp_compliance` (linhas da origem) |
| `SuggestionEmail.id` | texto único | `em-2021-12-28-001` | chave da lista | `EmailSugestao.id` | a confirmar em `dvry_corp_compliance` |
| `SuggestionEmail.sentAt` | ISO 8601 com fuso (`yyyy-MM-ddTHH:mm:ss-03:00`) | `2021-12-28T09:14:00-03:00` | barras por período; data na lista (sem hora) | `EmailSugestao.dataEnvio` | a confirmar em `dvry_corp_compliance` |
| `SuggestionEmail.subject` | texto | `Sugestões de classificação — Atacado` | não exibido (mantido no contrato) | `EmailSugestao.assunto` | a confirmar em `dvry_corp_compliance` |
| `SuggestionEmail.segment` | domínio de segmento (4.1) | `atacado` | cor/pilha do segmento; filtro "a classificar" | `EmailSugestao.segmento` | a confirmar em `dvry_corp_compliance` |
| `SuggestionEmail.recipients` | inteiro ≥ 0 | `3` | não exibido (mantido no contrato) | `EmailSugestao.destinatarios` | a confirmar em `dvry_corp_compliance` |
| `SuggestionEmail.normas[]` | lista, ao menos 1 | | número de normas; tabela ao abrir o e-mail | `EmailSugestao.normas` | a confirmar em `dvry_corp_compliance` (relação e-mail → normas) |
| `SuggestedNorma.code` | texto | `Resolução CMN 5.123` | "N distintas" | `NormaSugerida.codigo` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.orgao` | texto | `CMN` | coluna "Órgão" | `NormaSugerida.orgao` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.tipo` | texto | `Resolução` | coluna "Tipo" | `NormaSugerida.tipo` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.numero` | texto | `5.123` | coluna "Número" | `NormaSugerida.numero` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.title` | texto | `Gerenciamento de riscos e de capital` | coluna "Tema" | `NormaSugerida.tema` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.suggestedClass` | domínio 4.2 | `Aplicável` | coluna "Aplicável ao segmento?" | `NormaSugerida.classeSugerida` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.area` | texto | `Gestão de Capital` | coluna "Área" | `NormaSugerida.area` | a confirmar em `dvry_corp_compliance` |
| `SuggestedNorma.diretoria` | texto | `Riscos` | coluna "Diretoria" | `NormaSugerida.diretoria` | a confirmar em `dvry_corp_compliance` |

### 3.5 Cascata do resultado (página Scalation)

Interfaces `WaterfallData` / `WaterfallStep` / `WaterfallPart` (`src/app/views/scalation/waterfall/waterfall.model.ts`).
Mock: `src/assets/data/dashboard-waterfall.json` (base anual 2021). Hoje `deriveWaterfall` (`waterfall-derive.ts`) deriva
qualquer período da base anual; com dados reais o BFF devolve a cascata do período pedido e a derivação é removida (ADR-006).
v1: `GET /api/v1/cascatas-resultado`. Origem em produção: a confirmar (a cascata ainda não tem fonte conhecida no PDBD;
pergunta Q8 do plano de adequação)

| Front | Formato | Exemplo | Onde aparece | Campo v1 | Coluna em produção |
|---|---|---|---|---|---|
| `WaterfallData.period` | texto pt-BR do período | `Janeiro a dezembro de 2021` | subtítulo do card; descrição acessível | `CascataResultado.periodo` | a confirmar em `dvry_corp_compliance` (o front pode montar pelo filtro) |
| `WaterfallData.baseYear` | inteiro, opcional | `2021` | só a derivação do mock | — | **não buscar**: some com a derivação |
| `WaterfallData.currency` | código ISO 4217 | `BRL` | formato `R$` | `CascataResultado.moeda` | a confirmar em `dvry_corp_compliance` |
| `WaterfallData.unitScale` | inteiro (fator dos valores) | `1000000` | `R$ 15 mi` | `CascataResultado.escalaUnidade` | a confirmar em `dvry_corp_compliance` (ou fixo no adaptador) |
| `WaterfallData.steps` | lista ordenada; a 1ª etapa `total` define a base (`result` = nível após a última; a última `total` deve ser igual à base menos as reduções, regra não validada no front) | | colunas da cascata, legenda, tabela | `CascataResultado.etapas` | a confirmar em `dvry_corp_compliance` (uma linha por etapa) |
| `WaterfallStep.id` | texto único, kebab-case | `gross-revenue` | chave da coluna | `EtapaCascata.id` | a confirmar em `dvry_corp_compliance` |
| `WaterfallStep.label` | texto pt-BR | `Receita bruta` | rótulo do eixo x e da tabela | `EtapaCascata.rotulo` | a confirmar em `dvry_corp_compliance` |
| `WaterfallStep.kind` | `total` \| `decrease` | `decrease` | cor (rampa azul ou vermelha) e sinal | `EtapaCascata.tipo` | a confirmar em `dvry_corp_compliance` |
| `WaterfallStep.parts` | lista de 1 a 3 itens | | segmentos empilhados da coluna | `EtapaCascata.partes` | a confirmar em `dvry_corp_compliance` (uma linha por parte) |
| `WaterfallPart.label` | texto pt-BR | `Impostos` | legenda e tooltip | `ParteCascata.rotulo` | a confirmar em `dvry_corp_compliance` |
| `WaterfallPart.value` | número ≥ 0, na unidade `unitScale` | `15` | altura do segmento; tabela | `ParteCascata.valor` | a confirmar em `dvry_corp_compliance` |

## 4. Domínios de valores

### 4.1 Segmento

Ordem fixa (alfabética, igual às cores validadas `--app-series-1..4`). O front sempre usa o `id`; o adaptador converte.

| `id` no front | v1 (`SegmentoId`) | Rótulo na tela | Ícone | Valor em produção |
|---|---|---|---|---|
| `atacado` | `ATACADO` | Atacado | `cilTruck` | a confirmar em `dvry_corp_compliance` |
| `corporativo` | `CORPORATIVO` | Corporativo | `cilBuilding` | a confirmar em `dvry_corp_compliance` |
| `plataforma` | `PLATAFORMA` | Plataforma | `cilDevices` | a confirmar em `dvry_corp_compliance` |
| `varejo` | `VAREJO` | Varejo | `cilCart` | a confirmar em `dvry_corp_compliance` |

Segmento novo em produção não entra sem decisão: muda paleta validada, legenda e glossário (R10, R11).

### 4.2 Sugestão de classificação (e-mails)

| Valor no front (`SuggestedClass`) | v1 (`ClasseSugerida`) | Mostrado em "Aplicável ao segmento?" | Valor em produção |
|---|---|---|---|
| `Aplicável` | `APLICAVEL` | Sim | a confirmar em `dvry_corp_compliance` |
| `Aplicável parcialmente` | `APLICAVEL_PARCIALMENTE` | Parcialmente | a confirmar em `dvry_corp_compliance` |
| `Não aplicável` | `NAO_APLICAVEL` | Não | a confirmar em `dvry_corp_compliance` |

### 4.3 Aplicável ao banco (classificação)

| Valor no front (`applicable`) | v1 (`aplicavel`) | Mostrado | Valor em produção |
|---|---|---|---|
| `true` | `true` | Aplicáveis / Sim | a confirmar em `dvry_corp_compliance` |
| `false` | `false` | Não aplicáveis / Não | a confirmar em `dvry_corp_compliance` |

## 5. O que NÃO vem de coluna de produção

Não procurar coluna para estes valores. Com o v1, parte deles é agregada pelo BFF (a partir das mesmas colunas da seção 3)
e parte continua calculada no front:

| Valor na tela | Com o mock (hoje) | Com o v1 |
|---|---|---|
| Totais, "N distintas" e "Média por e-mail" dos e-mails, barras por período | `aggregateEmails` (`emails-derive.ts`) | BFF: `ResumoEmailsSugestao` (`totalEmails`, `totalNormas`, `normasDistintas`, `mediaNormasPorEmail`, `periodos`); % e rótulos no front |
| Total classificado, aplicáveis/não aplicáveis, ranking de temas, "Outros temas" | `aggregateClassification` (`classification-derive.ts`) | BFF: `ResumoNormasClassificadas`; % e largura das barras no front |
| Linhas da Tabela Analítica com filtros, ordenação, páginas, Excel | `pageClassified` (`filterClassified` + `sortClassified`), pedido página a página como no v1 | BFF: `PaginaNormasClassificadas` (`page`, `size`, `sort`, filtros); Excel percorre páginas de 100 até 5.000 linhas (`collectPages`) |
| Linha "Normas a Classificar" somada, legenda do gráfico Normativos Recebidos (total e participação) | `DashboardChartsData` (`seriesValues`, `trafficSummary`) | igual (front) |
| Rótulos de período, subtítulos, datas `dd/mm/aaaa`, números `1.234` | `buildTrafficPeriod`, `Intl`/pipes pt-BR | igual (front) |
| Ícone e rótulo do segmento | domínio 4.1 | igual (front) |
| Cascata: `WaterfallModel.columns`, `WaterfallModel.segments`, `WaterfallModel.base`, `WaterfallModel.result`; por coluna `WaterfallColumn.step`, `WaterfallColumn.total`, `WaterfallColumn.start`, `WaterfallColumn.end`, `WaterfallColumn.segments`; por segmento `WaterfallSegment.stepIndex`, `WaterfallSegment.partIndex`, `WaterfallSegment.stepLabel`, `WaterfallSegment.partLabel`, `WaterfallSegment.kind`, `WaterfallSegment.value`, `WaterfallSegment.low`, `WaterfallSegment.high`; `% da receita` | `buildWaterfall` (`waterfall.model.ts`), `formatShare`/`formatCurrency` (`waterfall-format.ts`) | igual (front) |

## 6. Conferência "reflete exatamente"

Depois de ligar, com um período e um segmento conhecidos, conferir contra uma consulta direta em produção:

1. Cards: `total` e `toClassify` de cada segmento = contagem em produção na data `asOf` (`dataReferencia` do v1).
2. Pizza: total classificado e aplicáveis no período = `count(*)` e `count(aplicável)` da fonte 3.3 no mesmo período.
3. Tabela Analítica: número de linhas ("1–15 de N", `totalElements` do v1) = total da pizza (`total` do resumo); mesmo N no
   Excel exportado (até 5.000).
4. Temas: soma das linhas (+ "Outros temas") = aplicáveis da pizza.
5. Filtro cruzado: tema escolhido → pizza = contagem daquele tema; fatia escolhida → tabela só com aquela classe.
6. E-mails: "E-mails enviados" e "Normas sugeridas" no período = contagens da fonte 3.4.
7. Normativos Recebidos: último ponto da linha "Normas a Classificar" filtrada por segmento coerente com `toClassify` do card (ver §3 de
   `contratos-de-dados.md`).
8. Cascata: `base` (1ª coluna) e `result` (última) iguais às somas das partes na origem; cada `decrease` com sinal negativo na tabela.

Diferença em qualquer item: corrigir o de-para (adaptador do front ou consulta do BFF), nunca o componente.

## 7. Manutenção (R13)

- Mudou interface de dados, domínio, campo exibido ou bloco novo na página: atualizar as seções 3 a 5 na mesma entrega.
- `npm run docs:check` (verificação 7) calcula o SHA-1 das declarações `export interface`/`export type` dos arquivos de contrato
  (`segment-cards.service.ts`, `emails.model.ts`, `classification.model.ts`, `waterfall.model.ts`) e compara com o carimbo do topo; também exige que
  cada campo dessas interfaces apareça neste documento como `Interface.campo`. Se falhar, revisar as tabelas e colar o carimbo
  que o check indicar.
- Página nova com dados: acrescentar uma seção "Campos por bloco" para ela e incluir seus arquivos de modelo na lista
  `DATA_CONTRACT_FILES` de `scripts/docs-check.js`.
- Cada página tem ficha em `docs/paginas/<slug>.md` (R15) com os mesmos `Interface.campo`; a ficha aponta para as seções daqui,
  nunca repete a coluna "Coluna em produção" (um lugar só para preencher).

## 8. Registro de ligações

| Data | Bloco | Origem em produção | Quem preencheu as colunas | Observações |
|---|---|---|---|---|
| — | — | — | — | Ainda tudo em mock (`src/assets/data/`). |
| 2026-11-04 | todos (Fase 5) | — | — | Adaptadores v1 e serviços com `dataMock` prontos e testados; `env.json` versionado segue `dataMock: true` até o BFF publicar o v1. |
| 2026-11-04 | todos | camada `dvry_corp_compliance` via API da Ilha de Dados (tabelas a confirmar) | — | Contrato v1 (`docs/contratos/openapi-agenda-normativa-v1.yaml`) e coluna "Campo v1" preenchidos; colunas de produção pendentes (Q8, ADR-023 S9). |
