# 4. Cenários realistas, riscos e recomendação

## 4.1 A pergunta que decide antes de qualquer outra: onde vai rodar?

A landing Angular é um conjunto de arquivos estáticos: o Apache serve `index.html`, JS e CSS, e `/api` aponta para o
BFF. O Streamlit é um **servidor de aplicação**: um processo Python por instância, HTTP mais WebSocket, que mantém o
estado de cada usuário em memória e reexecuta o script a cada clique.

| Destino | Angular (hoje) | Streamlit |
|---|---|---|
| Apache servindo arquivos estáticos | sim | **não** |
| Apache como proxy reverso com `mod_proxy_wstunnel` para um container/VM Python | n/a | sim (padrão mandatório no ambiente corporativo quando o processo é exposto por Apache) |
| Databricks Apps | n/a | sim para **DataViz puro** (homologação HML-1143, esteira PEPD-1491 via Databricks Asset Bundles, componente `dbxapp-*`; SSO/OIDC do workspace; Unity Catalog direto com grants por catálogo/schema). **Vedado** pelo parecer HML-1143 para IA generativa, LLM, RAG ou agentes: **não serve para este produto** enquanto ele tiver o Agente da Agenda |
| GKE corporativo (genaigke / Plataforma Titan) | sim (nginx estático) | sim; **caminho deste produto**. Padrão N3 "Streamlit e Titan Frontend Sample": container Streamlit + BFF Spring Boot (chassi Atlante: BFF → Orquestrador → Átomos), sem conexão direta a banco ou Unity Catalog; ingress corporativo com OIDC/OAuth e upgrade para WebSocket; esteira Portal Tech / Bitbucket / Jenkins / GKE |
| Autenticação | sessão do BFF Atlante | OAuth/OIDC corporativo nos dois caminhos, com segregação DES, UAT e PRD |

**Confirmado em 2026-11-04** pela arquitetura corporativa: o destino hospeda o processo Python (`streamlit run app.py`, em
container ou Databricks Apps) com WebSocket contínuo (`/_stcore/*`). A restrição que poderia encerrar o estudo não
existe. O caminho também ficou definido pela regra: a Agenda Normativa tem o Agente da Agenda (IA generativa), logo
**GKE/Titan**; Databricks Apps só caberia a uma variante sem o agente. Pontos ainda abertos em §4.8.

## 4.2 Cenários

### A. Streamlit "puro" (widgets nativos, tema por `config.toml`, sem CSS nem componentes)

- O que entrega: as quatro páginas com `st.navigation` padrão na sidebar, `st.metric` com minigráfico para os cards,
  `st.segmented_control` e `st.pills` para os filtros, Plotly para os gráficos, `st.dataframe` e `st.download_button`
  para tabela e Excel, chat em `st.chat_message`/`st.chat_input` numa página própria ou em `st.dialog`.
- Fidelidade: 55–65 %. Cores e fonte da marca, mas cards sem gradiente, sidebar sem grupos com subitens por seção, legendas
  não clicáveis (destaque por `st.pills`), chat sem botão flutuante, header do Streamlit.
- Esforço: 5–8 dias úteis. Manutenção mínima (zero dependência de DOM interno).
- Quando: painel interno onde a marca não é exigência.

### B. Streamlit + CSS nos seletores estáveis + Components v2 (o protótipo)

- O que entrega: tudo o que `02-de-para-streamlit.md` marca como Igual ou Equivalente: chrome da marca nos dois temas, menu
  com grupos e subitens por seção, cards de segmento, chips e segmentado, legendas e temas clicáveis, chat flutuante,
  Excel idêntico, Claro/Escuro/Automático no header.
- Fidelidade: 85–90 %. Diferenças residuais em tooltip, animação, textos internos de widgets, foco/ARIA e nos
  comportamentos de `02-de-para-streamlit.md` §2.7.
- Esforço: 15–25 dias úteis (3.16) sem o backend; o protótipo já cobre o esqueleto.
- Manutenção: CSS sobre `st-key-*` e `data-testid` sobrevive a atualizações menores do Streamlit, mas cada subida de
  versão pede a bateria visual (`poc/checks/`); o seletor de tema no header depende de uma chave interna.
- Quando: a decisão for Streamlit e a marca da instituição for exigência. **Recomendado nesse caso.**

