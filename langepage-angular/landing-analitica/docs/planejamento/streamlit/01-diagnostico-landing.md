# 1. Diagnóstico da landing: o que existe e precisa ser replicado

Inventário feito sobre o código em 2026-11-03 (Angular 20.3.14, CoreUI 5.5.24, Chart.js 4.5.1). Cada linha aqui é um
requisito do porte. Os caminhos citam o código atual; as fichas em `docs/paginas/` e `docs/contratos-de-dados.md` detalham
os campos. Nada neste documento altera o projeto.

## 1.1 Identidade e tema

| Item | Valor atual | Fonte |
|---|---|---|
| Nome, idioma | "Agenda Normativa", pt-BR em toda a interface (R12), código em inglês | `src/index.html`, `docs/glossario-ptbr.md` |
| Fonte | Inter (400, 500, 600, 700) via `@fontsource/inter`, fallback `system-ui, -apple-system, "Segoe UI", Roboto, …` | `_brand.scss`, `angular.json` |
| Tokens claros | primário `#223ad2`, hover `#192a9a`, destaque ciano `#31c7ed`, sucesso `#288f28`, aviso `#ff6600`, erro `#dc1832`; texto `#20262c` / `#4b5968` / desabilitado `#a7b2be`; página `#f3f5f7`, card `#ffffff`, meio `#eaedf0`, borda `#dbe0e5`; sidebar `#0e1650` / marca `#0a1040` | `src/scss/_brand.scss` |
| Tokens escuros | primário `#6b7cf0` (hover `#8491f3`), página `#0f1319`, card `#171e28`, alternativo `#1f2733`, borda `#2b3542`, texto `#eef1f5` / `#a9b1bd`, sidebar `#0c1238` / `#080d2b`, acento do chat `#5568e7` | `src/scss/_theme-dark.scss` |
| Séries de gráfico | claro: `#223ad2`, `#1099bc`, `#288f28`, `#ae6ae6`, referência `#dc1832`; escuro: `#4d61e0`, `#1099bc`, `#2fae2f`, `#ae6ae6`, `#e8475c`. Ordem fixa Atacado, Corporativo, Plataforma, Varejo, "Normas a Classificar" (validada para daltonismo, ADR-004) | `_brand.scss`, `dashboard-charts-data.ts` |
| Rampas da cascata | total `#17278c`, `#223ad2`, `#8c9ae8`; redução `#a51226`, `#dc1832`, `#f07a89`; conector `#a7b2be` (escuro: `#3448d0`, `#5f71ea`, `#8c9ae8` / `#c0162c`, `#e8475c`, `#f59aa6`) | idem |
| Classificação | aplicável navy `#0e1650`, não aplicável `#a7b2be` (escuro `#a4b0f2` / `#a9b1bd`) | idem |
| Raios e elevação | 4, 8, 16, 24 px e pílula; sombras da marca nível 1–3 e `elevation-card` (`0 2px 8px rgba(11,23,35,.06)`) | `_brand.scss` |
| Modo de cor | `ThemeService`: `light` / `dark` / `auto` (segue `prefers-color-scheme`), persistido em `localStorage` (`landing-analitica.color-mode`), aplica `data-theme`, `data-coreui-theme` e a classe `dark-theme` no `<html>`; copia os tokens para o Chart.js e redesenha os gráficos | `src/app/core/services/theme.service.ts` |
| Marca | símbolo branco da instituição (`brand-mark-white.svg`) + "Agenda **Normativa**" na faixa da sidebar (4 rem, fundo `#0a1040`); logotipo da instituição no rodapé; favicon próprio | `default-layout.component.html`, `src/assets/img/brand/` |

## 1.2 Layout e navegação

