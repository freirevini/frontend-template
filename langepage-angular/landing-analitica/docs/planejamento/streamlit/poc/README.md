# Protótipo: Agenda Normativa em Streamlit

Esqueleto verificado da landing em Streamlit 1.66.1, usado para medir a fidelidade possível (estudo em `../README.md`).
É referência, não produto: não tem testes automatizados, não lê o BFF e vive dentro de `docs/` de propósito, fora do
build Angular e das verificações do `npm run verify`. Se a decisão for pelo Streamlit, o projeto nasce do Cookiecutter
da Plataforma Titan (`streamlit-sgen-base-ia-sample`, caminho GKE/Titan definido em 2026-11-04) e este código entra em
`src/` do sample; receita em `../03-guia-implementacao.md` §3.2 e §3.14.

## Rodar

No terminal, dentro desta pasta (`docs/planejamento/streamlit/poc`):

```bash
python -m venv .venv                                  # Python >= 3.11 (verificado com 3.12.13)
.venv/bin/pip install -r requirements.txt             # Windows: .venv\Scripts\pip
.venv/bin/streamlit run app.py                        # http://localhost:8601 (porta em .streamlit/config.toml)
```

Dados: `core/data.py` e `core/chat.py` leem `poc/data/` se existir; senão, os JSON da própria landing em
`src/assets/data/` (quatro níveis acima). Ao copiar o protótipo para fora, copie também os cinco JSON para `data/`.

## O que está dentro

| Arquivo | Conteúdo |
|---|---|
| `.streamlit/config.toml` | tema claro/escuro/sidebar com os tokens da marca, Inter por `fontFaces`, servidor estático, toolbar mínima |
| `app.py` | `st.navigation(position="hidden")`, sidebar própria (marca, Início, grupos Triagent/Scalation com subitens por seção, Analítico), faixa com breadcrumb/data/seletor de tema, rodapé, chat flutuante |
| `core/tokens.py` | tokens claro/escuro (`_brand.scss`, `_theme-dark.scss`), `--brand-*` em `:root`, cores por segmento |
| `core/period.py` | porte de `period-range.ts` (presets, validação, rótulos e subtítulos pt-BR, formatação de números) |
| `core/data.py` | carga dos mocks, `filter_classified`/`aggregate_classification`, `aggregate_emails`, `build_waterfall`/`derive_waterfall`, mock dos Normativos Recebidos (aleatório com semente fixa), formatação compacta de moeda |
| `core/charts.py` | figuras Plotly: Normativos Recebidos, sparkline, rosca, e-mails empilhados, cascata |
| `core/ui.py` | CSS (`static/app.css` + regras só do escuro), cards, `period_filter`, `segment_cards`, `segment_overview`, `filter_notice`, âncoras e rolagem por seção, `clicklist` (Components v2), ícones CoreUI inline |
| `core/xlsx.py` | openpyxl com o mesmo layout do `xlsx-export.ts` (conferido abrindo o arquivo) |
| `core/chat.py` | `ChatMockServer` (porte do `chat-mock-server.ts`), estado da conversa, saudação, markdown seguro, balões em HTML, widget flutuante (`st.popover`) |
| `views/*.py` | Início, Triagent (6 blocos), Scalation (cards, cascata, demo "Tráfego e vendas"), Analítico |
| `static/` | `app.css`, Inter (4 pesos latinos), 30 SVGs do `@coreui/icons`, símbolo e logotipo da marca, favicon |
| `checks/` | `shoot.py` (Chrome headless por CDP: capturas em 1440/375 px, claro/escuro), `probe.py` (sondas de DOM), `interact.py` (clica filtro, tema, legenda, subitem, chat, troca de tema, celular). Exigem o Chrome instalado; caminho do binário no topo de `shoot.py` (macOS) |

## Resultados da verificação (2026-11-03, macOS, Chrome headless)

| Teste (`checks/interact.py`) | Resultado |
|---|---|
| Clique em "7 a classificar" | faixa de filtro; linha tracejada "Normas a Classificar · Atacado"; pizza "· Atacado"; tabela com 165 normas |
| Clique numa linha de tema (Components v2) | pizza "· Tema: Requisitos de capital regulatório"; linha ativa; segunda faixa de filtro |
| Clique em "Corporativo" na legenda | série ativa, demais apagadas; 5 itens (sem duplicação ao reexecutar) |
| Subitem "Tabela Analítica" na sidebar | `/triagent?secao=tabela-analitica`; rolagem a ≈ 2 800 px; subitem marcado |
| Chat: abrir, "Consultar uma norma", pergunta com "prazo" | resposta com fontes e "Posso ajudar em mais alguma coisa?"; polegares de feedback; "Avaliar um documento" mostra o uploader |
| Personalizado → Aplicar; Gráfico → Tabela | formulário com as datas atuais; tabela e botão "Exportar Excel" |
| Tema escuro forçado pela chave do `localStorage` | fundo `#0f1319`, sidebar `#0c1238`, cards `#171e28`; volta a "System" |
| 375 px | sidebar recolhida (largura 0), sem rolagem horizontal, cards em uma coluna |

Capturas de referência geradas na verificação (não versionadas): Início, Triagent e Scalation em 1440 px nos dois temas,
Triagent em 375 px, chat aberto, chat com resposta e upload.

## O que o protótipo não cobre (e o guia explica como fazer)

- Dados do BFF (`/conforme/...`), autenticação e usuário real; Normativos Recebidos continua aleatório.
- "Parar" durante a resposta, efeito de digitação, "Tentar novamente" com repetição de `requestId`, colar print com
  Ctrl+V, expandir o painel, tela cheia do chat no celular, ponto verde no botão.
- Esc / clique fora para limpar filtros (só o botão "Remover filtro").
- No chat: lista de normas em formato tabela, "Extrair em Excel" das listas e do resultado dos documentos.
- Negrito no rodapé "Total" das tabelas; chave de cor nos cabeçalhos; Anterior/Próxima (o `st.pagination` é numérico).
- Testes automatizados (pytest/AppTest); só as verificações por navegador em `checks/`.
- Página `/dashboard` de redirecionamento.