### C. B + componentes empacotados (Components v2 com TypeScript e build)

- O que entrega: menu lateral, legendas, painel do chat e header como componentes próprios com os SVGs do CoreUI,
  animações, foco e ARIA iguais aos da landing.
- Fidelidade: 90–95 %.
- Esforço: +10–15 dias e volta a toolchain Node (npm no Nexus, build dos componentes), o que elimina parte da
  simplicidade que justificaria o Streamlit.
- Quando: só se os 10 % restantes forem requisito formal.

### D. Manter a landing Angular e usar Streamlit para páginas analíticas novas

- O que entrega: a landing como está; a página "Analítico" (hoje vazia) ou painéis exploratórios nascem em Streamlit,
  embutidos por `iframe` (`st.context.is_embedded`, `?embed=true`) ou linkados no menu.
- Fidelidade: n/a (o produto não muda).
- Esforço: por página; dois stacks para manter, dois temas para sincronizar (os tokens já estão portados em
  `poc/core/tokens.py`).
- Quando: a equipe de dados quer entregar análises em Python sem reescrever o que existe.

## 4.3 Esforço, custo e operação (cenário B)

| Item | Angular (hoje) | Streamlit B |
|---|---|---|
| Código de interface | ≈ 6 900 linhas TS, 72 kB de templates, 450 kB de SCSS/JSON; 416 testes | ≈ 2 400 linhas Python + 230 de CSS no protótipo; testes a escrever |
| Build e artefato | `ng build` (≈ 1,5 MB inicial), estático | nenhum build; imagem Python ≈ 400 MB |
| Infra | Apache estático | processo Python permanente (≈ 150–300 MB de RAM base + ≈ 20–50 MB por sessão ativa com estes dados), WebSocket, afinidade de sessão se escalar |
| Latência por interação | local (JS) | 100–400 ms por rerun (rede + reexecução do script); `st.cache_data` obrigatório nas cargas |
| Dependências | 29 pacotes npm cravados | 38 pacotes PyPI (4 diretos) a espelhar no Nexus |
| Atualização de versão | `ng update` proibido (R1); migração planejada | `pip` com versão cravada; cada subida pede a bateria visual |
| Equipe | TypeScript/Angular | Python (o mesmo perfil que escreve PySpark/BigQuery) |

## 4.4 Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Hospedagem sem WebSocket ou sem processo permanente | resolvida (4.1: Databricks Apps e GKE/Titan homologados) | — | cumprir o padrão do caminho escolhido (DAB; ingress com upgrade para WebSocket; `mod_proxy_wstunnel` se houver Apache) |
| Versão do Streamlit homologada (1.38–1.40) abaixo da usada no protótipo (1.66) | **certa** (confirmada em 2026-11-04) | alto para o cenário B: sem temas claro/escuro separados por configuração, sem JavaScript em `st.html`, sem Components v2, `st.pagination` e `ButtonColumn` | plano de compatibilidade 4.10 (cada recurso tem substituto em 1.40; +5–8 dias; tema escuro vira entrega parcial); ou pedir à arquitetura exceção para uma versão 1.5x/1.6x, já que a regra diz `>= 1.38.0` |
| Scanners de segurança (Veracode/SonarQube) sobre JavaScript injetado (`unsafe_allow_javascript`, Components v2) | média | médio | manter o JS mínimo e versionado; justificar no ADR; alternativa sem JS para rolagem (âncoras `#id`) e tema (menu ⋮) |
| CSS sobre `data-testid` quebra em versão nova do Streamlit | média (a cada 2–3 versões algo muda) | médio | versão cravada; só `st-key-*` e `data-testid`; `checks/shoot.py` a cada atualização |
| Seletor Claro/Escuro no header depende de chave interna (`stActiveTheme-…-v2`) | média | baixo | o menu ⋮ do Streamlit continua funcionando; aceitar ou remover o seletor |
| Components v2 ainda novo (1.6x) | baixa | médio | a API usada é mínima (`component`, `setTriggerValue`); fallback para `st.pills` |
| `unsafe_allow_javascript=True` e HTML confiável | baixa se disciplinado | alto (XSS) | todo texto de dado passa por `html.escape`; JS só o do repositório; revisão nas regras do projeto |
| Memória e sessões em um só processo | média com muitos usuários | médio | `st.cache_data`, limites de upload (20 MB), `disconnectedSessionTTL`, mais instâncias com afinidade |
| Textos internos dos widgets em inglês (uploader, calendário, menu ⋮) | certa | baixo | CSS para ocultar; usar `st.chat_input(accept_file)`; documentar |
| Chat: "Parar", efeito de digitação, colar print | certa | baixo | aceitar a diferença ou implementar com threads/`st.write_stream` |
| Acessibilidade abaixo da landing (foco, `role="dialog"`) | certa | médio | checar com leitor de tela; componentes v2 para os pontos críticos |
| Pacotes ausentes no Nexus | média | médio | lista de 38 pacotes em `poc/requirements.txt` + `pip freeze`; pedir espelhamento cedo |
| Duas implementações do mesmo produto durante a transição | certa | médio | congelar a landing; só correções; ADR com data de corte |

