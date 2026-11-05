# Changelog

Histórico por entrega, mais recente primeiro. Cada fase do plano (F0–F10) fecha com uma entrada: o que mudou, arquivos
principais, o que foi verificado e o que ficou de fora. Todas as fases F0–F9 foram executadas em 2026-11-04 (agentes
em paralelo por fase); a F10 (integração no ambiente corporativo) está pendente. Evidência de verificação: `docs/planejamento/plano-implementacao.md` §10.

## 2026-11-04 — Correções da revisão independente

Dez achados de uma revisão independente, cada um com teste que falha antes e passa depois (E-014 a E-023; asserções
antigas ajustadas por pedido em D-009).

- Marca: chave de container `brandjs-*` e global JS `brandTheme` (`core/compat.py`, `static/app.css`,
  `components/theme_probe/`); `scripts/docs_check.py` reprova a sigla da instituição como prefixo colado a letras
  (lockfiles fora). Tema claro/escuro pelo seletor conferido no Chrome headless (E-021).
- `core/api.py`: `X-XSRF-TOKEN` copiado do cookie `XSRF-TOKEN` repassado em POST/PUT/PATCH/DELETE (multipart incluído);
  403 `AUT-003` → `SESSION_RENEW` "Sua sessão precisa ser renovada. Recarregue a página." nas páginas e no chat;
  `ApiError.retry_after` (E-016).
- `core/data.py`: cache do BFF por usuário (`identity_key`, SHA-256 dos cabeçalhos repassados) (E-014); tendência dos
  segmentos e séries dos Normativos Recebidos validadas ponto a ponto (`_counts`) (E-020); páginas do Excel sem cache
  (`_bff_uncached`).
- `views/triagent.py`: Excel da Tabela Analítica sob demanda nos dois modos: "Gerar Excel" lê as linhas (até 5.000) e
  oferece "Baixar Excel" com o arquivo guardado no `session_state` para a assinatura dos filtros; rerun comum não lê
  nada (E-017).
- `core/xlsx.py`: cabeçalhos por `_safe_cell`; tabulação e retorno de carro iniciais protegidos (E-018).
- `core/settings.py`: `environment` só `des`/`uat`/`prd`; `uat` exige `gateway`/`oidc` e `chat.mock` falso como `prd`;
  `chat.mock` ausente vale `true` só em `des` (E-015). `settings.yaml`, `k8s/configmap.yaml`, `AGENTS.md` atualizados.
- `core/chat.py`: quarentena com uma consulta por rodada em rodízio, 429 transitório (`Retry-After` em 1–10 s), prazo
  antes de cada consulta, contador de falhas zerado no sucesso (E-019).
- `Dockerfile`: índice do pip só no `RUN pip install` por segredo do BuildKit; sem `ENV`/`ARG` (E-022).
- `checks/`: endereço do app por argumento ou `CHECK_BASE_URL`, sem host padrão (E-023).
- Docs: `arquitetura.md`, `contratos-de-dados.md`, `dependencias-e-ambiente.md`, `portabilidade.md`,
  `paginas/triagent.md`, `paginas/inicio.md`, `glossario-ptbr.md`; carimbos `page-data-hash` das quatro fichas.
- Verificado: `bash scripts/verify.sh` verde; tema claro ↔ escuro pelo seletor do header em servidor próprio (1440 e
  375 px). Fora: build da imagem (sem Docker na máquina).

## 2026-11-04 — Adequação aos padrões corporativos, fase 8: contrato v1 (ADR-009)

Código adequado ao contrato v1 do BFF (fonte: OpenAPI da landing); infraestrutura (F10) fora.

- `core/api.py`: `bff.base_url` (caminho base da API) + `bff.prefix` `/v1` + recurso; erros RFC 7807 lidos por
  `parse_problem` (só `status`, `code`, `traceId`) e mapeados por status e família (`code_for`): 401 → `AUTH_REQUIRED`,
  403 → `FORBIDDEN`, 413 sem corpo ou `VAL-004` → `SEND_TOO_LARGE`…; textos pt-BR (`HTTP_ERROR_TEXTS`,
  `SUPPORT_CODE_TEXT`, `EXPORT_LIMIT_TEXT`, "Entrar novamente"), `error_text`, `support_code`, `login_url`.
