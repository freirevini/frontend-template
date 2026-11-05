# Plano de implementação — Agenda Normativa em Streamlit

**Situação: aprovado pelo usuário em 2026-11-04 (decisões D1–D10 nas recomendações; ADR-001 a ADR-008); fases F0–F9 executadas em 2026-11-04; F10 (integração no ambiente corporativo) pendente (§10).** Data: 2026-11-04.

Objetivo: construir em `langepage-streamlit/` a mesma Agenda Normativa que existe em
`../../../langepage-angular/landing-analitica/` (Angular 20.3 / CoreUI 5.5), **100 % do que foi desenvolvido**, nas
regras do projeto que se aplicam a Python/Streamlit e nas configurações que a arquitetura corporativa definiu como padrão
(respostas de 2026-11-04). O plano é por fases; cada fase tem entrega, critério de pronto e esforço. As diferenças que
a tecnologia impõe estão listadas em §6 como decisões a aprovar, não como surpresas.

Base documental (não repetida aqui; lida antes de cada fase):

| Documento | Caminho (relativo a esta pasta) | Uso |
|---|---|---|
| Diagnóstico do que existe | `../../../langepage-angular/landing-analitica/docs/planejamento/streamlit/01-diagnostico-landing.md` | lista de requisitos |
| De-para elemento a elemento | `.../streamlit/02-de-para-streamlit.md` | técnica e fidelidade |
| Guia de implementação | `.../streamlit/03-guia-implementacao.md` (§3.17 = adaptações para 1.40) | receita |
| Cenários, riscos, respostas da arquitetura | `.../streamlit/04-cenarios-e-riscos.md` (§4.8 respostas, §4.10 compatibilidade 1.40) | premissas |
| Protótipo em Streamlit 1.66 | `.../streamlit/poc/` | código de partida |
| Fichas por página, glossário, contratos, mapeamento | `../../../langepage-angular/landing-analitica/docs/{paginas,glossario-ptbr.md,contratos-de-dados.md,mapeamento-de-dados.md}` | verdade do produto |
| Regras da landing | `../../../langepage-angular/landing-analitica/{AGENTS.md,.rules/}` | origem das regras de §2 |

## 1. Premissas e configurações-padrão (vindas da arquitetura corporativa)

Valem para todas as fases. Hosts, URLs e e-mails internos ficam fora do repositório; entram só por `settings.yaml`,
variáveis de ambiente e Secrets.

### 1.1 Plataforma

| Item | Padrão | Observação |
|---|---|---|
| Hospedagem | **GKE corporativo (genaigke) / Plataforma Titan**, padrão N3 "Streamlit e Titan Frontend Sample" | Databricks Apps é vedado (HML-1143) para produtos com IA generativa; a Agenda Normativa tem o Agente da Agenda |
| Repositório base | Cookiecutter da Plataforma Titan, repositório `streamlit-sgen-base-ia-sample` (projeto SGEN-BASE do Bitbucket corporativo); documentação no portal do Titan Sample e no Confluence "N3 - Streamlit" (space ARQUI) | o projeto nasce do sample; esta pasta é o espelho de desenvolvimento até a geração pelo Cookiecutter (D9) |
| Python | **3.11** (imagens base `pacotedocker-sgen-base-*` / `genaigke-sgen-base-sample`; conformidade Veracode/SonarQube) | |
| Streamlit | **`>= 1.38.0`, faixa 1.38.x–1.40.x**; fixar **1.40.2** (último patch da faixa) ou o patch disponível no Nexus | compatível com `pylib-sgen-base-genai-framework` 0.20.0; o protótipo foi feito em 1.66 → adaptações da F1 (D1) |
| Pacotes | só pelo mirror/proxy PyPI do Nexus corporativo (`pypi-all/simple`), versões exatas: `streamlit==1.40.2`, `plotly==5.24.1` (última 5.x compatível com 1.40; confirmar no Nexus), `pandas==2.2.3`, `openpyxl==3.1.5`, `pyyaml==6.0.2`, `requests==2.32.3` + transitivas; `pytest`, `ruff` em dev | nunca URL/git/CDN |
| Dados | **exclusivamente pelo BFF Atlante** (chassi: BFF → Orquestrador → Átomos), contrato `/conforme/...` dos `contratos-de-dados.md`; sem banco nem Unity Catalog direto | mocks JSON até o contrato, como hoje |
| Agente | orquestração no BFF (`/conforme/chat/*`, ADR-011 da landing); o Streamlit só consome | sem Gemini no app (D7) |
| Identidade | sem `st.login`; cabeçalhos do Ingress Gateway (`x-user-id`, `x-user-email` ou JWT) + cookie de sessão autenticado pelo BFF; lidos por `st.context.headers` | só o primeiro nome para a saudação; nada em `localStorage` |
| Esteira | DES: deploy contínuo na branch `develop`; UAT: `release/*` via Jenkins/GHA; PRD: tag com GMUD aprovada no Portal Tech | Portal Tech / Bitbucket / Jenkins / GKE |

