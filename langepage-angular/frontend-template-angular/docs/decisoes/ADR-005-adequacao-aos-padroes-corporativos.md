# ADR-005 — Adequação aos padrões corporativos

**Data:** 2026-11-04 · **Situação:** aceita · **Regras:** R2, R4, R5, R6, R7, R13
**Fonte:** ADR-023 da `landing-analitica` ("Adequação aos padrões corporativos") e o plano
`../landing-analitica/docs/planejamento/adequacao-padroes-corporativos.md` (respostas da arquitetura corporativa, lacunas
L01–L19, decisões D1–D10). **Revê em parte:** ADR-004 (artefato "build estático no Apache").

## Contexto

A arquitetura corporativa definiu, em 2026-11-04, como um front Angular sobe no ambiente da instituição: caminho limpo com
fallback no servidor web (rotas por hash reprovadas), imagem web corporativa não-root (Apache 2.4 ou Nginx), front na raiz
do domínio por ambiente com `baseHref` `/`, BFF em `/api/*` roteado pelo Ingress, recursos `/api/v1/<plural-kebab-case>`,
erros RFC 7807 (Problem Details) com `traceId`, paginação obrigatória (50–100 por página), cookie de sessão `HttpOnly` com
401 e redirecionamento por `HttpInterceptor`, nenhum token no navegador e `.npmrc` obrigatório apontando para o proxy npm
do Nexus com `always-auth=true`. A `landing-analitica` aplicou essas respostas (ADR-023, fases 3, 4 e 7).

O usuário aprovou as decisões da landing "para todos" e pediu, de forma explícita, a mesma adequação neste template. O
`AGENTS.md` deste template diz para não sincronizá-lo com a landing, salvo pedido explícito: este é o pedido, e a exceção
fica registrada aqui. Só a parte genérica foi trazida; nada do produto Agenda Normativa (recursos de negócio, chat,
agente, dados de página).

## Decisão

| Tema | Aplicado aqui | Origem |
|---|---|---|
| Roteamento | `provideRouter` sem `withHashLocation()`; `withInMemoryScrolling` mantido (fragmento só como âncora); `<base href="/">`; rota desconhecida volta a `/dashboard` | L01, D2 |
| Servidor web | `Dockerfile` multi-stage (Node 22 → Nginx não-root na porta 8080; imagens por `--build-arg`, padrões públicos só como placeholder; registry e credencial npm por `--build-arg NPM_REGISTRY` e segredo BuildKit `npmrc`), `.dockerignore`, `nginx/default.conf` (fallback `try_files`, cache, `/api/` = 404) e `nginx/security-headers.conf` (CSP sem script inline); `angular.json` produção com `inlineCritical: false` | L02, D3 |
| Configuração por ambiente | `src/assets/env.json` (`apiBase`, `loginUrl`, `dataMock`, `footerEntities`) lido antes do bootstrap por `RuntimeConfigService`; sem o arquivo, o build de produção desliga o mock; `environment*.ts` só com `production` | L03 |
| Camada HTTP | `ApiService` (`apiBase` + `/v1` + recurso; `get`, `post`, `postMultipart`, `delete`), interceptor funcional (Problem Details → `ApiProblem` sem a mensagem do servidor; 401 → `loginUrl` com `retorno` e quebra de laço de 60 s; 403 com texto próprio), XSRF, textos pt-BR, `api-page.ts` (página Spring, `collectPages`) | L04, L05, L06, L09, D6 |
| Dados simulados | selo "Dados simulados" no header quando `dataMock` é `true` (só tokens `--cui-*`) | — |
| Registry npm | `.npmrc` (e `e2e/.npmrc`) só com `registry=${NPM_REGISTRY}`, linha de fallback e `always-auth=true` | L14 |
| Testes e esteira | Karma mantido; smoke E2E Playwright em `e2e/` (versões exatas, não instalado aqui); `Jenkinsfile` genérico com placeholders, sem hosts | L15, D8 |

Fica de fora (específico do produto): D1, D4, D5 (teto do Excel; o template só traz `collectPages`), D7 (região do
LLM), D10, a especificação do agente, o OpenAPI de negócio e os recursos `/v1/...` da landing. Endpoint de exemplo só
aparece comentado em `docs/contratos-de-dados.md`.

## Suposições herdadas (ADR-023 da landing)

| # | Suposição | Reverter quando |
|---|---|---|
| S2 | O 401 leva a `loginUrl` do `env.json` com o parâmetro `retorno` (valor versionado é placeholder) | rota de login conhecida |
| S3 | CSRF no padrão do Angular: cookie `XSRF-TOKEN`, cabeçalho `X-XSRF-TOKEN` em POST/PUT/PATCH/DELETE | chassi usar outro nome |
| S6 | Página no envelope do Spring: `content`, `totalElements`, `totalPages`, `number` (0 = primeira), `size` | BFF usar outro envelope |
| S10 | Erro decidido pelo status HTTP e pela família do `code` (`VAL-*`, `AUT-*`, `NEG-*`, `SIS-*`) | catálogo do chassi recebido |

## Consequências

- R2, R4, R5 e R6 reescritas (`.rules/projeto.md` e índice do `AGENTS.md`); `docs:check` acusa `withHashLocation`,
  `HashLocationStrategy`, rota `/#/` e `<base href="./">` em documento vivo, configuração por ambiente fora do
  `env.json` e `env.json` com chave a mais, a menos ou com host.
- A imagem é a mesma em DES, UAT e PRD; só mudam o ConfigMap do `env.json` e a rota `/api/*` do Ingress.
- Projeto derivado: renomear o projeto também no `Dockerfile` (caminho do `dist/`) e no `Jenkinsfile`; escrever o
  OpenAPI antes do primeiro recurso; manter `dataMock: true` até o BFF responder.
- `docs/referencia-visual/` continua retrato da landing na data da captura e não foi alterada.