| Elemento | Comportamento |
|---|---|
| Sidebar fixa (navy, 256 px) | marca; item "Início"; título "PAINÉIS"; grupos "Triagent" (6 subitens) e "Scalation" (3 subitens) que abrem e fecham só por clique (`dropdownMode="none"`); item "Analítico". Subitem = link para a mesma página com `#fragment`; só o subitem exato fica ativo; fillete ciano de 3 px à esquerda do item ativo; fundo do grupo aberto `rgba(0,0,0,.18)`; scroll fino (`ngx-scrollbar`) |
| Header fixo (sticky) | botão de alternar o menu (`cilMenu`), data atual por extenso em pt-BR ("terça-feira, 3 de novembro de 2026"; curta `03/11/2026` abaixo de `md`), seletor de tema (dropdown "Tema": Claro / Escuro / Automático com ícones sol, lua, contraste); divisor; linha de breadcrumb ("Início / Triagent") gerada das rotas |
| Corpo | `container-lg`, fundo `--brand-surface-page`, cards com raio 16 px, borda `--brand-border` e sombra suave, padding 1,25 rem |
| Rodapé | faixa navy centrada: logotipo da instituição, "Copyright © {ano} todos os direitos reservados" e, quando configuradas, razão social, CNPJ e endereço das entidades legais (configuração de ambiente) |
| Rotas | hash (`/#/`, `/#/triagent`, `/#/scalation`, `/#/analitico`); `/dashboard` redireciona para `/triagent`; desconhecida volta ao início; títulos no breadcrumb vêm de `data.title` (Início vazio de propósito) |
| Rolagem por seção | ao chegar por `#fragment`, a seção para 16 px abaixo do header fixo e é realinhada por até 2,5 s enquanto os cards acima carregam (`SectionScrollService`); para no primeiro gesto do usuário. Ids: Triagent `segmentos`, `normativos-recebidos`, `normas-aplicaveis`, `assunto-das-normas`, `fluxo-de-email`, `tabela-analitica`; Scalation `segmentos`, `cascata`, `trafego-e-vendas` |
| Responsivo | 375 a 1440 px: sidebar vira overlay; cards 1 coluna no celular, 2 em `sm`, 4 em `xl`; tabelas com rolagem lateral; chat ocupa a tela toda abaixo de 576 px |
| Acessibilidade | `aria-pressed` nos chips e legendas, `role="status"` nas faixas de filtro, `role="log"` + `aria-live` no chat, foco visível ciano/azul, `prefers-reduced-motion` respeitado, `d-print-none` no chrome |

## 1.3 Página Início (`/`)

Quatro cards `c-widget-stat-d` (Atacado, Corporativo, Plataforma, Varejo), na ordem alfabética: cabeçalho na cor da série
do segmento sob uma camada preta de 25 % com ícone (`cilTruck`, `cilBuilding`, `cilDevices`, `cilCart`) e nome;
minigráfico de área branca (tendência, até 12 pontos, rótulos Janeiro…) sem eixos; dois números "normas" (`total`) e "a
classificar" (`toClassify`) formatados `1.234`. Sem clique. Erro de carga: "Não foi possível carregar os segmentos."
Dados: `src/assets/data/dashboard-segments.json` (`asOf`, `segments[]` com `id`, `label`, `icon`, `total`, `toClassify`,
`trend[]`), validação `validateSegmentCards`.

## 1.4 Página Triagent (`/triagent`)

Estado compartilhado em `dashboard.component.ts`: `segmentFilter`, `applicabilityFilter`, `themeFilter` (filtros cruzados),
`trafficPeriod` / `trafficBounds` (período do gráfico 2, herdado pelos blocos 3, 4 e 6), `highlighted`, `trafficView`.
Tecla Esc ou clique fora dos controles de filtro limpa todos os filtros (`[data-segment-filter]`, `[data-page-filter]` e a
sidebar são exceções).

### Bloco 1 — Cards de segmento (`app-widgets-dropdown`)

