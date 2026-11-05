# Decisões de arquitetura e de produto (ADRs)

Registro das decisões que explicam por que o código está como está. Ler antes de propor mudança de arquitetura ou de produto (R13). Formato de cada ADR: Contexto, Decisão, Consequências, com data e situação. Nome do arquivo em kebab-case: `ADR-nnn-titulo.md`. Decisão nova recebe o próximo número e entra nesta tabela; decisão revertida não é apagada, ganha situação "substituída por ADR-nnn". Número nunca se repete: `npm run docs:check` falha com número duplicado ou ADR fora deste índice.

Renumeração (2026-11-03): três números estavam duplicados. Mantidos os ADRs do chat (010 widget, 011 orquestração no BFF, 012 Gemini); renumerados `ADR-010` exportação Excel → **ADR-017**, `ADR-011` marca Agenda Normativa → **ADR-018**, `ADR-012` card de e-mails → **ADR-019**. Referências nos documentos foram corrigidas.

| ADR | Título | Data | Situação | Regras relacionadas |
|---|---|---|---|---|
| [ADR-001](ADR-001-roteamento-por-hash-e-inicio-na-raiz.md) | Roteamento por hash e "Início" na raiz | 2026-10-27 | substituída em parte por ADR-023 (caminho limpo no lugar do hash) | R6 |
| [ADR-002](ADR-002-dados-mock-ate-contrato-do-bff.md) | Dados mock em `src/assets/data` até o contrato do BFF | 2026-10-27 | aceita (temporária) | R4, R6 |
| [ADR-003](ADR-003-tema-claro-escuro-proprio-sem-portar-coreui-5.md) | Tema claro/escuro próprio, sem portar o CoreUI 5 | 2026-10-27 | aceita (revista em ADR-021: CoreUI 5 adotado, `ThemeService` mantido) | R1, R3, R10 |
| [ADR-004](ADR-004-paleta-da-marca-com-series-validadas-para-daltonismo.md) | Paleta da marca com séries de gráficos validadas para daltonismo | 2026-10-28 | aceita | R10 |
| [ADR-005](ADR-005-fonte-inter-via-fontsource-em-vez-de-cdn.md) | Fonte Inter via `@fontsource/inter`, em vez de CDN | 2026-10-28 | aceita | R2, R10 |
| [ADR-006](ADR-006-filtro-de-periodo-compartilhado-e-cascata-derivada.md) | Filtro de período compartilhado (`<app-period-filter>`) e derivação determinística da Cascata por período | 2026-10-28 | aceita (derivação temporária) | R4, R12 |
| [ADR-007](ADR-007-remocao-da-marca-coreui-da-interface.md) | Remoção da marca CoreUI da interface | 2026-10-27 | aceita | R8 |
| [ADR-008](ADR-008-pt-br-como-idioma-oficial-com-glossario.md) | Português do Brasil como idioma oficial, com glossário | 2026-10-27 | aceita | R12 |
| [ADR-009](ADR-009-css-de-componente-ate-4kb-e-estilos-globais-em-scss.md) | CSS de componente ≤ 4 kB e estilos globais em `src/scss` | 2026-10-28 | aceita | R7, R10 |
| [ADR-010](ADR-010-widget-de-chat-proprio-sem-deep-chat.md) | Widget de chat próprio em Angular, sem o pacote `deep-chat` | 2026-10-28 | aceita | R2, R3, R10 |
| [ADR-011](ADR-011-orquestracao-do-agente-no-bff-atlante.md) | Orquestração do agente no BFF Atlante (Java + Spring Boot); o front só consome | 2026-10-28 | substituída por ADR-023 (orquestrador Python, BFF só encaminha) | R4, R6 |
| [ADR-012](ADR-012-gemini-via-vertex-ai-com-saida-estruturada.md) | Gemini via Vertex AI (`global`), saída estruturada e dados restritos aos registros enviados | 2026-10-28 | revista em ADR-023 (`global` mantida; Gemini 2.5 Flash/Pro; SDK Python) | R4, R6, R12 |
| [ADR-013](ADR-013-card-de-classificacao-das-normas.md) | Classificação das normas: pizza (aplicáveis × não aplicáveis) e lista de temas em cards separados, guiados pelo filtro do Tráfego | 2026-10-28 | aceita | R4, R9, R10 |
| [ADR-014](ADR-014-tabela-analitica-das-normas-classificadas.md) | Tabela Analítica: normas classificadas, com todos os filtros da página e Excel | 2026-10-28 | aceita | R4, R9, R12 |
| [ADR-015](ADR-015-mapeamento-de-dados-de-producao.md) | Mapeamento tela × produção (`docs/mapeamento-de-dados.md`) com carimbo verificado pelo `docs:check` | 2026-10-28 | aceita | R4, R11, R13 |
| [ADR-016](ADR-016-base-de-conhecimento-de-componentes.md) | Páginas de demo do template (Tema, Componentes, Extras) viram base de conhecimento fora do build (R14) | 2026-10-28 | aceita | R8, R14 |
| [ADR-017](ADR-017-exportacao-excel-com-exceljs-sob-demanda.md) | Exportação Excel com exceljs sob demanda (chunk lazy, tipagem local) | 2026-10-28 | revista em ADR-023 (Excel percorre as páginas até 5.000 linhas) | R9, R2 |
| [ADR-018](ADR-018-marca-agenda-normativa-com-simbolo.md) | Marca "Agenda Normativa" com o símbolo oficial da instituição | 2026-10-28 | aceita | R10 |
| [ADR-019](ADR-019-card-de-emails-de-sugestao-de-classificacao.md) | Card "E-mails de sugestão de classificação" no lugar de "Usuários" | 2026-10-28 | aceita | R4, R10 |
| [ADR-020](ADR-020-ficha-por-pagina-para-porte-isolado.md) | Ficha por página em `docs/paginas/` para portar uma página só, com de-para alinhado e `docs:check` verificação 14 | 2026-11-03 | aceita | R13, R15 |
| [ADR-021](ADR-021-migracao-node22-angular20-coreui55.md) | Migração para Node 22, Angular 20.3 e CoreUI 5.5 em salto único, mantendo tudo o que foi desenvolvido | 2026-11-03 | aceita | R1, R2, R3, R10 |
| [ADR-023](ADR-023-adequacao-aos-padroes-corporativos.md) | Adequação aos padrões corporativos: D1–D10, região `global`, contrato v1 (`docs/contratos/`), suposições S1–S10 | 2026-11-04 | aceita | R4, R5, R6, R7, R9, R13 |

Documentos relacionados: `docs/design-system.md` (tokens, tema, paleta, componentes), `docs/dependencias-e-ambiente.md` (pacotes, toolchain, comandos), `docs/glossario-ptbr.md` (termos), `AGENTS.md` e `.rules/` (regras do projeto).
