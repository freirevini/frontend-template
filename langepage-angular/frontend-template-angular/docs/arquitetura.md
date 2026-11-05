# Arquitetura

## Visão geral

- CoreUI Free Angular Admin Template v5.5.24, Angular 20.3.14, Node 22, componentes standalone, `bootstrapApplication` +
  `src/app/app.config.ts` (`provideRouter` com caminho limpo, `<base href="/">`, ADR-005). Recriado sobre o clone v5.5 na
  migração de 2026-11-03 (ADR-004, D-003); antes da migração era o v4.3.13 em Angular 15.
- Padrões corporativos (ADR-005, fonte: ADR-023 da `landing-analitica`): configuração por ambiente em `src/assets/env.json`
  lida antes do bootstrap, camada HTTP em `src/app/core/http/` com `ApiService`, imagem Nginx não-root (`Dockerfile`,
  `nginx/`), `Jenkinsfile` e smoke E2E em `e2e/`.
- Estado: commit inicial do padrão corporativo (versões fixadas, environments, proxy, regras em `AGENTS.md` e `.rules/`) + tema claro,
  escuro e automático. Textos de interface ainda são os do template, em inglês (R10 pede pt-BR ao evoluir).
- Nome do projeto no `angular.json`: `coreui-free-angular-admin-template`; saída `dist/coreui-free-angular-admin-template`.

## Rotas

Rotas em `src/app/app.routes.ts`; cada página carrega `views/<pasta>/routes.ts` por `loadChildren`. Raiz `''` → `DefaultLayoutComponent` (`loadComponent`) com filhos lazy; `''` redireciona para `dashboard`. Páginas fora do layout:
`404`, `500`, `login`, `register`. Lista completa e títulos em `inventario.md`.

URLs limpas (`PathLocationStrategy`, padrão do Angular): `/dashboard`, `/base/accordion`. Rota desconhecida (`**`)
volta a `/dashboard`. O fragmento (`/base/accordion#secao`) só rola até o elemento (`withInMemoryScrolling`,
`anchorScrolling`). Abrir qualquer endereço direto ou recarregar exige o fallback para `index.html` no servidor web
(`nginx/default.conf`, `try_files $uri $uri/ /index.html`); no `ng serve` o fallback já existe.

```
'' (DefaultLayoutComponent)
├── dashboard      → views/dashboard   (painel de exemplo: widgets, gráfico de tráfego, tabela)
├── theme          → views/theme
├── base           → views/base
├── buttons        → views/buttons
├── forms          → views/forms
├── charts         → views/charts
├── icons          → views/icons
├── notifications  → views/notifications
├── widgets        → views/widgets
└── pages          → views/pages
404 · 500 · login · register (fora do layout)
```

## Pastas