Card `c-widget-stat-a` com gradiente `135deg` primário → primário-hover (no escuro, camada preta de 16–30 % por cima),
brilho ciano no canto, ícone + nome, valor `total` (Inter 600 1,75 rem), selo "N a classificar" (pílula translúcida;
botão quando `filterable`) e minigráfico de linha branca com pontos (eixo y ajustado ao intervalo com folga 30 %/15 %).
Clique no selo aplica o filtro da página (card marcado com anel ciano, os outros a 50 % de opacidade) e marca a série
"Normas a Classificar" como destaque; clique de novo remove. Faixa `.segment-filter-notice` (fundo primário-low, ícone
filtro): "Filtro: **normas a classificar · Atacado**. Aplicado aos cards, aos gráficos Normativos Recebidos, Normas
Aplicáveis e Assunto das Normas Aplicáveis, ao Fluxo de e-mail - Triagem e à Tabela Analítica. Clique fora ou pressione
Esc para remover." + botão "Remover filtro".

### Bloco 2 — Normativos Recebidos (`dashboard.component.*`, `dashboard-charts-data.ts`)

- Cabeçalho: título, subtítulo do período ("Janeiro a dezembro de 2021"), chips "Gráfico" / "Tabela" (ícones linha /
  lista); "Exportar Excel" (primário) só na visão Tabela; "Gerando arquivo..." enquanto exporta; erro "Não foi possível
  gerar o arquivo Excel.".
- Filtro de período (`app-period-filter`): segmentado Dia / Mês / Ano; "Últimos" + chips por granularidade (7, 15, 30
  dias; 3, 6, 12 meses; 3, 5 anos; padrão 7 / 12 / 5); chip "Personalizado" (ícone calendário) abre formulário De / Até
  (`input type=date`), Aplicar / Cancelar; validação: "Informe as duas datas.", "A data inicial deve ser anterior ou igual
  à data final.", limites 92 dias / 60 meses / 30 anos com mensagens próprias; ao trocar a granularidade, um intervalo
  personalizado que ainda cabe é mantido, senão volta ao preset com o aviso "O intervalo personalizado não cabe nesta
  visão; mostrando os últimos 12 meses.". Fim fixo do mock: 31/12/2021 (`PERIOD_END`).
- Rótulos: Dia "Seg 25/12", Mês "Janeiro" (ou "Jan/21" se cruzar ano), Ano "2021"; subtítulos "25 a 31 de dezembro de
  2021", "Outubro a dezembro de 2021", "2017 a 2021" (regras em `period-range.ts`).
- Gráfico (Chart.js `line`, 300 px): 4 linhas de segmento + "Normas a Classificar" tracejada (`[8,5]`); curva `tension
  .4`; pontos 3 px com anel de 2 px na cor do card; valor escrito acima de cada ponto (Inter 600 11 px, halo, empilhado
  quando coincide, pulando pontos quando o espaço é menor que 30 px); eixo y oculto de 0 a 250 com 5 linhas de grade;
  eixo x sem grade; legenda nativa oculta; tooltip com a cor da série. Dados hoje **aleatórios** por faixa
  (Atacado 160–240, Corporativo 100–160, Plataforma 55–105, Varejo 120–200, a classificar 3–12 por segmento); contrato
  proposto `TrafficResponse` (`contratos-de-dados.md` §4).
- Destaque: clique num item da legenda deixa só aquela série viva (as outras a 20 % de alfa, sem pontos nem rótulos;
  a tracejada continua quando o destaque é um segmento) com área preenchida a 10 % e linha de 3 px; a tracejada passa a
  mostrar só o segmento destacado ou filtrado ("Normas a Classificar · Atacado").
- Legenda (rodapé do card, 5 colunas): chave da cor (linha, tracejada para a referência), nome, "2.418 normas (33%)",
  barra fina de participação; itens são botões (`aria-pressed`), ativo com fundo primário-low, demais a 45 %.
