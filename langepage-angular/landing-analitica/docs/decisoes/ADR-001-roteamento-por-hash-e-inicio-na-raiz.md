# ADR-001: Roteamento por hash e "Início" na raiz

Data: 2026-10-27
Situação: substituída em parte por ADR-023 (hash)

## Contexto

O painel será servido como arquivos estáticos atrás de um Apache corporativo, cuja configuração (`API_URL`, reescrita de URLs) é responsabilidade da infraestrutura, não do front (R6). Com `PathLocationStrategy`, um acesso direto ou um F5 em `/triagent` depende de uma regra de *fallback* para `index.html` no servidor; sem ela, o usuário recebe 404. O template CoreUI já usa `HashLocationStrategy`.

O template também abria o painel (`/dashboard`) como página inicial. O produto tem quatro páginas de negócio (Início, Triagent, Scalation, Analítico; ver `docs/glossario-ptbr.md`), e "Início" precisa ser a entrada, ainda que o seu conteúdo não esteja definido.

## Decisão

1. Manter `HashLocationStrategy` em `src/app/app.module.ts` (`{ provide: LocationStrategy, useClass: HashLocationStrategy }`) e `<base href="./">` em `src/index.html`. As URLs têm a forma `/#/triagent`.
2. Em `src/app/app-routing.module.ts`, a rota filha vazia (`path: ''`, `pathMatch: 'full'`) do `DefaultLayoutComponent` carrega `HomeModule` (`src/app/views/home`), com `data: { title: '' }` para o breadcrumb não repetir "Início" (o título "Início" fica na rota pai).
3. O painel antigo passa a `/triagent` (`DashboardModule`, pasta `views/dashboard` mantida); `/dashboard` redireciona para `/triagent` para não quebrar favoritos.
4. `/scalation` e `/analitico` carregam módulos próprios (`views/scalation`, `views/analytics`). `**` redireciona para `''`.
5. O item "Início" em `src/app/containers/default-layout/_nav.ts` usa `routerLinkActiveOptions: { exact: true }`, senão `/` ficaria ativo em todas as páginas.

## Consequências

- O `dist/` funciona em qualquer caminho do Apache sem regra de reescrita; o único requisito é servir `index.html` e os assets relativos.
- URLs com `#` não são indexáveis e não permitem *deep links* sem o hash; aceitável para um painel interno.
- Trocar para `PathLocationStrategy` no futuro exige combinar com a infraestrutura a regra de *fallback* e mudar o `base href`; nada mais no código depende do hash.
- `HomeComponent` é um placeholder (`<h1 class="visually-hidden">Início</h1>`) até o conteúdo da página ser definido.

## Revisão (2026-11-03, ADR-021)

Com a migração para Angular 20 o hash vem de `withHashLocation()` em `src/app/app.config.ts` (antes `HashLocationStrategy`
no `AppModule`) e as rotas estão em `src/app/app.routes.ts`. Comportamento igual.

## Revisão (2026-11-04, ADR-023)

Substituída na parte do hash. A arquitetura corporativa reprova rotas por hash: o app passa a usar caminho limpo
(`/triagent`) com fallback para `index.html` no Nginx da imagem web (D2, D3 do ADR-023); `withHashLocation()` sai na
Fase 3 do plano de adequação. Continuam valendo "Início" na raiz, `/dashboard` → `/triagent` e `**` → `''`.
