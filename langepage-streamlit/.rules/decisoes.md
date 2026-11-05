# Decisões — tomadas com motivo; não reabra sem pedido

Decisões de processo e de ferramentas de IA. Decisões de produto e arquitetura ficam em `docs/decisoes/` (ADR).
Leia antes de propor mudança estrutural. Decisão registrada aqui não é re-perguntada nem revertida por "melhoria".
Para mudar, o usuário pede e a entrada ganha uma linha "Revista em". Pedido do usuário que contraria uma regra de
`.rules/` e é mantido após aviso também entra aqui.

## Formato

```markdown
### D-<nnn> · <AAAA-MM-DD> · <decisão em uma frase>
- Contexto: <situação que exigiu decidir>
- Alternativas: <o que foi descartado>
- Motivo: <por que esta>
- Afeta: `<pastas/arquivos>`
- Commit: <hash curto, se houver>
- Revisar quando: <condição concreta>
```

Gotcha de ambiente (armadilha que não é bug de código: ferramenta, infra, dependência) é uma linha com data na seção
do fim: `- <AAAA-MM-DD> · <armadilha> · <como contornar>`.

## Decisões

### D-001 · 2026-11-04 · Regras em `AGENTS.md` + `.rules/`, como na landing; ferramentas recebem só ponteiro
- Contexto: o projeto nasce da landing Angular, que já usa esse formato (D-001 e D-006 de lá).
- Alternativas: `CLAUDE.md` ou `.cursorrules` como fonte; cópia das regras por ferramenta.
- Motivo: `AGENTS.md` é lido por Cursor, Antigravity, Copilot e Codex; um texto só não diverge. Só `AGENTS.md` carrega
  sempre; `.rules/` é aberto antes da primeira ação.
- Afeta: `AGENTS.md`, `.rules/`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`
- Revisar quando: uma ferramenta usada no projeto deixar de carregar `AGENTS.md`.

### D-002 · 2026-11-04 · Plano e decisões D1–D10 aprovados; registrados como ADR-001 a ADR-008
- Contexto: o usuário aprovou em 2026-11-04 o plano (`docs/planejamento/plano-implementacao.md`), a ordem das fases
  F0–F10, o esforço indicativo e as recomendações de todas as decisões.
- Decisões: D1 Streamlit 1.40.2 + pedido de exceção (ADR-002); D2 escuro parcial (ADR-003); D3 listas por `st.pills`,
  componente v1 só se reprovado (ADR-004); D4 paginação Anterior/Próxima e D6 sem Esc/clique fora (ADR-005); D5 chat
  sem "Parar", digitação, colar print e ponto verde, e D7 agente no BFF (ADR-006); D8 URLs sem `#` (ADR-007); D9
  repositório do Cookiecutter do Titan e D10 landing congelada (ADR-001). Premissas da arquitetura corporativa (dados pelo
  BFF, identidade pelo gateway, configuração por ambiente): ADR-008.
- Alternativas: as opções (b)/(c) de cada decisão no plano §6.
- Motivo: recomendações do plano, aprovadas sem alteração.
- Afeta: todo o repositório.
- Revisar quando: a exceção de versão (ADR-002) for concedida, ou a comparação lado a lado da F9 reprovar D2/D3.

### D-003 · 2026-11-04 · Adaptação à versão do Streamlit só por pontos de troca
- Contexto: o protótipo usava APIs de 1.51+/1.53+/1.66 que não existem em 1.40.
- Alternativas: chamar o substituto (iframe, `st.pills`, botões) direto em cada página.
- Motivo: com a exceção de versão (ADR-002) ou 1.51+ no Nexus, trocar um arquivo em vez de todas as páginas.
- Regra: página e bloco chamam `src/core/compat.py` (`theme_type`, `run_js`, `clicklist`, `row_action`, `pager`,
  `hstack`, `section_link`) ou `src/core/ui.py`; nunca a API ausente nem o substituto direto. Teste do ponto de troca
  cobre o contrato.
