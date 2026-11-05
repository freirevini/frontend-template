# ADR-019 — Card "E-mails de sugestão de classificação" no lugar de "Usuários"

**Data:** 2026-10-28

## Contexto

A tabela "Usuários" do Triagent era sobra do template (avatares, países, forma de pagamento). O produto precisa mostrar os e-mails
enviados num período e quantas normas foram enviadas com sugestão de classificação. Plano aprovado em
`docs/planejamento/emails-sugestao-classificacao.md`.

## Decisão

- Novo componente `<app-emails-chart>` (`views/dashboard/emails`), no padrão dos cards Tráfego e Cascata: filtro de período
  compartilhado, Gráfico/Tabela, "Exportar Excel" na tabela.
- Gráfico de **barras empilhadas por segmento** (magnitude por período com composição). E-mails e normas têm escalas diferentes e
  não dividem eixo: normas ficam no gráfico; e-mails vão para o indicador e o tooltip. Cores dos segmentos = `--app-series-1..4`
  (validadas), sem token novo.
- Contagem: o gráfico soma normas **por envio**; o indicador "Normas sugeridas" mostra o mesmo total com a nota "N distintas"
  (norma única por `code`), para o total do indicador bater com o das barras.
- O selo "a classificar" dos cards filtra também este card (um segmento só).
- Dados em mock (`dashboard-emails.json`) com validação (`validateEmails`) e agregação no cliente (`aggregateEmails`) até
  existir o contrato do BFF (R4). "Taxa de aceite" fica fora até o contrato trazer o retorno do analista.
- A lista "Últimos e-mails" (até 5) vive em `src/scss/_emails-card.scss` (global) para respeitar o orçamento de 2kb por componente.

## Consequências

- Removidos `IUser`, a tabela, `AvatarModule` do módulo e `src/assets/img/avatars/`.
- Ícones de bandeiras (`cif*`) e de cartões (`cibCc*`) no subset ficam sem uso (limpar na adaptação).
- Quando o endpoint existir, trocar só o serviço de dados; avaliar mover a agregação para o servidor se o volume crescer.