- Visão Tabela: `thead` por série com a chave de cor, uma linha por período, `tfoot` "Total"; colunas destacadas
  seguem o destaque. Excel: planilha "Normativos Recebidos", título "Normativos recebidos por segmento", subtítulo
  período + filtro, colunas Período + séries (`#,##0`), linha Total; arquivo
  `normativos-recebidos-<início>-a-<fim>[-a-classificar-<segmento>].xlsx`.

### Blocos 3 e 4 — Classificação (`classification/`)

Mesma fonte (`dashboard-classificacao.json`, 573 normas: `code`, `orgao`, `tipo`, `numero`, `classifiedAt`, `segment`,
`theme`, `applicable`, `area`, `diretoria`), filtrada pelo período do bloco 2 e pelo segmento da página.

- **Normas Aplicáveis** (col. 5/12): rosca Chart.js (`cutout 62%`, 220 px, borda de 2 px na cor do card) aplicáveis
  (navy) × não aplicáveis (cinza); total no centro ("573" + "classificadas"); legenda com dois botões (chave quadrada,
  rótulo, "368 **64%**"); clique na fatia ou no botão filtra a lista de temas por aquela classe (fatia puxada 10 px, a
  outra a 16 %); segundo clique remove. Subtítulo acrescenta "· Atacado" e "· Tema: …".
- **Assunto das Normas Aplicáveis** (col. 7/12; vira "Não Aplicáveis" quando a fatia não aplicável está escolhida):
  até 10 temas em barras HTML (rótulo | trilha | "53 **14%**"), ordenados por contagem e nome; cauda somada em "Outros
  temas (10 temas)" sem barra (não agrupa quando sobraria só 1); clique numa linha filtra a rosca por aquele tema
  (linha ativa com fundo primário-low; demais a 45 %). Faixa de filtro: "Filtro: **Não aplicáveis · Tema: Pix**.
  Aplicado aos gráficos Normas Aplicáveis e Assunto das Normas Aplicáveis e à Tabela Analítica.".
- Estados: "Carregando dados..." com spinner, "Não foi possível carregar a classificação das normas.", "Nenhuma norma
  classificada neste período.", "Nenhuma norma aplicável neste período.".

### Bloco 5 — Fluxo de e-mail - Triagem (`emails/`)

Fonte `dashboard-emails.json` (176 e-mails: `id`, `sentAt` ISO com fuso, `subject`, `segment`, `recipients`, `normas[]`
com `code`, `orgao`, `tipo`, `numero`, `title`, `suggestedClass` em {Aplicável, Aplicável parcialmente, Não aplicável},
`area`, `diretoria`). Período **próprio** (só Dia e Mês), segue o filtro de segmento da página.

- Indicadores `dl`: "E-MAILS ENVIADOS" (176), "NORMAS SUGERIDAS" (812, "533 distintas"), "MÉDIA POR E-MAIL" (4,6).
- Barras empilhadas por segmento (cores das séries, `barPercentage .7`, raio 4 px só no topo da pilha, total escrito
  acima quando cabe, tooltip com e-mails e total do intervalo); legenda com botões "Atacado · 198 normas" (destaque
  escurece os demais a 28 %); visão Tabela (Período, E-mails, uma coluna por segmento, Total de normas, rodapé Total) e
  Excel "Fluxo de e-mail - Triagem" (`fluxo-email-triagem-<início>-a-<fim>[-<segmento>].xlsx`).
- "Últimos e-mails": 5 mais recentes, cada um um botão (chevron, data `dd/mm/aaaa`, chave de cor + segmento,
  "N normas") que expande a tabela das normas (Órgão fixo à esquerda, Tipo, Número, Tema, "Aplicável ao segmento?" =
  Sim / Parcialmente / Não, Área, Diretoria; rola de lado).

### Bloco 6 — Tabela Analítica (`analytic-table/`)