## 4.5 Segurança e governança

- Nenhum segredo no código: `API`, `cookie_secret` e credenciais em variáveis de ambiente ou `secrets.toml` fora do
  repositório (equivalente à R6).
- O navegador fala só com o Streamlit; o BFF e o Gemini são chamados pelo servidor (mais simples de auditar do que o
  front chamando `/api`).
- Uploads do chat: validar extensão, tamanho e tipo real no servidor, como o BFF faz hoje; `server.maxUploadSize = 20`.
- HTML gerado (`st.html`, v2): escapar todo dado; nunca renderizar markdown/HTML do BFF sem o `safe_markdown`.
- Logs: o Streamlit não registra conteúdo de widgets; manter a regra de não logar texto do chat.
- Telemetria: `browser.gatherUsageStats = false`.

## 4.6 Comparação direta para este produto

| Critério | Angular + CoreUI (landing) | Streamlit (cenário B) |
|---|---|---|
| Fidelidade ao design da marca | referência | 85–90 % |
| Interatividade fina (filtros cruzados, Esc, animações) | completa | boa, com lacunas pontuais |
| Hospedagem | arquivo estático, qualquer servidor | processo Python + WebSocket |
| Integração com dados e Excel | via BFF e `exceljs` no navegador | nativa em Python (pandas/openpyxl), BFF ou SQL direto |
| Agente (Gemini) | só pelo BFF | pelo BFF ou no próprio processo |
| Testes | 416 Karma/Jasmine, visual por CDP | pytest + AppTest, visual por CDP (a escrever) |
| Esforço para chegar ao estado atual | feito | 15–25 dias + backend |
| Perfil de manutenção | front-end Angular | Python/dados |
| Risco de versão | baixo (R1) | médio (DOM interno) |

## 4.7 Recomendação

1. ~~Confirmar a hospedagem~~ Feito em 2026-11-04 (4.1): Databricks Apps e GKE/Titan hospedam o processo com WebSocket.
2. Decidir pelo **cenário B** apenas se houver um motivo além da fidelidade: equipe Python, integração direta com
   dados/Gemini, ou o custo de manter o stack Angular no ambiente corporativo. Fidelidade sozinha não justifica
   reconstruir: a landing já existe, está migrada para Angular 20 e verificada.
3. ~~Escolher o caminho~~ Definido pela regra em 2026-11-04: **GKE/Titan** (o parecer HML-1143 veda agentes de IA no
   Databricks Apps). O Streamlit só consome o BFF Atlante, como o Angular hoje (ADR-011 mantida).
4. Fechar os dois pontos restantes de 4.8 antes do primeiro dia de construção; o mais importante é a versão do
   Streamlit cravada pelo framework corporativo (4.9).
5. Se a decisão for B: registrar o ADR, gerar o projeto pelo Cookiecutter da Plataforma Titan a partir do repositório
   base `streamlit-sgen-base-ia-sample` (não dentro deste repositório), colocar `poc/` como código da aplicação,
   espelhar os pacotes no Nexus, seguir `03-guia-implementacao.md` e congelar a landing.
6. Se a decisão for não migrar: `poc/` continua útil como referência para o cenário D (páginas analíticas novas em
   Python com os mesmos tokens).

## 4.8 Perguntas à arquitetura corporativa: respostas de 2026-11-04 e o que ainda falta