### 1.2 Configuração por ambiente (ConfigMaps e Secrets do Kubernetes, Secret Manager corporativo)

| Variável | DES | UAT | PRD | Lida por |
|---|---|---|---|---|
| `ENVIRONMENT` / `ENV` | `des` | `uat` | `prd` | `settings.yaml` |
| `AUTH_MODE` | `none` ou `mock` (dev local/inicial) | `gateway` / `oidc` | `gateway` / `oidc` (estrito) | `settings.yaml` → `auth.mode` |
| `BFF_BASE_URL` | host do BFF de GenAI de DES | host de UAT | host de PRD | `settings.yaml` → `bff.base_url` (equivale ao `apiBase` da landing, lido da configuração de execução `assets/env.json`) |
| `CHAT_MOCK` | `true` (até o BFF) | `false` | `false` | equivale ao `environment.chatMock` |

`settings.yaml` (versionado, sem valores sensíveis; variáveis sobrescrevem):

```yaml
environment: ${ENV:des}
auth:
  mode: ${AUTH_MODE:mock}            # none | mock | gateway | oidc
  user_id_header: x-user-id
  user_email_header: x-user-email
bff:
  base_url: ${BFF_BASE_URL:}         # vazio em mock: lê data/*.json
  timeout_seconds: 10
  prefix: /conforme
chat:
  mock: ${CHAT_MOCK:true}
  max_session_bytes: 20971520        # 20 MB por conversa (igual à landing)
  max_input_chars: 1000
  max_files_per_send: 5
cache:
  ttl_seconds: 300
```

### 1.3 `.streamlit/config.toml` (compatível com 1.40; as chaves de `[server]` são as do sample)

```toml
[server]
port = 8501
address = "0.0.0.0"
headless = true
enableCORS = false                 # proxy reverso corporativo cuida de CORS
enableXsrfProtection = true        # manter como o sample definir
enableStaticServing = true         # /app/static (fontes Inter, ícones, marca)
maxUploadSize = 20                 # chat: 20 MB por conversa, validado também no servidor

[browser]
gatherUsageStats = false

[client]
toolbarMode = "minimal"
showSidebarNavigation = false      # a sidebar é montada pelo app (grupos e subitens por seção)

[theme]                            # 1.40 aceita só estas chaves; o resto do tema é CSS (F1)
base = "light"
primaryColor = "#223ad2"
backgroundColor = "#f3f5f7"
secondaryBackgroundColor = "#ffffff"
textColor = "#20262c"
font = "sans serif"
```

Rotas WebSocket `/_stcore/*` passam pelo ingress do sample (anotações de timeout e upgrade já no `k8s/`).

### 1.4 Estrutura do repositório (sample + aplicação)

```
langepage-streamlit/
  AGENTS.md  CLAUDE.md  .rules/  .cursor/rules/  .agents/     regras (§2), ponteiros como na landing
  Dockerfile                                                 do sample (base corporativa, usuário não-root)
  .streamlit/config.toml                                     §1.3
  settings.yaml                                              §1.2
  requirements.txt  requirements-dev.txt                     versões exatas, Nexus
  k8s/ (ou helm/)                                            do sample: ingress com WebSocket, ConfigMap, Secret
  src/
    app.py                                                   entrada (st.navigation hidden, sidebar, header, rodapé, chat)
    core/  tokens.py  period.py  data.py  api.py  charts.py  ui.py  xlsx.py  chat.py  settings.py  auth.py
    views/ inicio.py  triagent.py  scalation.py  analitico.py  dashboard.py (redireciona)
    components/clicklist/index.html                          componente v1 (só se D3 = iframe)
    static/ app.css  fonts/  icons/  img/
  data/                                                      mocks JSON (cópia de src/assets/data da landing)
  tests/                                                     pytest (core) + streamlit.testing (telas)
  checks/                                                    capturas e interação por Chrome headless (do poc)
  scripts/ docs_check.py  rules_check.sh  verify.sh          verificação (§2, R7 e R13)
  docs/ README.md arquitetura.md contratos-de-dados.md design-system.md dependencias-e-ambiente.md
        glossario-ptbr.md changelog.md inventario.md paginas/ decisoes/ planejamento/
```

## 2. Regras do projeto (as da landing, adaptadas ao que se aplica)

`AGENTS.md` + `.rules/` com o mesmo formato da landing (`projeto.md`, `escopo.md`, `testes.md`, `erros.md`,
`decisoes.md`, `check.sh`); `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.agents/` só apontam. Índice:

