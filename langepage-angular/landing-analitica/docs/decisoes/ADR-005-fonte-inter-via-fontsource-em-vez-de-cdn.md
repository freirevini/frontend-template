# ADR-005: Fonte Inter via `@fontsource/inter`, em vez de CDN

Data: 2026-10-28
Situação: aceita

## Contexto

A fonte base do design system da marca é Inter. A fonte de títulos da marca é proprietária e não pode ser distribuída com o painel. Carregar Inter do Google Fonts ou de outro CDN é proibido (R2: nada de URL/CDN) e, no ambiente corporativo, o navegador do usuário pode não ter saída para a internet. O build precisa ser autossuficiente e passar por um registry Nexus.

## Decisão

1. Adicionar `@fontsource/inter` 5.3.0 em `dependencies` (versão exata) e registrar em `angular.json`, nos arrays `styles` de `build` e `test`, os arquivos `node_modules/@fontsource/inter/latin-{400,500,600,700}.css` e `latin-ext-{400,500,600,700}.css` (quatro pesos, subconjuntos latin e latin-ext para os acentos do pt-BR), antes de `src/scss/styles.scss`. O Angular CLI copia os `.woff2` para o `dist/` com hash.
2. `$brand-font-family` em `src/scss/_brand.scss` começa em `"Inter"` e cai para `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`; é propagada a `$font-family-sans-serif` do CoreUI, a `--brand-font-family` e a `--app-chart-font-family` (Chart.js).
3. A fonte de títulos da marca não é incluída; títulos usam Inter 600 (`_typography.scss`).
4. Fallback se o pacote não existir no Nexus: remover as oito linhas de `angular.json` e `"Inter",` de `$brand-font-family`. Nada mais muda; o `logo.svg` já declara a mesma pilha com fallback.

## Consequências

- Nenhuma requisição externa em tempo de execução; a fonte entra no artefato (`dist/`) e é servida pelo mesmo Apache.
- Peso adicional no `dist/`: oito arquivos CSS pequenos e os `.woff2` correspondentes (carregados sob demanda por `unicode-range`).
- O pacote precisa estar espelhado no Nexus; é a única dependência do projeto que não vem do template nem é de exportação de relatórios. A verificação ainda não foi feita (registrado em `docs/dependencias-e-ambiente.md`).
- Trocar de fonte no futuro é uma mudança em `angular.json` e em `_brand.scss` (e no carimbo `tokens-hash`).