- `core/data.py`: `segmentos`, `normativos-recebidos`, `normas-classificadas` (paginado) e `/resumo`,
  `emails-sugestao` (paginado) e `/resumo`, `cascatas-resultado`, com adaptadores `*_from_v1` para os formatos de
  sempre; `classification_summary`, `emails_summary`, `classified_page`, `classified_export` (páginas de 100 até 5.000
  linhas; acima, `ExportLimitError` com o texto do contrato), `server_paging`. Mock (`data/*.json`) sem mudança.
- `views/triagent.py`: rosca e temas por `classification_summary`, e-mails por `emails_summary`; Tabela Analítica
  pagina, ordena e filtra no servidor com o BFF (`compat.pager` dá a página), Excel com o teto de 5.000 linhas; erros
  por `ui.data_error`. `views/inicio.py`, `views/scalation.py`: idem nos erros. `core/ui.py`: `data_error`,
  `data_error_html` (texto pt-BR, link do 401, código de suporte).
- `core/chat.py`: `BffBackend` em `/v1/agente/sessoes/...` com adaptadores (`node_from_v1`, `message_from_v1`,
  `file_status_from_v1`) e `GET /v1/usuarios/me` para a saudação; envio de documentos 202 + consulta
  (`await_quarantine`: 2 s entre consultas, teto de 2 minutos com `cancelamentos`, 404 na hora, 5xx três vezes) com
  "Verificando o documento..." (toast) e os motivos da quarentena em pt-BR; soma por envio até 9 MB validada antes de
  enviar (`SEND_TOO_LARGE`), 20 MB por conversa mantidos; 401 mostra "Sua sessão expirou. Entre novamente." com o link e
  não tenta de novo; "Código de suporte" nas mensagens de erro com `traceId`. Mock: mesma regra de sempre e quarentena
  simulada por nome de arquivo, sem espera.
- `settings.yaml`: `bff.prefix: /v1`, `auth.login_url` (`AUTH_LOGIN_URL`, padrão `/`), `chat.max_send_bytes` 9 MB.
- Regras e docs: R4 (`.rules/projeto.md`, `AGENTS.md`), D-008 (testes portados), ADR-009 (+ notas em ADR-006 e ADR-008),
  `contratos-de-dados.md` reescrito para o v1, `arquitetura.md`, `dependencias-e-ambiente.md`, `portabilidade.md`,
  `docs/README.md`, fichas `inicio`/`triagent`/`scalation` (carimbos `page-data-hash` recalculados; `analitico` só o
  carimbo), glossário, plano §10. `scripts/docs_check.py`: `contratos-de-dados.md` precisa citar `/v1/`; a regra local
  de nome também pega a sigla colada em identificador (camelCase, sensível a caixa).
- Testes novos: `tests/test_data_v1.py`, `tests/test_chat_v1.py`, `tests/test_view_triagent.py`, casos novos em
  `tests/test_api.py` e `tests/test_view_scalation.py`. Testes do contrato proposto portados para o v1 com as mesmas
  asserções (D-008).
- Fora: F10 (ConfigMaps/Secrets reais, `k8s/`, esteira), CSRF `X-XSRF-TOKEN` e `Retry-After` no cliente, conferência
  no navegador contra o BFF real.

## 2026-11-04 — Regras locais não versionadas

- `AGENTS.md` aponta para `.rules/local.md` (regras locais, vinculantes quando o arquivo existe); o arquivo está no
  `.gitignore` e não é versionado.
- `scripts/docs_check.py`: verificações de regra local só rodam quando `.rules/local.md` existe e contém a regra; o
  índice do `AGENTS.md` cobra só as regras de `.rules/projeto.md`.
- Arquivos: `.gitignore`, `AGENTS.md`, `.rules/projeto.md`, `.rules/decisoes.md`, `scripts/docs_check.py`,
  `docs/decisoes/README.md`, `docs/arquitetura.md`, `docs/dependencias-e-ambiente.md`, `docs/portabilidade.md`,
  `settings.yaml`, `k8s/`, comentários de `src/app.py`, `src/core/footer.py` e `tests/test_footer.py`.

