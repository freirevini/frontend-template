# Contratos de dados

Fontes de dados do produto, como estão no mock (`data/`), os formatos e validações, o contrato **v1** com o BFF e o
contrato do Agente da Agenda. Regras: R4 (HTTP e BFF), R5 (identidade), R6 (ambientes), R12 (pt-BR). Decisão: ADR-009
(adequação aos padrões corporativos, contrato v1).

**Fonte da verdade do contrato:** o OpenAPI da landing Angular,
`../langepage-angular/landing-analitica/docs/contratos/openapi-agenda-normativa-v1.yaml` (OpenAPI 3.0.3, rascunho
contract-first entregue ao time do BFF), e o `docs/contratos-de-dados.md` de lá (seções 2, 9 e 11: paginação, erros,
quarentena e de-para campo a campo). Nomes de recurso, campo, parâmetro e código vêm de lá; este documento diz como cada
um chega à tela no Streamlit. Mudou o OpenAPI: os adaptadores `*_from_v1` de `core/data.py` e `core/chat.py`, os testes
`tests/test_data_v1.py` e `tests/test_chat_v1.py` e esta página mudam juntos.

Estado (2026-11-04): cliente v1, adaptadores, paginação no servidor, Excel paginado, Problem Details, 401/403 e quarentena
implementados e testados com o BFF simulado; o mock (`data/*.json`) continua igual. A troca mock → BFF é configuração
(F10, fora desta entrega).

## 1. Situação atual

| Fonte | Usada em | Mock (`bff.base_url` vazio) | BFF (contrato v1) | Função |
|---|---|---|---|---|
| Cards de segmento | Início, Triagent, Scalation | `data/dashboard-segments.json` | `GET /v1/segmentos` | `core.data.segments()` |
| Normativos Recebidos | Triagent | números aleatórios com semente por período (sem mock JSON) | `GET /v1/normativos-recebidos` | `core.data.traffic(period, bounds)`, `traffic_series` |
| Pizza e Assunto das Normas | Triagent | `data/dashboard-classificacao.json` (573 normas de 2021, 368 aplicáveis) agregado no app | `GET /v1/normas-classificadas/resumo` | `core.data.classification_summary(...)` |
| Tabela Analítica | Triagent | mesmo mock, filtrado, ordenado e paginado no app | `GET /v1/normas-classificadas` (paginado no servidor) | `classification()` (mock), `classified_page(...)`, `classified_export(...)` |
| Fluxo de e-mail - Triagem | Triagent | `data/dashboard-emails.json` (176 e-mails de 2021) agregado no app | `GET /v1/emails-sugestao/resumo` + `GET /v1/emails-sugestao` (últimos 5) | `core.data.emails_summary(period, bounds, segment)` |
| Cascata do resultado | Scalation | `data/dashboard-waterfall.json` + derivação por período | `GET /v1/cascatas-resultado` | `core.data.waterfall(period, bounds)`, `build_waterfall` |
| Filtro de período | Triagent, Scalation | lógica local; presets terminam em 31/12/2021 (fim do mock) | vira `granularidade`, `inicio`, `fim` | `core.period` |
| Agente da Agenda | layout (todas as páginas) | `data/chat-fluxo-mock.json` via `ChatMockServer` | `/v1/agente/sessoes/...` (§9) | `core.chat` |

### 1.1 Endpoints: proposta antiga → v1

As rotas `/conforme/...` eram a proposta anterior ao contrato e nunca existiram no BFF. O código usa só o v1.

| Antes (proposta) | v1 (relativo a `bff.base_url`) | Mudança |
|---|---|---|
| `GET /conforme/triagent/segmentos?start&end` | `GET /v1/segmentos[?dataReferencia]` | fotografia numa data, não período (o app não envia data: a última) |
| `GET /conforme/triagent/trafego?period&start&end` | `GET /v1/normativos-recebidos?granularidade&inicio&fim` | `Day/Month/Year` → `DIA/MES/ANO` |
| `GET /conforme/triagent/classificacoes` (todas as linhas) | `GET /v1/normas-classificadas?inicio&fim[&segmento][&aplicavel][&tema]&page&size&sort` + `GET /v1/normas-classificadas/resumo?inicio&fim[&segmento][&tema]&temasDe` | paginação obrigatória; pizza e temas já agregados |
| `GET /conforme/triagent/emails-sugestao` (todas as linhas) | `GET /v1/emails-sugestao?inicio&fim[&segmento]&page=0&size=5&sort=dataEnvio,desc` + `GET /v1/emails-sugestao/resumo?granularidade&inicio&fim[&segmento]` | idem |
| `GET /conforme/triagent/cascata?period&start&end` | `GET /v1/cascatas-resultado?granularidade&inicio&fim` | plural kebab-case |
| `user` em `POST /conforme/chat/sessao` | `GET /v1/usuarios/me` → `primeiroNome` | nome fora da sessão |
| `POST /conforme/chat/sessao` | `POST /v1/agente/sessoes` (201) | |
| `POST /conforme/chat/mensagem` | `POST /v1/agente/sessoes/{sessaoId}/mensagens` | sessão no caminho |
| `POST /conforme/chat/arquivo` | `POST /v1/agente/sessoes/{sessaoId}/arquivos` (202) + `GET /v1/agente/sessoes/{sessaoId}/arquivos/{arquivoId}` | quarentena assíncrona (§9.4) |
| `POST /conforme/chat/feedback` | `POST /v1/agente/sessoes/{sessaoId}/avaliacoes` (204) | |
| `POST /conforme/chat/cancelar` | `POST /v1/agente/sessoes/{sessaoId}/cancelamentos` | usado só no tempo esgotado da quarentena |
| `DELETE /conforme/chat/sessao/{id}` | `DELETE /v1/agente/sessoes/{sessaoId}` (204) | |

