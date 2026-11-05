# Regras do projeto — langepage-streamlit

Texto vinculante das regras técnicas e de produto. `AGENTS.md` traz o índice em uma linha por regra; em caso de
dúvida, vale este arquivo. Regra nova recebe o próximo número e entra no índice do `AGENTS.md`. Documentos citam regra
por número, nunca por faixa. Origem: regras da landing Angular, adaptadas no plano aprovado em 2026-11-04
(`docs/planejamento/plano-implementacao.md` §2).

## R1. Versões congeladas
Python 3.11; `streamlit==1.40.2` (faixa homologada pela arquitetura corporativa: 1.38.x–1.40.x); `plotly==5.24.1`,
`pandas==2.2.3`, `openpyxl==3.1.5`, `pyyaml==6.0.2`, `requests==2.32.3`; em dev `pytest==8.3.4`, `ruff==0.8.4`.
Versões exatas (`==`) em `requirements.txt` e `requirements-dev.txt`. Subir versão (inclusive patch do Streamlit) só
por decisão registrada em `docs/decisoes/` (ADR-002 trata do pedido de exceção para 1.51+/1.53+).

## R2. Dependências novas
Só entram se: existirem no proxy PyPI do Nexus corporativo (`pypi-all/simple`), forem compatíveis com Python 3.11 e com
Streamlit 1.40, e forem fixadas com versão exata. Proibido instalar de URL, repositório git, CDN ou arquivo solto.
Proibido alterar índice do pip em arquivo versionado. Pacote novo entra em `docs/dependencias-e-ambiente.md` no mesmo
commit (`scripts/docs_check.py` cobra). Antes de instalar: dizer qual, por quê e onde está no Nexus.

## R3. Idioma do Streamlit
- Navegação por `st.navigation` + `st.Page`, uma página por arquivo em `src/views/<slug>.py`; entrada em `src/app.py`.
- Estado em `st.session_state` com chave prefixada pelo bloco (`triagent-period`, `chat-…`); nada de variável global
  mutável entre sessões. Dados lidos com `st.cache_data`; pedido que leva a identidade do usuário tem
  `data.identity_key()` na chave (E-014); nada de estado do usuário em cache. Leitura pesada (Excel) só no clique (E-017).
- CSS só sobre seletores estáveis: classes `st-key-<chave>` (containers e widgets com `key`), `data-testid` e classes
  próprias com prefixo `brand-`/`chat-`. **Proibido** `st-emotion-cache-*` (muda a cada versão).
- JavaScript só em `src/components/` (versionado) ou pela função `run_js` de `src/core/compat.py`; nunca
  `unsafe_allow_javascript`, nunca `st.experimental_*`.
- **Pontos de troca**: toda adaptação à 1.40 de API que existe só em versão mais nova (tema, JS, listas clicáveis, ação
  por linha, paginação, grupo horizontal, link de seção) passa por uma função de `src/core/compat.py` ou
  `src/core/ui.py` (plano §4). Página não chama a API nova nem o substituto direto. Subir versão troca só esses arquivos.
- `scripts/docs_check.py` acusa `st-emotion-cache`, `unsafe_allow_javascript` e `st.experimental_` em `src/`.

## R4. HTTP e BFF
Toda chamada ao backend passa por `src/core/api.py`: `bff.base_url` do `settings.yaml` (caminho base da API do BFF) +
prefixo `/v1` + recurso do contrato v1 (OpenAPI da landing, `docs/contratos/openapi-agenda-normativa-v1.yaml`; ADR-009).
Nunca URL absoluta em outro arquivo. Sem banco, Unity Catalog ou serviço direto: dados exclusivamente pelo BFF. Não
inventar endpoint nem campo: só os do OpenAPI, convertidos pelos adaptadores `*_from_v1`. Erro do BFF é Problem
Details: a tela mostra texto pt-BR próprio e o `traceId` como código de suporte, nunca a mensagem do servidor.
`bff.base_url` vazio = mocks JSON em `data/`. Contratos em `docs/contratos-de-dados.md`.

