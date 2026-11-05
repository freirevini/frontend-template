# ADR-023 — Adequação aos padrões corporativos

**Data:** 2026-11-04 · **Situação:** aceita · **Regras:** R4, R5, R6, R7, R9, R11, R13
**Substitui em parte:** ADR-001 (roteamento por hash), ADR-011 (orquestração no BFF), ADR-012 (região e modelos),
ADR-017 (Excel com todas as linhas no navegador). **Plano:** `docs/planejamento/adequacao-padroes-corporativos.md`.

## Contexto

A arquitetura corporativa respondeu, em três lotes (2026-11-04), como uma aplicação Angular com agente de IA sobe no
ambiente da instituição (§1 do plano): caminho limpo com fallback no servidor web (hash reprovado), imagem web
corporativa não-root, BFF Java 21 no chassi com nome `sboot-<sigla>-base-bff-<nome>`, OpenAPI contract-first, recursos
`/api/v1/<plural-kebab-case>`, erros RFC 7807 com `traceId`, paginação obrigatória, payload de até ~10 MB, cookie de
sessão `HttpOnly` com 401 e redirecionamento, orquestração de agentes em pods Python dedicados, Vertex AI com Gemini 2.5,
quarentena com antivírus antes de processar arquivo, sessão de agente no Redis corporativo e dados do PDBD pelas APIs
da Ilha de Dados. O plano levantou 19 lacunas (L01–L19) e propôs dez decisões (D1–D10). O usuário aprovou o plano e a
opção recomendada de cada decisão, com uma exceção: a região do Vertex AI fica `global`.

## Decisão

| # | Decisão aplicada |
|---|---|
| D1 | A landing Angular é a frente que vai a produção; o projeto Streamlit fica como referência (sem esteira). |
| D2 | Front num subdomínio por ambiente, `baseHref` `/`. |
| D3 | Imagem web corporativa com Nginx (`try_files $uri $uri/ /index.html`). |
| D4 | Chat aceita até 9 MB somados por envio (abaixo dos ~10 MB do gateway); 5 arquivos por envio e 20 MB por conversa mantidos. |
| D5 | Excel da Tabela Analítica: o front percorre as páginas (`size=100`) até 5.000 linhas e monta com `exceljs`; acima disso não exporta parcial, pede para refinar os filtros. Endpoint de exportação no BFF só se o volume real passar do teto (novo ADR). |
| D6 | O `traceId` do Problem Details aparece nas mensagens de erro como "código de suporte". |
| D7 | Vertex AI na região **`global`** (decisão do usuário; a recomendação do plano era `southamerica-east1`). Modelos homologados: `gemini-2.5-flash` (rápido: guarda de tema, gate de arquivo) e `gemini-2.5-pro` (forte: respostas). |
| D8 | Testes: Karma na imagem `chromium-headless` + smoke E2E com Playwright agora; Jest em entrega separada. |
| D9 | Tipos do contrato no front: interfaces à mão (adaptadores) conferidas contra o OpenAPI em teste; sem gerador de cliente. |
| D10 | A landing é liberada para a adequação (fases 3–7 e 9), sem funcionalidade nova. |

Consequências diretas nas decisões anteriores:

1. **Roteamento (ADR-001):** sai o `withHashLocation()`; URLs limpas (`/triagent`, `/scalation`) com fallback para
   `index.html` no Nginx; fragmento `#secao` continua só como âncora de rolagem. Fase 3.
2. **Orquestração (ADR-011):** o agente sai do BFF Java. O BFF `sboot-<sigla>-base-bff-agenda-normativa` autentica
   (cookie de sessão; Authorization Code + PKCE feito pelo gateway/BFF), autoriza e encaminha `/api/v1/agente/*` por REST,
   com `Authorization: Bearer <jwt>`, a um orquestrador Python em pods dedicados no GKE (chassi `genaigke` /
   `pylib-sgen-base-genai-framework`). Motor de fluxo, guarda de tema, gate de arquivos, Q&A e prompts vão para o
   orquestrador; sessão, respostas por `requisicaoId` e o estado para desfazer vão para o Redis corporativo (Cloud
   Memorystore, TTL de 30 minutos). Área do chat deixa de ser "não logada": exige a sessão do usuário.
3. **LLM (ADR-012):** região `global` mantida; modelos trocados para Gemini 2.5 (`gemini-2.5-flash` /
   `gemini-2.5-pro`); SDK Python `google-genai` (ou a camada do `pylib-sgen-base-genai-framework`) no lugar da SDK Java.
   Saída estruturada, citações obrigatórias e dados restritos aos registros enviados continuam.
4. **Arquivos:** todo documento vai primeiro a um bucket de quarentena e passa pelo antivírus corporativo; só depois o
   orquestrador abre, conta páginas, extrai texto e chama o modelo. O upload passa a ser assíncrono (202 + consulta).
5. **Excel (ADR-017):** o utilitário `xlsx-export.ts` e o carregamento sob demanda do `exceljs` continuam; muda a
   origem das linhas (páginas do BFF, até 5.000), conforme D5.