## 2. Cliente do BFF e troca mock → BFF (R4, R6)

- Única porta: `src/core/api.py`. URL = `bff.base_url` + `bff.prefix` + caminho relativo do recurso. `bff.base_url`
  (`settings.yaml`, variável `BFF_BASE_URL`) é o **caminho base da API do BFF** (o que o Ingress roteia como `/api`,
  equivalente ao `apiBase` da landing); `bff.prefix` é `/v1`. Assim `api.get_json("/segmentos")` chama
  `<bff.base_url>/v1/segmentos`. Nenhum outro arquivo monta URL. O formato do `settings.yaml` não mudou: só o valor
  de `bff.prefix` (antes `/conforme`).
- Funções: `get_json(path, params)` (exige objeto JSON; valor lista vira parâmetro repetido, `sort=a&sort=b`),
  `post_json(path, body)` (`None` em 204 ou corpo vazio), `post_multipart(path, fields, files, file_field="files")`
  (arquivos como partes repetidas, na ordem, `(nome, bytes, mime)`; o chat v1 usa `arquivos`), `delete(path)`. `path`
  relativo e começando por `/` (`ValueError` caso contrário); sem `bff.base_url`, `ApiError("SERVICE_UNAVAILABLE", 0)`
  antes de qualquer chamada.
- Cada chamada: timeout `bff.timeout_seconds` (padrão 10 s); cabeçalhos de `auth.forward_headers()` (`cookie`,
  `authorization`, `x-user-id`, `x-user-email` do gateway) + `x-request-id` (UUID novo por chamada) +
  `accept: application/json`. Em POST/PUT/PATCH/DELETE (multipart incluído) vai também `X-XSRF-TOKEN` com o valor do
  cookie `XSRF-TOKEN` repassado (`api.xsrf_token`, decodificado como no `HttpClient` do Angular; esquema `xsrf` do
  contrato); sem o cookie, o cabeçalho não vai e o BFF responde 403 `AUT-003` (§2.2).
- Cache: `data._fetch` guarda a resposta por caminho + query + **quem chamou** (`st.cache_data`, TTL
  `cache.ttl_seconds` = 300 s). A chave de quem chamou é `data.identity_key()`: SHA-256 dos cabeçalhos repassados
  (`cookie`, `authorization`, `x-user-*`), nunca o valor cru; dois usuários nunca dividem resposta, e falha (401/403)
  não é cacheada. O mock (`load_json`) continua com cache único. O chat e as páginas do Excel não são cacheados.
  Parâmetros `None` não vão na query; booleanos vão como `true`/`false`; os demais como texto.
- Chave do mock: `bff.base_url` vazio → `settings.use_mock_data()` verdadeiro → `core.data` lê `data/*.json` como
  antes. `chat.mock` (`CHAT_MOCK`) liga o mock do chat; com `base_url` vazio o chat também fica em mock.
- Datas em query string: `yyyy-MM-dd` (`period.iso`). Enumerações vão e voltam em MAIÚSCULAS (§11).

### 2.1 Paginação (envelope Spring `Page`)

| Regra | Valor |
|---|---|
| Parâmetros | `page` (0 = primeira), `size` (1 a 100, `MAX_PAGE_SIZE`), `sort=campo,asc\|desc` |
| Envelope | `content`, `totalElements` (lidos); `totalPages`, `number`, `size` e extras do Spring ignorados |
| Tabela Analítica | `size=15` (`PAGE_SIZE` da página); página da tela `p` (1, 2...) → `page=p-1`; "1–15 de N" e "Página X de Y" usam `totalElements`; `compat.pager` guarda a página e o app pede ao servidor só a página visível. Página além do fim (filtros encolheram a tabela) → o app pede de novo a última |
| Ordenação | coluna → campo: Data da classificação `dataClassificacao`, Órgão `orgao`, Tipo `tipo`, Número `numero` (valor numérico no servidor), Tema `tema`, Segmento `segmento`, Aplicável ao banco? `aplicavel`, Área `area`, Diretoria `diretoria` (`data.V1_SORT_FIELDS`); desempate `codigo,asc` no servidor |
| Filtros | período → `inicio`/`fim`; segmento da página → `segmento`; fatia da pizza → `aplicavel`; tema escolhido → `tema` |
| Mudou filtro, período ou ordenação | volta para a página 1 (assinatura dos filtros, como no mock) |
| Excel (D5) | sob demanda: só o clique em "Gerar Excel" chama `classified_export` (rerun comum não lê nada): `size=100` página a página, em sequência, até 5.000 linhas (no máximo 50 pedidos, `EXPORT_LIMIT`); com `totalElements` > 5.000 não exporta parcial: o botão fica desativado e aparece `EXPORT_LIMIT_TEXT` = "A tabela tem {total} linhas e o Excel aceita até 5.000. Refine os filtros para exportar." ({total} em pt-BR, `5.001`). O arquivo é montado no servidor por `core/xlsx.py` (R9), com as mesmas colunas e nome, e fica no `session_state` da sessão para os filtros atuais ("Baixar Excel"); as páginas do Excel não entram no cache (`data._bff_uncached`) |
| Últimos e-mails | `size=5` (`LATEST_EMAILS`), `sort=dataEnvio,desc` |

