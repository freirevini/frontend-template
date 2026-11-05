# Relatório de implementação: adequação aos padrões corporativos (Angular e Streamlit)

**Situação: aprovado pelo usuário em 2026-11-04 (opção recomendada de D1–D10, exceto região do Vertex = `global`); fases 0 e 2
concluídas (documentos, ADR-023); andamento das demais na seção 7.** Data: 2026-11-04.

Relatório único que junta (1) as respostas da arquitetura corporativa às perguntas sobre a estrutura do projeto Angular
(três lotes, 2026-11-04), (2) as incompatibilidades levantadas a partir delas e (3) as pendências abertas do projeto
Streamlit (`../../../../langepage-streamlit/docs/planejamento/plano-implementacao.md` §10.2). As melhorias são
organizadas em fases com entrega, critério de pronto, esforço e dependências. Nada aqui altera código: cada fase só
começa depois da aprovação das decisões de §4.

Por regra dos dois projetos, hosts, URLs internas, identificadores de projeto e e-mails das respostas não entram neste
documento; constam só nomes de padrões e componentes.

## 1. O que a arquitetura corporativa respondeu

| Tema | Padrão corporativo |
|---|---|
| Frontend Angular | padrão homologado mantido pelo chassi e pela Arquitetura de Tecnologia: imagem Docker corporativa não-root servindo estáticos em Apache 2.4 ou Nginx, integrada ao Design System corporativo e às pipelines do Portal Tech; versão de referência das imagens: Angular 15 (a landing está em Angular 20.3, ver ADR-021) |
| Roteamento | **caminho limpo obrigatório** (PathLocationStrategy) com fallback para `index.html` no servidor web (`FallbackResource /index.html` no Apache ou `try_files $uri $uri/ /index.html` no Nginx); **rotas por hash (`#`) são reprovadas** |
| Caminhos públicos | front na raiz do domínio da aplicação por ambiente; BFF em `/api/*` (roteado pelo Ingress ao Service do BFF) ou em subdomínio próprio |
| `baseHref` | `/` fixo quando há subdomínio por ambiente; em subcaminho, `--base-href` no build ou injeção na subida do contêiner por `assets/env.json` (mesma imagem promovida entre ambientes) |
| Testes | runners headless; há contêiner `chromium-headless` para Karma, mas a diretriz prioriza **Jest** (unitário) e **Cypress/Playwright** (E2E) |
| BFF | Java 21 / Spring Boot no chassi Atlante; nome `sboot-<sigla>-base-bff-<nome>`; valida JWT/OIDC, aplica `@PreAuthorize`, agrega chamadas a Orquestradores/Átomos |
| OpenAPI | contract-first com `openapi-generator-maven-plugin`; documentação em `/v3/api-docs` e `/swagger-ui.html` em DES/UAT, bloqueada em PRD |
| Endpoints | REST com substantivos no plural, minúsculos, kebab-case, versionados: `/api/v1/<recurso>/{id}/<sub-recurso>` |
| Erros | RFC 7807 (Problem Details): `timestamp`, `status`, `code` (ex.: `VAL-001`), `message`, `details[]`, `traceId` |
| Paginação e payload | **paginação obrigatória** em listagens (`page`, `size`, 50–100 registros por página); Ingress/API Gateway com limite de payload HTTP de ~10 MB |
| Identidade | navegador ↔ BFF por **cookie de sessão** `HttpOnly`, `Secure`, `SameSite=Strict/Lax`; BFF ↔ orquestrador/microsserviços com `Authorization: Bearer <jwt>`; token obtido pelo BFF/API Gateway por Authorization Code + PKCE no IdP corporativo; a SPA nunca guarda segredo nem token em `localStorage` |
| Expiração | o BFF renova em silêncio com refresh token; expirado ou inválido, responde **401** e limpa os cookies; um `HttpInterceptor` do Angular redireciona para a autenticação corporativa |
| Orquestração do agente | **pods Python dedicados no GKE** (chassi `genaigke` / `pylib-sgen-base-genai-framework`), integrados ao BFF por REST |
| LLM | Vertex AI; região padrão `us-central1` ou `southamerica-east1` quando há exigência de residência no Brasil; modelos homologados **Gemini 2.5 Pro** e **Gemini 2.5 Flash** |
| Upload | arquivos passam por **bucket de quarentena com antivírus corporativo** antes de qualquer processamento ou envio ao modelo |
| Sessão do agente | em produção (várias réplicas), sessão e memória **externalizadas no Redis corporativo (Cloud Memorystore)** |
| Dados | PDBD no BigQuery (projetos de DES e PRD); camadas `trusted_<dominio>` (limpos e auditados) e `dvry_<dominio>` (fatos e dimensões prontos para consumo, ex.: `dvry_corp_compliance`); aplicação não consulta o PDBD direto: passa por APIs homologadas da Ilha de Dados (`sboot-pdbd-base-atom-ilha-dados`) ou projetos de consumo Datalab com Service Accounts autorizadas (`ksa-*`) |
| Pacotes npm | **`.npmrc` obrigatório** apontando para o proxy npm do Nexus (`npm-all`) com `always-auth=true` |
| Streamlit (respostas anteriores) | GKE/Titan com o Cookiecutter `streamlit-sgen-base-ia-sample`, Python 3.11, Streamlit 1.38–1.40, ConfigMaps/Secrets por ambiente, identidade por cabeçalhos do Ingress |

