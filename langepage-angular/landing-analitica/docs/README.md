# Documentação — landing-analitica

Esta pasta precisa bastar sozinha para que outra pessoa ou outra IA (ex.: Cursor, em outro ambiente) entenda,
porte e adapte o projeto sem acesso à sessão que o construiu (regra R13 em `.rules/projeto.md`). Tudo em pt-BR (R12);
caminhos e identificadores como no código.

## Documentos

| Documento | Uma linha |
|---|---|
| `arquitetura.md` | Módulos, rotas lazy, layout (`default-layout`), páginas (`views/home`, `dashboard` = Triagent, `scalation`, `analytics`), componentes compartilhados (`period-filter`, `waterfall`), `ThemeService` e fluxo de temas |
| `contratos-de-dados.md` | Formas dos dados hoje mock (cards de segmento, Normativos Recebidos, `src/assets/data/dashboard-waterfall.json`), interfaces TypeScript, formatação pt-BR e como trocar o mock pela API (`apiBase` da configuração de execução + `/conforme/...`) |
| `mapeamento-de-dados.md` | De-para da página Triagent: cada campo que a tela consome × **coluna em produção** (o usuário preenche), domínios de valores, o que o front calcula, receita de ligação por adaptador e conferência "reflete exatamente"; carimbo `<!-- data-contract-hash: ... -->` verificado pelo `docs:check` |
| `design-system.md` | Tokens de `_brand.scss` / `_variables.scss` / `_theme-dark.scss`, tipografia Inter, componentes de UI (chips, segmented, cards em gradiente, sidebar navy), paleta de gráficos validada para daltonismo; carrega o carimbo `<!-- tokens-hash: ... -->` |
| `dependencias-e-ambiente.md` | Versões exatas (Node 22, Angular 20.3.14, TS 5.9.3, CoreUI 5.5.24), Nexus, comandos npm, `environment.ts`/`environment.prod.ts`, configuração de execução `assets/env.json`, imagem (`Dockerfile`, Nginx), `proxy.conf.json`, Karma/CI |
| `portabilidade.md` | Playbook do porte: pré-requisitos, o que copiar por categoria, cenários (repositório novo / integrar em projeto existente), pontos de adaptação com arquivo e trecho, checklist pós-porte, uso com o Cursor |
| `changelog.md` | Histórico por entrega, desde 2026-10-27: o que mudou e arquivos principais |
| `inventario.md` | **Gerado** por `npm run docs:inventory`: rotas, tokens claro/escuro, dependências e arquivos alterados em relação ao template CoreUI (`36966f6`). Não editar à mão |
| `glossario-ptbr.md` | Termos oficiais da interface (menu, rotas, gráficos, segmentos, datas/números); termo novo entra aqui antes de ser usado (R12) |
| `paginas/` | **Uma ficha por página** (R15): `inicio.md`, `triagent.md`, `scalation.md`, `analitico.md` + `README.md` (modelo). Identidade, blocos, dados consumidos campo a campo, calculado no front, de-para (aponta para `mapeamento-de-dados.md`), o que copiar para portar só aquela página, verificação; carimbo `<!-- page-data-hash: ... -->` vigiado pelo `docs:check` |
| `planejamento/` | Planos de funcionalidades (chat e card de e-mails já implementados; os planos ficam como referência de decisão e do backend); `chat-widget.md` = widget de chat flutuante com componente próprio, sem dependência nova (passos `P0`–`P8`, catálogo de funções de mensagens `M01`–`M27`); `agente-backend-spec.md` = especificação do backend no BFF Atlante (Java/Spring Boot: pacotes, propriedades, validações, prompts v1, esquemas, testes); `agente-normas-gemini.md` = comportamento do agente (fluxo guiado, Gemini via Vertex AI, guarda de tema, gate de arquivos, loop de esclarecimento; etapas `E0`–`E9`, decisões `D1`–`D10` e complementos `C1`–`C7` fechados); `migracao-node22-angular20.md` = plano de migração para Node 22, Angular 20.3 e CoreUI 5.5 (alvo, mapa de versões, estratégia de salto único, fases `P0`–`P7`, riscos; executado em 2026-11-03, ADR-021); `streamlit/` = estudo de replicação da landing em Streamlit (`README.md` resposta curta e cenários, `01-diagnostico-landing.md` inventário do que existe, `02-de-para-streamlit.md` fidelidade elemento a elemento, `03-guia-implementacao.md` receita, `04-cenarios-e-riscos.md` esforço e recomendação, `poc/` protótipo verificado em Streamlit 1.66.1; sem decisão tomada); [`adequacao-padroes-corporativos.md`](planejamento/adequacao-padroes-corporativos.md) = relatório de implementação por fases para adequar a landing (e o projeto Streamlit) aos padrões corporativos respondidos pela arquitetura em 2026-11-04: roteamento sem hash, imagem web, config em tempo de execução, contrato `/api/v1`, Problem Details, paginação, 401, quarentena de upload, orquestrador Python, Redis, PDBD; aguardando aprovação |
| `contratos/` | Contrato da API: `openapi-agenda-normativa-v1.yaml` = rascunho OpenAPI 3.0.3 (v1, contract-first) para o time do BFF, servidor `/api/v1`, Problem Details em todo 4xx/5xx, paginação e recursos da Triagent e do agente (ADR-023); `contratos-de-dados.md` traz o de-para campo a campo |
| `../base-de-conhecimento/` | **Fora de `docs/` e do build.** Páginas de demonstração do template (Tema, Componentes, Extras) guardadas como referência de componentes CoreUI 4.x; `README.md` com catálogo (componente, módulo, onde já é usado) e receita de reaproveitamento. Consultar ao criar ou alterar páginas (R14), sem se limitar a ela |
| `decisoes/` | ADRs (`ADR-nnn-*.md`) com índice em `decisoes/README.md`; ler antes de propor mudança de arquitetura ou de produto |

