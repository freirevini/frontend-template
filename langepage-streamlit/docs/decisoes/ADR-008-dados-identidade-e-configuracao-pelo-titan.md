# ADR-008 — Dados pelo BFF Atlante, identidade pelo gateway, configuração por ambiente

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** §1 (premissas da arquitetura corporativa)

> Revisto em 2026-11-04 pelo ADR-009: o prefixo passou a `/v1` (contrato v1), relativo ao `bff.base_url`; o resto continua.

## Contexto

Respostas da arquitetura corporativa (2026-11-04) para o caminho GKE/Titan: dados exclusivamente pelo BFF Atlante (BFF →
Orquestrador → Átomos), sem banco nem Unity Catalog; identidade por cabeçalhos do Ingress Gateway (`x-user-id`,
`x-user-email` ou JWT) e cookie de sessão autenticado pelo BFF, sem `st.login`; configuração e segredos por ambiente
em ConfigMaps/Secrets.

## Decisão

- `src/core/api.py` é a única porta HTTP (`bff.base_url` + `/conforme/...`); mocks em `data/` até o contrato (R4).
- `src/core/auth.py` lê a identidade conforme `AUTH_MODE` (`none`, `mock`, `gateway`, `oidc`); só o primeiro nome vai
  para a tela (R5).
- `settings.yaml` com `${VAR:padrão}` + `ENV`, `AUTH_MODE`, `BFF_BASE_URL`, `CHAT_MOCK` por ambiente; nenhum host
  versionado (R6).

## Consequências

- Mesma imagem em DES, UAT e PRD; muda só a configuração.
- Testes simulam cabeçalhos e variáveis; nenhum teste chama rede.
