# ADR-004 — Listas clicáveis por `st.pills`; componente v1 só se reprovado

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D3

## Contexto

Legenda do Normativos Recebidos (totais, participação, barra), legenda da rosca e barras de temas são listas clicáveis
com HTML próprio na landing. Em 1.40 não há Components v2.

## Decisão

Nas F4–F6, `st.pills` (zero JavaScript, menor fidelidade) através de `compat.clicklist`. Na F9, comparação lado a lado:
se a diferença for reprovada, componente v1 em iframe (`src/components/clicklist/`, HTML/CSS próprios, +2 dias), sem
mudar as páginas.

## Consequências

- Totais e participação aparecem fora do chip (HTML ao lado) até a decisão da F9.
- JavaScript de componente v1, se entrar, é mínimo, versionado e sem dados do usuário (risco de scanner, plano §7).
