# Erros — já cometidos e corrigidos aqui; não repita

Leia antes de tocar em qualquer área citada: `grep -n "<arquivo>" .rules/erros.md`.
Cada entrada nasce no fim de uma correção (`AGENTS.md`, "Após cada ajuste"). ID é estável;
entrada nunca é apagada, só compactada. O hook de commit recusa correção sem entrada nova.
Erros da landing Angular que valem aqui viraram regra (R9: Excel só com tokens claros; R13: valor de token citado em
doc é copiado de `tokens.py`); não são repetidos como entrada.

## Formato

```markdown
### E-<nnn> · <AAAA-MM-DD> · <comportamento errado, em uma frase; não o número do ticket>
- Área: `<arquivo ou módulo>`, `<teste>`
- Sintoma: <o que apareceu, como foi notado>
- Causa: <raiz, uma linha>
- Regra: <verbo, "nunca" ou "sempre": o que fazer daqui em diante>
- Teste: `<caminho::nome>` ou "sem teste possível: <motivo>"
- Commit: <hash curto>, ou "este" quando a entrada vai no mesmo commit da correção
- Origem: <data · ferramenta/IA ou humano · pedido do usuário | CI>
```

## Como manter

- Entrada nova sempre no fim, com o próximo ID (a primeira é E-001).
- `Área` é o campo de busca: nome exato de arquivo ou módulo.
- `Regra` é executável. "Cuidado com o CSS" não é regra; "seletor só `st-key-*` ou `data-testid`; nunca
  `st-emotion-cache-*`" é.
- Regra que vale para mais de um lugar vai para `testes.md`, `escopo.md`, `projeto.md` ou "Não fazer" do `AGENTS.md`;
  a entrada passa a apontar para lá.
- Acima de ~40 entradas ou 10.000 caracteres: entradas antigas viram uma linha
  (`E-003 · 2026-12-02 · <título> · regra em testes.md §5`). ID fica.
- IDs colidiram (agentes em paralelo, branches): quem faz o merge renumera a entrada mais nova para o próximo ID livre
  e corrige as referências. `bash .rules/check.sh` acusa ID duplicado.

## Entradas

Compactadas (uma linha; texto completo no histórico do git):

- E-001 · 2026-11-04 · Modal "Page not found" na 1ª sessão em `/triagent` · `compat.legacy_pages_session()` antes de `st.navigation`, `dismiss_page_not_found()` depois · `tests/test_compat_ui.py::test_request_rerun_reruns_once_after_the_whole_script_ran`
- E-002 · 2026-11-04 · Chips obrigatórios sem seleção após run interrompido · escolha regravada a cada run; `compat.request_rerun()`, nunca `st.rerun()` · `tests/test_compat_ui.py::test_required_chip_comes_back_when_the_widget_returns_empty`
- E-003 · 2026-11-04 · Planilha deslocada uma linha (`xlsx.py`) · `freeze_panes`/`auto_filter` só depois das linhas · `tests/test_xlsx.py::test_freeze_widths_formats_and_autofilter`
- E-004 · 2026-11-04 · Texto com `=` virava fórmula (CWE-1236) · toda célula de texto por `_safe_cell` (ver E-018) · `tests/test_xlsx.py::test_formula_prefixed_cell_is_quoted_as_text`
- E-005 · 2026-11-04 · Moeda desconhecida sem escape no `st.html` · texto de dado em `st.html` passa por `html.escape` · `tests/test_data.py::test_format_currency_escapes_an_unknown_bff_currency_code`
- E-006 · 2026-11-04 · Erro do BFF mostrava host/traceback (`views/triagent.py`) · leitura de dado em `try/except` com texto pt-BR + `st.stop()` · sem teste (conferido em `checks/`)
- E-007 · 2026-11-04 · `date_input` recusava presets antigos (`ui.py`) · `min_value=_CUSTOM_RANGE_MIN`, `max_value=PERIOD_END` · `tests/test_compat_ui.py::test_custom_range_date_inputs_accept_every_preset_and_the_widest_custom_range`
- E-008 · 2026-11-04 · `id`/`role` do BFF sobrescreviam os do chat · `id`/`createdAt` depois do merge; `role` desconhecido → `system` · `tests/test_chat_helpers.py::test_to_message_ignores_bff_id_and_unknown_role`
- E-009 · 2026-11-04 · Cascata sem `currency`/`unitScale` dava traceback · campo usado fora do `try` validado em `core/data.py` · `tests/test_view_scalation.py::test_cascade_without_currency_or_numeric_unit_scale_shows_the_placeholder`
- E-010 · 2026-11-04 · `SESSION_NOT_FOUND` reabria a sessão sem fim · no máximo `MAX_AUTO_RESTARTS` · `tests/test_chat_session.py::test_backend_that_keeps_answering_session_not_found_gets_one_automatic_restart`
- E-011 · 2026-11-04 · Produção subia com mocks; `CHAT_MOCK=0` verdadeiro · booleano por `parse_bool`; ambiente estrito falha fechado (ver E-015) · `tests/test_settings.py::test_production_fails_closed`
- E-012 · 2026-11-04 · Ícones sem uso em `src/static/icons/` · ícone entra junto com o uso · `tests/test_compat_ui.py::test_every_icon_file_is_used_and_every_used_icon_exists`
- E-013 · 2026-11-04 · Docs citavam contagem de testes defasada · vale a linha `[pytest]` do `verify.sh` · `scripts/docs_check.py` (`STALE_CLAIMS`)

