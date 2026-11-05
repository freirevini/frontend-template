# ADR-017 — Exportação Excel com exceljs sob demanda

**Data:** 2026-10-28 · **Situação:** revista em ADR-023 (D5)

## Contexto

A regra R9 pede XLSX e CSV com `exceljs` e PDF com `jspdf`, gerados no navegador. O card Tráfego ganhou a visão Tabela com
"Exportar Excel". O `exceljs` pesa ~924 kB minificado, é CommonJS e suas tipagens dependem de tipos do Node (`stream`,
`events`), que o app de navegador não carrega.

## Decisão

- Utilitário genérico `src/app/core/export/xlsx-export.ts`: `XlsxTable` (aba, título, subtítulo, colunas, linhas, totais, nome do
  arquivo) → planilha com cabeçalho na cor `--brand-primary`, linha congelada, filtro automático e totais em negrito → download por
  `Blob`.
- `exceljs` carregado só no clique: `import('exceljs/dist/exceljs.min.js')` (build de navegador), em chunk próprio fora do bundle
  inicial.
- Sem as tipagens do pacote: módulo declarado em `src/declarations.d.ts` e tipagem local mínima do que é usado; nada de abrir
  tipos do Node para todo o app nem `skipLibCheck`.
- `exceljs/dist/exceljs.min.js` em `allowedCommonJsDependencies`.

## Consequências

- Bundle inicial inalterado; primeira exportação baixa o chunk (~213 kB transferidos).
- Nova tabela exportável: montar um `XlsxTable` e chamar `downloadXlsx`.
- Atualizar a tipagem local se novos recursos do `exceljs` forem usados.
- CSV e PDF continuam pendentes (R9).

> Atualização (2026-10-28): o cabeçalho e os textos secundários da planilha passaram a usar os tokens `--app-export-accent` e
> `--app-export-muted` (`_brand.scss`), que não são redefinidos no tema escuro. Antes o utilitário lia `--brand-primary` e
> `--brand-content-low` do tema ativo e, no escuro, gerava cabeçalho `#6b7cf0` e subtítulo `#a9b1bd` (pouco contraste na planilha
> branca). Teste de regressão em `xlsx-export.spec.ts`.

> Revisão (2026-11-04, ADR-023, D5): com a paginação obrigatória, o front não tem mais todas as linhas na memória. Para
> exportar, percorre as páginas do BFF (`size=100`) até 5.000 linhas e monta a planilha com o mesmo utilitário; acima
> de 5.000, não exporta parcial e pede para refinar os filtros. Endpoint de exportação no BFF só se o volume real passar
> do teto (ADR novo). `xlsx-export.ts`, `exceljs` sob demanda e a tipagem local continuam.
