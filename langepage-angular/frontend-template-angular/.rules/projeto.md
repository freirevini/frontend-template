# Regras do projeto — frontend-template-angular

Texto vinculante das regras técnicas. `AGENTS.md` traz o índice em uma linha por regra; em caso de dúvida, vale este
arquivo. Não há R12 (idioma oficial) neste template: ela nasce no projeto derivado, como na `landing-analitica`, junto com
`docs/glossario-ptbr.md`. Regra nova recebe o próximo número livre e entra no índice do `AGENTS.md`. Documentos citam
regra por número, nunca por faixa: a faixa envelhece a cada regra nova.

## R1. Versões congeladas
Node 22.x (`^22.12.0`, `.nvmrc`), npm `>= 10.9.4`, Angular 20.3.x, TypeScript 5.9.x, RxJS 7.8.x, zone.js 0.15.x,
@coreui/angular 5.5.x, @coreui/coreui 5.4.x, chart.js 4.5.x (ADR-004). Proibido `ng update` ou subir major de qualquer
dependência sem aprovação explícita. Versões exatas no `package.json`.

## R2. Dependências novas
Só entram se forem compatíveis com Angular 20 / TypeScript 5.9 / Node 22 (checar `peerDependencies`
e `engines`), estiverem disponíveis no Nexus e forem instaladas com versão exata. Proibido instalar
de URL, CDN ou repositório git. `.npmrc` do projeto (e o de `e2e/`) versionado só com referência a variável de
ambiente (`registry=${NPM_REGISTRY}`, linha de fallback e `always-auth=true`; `docs/dependencias-e-ambiente.md` §1.4):
nunca host nem token nele; o `~/.npmrc` do usuário nunca é alterado.

