# Portabilidade — do espelho local ao repositório do Titan

Este repositório é o espelho de desenvolvimento (ADR-001, D9). O definitivo nasce do Cookiecutter da Plataforma Titan,
repositório base `streamlit-sgen-base-ia-sample` (projeto SGEN-BASE do Bitbucket corporativo; documentação no portal do
Titan Sample e no Confluence "N3 - Streamlit"). Este documento diz o que levar, onde encaixar e o que conferir.
Endereços internos não aparecem aqui (R6): estão na documentação do Titan.

## 1. Pré-requisitos no destino

- Acesso ao Cookiecutter/sample e ao projeto no Bitbucket; Python 3.11; pacotes de `docs/dependencias-e-ambiente.md` §2
  espelhados no Nexus (`pypi-all/simple`).
- ConfigMaps/Secrets por ambiente no GKE corporativo (genaigke) e BFF com o contrato v1 (`bff.base_url` + `/v1/...`, ADR-009) e `AUTH_LOGIN_URL` quando a reautenticação não for `/` (para sair do mock).

## 2. Mapeamento: sample do Titan × este repositório

| No sample | Aqui | Ação ao gerar pelo Cookiecutter |
|---|---|---|
| `Dockerfile` (imagem base corporativa, usuário não-root) | `Dockerfile` (placeholder) | **usar o do sample**; conferir que copia `src/`, `data/`, `.streamlit/`, `settings.yaml` e roda `streamlit run src/app.py`, e que o índice do pip do Nexus entra só no `RUN pip install` (segredo do BuildKit, `--secret id=pip_index_url,env=PIP_INDEX_URL`), nunca por `ENV` (fica na imagem) nem `ARG` (fica no `docker history`) |
| `.streamlit/config.toml` (porta 8501, CORS interno, `/_stcore/*`) | `.streamlit/config.toml` | manter as chaves do sample em `[server]`; acrescentar `[browser]`, `[client]`, `[theme]` e `enableStaticServing`/`maxUploadSize` daqui |
| `settings.yaml` (aplicação, `auth.mode`) | `settings.yaml` | juntar: chaves do sample + `bff`, `chat`, `cache`, `footer` daqui |
| `k8s/` ou templates Helm (ingress com timeout e WebSocket) | `k8s/` (placeholder) | **usar o do sample**; acrescentar as variáveis do §4 e conferir as anotações do §5 |
| `src/` ou `app/` (`app.py`, páginas, cliente HTTP) | `src/` | copiar `src/` inteiro; se o sample usar `app/`, ajustar só o caminho em `Dockerfile` e no comando |
| cliente HTTP do BFF do sample | `src/core/api.py` | se o sample já trouxer cliente com autenticação do chassi, `api.py` passa a delegar a ele mantendo as assinaturas (§3 de `contratos-de-dados.md`) |
| `requirements.txt` (Nexus) | `requirements.txt`, `requirements-dev.txt` | unir; versões exatas; conflito com o sample é decisão (R11) |
| pipeline (Jenkins/GHA) | `scripts/verify.sh` | etapas do `verify.sh` entram no pipeline (D-005) |
| — | `AGENTS.md`, `.rules/`, ponteiros, `.githooks/`, `docs/`, `tests/`, `checks/`, `data/`, `pyproject.toml`, `.editorconfig` | copiar como estão |

O que **não** copiar: `.venv/`, caches (`__pycache__`, `.pytest_cache`, `.ruff_cache`), `shots/`.

## 3. Esteira

| Ambiente | Gatilho | Configuração |
|---|---|---|
| DES | push na branch `develop` (deploy contínuo) | `ENV=des`, `AUTH_MODE=mock` ou `none` no início, `CHAT_MOCK=true` até o BFF |
| UAT | branch `release/*` via Jenkins/GHA | `ENV=uat`, `AUTH_MODE=gateway`/`oidc`, `CHAT_MOCK=false` (fora disso o app não sobe: `core/settings.py`) |
| PRD | tag com GMUD aprovada no Portal Tech | `ENV=prd`, `AUTH_MODE=gateway`/`oidc` estrito, `CHAT_MOCK=false`, `BFF_BASE_URL` preenchido (fora disso o app não sobe: `core/settings.py`) |

Scanners (Veracode/SonarQube) rodam na esteira; apontamento aberto bloqueia a entrega (F10).

## 4. ConfigMaps e Secrets

| Variável | Onde | Observação |
|---|---|---|
| `ENV` | ConfigMap | `des`/`uat`/`prd` (outro valor: o app não sobe) |
| `AUTH_MODE` | ConfigMap | ver §3 |
| `CHAT_MOCK` | ConfigMap | `true`/`false`; `false` obrigatório em UAT e PRD |
| `FOOTER_ENTITIES` | ConfigMap (ou Secret) | JSON com nome, CNPJ e endereço das empresas do rodapé; padrão `[]`; nunca no repositório |
| `BFF_BASE_URL` | Secret (Secret Manager corporativo) | host do BFF de GenAI do ambiente; nunca no repositório |

`settings.yaml` lê as cinco por `${VAR:padrão}`; nenhum código lê variável direto.

## 5. Ingress e sessões

- WebSocket: as rotas `/_stcore/*` precisam de upgrade HTTP/1.1 e timeouts longos de leitura e envio (sessão aberta
  enquanto a aba estiver aberta).
- Mais de uma réplica: afinidade de sessão por cookie (o estado do Streamlit fica na memória do pod).
- O gateway injeta `x-user-id`/`x-user-email` (ou JWT) antes do app; `AUTH_MODE=gateway` lê esses cabeçalhos.
- Limite de corpo do ingress ≥ 20 MB (upload do chat).

## 6. Pontos de adaptação

| Ponto | Arquivo | O que trocar |
|---|---|---|
| Identidade | `src/core/auth.py`, `settings.yaml` → `auth` | nomes dos cabeçalhos se o gateway usar outros; JWT no modo `oidc` |
| Dados reais | `src/core/data.py` | ramo de leitura mock → `api.get_json` (`contratos-de-dados.md` §10) |
| Chat real | `src/core/chat.py` | `CHAT_MOCK=false`; conferir o contrato §9 com o OpenAPI |
| Versão do Streamlit | `src/core/compat.py`, `src/core/ui.py`, `.streamlit/config.toml` | só aí, se a exceção (ADR-002) for concedida |
| Fim dos presets | `src/core/period.py` | 31/12/2021 → hoje ou data do BFF |

## 7. Checklist pós-porte

1. `pip install -r requirements-dev.txt -i <proxy do Nexus>` sem erro em Python 3.11.
2. `bash scripts/verify.sh` verde (cole a última linha de cada etapa).
3. `git config core.hooksPath .githooks`.
4. `streamlit run src/app.py` responde em `/_stcore/health`; as quatro páginas abrem sem exceção.
5. `python scripts/docs_check.py` sem achado de R6 (nenhum host versionado).
6. DES: `AUTH_MODE=gateway` mostra o primeiro nome na saudação do chat; Excel baixa; chat responde (mock ou BFF).
7. Capturas de `checks/` nos dois temas, 375 e 1440 px, comparadas com a landing (endereço do app no argumento ou em
   `CHECK_BASE_URL`; `dependencias-e-ambiente.md` §4).

## 8. Uso com IAs

`AGENTS.md` é a entrada única; `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/rules/regras.md`
só apontam (D-001). Abrir a pasta do projeto como raiz do workspace.
