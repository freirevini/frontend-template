# frontend-template

Monorepo com o painel **Agenda Normativa** em duas tecnologias e o template de base para painéis novos. Cada projeto é
independente: tem dependências, comandos, regras para agentes de IA (`AGENTS.md` + `.rules/`) e documentação próprios.
Abra a pasta do projeto como raiz do editor ou rode o agente dentro dela.

## Estrutura

```
frontend-template/
├── langepage-angular/
│   ├── landing-analitica/            # produto: painel Agenda Normativa em Angular
│   └── frontend-template-angular/    # template base para painéis novos em Angular
└── langepage-streamlit/              # réplica do painel em Streamlit (Python)
```

| Pasta | O que é | Stack | Comando de verificação |
|---|---|---|---|
| `langepage-angular/` | Agrupa os projetos Angular. Não tem código próprio. | — | — |
| `langepage-angular/landing-analitica/` | Painel "Agenda Normativa" da área de compliance: páginas Início, Triagent, Scalation e Tabela Analítica, gráficos, relatórios Excel e chat do agente de normas. Dados mock em `src/assets/data/` até o BFF; contrato v1 em `docs/contratos/`. Imagem Nginx não-root com configuração por ambiente em `src/assets/env.json`. | Angular 20.3, TypeScript 5.9, Node 22, CoreUI 5.5, Chart.js 4.5, Karma/Jasmine | `npm run verify` |
| `langepage-angular/frontend-template-angular/` | Ponto de partida para um painel novo: layout CoreUI 5.5 com o tema da marca, rotas limpas, configuração por ambiente em `src/assets/env.json`, camada HTTP pronta (erros, 401, XSRF), imagem Nginx, esteira e smoke E2E, regras, documentação e referência visual do painel. Sem páginas de negócio nem endpoints. | Angular 20.3, Node 22, CoreUI 5.5 | `npm run verify` |
| `langepage-streamlit/` | Réplica do mesmo painel em Streamlit, com os mesmos dados, páginas, gráficos, exportação e chat. Inclui `Dockerfile` e manifestos `k8s/`. O plano por fases está em `docs/planejamento/plano-implementacao.md`. | Python 3.11, Streamlit 1.40.2, Plotly 5.24, pandas 2.2, pytest | `bash scripts/verify.sh` |

## Dentro de cada projeto

| Caminho | Conteúdo |
|---|---|
| `AGENTS.md` | Entrada para qualquer IA: contexto, comandos, regras resumidas e definição de pronto. |
| `.rules/` | Texto completo das regras, registro de erros corrigidos e decisões de processo. |
| `CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.agents/` | Só ponteiros para o `AGENTS.md`. |
| `docs/` | Documentação viva: arquitetura, design system, fichas das páginas, contratos de dados, decisões (ADR), portabilidade e changelog. |
| `scripts/` | Verificações de documentação e utilitários do projeto. |

## Como rodar

Angular (em `langepage-angular/landing-analitica/` ou `langepage-angular/frontend-template-angular/`):

```bash
nvm use          # Node 22, lido do .nvmrc
npm ci
npm start        # http://localhost:4200
npm run verify   # docs, regras, build de produção e testes
```

Streamlit (em `langepage-streamlit/`):

```bash
python3.11 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/streamlit run src/app.py   # http://localhost:8501
bash scripts/verify.sh               # ruff, pytest, docs e regras
```

## Fora do repositório

Não são versionados: dependências instaladas (`node_modules/`, `.venv/`), saídas de build (`dist/`, `.angular/`), caches,
arquivos de ambiente (`.env`) e regras locais (`.rules/local.md`). Hosts, credenciais e dados legais entram por
configuração de cada ambiente, nunca pelo código.