## R3. Recursos de Angular e TypeScript
Idioma do Angular 20, como no CoreUI Free Angular Admin Template v5.5 (base deste template desde ADR-004): componentes
standalone com `imports` próprios, `bootstrapApplication` + `src/app/app.config.ts`, rotas em `src/app/app.routes.ts` e
`src/app/views/<pasta>/routes.ts`, templates com `@if`/`@for`/`@switch`, `provideHttpClient`. Permitido: signals,
`input()`/`output()`, `inject()`, `takeUntilDestroyed`. Proibido: `@NgModule` novo, `standalone: false`, `*ngIf`/`*ngFor`
novos, `HttpClientModule`, `ngx-perfect-scrollbar`, `ColorModeService` do CoreUI (tema só pelo `ThemeService`, R10).
Componentes CoreUI seguem a API 5.x (https://coreui.io/angular/docs/). `npm run docs:check` acusa os padrões proibidos.

## R4. HTTP e BFF
Toda chamada ao BFF passa por `src/app/core/services/api.service.ts`: `apiBase` do `env.json` + `/v1/<recurso>`, com os
recursos, parâmetros e payloads do OpenAPI do projeto derivado (convenções em `docs/contratos-de-dados.md`). Nunca URL
absoluta. Recurso fora do contrato não existe: não inventar endpoint; o template não tem nenhum. Listagem é paginada
(`page`, `size` ≤ 100; `api-page.ts`). Até o contrato, mock JSON em `src/assets/data/` (pasta a criar) com a mesma
interface, ligado por `dataMock: true` no `env.json`.

## R5. Autenticação (somente se houver área logada)
Só pelo cookie de sessão do BFF (`HttpOnly`, mesma origem de `apiBase`) + CSRF (`XSRF-TOKEN` → `X-XSRF-TOKEN`,
`provideAppHttpClient`). 401 → o interceptor leva a `loginUrl` do `env.json` (parâmetro `retorno`); o bloco não mostra
texto. Nada de token em `localStorage`/`sessionStorage`; `localStorage` só guarda o tema e `sessionStorage` só o horário
da última ida ao login (`frontend-template-angular.login-redirect-at`; quebra o laço do 401 em 60 s).

## R6. Ambientes e artefato
Uma imagem para todos os ambientes (`Dockerfile`, Nginx não-root, porta 8080): o que muda por ambiente fica em
`src/assets/env.json` (lido antes do bootstrap; versionado só com padrões de dev, `apiBase: '/api'`; cada ambiente monta o
seu por ConfigMap). `environment*.ts` só com flags de build. Proxy só no `ng serve` (`proxy.conf.json`, placeholder).
Proibido `localhost`, `appdes`/`appuat` ou URL de backend no código versionado ou no `dist/`. `/api/*` é roteado pelo
Ingress; o front não conhece hosts.

## R7. Build e testes
Toda entrega passa em `npm run verify` (documentação, regras, build de produção e testes headless). Runner: Karma/Jasmine
do template até decisão; Jest/Cypress só se o CI do destino exigir.

## R8. Escopo do template
Usar apenas o repositório free do CoreUI (v5.5, base deste template desde ADR-004; antes, v4.3). Não reproduzir telas da
versão Pro.

## R9. Exportação de relatórios
XLSX e CSV com `exceljs`; PDF com `jspdf` + `jspdf-autotable`, instalados quando a exportação PDF for pedida (versão
compatível com Angular 20 e disponível no Nexus); arquivos gerados no navegador.

## R10. Interface
Textos em pt-BR, código em inglês. Visual minimalista e moderno, responsivo de 375px a 1440px.
Temas claro, escuro e automático (seletor no header), sem dependência nova: `ThemeService`
(`src/app/core/services/theme.service.ts`) aplica `data-theme`, `data-coreui-theme` (modo escuro nativo do CoreUI 5) e a
classe `dark-theme` no `<html>`; as cores próprias ficam em `src/scss/_theme-dark.scss` e vencem as do CoreUI. O
`ColorModeService` do CoreUI não é usado. Todo componente novo deve funcionar nos dois temas: usar
`var(--cui-*)`, nunca cor fixa. Gráficos Chart.js recebem as cores de `--app-chart-color` e `--app-chart-grid-color`.

## R11. Conflitos
Se um pedido entrar em conflito com estas regras, PARE e pergunte antes de implementar. Usuário mantém o pedido após o
aviso: executar e registrar em `.rules/decisoes.md`.

## R13. Documentação viva de portabilidade
Este template será copiado para novos projetos e outros ambientes e adaptado por outra IA; `docs/` precisa
bastar sozinha. Toda entrega que mude o código atualiza o documento correspondente na mesma mudança (sem isso, a
tarefa não está concluída) e passa em `npm run docs:check`. Antes de adaptar em outro ambiente, ler
`docs/portabilidade.md`.

| Se mudou | Atualize |
|---|---|
| Rotas, páginas, módulos, componentes, serviços, layout, tema | `docs/arquitetura.md` |
| Dados (mock em `src/assets/data/`), interfaces de dados, formatação, serviços de dados, endpoints, camada HTTP (`core/http/`) | `docs/contratos-de-dados.md` |
| Tokens (`_variables.scss`, `_theme-dark.scss` e `_brand.scss` se existir), tipografia, componentes de UI, cores de gráficos | `docs/design-system.md` (revisar a tabela e atualizar o carimbo `tokens-hash`) |
| `package.json`, `angular.json`, environments, `env.json`, proxy, Node, comandos, `.npmrc`, `Dockerfile`, `nginx/`, `Jenkinsfile`, `e2e/` | `docs/dependencias-e-ambiente.md` |
| O que copiar, pontos de adaptação, checklist do porte | `docs/portabilidade.md` |
| Decisão de arquitetura ou de produto | novo `docs/decisoes/ADR-nnn-*.md` + índice |
| Regra, comando ou convenção para agentes | `AGENTS.md` ou `.rules/*.md` (um lugar só; ponteiros não recebem texto) |
| Qualquer entrega | `docs/changelog.md` |

`npm run docs:inventory` regenera `docs/inventario.md` (rotas, tokens, dependências e, se houver histórico git do
template, arquivos alterados); rodar após mudanças estruturais e commitar o resultado. `npm run docs:check` falha
quando falta documentar uma pasta de tela, um arquivo de dados, uma dependência, quando os tokens mudaram sem revisar
o design system ou quando o inventário está desatualizado. Documentação em pt-BR; caminhos e identificadores como no código.