No mock nada muda: a Tabela Analítica filtra, ordena e pagina a lista inteira no app (`server_paging()` falso).

### 2.2 Erros (Problem Details, RFC 7807)

Toda resposta 4xx/5xx do BFF vem em `application/problem+json` com `timestamp`, `status`, `code`, `message`,
`details[]` e `traceId`. `api.parse_problem` lê **só** `code` e `traceId` (`message` e `details` nunca são guardados nem
mostrados); `traceId` só é aceito se for um token simples (`[A-Za-z0-9-]`, até 64). `ApiError` leva `code` (código de
tela), `status`, `problem_code` (`VAL-001`…), `trace_id` e `retry_after` (cabeçalho `Retry-After` em segundos; a forma
de data é ignorada). O código de tela sai do status e da família do `code`
(`api.code_for`); código desconhecido ou ausente (o gateway pode responder sem corpo) cai no que o status significa:

| HTTP | `code` v1 | `ApiError.code` | Páginas (texto) | Chat (texto, §9.3) |
|---|---|---|---|---|
| 401 | `AUT-001` | `AUTH_REQUIRED` | "Sua sessão expirou. Entre novamente." + link "Entrar novamente" | idem, sem "Tentar novamente" |
| 403 | `AUT-002` | `FORBIDDEN` | "Você não tem acesso a esta informação." | "Você não tem acesso ao agente." |
| 403 | `AUT-003` (XSRF ausente ou vencido) | `SESSION_RENEW` | "Sua sessão precisa ser renovada. Recarregue a página." | idem |
| 400 | `VAL-001`, `VAL-005` (outra família: `SERVICE_UNAVAILABLE`) | `INVALID_ACTION` | frase do bloco | "Não foi possível processar essa opção…" |
| 404 | `NEG-002` | `SESSION_NOT_FOUND` | frase do bloco | abre sessão nova (uma vez) |
| 413 | `VAL-003` / `VAL-004` ou sem corpo | `FILE_TOO_LARGE` / `SEND_TOO_LARGE` | — | ver §9.3 |
| 415 | `VAL-002` | `FILE_TYPE_NOT_ALLOWED` | — | ver §9.3 |
| 422 | `NEG-001` / `NEG-003` | `INVALID_ACTION` / `SESSION_QUOTA_EXCEEDED` | — | ver §9.3 |
| 429 | — | `RATE_LIMITED` | "Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente." | "Muitas mensagens em pouco tempo…" |
| 504 | `SIS-002` | `SERVICE_UNAVAILABLE` | "O servidor demorou a responder. Tente novamente em instantes." | "Não consegui responder agora…" |
| 500, 502, 503 | `SIS-003`, `SIS-001` | `SERVICE_UNAVAILABLE` | frase do bloco | "Não consegui responder agora…" |
| rede (status 0) | — | `SERVICE_UNAVAILABLE` | "Sem conexão com o servidor. Verifique a rede e tente novamente." | "Não consegui responder agora…" |

- Corpo com um código interno antigo (`SESSION_NOT_FOUND`, `INVALID_ACTION`…, formato anterior ao v1) ainda é aceito
  como está, exceto em 401/403, que valem sempre pelo status.
- Páginas: cada bloco chama `ui.data_error(frase do bloco, erro)`, que escolhe o texto por `api.error_text` (frase
  própria do bloco, salvo 401, 403, 429, 504 e rede), acrescenta o link "Entrar novamente" (`api.LOGIN_LINK_TEXT`) para
  `auth.login_url` no 401 (recarregar pelo gateway refaz a autenticação; padrão `/`) e a linha
  "Código de suporte: <traceId>" (`api.SUPPORT_CODE_TEXT`, D6) quando a resposta trouxe `traceId`. Falha de validação
  (não HTTP) mantém a frase do bloco.
- Textos em `api.HTTP_ERROR_TEXTS`, `LOGIN_LINK_TEXT`, `SUPPORT_CODE_TEXT`, `EXPORT_LIMIT_TEXT` (constantes pt-BR).
- CSRF (`X-XSRF-TOKEN`, suposição S3 do contrato): `core.api` copia o cookie `XSRF-TOKEN` repassado pelo gateway para o
  cabeçalho em POST/PUT/PATCH/DELETE (§2); 403 `AUT-003` tem texto próprio (`SESSION_RENEW`).

## 3. Cards de segmento — `data/dashboard-segments.json`

