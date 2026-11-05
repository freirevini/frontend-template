# Estudo: a mesma Agenda Normativa em Streamlit

Avaliação feita em 2026-11-03 para responder a uma pergunta do produto: **dá para replicar a landing (Angular 20.3 +
CoreUI 5.5) em Streamlit, com os mesmos elementos, e ficar o mais próximo possível do que já está construído?** O estudo
não altera nada do que existe; só acrescenta esta pasta. Nenhuma decisão foi tomada: se a escolha for pelo Streamlit,
ela vira um ADR (próximo número livre em `docs/decisoes/README.md`) e um projeto separado.

| Documento | O que responde |
|---|---|
| [`01-diagnostico-landing.md`](01-diagnostico-landing.md) | O que exatamente existe hoje, bloco a bloco: layout, páginas, dados, cálculos, interações, textos, tema, exportações, chat, infraestrutura. É a lista do que um porte precisa cobrir |
| [`02-de-para-streamlit.md`](02-de-para-streamlit.md) | Elemento por elemento: como se faz em Streamlit, com que técnica, e qual o grau de fidelidade (igual, equivalente, aproximado, diferente, não existe) |
| [`03-guia-implementacao.md`](03-guia-implementacao.md) | Receita completa para construir: ambiente, estrutura, tema, CSS, navegação, cards, filtros, gráficos, tabela, Excel, chat, dados reais, autenticação, hospedagem, testes, checklist |
| [`04-cenarios-e-riscos.md`](04-cenarios-e-riscos.md) | Cenários realistas (do mais simples ao de maior fidelidade), esforço, riscos, custos de manutenção, comparação Angular × Streamlit e recomendação |
| [`poc/`](poc/README.md) | Esqueleto verificado: a landing reproduzida em Streamlit 1.66.1 (quatro páginas, dois temas, filtros cruzados, Excel, chat flutuante) com os resultados dos testes de interação e capturas |

## Resposta curta

**Sim, dá para chegar perto, mas não é cópia.** Em Streamlit 1.66 (outubro de 2026) tudo o que a landing mostra tem um
equivalente: tema claro e escuro com os tokens da marca, Inter, menu lateral navy com grupos e subitens, cards de segmento com
minigráfico, filtro de período com chips, gráficos de linha, rosca, barras empilhadas e cascata, lista de temas clicável,
tabela com ordenação, paginação, botão por linha e Excel, chat flutuante com fluxo guiado, upload e feedback. O
protótipo em `poc/` prova cada um desses pontos rodando. O que muda é a natureza da aplicação:

- **Arquitetura.** A landing é um build estático servido pelo Apache; o Streamlit é um **servidor Python** (Tornado +
  WebSocket) que reexecuta o script a cada interação. Isso muda hospedagem, autenticação, sessões e custo. No ambiente corporativo esse
  processo tem dois destinos homologados (confirmado pela arquitetura em 2026-11-04): **Databricks Apps** (HML-1143,
  esteira PEPD-1491 via Databricks Asset Bundles, SSO/OIDC, Unity Catalog) e **GKE corporativo** (genaigke / Plataforma
  Titan, padrão N3 "Streamlit e Titan Frontend Sample", com BFF Spring Boot); Apache com `mod_proxy_wstunnel` é o padrão
  quando o processo é exposto por Apache. A restrição de hospedagem, portanto, está resolvida. Para **este** produto o
caminho é o GKE/Titan: o parecer HML-1143 veda IA generativa, LLM, RAG e agentes no Databricks Apps, e a Agenda
Normativa tem o Agente da Agenda; os dados chegam exclusivamente pelo BFF Atlante, como hoje.
- **Fidelidade visual.** Cerca de 85 a 90 % com CSS sobre os seletores estáveis do Streamlit (`st-key-*`, `data-testid`)
  e com componentes HTML próprios (Components v2). Sobram diferenças de tooltip, animação, foco e alguns textos internos
  dos widgets em inglês. Tabela comparativa em `02-de-para-streamlit.md`.
- **Comportamentos sem equivalente limpo.** Tecla Esc e clique fora para limpar filtros, botão "Parar" durante uma
  resposta do agente, efeito de digitação, colar print com Ctrl+V, rolagem suave sob header fixo ao abrir uma seção pelo
  menu (feita com JavaScript injetado). Todos têm solução parcial; nenhum é bloqueante.
