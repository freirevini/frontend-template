# ADR-020 — Ficha por página (`docs/paginas/`) para porte isolado com de-para alinhado

**Data:** 2026-11-03 · **Situação:** aceita

## Contexto

O usuário pode querer levar **uma página só** (Início, Triagent, Scalation ou Analítico) para outro projeto. A documentação
existente descreve o projeto inteiro (`arquitetura.md`), os contratos por fonte (`contratos-de-dados.md`) e o de-para por
bloco do Triagent (`mapeamento-de-dados.md`); nenhum lugar diz, por página, quais dados ela consome campo a campo e o que
é preciso copiar para ela funcionar sozinha. Sem isso, o porte de uma página repete a leitura do projeto inteiro e o
de-para sai desalinhado (campo esquecido, cálculo refeito no banco, dependência faltando).

## Decisão

- Regra **R15**: toda página roteada tem `docs/paginas/<slug>.md` com sete seções fixas (identidade, blocos, dados
  consumidos campo a campo, calculado no front, de-para e domínios, o que copiar, verificação). Modelo em
  `docs/paginas/README.md`.
- A ficha **não** repete a coluna "Coluna em produção": aponta para a seção de `docs/mapeamento-de-dados.md`, que continua
  sendo o único lugar para preencher. A Cascata ganhou a seção 3.5 no mapeamento e `waterfall.model.ts` entrou em
  `DATA_CONTRACT_FILES`.
- `docs:check` verificação 14 descobre, pelo grafo de `import` a partir da pasta da página, os arquivos de dados
  (`*.model.ts`, `*-data.service.ts`, `segment-cards.service.ts`, `dashboard-charts-data.ts`) e os mocks `assets/data/*.json`
  que a página alcança; exige cada arquivo, cada mock e cada campo `Interface.campo` na ficha; e vigia o carimbo
  `page-data-hash` (hash das declarações desses arquivos). O chat (`src/app/chat`) fica de fora: é do layout.

## Consequências

- Interface de dados mudou: a ficha da página falha no check até ser revisada (como já acontece com o mapeamento).
- Dependência indireta aparece na ficha (ex.: o Início alcança `dashboard-charts-data.ts` por causa de `TRAFFIC_SERIES`); a
  ficha diz o que copiar de fato e sugere extrair o acoplamento.
- Página nova nasce com ficha; bloco novo com dados atualiza ficha e mapeamento na mesma entrega (R13).
- Custo: quatro fichas para manter. Compensa pelo porte isolado e pelo de-para sem inconsistência.