```json
{ "asOf": "2021-12-31",
  "segments": [ { "id": "atacado", "label": "Atacado", "icon": "cilTruck", "total": 54, "toClassify": 7,
                  "trend": [65, 59, 84, 84, 51, 55, 40] } ] }
```

| Campo | Formato | Regra (`segments()`, porte de `validateSegmentCards`) |
|---|---|---|
| `asOf` | `yyyy-MM-dd` | referência dos números; não exibido |
| `segments[]` | 4 itens, ordem alfabética | um card por item; ordem = ordem das séries (R10) |
| `id` | `atacado`, `corporativo`, `plataforma`, `varejo` | chave de cor (`tokens.segment_color`), do filtro e dos e-mails |
| `label` | texto pt-BR | nome do card |
| `icon` | nome de ícone CoreUI (`cilTruck` ou `cil-truck`) | `ui.icon` resolve o SVG em `src/static/icons/`; precisa existir lá |
| `total`, `toClassify` | inteiros ≥ 0, `toClassify ≤ total` | erro "Normas a classificar maiores que o total no segmento …" |
| `trend` | números, mais antigo primeiro (até 12) | minigráfico |

v1 (`segments_from_v1`): `dataReferencia` → `asOf`; `segmentos[]` → `segments[]` reordenados por `SEGMENT_IDS`;
`id` `ATACADO` → `atacado` (fora do domínio: `ValueError`); `nome` → `label`; `total`; `aClassificar` → `toClassify`;
`tendencia` → `trend` (cada ponto inteiro ≥ 0, `data._counts`; senão `ValueError` e a frase do bloco); `icon` só no app (`data.SEGMENT_ICONS`, os mesmos nomes do mock). Depois, a mesma validação.

## 4. Normativos Recebidos (sem mock JSON)

Em mock, `traffic(period, bounds)` gera números aleatórios por segmento dentro de `TRAFFIC_RANGE_BANDS` (160–240,
100–160, 55–105, 120–200) e "a classificar" em `TO_CLASSIFY_BAND` (3–12), com semente `period|start|end` (o mesmo
período mostra os mesmos números; faixas iguais às da landing). `TrafficData`: `labels`, `subtitle`,
`values[segmento][]`, `to_classify[segmento][]`. Linha de referência "Normas a Classificar" = soma dos segmentos ou só
do segmento em foco (`traffic_series`). Payload **PROPOSTA** `{ period, start, end, segments: [{ segment,
classified[], toClassify[] }] }`: `traffic_from_response` alinha por `segment` (nunca pela ordem), exige os quatro
segmentos, um ponto por rótulo do período e cada ponto inteiro ≥ 0 (`data._counts`; `ValueError` em pt-BR caso
contrário, mostrado pela página como "Não foi possível carregar os normativos recebidos.").

v1 (`traffic_from_v1`): `GET /v1/normativos-recebidos?granularidade&inicio&fim` → `NormativosRecebidos`;
`granularidade` → `period`, `pontos` → `points`, `segmentos[]` (`segmento`, `nome`, `classificadas`, `aClassificar`) →
`segments[]` (`segment`, `label`, `classified`, `toClassify`), depois `traffic_from_response`.

## 5. Classificação das normas — `data/dashboard-classificacao.json`

```json
{ "asOf": "2021-12-31",
  "normas": [ { "code": "Resolução CMN 4.855", "orgao": "CMN", "tipo": "Resolução", "numero": "4.855",
                "classifiedAt": "2021-03-02", "segment": "varejo", "theme": "Pix: regras de devolução e limites",
                "applicable": true, "area": "Meios de Pagamento", "diretoria": "Operações" } ] }
```

| Campo | Regra (porte de `validateClassification`) |
|---|---|
| `code` | obrigatório e único |
| `classifiedAt` | `YYYY-MM-DD`; filtro de período com as duas pontas inclusive |
| `segment` | domínio de segmento (§3) |
| `theme` | texto não vazio; agrupado como veio |
| `applicable` | booleano (aplicável ao banco) |
| `orgao`, `tipo`, `numero`, `area`, `diretoria` | texto não vazio (colunas da Tabela Analítica) |

`filter_classified(normas, bounds, segment, theme, applicable)` (ordem recebida); `aggregate_classification(...)`:
participação = aplicáveis / classificadas; temas das aplicáveis (ou das não aplicáveis, `themes_of=False`), maiores
primeiro com desempate pt-BR, 10 nomeados (`TOP_THEMES`) e o resto em "Outros temas" (um tema a mais entra nomeado,
nunca "Outros" com um só). Mensagens de validação em inglês como no TypeScript (não chegam à tela).

v1:
- Pizza e temas (`classification_summary` → `classification_aggregate_from_v1`): `total`, `aplicaveis`, `naoAplicaveis`,
  `totalTemas`, `temas[]` (`tema`, `quantidade`; até 10, 11 sem agrupar um só, ordem pronta do BFF), `outrosTemas`
  (`quantidade`, `temasAgrupados`, ou nulo). O app só calcula `applicable_share` (aplicáveis / total), `share`
  (quantidade / `totalTemas`) e `width` (quantidade / maior quantidade; 0 em "Outros temas"). Parâmetros: `inicio`,
  `fim`, `segmento`, `tema` (só a pizza), `temasDe` `APLICAVEIS`/`NAO_APLICAVEIS` (a lista segue a fatia escolhida).