| Regra | Na landing (Angular) | Aqui (Streamlit) |
|---|---|---|
| R1 Versões congeladas | Node 22, Angular 20.3, TS 5.9, CoreUI 5.5 | Python 3.11, Streamlit 1.40.x (faixa homologada), Plotly, pandas, openpyxl exatos; subir versão só por decisão registrada |
| R2 Dependência nova | Nexus npm, versão exata, nunca URL/CDN | Nexus PyPI (`pypi-all/simple`), versão exata, compatível com Python 3.11 e Streamlit 1.40; nunca URL/git/CDN |
| R3 Idioma do framework | standalone, `@if`/`@for`, `routes.ts`, `app.config.ts` | `st.navigation` + `st.Page` com uma página por arquivo em `src/views/`; estado em `st.session_state` com chave por bloco; CSS só em `st-key-*` e `data-testid` (nunca `st-emotion-cache-*`); JavaScript só em `src/components/` versionado; nada de `st.experimental_*` |
| R4 HTTP | só `api.service.ts` com `apiBase` (de `assets/env.json`) + `/v1/...` | só `src/core/api.py` com `bff.base_url` + `/v1/...` (contrato v1, ADR-009); sem endpoint inventado; mock JSON em `data/` |
| R5 Autenticação | só BFF Atlante; nada em storage | só gateway/BFF (`AUTH_MODE`); identidade por cabeçalhos; nada em `localStorage`/cookies próprios |
| R6 Ambientes | só a configuração de execução `assets/env.json` com `apiBase: '/api'`; nenhum host no código | só `settings.yaml` + variáveis; nenhum host (`localhost`, `appdes`, `appuat`, domínios internos) no código ou nos docs |
| R7 Pronto | `npm run verify` | `scripts/verify.sh`: `ruff check`, `pytest`, `docs_check.py`, `rules_check.sh`, `checks/` visual (quando houver Chrome) |
| R8 Marca | sem marca CoreUI na interface | sem marca Streamlit na interface (`toolbarMode = "minimal"`, menu ⋮ oculto por CSS se a arquitetura permitir); LICENSE do Streamlit (Apache 2.0) fica |
| R9 Exportação | `exceljs` no navegador; PDF sob pedido | `openpyxl` no servidor com o mesmo layout; PDF (`reportlab`) só quando pedido |
| R10 Cor por token | `var(--brand-*)`; literal só nos 3 arquivos de tokens | hex só em `src/core/tokens.py` e no `config.toml`; CSS e Plotly leem os tokens; dois temas (D2) |
| R11 Conflito com regra | pare e pergunte | igual |
| R12 pt-BR | interface, docs e commits em pt-BR; código em inglês; glossário | igual; `docs/glossario-ptbr.md` copiado e mantido |
| R13 Docs vivas | tabela "mudou → atualize"; `docs:check` | igual; `scripts/docs_check.py` porta as verificações aplicáveis (docs obrigatórios, dependências, tokens-hash de `tokens.py`, ponteiros, ADR, R10, frases vigiadas, R6, R15) |
| R14 Base de conhecimento | `base-de-conhecimento/` antes de criar página | `docs/referencia/` aponta para a landing e para o protótipo; consultar antes de criar bloco |
| R15 Ficha por página | `docs/paginas/<slug>.md` com 7 seções e carimbo | igual, carimbo sobre `src/core/data.py` e `views/<pagina>.py` |

Escopo, testes e erros valem iguais: toque só o pedido; bug vira teste (`tests/`) antes da correção; `E-nnn` em
`.rules/erros.md` no mesmo commit; nunca commit com `verify` vermelho.

## 3. Fases

Esforço em dias úteis de uma pessoa com Python e Streamlit, sem o backend. "Pronto" = critério cumprido + `verify`
verde + docs da fase atualizados (R13) + entrada no `changelog.md`.

### F0 — Fundação do repositório (2 dias)

- Entrega: pasta gerada pelo Cookiecutter do Titan (ou, até o acesso, a estrutura §1.4 reproduzida à mão e marcada para
  substituição); `requirements.txt` resolvido no Nexus; `AGENTS.md`, `.rules/`, ponteiros, `scripts/verify.sh`,
  `docs_check.py`, hooks de git; `git init` + primeiro commit; `docs/` com README, changelog, glossário (cópia), ADR-001
  (nasce da landing), `docs/paginas/` vazio com o modelo; cópia do protótipo em `src/` e dos mocks em `data/`; `tests/`
  com um teste trivial.
- Pronto: `scripts/verify.sh` verde; `streamlit run src/app.py` sobe em Python 3.11 com Streamlit 1.40.x (vai quebrar nas
  APIs de 1.66: é o ponto de partida da F1); nenhum host no repositório.
- Decisões: D1, D9.

### F1 — Tema, chrome e navegação na versão homologada (4 dias)

- Entrega: adaptações §3.17 do guia aplicadas: `config.toml` §1.3; Inter por `@font-face` em `st.html`; CSS do chrome
  (sidebar navy com marca, "PAINÉIS", grupos Triagent/Scalation, subitens por seção com ativo exato e fillete ciano;
  header com breadcrumb, data pt-BR e seletor Claro/Escuro/Automático; rodapé navy com dados das empresas); cards;
  chips e segmentado; subitens por `st.button` + `st.switch_page` + estado; rolagem por seção e seletor de tema via
  `st.components.v1.html`; tema escuro conforme D2; `settings.py`/`auth.py` (`AUTH_MODE` mock e gateway; identidade por
  cabeçalhos); página `dashboard.py` redirecionando; 375–1440 px.
