# Erros — já cometidos e corrigidos aqui; não repita

Leia antes de tocar em qualquer área citada: `grep -n "<arquivo>" .rules/erros.md`.
Cada entrada nasce no fim de uma correção (`AGENTS.md`, "Após cada ajuste"). ID é estável;
entrada nunca é apagada, só compactada. O hook de commit recusa correção sem entrada nova.

## Formato

```markdown
### E-<nnn> · <AAAA-MM-DD> · <comportamento errado, em uma frase; não o número do ticket>
- Área: `<arquivo ou módulo>`, `<teste>`
- Sintoma: <o que apareceu, como foi notado>
- Causa: <raiz, uma linha>
- Regra: <verbo, "nunca" ou "sempre": o que fazer daqui em diante>
- Teste: `<caminho::nome>` ou "sem teste possível: <motivo>"
- Commit: <hash curto>, ou "este" quando a entrada vai no mesmo commit da correção
- Origem: <data · ferramenta/IA ou humano · pedido do usuário | handoff C<n>.<n> de .doc/<task>.md | CI>
```

## Como manter

- Entrada nova sempre no fim, com o próximo ID.
- `Área` é o campo de busca: nome exato de arquivo ou módulo.
- `Regra` é executável. "Cuidado com datas" não é regra; "converta para UTC na borda da API;
  nunca compare datetime naive com aware" é.
- Regra que vale para mais de um lugar vai para `testes.md`, `escopo.md` ou "Não fazer" do
  `AGENTS.md`; a entrada passa a apontar para lá.
- Acima de ~40 entradas ou 10.000 caracteres: entradas antigas viram uma linha
  (`E-003 · 2026-07-02 · <título> · regra em testes.md §5`). ID fica.
- IDs colidiram (dois agentes em paralelo: worktrees, Agent Manager, branches): quem faz o
  merge renumera a entrada mais nova para o próximo ID livre e corrige as referências.
  `bash .rules/check.sh` acusa ID duplicado.
- Correção vinda de handoff entre IAs (`.doc/`, item `C<n>.<n>` do `context-out`): a entrada
  cita o item em `Origem`; o documento de handoff cita o `E-nnn`.

## Entradas

Entradas compactadas (uma linha; texto completo no histórico do git). E-001 a E-005 foram registradas retroativamente em
2026-11-03 (trabalho de 2026-10-27/28 em working tree).

- E-001 · 2026-10-28 · Excel exportado no tema escuro com cabeçalho de baixo contraste · Área `src/app/core/export/xlsx-export.ts` · Regra: saída fora da tela (Excel, PDF, imagem) lê só tokens claros `--app-export-*` (testes.md §7) · Teste `xlsx-export.spec.ts::uses the light brand colors even when the dark theme is active`
- E-002 · 2026-10-28 · Doc do design system com token diferente do SCSS · Área `docs/design-system.md` · Regra: valor de token citado em doc vem do SCSS na mesma entrega; carimbo `tokens-hash` do `docs:check` obriga a revisar
- E-003 · 2026-10-28 · Grupo do menu não abria com link com âncora · Área `default-layout.component.ts`, `_nav.ts` · Regra: com âncora no menu, `dropdownMode="none"` + `openActiveGroup()` · Teste `default-layout.component.spec.ts::opens only the closed group that holds the active link`
- E-004 · 2026-10-28 · Números de ADR usados duas vezes · Área `docs/decisoes/` · Regra: próximo ADR = maior + 1 (`ls docs/decisoes`); `docs:check` verificação 10 acusa duplicado (AGENTS.md "Não fazer")
- E-005 · 2026-11-03 · Regras copiadas em dois arquivos e docs com estado antigo do código · Área `CLAUDE.md`, `.cursor/rules/`, `docs/` · Regra: regra só em `AGENTS.md`/`.rules/`, demais arquivos são ponteiro; frase que envelhece vai para `STALE_CLAIMS` (`docs:check` 9 e 12)
- E-006 · 2026-11-03 · Grupo do menu fechava ao clicar num subitem (CoreUI 5) · Área `default-layout.component.ts` (`openActiveGroup`) · Regra: estado de componente de terceiro se lê pelo efeito visível, não por classe que ele reescreve; ao migrar CoreUI, smoke do menu (portabilidade §5 item 7) · Teste `default-layout.component.spec.ts` › "does not toggle a group whose items are visible even without the \"show\" class"
- E-007 · 2026-11-04 · Exportar Excel limpava os filtros da página · Área `src/app/core/export/xlsx-export.ts` (`downloadXlsx`), `dashboard.component.ts` (`onDocumentClick`) · Regra: elemento temporário de download nunca entra no documento (`link.click()` em link solto); não "corrigir" no ouvinte por alvo desconectado ou `isTrusted` · Teste `xlsx-export.spec.ts::downloads without the click reaching document listeners (page outside-click handlers)`, `dashboard.component.spec.ts::keeps the page filters through the Excel download; a real click outside still clears them` · Commit pendente
- E-008 · 2026-11-04 · Subtítulo da Cascata dizia "Carregando período..." com a carga falhada · Área `waterfall-chart.component.{ts,html}` (`subtitle`) · Regra: texto de estado deriva de `state`, não da ausência de dado; no erro, nada de carga nem período de outra carga · Teste `waterfall-chart.component.spec.ts::period subtitle …` (3 testes) · Commit pendente