- Afeta: `src/core/compat.py`, `src/core/ui.py`, `src/views/`, `.rules/projeto.md` R3
- Revisar quando: o projeto subir de versão; a tabela do plano §4 vira a lista de trocas.

### D-004 · 2026-11-04 · CSS nunca em `st-emotion-cache-*`
- Contexto: as classes `st-emotion-cache-<hash>` mudam a cada versão e até a cada build do Streamlit.
- Alternativas: copiar seletores do DevTools.
- Motivo: CSS sobre `st-key-*`, `data-testid` e classes próprias sobrevive a patch; versão cravada (R1) e `checks/` a
  cada troca cobrem o risco restante.
- Afeta: `src/static/app.css`, `st.html` em `src/`; `scripts/docs_check.py` (R3)
- Revisar quando: nunca.

### D-005 · 2026-11-04 · Verificação por `scripts/verify.sh` e hooks de git; CI virá do sample do Titan
- Contexto: o pipeline real (Jenkins/GHA do Titan) só existe depois do Cookiecutter (D9).
- Alternativas: escrever pipeline próprio agora.
- Motivo: script e hook valem em qualquer clone e qualquer IA; na geração pelo Cookiecutter, as etapas do `verify.sh`
  entram no pipeline do sample.
- Afeta: `scripts/verify.sh`, `.githooks/`, `docs/portabilidade.md`
- Revisar quando: o repositório do Cookiecutter existir.

### D-006 · 2026-11-04 · Carimbo `page-data-hash` das fichas é aviso até a F9
- Contexto: na F0 as páginas e `core/data.py` estão sendo reescritos por fases; o carimbo mudaria a cada commit.
- Alternativas: cobrar desde a F0 (falha permanente) ou não ter carimbo.
- Motivo: as sete seções e a tabela já são cobradas; o carimbo vira falha quando a F9 fechar as fichas
  (`PAGE_HASH_STRICT = True` em `scripts/docs_check.py`).
- Afeta: `scripts/docs_check.py`, `docs/paginas/`
- Revisar quando: fim da F9.

### D-007 · 2026-11-04 · Nomes de host proibidos podem aparecer só no plano e no próprio `docs_check.py`
- Contexto: a regra R6 precisa nomear o que proíbe; o plano aprovado cita os nomes no texto da regra.
- Alternativas: reescrever o plano aprovado.
- Motivo: o plano é registro da aprovação e não muda; demais docs citam "nomes da lista `R6_FORBIDDEN`".
- Afeta: `scripts/docs_check.py` (`R6_ALLOWED_FILES`), `docs/planejamento/plano-implementacao.md`
- Revisar quando: o plano for revisto.

### D-008 · 2026-11-04 · Testes que fixavam o contrato proposto `/conforme` foram portados para o contrato v1
- Contexto: o usuário aprovou a adequação aos padrões corporativos (fase 8; ADR-009): R4 passou de `/conforme/...` para
  o v1 (rotas, nomes de campo, Problem Details). Testes existentes fixavam as rotas e os nomes antigos do BFF.
- Alternativas: manter as rotas antigas em paralelo só para os testes; apagar os testes.
- Motivo: a regra mudou por pedido explícito; os testes passam a cobrir o mesmo comportamento no v1, com as mesmas
  asserções e os mesmos casos (nenhum afrouxado): `tests/test_api.py` (URL de `get_json` e `delete`),
  `tests/test_data.py` (cinco testes do modo BFF, um renomeado para `..._calls_the_v1_endpoints`; classificação e
  e-mails do v1 em `tests/test_data_v1.py`), `tests/test_view_scalation.py` (`_bff_cascade` responde em v1),
  `tests/test_chat_session.py::test_bff_paths_and_bodies`.
- Afeta: `tests/`, `src/core/api.py`, `src/core/data.py`, `src/core/chat.py`
- Revisar quando: o BFF publicar o OpenAPI definitivo.

