# k8s/ — PLACEHOLDERS

Manifestos de referência até o Cookiecutter do Titan gerar os definitivos (`streamlit-sgen-base-ia-sample`, ADR-001,
D9). Na geração, **usar os do sample** e conferir que trazem o que está aqui: variáveis `ENV`, `AUTH_MODE`, `CHAT_MOCK`,
`FOOTER_ENTITIES` (ConfigMap) e `BFF_BASE_URL` (Secret), probes em `/_stcore/health`, ingress com upgrade de WebSocket, timeouts longos,
afinidade por cookie e corpo de até 20 MB. Valores `SUBSTITUIR-*` nunca recebem host real neste repositório (R6).
Detalhes em `docs/portabilidade.md`.