- Tabela Analítica (`classified_page`, `classified_export` → `norma_from_v1`): `codigo` → `code`, `orgao`, `tipo`,
  `numero`, `dataClassificacao` → `classifiedAt`, `segmento` → `segment`, `tema` → `theme`, `aplicavel` → `applicable`,
  `area`, `diretoria`; cada página passa por `validate_classification`. Paginação e Excel em §2.1.
- `classification()` (lista inteira) existe só no mock; com o BFF levanta `RuntimeError`.

## 6. Fluxo de e-mail - Triagem — `data/dashboard-emails.json`

Cada e-mail: `id` (único), `sentAt` (ISO 8601 com deslocamento; usado como enviado, sem converter fuso), `subject` e
`recipients` (no contrato, não exibidos), `segment` (domínio §3), `normas[]` (≥ 1: `code`, `orgao`, `tipo`, `numero`,
`title` = Tema, `suggestedClass` ∈ `Aplicável`/`Aplicável parcialmente`/`Não aplicável` → "Sim"/"Parcialmente"/"Não"
na coluna "Aplicável ao segmento?", `area`, `diretoria`). `aggregate_emails(items, period, bounds, segment)`: barras
somam normas por envio; "N distintas" conta `code` únicos; "Últimos e-mails" = `LATEST_EMAILS` (5).

v1 (`emails_summary` → `emails_aggregate_from_v1`): `GET /v1/emails-sugestao/resumo` → `totalEmails`, `totalNormas`,
`normasDistintas`, `mediaNormasPorEmail`, `normasPorSegmento[]` (por `SEGMENT_IDS`; ausente conta 0) e `periodos[]` (um
por intervalo, vazios incluídos, na ordem; quantidade diferente dos rótulos de `build_traffic_period` → `ValueError`),
cada um com `emails`, `normasPorSegmento[]`, `totalNormas`; rótulos e subtítulo pt-BR montados no app.
`GET /v1/emails-sugestao?page=0&size=5&sort=dataEnvio,desc` → `content[]` (`email_from_v1`: `id`, `dataEnvio` →
`sentAt`, `assunto` → `subject`, `segmento` → `segment`, `destinatarios` → `recipients`, `normas[]` com `codigo` →
`code`, `tema` → `title`, `classeSugerida` `APLICAVEL`/`APLICAVEL_PARCIALMENTE`/`NAO_APLICAVEL` → `suggestedClass`),
validados por `validate_emails`. `emails()` (lista inteira) existe só no mock.

## 7. Cascata do resultado — `data/dashboard-waterfall.json`

`period` (texto pt-BR), `baseYear` (só a derivação), `currency` (ISO 4217, `BRL`), `unitScale` (`1000000`), `steps[]`
(`id` único, `label`, `kind` `total`|`decrease`, `parts[]` de 1 a 3 com `label` e `value ≥ 0`). `build_waterfall(steps)`
monta colunas e segmentos (a primeira etapa `total` é a base). `validate_waterfall(data)` (chamada por `waterfall()`, no
mock e no BFF) exige `steps` lista, `currency` com 3 letras maiúsculas (ISO 4217) e `unitScale` número finito maior que
zero; senão `ValueError`, e a página mostra "Não foi possível carregar os dados da cascata.". `derive_waterfall(base, period, bounds)` deriva qualquer
período da base anual: **temporária**, sai com o endpoint. `format_currency(value, unit_scale, currency)` →
`R$ 15 mi`, `−R$ 15 mi` (separadores são espaços inseparáveis U+00A0, como o `Intl`; menos tipográfico U+2212;
compacto `mil`/`mi`/`bi`/`tri` com 1 decimal, agrupamento de milhar só a partir de 5 dígitos; `US$`, `€`; código
desconhecido vai escapado, porque o texto chega ao `st.html`); `format_share(value, base)` → `30%`, `—` com base 0.

v1 (`waterfall_from_v1`): `GET /v1/cascatas-resultado?granularidade&inicio&fim` → `periodo` → `period` (ausente: o app
monta pelo filtro), `moeda` → `currency`, `escalaUnidade` → `unitScale`, `etapas[]` → `steps[]` (`rotulo` → `label`,
`tipo` `TOTAL`/`REDUCAO` → `kind` `total`/`decrease`, outro tipo → `ValueError`; `partes[]` com `rotulo`, `valor`).
Depois `validate_waterfall` (E-009) e `build_waterfall`; sem derivação.

## 8. Formatação pt-BR (R12)

| Onde | Função | Exemplo |
|---|---|---|
| Inteiros | `period.fmt_int` | `1.234` |
| Porcentagem | `period.fmt_percent` | `28%` |
| Decimal | `period.fmt_decimal` | `2,4` |
| Datas | `period.fmt_date`; `period.iso` para query | `31/12/2021`; `2021-12-31` |
| Rótulos e subtítulo do período | `period.build_traffic_period` | `Seg 27/12`, `Jan/21`, `Outubro a dezembro de 2021` |
| Data do header | `ui.header_date` | `terça-feira, 4 de novembro de 2026` |
| Moeda compacta | `data.format_currency` | `R$ 800 mil` |