- Pronto: as quatro páginas vazias com chrome igual à landing nos dois temas (capturas em `checks/`), sem
  `st-emotion-cache-*` no CSS, `AUTH_MODE=mock` e `gateway` funcionando (cabeçalhos simulados em teste).

### F2 — Núcleo de dados e período (3 dias)

- Entrega: `core/period.py` (presets, validação, rótulos e subtítulos iguais aos da landing), `core/data.py`
  (carga, validações `validateSegmentCards`/`validateClassification`/`validateEmails`, derivações de classificação,
  e-mails e cascata), `core/api.py` (cliente do BFF com `bff.base_url` + `/conforme/...`, `requestId`, erros mapeados;
  modo mock lendo `data/`), `core/xlsx.py` (layout do `xlsx-export.ts`), formatação pt-BR.
- Pronto: `tests/` com os casos portados de `period-range.spec.ts`, `classification-derive.spec.ts`,
  `emails-derive.spec.ts`, `waterfall-derive.spec.ts`, `waterfall.model.spec.ts`, `xlsx-export.spec.ts` (mesmos valores
  esperados); contratos documentados em `docs/contratos-de-dados.md`.

### F3 — Início e cards de segmento (2 dias)

- Entrega: `views/inicio.py` (4 cards com cabeçalho na cor da série, área branca, "normas"/"a classificar");
  `ui.segment_cards` (gradiente, selo, minigráfico, tom petróleo, estados filtrado/apagado) usado pelo Triagent e
  Scalation; erro de carga; ficha `docs/paginas/inicio.md`.
- Pronto: critério §7 da ficha `inicio.md` da landing cumprido nos dois temas e em 375 px.

### F4 — Triagent: Normativos Recebidos (3 dias)

- Entrega: filtro de período (Dia/Mês/Ano, presets, personalizado com as três validações e o aviso de troca de
  granularidade), gráfico Plotly (linhas, tracejada, valores nos pontos, destaque, área da série ativa), legenda com
  totais, participação e barra (D3), visão Tabela com rodapé Total, "Exportar Excel" com o mesmo arquivo e nome, filtro
  da página pelos selos "a classificar" com a faixa e "Remover filtro".
- Pronto: itens 1 e 2 da §7 da ficha `triagent.md`; Excel conferido com `openpyxl`.

### F5 — Triagent: classificação e Tabela Analítica (4 dias)

- Entrega: rosca com total no centro e legenda clicável; barras de temas com "Outros temas"; filtros cruzados nos
  dois sentidos com as faixas de filtro; Tabela Analítica com todos os filtros, ordenação por coluna (data ISO, número
  "4.855" → 4855, texto pt-BR, desempates), 15 por página com Anterior/Próxima e "1–15 de N" (D4), botão "Perguntar ao
  Agente da Agenda" por linha (seleção de linha + botão, D3), Excel com subtítulo de filtros e nome do arquivo.
- Pronto: itens 3, 4 e 5 da §7 da ficha `triagent.md`.

### F6 — Triagent: Fluxo de e-mail - Triagem (2 dias)

- Entrega: período próprio (Dia/Mês), indicadores, barras empilhadas com totais, legenda com destaque, visão Tabela,
  Excel, "Últimos e-mails" com a tabela das normas (Órgão primeiro, "Aplicável ao segmento?" Sim/Parcialmente/Não).
- Pronto: item 6 da §7 da ficha `triagent.md`; ficha `docs/paginas/triagent.md` completa com carimbo.

### F7 — Scalation e Analítico (3 dias)

- Entrega: cards petróleo; Cascata do resultado (`R$`/`% da receita`, Gráfico/Tabela, rampas, conectores, rótulos
  dentro das barras com tinta por contraste, resultado e participação, tooltip completo, `deriveWaterfall` temporário);
  card "Tráfego e vendas" (demo, HTML estático); página Analítico com o título oculto; fichas `scalation.md` e
  `analitico.md`.
- Pronto: §7 da ficha `scalation.md`.

### F8 — Agente da Agenda (5 dias)

- Entrega: botão flutuante e painel (380 × 600, "Recomeçar", minimizar); balões, autor com avatar, bordas por status,
  blocos (fontes, esclarecimento, contatos, lista de normas com filtro por segmento, lista/tabela e "Extrair em Excel",
  resultado dos documentos com Excel, anexos com veredito); sugestões (opções, respostas prontas, Voltar, Encerrar,
  Recomeçar); campo de 1000 caracteres; upload (tipos, 5 por envio, 20 MB por conversa); feedback Útil/Não útil;
  saudação por hora e nome (`x-user-email`/`x-user-id`); despedida digitada; sessão expirada; "Tentar novamente" com
  `requestId` repetido; mock (`ChatMockServer` portado) e cliente real `/conforme/chat/*` (sessão, mensagem, arquivo
  multipart, feedback, cancelar, encerrar) atrás de `CHAT_MOCK`; "Perguntar ao agente" a partir da tabela.