## 2. Lacunas: o que existe × o que o ambiente corporativo exige

Projeto afetado: **A** = Angular (`landing-analitica`), **S** = Streamlit (`langepage-streamlit`), **B** = especificações
de backend (BFF e orquestrador, em `docs/planejamento/`). Severidade: **Bloqueia** (não sobe no ambiente corporativo), **Alta** (sobe,
mas falha em uso real), **Média** (diferença de padrão), **Baixa**.

| ID | Lacuna | Hoje | Exigido | Projetos | Severidade |
|---|---|---|---|---|---|
| L01 | Roteamento por hash | `withHashLocation()` (ADR-001) | caminho limpo + fallback no servidor web | A | Bloqueia |
| L02 | Imagem e servidor web | "Apache estático" genérico, sem `Dockerfile` | imagem corporativa não-root Apache 2.4/Nginx com fallback | A | Bloqueia |
| L03 | Configuração por ambiente | `environment.prod.ts` no build | uma imagem promovida entre ambientes; `baseHref` e `apiBase` em tempo de execução (`assets/env.json`) | A | Alta |
| L04 | Nomes dos endpoints | `/conforme/triagent/...`, `/conforme/chat/*` | `/api/v1/<recurso-plural>` kebab-case | A, S, B | Bloqueia |
| L05 | Formato de erro | espera `{ code, message }` com 7 códigos do chat | RFC 7807 com códigos do chassi (`VAL-001`…) e `traceId` | A, S | Alta |
| L06 | Paginação | Tabela Analítica, pizza, temas, e-mails e Excel leem todas as linhas de uma vez | listagens paginadas (`page`, `size` ≤ 100); agregados prontos para gráficos | A, S, B | Bloqueia |
| L07 | Limite de payload | chat aceita até 5 arquivos por envio e 20 MB por conversa | requisição ≤ ~10 MB no Gateway | A, S | Alta |
| L08 | Quarentena e antivírus | o veredito do documento volta na mesma requisição | arquivo em bucket de quarentena, antivírus antes de processar | A, S, B | Alta |
| L09 | Sessão expirada (401) | sem interceptor; o chat mostra erro genérico | `HttpInterceptor` captura 401 e redireciona para o login corporativo | A, S | Alta |
| L10 | Orquestração do agente | spec em Java dentro do BFF (`agente-backend-spec.md`, ADR-011) | pods Python `genaigke` / `pylib-sgen-base-genai-framework`, BFF só encaminha por REST | B | Alta |
| L11 | Região e modelos do LLM | `location: global`, `gemini-3.8-flash` / `gemini-3.1-pro` (ADR-012) | `us-central1` ou `southamerica-east1`; Gemini 2.5 Pro / 2.5 Flash | B | Alta |
| L12 | Sessão do agente | `SessionStore` em memória (TTL 30 min, 2.000 sessões) | Redis corporativo (Cloud Memorystore) | B | Alta |
| L13 | Fonte dos dados | mocks em `src/assets/data/`; `mapeamento-de-dados.md` com "coluna em produção" em branco | PDBD (`dvry_corp_compliance` e afins) via APIs da Ilha de Dados (`sboot-pdbd-base-atom-ilha-dados`) | B, A, S | Alta |
| L14 | Registry npm | sem `.npmrc`; lock com `registry.npmjs.org`; regra "nenhum host interno versionado" | `.npmrc` obrigatório com proxy do Nexus e `always-auth=true` | A | Bloqueia |
| L15 | Testes | 416 testes Karma/Jasmine | Jest (unitário) e Cypress/Playwright (E2E); Karma só em imagem `chromium-headless` | A | Média |
| L16 | Versão do Angular | Angular 20.3 / Node 22 (ADR-021) | referência das imagens: Angular 15 | A | Média (só estático; confirmar a imagem de build) |
| L17 | Nome do serviço | "BFF Atlante" genérico | `sboot-<sigla>-base-bff-<nome>` | B | Baixa |
| L18 | Pendências do Streamlit | KeyError na Scalation sem `currency`/`unitScale`; laço do chat com "sessão não encontrada"; `AUTH_MODE`/`CHAT_MOCK` abertos por padrão; `CHAT_MOCK=0` lido como verdadeiro; ícones sem uso | correção com teste | S | Média |
| L19 | Deploy do Streamlit (F10) | estrutura reproduzida à mão | Cookiecutter Titan, ConfigMaps/Secrets, esteira e GMUD | S | Bloqueia (para PRD) |

