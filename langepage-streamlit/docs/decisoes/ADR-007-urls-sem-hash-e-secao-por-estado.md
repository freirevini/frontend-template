# ADR-007 — URLs sem `#`, seção por estado, `/dashboard` redireciona

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D8

## Contexto

A landing usa rotas com hash (`/#/triagent`) e âncoras por seção; Streamlit tem rotas por `st.Page(url_path=...)` e
não rola até âncora por URL.

## Decisão

Rotas `/` (Início), `/triagent`, `/scalation`, `/analitico`; subitem do menu leva à página com a seção pedida no
estado (`compat.section_link` + `consume_section`) e a página rola até ela (`ui.scroll_to_section`, via `run_js`).
`src/views/dashboard.py` só redireciona `/dashboard` para `/triagent` (sem ficha, R15).

## Consequências

- Links antigos com `#` não funcionam; a seção não fica na URL (equivalente, plano §5).