- Pronto: item 7 da §7 do guia (saudação, cinco opções, resposta com fontes, esclarecimento, fora de escopo, upload,
  feedback, Encerrar, Recomeçar) no mock e, quando o BFF existir, no DES.
- Decisões: D5, D7.

### F9 — Fidelidade, acessibilidade e documentação viva (4 dias)

- Entrega: comparação lado a lado com a landing (capturas 1440/375, claro/escuro) e ajustes de CSS; `aria-pressed`,
  `role="status"`/`role="log"`, foco visível, `prefers-reduced-motion`, impressão; componente v1 `clicklist` se D3 pedir;
  textos internos dos widgets em inglês ocultos/trocados por CSS; `docs/arquitetura.md`, `design-system.md`
  (tokens-hash), `dependencias-e-ambiente.md`, `portabilidade.md` (Titan), `inventario.md` gerado, ADRs das decisões D1–D10;
  `docs_check.py` completo (R10, R15, frases vigiadas).
- Pronto: matriz §5 inteira marcada; `verify` verde; checklist de pronto (§3.15 do guia) assinado.

### F10 — Integração, esteira e entrega (4 dias)

- Entrega: ConfigMaps/Secrets por ambiente, `settings.yaml` final, Dockerfile e `k8s/` do sample ajustados,
  `AUTH_MODE=gateway` em UAT/PRD, `BFF_BASE_URL` por ambiente, pipeline `develop` → `release/*` → tag/GMUD, smoke test
  no DES com o BFF real, limites de sessão/upload conferidos, scanners (Veracode/SonarQube) sem apontamentos abertos;
  na landing Angular: ADR-022 "Agenda Normativa reconstruída em Streamlit" e congelamento (só correções), D10.
- Pronto: app no DES com SSO via gateway, dados do BFF, Excel e chat; GMUD de PRD preparada.

**Total indicativo: 36 dias úteis** (F0 2, F1 4, F2 3, F3 2, F4 3, F5 4, F6 2, F7 3, F8 5, F9 4, F10 4) + 10–15 % de
reserva = **40–42 dias**. Fases F3–F7 podem andar em paralelo com F8 se houver duas pessoas (≈ 28 dias de calendário).
Dependências externas: acesso ao Cookiecutter/repositório do Titan (F0), pacotes no Nexus (F0), BFF com `/conforme/...`
(F8/F10), vagas de GMUD (F10).

## 4. Pontos de troca (para subir de versão sem reescrever)

Toda adaptação à versão 1.40 fica atrás de uma função em `src/core/ui.py` ou `src/core/compat.py`, para que uma
exceção de versão (D1) ou a chegada de 1.51+/1.53+ no Nexus troque só esse arquivo:

| Função | Em 1.40 | Em 1.51+ / 1.53+ |
|---|---|---|
| `theme_type()` | componente v1 que devolve `theme.base` / `prefers-color-scheme` | `st.context.theme.type` |
| `run_js(script)` | `st.components.v1.html` (iframe, `window.parent`) | `st.html(..., unsafe_allow_javascript=True)` |
| `clicklist(key, html)` | `st.pills` ou componente v1 em iframe | `st.components.v2.component` |
| `row_action_button(df)` | seleção de linha + `st.button` | `column_config.ButtonColumn` |
| `pager(n)` | Anterior / Próxima | `st.pagination` |
| `hstack()` | `st.columns` | `st.container(horizontal=True)` |
| `section_link(page, id)` | `st.button` + `st.switch_page` + estado | `st.page_link(query_params=…)` |
| tema | `[theme]` claro + CSS para o escuro | `[theme.light]`, `[theme.dark]`, `[theme.sidebar]`, `fontFaces` |

## 5. Matriz de equiparação (o que "100 %" significa)

Fidelidade esperada em 1.40 com as decisões recomendadas de §6: **Igual** (não se distingue), **Equivalente** (mesma
função, detalhe visual diferente), **Aprox.** (função parecida, diferença perceptível). Nada fica sem linha.

