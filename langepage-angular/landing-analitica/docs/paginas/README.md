# Fichas por página (R15)

Uma ficha por página roteada, para portar **uma página só** para outro projeto com o de-para de dados alinhado e sem
inconsistência entre o que a tela consome e o que a origem entrega. A ficha diz o que a página puxa de dados, campo a
campo, o que ela calcula sozinha, e o que copiar para ela funcionar fora deste repositório.

| Ficha | Rota | Pasta | Dados |
|---|---|---|---|
| [`inicio.md`](inicio.md) | `/` | `src/app/views/home` | cards de segmento (visão geral) |
| [`triagent.md`](triagent.md) | `/triagent` | `src/app/views/dashboard` | segmentos, normativos recebidos, classificação, e-mails, tabela analítica |
| [`scalation.md`](scalation.md) | `/scalation` | `src/app/views/scalation` | segmentos, cascata do resultado |
| [`analitico.md`](analitico.md) | `/analitico` | `src/app/views/analytics` | nenhum (página vazia) |

## Como usar

- **Portar uma página:** ler a ficha, copiar a lista da seção 6, preencher a coluna "Coluna em produção" nas seções de
  `docs/mapeamento-de-dados.md` que a seção 5 indica, ligar por adaptador (receita em `mapeamento-de-dados.md` §2) e
  rodar a verificação da seção 7.
- **Alterar uma página:** bloco, campo, filtro, exportação ou dependência nova atualiza a ficha na mesma entrega (R13).
  Se uma interface de dados mudou, `npm run docs:check` pede o carimbo novo.
- **Página nova:** copiar o modelo abaixo para `docs/paginas/<slug>.md` (`slug` = caminho da rota; raiz = `inicio`),
  acrescentar a linha nesta tabela e, se tiver dados, a seção "Campos por bloco" em `mapeamento-de-dados.md`.

## O que o `docs:check` cobra (verificação 14)

Para cada rota com `loadChildren` em `src/app/app.routes.ts`:

1. `docs/paginas/<slug>.md` existe e está nesta tabela.
2. Tem as sete seções: Identidade, Blocos, Dados consumidos, Calculado no front, De-para, O que copiar, Verificação.
3. Cita todo arquivo de dados que a página alcança por `import` (`*.model.ts`, `*-data.service.ts`,
   `segment-cards.service.ts`, `dashboard-charts-data.ts`) e todo mock `assets/data/*.json` referenciado por eles.
4. Descreve cada campo das interfaces exportadas desses arquivos como `Interface.campo` (consumido ou calculado).
5. Aponta para `docs/mapeamento-de-dados.md` quando há dados.
6. Carimbo `<!-- page-data-hash: ... -->` = SHA-1 (12 caracteres) das declarações exportadas desses arquivos. Mudou
   interface, o check mostra o carimbo novo; colar só depois de revisar a ficha.

## Modelo

```markdown
# Página <Nome> (`/<rota>`)

<!-- page-data-hash: 000000000000 -->

Uma frase: o que a página mostra e para quem.

## 1. Identidade
| Item | Valor |
|---|---|
| Rota | `/<rota>` (caminho limpo; âncora de seção como `/<rota>#<secao>`) |
| Rotas / componente | `src/app/views/<pasta>/routes.ts` / `<x>.component.ts` (standalone) |
| Título (breadcrumb) | `data.title` em `views/<pasta>/routes.ts` |
| Menu | item em `src/app/containers/default-layout/_nav.ts`; subitens por seção |
| Seções (`id`) | `#...` |

## 2. Blocos (ordem da tela)
| # | Bloco | Componente | Entradas / saídas | O que o usuário faz |

## 3. Dados consumidos
Por bloco: serviço, mock, interface e tabela `Interface.campo` · formato · exemplo · onde aparece · origem.

## 4. Calculado no front
O que não vem de produção; derivações temporárias a remover com dados reais.

## 5. De-para e domínios
Seções de `docs/mapeamento-de-dados.md` e domínios que valem aqui.

## 6. O que copiar para portar só esta página
Arquivos, módulos CoreUI, estilos globais, ícones, tokens, serviços compartilhados, dependências npm, glossário; o que pode ficar de fora.

## 7. Verificação
Checklist "reflete exatamente".
```