## 2026-11-04 — Adequação, fase 1: cascata, laço do chat, falha fechada em PRD, ícones, contagem de testes

Pendências da §10.2 do plano (E-009 a E-013 em `.rules/erros.md`), cada uma com teste que falhava antes da correção.

- Cascata (`core/data.py`): `validate_waterfall` dentro de `waterfall()` exige `currency` de 3 letras maiúsculas e
  `unitScale` número finito > 0; resposta do BFF sem eles mostra "Não foi possível carregar os dados da cascata." em
  vez de traceback. Testes: `tests/test_view_scalation.py` (novo, `AppTest` da página em modo BFF) e
  `tests/test_data.py::test_bff_cascade_without_currency_code_or_numeric_unit_scale_is_rejected`.
- Chat (`core/chat.py`): `SESSION_NOT_FOUND` abre sessão nova no máximo `MAX_AUTO_RESTARTS` (1) vez até o backend
  responder; depois, erro genérico pt-BR com "Tentar novamente" (abre sessão nova). `start()` não repete a abertura
  falhada a cada rerun do painel. Testes: `tests/test_chat_session.py` (quatro novos).
- Configuração (`core/settings.py`, `app.py`): `parse_bool` aceita `true/false/1/0/sim/não/nao/yes/no/on/off` em
  qualquer caixa e recusa o resto; com `ENV=prd` o app não sobe com `AUTH_MODE` fora de `gateway`/`oidc`,
  `CHAT_MOCK` verdadeiro ou `BFF_BASE_URL` vazio (`SettingsError`); a tela mostra só "Não foi possível iniciar a Agenda
  Normativa. Contate o suporte." e o motivo vai para o log. Testes: `tests/test_settings.py` (novo).
- Ícones: removidos de `src/static/icons/` os 24 SVG do subconjunto da landing sem referência; ficam os 13 usados.
  Teste: `tests/test_compat_ui.py::test_every_icon_file_is_used_and_every_used_icon_exists`.
- Docs: contagem de testes fixa trocada por texto sem número em `docs/arquitetura.md`, `docs/README.md` e `README.md`;
  `scripts/docs_check.py` (`STALE_CLAIMS`) passa a acusar contagem de testes fora do changelog e do plano.
- Arquivos de docs: `arquitetura.md`, `contratos-de-dados.md`, `dependencias-e-ambiente.md`, `portabilidade.md`,
  `design-system.md`, `glossario-ptbr.md`, `paginas/scalation.md`; carimbos `page-data-hash` das quatro fichas
  atualizados (mudou `core/data.py`).

## 2026-11-04 — Prefixos `brand-*`; dados legais por configuração de ambiente

- Prefixo de marca neutro: `--brand-*`, `.brand-*` (`.brand-lockup`, `.brand-mark`, `.brand-name` na sidebar), chave
  `brand-css`, estado `_brand_*`, componente `brand_theme_probe`, `localStorage["brand-theme-mode"]`.
- Logos renomeados sem mudar o desenho: `brand-mark.svg`, `brand-mark-white.svg`, `brand-logo-white.svg`.
- Rodapé: nomes, CNPJ e endereços das empresas saíram do código; `src/core/footer.py` lê `footer.entities`
  (`FOOTER_ENTITIES`, padrão `[]`) e só mostra o bloco legal quando configurado; `tests/test_footer.py`.
- Docs, comentários e testes alinhados aos nomes novos; links para o relatório da landing apontam para
  `adequacao-padroes-corporativos.md`. Carimbos `tokens-hash` e `page-data-hash` atualizados.

## 2026-11-04 — Relatório de adequação aos padrões corporativos (sem código)

- Respostas da arquitetura corporativa (estrutura, BFF, identidade, agente, dados) consolidadas no relatório único
  `../../langepage-angular/landing-analitica/docs/planejamento/adequacao-padroes-corporativos.md`, que vale para os dois projetos.
- Para este projeto: Fase 1 = pendências da §10.2 do plano (Scalation sem `currency`/`unitScale`, laço do chat,
  `AUTH_MODE`/`CHAT_MOCK` com falha fechada em PRD, leitura booleana, ícones sem uso); Fase 8 = contrato `/api/v1`,
  Problem Details, paginação, 401, limite e quarentena de upload, F10. Aguardando aprovação (D1 decide a frente de produção).