| Elemento da landing | Fase | Técnica em 1.40 | Fidelidade |
|---|---|---|---|
| Tokens claros da marca (cores, raios, elevação, Inter) | F1 | `[theme]` + CSS `--brand-*` + `@font-face` | Igual |
| Tema escuro da marca | F1 | Streamlit "Dark" + CSS da marca nos blocos próprios (D2) | Aprox. (≈ 60–70 %) ou Igual com exceção de versão |
| Claro / Escuro / Automático no header | F1 | chave do frontend no `localStorage` via iframe | Equivalente (não oficial) |
| Sidebar navy, marca, "PAINÉIS", grupos, subitens por seção, ativo exato, fillete | F1 | sidebar própria com `page_link`, `expander`, botões-link, CSS | Igual/Equivalente (ícones Material; CoreUI só com componente v1) |
| Header: toggler, data pt-BR, breadcrumb | F1 | header do Streamlit + faixa própria | Equivalente (faixa não fixa) |
| Rodapé navy com empresas | F1 | HTML/CSS | Igual |
| Rotas e `/dashboard` | F1 | `st.Page(url_path)` + página de redirecionamento | Equivalente (sem `#`) |
| Rolagem até a seção sob o header | F1 | script via iframe | Equivalente |
| 375–1440 px | F1/F9 | nativo + CSS | Equivalente |
| Início: 4 cards coloridos com área e dois números | F3 | container com chave + Plotly | Igual |
| Cards de segmento (gradiente, selo-botão, minigráfico, petróleo, filtrado/apagado) | F3 | container com chave + Plotly + CSS | Igual |
| Filtro de período (Dia/Mês/Ano, presets, personalizado, validações, aviso) | F4 | segmented_control + pills + date_input | Igual (calendário do Streamlit em inglês) |
| Normativos Recebidos: linhas, tracejada, valores, destaque, área ativa | F4 | Plotly | Equivalente (rótulos coincidentes podem sobrepor) |
| Legenda com totais/participação/barra, clicável | F4 | pills (D3a) / componente v1 (D3b) | Aprox. / Igual |
| Visão Tabela + Excel do Tráfego | F4 | dataframe + openpyxl | Igual (Excel) / Equivalente (tabela sem chave de cor) |
| Filtro da página pelos selos, faixa, "Remover filtro" | F4 | estado + CSS | Igual (sem Esc/clique fora: D6) |
| Rosca com total e legenda clicável | F5 | Plotly + pills/v1 | Igual |
| Barras de temas, "Outros temas", filtro cruzado | F5 | HTML + pills/v1 | Igual/Aprox. |
| Tabela Analítica: filtros, ordenação, 15/página, agente por linha, Excel | F5 | dataframe + controles + openpyxl | Equivalente (ordenação por controle; paginação por botões) |
| Fluxo de e-mail: período próprio, indicadores, barras, legenda, tabela, Excel, últimos 5 | F6 | Plotly + expander + dataframe + openpyxl | Equivalente (raio 4 px no topo da pilha não existe) |
| Scalation: cascata (`R$`/`%`, gráfico/tabela, rampas, conectores, rótulos, tooltip) | F7 | Plotly com barras flutuantes | Equivalente |
| "Tráfego e vendas" (demo) | F7 | HTML | Igual |
| Analítico (título oculto) | F7 | HTML | Igual |
| Chat: botão flutuante, painel, cabeçalho, minimizar, Esc | F8 | container fixo + popover + CSS | Equivalente (sem "expandir"; tela cheia no celular por CSS) |
| Chat: balões, status, blocos, listas de normas (filtro, lista/tabela, Excel), documentos (tabela, Excel), fontes, contatos | F8 | HTML (porte do template) + openpyxl | Igual |
| Chat: sugestões, texto 1000, upload, feedback, saudação, despedida, expiração, retry, Encerrar/Recomeçar | F8 | widgets + lógica portada | Igual (sem contador 0/1.000; uploader com texto em inglês oculto) |
| Chat: "Parar", efeito de digitação, colar print, ponto verde | F8 | ver D5 | Aprox. ou fora |
| Chat: BFF `/conforme/chat/*` com `requestId`, multipart, cancelar, feedback, DELETE | F8/F10 | `core/api.py` | Igual (contrato) |
| Dados: mocks → BFF `/conforme/...` com validações | F2/F10 | `core/api.py` + `data.py` | Igual (contrato) |
| Formatação pt-BR (números, datas, moeda compacta) | F2 | `core/period.py`/`data.py` | Igual |
| Excel (título, subtítulo, cabeçalho azul, congelamento, totais, larguras, formatos, autofiltro, nomes) | F2 | openpyxl | Igual |
| Autenticação e identidade | F1/F10 | gateway + cabeçalhos | Igual ao padrão corporativo |
| Ambientes DES/UAT/PRD | F10 | ConfigMaps/Secrets + `settings.yaml` | Igual ao padrão corporativo |
| Regras, docs vivas, fichas, glossário, ADRs, changelog, inventário, `verify` | F0/F9 | `AGENTS.md`, `.rules/`, `scripts/` | Igual |
| Testes (416 Karma/Jasmine) | F2–F9 | pytest para `core/` (casos portados) + `streamlit.testing` para telas + `checks/` visual | Equivalente (cobertura por comportamento, não por número) |
| Acessibilidade (ARIA, foco, reduced motion, impressão) | F9 | CSS + atributos nos blocos HTML | Aprox. |