Fora de `docs/`, fazem parte do contrato: `AGENTS.md` (entrada para qualquer IA: comandos, índice das regras, pronto),
`.rules/` (`projeto.md` com o texto vinculante das regras, `escopo.md`, `testes.md`, `erros.md`, `decisoes.md`, `check.sh`;
`local.md`, regras locais fora do git, quando existir) e
`README.md` da raiz (como executar). `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/` são só
ponteiros para `AGENTS.md` (decisão D-001 em `.rules/decisoes.md`).

## Ordem de leitura recomendada

**Para uma IA (Cursor, Claude) que vai portar ou adaptar:**

1. `AGENTS.md` e `.rules/` (Cursor, Antigravity e Claude Code já carregam pelos ponteiros; ver `portabilidade.md` seção 6)
2. `docs/README.md` (este arquivo)
3. `docs/portabilidade.md`
4. `docs/arquitetura.md`
5. `docs/contratos-de-dados.md` e, para ligar dados reais, `docs/mapeamento-de-dados.md`; para portar uma página só, `docs/paginas/<slug>.md`
6. `docs/design-system.md`
7. `docs/dependencias-e-ambiente.md`
8. `docs/decisoes/`
9. `docs/glossario-ptbr.md` e `docs/changelog.md` conforme a tarefa; `docs/inventario.md` para a lista exata de arquivos/rotas/tokens

**Para humanos (onboarding ou revisão):**

1. `README.md` da raiz (rodar o projeto)
2. `docs/changelog.md` (o que já foi entregue)
3. `docs/arquitetura.md`
4. `docs/design-system.md`
5. `docs/contratos-de-dados.md`
6. `docs/dependencias-e-ambiente.md`
7. `docs/portabilidade.md` (só quem vai fazer o porte)
8. `AGENTS.md`, `docs/glossario-ptbr.md`, `docs/decisoes/`

## Regra de atualização (R13)

Toda mudança de código atualiza o documento correspondente **na mesma entrega**; sem isso a tarefa não está concluída.
A tabela "Se mudou → Atualize" fica em `.rules/projeto.md` (R13), num lugar só.

Verificação:

```bash
npm run docs:inventory   # regenera docs/inventario.md após mudanças estruturais
npm run docs:check       # falha (exit 1) listando cada pendência
npm run verify           # docs:check + rules:check + build de produção + testes: precisa passar antes de concluir
```

O `docs:check` (`scripts/docs-check.js`) confere:

1. documentos obrigatórios existem; `src/app/views/*`, `theme.service`, `default-layout` e `period-filter` aparecem em `arquitetura.md`;
2. todo arquivo de `src/assets/data/` e `apiBase` aparecem em `contratos-de-dados.md`;
3. toda dependência de `package.json` aparece em `dependencias-e-ambiente.md`;
4. carimbo `tokens-hash` de `design-system.md` = hash de `_brand.scss` + `_variables.scss` + `_theme-dark.scss`;
5. carimbo `inventory-hash` de `inventario.md` = hash de `package.json`, `_brand.scss`, `_theme-dark.scss`, `app.routes.ts`;
6. `portabilidade.md` cobre `apiBase`, `env.json`, `proxy.conf.json`, `Nexus` e `Checklist`;
7. carimbo `data-contract-hash` de `mapeamento-de-dados.md` e cada campo das interfaces de dados mapeado;
8. toda pasta de `base-de-conhecimento/paginas/` citada no README da base (R14);
9. `AGENTS.md` tem uma linha de índice para cada regra de `.rules/projeto.md`; `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/rules/regras.md` só apontam;
10. ADR sem número repetido, todos no índice, todo link do índice existe;
11. R10: nenhuma cor literal em `.scss` fora dos arquivos de tokens nem em `.html` fora do `index.html`; em `.ts`, só fallback de token ou tinta preta/branca;
12. frases vigiadas que ficaram falsas (lista `STALE_CLAIMS` no script; inclui citar regras por faixa em vez de número e endereços do antigo roteamento por hash fora de `planejamento/`);
13. R3 (APIs do Angular 16+; roteamento por hash `withHashLocation`/`HashLocationStrategy`) e R6 (`localhost`, `appdes`, `appuat`) em `src/`;
14. R15: toda rota com `loadChildren` tem `docs/paginas/<slug>.md` com as sete seções, citando cada arquivo de dados, mock e campo `Interface.campo` que a página alcança por `import`, e com o carimbo `page-data-hash` em dia.

`npm run rules:check` (`.rules/check.sh`) confere `AGENTS.md` e `.rules/`: presença, tamanho (12.000 caracteres por arquivo,
limite do Antigravity), slots sobrando, IDs repetidos em `erros.md`/`decisoes.md`, segredo e caminhos citados. Os hooks de
`.githooks/` rodam as duas verificações a cada commit e recusam commit de correção sem entrada em `.rules/erros.md` e sem teste.
