# Plano — Card "E-mails de sugestão de classificação" (substitui "Usuários")

> Nome atual do card na tela: **"Fluxo de e-mail - Triagem"** (renomeado em 2026-10-28). Este plano mantém o nome da época.

**Status:** aprovado e implementado em 2026-10-28 (ADR-019); D1: indicador mostra o total por envio e "N distintas" ao lado; ajustes de 2026-10-28 na seção 8 · **Data:** 2026-10-28 · **Página:** Triagent (`/triagent`, `views/dashboard`)

## 1. Objetivo

Trocar o card de demonstração **Usuários** (tabela com avatar, país, forma de pagamento, herança do template) por um card que
mostre **os e-mails enviados num período** e **quantas normas foram enviadas com sugestão de classificação**, no mesmo padrão
visual dos cards Tráfego e Cascata.

## 2. O que o card responde

1. Quantos e-mails saíram no período escolhido?
2. Quantas normas foram enviadas com sugestão de classificação, e em qual segmento?
3. Como isso evoluiu ao longo do tempo (dia/mês/ano)?
4. Quais foram os últimos e-mails e o que cada um levou?

## 3. Proposta de interface

```
┌ E-mails de sugestão de classificação ─────────────── [Dia|Mês|Ano] [Últimos N] [De–Até] ┐
│ 01/01/2021 a 31/12/2021                                           [Gráfico | Tabela]    │
│                                                                                          │
│  E-mails enviados   Normas sugeridas   Média por e-mail   Taxa de aceite*               │
│  128                412                3,2                —                             │
│                                                                                          │
│  ▇ ▆ █ ▅ ▇ ▆ ▇ █ ▆ ▅ ▇ █   barras empilhadas: normas sugeridas por segmento             │
│  jan fev mar ... dez        rótulo no topo só do total da barra                          │
│  ● Atacado ● Corporativo ● Plataforma ● Varejo   (legenda clicável)                      │
│                                                                                          │
│  Últimos e-mails                                                                         │
│  28/12 09:14  Sugestões de classificação — Atacado     3 destinatários   5 normas  ›     │
│  27/12 17:02  Sugestões de classificação — Varejo      2 destinatários   2 normas  ›     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
* só se o contrato trouxer o retorno do classificador (ver decisão D4)
```

### 3.1 Forma do gráfico (por que barras empilhadas)

- Dado é **contagem por período** (magnitude ao longo do tempo) com **composição por segmento**: barras empilhadas por período.
- Duas medidas de escala diferente (e-mails × normas) **não** dividem o mesmo eixo (sem eixo duplo). Normas ficam no gráfico;
  o número de e-mails vai para o **indicador** acima e para o **tooltip** de cada barra (`12 e-mails · 38 normas`).
- Cores dos segmentos reaproveitam `--app-series-1..4` (Atacado, Corporativo, Plataforma, Varejo), já validadas para daltonismo
  nos dois temas: a cor segue o segmento em toda a página. Nenhum token novo de cor.
- Marcas: barras finas, cantos de 4px só no topo da pilha, 2px de separação na cor da superfície entre segmentos, grade
  recessiva, eixo Y oculto como na Cascata (valores no topo da barra, só o total, para não poluir).

### 3.2 Interações (iguais às do restante da página)

| Interação | Comportamento |
|---|---|
| Filtro de período | `<app-period-filter>` compartilhado (Dia/Mês/Ano, "Últimos N", intervalo De/Até). Indicadores, gráfico e lista recalculam juntos. |
| Selo "N a classificar" dos cards de segmento | Filtra o card para o segmento escolhido (pilha vira uma cor só, indicadores e lista do segmento). Mesma faixa de aviso do Tráfego; Esc/clique fora limpa. |
| Legenda | Clique destaca um segmento e esmaece os demais (como no Tráfego). |
| Tooltip | Por barra: período, e-mails enviados, normas por segmento e total. |
| Gráfico \| Tabela | Tabela por período (linhas) × segmentos (colunas) + total; botão "Exportar Excel" só na tabela, via `core/export/xlsx-export.ts` (arquivo `emails-sugestao-<início>-a-<fim>[-<segmento>].xlsx`). |
| Lista "Últimos e-mails" | Até 5 itens do período; expandir mostra as normas do e-mail (código, título, classificação sugerida). Sem link externo enquanto não houver contrato. |
| Vazio | Período sem envios: "Nenhum e-mail enviado neste período." no lugar do gráfico. |

### 3.3 Acessibilidade e temas

Legenda sempre visível; cor nunca sozinha (rótulo + tooltip + tabela); tabela como alternativa ao gráfico; `aria-label` em pt-BR
nos controles; foco visível; tema claro/escuro só com `var(--brand-*)`/`var(--app-*)`; 375px: indicadores em 2×2, filtro empilha.

## 4. Dados (mock, R4)

Sem contrato do BFF ainda: mock em `src/assets/data/dashboard-emails.json`, mesmo `asOf` dos demais (`2021-12-31`).