## 6. Decisões para aprovação

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | Versão do Streamlit | (a) 1.40.2, faixa homologada, com os substitutos de §4; (b) pedir exceção para 1.51+ (temas e Inter por configuração) ou 1.53+ (componentes sem iframe) | **(a) agora, abrindo (b) em paralelo**; os pontos de troca de §4 deixam a subida barata |
| D2 | Tema escuro em 1.40 | (a) parcial: "Dark" do Streamlit + CSS da marca nos blocos próprios; (b) só claro na v1; (c) só com a exceção de D1 | **(a)**, com critério: página, sidebar, cards, chips, gráficos e chat nos tokens escuros da marca; widgets nativos no escuro padrão |
| D3 | Listas clicáveis (legendas, temas) | (a) `st.pills` (menor fidelidade, zero JS); (b) componente v1 em iframe com HTML/CSS próprios (fidelidade da landing, +2 dias) | **(a) nas F4–F6, (b) na F9** se a diferença for reprovada na comparação lado a lado |
| D4 | Paginação da Tabela Analítica | botões Anterior/Próxima (igual à landing) | **sim** |
| D5 | Chat: "Parar", efeito de digitação, colar print, ponto verde no botão | (a) fora da v1, registrados como diferença aceita; (b) implementar (+3 dias: thread para cancelar, `write_stream` para digitação, `chat_input` com arquivo quando a versão permitir) | **(a)** |
| D6 | Esc / clique fora limpa filtros | (a) só "Remover filtro"; (b) JS global via iframe (+1 dia) | **(a)** |
| D7 | Orquestração do agente | no BFF (`/conforme/chat/*`, ADR-011) | **sim**; sem Gemini no Streamlit |
| D8 | URLs | `/triagent` etc. sem `#`; seção por estado; `/dashboard` redireciona | **sim** |
| D9 | Repositório | nasce do Cookiecutter do Titan no Bitbucket corporativo; `langepage-streamlit/` local é espelho de desenvolvimento (git próprio) até lá | **sim** |
| D10 | Landing Angular | congelar após a aprovação (só correções) e registrar ADR-022 na landing | **sim** |

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Pacotes ou patch 1.40.x ausentes no Nexus | lista de pacotes na F0; pedir espelhamento no primeiro dia |
| Acesso ao Cookiecutter/sample demorar | F0 reproduz a estrutura §1.4; substituição sem perda (código fica em `src/`) |
| CSS sobre `data-testid` quebrar em patch | versão cravada; `checks/` a cada mudança de versão |
| Escuro parcial reprovado pelo produto | D2 (b) ou exceção D1 (b) |
| Scanners apontarem o JavaScript dos componentes v1 | JS mínimo, versionado, sem dados do usuário; ADR explicando |
| BFF `/conforme/...` não pronto na F8 | mock mantém o fluxo inteiro; F10 absorve a integração |
| Dois produtos vivos durante a transição | D10: congelamento com data |

## 8. Fora do escopo deste plano

Backend (BFF Atlante, orquestrador, Gemini), acesso e provisionamento do Titan/Nexus/Bitbucket, migração de dados,
treinamento, e a página "Analítico" além do que existe hoje (título oculto).

## 9. Aprovação

Aprovar: (1) o plano e a ordem das fases; (2) as decisões D1–D10 (ou alternativas); (3) o esforço indicativo. Depois
disso a F0 começa e cada fase termina com relatório (o que mudou, verificado, de fora, suposições), como na landing.

## 10. Execução

Registro de execução (2026-11-04, agentes em paralelo por fase; detalhes em `docs/changelog.md`).

| Fase | Situação | Evidência |
|---|---|---|
| F0 Fundação | concluída | `AGENTS.md`, `.rules/`, `scripts/verify.sh`, `docs_check.py`, hooks, docs iniciais; git local ainda não iniciado (nasce do Cookiecutter, D9) |
| F1 Tema, chrome e navegação | concluída | `core/compat.py`, `core/ui.py`, `src/components/theme_probe`, `app.py`; sem `st-emotion-cache`/`unsafe_allow_javascript`/`st.experimental_` (docs_check R3) |
| F2 Núcleo de dados e período | concluída | `core/period.py`, `data.py`, `api.py`, `xlsx.py`; 167 testes portados (`tests/test_period.py`, `test_data.py`, `test_api.py`, `test_xlsx.py`) |
| F3 Início e cards | concluída | `views/inicio.py`, `ui.segment_overview`/`segment_cards`; ficha `inicio.md` §7 |
| F4–F6 Triagent | concluída | `views/triagent.py`, `triagent.css`; ficha `triagent.md` §7 (7 itens ok) |
| F7 Scalation e Analítico | concluída | `views/scalation.py`, `scalation.css`, `views/analitico.py`; fichas §7 |
| F8 Agente da Agenda | concluída | `core/chat.py`, `chat.css`; 129 testes (`tests/test_chat_*.py`); mock fiel, cliente do BFF codificado contra `core/api.py` (sem BFF real) |
| F9 Fidelidade e docs | concluída | polimento 1 e 2 (`tests/test_compat_ui.py`, `checks/`), docs vivas, E-001 a E-003 |
| Revisão de código | concluída | E-004 a E-008; 314 testes |
| Adequação F8 (contrato v1) | concluída (código) | ADR-009; `core/api.py` (Problem Details, 401/403, código de suporte), `core/data.py` (v1, Tabela Analítica paginada no servidor, Excel até 5.000 linhas), `core/chat.py` (`/v1/agente/...`, 9 MB por envio, quarentena 202 + consulta), `ui.data_error`; testes `tests/test_data_v1.py`, `test_chat_v1.py`, `test_view_triagent.py` e casos novos em `test_api.py`/`test_view_scalation.py`; infraestrutura (F10) fora |
| F10 Integração e entrega | **pendente** | ConfigMaps/Secrets reais, `BFF_BASE_URL`, `AUTH_MODE=gateway`, esteira, smoke test no DES, scanners, ADR-022 na landing |

