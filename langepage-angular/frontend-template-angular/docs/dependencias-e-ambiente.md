# Dependências e ambiente

## 1. Dependências

### 1.1 Toolchain

- Node 22.x (`^22.12.0`; `.nvmrc` = 22; `engines` = `^22.12.0`). Angular 20 aceita `^20.19 || ^22.12 || ^24`.
- npm `>= 10.9.4` (recomendado `^11.10.1`); no ambiente corporativo, registry Nexus pelo `.npmrc` (seção 1.4, R2).
- Angular CLI local: `npx ng ...` (sem instalação global). TypeScript 5.9.3. Versões congeladas pela R1.

### 1.2 Pacotes (`package.json`)

Versões do CoreUI Free Angular Admin Template v5.5.24 (clone de referência na pasta pai), todas exatas (R1). Saíram na
migração: `ngx-perfect-scrollbar`, `@angular-devkit/build-angular`, `jspdf` e `jspdf-autotable` (voltam com a exportação PDF).

| Seção | Pacote | Versão | Origem | Observação |
|---|---|---|---|---|
| dependencies | `@angular/animations` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/cdk` | 20.2.14 | template CoreUI v5.5.24 | Linha 20.2 (peer do CoreUI 5.5). |
| dependencies | `@angular/common` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/compiler` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/core` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/forms` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/language-service` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/platform-browser` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/platform-browser-dynamic` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@angular/router` | 20.3.14 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/angular` | 5.5.24 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/angular-chartjs` | 5.5.24 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/chartjs` | 4.1.0 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/coreui` | 5.4.3 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/icons` | 3.0.1 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/icons-angular` | 5.5.24 | template CoreUI v5.5.24 |  |
| dependencies | `@coreui/utils` | 2.0.2 | template CoreUI v5.5.24 |  |
| dependencies | `chart.js` | 4.5.1 | template CoreUI v5.5.24 |  |
| dependencies | `exceljs` | 4.4.0 | adicionada pelo projeto | Exportação XLSX/CSV no navegador (R9), adicionada pelo projeto. Ainda não importado em `src/`; ao usar `exceljs/dist/exceljs.min.js`, adicionar a `allowedCommonJsDependencies` (CommonJS). |
| dependencies | `ngx-scrollbar` | 13.0.3 | template CoreUI v5.5.24 | Rolagem da sidebar do layout v5.5 (substitui, desde a migração, o `ngx-perfect-scrollbar`). |
| dependencies | `rxjs` | 7.8.2 | template CoreUI v5.5.24 |  |
| dependencies | `tslib` | 2.8.1 | template CoreUI v5.5.24 |  |
| dependencies | `zone.js` | 0.15.1 | template CoreUI v5.5.24 |  |
| devDependencies | `@angular/build` | 20.3.12 | template CoreUI v5.5.24 | Builders `application`, `dev-server`, `karma`, `extract-i18n` (substitui `@angular-devkit/build-angular`). |
| devDependencies | `@angular/cli` | 20.3.12 | template CoreUI v5.5.24 | CLI local (`npx ng`), sem instalação global. |
| devDependencies | `@angular/compiler-cli` | 20.3.14 | template CoreUI v5.5.24 |  |
| devDependencies | `@angular/localize` | 20.3.14 | template CoreUI v5.5.24 | Polyfill `@angular/localize/init` do template v5.5; não há tradução i18n. |
| devDependencies | `@types/jasmine` | 5.1.13 | template CoreUI v5.5.24 |  |
| devDependencies | `@types/node` | 22.19.1 | template CoreUI v5.5.24 | Tipos de Node 22. |
| devDependencies | `jasmine-core` | 5.12.1 | template CoreUI v5.5.24 |  |
| devDependencies | `karma` | 6.4.4 | template CoreUI v5.5.24 | Deprecado upstream; funciona no `@angular/build:karma` 20. |
| devDependencies | `karma-chrome-launcher` | 3.2.0 | template CoreUI v5.5.24 |  |
| devDependencies | `karma-coverage` | 2.2.1 | template CoreUI v5.5.24 |  |
| devDependencies | `karma-jasmine` | 5.1.0 | template CoreUI v5.5.24 |  |
| devDependencies | `karma-jasmine-html-reporter` | 2.1.0 | template CoreUI v5.5.24 |  |
| devDependencies | `typescript` | 5.9.3 | template CoreUI v5.5.24 | Angular 20 exige `>=5.8 <6.0`. |