### E-009 · 2026-11-04 · Imagem de produção sem `env.json` válido mostrava dados fictícios como se fossem reais
- Área: `src/app/core/config/runtime-config.service.ts` (`defaultRuntimeConfig`, `parseRuntimeConfig`), `src/app/containers/default-layout/default-header/` (`MOCK_SOURCES`), `src/app/app.config.ts`
- Sintoma: ConfigMap ausente, ilegível ou não-objeto → `chatMock`/`dataMock` `true`: UAT/PRD abriria com dados simulados, sem aviso na tela.
- Causa: um só conjunto de padrões ("iguais ao `env.json` versionado") para desenvolvimento e produção; nada na interface dizia que os dados eram simulados.
- Regra: padrão de falha em build de produção nunca liga mock (`defaultRuntimeConfig(environment.production)`); mock ligado sempre aparece na tela (selo "Dados simulados"); o ConfigMap de UAT/PRD define `dataMock` e `chatMock` `false` (portabilidade §4.3).
- Teste: `src/app/core/config/runtime-config.service.spec.ts::runtime config fallback (production build)` (4 testes); `src/app/containers/default-layout/default-header/default-header.component.spec.ts::DefaultHeaderComponent "Dados simulados" badge` (4 testes)
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · revisão independente, item 1

### E-010 · 2026-11-04 · 401 logo após voltar da entrada corporativa redirecionava de novo, em laço
- Área: `src/app/core/http/login-redirect.service.ts` (`LoginRedirectService`, `BROWSER_NAVIGATE`), `src/app/core/http/session-expired-notice.component.ts`
- Sintoma: gateway devolvendo o usuário sem sessão → cada volta dava outro 401 e outro redirecionamento, sem fim.
- Causa: a trava vivia só na memória da página; nada lembrava a ida anterior à entrada.
- Regra: antes de navegar para `loginUrl`, gravar só o horário em `sessionStorage` (`landing-analitica.login-redirect-at`; nunca token, R5); 401 menos de 60 s depois não redireciona e mostra "Entrar novamente". O gateway aceita `retorno` só com uma única `/` inicial (contratos §8).
- Teste: `src/app/core/http/login-redirect.service.spec.ts` (5 testes); `src/app/core/http/session-expired-notice.component.spec.ts::shows the pt-BR text and the "Entrar novamente" link when a 401 comes right after a trip to sign-in`
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · revisão independente, item 3

