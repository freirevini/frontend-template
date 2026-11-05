# Página Analítico (`/analitico`)

<!-- page-data-hash: da39a3ee5e6b -->

Página reservada: só o título oculto. Conteúdo a definir pelo produto. Existe para o menu e a rota já estarem no lugar.

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/analitico` (caminho limpo) |
| Rotas / componente | `src/app/views/analytics/routes.ts` / `analytics.component.ts` (`app-analytics`, standalone) |
| Título (breadcrumb) | `Analítico` (`views/analytics/routes.ts`) |
| Menu | item "Analítico" (`cil-chart-line`) em `src/app/containers/default-layout/_nav.ts`, sem subitens |
| Seções (`id`) | nenhuma |

## 2. Blocos (ordem da tela)

| # | Bloco | Componente | Entradas / saídas | O que o usuário faz |
|---|---|---|---|---|
| 1 | Título oculto `<h1 class="visually-hidden">Analítico</h1>` | `analytics.component.html` | — | nada |

## 3. Dados consumidos

Nenhum. Nenhum serviço, mock ou interface.

## 4. Calculado no front

Nada.

## 5. De-para e domínios

Não se aplica. Ao receber conteúdo, criar a seção em `docs/mapeamento-de-dados.md` e preencher esta ficha (R15).

## 6. O que copiar para portar só esta página

- `src/app/views/analytics/**` (`routes.ts`, componente, spec).
- Rota lazy `analitico` em `src/app/app.routes.ts` e o item "Analítico" em `_nav.ts` (ícone `cilChartLine` no subset).
- Nada de estilo, token, serviço ou dependência além do layout padrão.

## 7. Verificação

1. `/analitico` aberto direto na barra (e após F5) abre com breadcrumb "Analítico" e item do menu ativo.
2. Leitor de tela anuncia "Analítico" (h1 oculto).