## R5. Autenticação e identidade
Sem `st.login` e sem tela de login própria. Identidade pelo Ingress Gateway: cabeçalhos `x-user-id`/`x-user-email`
(ou JWT) lidos por `src/core/auth.py`; sessão autenticada pelo BFF (cookie do gateway, repassado por
`forward_headers`). `AUTH_MODE` (`none`, `mock`, `gateway`, `oidc`) decide; `mock` só em dev local/DES. Nada em
`localStorage`, `sessionStorage` ou cookie próprio, exceto a preferência de tema. Só o primeiro nome vai para a tela.

## R6. Ambientes e configuração
Configuração só em `settings.yaml` (versionado, sem valor sensível) com `${VAR:padrão}`, sobrescrita por variáveis de
ambiente vindas de ConfigMaps/Secrets do Kubernetes (`ENV`, `AUTH_MODE`, `BFF_BASE_URL`, `CHAT_MOCK`). Proibido host,
URL interna, e-mail corporativo ou credencial em código, docs, `settings.yaml` ou `k8s/` versionados.
`scripts/docs_check.py` vigia os nomes proibidos (lista `R6_FORBIDDEN` no script). `.streamlit/secrets.toml` não é
versionado.

## R7. Pronto
Toda entrega passa em `bash scripts/verify.sh` (`ruff check`, `pytest`, `scripts/docs_check.py`, `.rules/check.sh`),
sem pular etapa. Mexeu em interface: capturas de `checks/` (Chrome headless, servidor rodando) nos dois temas, em 375 px
e 1440 px, quando houver Chrome disponível; sem Chrome, dizer no relatório.

## R8. Marca de terceiros
Sem marca Streamlit na interface: `toolbarMode = "minimal"`, menu e rodapé do Streamlit ocultos por CSS (`data-testid`)
quando a arquitetura permitir; título da aba, favicon e nome são da Agenda Normativa. A licença do Streamlit
(Apache 2.0) e as dos demais pacotes continuam valendo; não remover avisos de licença.

## R9. Exportação
Excel gerado no servidor com `openpyxl` por `src/core/xlsx.py`, com o mesmo layout e nomes de arquivo da landing
(título, subtítulo de filtros, cabeçalho azul, congelamento, totais, larguras, autofiltro). Cores do arquivo só do tema
claro (tokens `export_*`; precedente E-001 da landing). PDF só quando pedido, com `reportlab` aprovado pela R2.

## R10. Cor por token
- Cor literal (hex) só em `src/core/tokens.py` (`LIGHT`, `DARK`) e no `[theme]` de `.streamlit/config.toml`.
- CSS em `src/static/*.css` e em `st.html` usa `var(--brand-*)`/`var(--app-*)` gerados por `tokens.css_variables`;
  Plotly recebe cor de `tokens()`. `scripts/docs_check.py` acusa hex em `src/**/*.py` fora de `tokens.py` e em
  `src/static/*.css`.
- Dois temas (ADR-003): claro completo; escuro nos blocos próprios (página, sidebar, cards, chips, gráficos, chat) com
  tokens escuros da marca; widgets nativos no escuro padrão do Streamlit.
- Séries de gráfico (`series`, `series_reference`, `wf_total`, `wf_decrease`) validadas para daltonismo nos dois temas:
  não trocar nem reordenar sem revalidar (`docs/design-system.md` §4).
- Marca "Agenda Normativa" com o símbolo oficial da instituição (`src/static/img/brand-mark*.svg`): não redesenhar nem distorcer.

## R11. Conflitos
Pedido em conflito com estas regras: PARE e pergunte antes de implementar. Usuário mantém o pedido após o aviso:
executar e registrar em `.rules/decisoes.md`.

