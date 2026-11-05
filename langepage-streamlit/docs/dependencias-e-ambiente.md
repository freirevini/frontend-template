# Dependências e ambiente

Versões exatas, origem dos pacotes, comandos e configuração por ambiente. Regras: R1 (versões), R2 (dependência nova),
R6 (configuração). Mudou `requirements*.txt`, `pyproject.toml`, `settings.yaml`, `config.toml`, variável ou comando:
atualize aqui no mesmo commit (`docs_check.py` confere cada pacote).

## 1. Toolchain

| Item | Versão | Observação |
|---|---|---|
| Python | 3.11 (local: 3.11.15) | homologado pela arquitetura corporativa (imagens base do Titan, Veracode/SonarQube) |
| Streamlit | 1.40.2 | faixa homologada 1.38.x–1.40.x; exceção para 1.51+/1.53+ pedida em paralelo (ADR-002) |
| Gerenciador local | `uv` 0.11 (criou o `.venv`; o `.venv` não tem `pip`) | no ambiente corporativo, `pip` com o Nexus |

## 2. Pacotes (versões exatas)

`requirements.txt` (aplicação):

| Pacote | Versão | Uso |
|---|---|---|
| `streamlit==1.40.2` | 1.40.2 | app, navegação, widgets, testes de tela (`streamlit.testing`) |
| `plotly==5.24.1` | 5.24.1 | gráficos (última 5.x compatível com 1.40; confirmar no Nexus) |
| `pandas==2.2.3` | 2.2.3 | tabelas (`st.dataframe`) |
| `openpyxl==3.1.5` | 3.1.5 | Excel (R9) |
| `pyyaml==6.0.2` | 6.0.2 | `settings.yaml` |
| `requests==2.32.3` | 2.32.3 | cliente do BFF (`core/api.py`) |

`requirements-dev.txt` (inclui `-r requirements.txt`):

| Pacote | Versão | Uso |
|---|---|---|
| `pytest==8.3.4` | 8.3.4 | testes |
| `ruff==0.8.4` | 0.8.4 | lint (`pyproject.toml`) |

Transitivas resolvidas em Python 3.11 (2026-11-04, informativo; pedir espelhamento no Nexus se faltar): altair 5.5.0,
attrs, blinker 1.9.0, cachetools 5.5.2, certifi, charset-normalizer, click, et-xmlfile 2.0.0, gitdb, gitpython,
idna, iniconfig, jinja2 3.1.6, jsonschema 4.26.0, markdown-it-py, markupsafe, narwhals, numpy 2.4.6, packaging 24.2,
pillow 11.3.0, pluggy, protobuf 5.29.6, pyarrow 26.0.1, pydeck 0.9.3, pygments, python-dateutil, pytz, referencing,
rich 13.9.4, rpds-py, smmap, tenacity 9.2.1, toml 0.10.2, tornado 6.6, typing-extensions, tzdata, urllib3. Para
congelar também as transitivas no destino: `pip freeze > constraints.txt` no ambiente do Nexus e decisão registrada.

## 3. Instalação

Local (o que foi rodado nesta máquina):

```bash
source .venv/bin/activate
uv pip install --python .venv/bin/python -r requirements-dev.txt
```

