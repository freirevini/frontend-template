# ADR-003 — Tema escuro parcial em Streamlit 1.40

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D2

## Contexto

Streamlit 1.40 aceita um `[theme]` só, com poucas chaves. A landing tem tema claro, escuro e automático com tokens da marca.

## Decisão

Opção (a): o tema "Dark" do Streamlit + CSS da marca nos blocos próprios. Critério de aceite: página, sidebar, header, cards,
chips e segmentado, gráficos, rodapé e chat nos tokens escuros da marca (`tokens.DARK`); widgets nativos (date input,
dataframe, uploader, popover) no escuro padrão do Streamlit. Seletor Claro/Escuro/Automático no header.

## Consequências

- Fidelidade do escuro ≈ 60–70 % até a exceção de versão (ADR-002); diferença registrada.
- Escuro reprovado pelo produto: alternativa (b) só claro na v1, ou exceção de versão.
- Saídas fora da tela (Excel) usam só tokens claros (R9).