- **O que fica melhor.** Dados e Excel saem do Python (pandas + openpyxl), o agente pode chamar o Gemini direto do mesmo
  processo, e a tabela nativa oferece busca e redimensionamento sem código.

## O que foi verificado (protótipo)

Rodado em macOS com Python 3.12.13, Streamlit 1.66.1, Plotly 7.1.0, pandas 3.1.0, openpyxl; Chrome headless para as
capturas e os testes de interação (`poc/checks/`). Resultados:

| Verificação | Resultado |
|---|---|
| Quatro páginas (`/`, `/triagent`, `/scalation`, `/analitico`) com menu lateral navy, grupos e subitens | ok; subitem abre a página e rola até a seção (`?secao=`) |
| Tema claro e escuro pelos tokens da marca, Inter servida localmente, cards, chips, segmentado, sidebar | ok; `st.context.theme` muda e o CSS acompanha |
| Cards de segmento (gradiente, selo "N a classificar", minigráfico) e filtro da página pelo selo | ok; faixa de filtro, linha tracejada "· Atacado", pizza e tabela refiltradas |
| Normativos Recebidos: Dia/Mês/Ano, presets, personalizado com validação, Gráfico/Tabela, legenda clicável com destaque, Excel | ok |
| Normas Aplicáveis (rosca com total no centro) ↔ Assunto das Normas (barras clicáveis) com filtro cruzado | ok (Components v2) |
| Fluxo de e-mail: período próprio (Dia/Mês), indicadores, barras empilhadas com totais, legenda, últimos e-mails expansíveis, Excel | ok |
| Tabela Analítica: filtros da página, ordenação, 15 por página, botão do agente por linha, Excel com título, cabeçalho azul, filtro e congelamento | ok (arquivo aberto e conferido com openpyxl) |
| Cascata do resultado: `R$`/`% da receita`, Gráfico/Tabela, rampas, conectores, rótulos dentro das barras | ok |
| Agente da Agenda flutuante: saudação por hora, menu, texto livre com resposta e fontes, upload, feedback, "Recomeçar" | ok; painel com 400 px de largura |
| Seletor Claro/Escuro/Automático no header | ok, mas por escrita na chave interna do Streamlit no `localStorage` (não é API pública) |
| 375 px | ok; menu recolhido, colunas empilhadas, sem rolagem horizontal |

## Cenários (detalhe em `04-cenarios-e-riscos.md`)

| Cenário | Fidelidade | Esforço indicativo | Quando faz sentido |
|---|---|---|---|
| A. Streamlit "puro" (widgets nativos, tema via `config.toml`, sem CSS) | 55–65 % | 5–8 dias úteis | painel interno rápido, sem exigência de marca |
| B. Streamlit + CSS nos seletores estáveis + Components v2 (o que o protótipo faz) | 85–90 % | 15–25 dias úteis + backend | **recomendado se a decisão for Streamlit** |
| C. B + componentes empacotados (TypeScript) para menu, legenda e chat | 90–95 % | +10–15 dias e toolchain Node de volta | só se os 10 % restantes forem exigência |
| D. Manter Angular e usar Streamlit só para páginas analíticas novas (ex.: "Analítico") | n/a | por página | aproveita o que existe; dois stacks |

**Recomendação.** Com a hospedagem confirmada e o caminho definido pela regra (GKE/Titan, padrão N3, BFF Atlante), o
cenário B entrega a mesma experiência de uso com menos código de interface e integração natural com Python e Excel,
mantendo a arquitetura atual (contrato `/conforme/...`, orquestração do agente no BFF, ADR-011). O projeto nasce do
repositório base `streamlit-sgen-base-ia-sample` (Cookiecutter da Plataforma Titan) com `poc/` como código da
aplicação. A decisão continua sendo de produto: fidelidade sozinha não justifica reconstruir o que já existe. Todas as
perguntas à arquitetura foram respondidas (`04-cenarios-e-riscos.md` §4.8). A mais importante muda o plano: **o
Streamlit homologado é a faixa 1.38–1.40**, e o protótipo foi feito em 1.66. Em 1.40 não existem temas claro e escuro
separados por configuração, JavaScript em `st.html`, Components v2, `st.pagination` nem `ButtonColumn`; cada um tem
substituto (§4.10 e `03-guia-implementacao.md` §3.17), ao custo de 5–8 dias a mais e de um tema escuro parcial.
Alternativa: pedir à arquitetura exceção para uma versão 1.5x/1.6x, já que a regra é `>= 1.38.0`.