### E-011 · 2026-11-04 · Gráficos com `[redraw]="true"` sumiam na primeira troca de dados (rosca, e-mails, cascata)
- Área: `src/app/views/dashboard/classification/applicability-chart.component.html`, `src/app/views/dashboard/emails/emails-chart.component.html`, `src/app/views/scalation/waterfall/waterfall-chart.component.html`; `@coreui/angular-chartjs` 5.5.24 (`ChartjsComponent.chartUpdate`)
- Sintoma: clicar num tema de "Assunto das Normas Aplicáveis" deixava a rosca vazia (canvas `display: none`, 0×0) até recarregar; idem e-mails ao trocar período e Cascata ao trocar período ou unidade.
- Causa: no CoreUI 5.5, `chartUpdate` com `redraw` chama `chartDestroy()` (que não zera `this.chart`) e depois `chartRender()`, que sai cedo porque `this.chart` ainda existe; o Chart.js destruído devolve ao canvas o `display: none` inicial. Origem: migração para CoreUI 5.5 (ADR-021, 2026-11-03), não a Fase 5: o build anterior à Fase 5 (`dist-copy`) servido em 4351 mostra o mesmo nos três gráficos.
- Regra: nunca usar `[redraw]="true"` no `<c-chart>` do CoreUI 5; dados e opções novos (objetos novos) atualizam o mesmo gráfico. Ao migrar CoreUI/Chart.js, conferir no navegador que cada gráfico continua desenhado depois de trocar filtro, período e unidade.
- Teste: `applicability-chart.component.spec.ts::keeps the pie drawn after a theme is picked in the themes list (chart updated, not torn down)`; `emails-chart.component.spec.ts::keeps the chart drawn after the period changes (chart updated, not torn down)`; `waterfall-chart.component.spec.ts::keeps the chart drawn after the period changes (chart updated, not torn down)`
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · pedido do coordenador (item 11), evidência de recaptura de tela

### E-012 · 2026-11-04 · Subtítulo do card de e-mails dizia "Carregando período..." com a carga já falhada
- Área: `src/app/views/dashboard/emails/emails-chart.component.{ts,html}` (`subtitle`)
- Sintoma: mesmo defeito do E-008, no card "Fluxo de e-mail - Triagem": erro de carga e, sob o título, "Carregando período...".
- Causa: subtítulo derivado só de `aggregate?.subtitle`; a correção do E-008 não procurou o mesmo padrão nos outros cards.
- Regra: ao corrigir um padrão de template, procurar o mesmo texto/expressão no resto de `src/app` (`grep`) e corrigir ou listar cada ocorrência na mesma entrega.
- Teste: `src/app/views/dashboard/emails/emails-chart.component.spec.ts::period subtitle is hidden when the load fails, never "Carregando período..."`
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · revisão independente, item 9

### E-013 · 2026-11-04 · A varredura de termos do `docs:check` não acusava o termo como prefixo colado a letras
- Área: `scripts/docs-check.js` (verificação 15)
- Sintoma: nome começando pelo termo (termo + "Theme", termo + "js-") passava.
- Causa: o padrão exigia fronteira não alfanumérica dos dois lados, e a variante colada só cobria letra minúscula antes do termo.
- Regra: a varredura acusa também o termo no início de palavra seguido de letra, sem diferenciar maiúsculas (`(?<![A-Za-z0-9])<termo>[A-Za-z]`), fora `package-lock.json` e binários.
- Teste: `scripts/docs-check.js` (provado com arquivo plantado e removido: os dois identificadores de prova acusados antes não, depois sim; projeto sem falso positivo)
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · revisão independente, item 10

### E-014 · 2026-11-04 · CSP do Nginx não restringia scripts nem conexões
- Área: `nginx/security-headers.conf`, `nginx/default.conf` (`gzip_types`), `angular.json` (`optimization.styles.inlineCritical`)
- Sintoma: CSP só com `frame-ancestors`, `object-src`, `base-uri`; o `index.html` de produção tinha `onload="this.media='all'"` (CSS crítico), que `script-src 'self'` bloquearia.
- Causa: CSP mínima provisória ("completa na esteira") que nunca foi completada; o `inlineCritical` padrão do Angular nunca foi conferido contra CSP.
- Regra: CSP com `script-src 'self'` (sem `unsafe-inline`/`unsafe-eval`) e `inlineCritical: false` no build de produção; mudou cabeçalho ou dependência que gera script/estilo: servir o build com os cabeçalhos exatos e conferir no navegador todas as páginas, chat e Excel, nos dois temas, sem violação no console.
- Teste: sem teste unitário possível (cabeçalho do servidor); verificação no navegador com servidor que lê os cabeçalhos de `nginx/security-headers.conf`: 0 violações em Início, Triagent, Scalation, Analítico, chat e Excel, claro e escuro (2026-11-04).
- Commit: pendente (usuário commita)
- Origem: 2026-11-04 · Claude Code · revisão independente, itens 2 e 6