O que já está compatível: front sem token no navegador (só preferência de tema); `apiBase: '/api'` bate com o BFF em
`/api/*`; Node 22 e npm `>= 10.9.4`; versões exatas; dados só pelo BFF; nenhum host no código.

## 3. Fases

Esforço em dias úteis de uma pessoa, sem o trabalho dos times de backend. Cada fase termina com `npm run verify`
(Angular) ou `bash scripts/verify.sh` (Streamlit) verde, docs atualizados (R13), changelog e relatório.

### Fase 0 — Decisões e confirmações (1–2 dias, sem código)

- Entrega: decisões D1–D10 de §4 aprovadas; perguntas de §5 respondidas; ADR-023 na landing ("Adequação aos padrões
  corporativos", revendo ADR-001, ADR-011, ADR-012 e ADR-017) e ADR correspondente no Streamlit.
- Pronto: decisões registradas; escopo das fases 3–8 fechado conforme D1.

### Fase 1 — Pendências do Streamlit (1 dia; pode começar já) — L18

- Scalation: `currency`/`unitScale` ausentes viram o estado de erro em pt-BR, sem traceback.
- Chat: limite de tentativas quando o BFF devolve "sessão não encontrada" repetidamente.
- `settings.py`: em `ENV=prd` o app recusa subir com `AUTH_MODE` em `none`/`mock` ou `CHAT_MOCK` ligado (falha
  fechada); leitura booleana aceita `true/false/1/0/sim/não/yes/no`.
- Remover os ícones sem uso de `src/static/icons/`.
- Pronto: um teste por correção; entradas em `.rules/erros.md`.

### Fase 2 — Contrato v1 e especificações de backend (4–5 dias; documentos) — L04, L05, L06, L08, L10–L13, L17

- `docs/contratos/openapi-agenda-normativa-v1.yaml` (rascunho contract-first para o time do BFF): recursos no padrão
  `/api/v1`, por exemplo `segmentos`, `normativos-recebidos` (série por período), `normas-classificadas` (paginado:
  `page`, `size`, `sort`, filtros `inicio`, `fim`, `segmento`, `aplicavel`, `tema`), `normas-classificadas/resumo`
  (pizza, temas e total já agregados), `emails-sugestao` (paginado) e `emails-sugestao/resumo` (indicadores e barras),
  `cascatas-resultado`, e para o agente `agente/sessoes`, `agente/sessoes/{id}/mensagens`, `agente/sessoes/{id}/arquivos`,
  `agente/sessoes/{id}/avaliacoes`, `agente/sessoes/{id}/cancelamentos`; erros RFC 7807; envelope de página conforme a
  resposta de §5.
- `contratos-de-dados.md` (Angular e Streamlit) reescrito para o v1; tabela de-para dos códigos do chassi para as
  mensagens do chat; `mapeamento-de-dados.md` com as tabelas `dvry_*` do PDBD e as colunas (após §5, Q8).
- `agente-backend-spec.md` reescrito: BFF `sboot-<sigla>-base-bff-<nome>` (Java 21) só autentica, autoriza e encaminha
  `/api/v1/agente/*`; orquestrador Python (`genaigke` / `pylib-sgen-base-genai-framework`) com fluxo guiado, guarda de
  tema, gate de arquivos e Q&A; sessão, respostas por `requestId` e desfazer no Redis (Memorystore, TTL 30 min);
  arquivos pelo bucket de quarentena com antivírus antes do gate; Vertex AI na região de D7 com Gemini 2.5 Pro / Flash;
  dados das normas pela API da Ilha de Dados. `agente-normas-gemini.md` atualizado nos mesmos pontos.
- Pronto: OpenAPI validado por um linter de OpenAPI rodado localmente (sem dependência nova no projeto); docs:check
  verde; documentos entregues aos times do BFF, orquestrador e PDBD.

### Fase 3 — Angular: roteamento, servidor web e configuração em tempo de execução (2–3 dias) — L01, L02, L03

- `provideRouter` sem `withHashLocation()`; rolagem por seção mantida (`withInMemoryScrolling`, fragmento `#secao`
  continua só como âncora); `/dashboard` redireciona; links dos subitens do menu sem `#/`.
- Testes novos: navegação direta por URL limpa; fragmento rola para a seção; rota desconhecida volta ao início.
- `Dockerfile` multi-stage: build com imagem Node 22 do registry corporativo, runtime com a imagem web corporativa
  não-root (Apache 2.4 ou Nginx conforme D3), com o fallback para `index.html`, cabeçalhos de cache e de segurança.
- `assets/env.json` lido antes do bootstrap (`provideAppInitializer`) com `apiBase` e demais chaves por ambiente;
  `environment.ts` fica só com padrões de dev; `baseHref` `/` (D2).
- Pronto: build servido pela imagem local abre `/triagent` direto e recarrega sem 404; mesma imagem com `env.json`
  diferente aponta para outro BFF.

### Fase 4 — Angular: camada HTTP, identidade e erros (3 dias) — L04, L05, L09

- `ApiService` com o prefixo `/v1` e os recursos do contrato; tipos conforme o OpenAPI (D9).
- Interceptor funcional: 401 → redireciona para a autenticação corporativa (rota de Q2) preservando a URL atual; 403 →
  mensagem "Você não tem acesso a esta informação."; demais erros → Problem Details mapeado para textos pt-BR fixos,
  com o `traceId` como "código de suporte" (D6); nunca a `message` do servidor.
- Proteção CSRF conforme Q2 (`withXsrfConfiguration` do `HttpClient`, se o BFF usar `XSRF-TOKEN`).
- Pronto: testes do interceptor (401, 403, 400 com Problem Details, rede fora) e do mapeamento de códigos.

### Fase 5 — Angular: paginação e agregados (4–5 dias) — L06

- Tabela Analítica com paginação, ordenação e filtros no servidor (`page`, `size` 15 ou 50 conforme o produto, `sort`),
  mantendo os mesmos controles, textos e "1–15 de N".
- Pizza, lista de temas, indicadores e barras de e-mails, Normativos Recebidos e cards a partir dos endpoints de resumo
  (sem baixar todas as linhas); filtros cruzados passam a ser parâmetros.
- "Últimos e-mails": página de 5 ordenada por data.
- Excel conforme D5 (endpoint de exportação do BFF, ou o front percorre as páginas até um teto).
- Remoção das derivações que só existiam por falta de agregado (`aggregateClassification`, `aggregateEmails` passam a
  formatar o que vem pronto), mantendo os testes de formatação.
- Pronto: §7 das fichas `triagent.md` e `scalation.md` refeito contra o mock no formato v1; fichas e
  `mapeamento-de-dados.md` com os novos campos.

### Fase 6 — Angular: chat adequado ao orquestrador (3 dias) — L07, L08, L04

- Endpoints `/api/v1/agente/...`; `requestId` mantido; códigos de erro mapeados (Fase 2).
- Envio de documentos: soma por envio limitada a 9 MB (D4), validada no front com o texto do glossário; 20 MB por
  conversa mantidos se o BFF confirmar.
- Quarentena: estado "Verificando o documento..." enquanto o antivírus roda (resposta síncrona longa ou 202 + consulta,
  conforme Q4); recusa do antivírus com texto próprio.
- Mock do chat (`chat-mock-server.ts`) atualizado ao contrato v1 para os testes.
- Pronto: testes do fluxo com quarentena, limite por envio, 401 durante a conversa.

### Fase 7 — Angular: registry, testes e esteira (3 a 10 dias, conforme D8) — L14, L15, L16

- `.npmrc` versionado só com `registry=${NPM_REGISTRY}` e `always-auth=true` (valor e credencial vêm da esteira; nenhum
  host no repositório, R6) e lock regenerado no Nexus (`resolved` sem `registry.npmjs.org`).
- D8 (a): Karma na imagem `chromium-headless` + smoke E2E com Playwright (4 páginas, chat, Excel) — 3 dias. D8 (b):
  migração dos 416 testes para Jest + E2E — 8–10 dias.
- Pipeline (Jenkinsfile ou GitHub Actions do Portal Tech): `npm ci`, `npm run verify`, build da imagem, varreduras
  Veracode/SonarQube, promoção DES → UAT → PRD.
- Confirmação de Q9 (imagem de build aceita Node 22 / Angular 20).
- Pronto: esteira verde em DES com a imagem web.

### Fase 8 — Streamlit: mesmas adequações + F10 (6–8 dias) — L04–L09, L13, L19

- `core/api.py` no v1 com Problem Details e `traceId`; 401 → mensagem "Sua sessão expirou. Entrar novamente" com link
  para recarregar pelo gateway; `core/data.py` paginado e com os resumos; Tabela Analítica com paginação do servidor;
  chat com limite por envio e quarentena.
- F10 do plano Streamlit: projeto gerado pelo Cookiecutter `streamlit-sgen-base-ia-sample`, ConfigMaps/Secrets por
  ambiente, esteira e GMUD.
- Só se D1 mantiver o Streamlit como frente de produção; senão vira só referência.

### Fase 9 — Integração e homologação (4–5 dias + filas externas)

- DES com o BFF real, orquestrador e Redis; smoke das quatro páginas, chat com documento real passando pela
  quarentena, Excel, 401 e renovação silenciosa; UAT com `AUTH_MODE` estrito; GMUD de PRD.
- Pronto: checklists §7 das fichas assinados em UAT; varreduras sem apontamento aberto.

**Total indicativo:** só Angular (fases 0–7 e 9): 24–35 dias; só Streamlit (0–2, 8, 9): 16–21 dias; as duas frentes:
30–43 dias. Dependências externas: OpenAPI aceito pelo BFF (Fase 2 → 4–6), APIs da Ilha de Dados e tabelas `dvry`
(Fase 5), orquestrador Python e Redis (Fase 6), esteira e imagens corporativas (Fase 7).

## 4. Decisões para aprovação

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | Frente que vai a produção | (a) Angular; (b) Streamlit; (c) as duas | **(a) Angular**: fidelidade total ao que foi construído, padrão de frontend Angular homologado e sem limite de versão de framework; o Streamlit fica como referência e para páginas analíticas em Python. Se (b), as fases 3–7 saem |
| D2 | Endereço do front | subdomínio por ambiente com `baseHref "/"` | **sim** |
| D3 | Servidor web da imagem | Apache 2.4 ou Nginx (os dois homologados) | **Nginx** (`try_files` simples), salvo preferência do chassi |
| D4 | Upload no chat | (a) até 9 MB somados por envio; (b) pedir exceção de payload para o endpoint de arquivos | **(a)** |
| D5 | Excel com paginação | (a) endpoint de exportação no BFF gera o arquivo; (b) front percorre as páginas até um teto (ex.: 5.000 linhas) e monta com `exceljs` | **(b)** até o teto, **(a)** se o volume real passar dele (revisa ADR-017/R9 só nesse caso) |
| D6 | `traceId` na interface | mostrar como "código de suporte" nas mensagens de erro | **sim** |
| D7 | Região do Vertex | `us-central1` ou `southamerica-east1` | **`southamerica-east1`**, porque o chat recebe documentos internos; depende do parecer de compliance (Q6) |
| D8 | Testes do Angular | (a) manter Karma na imagem `chromium-headless` + E2E Playwright; (b) migrar para Jest já | **(a)** agora; Jest como entrega separada |
| D9 | Tipos do contrato no front | (a) interfaces à mão conferidas contra o OpenAPI em teste; (b) cliente gerado pelo `openapi-generator` | **(a)**: sem dependência nova; os nomes de campo vêm do OpenAPI |
| D10 | Mudança de código na landing congelada | liberar a landing para a adequação (ADR-023), sem novas funcionalidades | **sim**, se D1 = (a) ou (c) |

## 5. Perguntas que ainda faltam (curtas)

1. Sigla e nome do BFF deste produto (`sboot-<sigla>-base-bff-<nome>`)?
2. Para onde o interceptor redireciona no 401 (rota do gateway ou do BFF)? O BFF exige token CSRF (`XSRF-TOKEN` + cabeçalho)?
3. Nome do usuário para a saudação: endpoint (ex.: `/api/v1/usuarios/me`) ou claim do JWT exposto pelo BFF?
4. Antivírus: a resposta do upload espera o scan (quanto tempo, em média) ou é assíncrona (202 + consulta de status)?
5. Formato da página no BFF: envelope do Spring (`content`, `totalElements`, `totalPages`, `number`, `size`) ou outro?
6. Parecer de compliance sobre enviar texto das normas e documentos dos usuários ao Gemini; logs podem guardar o texto do chat?
7. Limites dos modelos Gemini 2.5 no projeto (tokens por resposta, timeout, cota por minuto)?
8. Tabelas/visões do PDBD (`dvry_corp_compliance` ou outra) com normas classificadas, e-mails de sugestão e segmentos; a "Cascata do resultado" tem fonte real?
9. A imagem de build da esteira aceita Node 22 / Angular 20 (a referência citada é Angular 15; ver ADR-021)?
10. Catálogo de códigos de erro do chassi (ex.: `VAL-001`) para mapear às mensagens do chat?

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Endpoints de resumo não priorizados pelo BFF | Fase 5 entrega primeiro a tabela paginada; resumos com mock até o BFF |
| Quarentena lenta degrada o chat | estado de espera explícito; limite por envio; Q4 |
| Imagem de build sem Node 22 | estágio de build com imagem Node 22 do registry corporativo; se vetado, pedir exceção (o runtime só serve estáticos) |
| Parecer de compliance negativo para documentos no LLM | desligar o fluxo "Avaliar um documento" por configuração até o parecer |
| Duas frentes vivas | D1 define uma; a outra fica como referência sem esteira |

## 7. Execução

| Data | Fase | Entrega | Observações |
|---|---|---|---|
| 2026-11-04 | 0 | ADR-023 "Adequação aos padrões corporativos" (D1–D10 aplicadas, região `global`, suposições S1–S10, riscos); notas de revisão em ADR-001, ADR-011, ADR-012 e ADR-017; índice de `docs/decisoes/` | Perguntas de §5 sem resposta não serão repetidas: viraram as suposições S1–S10 do ADR-023 (Q1 nome do BFF, Q2 `loginUrl` e CSRF `XSRF-TOKEN`, Q3 `usuarios/me`, Q4 antivírus assíncrono, Q5 envelope Spring, Q6 parecer de compliance como risco, Q7 limites a medir, Q8 tabelas a confirmar em `dvry_corp_compliance`, Q10 códigos por família). Q9 (imagem de build) segue com a Fase 7. ADR do Streamlit (Fase 0) fica com o projeto Streamlit |
| 2026-11-04 | 2 | `docs/contratos/openapi-agenda-normativa-v1.yaml` (OpenAPI 3.0.3, 15 operações); `docs/contratos-de-dados.md` reescrito para o v1 (endpoints antigo → novo, paginação, agregados, erros, quarentena, de-para campo a campo); `docs/mapeamento-de-dados.md` com coluna "Campo v1" e produção "a confirmar em `dvry_corp_compliance`"; `agente-backend-spec.md` v2 (BFF Java só encaminha, orquestrador Python, Redis, quarentena, Gemini 2.5 em `global`, Ilha de Dados); `agente-normas-gemini.md` alinhado | OpenAPI validado localmente (PyYAML, esquema oficial OpenAPI 3.0 com `jsonschema` e conferência de todos os `$ref`), sem dependência nova no projeto. Falta entregar aos times do BFF, do orquestrador e do PDBD. `contratos-de-dados.md` do Streamlit fica com a Fase 8 |