`bash scripts/verify.sh` em 2026-11-04 (última linha de cada etapa):

```
[ruff] All checks passed!
[pytest] 314 passed in 0.57s
[docs_check] docs_check: ok (12 verificações, 0 aviso(s))
[check.sh] check.sh: ok
verify: verde
```

### 10.1 Diferenças aceitas (como ficaram; matriz §5)

| Elemento | Como ficou em 1.40 |
|---|---|
| Tema escuro da marca (Aprox.) | parcial (ADR-003): tokens escuros nos blocos próprios; widgets nativos (date input, dataframe, uploader, popover, selectbox) no escuro padrão do Streamlit |
| Claro/Escuro/Automático (Equivalente) | grava `stActiveTheme-<pathname>-v1` (não oficial) + `brand-theme-mode`; recarrega a página |
| Sidebar (Igual/Equivalente) | ícones Material; grupo da página atual abre por padrão (na landing todos fechados) |
| Header (Equivalente) | faixa própria fixa em duas linhas; botão da sidebar é o do Streamlit |
| Filtro de período (Igual) | calendário do `st.date_input` em inglês; limites explícitos (E-007) |
| Normativos Recebidos (Equivalente) | Plotly; rótulos coincidentes podem sobrepor; ticks reduzidos em 375 px |
| Legendas clicáveis (Aprox., D3a) | HTML fiel + chips `st.pills` abaixo (`compat.clicklist`); "Outros temas" não clicável; componente v1 (D3b) não foi necessário |
| Filtro da página (Igual, D6) | sem Esc/clique fora |
| Visão Tabela (Equivalente) | `st.dataframe` sem chave de cor; colunas apagadas pelo destaque |
| Tabela Analítica (Equivalente) | ordenação por `selectbox` + chips de sentido; paginação Anterior/Próxima; agente por seleção de linha + botão |
| Fluxo de e-mail (Equivalente) | sem raio no topo da pilha; "Últimos e-mails" como `st.expander` estilizado |
| Cascata (Equivalente) | Plotly com barras flutuantes; tabela HTML com `rowspan`; chips com ícones Material |
| Chat (Equivalente/Aprox., D5) | `st.popover` fixo; fora: Parar, efeito de digitação, colar print, ponto verde, expandir, "Ir para o fim", contador 0/1.000; uploader com texto em inglês oculto; tela cheia no celular por CSS |
| Testes (Equivalente) | 314 pytest (núcleo + `AppTest`) + `checks/` visual, contra 416 Karma/Jasmine |
| Acessibilidade (Aprox.) | `role`/`aria-label` nos blocos HTML, foco visível, `prefers-reduced-motion`; sem `aria-pressed` nos chips nativos |

### 10.2 Pendências abertas (revisão de código, sem correção nesta entrega)

- ~~`views/scalation.py`: `data["unitScale"]`/`data["currency"]` lidos fora do `try` (payload do BFF sem essas chaves
  derruba a página).~~ Resolvida em 2026-11-04 (`data.validate_waterfall`, E-009).
- ~~`core/chat.py`: `SESSION_NOT_FOUND` reabre a sessão dentro da falha; se o BFF seguir devolvendo 404, recursão.~~
  Resolvida em 2026-11-04 (`MAX_AUTO_RESTARTS`, E-010).
- `settings.yaml`: padrões abertos (`AUTH_MODE=mock`, `CHAT_MOCK=true`); o ConfigMap de UAT/PRD precisa defini-los
  explicitamente (F10). Desde 2026-11-04 o PRD falha fechado se não definir (`core/settings.py`, E-011); UAT segue
  dependendo do ConfigMap.
- Upload do chat confia no MIME informado pelo navegador; o BFF precisa validar o conteúdo.
- `scripts/docs_check.py`: `PAGE_HASH_STRICT` ainda `False` (D-006 previa virar `True` no fim da F9; fichas já carimbadas).
