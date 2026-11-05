# ADR-013 — Classificação das normas: pizza e lista de temas em cards separados, guiados pelo filtro do Tráfego

**Data:** 2026-10-28 · **Situação:** aceita (revisada no mesmo dia, ver "Histórico")

## Contexto

Pedido: abaixo do Tráfego (Triagent), mostrar (1) quantas normas foram classificadas como aplicáveis ou não aplicáveis ao banco e
(2) a distribuição de temas das aplicáveis. Na revisão, o usuário pediu dois gráficos separados, "pizza" e "listagem de temas",
**sem filtros próprios**, guiados pelos filtros do Tráfego.

## Decisão

- Dois componentes em `views/dashboard/classification`, cada um em seu card, lado a lado (empilhados no celular):
  `<app-applicability-chart>` e `<app-themes-list>`. Recebem o período e as datas do Tráfego e o filtro de segmento da página;
  não têm filtro de período nem controles. Estado e assinatura comuns em `ClassificationViewBase`.
- **Aplicáveis × não aplicáveis: pizza em anel (doughnut)** com o total no centro e legenda com quantidade e %. Com só duas fatias a
  pizza é legível; o anel deixa espaço para o total e os números escritos evitam leitura só por ângulo.
- **Temas das aplicáveis: barras horizontais ordenadas** (HTML), 10 temas nomeados + "Outros temas" só em texto (sem barra, para não
  achatar a escala), quantidade e % das aplicáveis ao lado. Pizza com 20 fatias seria ilegível.
- Cores: `--app-applicable` (azul-marinho da marca; claro `#0e1650`, escuro `#a4b0f2`) e `--app-not-applicable` (cinza). O azul
  `--app-series-1` já identifica Atacado na mesma página; verde/vermelho de status foram evitados ("não aplicável" não é ruim).
- Dados em mock (`dashboard-classificacao.json`, 573 normas de 2021, gerado por `scripts/gen-classificacao.js`) com
  `validateClassification` e agregação no cliente (`aggregateClassification`) até o contrato do BFF (R4).

- **Filtro cruzado** (pedido do usuário): clicar numa fatia/legenda da pizza mostra na lista os temas daquela classe; clicar num tema
  faz a pizza contar só aquele tema. Estado na página (`applicabilityFilter`, `themeFilter`), segundo clique remove; Esc ou clique fora
  limpa, como o filtro de segmento. Tráfego, cards de segmento e e-mails não têm tema nem aplicabilidade nos dados: não são filtrados.

## Consequências

- Mudar o período ou o filtro de segmento no Tráfego atualiza os dois cards; destacar uma série na legenda do Tráfego não filtra.
- Sem exportação nestes cards (R9 continua pendente para eles).
- Quando o endpoint existir, trocar só `ClassificationDataService`; a agregação pode ir para o servidor.

## Histórico

- 2026-10-28, primeira versão: um card só, `<app-classification-card>`, com filtro de período próprio (Dia/Mês) e barra 100% no lugar
  da pizza. Substituída pela versão acima a pedido do usuário.
