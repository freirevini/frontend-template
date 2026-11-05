# Decisões — tomadas com motivo; não reabra sem pedido

Decisões de processo e de ferramentas de IA. Decisões de produto e arquitetura ficam em `docs/decisoes/` (ADR).
Leia antes de propor mudança estrutural. Decisão registrada aqui não é re-perguntada nem
revertida por "melhoria". Para mudar, o usuário pede e a entrada ganha uma linha "Revista em".
Pedido do usuário que contraria uma regra de `.rules/` e é mantido após aviso também entra aqui.

## Formato

```markdown
### D-<nnn> · <AAAA-MM-DD> · <decisão em uma frase>
- Contexto: <situação que exigiu decidir>
- Alternativas: <o que foi descartado>
- Motivo: <por que esta>
- Afeta: `<pastas/arquivos>`
- Commit: <hash curto, se houver>
- Revisar quando: <condição concreta>
```

Gotcha de ambiente (armadilha que não é bug de código: ferramenta, infra, dependência) é uma
linha com data na seção do fim: `- <AAAA-MM-DD> · <armadilha> · <como contornar>`.

IDs colidiram por trabalho em paralelo: quem faz o merge renumera a mais nova.

## Decisões

### D-001 · 2026-11-03 · Regras migradas para `AGENTS.md` + `.rules/`; ferramentas recebem só ponteiro
- Contexto: regras R1–R14 viviam em `CLAUDE.md` com cópia manual em `.cursor/rules/regras-projeto.mdc`; Antigravity, Copilot e Codex não liam nada.
- Alternativas: manter `CLAUDE.md` como fonte e criar mais cópias (`GEMINI.md`, `.agents/rules/`).
- Motivo: `AGENTS.md` é lido nativamente por Cursor, Antigravity, Copilot e Codex; um texto só não diverge.
- Afeta: `AGENTS.md`, `.rules/`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`
- Revisar quando: uma ferramenta usada no projeto deixar de carregar `AGENTS.md` (teste: perguntar o comando de teste em sessão nova).

### D-002 · 2026-11-03 · R10 aceita cor literal em `.ts` só como fallback de token para canvas
- Contexto: 28 cores literais em `.ts` (Chart.js lê tokens em tempo de render e precisa de valor se o token falhar).
- Alternativas: refatorar todos os gráficos para ler só tokens, sem fallback.
- Motivo: fallback igual ao token claro não muda o visual e evita canvas sem cor; refatorar mexe em código testado sem ganho visível.
- Afeta: `.rules/projeto.md` R10, `scripts/docs-check.js` verificação 11
- Revisar quando: a `ChartSample` (demo do template em `widgets-dropdown.component.ts`, cores `#4dbd74`/`#ffbd47`) for removida; tirar a exceção conhecida do check.

### D-003 · 2026-11-03 · ADR duplicados renumerados (017, 018, 019)
- Contexto: E-004.
- Alternativas: aceitar números duplicados com sufixo.
- Motivo: número de ADR é chave de referência; duplicado torna "ADR-011" ambíguo.
- Afeta: `docs/decisoes/`, referências em `docs/`
- Revisar quando: nunca; ADR não é renumerado de novo.

### D-004 · 2026-11-03 · Verificação mecânica por hook de git e `npm run verify`; CI só como exemplo
- Contexto: nenhuma regra era cobrada antes do commit; `.github/` do template saiu (R8).
- Alternativas: workflow de CI versionado (GitHub Actions).
- Motivo: o pipeline do destino corporativo é desconhecido; hook e script npm valem em qualquer clone e qualquer IA. Exemplo de CI em `docs/dependencias-e-ambiente.md` seção 6.
- Afeta: `.githooks/`, `package.json` (scripts `verify`, `rules:check`, `hooks:install`, `build:prod`, `test:ci`)
- Revisar quando: o repositório de destino tiver pipeline: copiar as etapas de `verify` para ele.
- Revista em 2026-11-04: a esteira corporativa passou a ter `Jenkinsfile` versionado (Fase 7 do plano, ADR-023), com as etapas de `verify`; hook e `npm run verify` continuam valendo localmente.