Todas as normas do período com todos os filtros da página; subtítulo "Janeiro a dezembro de 2021 · 573 normas"; linha
"Filtros aplicados:" com pílulas ("Segmento: Varejo", "Não aplicáveis", "Tema: Pix") ou "Sem filtros: todas as normas
classificadas no período do gráfico Normativos Recebidos."; "Exportar Excel" (contorno). Colunas: Data da classificação
(`dd/mm/aaaa`), Órgão, Tipo, Número, Tema, Segmento, "Aplicável ao banco?" (Sim / Não), Área, Diretoria + coluna do
agente (botão balão "Perguntar ao Agente da Agenda sobre Resolução CMN nº 4.855", que abre o chat com "Quais são os
pontos principais da …?"). Cabeçalhos clicáveis (seta só na coluna ordenada; data por ISO, número pelo valor "4.855" =
4855, texto por collation pt-BR; desempate pela data mais nova e pelo código); 15 linhas por página; "1–15 de 573",
"Página 1 de 39", Anterior / Próxima. Excel "Tabela Analítica" com subtítulo de contagem e filtros; arquivo
`tabela-analitica-<início>-a-<fim>[-<segmento>][-aplicaveis|-nao-aplicaveis][-tema-<slug>].xlsx`.

## 1.5 Página Scalation (`/scalation`)

- Cards de segmento em tom petróleo (`#0a5c71` → navy), sem botão (selo é texto).
- **Cascata do resultado** (`waterfall/`): fonte `dashboard-waterfall.json` (`period`, `baseYear`, `currency` BRL,
  `unitScale` 1 000 000, `steps[]` com `id`, `label`, `kind` total/decrease, `parts[]` 1–3 com `label`, `value`);
  `deriveWaterfall` escala a base anual para qualquer período de forma determinística (temporário, até o BFF). Chips
  `R$` / `% da receita` e Gráfico / Tabela; mesmo filtro de período; linha "Resultado **R$ 10 mi** (20% da receita
  bruta)" e legenda (Total, Redução, "Saldo entre etapas"). Gráfico: barras flutuantes `[low, high]` por parte, rampas
  ordinais (total azul, redução vermelha), 2 px de separação, raio 4 px nas pontas, conectores de 1 px entre os saldos,
  valor + nome dentro da barra quando cabe (tinta branca ou preta por contraste), tooltip "−R$ 15 mi / Impostos ·
  Deduções / 30% da receita bruta / Saldo após Deduções: R$ 35 mi". Formatação compacta `Intl` ("R$ 15 mi", "R$ 1,5 mi",
  sinal "−" tipográfico). Tabela: Etapa (rowspan), Componente, Valor, % da receita bruta, Saldo após a etapa.
- **Tráfego e vendas**: card de demonstração do template (valores literais, barras de progresso, ícones sociais). Não é
  produto; a ficha manda não portar.

## 1.6 Página Analítico (`/analitico`)

Só o `<h1>` oculto "Analítico". Existe para a rota e o menu.

## 1.7 Agente da Agenda (chat flutuante, `src/app/chat/`)

- **Botão** fixo (canto inferior direito, 3,25 rem, cor de acento, formato de balão, ícone + "Agente da **Agenda**",
  ponto verde quando há conversa minimizada). **Painel** fixo 380 × até 600 px (ou "expandido" 736 px), raio 24 px,
  cabeçalho azul com título, "Recomeçar", expandir, minimizar; Esc minimiza; abaixo de 576 px ocupa a tela.
- **Sessão** (`ChatSessionService`): `POST /conforme/chat/sessao` ao abrir; saudação local "Bom dia / Boa tarde / Boa
  noite[, Nome]!" (5–11 h, 12–17 h, 18–4 h) colada à primeira mensagem; id só em memória; `requestId` único por pedido
  (repetição devolve a mesma resposta); "Parar" cancela (`POST /cancelar`) ou interrompe o efeito de digitação (25 ms
  por lote de palavras, máx. 80 passos); "Tentar novamente" repete; expiração → "A conversa expirou por inatividade. Vamos
  recomeçar." e nova sessão; despedida digitada ("tchau", "obrigado, era só isso") encerra; "Encerrar" apaga a sessão no
  servidor, mostra a despedida e deixa só "Recomeçar".