## R12. Idioma oficial: português do Brasil
Todo texto visível (menu, títulos, rótulos, botões, mensagens, `aria-label`, legendas, colunas, nomes de arquivos
exportados), a documentação e as mensagens de commit (Conventional Commits, descrição em pt-BR) em pt-BR.
Identificadores, nomes de arquivos de código e comentários em inglês. Datas `dd/mm/aaaa`, números `1.234,56`, moeda
`R$`, formatados pelas funções de `src/core/period.py`/`src/core/data.py`, nunca montados à mão na página. Termos de
interface seguem `docs/glossario-ptbr.md`; termo novo entra lá antes. Texto interno de widget do Streamlit em inglês
(calendário, uploader) é exceção conhecida: ocultar ou trocar por CSS quando possível; não alterar o pacote.

## R13. Documentação viva
`docs/` precisa bastar sozinha para outra pessoa ou IA portar o projeto (inclusive para o repositório gerado pelo
Cookiecutter do Titan). Toda entrega que muda código atualiza o documento correspondente no mesmo commit e passa em
`python scripts/docs_check.py`.

| Se mudou | Atualize |
|---|---|
| Páginas, navegação, `app.py`, `core/` (exceto dados), estado, pontos de troca | `docs/arquitetura.md` |
| `data/*.json`, `core/data.py`, `core/api.py`, `core/chat.py` (contrato), formatação, endpoints | `docs/contratos-de-dados.md` |
| `src/core/tokens.py`, `src/static/app.css`, `[theme]`, tipografia, componentes visuais, paleta | `docs/design-system.md` (revisar tabelas e o carimbo `tokens-hash`) |
| `requirements*.txt`, `pyproject.toml`, `settings.yaml`, `config.toml`, variáveis, comandos, hooks | `docs/dependencias-e-ambiente.md` |
| `Dockerfile`, `k8s/`, esteira, o que muda no Cookiecutter | `docs/portabilidade.md` |
| Página nova, bloco, campo consumido, filtro ou exportação de uma página | `docs/paginas/<slug>.md` (R15) |
| Decisão de arquitetura ou de produto | novo `docs/decisoes/ADR-nnn-*.md` (maior número + 1) + índice |
| Regra, comando ou convenção para agentes | `AGENTS.md` ou `.rules/*.md` (um lugar só; ponteiros não recebem texto) |
| Qualquer entrega | `docs/changelog.md`; termos novos em `docs/glossario-ptbr.md` |

Afirmação sobre o estado do código que deixou de ser verdade é corrigida na mesma entrega; frases vigiadas ficam em
`STALE_CLAIMS` de `scripts/docs_check.py`.

## R14. Referência antes de criar
Antes de criar ou alterar bloco ou página, consultar a origem do produto: fichas, contratos e design system desta
pasta `docs/` e, enquanto existir, a landing Angular congelada (`../langepage-angular/landing-analitica/`, ADR-001) e o
estudo `docs/planejamento/streamlit/` dela (de-para elemento a elemento, guia, protótipo). A landing é referência de
comportamento e visual; nada dela é importado ou executado aqui.

## R15. Ficha por página
Toda página de `src/views/` (exceto `dashboard.py`, que só redireciona) tem `docs/paginas/<slug>.md`, com `slug` = nome
do arquivo, e linha na tabela de `docs/paginas/README.md`. Sete seções obrigatórias: 1. Identidade; 2. Blocos;
3. Dados consumidos (por bloco: função de `src/core/data.py`/`api.py`, mock de `data/`, cada campo); 4. Calculado no
app; 5. De-para e domínios; 6. O que copiar para portar só esta página; 7. Verificação. A ficha tem o carimbo
`page-data-hash` em comentário HTML no topo (SHA-1, 12 caracteres, de `src/core/data.py` + `src/views/<slug>.py`); mudou o arquivo,
revisar a ficha e colar o carimbo novo que o `docs_check.py` mostra. Até a F9 o carimbo divergente é aviso (D-006).