Respondido pela arquitetura (hosts internos, URLs e nomes de pessoas ficam fora deste repositório, por regra do
projeto; estão na resposta original). Fontes citadas: homologação HML-1143 (BU de Dados / Nova Plataforma de Dados) e
padrão N3 / Titan (Tribo Plataforma e Produtos de Dados), Confluence "N3 - Streamlit" (space ARQUI).

| # | Pergunta | Resposta | Efeito no plano |
|---|---|---|---|
| 1 | Caminho deste produto | **Opção A, Databricks Apps**: só DataViz puro / consumo do Lakehouse (Streamlit, Dash ou Shiny); HML-1143 **veda IA generativa, LLM, RAG e agentes**; dados pelo Unity Catalog com grants; SSO/OIDC do workspace; esteira PEPD-1491 via DAB e componente `dbxapp-*`. **Opção B, GKE/Plataforma Titan**: produtos com IA generativa, RAG, agentes ou integração com sistemas transacionais; dados pelo BFF (Spring Boot / chassi Atlante), sem conexão direta ao Unity Catalog; ingress corporativo com OIDC/OAuth; esteira Portal Tech / Bitbucket / Jenkins / GKE (genaigke) | **GKE/Titan** para a Agenda Normativa (tem o Agente da Agenda) |
| 2 | Versão do Streamlit | **Referência homologada: `streamlit >= 1.38.0`, faixa 1.38.x a 1.40.x** (segunda resposta, 2026-11-04), recomendada pela arquitetura e pela Plataforma Titan por compatibilidade com `pylib-sgen-base-genai-framework` 0.20.0 e Python 3.11; toda instalação pelo mirror/proxy PyPI do Nexus (`pip install -r requirements.txt -i <proxy do Nexus>`). No Databricks Apps a mesma faixa, validada na aba Environment | **impacto alto**: o protótipo foi feito em 1.66; em 1.40 faltam as APIs listadas em 4.9 e entra o plano de compatibilidade 4.10 |
| 3 | Versão do Python | **3.11** homologado nos dois caminhos (runtimes do Databricks Apps e imagens base `pacotedocker-sgen-base-*` / `genaigke-sgen-base-sample`), por conformidade com Veracode/SonarQube | `requirements.txt` resolvido em 3.11 (o protótipo rodou em 3.12; nada usado exige 3.12) |
| 4 | Titan Frontend Sample | Sim: template Cookiecutter e repositório base `streamlit-sgen-base-ia-sample` (projeto SGEN-BASE no Bitbucket corporativo); documentação no portal do Titan Sample (produção e ambiente de desenvolvimento) e no Confluence. Estrutura: `Dockerfile` (base corporativa, usuário não-root), `.streamlit/config.toml` (porta 8501, CORS interno, rotas WebSocket `/_stcore/*`), `settings.yaml` (aplicação e `auth.mode`), `k8s/` ou templates Helm (ingress com anotações de timeout e WebSocket), `src/` ou `app/` (`app.py`, páginas modulares, cliente HTTP do BFF), `requirements.txt` apontando para o Nexus | o projeto nasce do sample; `poc/core` e `poc/views` entram em `src/`; tema e CSS entram no `config.toml` e em `static/` do sample |
| 5 | Identidade do usuário | GKE/Titan: **não** usa `st.login`; chega por cabeçalhos HTTP injetados pelo Ingress Gateway (`x-user-id`, `x-user-email` ou JWT) e pelo cookie de sessão autenticado pelo BFF; o Streamlit lê pelos cabeçalhos da sessão (`st.context.headers`). Databricks Apps: SSO (OAuth/OIDC) do workspace, usuário em `X-Forwarded-Email` / `X-Forwarded-User` | saudação do chat lê `x-user-email`/`x-user-id`; nada em `localStorage` (R5) |
| 6 | BFF Atlante × Unity Catalog | GKE/Titan: dados **exclusivamente** pelo BFF Atlante (BFF → Orquestrador → Átomos); o Streamlit não conecta a banco nem ao Unity Catalog. Databricks Apps: Unity Catalog direto com a identidade do app/Service Principal, sem BFF | `core/data.py` e `core/chat.py` passam a chamar `/conforme/...` (3.12) |
| 7 | Configuração e segredos por ambiente (DES/UAT/PRD) | Nunca em código. GKE/Titan: ConfigMaps e Secrets do Kubernetes (Secret Manager corporativo) injetam `ENVIRONMENT`/`ENV` (`des`, `uat`, `prd`), `AUTH_MODE` do `settings.yaml` (`none` ou `mock` em DES/local; `gateway`/`oidc` em UAT; `gateway`/`oidc` estrito em PRD) e `BFF_BASE_URL` (um host do BFF de GenAI por ambiente); esteira: deploy contínuo na branch `develop` (DES), `release/*` via Jenkins/GHA (UAT), tag com GMUD aprovada no Portal Tech (PRD). Databricks Apps: targets `des`/`uat`/`prd` no `databricks.yml` do DAB, `databricks bundle deploy --target <des|uat|prd>`, Unity Catalog com privilégio mínimo por Service Principal de cada workspace | `settings.yaml` + variáveis de ambiente substituem `environment.ts`/`proxy.conf.json`; `BFF_BASE_URL` faz o papel de `apiBase` |