Ambiente corporativo (proxy PyPI do Nexus, repositório `pypi-all/simple`; o endereço vem da documentação do Titan e
nunca é versionado):

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt -i <proxy pypi-all/simple do Nexus>
```

Pacote ausente no Nexus: pedir espelhamento; não instalar de outra origem (R2).

## 4. Comandos

| Comando | O que faz |
|---|---|
| `streamlit run src/app.py` | sobe o app na porta 8501 (`config.toml`); saúde em `/_stcore/health` |
| `ruff check src tests scripts` | lint |
| `pytest -q` | testes (`testpaths = ["tests"]`, `pythonpath = ["src"]`) |
| `python scripts/docs_check.py` | documentação viva (R13) |
| `bash .rules/check.sh` | `AGENTS.md` e `.rules/` |
| `bash scripts/verify.sh` | tudo acima menos o servidor, em ordem, parando no primeiro erro (R7) |
| `git config core.hooksPath .githooks` | liga os hooks (depois do `git init`): `pre-commit` roda `docs_check.py` + `check.sh`; `commit-msg` aplica a regra de correção |

Capturas visuais: `checks/` (Chrome headless via CDP, servidor rodando; manual). O endereço do app é obrigatório:
1º argumento ou variável `CHECK_BASE_URL` (nenhum host versionado, R6), ex.
`CHECK_BASE_URL=<endereço do streamlit run> python checks/f1_chrome.py "" shots` ou
`python checks/shoot.py <endereço> shots`; `checks/probe.py` recebe a URL da página (sem ela, `CHECK_BASE_URL` +
`/triagent`). Sem nenhum dos dois, o script para com a instrução em pt-BR.

## 5. Configuração

### 5.1 `.streamlit/config.toml`

`[server]` do sample (porta 8501, endereço `0.0.0.0`, `headless`, `enableCORS = false` atrás do proxy corporativo,
`enableXsrfProtection = true`, `enableStaticServing = true` para `src/static`, `maxUploadSize = 20`); `[browser]
gatherUsageStats = false`; `[client] toolbarMode = "minimal"`, `showSidebarNavigation = false`, `showErrorDetails = false` (R6: exceção não
tratada não mostra o host do BFF; no 1.40 o tipo e o traceback ainda aparecem, por isso as páginas capturam
`ApiError`/`ValueError` e mostram texto pt-BR); `[theme]` claro (design-system §2).

### 5.2 `settings.yaml`

Versionado, sem valor sensível; `${VAR:padrão}` usa a variável quando existe (`core/settings.py`). Chave booleana
(`chat.mock`) aceita `true`/`false`, `1`/`0`, `sim`/`não`/`nao`, `yes`/`no`, `on`/`off`, em qualquer caixa; outro valor
impede a subida (`SettingsError`). `environment` só aceita `des`, `uat` ou `prd` (qualquer caixa); outro valor (erro de
digitação, `dev`, vazio) impede a subida. Em `uat` e `prd` o app também recusa subir com `auth.mode` fora de
`gateway`/`oidc` ou `chat.mock` verdadeiro; em `prd`, também com `bff.base_url` vazio. `chat.mock` ausente do arquivo
(ex. `settings.yaml` montado pelo ConfigMap sem a chave) vale `true` em `des` e `false` em `uat`/`prd`; no arquivo
versionado o padrão `${CHAT_MOCK:true}` exige `CHAT_MOCK=false` explícito em `uat`/`prd`. A tela mostra só "Não foi possível iniciar a
Agenda Normativa. Contate o suporte." e o motivo vai para o log do servidor.

| Chave | Padrão | Variável |
|---|---|---|
| `environment` | `des` | `ENV` (`des`, `uat` ou `prd`; outro valor não sobe) |
| `auth.mode` | `mock` | `AUTH_MODE` (`none`, `mock`, `gateway`, `oidc`) |
| `auth.user_id_header` / `auth.user_email_header` | `x-user-id` / `x-user-email` | — |
| `auth.mock_first_name` | nome fictício | — (só `mock`) |
| `auth.login_url` | `/` | `AUTH_LOGIN_URL`: destino do link "Entrar novamente" quando o BFF responde 401 (recarregar pelo gateway refaz a autenticação); caminho, nunca host versionado |
| `bff.base_url` | vazio (= mock) | `BFF_BASE_URL`: caminho base da API do BFF (o que o Ingress roteia como `/api`) |
| `bff.timeout_seconds` / `bff.prefix` | `10` / `/v1` | — (`/v1` é relativo ao `bff.base_url`: recursos em `<base_url>/v1/<recurso>`, ADR-009; antes `/conforme`) |
| `chat.mock` | `true` (chave ausente: `true` só em `des`) | `CHAT_MOCK` (obrigatório `false` em `uat`/`prd`) |
| `chat.max_session_bytes` / `max_input_chars` / `max_files_per_send` | 20971520 / 1000 / 5 | — |
| `chat.max_send_bytes` | 9437184 (9 MB somados por envio, abaixo dos ~10 MB do gateway) | — |
| `cache.ttl_seconds` | 300 | — |
| `footer.entities` | `[]` (só o copyright) | `FOOTER_ENTITIES`: JSON `[{"name", "cnpj", "address"}]`, ou lista YAML num `settings.yaml` montado pelo ConfigMap (nunca versionado) |

### 5.3 Variáveis por ambiente

| Variável | DES | UAT | PRD |
|---|---|---|---|
| `ENV` | `des` | `uat` | `prd` |
| `AUTH_MODE` | `none` ou `mock` | `gateway` / `oidc` | `gateway` / `oidc` (estrito) |
| `BFF_BASE_URL` | BFF de GenAI de DES (Secret) | UAT (Secret) | PRD (Secret) |
| `AUTH_LOGIN_URL` | `/` (padrão) | rota de reautenticação do gateway, se não for `/` | idem |
| `CHAT_MOCK` | `true` até o BFF | `false` | `false` |
| `FOOTER_ENTITIES` | dados legais do ambiente ou `[]` | idem | idem (só no ConfigMap/Secret do ambiente) |

Origem: ConfigMap (`k8s/configmap.yaml`) e Secret (`k8s/secret.yaml`), placeholders até o Cookiecutter
(`portabilidade.md`). `.streamlit/secrets.toml` não é usado nem versionado.

## 6. Ferramentas de verificação

`pyproject.toml` só configura ferramentas: ruff (`line-length = 160`, `select = E, F, W, B`, `ignore = E501`,
`target-version = py311`) e pytest. `.editorconfig`: UTF-8, LF, 4 espaços em `.py`, 2 no resto.