6. **Contrato v1:** `docs/contratos/openapi-agenda-normativa-v1.yaml` (OpenAPI 3.0.3, rascunho para o time do BFF).
   Campos em pt-BR camelCase, enumerações em MAIÚSCULAS, paginação no envelope Spring, erros RFC 7807. O front chama
   `apiBase` + `/v1/...` (`apiBase` = `/api` na configuração de execução, antes um campo do `environment.ts`).
7. **Dados de produção:** camada `dvry_corp_compliance` do PDBD, lida pelo BFF e pelo orquestrador só pela API da Ilha
   de Dados (`sboot-pdbd-base-atom-ilha-dados`); nenhuma consulta direta ao BigQuery.

## Suposições (perguntas de §5 do plano sem resposta; não serão perguntadas de novo)

| # | Suposição | Reverter quando |
|---|---|---|
| S1 | Nome do BFF `sboot-<sigla>-base-bff-agenda-normativa`; a sigla será definida pelo time | sigla definida (só texto) |
| S2 | O 401 redireciona para `loginUrl`, chave da configuração de execução (`assets/env.json`), preservando a URL atual | rota de login conhecida |
| S3 | CSRF no padrão do Angular: cookie `XSRF-TOKEN` + cabeçalho `X-XSRF-TOKEN` em POST/PUT/PATCH/DELETE; cookie de sessão chamado `SESSION` | chassi usar outro nome |
| S4 | Primeiro nome para a saudação vem de `GET /api/v1/usuarios/me` → `{ "primeiroNome": "..." }` (sai de `ChatSessionReply.user`) | BFF expuser claim de outro jeito |
| S5 | Antivírus assíncrono: upload responde 202 com `status: "EM_VERIFICACAO"` por arquivo; o front consulta `GET /api/v1/agente/sessoes/{id}/arquivos/{arquivoId}` até `APROVADO` ou `REJEITADO` e então recebe a resposta do agente | antivírus síncrono confirmado |
| S6 | Envelope de página do Spring: `content`, `totalElements`, `totalPages`, `number` (0 = primeira), `size` | BFF usar outro envelope |
| S7 | Parecer de compliance sobre enviar normas e documentos ao Gemini ainda pendente: tratado como risco; o fluxo "Avaliar um documento" pode ser desligado por configuração (`agente.arquivos.habilitado`) até o parecer | parecer emitido |
| S8 | Modelos `gemini-2.5-pro` e `gemini-2.5-flash`, região `global`; limites de tokens, timeout e cota a medir em DES | limites informados |
| S9 | Dados do PDBD na camada `dvry_corp_compliance`, lidos pela API da Ilha de Dados (`sboot-pdbd-base-atom-ilha-dados`); tabelas e colunas "a confirmar" em `docs/mapeamento-de-dados.md` | tabelas confirmadas |
| S10 | Catálogo de erros do chassi desconhecido: o front decide pelo status HTTP e pela família do `code` (`VAL-*`, `AUT-*`, `NEG-*`, `SIS-*`); os números propostos estão no OpenAPI (`ProblemDetail`) e em `docs/contratos-de-dados.md` §2.4 | catálogo recebido |

## Riscos

| Risco | Tratamento |
|---|---|
| `global` não está entre as regiões citadas pela arquitetura (`us-central1`, `southamerica-east1`); pode haver exigência de residência de dados para documentos internos | decisão do usuário registrada aqui; confirmar com a arquitetura e com compliance antes de PRD; a região é propriedade de configuração (`VERTEX_LOCATION`), trocar não muda código |
| Parecer de compliance negativo para documentos no LLM (S7) | fluxo de documentos desligável por configuração no orquestrador; o menu do agente deixa de oferecer "Avaliar um documento" |
| Quarentena lenta degrada o chat | estado "Verificando o documento..." e consulta com teto de 2 minutos; limite de 9 MB por envio |
| BFF não prioriza os endpoints de resumo | Fase 5 começa pela tabela paginada; resumos seguem no mock no formato v1 |
| Códigos de erro reais diferentes dos propostos (S10) | mapeamento por status HTTP e família; código desconhecido usa o texto do status |
| Arquivos `.doc` (Word 97-2003) sem extrator de texto homologado no Python | se não houver, o orquestrador recusa `.doc` com `VAL-002` e o front tira a extensão da lista (decisão a registrar) |

## Consequências

- Documentos da Fase 2 (este ADR, o OpenAPI, `docs/contratos-de-dados.md`, `docs/mapeamento-de-dados.md`,
  `docs/planejamento/agente-backend-spec.md`, `docs/planejamento/agente-normas-gemini.md`) passam a ser a referência
  para os times do BFF, do orquestrador e do PDBD.
- O código do front muda nas fases 3–7 (roteamento, configuração de execução, interceptor, paginação, chat), cada uma
  com testes e docs na mesma entrega (R13). Até lá, os mocks de `src/assets/data/` continuam (ADR-002).
- Regras R4, R5 e R6 são reescritas na fase que muda o código correspondente (`apiBase`, `/v1/...`, cookie de sessão,
  configuração de execução).
- ADR-001, ADR-011, ADR-012 e ADR-017 ganharam nota de revisão apontando para este ADR; o índice mostra a situação nova.