- Arquivos: `docs/README.md`, este changelog.

## 2026-11-04 — F9, fechamento: documentação viva, erros e decisões

- Fichas `docs/paginas/*.md` reescritas para o estado implementado (blocos, chaves de estado, dados, verificação §7)
  com os carimbos `page-data-hash` atuais; `docs/arquitetura.md`, `design-system.md`, `contratos-de-dados.md`,
  `README.md` e `docs/README.md` alinhados ao código final; `.rules/erros.md` (E-001 a E-003) e gotchas em
  `.rules/decisoes.md`; plano com §10 "Execução".

## 2026-11-04 — Revisão de código: correções de segurança

Correções da revisão independente de código (E-004 a E-008 em `.rules/erros.md`); 314 testes.

- Excel (`core/xlsx.py`): `_safe_cell` prefixa com `'` qualquer texto que comece com `=`, `+`, `-` ou `@` (título,
  subtítulo, linhas, totais) — injeção de fórmula (CWE-1236) por nome de arquivo, texto do BFF ou campo de norma.
- `data.format_currency`: código de moeda desconhecido é escapado (`html.escape`) antes de chegar ao `st.html` da
  tabela da cascata.
- `views/triagent.py`: `segments`, `traffic`, `classification` e `emails` dentro de `try/except` com mensagem pt-BR e
  `st.stop()`; `config.toml` com `showErrorDetails = false` (defesa em profundidade: o 1.40 ainda mostra tipo e
  traceback, por isso as páginas capturam).
- `ui.period_filter`: `st.date_input` com `min_value`/`max_value` explícitos (`_CUSTOM_RANGE_MIN` = 1º de janeiro de
  `PERIOD_END.year − 30`, `PERIOD_END`), cobrindo todos os presets e o personalizado mais largo.
- `chat._to_message`: `id`/`createdAt` gerados depois do merge (a resposta do BFF não os sobrescreve; são chaves de
  widget) e `role` restrito a `user`/`ai`/`system`.
- Pendências abertas (sem correção; listadas no plano §10): `unitScale`/`currency` lidos fora do `try` em
  `scalation.py`; recursão de `SESSION_NOT_FOUND` se o BFF seguir falhando; padrões de `settings.yaml` abertos
  (`AUTH_MODE=mock`, `CHAT_MOCK=true`: o ConfigMap de PRD precisa defini-los); upload do chat confia no MIME do
  navegador (o BFF valida).

## 2026-11-04 — F9, polimento 2 (comparação lado a lado com a landing)

- Cards de segmento (`ui.segment_cards`, `app.css`): mesma ordem do widget-stat-a — valor + selo "N a classificar" na
  mesma linha, nome com ícone abaixo, minigráfico no rodapé com recuo de 1rem (`charts.SPARKLINE_SIDE_MARGIN`).
- "Últimos e-mails" (`ui.email_row`, `triagent.css`): expander com a cara da linha da landing (seta, data, amostra do
  segmento, "N normas" à direita, filetes); indicadores do card sem caixa alta.
- Header (`app.py`, `app.css`): duas linhas fixas (data + tema; divisor; breadcrumb); recuo de rolagem das seções
  (`.page-section`, `ui.scroll_to_section`).
- Cascata em 375 px (`charts.waterfall_chart`): ticks menores e margens laterais recolhidas; nomes das etapas em
  duas linhas.
- Faixas do mock de Normativos Recebidos conferidas com `dashboard-charts-data.ts` (160–240, 100–160, 55–105,
  120–200, 3–12), agora com teste.
- Testes novos em `tests/test_compat_ui.py`; capturas em `checks/` (1440/375, claro/escuro).
- Fora: grupos da sidebar fechados por padrão como na landing (aqui o grupo da página atual abre); ícones CoreUI nos
  chips Gráfico/Tabela e paginação compacta da Tabela Analítica (limites do 1.40, ADR-004).

## 2026-11-04 — F9, polimento 1 (fidelidade, acessibilidade, correções do 1.40)

- Rerun adiado (`compat.request_rerun`/`flush_rerun`): a página só marca, `app.py` faz um `st.rerun()` depois do
  rodapé e do chat; antes, os chips Gráfico/Tabela perdiam o estado e o chat não era desenhado.
