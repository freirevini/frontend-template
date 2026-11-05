# Decisões de arquitetura e de produto (ADRs)

Registro das decisões que explicam por que o código está como está. Ler antes de propor mudança de arquitetura ou de
produto (R13). Formato: Contexto, Decisão, Consequências, com data e situação. Arquivo `ADR-nnn-titulo.md` em
kebab-case; decisão nova recebe o maior número + 1 e entra nesta tabela; decisão revertida não é apagada, ganha
situação "substituída por ADR-nnn". `python scripts/docs_check.py` falha com número repetido ou ADR fora do índice.

As decisões D1–D10 do plano (`docs/planejamento/plano-implementacao.md` §6) foram aprovadas em 2026-11-04 e estão
agrupadas abaixo. Decisões da landing Angular (paleta validada, pt-BR com glossário, orquestração do agente no BFF)
continuam valendo como origem; quando importam aqui, viraram regra (`.rules/projeto.md`) ou ADR desta lista.

| ADR | Título | Data | Situação | Plano | Regras |
|---|---|---|---|---|---|
| [ADR-001](ADR-001-agenda-normativa-em-streamlit-no-titan.md) | Agenda Normativa reconstruída em Streamlit no GKE/Titan; repositório do Cookiecutter; landing Angular congelada | 2026-11-04 | aceita | D9, D10 | R1, R14 |
| [ADR-002](ADR-002-streamlit-1-40-2-e-pontos-de-troca.md) | Streamlit 1.40.2 (faixa homologada) com pontos de troca; exceção de versão pedida em paralelo | 2026-11-04 | aceita | D1 | R1, R3 |
| [ADR-003](ADR-003-tema-escuro-parcial.md) | Tema escuro parcial em 1.40: tokens da marca nos blocos próprios, widgets nativos no escuro padrão | 2026-11-04 | aceita | D2 | R10 |
| [ADR-004](ADR-004-listas-clicaveis-com-st-pills.md) | Listas clicáveis (legendas, temas) por `st.pills`; componente v1 só se reprovado na F9 | 2026-11-04 | aceita | D3 | R3, R10 |
| [ADR-005](ADR-005-paginacao-e-limpeza-de-filtros.md) | Tabela Analítica com Anterior/Próxima; filtros limpos só por "Remover filtro" (sem Esc/clique fora) | 2026-11-04 | aceita | D4, D6 | R3 |
| [ADR-006](ADR-006-agente-no-bff-e-escopo-do-chat.md) | Agente orquestrado no BFF; chat v1 sem "Parar", digitação, colar print e ponto verde | 2026-11-04 | aceita (rotas revistas pelo ADR-009) | D5, D7 | R4, R5 |
| [ADR-007](ADR-007-urls-sem-hash-e-secao-por-estado.md) | URLs sem `#`, seção por estado, `/dashboard` redireciona para `/triagent` | 2026-11-04 | aceita | D8 | R3 |
| [ADR-008](ADR-008-dados-identidade-e-configuracao-pelo-titan.md) | Dados só pelo BFF Atlante, identidade pelo gateway, configuração por ambiente (premissas da arquitetura corporativa) | 2026-11-04 | aceita (prefixo revisto pelo ADR-009) | §1 | R4, R5, R6 |
| [ADR-009](ADR-009-adequacao-aos-padroes-corporativos-contrato-v1.md) | Adequação aos padrões corporativos (contrato v1): `/v1`, adaptadores, páginas e resumos no servidor, Problem Details, 401/403, quarentena e 9 MB por envio | 2026-11-04 | aceita | fase 8 da adequação | R4, R5, R6, R9, R12, R13 |

Documentos relacionados: `docs/planejamento/plano-implementacao.md`, `docs/arquitetura.md`, `docs/design-system.md`,
`AGENTS.md` e `.rules/`.
