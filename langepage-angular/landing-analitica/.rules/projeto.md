# Regras do projeto — landing-analitica

Texto vinculante das regras técnicas e de produto. `AGENTS.md` traz o índice em uma linha por regra; em caso de
dúvida, vale este arquivo. Regra nova recebe o próximo número livre e entra no índice do `AGENTS.md`.
Documentos citam regra por número, nunca por faixa: a faixa envelhece a cada regra nova.

## R1. Versões congeladas
Node 22.x (`^22.12.0`, `.nvmrc`), npm `>= 10.9.4`, Angular 20.3.x, TypeScript 5.9.x, RxJS 7.8.x, zone.js 0.15.x,
@coreui/angular 5.5.x, @coreui/coreui 5.4.x, chart.js 4.5.x (ADR-021). Proibido `ng update` ou subir major de qualquer
dependência sem aprovação explícita. Versões exatas no `package.json`, sem `^`.

## R2. Dependências novas
Só entram se forem compatíveis com Angular 20 / TypeScript 5.9 / Node 22 (checar `peerDependencies` e `engines`),
estiverem disponíveis no Nexus e forem instaladas com versão exata. Proibido instalar de URL, CDN ou repositório git.
`.npmrc` do projeto (e o de `e2e/`) versionado só com referência a variável de ambiente (`registry=${NPM_REGISTRY}`,
linha de fallback e `always-auth=true`; `docs/dependencias-e-ambiente.md` §1.4): nunca host nem token nele; o
`~/.npmrc` do usuário nunca é alterado.

