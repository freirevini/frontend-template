# ADR-006 — Agente orquestrado no BFF; escopo do chat na v1

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D5, D7

> Revisto em 2026-11-04 pelo ADR-009: as rotas `/conforme/chat/*` deram lugar a `/v1/agente/sessoes/...` (contrato v1); o escopo do chat na v1 continua.

## Contexto

Na landing, o Agente da Agenda é um widget próprio que consome `/conforme/chat/*`; a orquestração (fluxo guiado,
Gemini via Vertex AI, guardas) é do BFF Atlante (ADR-011 da landing). Streamlit é síncrono por rerun: "Parar" exige
thread cancelável, digitação exige `write_stream`, colar print exige `chat_input` com arquivo.

## Decisão

- **D7:** orquestração no BFF; o Streamlit só consome o contrato (`docs/contratos-de-dados.md` §9). Sem Gemini, chave
  de modelo ou prompt no app.
- **D5 (a):** fora da v1, como diferença aceita: "Parar", efeito de digitação, colar print (Ctrl+V) e ponto verde no
  botão. Todo o resto do chat da landing entra (F8).

## Consequências

- `POST /conforme/chat/cancelar` fica sem uso na v1.
- Implementar D5 (b) depois custa ≈ 3 dias e não muda o contrato.
