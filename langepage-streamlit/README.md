# langepage-streamlit

Réplica da landing **Agenda Normativa** (Angular 20.3 / CoreUI 5.5, congelada em `../langepage-angular/landing-analitica/`)
em **Streamlit 1.40.2**, para o ambiente corporativo (GKE / Plataforma Titan, Python 3.11, BFF Atlante).

**Estado (2026-11-04): fases F0–F9 executadas** (chrome e tema, núcleo de dados, Início, Triagent, Scalation, Analítico,
Agente da Agenda, fidelidade e documentação; revisão de código aplicada; `verify.sh` verde).
**F10 (integração no ambiente corporativo: ConfigMaps/Secrets, BFF real, esteira, GMUD) pendente.** Dados por mocks em `data/` até o
contrato do BFF. Regras em `AGENTS.md` e `.rules/`; documentação em `docs/README.md`.

## Rodar

```bash
source .venv/bin/activate                 # criado com uv; corporativo: pip + Nexus (docs/dependencias-e-ambiente.md)
uv pip install --python .venv/bin/python -r requirements-dev.txt
streamlit run src/app.py                  # porta 8501; saúde em /_stcore/health
bash scripts/verify.sh                    # ruff, pytest, docs_check, check.sh — verde antes de "pronto"
```

Variáveis: `ENV`, `AUTH_MODE` (`none`/`mock`/`gateway`/`oidc`), `BFF_BASE_URL` (vazio = mock), `CHAT_MOCK`
(`AGENTS.md`, "Ambientes").

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/README.md` | índice e ordem de leitura |
| `docs/arquitetura.md` | `app.py`, páginas, `core/`, estado, pontos de troca de versão |
| `docs/paginas/` | uma ficha por página (R15) |
| `docs/contratos-de-dados.md` | mocks, endpoints `/conforme/...`, contrato do chat |
| `docs/design-system.md` | tokens, temas, componentes |
| `docs/dependencias-e-ambiente.md`, `docs/portabilidade.md` | pacotes, configuração, Titan |
| `docs/planejamento/plano-implementacao.md` | plano aprovado e §10 execução |
| `docs/changelog.md`, `docs/decisoes/` | histórico e ADRs |