| Caminho | Propósito |
|---|---|
| `src/app/layout/default-layout` | Layout do v5.5: sidebar (`_nav.ts`, `ng-scrollbar`, modo estreito), header (`default-header`, com o seletor de tema deste template), footer |
| `src/app/core/services/theme.service.ts` | Tema claro/escuro/automático |
| `src/app/core/config/runtime-config.service.ts` | Lê `assets/env.json` antes do bootstrap (`provideAppInitializer`); chave a chave, valor inválido mantém o padrão; sem o arquivo, o build de produção desliga o mock |
| `src/app/core/services/api.service.ts` | Serviço base do BFF (R4): `apiBase` + `/v1` + recurso; `get`, `post`, `postMultipart`, `delete` |
| `src/app/core/http/` | `api-error.interceptor.ts` (`provideAppHttpClient`: interceptor + XSRF), `api-problem.ts` (Problem Details → `ApiProblem`), `login-redirect.service.ts` (401 → `loginUrl`, quebra de laço), `session-expired-notice.component.ts`, `http-error-texts.ts` (textos pt-BR), `api-page.ts` (página Spring, `collectPages`) |
| `src/assets/env.json` | Configuração de execução versionada (padrões de dev); cada ambiente monta a sua por ConfigMap |
| `src/app/icons/icon-subset.ts` | Ícones registrados (inclui `cilSun`, `cilMoon`, `cilContrast`) |
| `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/main.ts` | Providers, rotas de primeiro nível e bootstrap standalone |
| `src/app/views/dashboard` | Painel de exemplo do template |
| `src/app/views/theme`, `views/base`, `views/buttons`, `views/forms`, `views/charts`, `views/icons`, `views/notifications`, `views/widgets`, `views/pages` | Telas de demonstração do template (catálogo de componentes); remover ou substituir no produto |
| `src/components` | Componentes de documentação do template (`app-docs-*`) usados pelas telas de demonstração |
| `src/environments` | `environment.ts` / `environment.prod.ts`: só a flag `production` (escolhe os padrões de `RuntimeConfigService`) |
| `src/scss` | Estilos globais; tema escuro em `_theme-dark.scss` |
| `proxy.conf.json` | Proxy de `/api` só no `ng serve` |
| `Dockerfile`, `.dockerignore`, `nginx/` | Imagem de produção (Node 22 → Nginx não-root, porta 8080) e servidor web (fallback, cache, cabeçalhos de segurança) |
| `Jenkinsfile` | Esteira genérica (placeholders; `dependencias-e-ambiente.md` §6) |
| `e2e/` | Smoke E2E Playwright, pacote separado (`dependencias-e-ambiente.md` §1.5) |

## Layout e tema

- `default-layout`: sidebar CoreUI com `_nav.ts`; header com seletor de tema (Claro, Escuro, Automático), selo
  "Dados simulados" (token `MOCK_SOURCES`, ligado a `dataMock` do `env.json` em `app.config.ts`; estilo `.app-mock-badge`
  em `src/scss/_custom.scss`, só tokens `--cui-warning-*`) e menu de usuário de demonstração; acima do `router-outlet`,
  `app-session-expired-notice` (aviso de 401 logo após ida ao login, com o link "Entrar novamente"); footer.
- `theme.service`: aplica `data-theme="light|dark"`, `data-coreui-theme` (modo escuro nativo do CoreUI 5) e a classe `dark-theme` no `<html>`; guarda a escolha em
  `localStorage` (chave `frontend-template-angular.color-mode`); "Automático" segue `prefers-color-scheme`; copia
  `--app-chart-color` e `--app-chart-grid-color` para os defaults do Chart.js via `import('chart.js')` dinâmico e
  atualiza os gráficos abertos. Instanciado no `AppComponent` (que também aceita `?theme=light|dark|auto` na URL, recurso do v5.5
  ligado ao `ThemeService`). O `ColorModeService` do CoreUI não é usado.
- `_theme-dark.scss`: sobrescreve as variáveis `--cui-*` sob `:root[data-theme="dark"]` (importado por último em `styles.scss`, vence o escuro nativo do CoreUI 5).

## Testes

Karma + Jasmine (`*.spec.ts` ao lado de cada componente). Execução única sem janela:

```bash
npm run test:ci
```

`theme.service.spec.ts` cobre o tema; o spec do header cobre as opções de tema e o selo "Dados simulados". A camada
HTTP tem spec por arquivo (`runtime-config.service.spec.ts`, inclusive o `env.json` versionado; `api.service.spec.ts`;
`core/http/*.spec.ts`: 401 com `retorno` e uma ida por página, laço de 60 s, 403, Problem Details sem a mensagem do
servidor, rede fora, XSRF, página Spring e `collectPages`). Smoke E2E (fora do `verify`): `e2e/specs/smoke.spec.ts`.

## Convenções

Angular 20 (standalone, `@if`/`@for`, signals permitidos), código em inglês, textos em pt-BR ao evoluir (R10), cores por
variáveis CSS, CSS de componente até 4 kB (budget do `angular.json`).