Se `exceljs` faltar no Nexus: só é necessário quando a exportação (R9) for implementada; pode sair do `package.json` até lá.

### 1.3 Lock

O `package-lock.json` (regenerado na migração de 2026-11-03) resolve em `registry.npmjs.org`. No Nexus, use proxy
transparente ou gere o lock de novo com `npm install` com `NPM_REGISTRY` apontando para o `npm-all` (campo `resolved`
sem `registry.npmjs.org`).

### 1.4 Registry npm (`.npmrc`)

Regra corporativa: `.npmrc` obrigatório apontando para o proxy npm do Nexus (`npm-all`) com `always-auth=true`
(ADR-005, fonte: ADR-023 da `landing-analitica`). Nenhum host interno nem credencial é versionado (R2, R6): o `.npmrc`
da raiz (e o de `e2e/`, porque o npm só lê o `.npmrc` do pacote que está instalando) tem três linhas efetivas:

```ini
registry=${NPM_REGISTRY}
registry${NPM_REGISTRY?}=https://registry.npmjs.org/
always-auth=true
```

- **Esteira:** `NPM_REGISTRY` = URL do `npm-all` do Nexus, vinda de uma credencial *Secret text* do Jenkins
  (`npm-registry-url`, mascarada no log) e exportada para **todos** os comandos `npm` (o npm 10 recusa até `npm run`
  com o registry inválido). O token vai num *user config* separado: credencial *Secret file* (`npm-userconfig`) com a
  linha de autenticação do registry, entregue ao npm por `NPM_CONFIG_USERCONFIG` no `npm ci` e como segredo BuildKit
  (`--secret id=npmrc`) no `docker build`. Nada disso fica no repositório nem na imagem final.
- **Estação de trabalho sem a variável:** a segunda linha é o fallback. Com npm 11.6 ou mais novo, `${NPM_REGISTRY?}`
  vira texto vazio quando a variável não existe; a chave passa a ser `registry` e, por ser a última, vale o registry
  público. Com a variável definida, a chave vira `registry<url>`, que não é configuração do npm e é ignorada.
- **npm 10 (inclui o 10.9.x das imagens Node 22):** não conhece `${VAR?}`. Com `NPM_REGISTRY` definida funciona igual;
  sem ela, todo comando `npm` falha com `ERR_INVALID_URL`. Na estação com npm 10:
  `export NPM_REGISTRY=https://registry.npmjs.org/` (ou a URL do Nexus).
- `always-auth` não existe mais desde o npm 9: fica por exigência da regra corporativa e gera o aviso
  `Unknown project config "always-auth"` (seção 7).

Comportamento medido na `landing-analitica` em 2026-11-04 (mesmo arquivo): npm 11.21.1 sem a variável resolve o registry
público e com ela a URL da variável; npm 10.8.2 sem a variável falha com `ERR_INVALID_URL`. Formas descartadas lá:
só `registry=${NPM_REGISTRY}`, `${NPM_REGISTRY:-padrão}` (o npm não interpreta `:-`) e só `${NPM_REGISTRY?}`.

### 1.5 Pacote `e2e/` (smoke E2E, Playwright)

Pasta com `package.json` próprio (`frontend-template-angular-e2e`, `private`, `engines` `node ^22.12.0`), fora do build
do app (`tsconfig.app.json` e `tsconfig.spec.json` excluem `e2e/**`; o Karma só procura `*.spec.ts` dentro de `src/`) e
fora do `npm run verify` (precisa do app no ar e de navegador). Não instalado neste repositório e sem `package-lock.json`
até a primeira instalação no Nexus.

| Pacote | Versão | Motivo | Nexus / observação |
|---|---|---|---|
| `@playwright/test` | `1.64.1` | Runner e API do smoke E2E (ADR-005). Traz `playwright` e `playwright-core` na mesma versão exata. | `engines` `node >=20`. Os navegadores **não** vêm do npm: imagem com os navegadores da 1.64.1, `npx playwright install` com espelho do Nexus (`PLAYWRIGHT_DOWNLOAD_HOST`) ou o Chrome/Chromium da máquina por `E2E_CHROME_BIN`/`CHROME_BIN`. Confirmar no Nexus. |
| `@types/node` | `22.19.1` | Tipos de `process.env` no `playwright.config.ts`. | Mesma versão da raiz. |