### D-005 · 2026-11-03 · `frontend-template-angular` mantém as páginas de demo compiladas
- Contexto: a landing tirou as demos do build (R14, ADR-016); o template é base para painel novo em Angular 15.
- Alternativas: aplicar a R14 também no template.
- Motivo: no template as demos compilam e rodam (referência viva de CoreUI 4.x/Angular 15); na base de conhecimento elas não compilam. O template não é sincronizado com a landing.
- Afeta: `../frontend-template-angular/`
- Revisar quando: o template virar ponto de partida de um painel real; aí aplicar a receita da R14.

### D-006 · 2026-11-03 · Só `AGENTS.md` carrega automaticamente; `.rules/` é aberto a pedido
- Contexto: `CLAUDE.md` e o `.mdc` do Cursor importavam `.rules/projeto.md`; com `AGENTS.md`, 266 linhas sempre carregadas (aderência cai acima de ~200).
- Alternativas: manter o import e encolher `projeto.md`; symlink `.claude/rules`.
- Motivo: o índice de uma linha por regra no `AGENTS.md` cobre o essencial (APIs proibidas, tokens, pt-BR); o texto completo vale quando a tarefa toca a regra, e o `AGENTS.md` manda abrir `.rules/` antes da primeira ação.
- Afeta: `CLAUDE.md`, `.cursor/rules/regras-projeto.mdc` (landing e template), `docs/portabilidade.md` §6
- Revisar quando: um agente violar R3 ou R10 sem ter aberto `.rules/projeto.md`; aí voltar o import no ponteiro da ferramenta que falhou.

### D-007 · 2026-11-03 · Migração Node 22 / Angular 20 em salto único, specs alteradas só na API
- Contexto: o ambiente de destino exige Node `^22.12.0`; Angular 15 só suporta Node 14/16/18.
- Alternativas: `ng update` em cadeia 15→16→…→20 (cinco majors do Angular, seis degraus do CoreUI); manter Angular 15 em Node 22 sem suporte.
- Motivo: o clone v5.5 da pasta pai já roda o conjunto alvo; trocar versões uma vez e converter com as schematics oficiais (standalone, control flow) chega ao mesmo código com um só ciclo de testes. Plano em `docs/planejamento/migracao-node22-angular20.md`, decisão em ADR-021.
- Exceção à regra "não alterar teste existente": specs mudaram só de API (`ChatModule` → componente standalone, `declarations` → `imports`, `overrideComponent` para manter teste raso, `grid.drawBorder` → `border.display`); nenhuma expectativa mudou.
- Afeta: `package.json`, `angular.json`, `tsconfig*.json`, `karma.conf.js`, `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, `views/*/routes.ts`, `.rules/projeto.md` R1–R3, `scripts/docs-check.js`
- Revisar quando: o destino pedir Angular 21+ (Vitest vira o runner padrão) ou o Sass 3 remover `@import` (hoje silenciado em `angular.json`).

## Gotchas de ambiente

- 2026-11-03 · Angular 20 exige Node `^20.19 || ^22.12 || ^24`; `.nvmrc` = 22 · `nvm use` (lê `.nvmrc`) antes de qualquer comando npm.
- 2026-10-27 · A pasta pai `LangePageAgenda/` é um clone do CoreUI 5.5 (Angular 20) · nunca rodar comandos npm nela; o projeto é esta pasta, com git próprio.
- 2026-10-28 · `karma.conf.js` do template roda em modo watch com Chrome visível · usar `npm run test:ci`.
- 2026-10-28 · `exceljs` traz tipagens que exigem tipos do Node · módulo declarado em `src/declarations.d.ts` (ADR-017); não habilitar `skipLibCheck`.
- 2026-11-03 · `exceljs/dist/exceljs.min.js` é CommonJS · fica em `allowedCommonJsDependencies` do `angular.json` (sem ele, aviso no build).
- 2026-11-03 · CoreUI 5 importa via `@use`; nossos SCSS ainda usam `@import` (variáveis da marca antes do CoreUI) · aviso `import` silenciado em `stylePreprocessorOptions`; migrar para `@use ... with()` antes do Sass 3.
- 2026-11-03 · Schematic `@angular/core:control-flow` com `--path=./` também reescreve `base-de-conhecimento/` · rodar com `--path=src/app`.
- 2026-11-03 · CoreUI 5 declara as variáveis da navegação lateral em `.sidebar-nav`, não em `.sidebar` · sobrescrever em `.sidebar .sidebar-nav` (`_components.scss`).