### D-009 · 2026-11-04 · Asserções existentes ajustadas às regras novas da revisão independente
- Contexto: o usuário pediu, em 2026-11-04, Excel da Tabela Analítica só no clique, 403 `AUT-003` com texto próprio e
  uma consulta de quarentena por rodada (E-016, E-017, E-019). Quatro asserções fixavam o comportamento antigo.
- Alternativas: manter o comportamento antigo; apagar os testes.
- Motivo: a regra mudou por pedido explícito; os testes seguem cobrindo o mesmo ponto com o valor novo, nenhum afrouxado:
  `tests/test_api.py::test_problem_details_are_mapped_by_status_and_code_family` (`AUT-003` → `SESSION_RENEW`),
  `tests/test_chat_v1.py::test_upload_polls_until_every_document_is_judged_and_maps_the_verdicts` (três esperas),
  `tests/test_view_triagent.py::test_table_pages_on_the_server` (sem página de 100 no run comum) e
  `::test_more_than_5000_rows_shows_the_limit_text_and_no_export` (limite depois de "Gerar Excel"; botão desativado).
- Afeta: `tests/test_api.py`, `tests/test_chat_v1.py`, `tests/test_view_triagent.py`
- Revisar quando: o BFF publicar o OpenAPI definitivo.

## Gotchas de ambiente

- 2026-11-04 · A pasta pai `LangePageAgenda/` é um clone do CoreUI 5.5 (Angular 20) e tem git próprio · nada de comando
  npm nem git nela; este projeto terá git próprio (D9) até o Cookiecutter.
- 2026-11-04 · O `.venv` local foi criado com `uv` e não tem `pip` · instalar com
  `uv pip install --python .venv/bin/python -r requirements-dev.txt`; no ambiente corporativo, `pip` com o Nexus.
- 2026-11-04 · `pytest` sem nenhum teste coletado sai com código 5 · o `verify.sh` trata como falha; a F0 entrega ao
  menos um teste.
- 2026-11-04 · `streamlit run` sem `watchdog` avisa no terminal (macOS) e **não recarrega** ao salvar arquivo ·
  reiniciar o servidor após mudar `src/`; não instalar fora da R2.
- 2026-11-04 · `st.html` (DOMPurify) descarta um `<style>` inteiro quando o texto tem `<` seguido de letra (ex.
  `<role>` num comentário CSS) · `ui._stylesheets` remove comentários e escapa `<` como `\3c`; não escrever `<x` em CSS.
- 2026-11-04 · `st.html` remove `<svg>` inline e `/app/static/*.svg` é servido como `text/plain` no 1.40 · ícones e
  marca como data URI base64 (`ui.svg_data_uri`) + `mask` CSS (`ui.icon`).
- 2026-11-04 · 1.40 grava inline, em cada filho de um container com chave, a largura medida no bloco pai (padding
  incluído): padding no bloco com chave empurra `st.html`/gráficos para fora do card · caixa (padding, fundo, borda) no
  `stVerticalBlockBorderWrapper` via `:has(> div > .st-key-…)`; `width: auto !important` nos filhos que precisam de
  largura própria.
- 2026-11-04 · `st.rerun()` no meio da página descarta o estado dos widgets que ficaram sem desenhar e pula rodapé e
  chat · página chama `compat.request_rerun()`; `app.py` chama `compat.flush_rerun()` no fim (E-002).
- 2026-11-04 · a chave de tema do frontend (`localStorage["stActiveTheme-<pathname>-v1"]`) não é API pública · usada
  só em `src/components/theme_probe/theme.js`; reconferir a cada mudança de versão.
- 2026-11-04 · `AppTest` do 1.40 falha ao rerodar um `st.segmented_control` com opções string (`KeyError` numa letra) ·
  artefato do harness, no navegador funciona; teste do filtro de período lê o estado em vez de rerodar o widget.
