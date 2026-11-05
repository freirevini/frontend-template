# ADR-004: Paleta da marca com séries de gráficos validadas para daltonismo

Data: 2026-10-28
Situação: aceita

## Contexto

A identidade visual é a da instituição (R10). Os tokens do design system público do site institucional foram transcritos para `src/scss/_brand.scss`. Para séries de gráficos, porém, as cores puras da marca falham em critérios mensuráveis: sobre branco, o ciano `#31c7ed` tem contraste 2,00:1 e luminosidade OKLCH 0,771 (acima da faixa para marcas categóricas) e o verde `#36bf36` tem 2,42:1. O painel precisa funcionar nos dois temas e para leitores com deficiência de visão de cores.

## Decisão

1. As séries categóricas do Tráfego usam variantes da mesma família de matiz que passam na validação: `--app-series-1..4` e `--app-series-reference` em `_brand.scss` (claro: `#223ad2`, `#1099bc`, `#288f28`, `#ae6ae6`, `#dc1832`) e em `_theme-dark.scss` (escuro, para a superfície `#171e28`: `#4d61e0`, `#1099bc`, `#2fae2f`, `#ae6ae6`, `#e8475c`).
2. A Cascata usa rampas ordinais de um matiz por tipo de etapa (`--app-wf-total-1..3`, `--app-wf-decrease-1..3`) e `--app-wf-connector` para a linha de saldo, também com valores por tema.
3. A validação foi feita com o `validate_palette.js` do skill dataviz: pares adjacentes na ordem da legenda, superfícies `#ffffff` (claro) e `#171e28` (escuro), e modo `--ordinal` para as rampas. Critérios: faixa de luminosidade OKLCH (claro 0,43–0,77; escuro 0,48–0,67), croma ≥ 0,10, ΔE OKLab ≥ 8 sob simulação protan/deutan (Machado 2009), ΔE ≥ 15 em visão normal, contraste ≥ 3:1 com a superfície; rampas com L monótona, ΔL ≥ 0,06, extremo claro ≥ 2:1 e matiz único. Resultados e procedimento de repetição em `docs/design-system.md`, seção 4.
4. Codificação secundária além da cor: linha de referência tracejada, rótulos de valor nos pontos (`traffic-value-labels.plugin.ts`), rótulos nas barras e visão em tabela na Cascata, legenda com totais e participação.
5. Regra: não trocar nem reordenar séries ou passos de rampa sem revalidar nos dois temas; nova série entra no fim e é validada. Os fallbacks em TypeScript (`fallbackColor`, `FALLBACK_TOTAL`, `FALLBACK_DECREASE`) repetem os valores claros e mudam junto.

## Consequências

- A identidade da marca é preservada (azul, ciano, verde, roxo, vermelho da marca), com tons ajustados onde a cor pura não é legível.
- Os componentes de gráfico leem as cores em tempo de renderização (`getStyle()`/`getComputedStyle`) em vez de constantes, o que permite o tema escuro sem duplicar lógica.
- Mudanças de paleta têm custo: revalidar e atualizar as tabelas e o carimbo `tokens-hash` de `docs/design-system.md` (`npm run docs:check` bloqueia se o carimbo ficar defasado).
- A separação tritan entre azul e ciano no escuro é baixa (ΔE 3,1; o validador só reporta tritan). O tracejado e os rótulos compensam; se uma série nova aumentar a confusão, trocar o ciano por outro matiz.