## R3. Recursos de Angular e TypeScript
Idioma do Angular 20, como o deixou a migração (ADR-021): componente, diretiva e pipe standalone com `imports` próprios;
rotas em `src/app/app.routes.ts` e `src/app/views/<pasta>/routes.ts` (`loadChildren`); providers em `src/app/app.config.ts`
(`provideRouter` sem hash, `provideHttpClient`); templates com `@if`/`@for`/`@switch`. Permitido: `@Input()`/`@Output()`
ou `input()`/`output()`, signals, `inject()` ou construtor, RxJS com `takeUntil` ou `takeUntilDestroyed`. Proibido:
`@NgModule` novo, `standalone: false`, `*ngIf`/`*ngFor`/`*ngSwitch` novos, `HttpClientModule`, `BrowserModule`,
`platformBrowserDynamic`, `ngx-perfect-scrollbar`, `ColorModeService` do CoreUI (tema só pelo `ThemeService`, R10).
Componentes CoreUI seguem a API 5.x (https://coreui.io/angular/docs/); exemplo de outra versão é reescrito antes de usar.
`npm run docs:check` acusa os padrões proibidos em `src/app`.

## R4. HTTP e BFF
Toda chamada ao BFF passa por `src/app/core/services/api.service.ts`: `apiBase` do `env.json` + `/v1/<recurso>`, com os
recursos, parâmetros e payloads de `docs/contratos/openapi-agenda-normativa-v1.yaml` (contrato v1; ADR-023). Nunca URL
absoluta. Recurso fora do contrato não existe: muda o OpenAPI primeiro. Listagem é paginada (`page`, `size` ≤ 100,
`sort` da lista permitida); gráfico lê o `/resumo`. Resposta passa por adaptador puro (`*.adapter.ts`, com spec) antes das
interfaces do front. `dataMock: true` no `env.json` usa os mocks de `src/assets/data/` com a mesma interface.

## R5. Autenticação
Só pelo cookie de sessão do BFF (`HttpOnly`, mesma origem de `apiBase`) + CSRF (`XSRF-TOKEN` → `X-XSRF-TOKEN`,
`provideAppHttpClient`). 401 → o interceptor leva a `loginUrl` do `env.json`; o bloco não mostra texto. Nada de token
em `localStorage`/`sessionStorage`; `localStorage` só guarda o tema e `sessionStorage` só o horário da última ida ao
login (`landing-analitica.login-redirect-at`; quebra o laço do 401, E-010).

## R6. Ambientes e artefato
Uma imagem para todos os ambientes: o que muda por ambiente fica em `src/assets/env.json` (lido antes do bootstrap;
versionado só com padrões de dev, `apiBase: '/api'`; cada ambiente monta o seu por ConfigMap). `environment*.ts` só com
flags de build. Proxy só no `ng serve` (`proxy.conf.json`, placeholder). Proibido `localhost`, `appdes`/`appuat` ou URL
de backend no código versionado ou no `dist/`. `/api/*` é roteado pelo Ingress.

## R7. Build e testes
Toda entrega passa em `npm run verify` (documentação, regras, build de produção e testes headless). Runner: Karma/Jasmine
do template até decisão; Jest/Cypress só se o CI do destino exigir.

## R8. Escopo do template
Usar apenas o CoreUI free (base v4.3, migrada para 5.5; layout e infraestrutura no padrão do v5.5). Não reproduzir telas da versão Pro. Sem marca de terceiros na interface: nenhum
logo, nome ou link do CoreUI em telas, metadados, favicon ou nome do projeto. `@coreui/*` continua em uso; `LICENSE` (MIT)
permanece por exigência da licença.

## R9. Exportação de relatórios
XLSX e CSV com `exceljs`; PDF com `jspdf` + `jspdf-autotable`, instalados só quando a exportação PDF for pedida (versão
compatível com Angular 20 e disponível no Nexus); arquivos gerados no navegador. Utilitário único:
`src/app/core/export/xlsx-export.ts` (ADR-017).

## R10. Interface, tokens e temas
- Textos em pt-BR (R12), código em inglês. Visual minimalista, responsivo de 375px a 1440px.
- Identidade: paleta da marca. Tokens em `src/scss/_brand.scss`; tema escuro em `src/scss/_theme-dark.scss`;
  sobrescritas do CoreUI em `src/scss/_variables.scss`. Estilos usam `var(--brand-*)`, `var(--cui-*)` ou `var(--app-*)`.
- Cor literal (hex, `rgb`) só nesses três arquivos. Exceções permitidas, e só estas:
  1. `.ts` que desenha em canvas (Chart.js): fallback de leitura de token (`read('--token', '#...')`, `|| '#...'`,
     constantes `FALLBACK_*`, `fallbackColor`) com o mesmo valor do token claro, e tintas de contraste preto/branco;
  2. `src/index.html`: `theme-color` igual a `$brand-blue` e `$brand-dark-page`.
  `npm run docs:check` acusa cor literal em `.scss` fora dos três arquivos e em `.html` fora do `index.html`.
- Cores de gráficos (`--app-series-*`, `--app-wf-*`) são validadas para daltonismo nos dois temas: não trocar nem
  reordenar sem revalidar (`docs/design-system.md` seção 4, ADR-004).
- Marca "Agenda Normativa" com o símbolo oficial da instituição (`src/assets/img/brand/brand-mark*.svg`): não redesenhar nem
  distorcer o símbolo; detalhes em ADR-018. Fonte de títulos da marca fica fora (proprietária).
- Temas claro, escuro e automático, sem dependência nova: `ThemeService` (`src/app/core/services/theme.service.ts`)
  aplica `data-theme`, `data-coreui-theme` (componentes CoreUI 5) e a classe `dark-theme` no `<html>`. O
  `ColorModeService` do CoreUI não entra; os tokens da marca de `_theme-dark.scss` vencem os padrões escuros do CoreUI.
  Todo componente novo funciona nos dois temas. Gráficos leem `--app-chart-color` e `--app-chart-grid-color`.

## R11. Conflitos
Pedido em conflito com estas regras: PARE e pergunte antes de implementar. Usuário mantém o pedido após o aviso:
executar e registrar em `.rules/decisoes.md`.

## R12. Idioma oficial: português do Brasil
Vale para todo texto visível (menu, títulos de rota e breadcrumbs, rótulos, botões, placeholders, mensagens de erro e
validação, `aria-label`, `title`, `alt`, legendas de gráficos, colunas e nomes de arquivos exportados), para a
documentação (`README`, regras, `docs/`) e para mensagens de commit (prefixo Conventional Commits, descrição em pt-BR).
- Identificadores, nomes de arquivos de código e comentários em inglês.
- `<html lang="pt-BR">`; `LOCALE_ID` `pt-BR` e `DEFAULT_CURRENCY_CODE` `BRL` em `src/app/app.config.ts`. Datas `dd/mm/aaaa`,
  números `1.234,56`, moeda `R$`. Formatar com pipes do Angular ou `Intl` em `pt-BR`, nunca montando o texto à mão.
- Termos de interface seguem `docs/glossario-ptbr.md`; termo novo entra no glossário antes de ser usado.
- Texto vindo de exemplos em inglês (CoreUI/Angular) é traduzido antes de entrar no projeto.
- Strings internas do @coreui/angular sem input para tradução são exceção conhecida; não alterar `node_modules`.

## R13. Documentação viva de portabilidade
O projeto será copiado para outro ambiente e adaptado por outra IA; `docs/` precisa bastar sozinha. Toda entrega que
mude o código atualiza o documento correspondente na mesma mudança (sem isso a tarefa não está concluída) e passa em
`npm run docs:check`. Antes de adaptar em outro ambiente, ler `docs/portabilidade.md`.

| Se mudou | Atualize |
|---|---|
| Rotas, páginas, componentes, serviços, layout, tema, `app.config.ts` | `docs/arquitetura.md` |
| Dados mock, interfaces de dados, formatação, serviços de dados, endpoints | `docs/contratos-de-dados.md` |
| Campo consumido pela tela, interface de dados, domínio de valores ou bloco novo com dados | `docs/mapeamento-de-dados.md` (revisar as tabelas e atualizar o carimbo `data-contract-hash`) |
| Tokens (`_brand.scss`, `_variables.scss`, `_theme-dark.scss`), tipografia, componentes de UI, paleta de gráficos | `docs/design-system.md` (revisar a tabela e atualizar o carimbo `tokens-hash`) |
| `package.json`, `angular.json`, environments, proxy, Node, comandos, CI, hooks | `docs/dependencias-e-ambiente.md` |
| O que copiar, pontos de adaptação, checklist do porte | `docs/portabilidade.md` |
| Página nova, bloco novo numa página, campo novo consumido, filtro, exportação ou dependência da página | `docs/paginas/<slug>.md` (ficha da página, R15; revisar e atualizar o carimbo `page-data-hash`) |
| Decisão de arquitetura ou de produto | novo `docs/decisoes/ADR-nnn-*.md` (próximo número livre) + índice |
| Regra, comando ou convenção para agentes | `AGENTS.md` ou `.rules/*.md` (um lugar só; ponteiros não recebem texto) |
| Qualquer entrega | `docs/changelog.md`; termos novos em `docs/glossario-ptbr.md` |

Ligação com dados de produção: o usuário indica as colunas em `docs/mapeamento-de-dados.md` (ou no chat) e a IA segue a
receita desse documento (adaptador de-para por bloco, sem mudar interfaces, componentes nem textos). Campo sem coluna em
produção: parar e perguntar (R11).

`npm run docs:inventory` regenera `docs/inventario.md` (rotas, tokens, dependências, arquivos vs template) e o carimbo
`inventory-hash`; rodar após mudança estrutural. Afirmação sobre o estado do código em `docs/` que deixou de ser
verdade é corrigida na mesma entrega; frases vigiadas ficam em `STALE_CLAIMS` de `scripts/docs-check.js`.

## R14. Base de conhecimento de componentes
As páginas de demonstração do template (Tema, Componentes, Extras) ficam em `base-de-conhecimento/`, fora do build, das
rotas e do menu. Antes de adicionar ou alterar itens de página, ou criar página nova, consultar `base-de-conhecimento/README.md`
(catálogo: componente CoreUI, onde já é usado) e os componentes já adaptados em `docs/design-system.md`. As demos são da
base 4.x (sintaxe antiga, fora do build): ao copiar, reescrever para a API 5.5 e o idioma da R3; a versão 5.5 de cada
demo está no clone de referência na pasta pai (`../src/app/views/`). A base é ponto de partida, não limite. Nunca importar arquivos dela no app: copiar o padrão para o módulo do produto, sem o invólucro
`app-docs-example`/`app-docs-callout`, em pt-BR e com tokens. Página de demo só volta ao app com pedido explícito (seção 4 do
README da base). Pasta nova na base entra no README dela (`npm run docs:check` cobra).

## R15. Ficha por página
Toda página roteada (`loadChildren` em `src/app/app.routes.ts`) tem uma ficha em `docs/paginas/<slug>.md`
(`slug` = caminho da rota; a raiz é `inicio`), para que uma página possa ser portada sozinha para outro projeto com o
de-para de dados alinhado. Seções obrigatórias (modelo e conteúdo de cada uma em `docs/paginas/README.md`): Identidade,
Blocos, Dados consumidos (por bloco, serviço, mock e **cada campo** `Interface.campo` com formato, exemplo, onde aparece
e coluna de produção; campo que a tela não usa é dito), Calculado no front, De-para e domínios, O que copiar para portar
só esta página, Verificação.
`npm run docs:check` (verificação 14) descobre os arquivos de dados e mocks que a página alcança por import, exige cada
um e cada campo das suas interfaces na ficha, e vigia o carimbo `page-data-hash` (comentário HTML no topo da ficha; hash das declarações
desses arquivos): interface mudou, ficha é revisada na mesma entrega. Página sem dados tem ficha curta, mas tem.
