# ADR-002: Dados mock em `src/assets/data` até o contrato do BFF

Data: 2026-10-27
Situação: aceita (temporária por natureza)

## Contexto

As telas de gráficos foram construídas antes de existir o contrato OpenAPI do BFF. A regra R4 proíbe inventar endpoints: toda chamada deve passar por um serviço base que monta `apiBase` (configuração de execução `assets/env.json`) + caminho relativo, com rotas de negócio sob `/conforme/...` e payloads conforme o OpenAPI. Sem o contrato, qualquer URL seria chute e precisaria ser refeita.

## Decisão

1. Dados de gráficos sem contrato vêm de arquivos JSON estáticos em `src/assets/data/`. Hoje: `src/assets/data/dashboard-waterfall.json` (base anual 2021 da Cascata, com `baseYear`, `currency`, `unitScale` e `steps`).
2. O acesso fica isolado em um serviço por conjunto de dados (`src/app/views/dashboard/waterfall/waterfall-data.service.ts`), que lê o asset com `HttpClient` (`assets/data/dashboard-waterfall.json`) e `shareReplay({ bufferSize: 1, refCount: false })` (uma requisição por sessão; erro não é cacheado). O componente consome só o `Observable` tipado (`WaterfallData`).
3. Os dados do Tráfego, por serem séries temporais aleatórias de demonstração, são gerados em memória em `DashboardChartsData` (`random()` dentro das faixas de `TRAFFIC_SERIES`), sem arquivo.
4. Quando o contrato existir: trocar a URL do asset pela chamada ao serviço base da API (`apiBase` da configuração de execução `assets/env.json` + rota `/conforme/...`), manter a interface TypeScript (`WaterfallData`, `TrafficSeries`) ou adaptá-la com um `map`, e remover a derivação local (ADR-006) se o BFF passar a entregar o período já calculado. O ponto de troca está documentado em `docs/contratos-de-dados.md`.
5. Nenhum mock contém host, URL de backend ou dado real.

## Consequências

- O front pode ser desenvolvido e revisado visualmente sem BFF; `npm start` funciona sem proxy ativo.
- Os assets são copiados para `dist/landing-analitica/assets/data/` pelo `assets` de `angular.json`; em produção eles continuam acessíveis até serem removidos. Ao ligar a API, retirar os JSON do repositório.
- `npm run docs:check` exige que todo arquivo de `src/assets/data/` esteja descrito em `docs/contratos-de-dados.md`, para que o contrato esperado fique documentado antes de existir no BFF.
- A derivação determinística da Cascata por período (ADR-006) é um artifício do mock; o BFF é quem deve filtrar por período.
