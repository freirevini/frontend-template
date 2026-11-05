# ADR-015 — Mapeamento tela × produção com carimbo verificado

**Data:** 2026-10-28 · **Situação:** aceita

## Contexto

A página Triagent roda com mocks. No destino, o usuário vai indicar os nomes das colunas de produção e a IA precisa ligar os dados
rapidamente, refletindo exatamente o que foi desenvolvido. A R13 cobria contratos (`contratos-de-dados.md`), mas não havia lugar
para o de-para com produção nem nada que impedisse esse de-para de ficar desatualizado.

## Decisão

- Novo `docs/mapeamento-de-dados.md`: por bloco da página, cada campo do front (`Interface.campo`), formato, exemplo, onde aparece
  e a coluna **"Coluna em produção"** para preencher; domínios de valores (segmento, classificação); lista do que o front calcula
  (não buscar no banco); receita de ligação; conferência "reflete exatamente"; registro de ligações.
- Ligação por **adaptador** por bloco (`*.adapter.ts`, `PRODUCTION_COLUMNS` + `fromProduction`), aplicado no serviço antes do
  `validate*`: interfaces, agregações, componentes e textos não mudam.
- R13 ganhou a linha "campo consumido pela tela / interface / domínio → `mapeamento-de-dados.md`" e o parágrafo da ligação
  (CLAUDE.md e `.cursor/rules/regras-projeto.mdc`).
- `docs:check` (verificação 7): carimbo `data-contract-hash` = SHA-1 das declarações `export interface`/`export type` de
  `DATA_CONTRACT_FILES` (sem comentários) e cada campo dessas interfaces precisa aparecer no documento como `Interface.campo`.

## Consequências

- Mudar uma interface de dados sem revisar o mapeamento quebra o `docs:check` (testado: campo novo acusa carimbo e campo não mapeado).
- O Tráfego ainda não tem interface de resposta no código (valores aleatórios); seu de-para usa o formato proposto
  `TrafficResponse` e entra no carimbo quando a interface for criada (acrescentar o arquivo a `DATA_CONTRACT_FILES`).
- Página nova com dados acrescenta sua seção ao documento e seus modelos à lista do check.
