# Documentação — langepage-streamlit

Esta pasta precisa bastar sozinha para que outra pessoa ou outra IA entenda, porte (inclusive para o repositório gerado
pelo Cookiecutter do Titan) e adapte o projeto sem acesso à sessão que o construiu (R13 em `.rules/projeto.md`). Tudo em
pt-BR (R12); caminhos e identificadores como no código.

**Estado (2026-11-04):** fases F0–F9 executadas (código em Streamlit 1.40.2, suíte verde, fichas conferidas); revisão
de código aplicada. F10 (integração no ambiente corporativo: ConfigMaps, BFF real, esteira) pendente; pendências abertas no plano §10.

## Documentos

| Documento | Uma linha |
|---|---|
| `arquitetura.md` | Estrutura do repositório, fluxo de um rerun, `app.py`, páginas em `src/views/`, módulos de `src/core/`, chaves de estado, pontos de troca de versão |
| `contratos-de-dados.md` | Mocks de `data/`, formatos e validações, contrato v1 do BFF (`/v1/...`, fonte: OpenAPI da landing), paginação, Problem Details, troca mock → BFF por `settings.yaml`, contrato do chat e quarentena (§9) |
| `design-system.md` | Tokens de `src/core/tokens.py` (claro e escuro), `[theme]` do `config.toml`, Inter, componentes visuais, paleta de gráficos validada; carimbo `tokens-hash` |
| `dependencias-e-ambiente.md` | Python 3.11, cada pacote com versão exata, Nexus `pypi-all/simple`, `.venv`, `settings.yaml`, `config.toml`, variáveis de ambiente, comandos e hooks |
| `portabilidade.md` | Mapeamento para o sample `streamlit-sgen-base-ia-sample` (Cookiecutter do Titan), esteira `develop` → `release/*` → tag/GMUD, ConfigMaps/Secrets, `AUTH_MODE`, checklist |
| `changelog.md` | Histórico por entrega, desde 2026-11-04 |
| `glossario-ptbr.md` | Termos oficiais da interface (cópia da landing); termo novo entra aqui antes de ser usado (R12) |
| `paginas/` | Uma ficha por página (R15): `inicio.md`, `triagent.md`, `scalation.md`, `analitico.md` + `README.md` (modelo) |
| `decisoes/` | ADRs (`ADR-nnn-*.md`) com índice em `decisoes/README.md`; decisões D1–D10 do plano aprovadas |
| `../../langepage-angular/landing-analitica/docs/planejamento/adequacao-padroes-corporativos.md` | Relatório único por fases (2026-11-04) para adequar a landing e este projeto aos padrões corporativos (contrato `/api/v1`, Problem Details, paginação, 401, quarentena de upload, pendências da §10.2 do plano na Fase 1, F10 na Fase 8); aguardando aprovação |
| `planejamento/plano-implementacao.md` | Plano aprovado: premissas da arquitetura corporativa, regras adaptadas, fases F0–F10, matriz de equiparação, decisões; §10 execução (status por fase, evidência, diferenças, pendências) |

Fora de `docs/`, fazem parte do contrato: `AGENTS.md` (entrada para qualquer IA), `.rules/` (`projeto.md` com o texto
vinculante, `escopo.md`, `testes.md`, `erros.md`, `decisoes.md`, `check.sh`) e `README.md` da raiz. `CLAUDE.md`,
`GEMINI.md`, `.cursor/rules/regras-projeto.mdc` e `.agents/` são só ponteiros (D-001 em `.rules/decisoes.md`).

## Ordem de leitura recomendada

**Para uma IA que vai implementar uma fase ou portar:**

1. `AGENTS.md` e `.rules/` (`projeto.md` primeiro)
2. `docs/README.md` (este arquivo) e `docs/planejamento/plano-implementacao.md` (fase em curso)
3. `docs/arquitetura.md`
4. `docs/contratos-de-dados.md`; para uma página só, `docs/paginas/<slug>.md`
5. `docs/design-system.md`
6. `docs/dependencias-e-ambiente.md` e `docs/portabilidade.md`
7. `docs/decisoes/`
8. `docs/glossario-ptbr.md` e `docs/changelog.md` conforme a tarefa

**Para humanos (onboarding ou revisão):** `README.md` da raiz → `changelog.md` → `arquitetura.md` → `design-system.md` →
`contratos-de-dados.md` → `dependencias-e-ambiente.md` → `portabilidade.md` → `decisoes/`.

## Regra de atualização (R13)

Toda mudança de código atualiza o documento correspondente **na mesma entrega**. A tabela "Se mudou → Atualize" fica
em `.rules/projeto.md` (R13), num lugar só.

```bash
python scripts/docs_check.py   # falha (exit 1) listando cada pendência
bash .rules/check.sh           # AGENTS.md e .rules/: presença, tamanho, slots, IDs, segredo, caminhos, ponteiros
bash scripts/verify.sh         # ruff + pytest + docs_check + check.sh: precisa passar antes de concluir
```

O `docs_check.py` confere:

1. documentos obrigatórios existem;
2. `arquitetura.md` cita cada arquivo de `src/views/` e `src/core/`;
3. `contratos-de-dados.md` cita cada mock de `data/`, `bff.base_url` e `/v1/`;
4. cada pacote de `requirements*.txt` está fixado (`==`) e citado com a versão em `dependencias-e-ambiente.md`;
5. carimbo `tokens-hash` de `design-system.md` = SHA-1 (12 caracteres) de `src/core/tokens.py`;
6. `AGENTS.md` tem uma linha de índice por regra de `.rules/projeto.md`; ponteiros só apontam; `CLAUDE.md` importa `@AGENTS.md`;
7. ADR com número único, todos no índice, todo link do índice existe;
8. R10: nenhuma cor hex em `src/**/*.py` fora de `src/core/tokens.py` nem em `src/static/*.css`;
9. R6: nenhum nome da lista `R6_FORBIDDEN` (hosts, e-mail do banco) em `src/`, `docs/`, `k8s/`, `settings.yaml`, `Dockerfile`, `config.toml` (exceções em `R6_ALLOWED_FILES`, D-007);
10. R3: nada de `st-emotion-cache`, `unsafe_allow_javascript`, `st.experimental_` em `src/`;
11. R15: cada página de `src/views/` (menos `dashboard.py`) tem ficha listada, com as sete seções, citando o arquivo, e carimbo `page-data-hash` (aviso até a F9, D-006);
12. frases vigiadas que ficaram falsas (`STALE_CLAIMS`).