- Modal "Page not found" da primeira sessão do processo (`compat.legacy_pages_session`/`dismiss_page_not_found`,
  E-001); chips obrigatórios regravados a cada run (`ui._init_choice`, E-002).
- `viewport_narrow()` pela sonda de tema; gráficos com ticks horizontais e menos rótulos em telas estreitas;
  rótulos da cascata ocultos quando não cabem; nome da série tracejada no hover segue o segmento em foco.
- Ícones de marca (`cib-*`), `cil-user`, `cil-user-female`, `cil-options`; `ui._icon_file` aceita `cilTruck` e
  `cil-truck`.
- Acessibilidade: `aria-label`/`role` nas legendas, faixas (`role="status"`), alertas (`role="alert"`), `caption` e
  texto oculto da cascata, `prefers-reduced-motion` nas linhas de e-mail, foco visível na sidebar e no chat.

## 2026-11-04 — F8, Agente da Agenda (`src/core/chat.py`, `src/static/chat.css`)

- Porte de `src/app/chat/` da landing: textos pt-BR (`TEXTS`, `ERROR_TEXTS`), `safe_markdown` (só p/br/strong/em/
  code/ul/ol/li/a http), saudação por hora e primeiro nome, despedida digitada, validação de documentos (tipos, 5 por
  envio, 20 MB por conversa), listas de normas (filtro por segmento, lista/tabela, "Extrair em Excel"), resultado de
  vários documentos (tabela + Excel), sugestões (opções, respostas prontas, Voltar, Encerrar, Recomeçar).
- `ChatMockServer` (porte de `chat-mock-server.ts`: idempotência por `requestId`, cancelar, cenários por palavra-chave,
  esclarecimento, fora de escopo, quota) sobre `data/chat-fluxo-mock.json`; `MockBackend` e `BffBackend`
  (`/conforme/chat/*` por `core.api`), escolhido por `settings.chat_mock()`.
- Controlador síncrono (`ChatState` em `st.session_state`): sessão, opção, texto, pergunta de outra tela (`ask`),
  arquivos, voltar, tentar novamente (mesmo `requestId`), sessão expirada, encerrar, recomeçar, feedback otimista.
- Painel: botão flutuante `st.popover` (`chat-fab`), cabeçalho com "Recomeçar", log de 400 px com balões por status,
  `st.chat_input` (1000 caracteres) ou `st.file_uploader` conforme o nó; abre sozinho a partir da Tabela Analítica.
- 129 testes (`tests/test_chat_helpers.py`, `test_chat_mock_server.py`, `test_chat_session.py`).
- Fora (ADR-006): "Parar", efeito de digitação, colar print, ponto verde, botão expandir, "Ir para o fim", contador
  de caracteres.

## 2026-11-04 — F7, Scalation e Analítico

- `views/scalation.py` + `static/scalation.css`: cards petróleo sem filtro; Cascata do resultado com período próprio,
  chips `R$`/`% da receita` e Gráfico/Tabela (escolha obrigatória), faixa com resultado e legenda,
  `charts.waterfall_chart` (barras flutuantes, rampas, conectores, rótulos dentro, tooltip completo) e tabela HTML com
  `rowspan`; card "Tráfego e vendas" (demo estática, ícones CoreUI).
- `views/analitico.py`: título oculto. Fichas `scalation.md` e `analitico.md`.

## 2026-11-04 — F4–F6, Triagent (`src/views/triagent.py`, `src/static/triagent.css`)

- F4: cards com filtro "a classificar" (faixa + "Remover filtro"), `ui.period_filter` (Dia/Mês/Ano, presets,
  Personalizado com as três validações e o aviso de troca), `charts.traffic_chart` (linhas, tracejada, valores,
  destaque com área), legenda HTML com totais/participação/barra + chips (`compat.clicklist`), visão Tabela com Total e
  colunas apagadas, "Exportar Excel".
- F5: rosca com total no centro e legenda; barras de temas com "Outros temas"; filtros cruzados nos dois sentidos com
  faixa; Tabela Analítica com ordenação por coluna e sentido (data ISO, número `4.855` → 4855, texto pt-BR por
  `pt_br_key`, desempates), 15 por página com `compat.pager` e "1–15 de N", "Perguntar ao Agente da Agenda" por
  `compat.row_action`, Excel com subtítulo de filtros e nome de arquivo da landing.
