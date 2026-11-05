# ADR-014 — Tabela Analítica: normas classificadas, com todos os filtros da página

**Data:** 2026-10-28 · **Situação:** aceita

## Contexto

Pedido: abaixo dos e-mails, uma seção "Tabela Analítica" que mostre os valores por trás dos gráficos e reflita os filtros aplicados
neles, com exportação para Excel.

## Decisão

- Fonte: as **normas classificadas** (`dashboard-classificacao.json`), uma linha por norma. É o único dado da página em nível de
  registro que os filtros alcançam todos juntos; Tráfego e cards de segmento são agregados prontos e os e-mails têm período próprio.
- Filtros refletidos: período/datas do Tráfego, selo "a classificar" (segmento), fatia da pizza (aplicabilidade) e tema da lista.
  O filtro de período do card de e-mails é local e não entra.
- Colunas: Data da classificação, Órgão, Tipo, Número, Tema, Segmento, Aplicável ao banco?, Área, Diretoria (mesmo vocabulário da
  tabela de normas dos e-mails). O mock ganhou `orgao`, `tipo`, `numero`, `area`, `diretoria` sem mudar as contagens.
- Tela: ordenação por coluna, 15 linhas por página, rolagem lateral. Excel (exceljs, R9): **todas** as linhas filtradas, na ordem da
  tela, com os filtros no subtítulo e no nome do arquivo.

## Consequências

- O contrato do BFF precisa devolver as normas linha a linha (não só um resumo). Com volume alto, paginação, ordenação e exportação
  vão para o servidor.
- CSV e PDF continuam pendentes (R9).