## 9. Agente da Agenda (`/v1/agente/sessoes/...`)

Orquestração fora do app (BFF encaminha ao orquestrador; ADR-006, ADR-009); o Streamlit só consome. Estado da conversa
em `st.session_state`; nada em storage do navegador. `BffBackend` (`src/core/chat.py`) fala v1 e devolve os formatos
internos de sempre (`{sessionId, node, messages}`, `{node, messages, files}`): controlador, widget e mock não conhecem
os nomes v1.

### 9.1 Endpoints (relativos a `bff.base_url`)

| Método e caminho | Corpo | Resposta |
|---|---|---|
| `POST /v1/agente/sessoes` | vazio | 201 `{ sessaoId, passo, mensagens }` → `{ sessionId, node, messages }` |
| `GET /v1/usuarios/me` | — | `{ primeiroNome? }` → `user.firstName` (só para a saudação; falha = saudação sem nome) |
| `POST /v1/agente/sessoes/{sessaoId}/mensagens` | `{ passoId, acao, opcaoId?, texto?, requisicaoId }` | `{ passo, mensagens }` |
| `POST /v1/agente/sessoes/{sessaoId}/arquivos` | multipart: `passoId`, `requisicaoId`, `arquivos` (1 a 5, repetido, na ordem) | 202 `{ requisicaoId, arquivos[] }` (todos `EM_VERIFICACAO`) |
| `GET /v1/agente/sessoes/{sessaoId}/arquivos/{arquivoId}` | — | `ArquivoAgente`: `status`, `motivoRejeicao?`, `avaliacao?`, `resposta?` (§9.4) |
| `POST /v1/agente/sessoes/{sessaoId}/avaliacoes` | `{ nota: UTIL\|NAO_UTIL, fonteIds[] }` | 204 |
| `POST /v1/agente/sessoes/{sessaoId}/cancelamentos` | `{ requisicaoId }` | `{ passo }` (usado no tempo esgotado da quarentena; sem "Parar", ADR-006) |
| `DELETE /v1/agente/sessoes/{sessaoId}` | — | 204 (Encerrar/Recomeçar) |

`sessaoId` e `arquivoId` vão percent-encoded no caminho. `acao`: `OPCAO`, `TEXTO`, `VOLTAR`, `RECOMECAR`, `PERGUNTAR`
(do `option`, `text`, `back`, `restart`, `ask` internos). "Tentar novamente" repete o mesmo `requisicaoId`. Mensagem:
`papel` `AGENTE`/`USUARIO`/`SISTEMA` → `role` `ai`/`user`/`system`; `texto` (markdown simples, só por `safe_markdown`);
`situacao` `RESPOSTA`/`PRECISA_MAIS_INFORMACAO`/`FORA_DOS_DADOS`/`FORA_DO_ESCOPO` → `status` `answer`/`need_more_info`/
`not_in_data`/`out_of_scope` (`error` só no app); `citacoes` (`fonteId`, `trecho`), `perguntas`, `contatos` (`nome`,
`area`, `canal`), `respostasRapidas`, `listaNormas` (`rotuloData`, `itens[]` com `id`, `titulo`, `detalhe`, `segmento`,
`data`), `transitoria`. Passo: `tipo` `MENU`/`TEXTO_LIVRE`/`ENVIO_ARQUIVO`/`FIM` → `menu`/`free_text`/`upload`/`end`
(outro tipo → `SERVICE_UNAVAILABLE`), `enunciado` → `prompt`, `opcoes` (`id`, `rotulo`), `entrada` (`habilitada`,
`dica`, `maxCaracteres`), `envio` (`extensoes`, `maxBytesPorArquivo`, `maxBytesPorEnvio`, `maxArquivos`) → `upload`
(`accept`, `maxBytes`, `maxSendBytes`, `maxFiles`), `podeVoltar` → `canGoBack`. Saudação "Bom dia/Boa tarde/Boa
noite[, Nome]!" montada no app (nome de `auth.current_user()` ou de `usuarios/me`, filtrado por `greeting_name`).

### 9.2 Erros

Problem Details (§2.2) → `ApiError` → `ChatRequestError(code, status, trace_id)` (`_as_request_error`). O texto vem de
`chat.error_text(code)`: `ERROR_TEXTS` (códigos de sempre) e `V1_ERROR_TEXTS` (novos), nunca a mensagem do servidor.
Com `traceId`, a mensagem de erro ganha a linha "Código de suporte: <traceId>" (`TEXTS["supportCode"]`).

### 9.3 Códigos e textos do chat