- `scripts`: `test` (`playwright test`), `report` (`playwright show-report`). Na raiz, `npm run e2e`.
- `playwright.config.ts`: `baseURL` = `E2E_BASE_URL` (padrão `http://127.0.0.1:4360`); Chromium desktop 1440×900,
  `pt-BR`, fuso `America/Sao_Paulo`, tema claro do sistema; com `CI`, 1 worker, 1 nova tentativa, relatórios `list`,
  JUnit (`e2e/test-results/junit.xml`) e HTML (`e2e/playwright-report/`); `trace` e captura de tela só em falha.
- `support/fixtures.ts`: todo teste falha se a página lançar erro não tratado (`pageerror`).
- `specs/smoke.spec.ts`: `/dashboard` e `/base/accordion` por URL direta e após recarregar (status < 400, breadcrumb da
  página), rota inexistente volta a `/dashboard`, seletor de tema Escuro/Claro em `data-theme` e `data-coreui-theme`
  com a escolha mantida após recarregar.

## 2. Configuração

- `angular.json`: projeto `coreui-free-angular-admin-template`; build `production` com `fileReplacements`
  (`environment.ts` → `environment.prod.ts`) e `optimization` explícito com `styles.inlineCritical: false` (o CSS crítico
  embutido usa um `onload` inline que a CSP sem `unsafe-inline` em scripts bloquearia); `proxyConfig` só no `serve`;
  builders `@angular/build`; budgets: inicial 7 MB aviso / 8 MB erro (o demo v5.5 tem ~6,2 MB no inicial; um painel
  derivado volta a 1,5 MB / 6 MB ao tirar as demos), CSS por componente 2 kB aviso / 4 kB erro.
- `src/environments`: só `production` (`false`/`true`), que escolhe os padrões de `RuntimeConfigService` (mock ligado
  só fora de produção). O que muda por ambiente fica em `src/assets/env.json` (R6; chaves em `contratos-de-dados.md` §2).
- `src/index.html`: `<base href="/">` (rotas limpas, ADR-005).
- `proxy.conf.json`: `/api` → `http://HOST_DEV_BFF:PORTA` (placeholder a preencher localmente).

## 3. Imagem e servidor web

- `Dockerfile` multi-stage: estágio `build` em `NODE_IMAGE` (padrão público `node:22`, placeholder) com `npm ci` e
  `npm run build:prod`; estágio final em `WEB_IMAGE` (padrão público `nginxinc/nginx-unprivileged:1.27-alpine`,
  placeholder da imagem Nginx não-root corporativa), porta 8080, sem voltar a root. `NPM_REGISTRY` é *build arg* só do
  estágio descartado; a credencial entra pelo segredo BuildKit opcional `npmrc`. Copia `dist/coreui-free-angular-admin-template/browser`.
- `.dockerignore`: contexto só com o que `npm ci`, o build e o estágio web usam (sem `node_modules`, `dist`, `docs`, `e2e`,
  regras, scripts).
- `nginx/default.conf`: `try_files $uri $uri/ /index.html` (fallback das rotas limpas); `index.html` e
  `assets/env.json` com `Cache-Control: no-cache` (versão nova e ConfigMap novo valem no próximo carregamento); arquivos
  com hash no nome com `max-age=31536000, immutable`; `assets/` inexistente = 404 de verdade; `/api/` = 404 (o Ingress
  roteia `/api/*` ao BFF antes do contêiner); gzip; `server_tokens off`.