- **Fluxo** (mock `chat-fluxo-mock.json`, mesmas regras do BFF): nós `inicio` (menu: Consultar uma norma, Avaliar um
  documento, Normas a Classificar, Listar normas não aderentes, Listar próximas normas que irão entrar em vigor),
  `consultar_tema` (texto, 1000 caracteres, placeholder "Digite sua pergunta"), `enviar_arquivo` (upload: .pdf .doc
  .docx .png .jpg .jpeg .webp, 20 MB por conversa, 5 por envio, colar print com Ctrl+V), `pergunta_sobre_arquivo`,
  `fim` ("Posso ajudar em mais alguma coisa?" → Nova consulta), três listas de normas filtráveis por segmento ("Todos" +
  segmentos), com visão lista/tabela e "Extrair em Excel". Respostas por palavra-chave: `answer` com fontes
  (citações "Art. 5º…" + `sourceId`), `need_more_info` com perguntas e respostas prontas (chips), `not_in_data`,
  `out_of_scope` (3 vezes → contatos "Fale com a equipe responsável"), 3 rodadas de esclarecimento → contatos.
- **Mensagens**: balões (agente cinza à esquerda com avatar, usuário azul à direita, sistema centrado), borda esquerda
  por status (verde resposta, ciano esclarecimento, laranja aviso, vermelho erro), markdown seguro (p, br, strong, em,
  code, listas, links http/https; tudo escapado), blocos "Fontes", "Para continuar, preciso saber:", "Fale com a equipe
  responsável", lista de normas, "Resultado da avaliação dos documentos" (tabela + Excel), anexos com "Documento aceito /
  não aceito"; feedback "Esta resposta ajudou?" Útil / Não útil → `POST /feedback` (só nota e `sourceIds`); botão "Ir
  para o fim"; sugestões (opções do nó, respostas prontas, Voltar, Encerrar, Recomeçar).
- **Textos e erros** fixos em `chat-texts.ts` (7 códigos de erro com frase pt-BR). HTML do BFF nunca é interpretado.

## 1.8 Dados, API e ambiente

| Item | Situação |
|---|---|
| Dados | mock em `src/assets/data/` até o contrato do BFF Atlante (R4): segmentos, classificação (573), e-mails (176), cascata (base anual), fluxo do chat. Endpoints propostos: `GET /conforme/triagent/segmentos`, `/trafego`, `/cascata`, `/emails-sugestao`, `/classificacoes`; chat `POST /conforme/chat/{sessao,mensagem,arquivo,cancelar,feedback}` e `DELETE /sessao/{id}` |
| Formatação | `Intl` pt-BR: `1.234`, `40,9%`, `R$ 1.999,50`, `dd/mm/aaaa`, meses e dias por extenso |
| Exportação | `exceljs` no navegador (ADR-017): título negrito 14, subtítulo itálico cinza, cabeçalho branco sobre `#223AD2`, painel congelado, totais em negrito com borda superior, larguras por coluna, `numFmt`, autofiltro |
| Autenticação | nenhuma no front; sessão do BFF Atlante (R5); nome do usuário só para a saudação |
| Build e hospedagem | `ng build` estático servido pelo Apache, rotas por hash (sem rewrite), `/api` → `API_URL` da infra; dev com `proxy.conf.json` |
| Registry | Nexus corporativo; versões exatas; nada de CDN (R2). Fonte local, ícones locais |
| Testes e regras | 416 testes Karma/Jasmine; `npm run verify` (docs:check, rules:check, build, testes); as quinze regras de `.rules/projeto.md`; ficha por página (R15) |
| Tamanho | código do produto ≈ 6 900 linhas TS + 72 kB de templates + 450 kB de SCSS/JSON; bundle inicial ≈ 1,5 MB |