| HTTP / origem | `code` v1 | Código do app | Texto (pt-BR) |
|---|---|---|---|
| 400 / 422 | `VAL-001` / `NEG-001` | `INVALID_ACTION` | "Não foi possível processar essa opção. Escolha uma das opções disponíveis." |
| 404 | `NEG-002` | `SESSION_NOT_FOUND` | aviso "A conversa expirou por inatividade. Vamos recomeçar." e sessão nova (no máximo uma por ação, E-010) |
| 413 | `VAL-003` | `FILE_TOO_LARGE` | "O arquivo é maior que o permitido. O limite é de 20 MB por conversa." (texto mantido; ver nota) |
| 413 | `VAL-004` ou sem corpo; validação local da soma | `SEND_TOO_LARGE` | "Os documentos somam mais de 9 MB. Envie menos arquivos por vez." |
| 422 | `NEG-003` | `SESSION_QUOTA_EXCEEDED` | "O limite de 20 MB por conversa foi atingido. Recomece para enviar outro documento." |
| 415 | `VAL-002` | `FILE_TYPE_NOT_ALLOWED` | "Arquivo não aceito. Envie PDF, Word (DOC ou DOCX) ou imagem (PNG, JPG ou WEBP)." |
| 429 | — | `RATE_LIMITED` | "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente." |
| 403 | `AUT-002` | `FORBIDDEN` | "Você não tem acesso ao agente." (com "Tentar novamente") |
| 403 | `AUT-003` | `SESSION_RENEW` | "Sua sessão precisa ser renovada. Recarregue a página." |
| 401 | `AUT-001` | `AUTH_REQUIRED` | "Sua sessão expirou. Entre novamente." + link "Entrar novamente" (`auth.login_url`); sem "Tentar novamente" e sem abrir sessão a cada rerun (`ChatState.auth_required`) |
| quarentena além de 2 min | — | `FILE_CHECK_TIMEOUT` | "A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes." |
| 5xx, rede | `SIS-*` ou sem corpo | `SERVICE_UNAVAILABLE` | "Não consegui responder agora. Tente novamente em instantes." |

Nota: o contrato da landing propõe para `FILE_TOO_LARGE` "O limite é de 9 MB por envio"; aqui o texto antigo ficou
porque um teste existente o fixa (`tests/test_chat_helpers.py::test_error_texts`) e o limite por arquivo do mock é 20 MB.
O limite de 9 MB por envio tem texto próprio (`SEND_TOO_LARGE`).

### 9.3a Limites (`settings.yaml` → `chat`, repetidos no BFF)

`max_send_bytes` 9437184 (9 MB somados por envio, D4; abaixo dos ~10 MB do gateway), `max_session_bytes` 20971520
(20 MB por conversa; também `server.maxUploadSize = 20`), `max_input_chars` 1000, `max_files_per_send` 5
(`chat.CHAT_LIMITS`, com extensões e MIME aceitos). O app valida antes de enviar (`validate_chat_files`: extensão,
MIME do navegador quando existe, vazio, `maxBytes` do passo, cota da conversa, `maxFiles` e a soma do envio até
`min(envio.maxBytesPorEnvio, max_send_bytes)`); o documento que passaria da soma fica de fora com "nome: Os documentos
somam mais de 9 MB…" e os outros vão. O BFF repete toda validação.

### 9.4 Quarentena (202 + consulta)

`chat.await_quarantine` (usado pelo `BffBackend` e pelo `MockBackend`): depois do 202, avisa "Verificando o
documento..." / "Verificando os documentos..." (`TEXTS["fileChecking"]`/`["filesChecking"]`; no widget, um `st.toast`
enquanto o callback espera) e faz **uma consulta por rodada** a cada 2 s (`QUARANTINE_POLL_SECONDS`), em rodízio entre
os arquivos ainda `EM_VERIFICACAO` (o BFF recebe um pedido por intervalo, qualquer que seja o número de arquivos), até
todos terem veredito e a `resposta` chegar (todos julgados sem `resposta`: consulta o último de novo). O prazo é
conferido antes de cada consulta.

| Estado | Resultado interno | Tela |
|---|---|---|
| `APROVADO` + `avaliacao.aceito: true` | `accepted: true`, `metadata` (`tipoDocumento` → `documentKind`, `emissor` → `issuer`, `identificacaoNorma` → `normIdentifier`) | "Documento aceito" |
| `APROVADO` + `aceito: false` | `accepted: false`, `reason` = `avaliacao.motivo` | "Documento não aceito" com o motivo |
| `REJEITADO` + `AMEACA_DETECTADA` | `accepted: false`, `quarantine`, `reason` | "O documento não passou na verificação de segurança e foi descartado. Envie outro arquivo." |
| `REJEITADO` + `VERIFICACAO_FALHOU` (ou motivo desconhecido) | idem | "Não foi possível verificar o documento. Envie uma versão sem senha ou em outro formato." |
| `REJEITADO` + `CONTEUDO_NAO_SUPORTADO` | idem | "Este documento não pode ser avaliado (conteúdo ativo, mais de 200 páginas ou arquivo danificado)." |
| passou de 2 minutos (`QUARANTINE_TIMEOUT_SECONDS`) | `POST .../cancelamentos` com o `requisicaoId` e `FILE_CHECK_TIMEOUT` | §9.3 |
| 404 na consulta | `SESSION_NOT_FOUND` na hora | §9.3 |
| 5xx/rede na consulta | tenta de novo; a terceira falha seguida é `SERVICE_UNAVAILABLE` (`QUARANTINE_MAX_FAILURES`; uma consulta bem-sucedida zera a conta) | §9.3 |
| 429 na consulta | transitório: espera o `Retry-After` limitado a 1–10 s (`QUARANTINE_RETRY_AFTER`; sem o cabeçalho, 2 s) e conta como falha; a terceira seguida é `RATE_LIMITED` | §9.3 |

