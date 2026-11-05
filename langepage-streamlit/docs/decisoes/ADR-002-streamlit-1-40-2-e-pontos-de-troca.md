# ADR-002 — Streamlit 1.40.2 com pontos de troca; exceção de versão em paralelo

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D1

## Contexto

A arquitetura homologou `streamlit >= 1.38.0`, faixa 1.38.x–1.40.x (compatível com `pylib-sgen-base-genai-framework`
0.20.0 e Python 3.11). O protótipo da landing foi feito em 1.66 e usa APIs de 1.51+/1.53+ (`st.context.theme`,
`st.html` com JavaScript, Components v2, `ButtonColumn`, `st.pagination`, `st.container(horizontal=True)`, temas
`[theme.light]/[theme.dark]`).

## Decisão

- Fixar `streamlit==1.40.2` (último patch da faixa; ou o patch disponível no Nexus) — opção (a).
- Pedir em paralelo a exceção para 1.51+ (temas e Inter por configuração) ou 1.53+ (componentes sem iframe) — opção (b).
- Toda API ausente em 1.40 fica atrás de uma função de `src/core/compat.py`/`src/core/ui.py` (plano §4; D-003 em
  `.rules/decisoes.md`; tabela em `docs/arquitetura.md` §5).

## Consequências

- Exceção concedida: troca-se `compat.py`, `ui.py`, `config.toml` e a versão em `requirements.txt`, com novo ADR.
- Fidelidade em 1.40 conforme a matriz do plano §5 (Igual/Equivalente/Aprox.).
- `scripts/docs_check.py` (R3) acusa uso direto de APIs que contornam os pontos de troca.
