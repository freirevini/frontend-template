# Changelog

## 2026-10-27 — Base do padrão corporativo

CoreUI Free Angular Admin Template v4.3.13 (Angular 15.2.8, TypeScript 4.9.5), versões fixadas, `engines` Node 18,
`exceljs`/`jspdf`/`jspdf-autotable` com versões exatas, `environment.ts`/`environment.prod.ts` com `apiBase: '/api'`,
`fileReplacements`, `proxy.conf.json` só no `serve`, regras R1–R11 em `CLAUDE.md` e `.cursor/rules/regras-projeto.mdc`.

## 2026-10-27 — Tema claro, escuro e automático

`ThemeService`, `_theme-dark.scss`, seletor no header, ícones `cilContrast`, defaults do Chart.js por tema; regra R10
atualizada; `.nvmrc` e README em pt-BR para execução local.

## 2026-10-28 — Documentação viva (R13)

Regra R13, pasta `docs/`, scripts `docs:inventory` e `docs:check`.

## 2026-10-28 — Referência visual da Agenda Normativa

Pasta `docs/referencia-visual/` (só documentação): identidade visual da landing `landing-analitica` documentada para
aplicação em outras landings dentro das mesmas versões (Angular 15, CoreUI 4, Node 18). Sete documentos (tokens e
marca, tipografia e layout, componentes, gráficos, conteúdo e acessibilidade, telas, receita de aplicação), capturas em
1440 e 375 px nos dois temas, amostras de cor geradas dos tokens e cópia literal dos arquivos de origem em `anexos/`
(SCSS, serviço de tema, layout, gráficos, exportação Excel, marca). Código do template inalterado.

## 2026-10-28 — Referência visual atualizada

`docs/referencia-visual/` acompanha duas correções feitas na origem: tokens `--app-export-accent`/`--app-export-muted`
(planilha Excel com as mesmas cores nos dois temas) e valor escuro correto de `--app-wf-connector` (`#4b5968`). Anexos
`_brand.scss` e `xlsx-export.ts.txt`, tabelas de tokens, seção de exportação e carimbo de origem (`d691d9775392`) atualizados.

## 2026-11-03 — Regras para qualquer IA: `AGENTS.md` + `.rules/`

- `AGENTS.md` (entrada: projeto, comandos, índice das regras, pronto, "não fazer") e `.rules/` (`projeto.md` com o texto
  vinculante que estava em `CLAUDE.md`, `escopo.md`, `testes.md`, `erros.md`, `decisoes.md`, `check.sh`). `CLAUDE.md`,
  `GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/rules/regras.md` viraram ponteiros; `/pronto` em `.agents/workflows/`.
- R7 exige `npm run verify`; R11 registra pedido mantido; R13 cobre regras para agentes.
- Scripts `build:prod`, `test:ci`, `rules:check`, `hooks:install`, `verify`; hooks em `.githooks/` (instalar após `git init`).
- `scripts/docs-check.js` e `scripts/docs-inventory.js` iguais aos da `landing-analitica` (portáveis): carimbo
  `inventory-hash`, ponteiros, ADR, R3, R6, frases vigiadas; cor literal e mapeamento de dados só ligam quando a regra existe.
- Demos do CoreUI continuam compiladas (D-001 em `.rules/decisoes.md`).
- Revisão: `CLAUDE.md` e `.mdc` importam só `AGENTS.md` (D-006 da origem); lições herdadas inline em `.rules/erros.md`.

## 2026-11-03 — Migração para Node 22, Angular 20.3 e CoreUI 5.5 (ADR-004, D-003)

- Template recriado sobre o CoreUI Free Angular Admin Template v5.5.24 (clone da pasta pai): `src/`, `angular.json`
  (builders `@angular/build`), `tsconfig*`, `karma.conf.js` e versões do `package.json` do v5.5; `.nvmrc` 22,
  `engines` `node ^22.12.0`, `npm >= 10.9.4`; lock regenerado.
- Reaplicado só o que é deste template: `ThemeService` (+ teste novo de `data-coreui-theme`), seletor Claro/Escuro/Automático
  no header no lugar do `ColorModeService` (e `?theme=` da URL ligado ao serviço), `environments/` com `fileReplacements`,
  `_theme-dark.scss` importado por último, `proxy.conf.json`, orçamento de CSS por componente (2 kB/4 kB), `exceljs`.
  Orçamento inicial 7 MB/8 MB (o demo v5.5 tem ~6,2 MB). Saíram `ngx-perfect-scrollbar`, `jspdf`, `jspdf-autotable`.
- Demos continuam compiladas (D-001), agora as do v5.5 (standalone, `@if`/`@for`).
- Regras R1, R2, R3, R8, R9, R10 reescritas; `scripts/docs-*.js` atualizados (iguais aos da landing: R3 acusa padrões antigos,
  frases vigiadas da pilha antiga, rotas em `app.routes.ts`); docs, ADR-001 (substituída), ADR-002 (revista) e ADR-004.
- `npm run verify` verde: 54 testes.

## 2026-11-04 — Marca com nomes convencionais (`brand-*`)