Com um documento só barrado na quarentena, o texto do motivo entra como primeira mensagem do agente; com vários, a
tabela "Resultado da avaliação dos documentos" mostra "Recusado na verificação de segurança" e o motivo em
"Observação". Só bytes aceitos contam na cota da conversa.

### 9.5 Mock — `data/chat-fluxo-mock.json`

Chaves: `start`, `welcome`, `user` (`firstName` fictício), `nodes` (`inicio`, listas de normas, `consultar_tema`,
`enviar_arquivo`, `pergunta_sobre_arquivo`, `fim`), `transitions`, `back`, `askNode`, `lists`, `contacts`,
`maxClarificationRounds`, `maxOutOfScope`, `textScenarios`, `fallbacks`, `fileScenarios`. Interpretado por
`core.chat.ChatMockServer` com as mesmas regras do `chat-mock-server.ts` (idempotência por `requestId`). Dados
fictícios; o arquivo não mudou. Quarentena simulada no código (rápida, sem espera): `submit_files` aplica as regras de
`handle_files` (inalterado para os nomes de sempre) e `file_status` responde `EM_VERIFICACAO` na primeira consulta de
cada documento (`MOCK_QUARANTINE_CONSULTS`) e depois o veredito; nome com "virus"/"ameaca" → `AMEACA_DETECTADA`,
"protegido" → `VERIFICACAO_FALHOU`, "macro" → `CONTEUDO_NAO_SUPORTADO` (`MOCK_QUARANTINE_KEYWORDS`).

### 9.6 Receita de adaptação

1. Conferir o OpenAPI publicado pelo BFF contra os adaptadores (`node_from_v1`, `message_from_v1`,
   `file_status_from_v1`, os `*_from_v1` de `core/data.py`) e os testes `tests/test_*_v1.py`.
2. `CHAT_MOCK=false`, `BFF_BASE_URL` (caminho base da API) e `AUTH_LOGIN_URL` no ConfigMap/Secret do ambiente
   (`portabilidade.md`; F10).
3. Manter `safe_markdown` e os textos de erro do app.

## 10. Remover, trocar, manter (com dados reais)

| Item | Ação |
|---|---|
| geração aleatória de `traffic` | sai do caminho real (BFF usa `/v1/normativos-recebidos`); fica no mock |
| `derive_waterfall` e `baseYear` | só no mock |
| fim dos presets em 31/12/2021 (`core.period`) | trocar por hoje ou pela `dataReferencia` do BFF |
| `aggregate_classification`, `aggregate_emails`, `filter_classified`, ordenação local da Tabela Analítica | só no mock; com o BFF os agregados e a paginação vêm prontos |
| `ChatMockServer` e `chat-fluxo-mock.json` | desligar com `CHAT_MOCK=false`; manter `safe_markdown` e textos |
| validações (`validate_*`), `build_waterfall`, formatação | manter (rodam sobre o que os adaptadores entregam) |
| `xlsx._safe_cell` (texto que começa com `=`, `+`, `-`, `@`, tabulação ou retorno de carro ganha `'`; vale também para os cabeçalhos de coluna) e `html.escape` em todo texto de dado que vai ao `st.html` | manter |

## 11. Domínios (enumerações v1 → valores do app)

| Domínio | v1 | App |
|---|---|---|
| Segmento | `ATACADO`, `CORPORATIVO`, `PLATAFORMA`, `VAREJO` | `atacado`, `corporativo`, `plataforma`, `varejo` |
| Granularidade | `DIA`, `MES`, `ANO` | `Day`, `Month`, `Year` |
| Classe sugerida | `APLICAVEL`, `APLICAVEL_PARCIALMENTE`, `NAO_APLICAVEL` | `Aplicável`, `Aplicável parcialmente`, `Não aplicável` |
| Temas de | `APLICAVEIS`, `NAO_APLICAVEIS` | `themes_of=True`, `False` |
| Tipo de etapa | `TOTAL`, `REDUCAO` | `total`, `decrease` |
| Tipo de passo | `MENU`, `TEXTO_LIVRE`, `ENVIO_ARQUIVO`, `FIM` | `menu`, `free_text`, `upload`, `end` |
| Papel | `AGENTE`, `USUARIO`, `SISTEMA` | `ai`, `user`, `system` |
| Ação | `OPCAO`, `TEXTO`, `VOLTAR`, `RECOMECAR`, `PERGUNTAR` | `option`, `text`, `back`, `restart`, `ask` |
| Nota | `UTIL`, `NAO_UTIL` | `useful`, `not_useful` |
| Situação do arquivo | `EM_VERIFICACAO`, `APROVADO`, `REJEITADO` | mesmos valores (`chat.CHECKING`, `APPROVED`, `REJECTED`) |