- F6: Fluxo de e-mail - Triagem com período próprio (Dia/Mês), indicadores, barras empilhadas com totais, legenda com
  destaque, visão Tabela, Excel e "Últimos e-mails" (expander por e-mail com a tabela das normas, Órgão primeiro,
  "Aplicável ao segmento?" Sim/Parcialmente/Não).

## 2026-11-04 — F3, Início e cards de segmento

- `views/inicio.py` + `ui.segment_overview` (cabeçalho na cor da série, área branca até a borda, "normas"/"a
  classificar"); `ui.segment_cards` (gradiente, selo-botão, minigráfico, tom petróleo, estados filtrado/apagado) para
  Triagent e Scalation; erro de carga em pt-BR; ficha `inicio.md`.

## 2026-11-04 — F2, núcleo de dados e período

- `core/period.py` (presets, validação, rótulos e subtítulos iguais aos da landing, `format_number` estilo Intl),
  `core/data.py` (carga mock/BFF com cache, `validate_segment_cards`/`validate_classification`/`validate_emails`,
  `aggregate_classification`, `aggregate_emails`, `build_waterfall`, `derive_waterfall` bit a bit com o TypeScript,
  `format_currency` compacta com espaços inseparáveis, `pt_br_key`), `core/api.py` (cliente do BFF: `x-request-id`,
  timeout, cabeçalhos do gateway, erros mapeados), `core/xlsx.py` (layout do `xlsx-export.ts`; congelamento gravado
  depois das linhas, E-003).
- 167 testes portados dos specs da landing (`tests/test_period.py`, `test_data.py`, `test_api.py`, `test_xlsx.py`);
  `docs/contratos-de-dados.md`.

## 2026-11-04 — F1, tema, chrome e navegação em Streamlit 1.40.2

- `core/compat.py` com os pontos de troca (tema por componente v1 `src/components/theme_probe`, `run_js`, `clicklist`,
  `row_action`, `pager`, `hstack`, `section_link`, `required_choice`); `core/ui.py` (`inject_css` com Inter por
  `@font-face`, ícones como data URI, cards, chips, segmentado); `core/tokens.py` (`LIGHT`/`DARK`, `css_variables`).
- `app.py`: `st.navigation` oculta, sidebar navy com marca, "Painéis", grupos por `st.expander` com subitens por seção
  (ativo exato, filete ciano), header com data pt-BR, seletor Claro/Escuro/Automático (chave `stActiveTheme-*` do
  Streamlit via `theme.js`) e breadcrumb, rodapé com as empresas, `views/dashboard.py` redirecionando; tema escuro
  parcial (ADR-003); `settings.py`/`auth.py` (`AUTH_MODE` mock e gateway); `config.toml` do sample.
- Sem `st-emotion-cache-*`, `unsafe_allow_javascript` nem `st.experimental_*` (`docs_check.py`, R3).

## 2026-11-04 — F0, plano aprovado; estrutura e governança

- Plano `docs/planejamento/plano-implementacao.md` aprovado, com as decisões D1–D10 nas recomendações (ADR-001 a
  ADR-008) e o esforço indicativo.
- Governança: `AGENTS.md`, `.rules/` (`projeto.md`, `escopo.md`, `testes.md`, `erros.md`, `decisoes.md`, `check.sh`),
  ponteiros (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`), hooks em `.githooks/`.
- Verificação: `scripts/verify.sh` (ruff → pytest → `docs_check.py` → `check.sh`) e `scripts/docs_check.py`;
  `pyproject.toml`, `.gitignore`, `.editorconfig`.
- Documentação: `docs/README.md`, `arquitetura.md`, `contratos-de-dados.md`, `design-system.md`,
  `dependencias-e-ambiente.md`, `portabilidade.md`, `decisoes/`, `paginas/` (modelo + quatro fichas);
  `glossario-ptbr.md` copiado da landing.
- Placeholders do sample do Titan: `Dockerfile`, `k8s/`; protótipo em `src/` e mocks em `data/` trazidos da landing.