- `docs/referencia-visual/`: prefixos `brand-*` em tokens e classes (`.brand-lockup`, `.brand-mark`, `.brand-name` no link da
  marca), SVG renomeados para `brand-mark.svg`, `brand-mark-white.svg`, `brand-logo-white.svg` com desenho intacto e
  `aria-label` neutro, prosa neutra, dados legais do rodapé dos anexos trocados por placeholders da configuração de ambiente.
- `scripts/docs-inventory.js` lê tokens `--brand-*`/`--app-*`; `docs/design-system.md` e `docs/portabilidade.md` ajustados.
  Código de `src/` inalterado.
- Campo de ambiente da URL base renomeado para `apiBase` (`src/environments/*`, R4/R6 em `.rules/projeto.md` e `AGENTS.md`,
  `docs/**`, `scripts/docs-check.js`); `.rules/erros.md` E-001.

## 2026-11-04 — Regras locais não versionadas

- `.rules/local.md` entra no `.gitignore` (seção "Regras locais (não versionadas)"); quando existe, é vinculante como as
  demais (linha em `AGENTS.md`, junto da lista de `.rules/`).
- `scripts/docs-check.js` aplica as verificações de regra local só quando `.rules/local.md` existe e define a regra; o índice
  do `AGENTS.md` continua exigido só para as regras de `.rules/projeto.md`.
- `docs/portabilidade.md`: `.rules/local.md` só é copiado se valer no destino.

## 2026-11-04 — Referência visual recapturada

- `docs/referencia-visual/imagens/`: 15 das 16 capturas `.jpg` refeitas sobre o build de produção da landing em modo de
  demonstração (rotas limpas, rodapé só com a marca e o copyright), mesmos nomes, dimensões, telas, temas e estados.
  `filtro-classificacao-claro-1440.jpg` continua a de 2026-10-28 até a landing corrigir o redesenho da rosca depois do
  filtro por tema.
- `06-telas.md`: método e data das capturas, rotas sem `#/`, Início com os cards de segmento; `README.md` (linha
  "Capturas") ajustado. Código de `src/` inalterado.
- `filtro-classificacao-claro-1440.jpg` refeita depois da correção da rosca na landing; as 16 capturas são de 2026-11-04
  e as notas de exceção saíram de `06-telas.md` e do `README.md`.
- As outras 15 capturas refeitas do mesmo build, para as 16 ficarem iguais (selo "Dados simulados" no header, do modo
  de demonstração); `06-telas.md` explica o selo.

## 2026-11-04 — Varredura de termos do `docs:check`: prefixo colado

- `scripts/docs-check.js` (verificação 15) acusa também o termo no início de palavra seguido de letra, sem diferenciar
  maiúsculas; continuam fora `package-lock.json` e binários. Provado com arquivo plantado e removido; o projeto não tem
  falso positivo. `.rules/erros.md` E-002.

## 2026-11-04 — Adequação aos padrões corporativos

Pedido explícito do usuário (exceção à nota "não sincronizar com a landing"); fonte: ADR-023 da `landing-analitica`.
Registro: ADR-005.

- Rotas limpas: `withHashLocation()` saiu de `src/app/app.config.ts` (rolagem por âncora mantida); `<base href="/">`.
- Configuração de execução `src/assets/env.json` (`apiBase`, `loginUrl`, `dataMock`, `footerEntities`) lida antes do
  bootstrap por `RuntimeConfigService` (sem o arquivo, produção desliga o mock); `environment*.ts` só com `production`.
- Camada HTTP em `src/app/core/http/` e `src/app/core/services/api.service.ts`: `apiBase` + `/v1` + recurso,
  Problem Details → `ApiProblem` (sem a mensagem do servidor), 401 → `loginUrl` com `retorno` e quebra de laço de 60 s,
  aviso de sessão expirada no layout, 403 e demais textos em pt-BR, XSRF, página Spring e `collectPages`. Sem endpoint.
- Selo "Dados simulados" no header quando `dataMock` é `true` (tokens `--cui-warning-*`).
- Imagem: `Dockerfile` (Node 22 → Nginx não-root, porta 8080; imagens e registry por argumento, credencial por segredo
  BuildKit), `.dockerignore`, `nginx/default.conf` e `nginx/security-headers.conf` (fallback, cache, CSP); `angular.json`
  produção com `inlineCritical: false`.
- `.npmrc` (e `e2e/.npmrc`) só com `${NPM_REGISTRY}`, fallback e `always-auth=true`; `Jenkinsfile` genérico com
  placeholders; smoke E2E Playwright em `e2e/` (versões exatas, não instalado; script `npm run e2e`).
- R2, R4, R5, R6 reescritas; `AGENTS.md` (índice, comandos, ambientes); `scripts/docs-check.js` acusa roteamento por hash,
  rota `/#/` e `<base href="./">` em documento vivo, configuração por ambiente fora do `env.json` e `env.json` fora do
  formato. Docs: `arquitetura.md`, `contratos-de-dados.md` (convenções v1, paginação, Problem Details, textos de erro),
  `dependencias-e-ambiente.md` (seções numeradas: `.npmrc` §1.4, `e2e/` §1.5, imagem §3, esteira §6), `portabilidade.md`,
  `README.md`, `docs/README.md`, inventário. 54 → 107 testes.