Todas as perguntas respondidas. O `config.toml` do sample traz `[server] port = 8501`, `address = "0.0.0.0"`,
`headless = true`, `enableCORS = false` (proxy reverso corporativo) e as rotas `/_stcore/*`; as tabelas de tema entram
ao lado dele.

## 4.9 APIs do Streamlit usadas no protótipo, por versão mínima

Preenchido com as notas de versão oficiais; serve para comparar com a resposta à pergunta 2 de 4.8.

| Recurso | Usado em | Versão mínima | Sem ele |
|---|---|---|---|
| classe `st-key-<chave>` para CSS | todo o `app.css` | 1.39 | CSS só por `data-testid` (menos estável) |
| `st.segmented_control`, `st.pills` | filtro de período, Gráfico/Tabela, `R$`/`%` | 1.40 | `st.radio(horizontal=True)` estilizado |
| `st.chat_input(accept_file=…)` (não usado, alternativa ao uploader) | chat | 1.43 | `st.file_uploader` (usado) |
| `[[theme.fontFaces]]` | Inter local | 1.45 (abr/2025) | `@font-face` em `st.html` |
| `st.context.theme`, `st.navigation(position="top")` | tema lido pelo Python | 1.46 (jun/2025) | tema lido por JS; um só CSS |
| `[theme.sidebar]`, `st.container(horizontal=True)` | sidebar navy, cabeçalhos de card | 1.48 (ago/2025) | sidebar por CSS; `st.columns` |
| `st.metric(chart_data=…)` (não usado; alternativa ao sparkline Plotly) | cards de segmento | 1.49 (ago/2025) | Plotly (usado) |
| `chartCategoricalColors` | cores padrão de gráfico | 1.47 (jul/2025) | cores explícitas nas figuras (o protótipo já faz) |
| `[theme.light]` / `[theme.dark]` separados | dois temas da marca por configuração | 1.51 (out/2025) | um tema só por `config.toml`; o outro inteiro por CSS |
| `st.html(unsafe_allow_javascript=True)` | rolagem por seção, seletor de tema | 1.52 (dez/2025) | `components.html` em iframe (`window.parent`) |
| `st.pagination` | Tabela Analítica | 1.58 (mai/2026) | botões Anterior/Próxima (como a landing) |
| `st.column_config.ButtonColumn` | botão do agente por linha | 1.59 (jul/2026); `st.rerun`/`st.switch_page` dentro do callback não funcionam: o protótipo só grava `st.session_state` no callback e age depois | `on_select="rerun"` + botão abaixo da tabela |
| `st.components.v2.component` | legendas e temas clicáveis | existe desde antes de 1.53 (jan/2026, já com ajustes nas notas); API estabilizada em 1.56 (`ComponentResult`) | `st.pills`/`st.button` no lugar das listas clicáveis |
| `st.echarts_chart` (não usado) | alternativa ao Plotly | 1.64 (set/2026) | Plotly |

## 4.10 Plano de compatibilidade com o Streamlit homologado (1.38–1.40)

Conferido por introspecção em **Streamlit 1.40.2 com Python 3.11.15** (ambiente de rascunho, 2026-11-04): o que o
protótipo usa, o que existe em 1.40 e o substituto. O protótipo em `poc/` continua escrito para 1.66; a versão 1.40
exige as adaptações abaixo (receita em `03-guia-implementacao.md` §3.17).

