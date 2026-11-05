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

Sem entradas próprias até 2026-11-03. Lições herdadas do projeto de origem (`landing-analitica`), sem ID aqui:

- Saída que não segue o tema da tela (Excel, PDF, imagem) lê tokens só do `:root` claro; nunca `--brand-primary` do tema ativo.
- `c-sidebar-nav` do CoreUI 4 não reconhece URL com âncora para abrir o grupo: usar `dropdownMode="none"` e abrir o grupo no layout.
- Valor de token citado em doc é copiado do SCSS na mesma entrega; o carimbo `tokens-hash` obriga a revisar.

### E-001 · 2026-11-04 · Campo de ambiente da URL base tinha prefixo colado em vez de `apiBase`, e o `docs:check` não acusava
- Área: `src/environments/environment.ts`, `src/environments/environment.prod.ts`, `scripts/docs-check.js`
- Sintoma: o campo de ambiente da URL base levava um prefixo colado a "api" e o `docs:check` passava.
- Causa: a varredura de termos do `docs:check` exigia fronteira não alfanumérica dos dois lados; camelCase e sufixo maiúsculo escapavam.
- Regra: campo de ambiente da URL base é `apiBase`; nunca prefixo colado em identificador. A varredura acusa, com distinção de maiúsculas, o termo colado em camelCase ou em maiúscula sem letra depois.
- Teste: `scripts/docs-check.js` (provado em cópia temporária: os dois identificadores de prova acusados, "obviamente" não)
- Commit: sem repositório git (template)
- Origem: 2026-11-04 · Claude Code · pedido do usuário

### E-002 · 2026-11-04 · A varredura de termos do `docs:check` não acusava o termo como prefixo colado a letras
- Área: `scripts/docs-check.js` (verificação 15)
- Sintoma: revisão independente: nome começando pelo termo (termo + "Theme", termo + "js-") passava.
- Causa: o padrão exigia fronteira não alfanumérica dos dois lados, e a variante colada só cobria letra minúscula antes do termo.
- Regra: a varredura acusa também o termo no início de palavra seguido de letra, sem diferenciar maiúsculas (`(?<![A-Za-z0-9])<termo>[A-Za-z]`), fora `package-lock.json` e binários.
- Teste: `scripts/docs-check.js` (provado com arquivo plantado e removido: os dois identificadores de prova acusados antes não, depois sim; projeto sem falso positivo)
- Commit: sem repositório git (template)
- Origem: 2026-11-04 · Claude Code · revisão independente (mesma correção do landing-analitica)