```json
{
  "asOf": "2021-12-31",
  "emails": [
    {
      "id": "em-2021-12-28-001",
      "sentAt": "2021-12-28T09:14:00-03:00",
      "subject": "Sugestões de classificação — Atacado",
      "segment": "atacado",
      "recipients": 3,
      "normas": [
        { "code": "Resolução CMN 5.123", "title": "…", "suggestedClass": "Aplicável", "segment": "atacado" }
      ]
    }
  ]
}
```

- Interfaces em `views/dashboard/emails/emails.model.ts` (`SuggestionEmail`, `SuggestedNorma`) + `validateEmails()` (rejeita
  segmento desconhecido, data inválida, e-mail sem normas).
- `EmailsDataService` (`HttpClient` lendo o JSON; quando o contrato existir, troca para o serviço base `apiBase` +
  `/conforme/...` sem mudar o componente).
- Agregação pura em `emails-derive.ts`: `aggregateEmails(emails, period, bounds, segment?)` devolve `{ buckets[], totals }` com
  e-mails e normas por segmento por bucket (dia/mês/ano). Testável sem DOM.
- Volume do mock: ~1 ano, 2–6 e-mails/semana, 1–8 normas por e-mail, gerado uma vez e versionado (determinístico).

## 5. Etapas de implementação

| # | Etapa | Arquivos | Pronto quando |
|---|---|---|---|
| E1 | Glossário: termos "E-mail de sugestão", "Normas sugeridas", "Sugestão de classificação", "Média por e-mail", "Últimos e-mails" | `docs/glossario-ptbr.md` | termos aprovados antes de entrar na tela (R12) |
| E2 | Modelo, validação e mock | `emails/emails.model.ts`, `src/assets/data/dashboard-emails.json` | testes de `validateEmails` |
| E3 | Serviço de dados | `emails/emails-data.service.ts` | teste com `HttpClientTestingModule` |
| E4 | Agregação por período/segmento | `emails/emails-derive.ts` | testes: buckets dia/mês/ano, intervalo personalizado, filtro de segmento, período vazio |
| E5 | Componente `<app-emails-chart>` (indicadores, gráfico, legenda, tooltip, Gráfico/Tabela, lista) | `emails/emails-chart.component.{ts,html,scss}` | testes de componente; tema claro/escuro |
| E6 | Integração na página: remove card "Usuários", `IUser`, `users`; recebe `segmentFilter` do dashboard | `dashboard.component.{ts,html}`, `dashboard.module.ts` | página sem resto de demo "Usuários" |
| E7 | Exportação Excel da tabela | reaproveita `core/export/xlsx-export.ts` | teste interceptando o download |
| E8 | Limpeza: avatares `assets/img/avatars/*` se nada mais usar | `src/assets/img/avatars/` | `grep` sem referências |
| E9 | Documentação (R13) | `arquitetura.md`, `contratos-de-dados.md`, `design-system.md` (se houver estilo novo), `changelog.md`, `inventario.md`, ADR-019 | `npm run docs:check` ok |
| E10 | Verificação | — | `npm test`, `ng build --configuration production`, 0 hosts proibidos no `dist/`, conferência visual 375/1440px nos dois temas |

Sem dependência nova (Chart.js + `@coreui/angular-chartjs` e `exceljs` já existem; construído antes da migração para Angular 20, com Chart.js 3.9). Respeita R1, R2 e R3.

## 6. Decisões para aprovação

| # | Pergunta | Proposta |
|---|---|---|
| D1 | Contar normas **por envio** (mesma norma em 2 e-mails conta 2) ou **distintas** no período? | Por envio no gráfico; indicador "Normas sugeridas" mostra distintas, com nota no tooltip. |
| D2 | Quebra do gráfico por **segmento** ou por **classificação sugerida** (Aplicável / Não aplicável / …)? | Segmento: conversa com os cards e o filtro da página. Classificação fica na lista de cada e-mail. |
| D3 | Lista "Últimos e-mails" no card ou só o gráfico? | Incluir (até 5), substitui a tabela de usuários com conteúdo útil. |
| D4 | Indicador "Taxa de aceite" (sugestões confirmadas pelo analista)? | Fora desta entrega; entra quando o contrato trouxer o status. |
| D5 | Título do card | "E-mails de sugestão de classificação". |

## 7. Riscos

- Contrato real do BFF pode ter outro formato: isolado no serviço + `validateEmails`; componente não muda.
- Período do mock termina em 2021 (`PERIOD_END`), como o resto da página; pendência já conhecida.
- Números do mock não batem com a linha "Normas a Classificar" do Tráfego (também mock); documentar.

## 8. Ajustes pedidos depois da entrega (2026-10-28)

- Filtro de período só com Dia e Mês (sem Ano): `@Input() periods` em `<app-period-filter>`.
- Legenda abaixo do gráfico (e da tabela), centralizada.
- "Últimos e-mails": só a data (sem hora), o segmento (sem "Sugestões de classificação —") e o número de normas (sem destinatários).
- Normas de um e-mail aberto: colunas Órgão, Tipo, Número, Tema, Aplicável ao segmento?, Área e Diretoria, em tabela com rolagem
  lateral e coluna Órgão fixa. Campos novos no mock: `orgao`, `tipo`, `numero`, `area`, `diretoria` (contagens inalteradas).