- `nginx/security-headers.conf` (incluído em cada `location`): `Content-Security-Policy` (`default-src 'self'`,
  `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src`/`font-src 'self' data:`, `connect-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`), `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.

## 4. Comandos

```bash
npm ci
npm start                                             # http://localhost:4200
npm run build:prod
npm run test:ci
grep -rIoE 'localhost|appdes|appuat' dist/            # deve sair vazio (R6)
npm run docs:inventory && npm run docs:check          # documentação (R13)
npm run rules:check                                   # AGENTS.md e .rules/ (bash)
npm run verify                                        # docs + regras + build:prod + test:ci (definição de pronto)
npm run hooks:install                                 # uma vez por clone, depois de git init
docker build -t frontend-template-angular .           # imagem Nginx não-root (porta 8080)
docker run --rm -p 4360:8080 frontend-template-angular
npm --prefix e2e install && E2E_BASE_URL=http://127.0.0.1:4360 npm run e2e   # smoke E2E
```

## 5. Testes

Karma + Jasmine pelo builder `@angular/build:karma`, Chrome headless (`npm run test:ci`), mantidos (ADR-005; Jest só
se o pipeline exigir, R7). Smoke E2E com Playwright em `e2e/` (seção 1.5), rodado pela esteira contra DES.

## 6. CI e esteira (`Jenkinsfile`)

`Jenkinsfile` declarativo na raiz, genérico, com placeholders e sem hosts (R6):

| Estágio | Onde roda | O que faz |
|---|---|---|
| Checkout | agente `docker` | `checkout scm`; `IMAGE_TAG` = 12 primeiros caracteres do commit |
| Node 22 › `npm ci` | contêiner `NODE_IMAGE` (Node 22 + Chromium headless) | `npm ci` com `NPM_REGISTRY` e o *user config* com token (`NPM_CONFIG_USERCONFIG`) |
| Node 22 › `npm run verify` | mesmo contêiner | `docs:check`, `rules:check`, `build:prod`, `test:ci` (Karma com `CHROME_BIN` da imagem; falha cedo se ausente) e `grep` de hosts proibidos no `dist/` |
| Varreduras | agente `docker` | SonarQube e Veracode em paralelo: **placeholders** (`echo`), com o comando esperado em comentário |
| Imagem | `develop`, `release/*` | `docker build` com `NODE_IMAGE`, `WEB_IMAGE`, `NPM_REGISTRY` e segredo BuildKit `npmrc`; `docker push` em `IMAGE_REPOSITORY:IMAGE_TAG` |
| Imagem do release | tag | não reconstrói: confere que `IMAGE_REPOSITORY:IMAGE_TAG` já existe (construída por `release/*` e validada em UAT) |
| Deploy DES | `develop` | `deployTo('DES')`: **placeholder** do mecanismo da esteira corporativa (Helm, ArgoCD ou kubectl) |
| E2E DES | `develop`, contêiner `PLAYWRIGHT_IMAGE` | `npm --prefix e2e ci` (ou `install` sem lock) e `npm run e2e` com `E2E_BASE_URL` = `E2E_BASE_URL_DES`; publica JUnit e o relatório HTML |
| Deploy UAT | `release/*` | `deployTo('UAT')` (placeholder) |
| Deploy PRD | tag | `input` com o número da GMUD (aprovadores: placeholder `PLACEHOLDER-grupo-aprovador-prd`); sem GMUD, falha; depois `deployTo('PRD')` |

Configuração no Jenkins (nada disso entra no repositório):

| Nome | Tipo | Conteúdo |
|---|---|---|
| `npm-registry-url` | credencial *Secret text* | URL do proxy npm do Nexus (`npm-all`); vira `NPM_REGISTRY` em todos os estágios |
| `npm-userconfig` | credencial *Secret file* | *user config* do npm com a linha de autenticação do registry |
| `image-registry` | credencial usuário/senha | registry corporativo de imagens |
| `NODE_IMAGE` | variável da pasta | imagem Node 22 com Chromium headless que define `CHROME_BIN` (Karma) |
| `WEB_IMAGE` | variável da pasta | imagem Nginx não-root corporativa |
| `PLAYWRIGHT_IMAGE` | variável da pasta | imagem Node 22 com os navegadores do Playwright 1.64.1 |
| `IMAGE_REPOSITORY` | variável da pasta | repositório da imagem do app, sem tag |
| `E2E_BASE_URL_DES` | variável da pasta | endereço do painel em DES |

Projeto derivado: trocar o caminho `dist/coreui-free-angular-admin-template` no `Jenkinsfile` e no `Dockerfile` quando
renomear o projeto. Builder sem BuildKit (Kaniko não monta `--secret`): anexar a linha de autenticação a uma cópia do
`.npmrc` só no workspace da esteira.

## 7. Avisos conhecidos

- `npm audit` aponta vulnerabilidades em dependências transitivas (toolchain, Karma); revisar no Nexus, correção que exija
  major segue a R1.
- npm 11: aviso `install-scripts` para `core-js`, `esbuild`, `fsevents` (informativo); com o `.npmrc`, avisos
  `Unknown project config` para `always-auth` e para a linha de fallback `registry${NPM_REGISTRY?}` (esperados, seção 1.4;
  conferido em 2026-11-04 com npm 11.21.1: `npm config get registry` = registry público sem a variável).
