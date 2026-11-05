# ADR-005 — Paginação Anterior/Próxima e filtros limpos só por "Remover filtro"

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D4, D6

## Contexto

A Tabela Analítica pagina de 15 em 15 com Anterior/Próxima e "1–15 de N". Na landing, Esc ou clique fora limpam os
filtros da página.

## Decisão

- **D4:** paginação por botões Anterior/Próxima (igual à landing) via `compat.pager`; `st.pagination` quando a versão permitir.
- **D6:** filtros limpos só pelo botão "Remover filtro" da faixa de filtro (opção a); sem JavaScript global para Esc e
  clique fora.

## Consequências

- Diferença aceita: Esc e clique fora não limpam filtro.
- Ordenação por controle próprio (não pelo cabeçalho do dataframe), com as regras da landing (data ISO, número "4.855"
  → 4855, texto pt-BR, desempates).