| Usado no protótipo (1.66) | Em 1.40.2 | Substituto em 1.40 | Custo |
|---|---|---|---|
| `st.navigation(position="hidden")`, `st.Page(url_path=…)`, `st.switch_page`, `st.query_params`, `st.logo` | existem | iguais | nenhum |
| `st.container(key=…)` e a classe `st-key-*`, `border=`, `height=` | existem | iguais; sem `horizontal=`/`gap=` → `st.columns` nos cabeçalhos de card e no filtro de período | baixo |
| `st.segmented_control`, `st.pills` | existem, sem `required=` | tratar `None` no `on_change` (reimpor a seleção anterior) | baixo |
| `st.page_link(query_params=…)` (subitens por seção) | `page_link` sem `query_params` | `st.button` estilizado como link na sidebar: grava a seção em `st.session_state` e chama `st.switch_page`; a página lê a seção do estado em vez de `?secao=` | baixo |
| `st.html(unsafe_allow_javascript=True)` (rolagem por seção, seletor de tema) | `st.html` só com HTML/CSS | `st.components.v1.html("<script>…</script>", height=0)`: o iframe é da mesma origem e alcança `window.parent.document` | baixo |
| `[theme.light]` / `[theme.dark]`, `[theme.sidebar]`, `[[theme.fontFaces]]`, `baseRadius`, `headingFont`, `chartCategoricalColors` | só `[theme]` com `base`, `primaryColor`, `backgroundColor`, `secondaryBackgroundColor`, `textColor` e `font` (sans serif / serif / monospace) | um tema claro da marca no `config.toml`; Inter por `@font-face` em `st.html` apontando para `app/static/fonts/`; sidebar navy, raios e cores do dark por CSS; **tema escuro = parcial**: o viewer escolhe "Dark" no menu ⋮ (tema padrão do Streamlit) e o CSS da marca cobre página, sidebar, cards e blocos próprios; widgets nativos ficam no escuro padrão | médio; fidelidade do escuro ≈ 60–70 % |
| `st.context.theme` (Python sabe o tema) | `st.context` só com `headers` e `cookies` | componente v1 mínimo (HTML puro, sem build) que recebe `theme.base` no `streamlit:render` e devolve ao Python por `setComponentValue`; ou CSS `@media (prefers-color-scheme: dark)` só para o modo automático | médio |
| `st.components.v2.component` (legendas e temas clicáveis) | não existe | (a) `st.pills` para legenda e temas (fidelidade menor, sem barras na própria linha); (b) componente v1 em iframe com `declare_component(path=…)` e um `index.html` escrito à mão que implementa o protocolo (`componentReady`, `setFrameHeight`, `setComponentValue`), CSS próprio dentro do iframe | (a) baixo; (b) médio |
| `st.column_config.ButtonColumn` (botão do agente por linha) | não existe | `st.dataframe(on_select="rerun", selection_mode="single-row")` + botão "Perguntar ao Agente da Agenda sobre …" abaixo da tabela | baixo |
| `st.pagination` | não existe | botões Anterior / Próxima (como a landing) | baixo |
| `st.plotly_chart(config=…, height=…, width=…)` | sem `height` nomeado; `config=` continua aceito pelos `**kwargs` (conferido no código de 1.40.2); `use_container_width=True` | altura em `fig.update_layout(height=…)`; `config={"displayModeBar": False}` como hoje | baixo |
| `st.chat_input(accept_file=…)` (não usado), `st.file_uploader` | uploader existe | igual | nenhum |
| `st.feedback`, `st.popover(icon=…)`, `st.dialog`, `st.expander(icon=…)`, `st.download_button(icon=…)`, `st.date_input(format=…)`, `st.dataframe(column_config=…)` | existem | iguais; `popover` sem `width=` → CSS; `TextColumn(pinned=)` não existe → sem coluna fixa | baixo |
| `on_click="ignore"`, `width="stretch"` | não existem | omitir; `use_container_width=True` | baixo |
| `server.enableStaticServing`, `client.toolbarMode`, `client.showSidebarNavigation` | existem | iguais | nenhum |

Conclusão: tudo tem substituto; o preço é 5–8 dias a mais e um tema escuro parcial. Se o escuro da marca completo for
requisito, pedir à arquitetura exceção para 1.51 ou superior (temas separados e Inter por configuração), ou 1.53+ para
os componentes sem iframe.