### E-014 · 2026-11-04 · Resposta do BFF de um usuário servida a outro pelo cache
- Área: `src/core/data.py` (`_fetch`, `identity_key`), `tests/test_data_v1.py`
- Sintoma: `st.cache_data` chaveado só por caminho + query; o pedido leva cookie/token de quem chamou.
- Causa: o cache assumia dado igual para todos.
- Regra: chamada cacheada ao BFF leva `identity_key()` (SHA-256 dos cabeçalhos repassados, nunca o valor cru) na chave.
- Teste: `tests/test_data_v1.py::test_two_identities_never_share_a_cached_answer`, `::test_a_401_for_another_user_is_never_answered_from_the_first_users_cache`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-015 · 2026-11-04 · `ENV` desconhecido subia como `des`; UAT aceitava identidade falsa e chat simulado
- Área: `src/core/settings.py` (`_environment`, `_check_environment`), `tests/test_settings.py`
- Sintoma: `ENV=dev` passava sem checagem; `uat` com `AUTH_MODE=mock`; sem `chat.mock`, `KeyError`.
- Causa: só `prd` era conferido; `chat.mock` sem padrão.
- Regra: `environment` só `des`/`uat`/`prd`; `uat` e `prd` exigem `gateway`/`oidc` e `chat.mock` falso; `chat.mock` ausente = `true` só em `des`.
- Teste: `tests/test_settings.py::test_unknown_environment_is_refused_at_startup`, `::test_uat_fails_closed_on_fake_identity_or_simulated_chat`, `::test_missing_chat_mock_defaults_by_environment`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-016 · 2026-11-04 · POST/DELETE ao BFF sem `X-XSRF-TOKEN`; 403 `AUT-003` mostrado como "sem acesso"
- Área: `src/core/api.py` (`_headers`, `xsrf_token`, `code_for`), `src/core/chat.py` (`V1_ERROR_TEXTS`)
- Sintoma: o cookie `XSRF-TOKEN` ia, o cabeçalho não; todo POST cairia em 403.
- Causa: o contrato (esquema `xsrf`) não foi seguido no cliente do servidor.
- Regra: método não seguro leva o cabeçalho com o valor do cookie repassado; 403 `AUT-003` → `SESSION_RENEW`, texto próprio.
- Teste: `tests/test_api.py::test_unsafe_methods_send_the_xsrf_token_from_the_forwarded_cookie`, `tests/test_chat_v1.py::test_403_aut_003_in_the_chat_asks_to_reload_the_page`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-017 · 2026-11-04 · Excel da Tabela Analítica lido (até 50 pedidos) a cada rerun do Triagent
- Área: `src/views/triagent.py` (`build_export`, `EXPORT_STATE`), `src/core/data.py` (`classified_export`, `_bff_uncached`)
- Sintoma: qualquer clique na página repetia o laço de páginas de 100 e enchia o cache por filtro.
- Causa: `st.download_button` precisa dos bytes no run em que é desenhado.
- Regra: export pesado só no clique ("Gerar Excel"), bytes no `session_state` pela assinatura dos filtros; páginas do export fora do cache.
- Teste: `tests/test_view_triagent.py::test_a_plain_run_reads_no_export_page_and_offers_gerar_excel`, `::test_gerar_excel_reads_the_pages_and_offers_baixar_excel_with_the_file`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-018 · 2026-11-04 · Cabeçalho de coluna do Excel sem `_safe_cell`; tabulação inicial não protegida
- Área: `src/core/xlsx.py` (`build_xlsx`, `_FORMULA_PREFIXES`)
- Sintoma: rótulo de data do BFF (`rotuloData`) ia cru ao cabeçalho; `\t`/`\r` só eram cobertos antes de `=`.
- Causa: E-004 cobriu linhas e totais, não o cabeçalho.
- Regra: toda célula de texto, cabeçalho incluído, por `_safe_cell`; prefixos `=`, `+`, `-`, `@`, `\t`, `\r`.
- Teste: `tests/test_xlsx.py::test_formula_prefixed_header_is_quoted_as_text`, `::test_a_leading_tab_or_carriage_return_is_quoted_whatever_follows`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-019 · 2026-11-04 · Consulta da quarentena: 429 fatal, um pedido por arquivo por rodada, prazo só por rodada
- Área: `src/core/chat.py` (`await_quarantine`), `src/core/api.py` (`ApiError.retry_after`)
- Sintoma: 429 do gateway encerrava o envio; N arquivos = N pedidos a cada 2 s; consulta lenta passava do prazo.
- Causa: laço por arquivo dentro da rodada; só 5xx era transitório; contador não zerava.
- Regra: uma consulta por rodada em rodízio; 429 transitório com `Retry-After` em 1–10 s; prazo antes de cada consulta; sucesso zera falhas.
- Teste: `tests/test_chat_v1.py::test_quarantine_polls_one_document_per_round_in_rotation`, `::test_quarantine_429_waits_its_retry_after_within_bounds_and_counts_as_a_failure`, `::test_quarantine_deadline_is_checked_before_every_consult`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-020 · 2026-11-04 · Ponto não numérico na série do BFF dava traceback no Triagent
- Área: `src/core/data.py` (`_counts`, `traffic_from_response`, `segments_from_v1`), `src/views/triagent.py`
- Sintoma: `"12"` em `classificadas` quebrava a soma fora do `try`; `tendencia` ia crua ao minigráfico.
- Causa: só o tamanho das séries era conferido.
- Regra: série do BFF validada ponto a ponto com `_count` na função de `core/data.py` (regra de E-009).
- Teste: `tests/test_view_triagent.py::test_traffic_with_a_text_point_shows_the_block_error_instead_of_a_traceback`, `tests/test_data_v1.py::test_segment_trend_with_an_invalid_element_is_refused`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-021 · 2026-11-04 · Sigla da instituição colada como prefixo escapava da verificação de nomes
- Área: `src/core/compat.py`, `src/static/app.css`, `src/components/theme_probe/`, `scripts/docs_check.py` (`NAME_PREFIX`)
- Sintoma: chave de container e global JS com a sigla + letras (prefixos agora `brandjs-`, `brandTheme`).
- Causa: o padrão só pegava a sigla isolada ou em camelCase depois de minúscula.
- Regra: identificador de marca usa `brand*`; `check_local_name` reprova a sigla como prefixo (fora lockfiles).
- Teste: `tests/test_docs_check.py::test_planted_tokens_fail_the_check_and_lockfiles_are_skipped`; tema conferido no navegador
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-022 · 2026-11-04 · Índice do pip da esteira gravado na imagem (`ENV PIP_INDEX_URL`)
- Área: `Dockerfile`, `tests/test_dockerfile.py`
- Sintoma: `docker inspect` mostraria a URL do Nexus. Causa: `ARG` copiado para `ENV`.
- Regra: índice só no `RUN pip install` por segredo do BuildKit; nunca `ENV` nem `ARG` (ARG fica no `docker history`).
- Teste: `tests/test_dockerfile.py::test_pip_index_url_is_never_env_nor_arg`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente

### E-023 · 2026-11-04 · Scripts de `checks/` com host local fixo
- Área: `checks/shoot.py` (`base_url`), `checks/*.py`
- Sintoma: endereço do app versionado como padrão (R6). Causa: valor de conveniência no código.
- Regra: endereço do app só por argumento ou `CHECK_BASE_URL`; sem padrão.
- Teste: `tests/test_checks.py::test_no_check_script_has_a_host_or_port_in_the_code`
- Commit: este · Origem: 2026-11-04 · agente · revisão independente
