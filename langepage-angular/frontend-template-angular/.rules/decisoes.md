# Decisões — tomadas com motivo; não reabra sem pedido

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

### D-001 · 2026-11-03 · Páginas de demo do CoreUI 4.x continuam compiladas no template
- Contexto: a `landing-analitica` tirou as demos do build e as guardou em `base-de-conhecimento/` (R14 de lá, ADR-016 de lá).
- Alternativas: aplicar a mesma R14 aqui.
- Motivo: neste template as demos compilam, rodam e têm spec: são referência viva de CoreUI 4.x/Angular 15. Fora do build elas não compilam e envelhecem sem aviso.
- Afeta: `src/app/views/`, `src/app/layout/default-layout/_nav.ts` (antes de D-003, `containers/`)
- Revisar quando: um painel real for derivado daqui; nele, aplicar a receita da R14 da `landing-analitica`.
- Revista em 2026-11-03 (D-003): as demos agora são as do CoreUI 5.5 (Angular 20), continuam compiladas e com spec.

### D-002 · 2026-11-03 · Regras migradas para `AGENTS.md` + `.rules/`; ferramentas recebem só ponteiro
- Contexto: regras viviam em `CLAUDE.md` com cópia manual em `.cursor/rules/regras-projeto.mdc`; Antigravity, Copilot e Codex não liam nada.
- Alternativas: manter `CLAUDE.md` como fonte e criar mais cópias.
- Motivo: `AGENTS.md` é lido nativamente por Cursor, Antigravity, Copilot e Codex; um texto só não diverge. Mesmo modelo da `landing-analitica` (D-001 de lá).
- Afeta: `AGENTS.md`, `.rules/`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`
- Revisar quando: uma ferramenta usada deixar de carregar `AGENTS.md`.

### D-003 · 2026-11-03 · Template recriado sobre o CoreUI Free Angular Admin Template v5.5 (Angular 20, Node 22)
- Contexto: o ambiente de destino exige Node `^22.12.0`; Angular 15 só suporta Node 18. O template era o demo 4.3 mais tema, regras e docs.
- Alternativas: migrar as 16 mil linhas de demos 4.x para a API 5.x com `ng update` e ajuste manual; copiar a `landing-analitica` migrada sem as páginas de produto (sincronizaria o que não foi pedido).
- Motivo: o clone v5.5 da pasta pai é o mesmo demo já em Angular 20; trocar `src/` e a configuração por ele e reaplicar só o que é deste template (`ThemeService` com testes, seletor Claro/Escuro/Automático, `environments/`, `_theme-dark.scss`, proxy, orçamentos, regras, docs, scripts) mantém tudo o que foi feito aqui. ADR-004.
- Afeta: `src/**`, `angular.json`, `package.json`, `tsconfig*.json`, `karma.conf.js`, `.nvmrc`, `.rules/projeto.md` R1–R3, R8–R10
- Revisar quando: o destino pedir Angular 21+ ou o CoreUI lançar 5.6+.

## Gotchas de ambiente

- 2026-11-03 · Angular 20 exige Node `^20.19 || ^22.12 || ^24`; `.nvmrc` = 22 · `nvm use` (lê `.nvmrc`) antes de qualquer comando npm.
- 2026-11-03 · O demo v5.5 tem bundle inicial de ~6,2 MB (ícones e gráficos no inicial) · orçamento `initial` 7 MB/8 MB, como no template v5.5; um painel derivado deve voltar a 1,5 MB/6 MB ao tirar as demos.
- 2026-10-28 · Sem `.git` próprio, o inventário pula a comparação com o template e os hooks não instalam · `git init` ao derivar o projeto.
- 2026-10-28 · `karma.conf.js` do CoreUI roda em modo watch com Chrome visível · usar `npm run test:ci`.
