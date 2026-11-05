# ADR-016 — Páginas de demo do template viram base de conhecimento fora do build

**Data:** 2026-10-28 · **Situação:** aceita

## Contexto

O menu tinha, além das páginas do produto, os grupos de demonstração do CoreUI (Tema, Componentes, Extras: cores, tipografia,
base, botões, formulários, gráficos, ícones, notificações, widgets, entrar, cadastro, 404, 500). O usuário pediu para ocultá-los
e guardá-los numa base de conhecimento dentro do projeto, documentada para a LLM consultar ao criar ou alterar páginas, sem se
limitar a ela.

## Decisão (opções escolhidas pelo usuário)

- **Tirar do app** (não só do menu): as pastas foram movidas com `git mv` para `base-de-conhecimento/paginas/`, junto com
  `src/components` (→ `docs-components/`) e `src/scss/_examples.scss` (→ `estilos/`). Saem do menu, das rotas, do build
  e dos testes; o alias `@docs-components/*` e o `@import "examples"` foram removidos.
- **Extras inteiro para a base**, inclusive 404 e 500: endereço desconhecido volta ao Início (`'**' → ''`).
- Ficam no app só os componentes que o produto usa: `views/widgets/widgets-dropdown` (cards de segmento) e `widgets-brand`
  (cards sociais do Início); `WidgetsModule` sem rotas e sem `DocsComponentsModule`.
- `base-de-conhecimento/README.md`: quando consultar, receita de reaproveitamento (sem invólucro de documentação, pt-BR, tokens,
  CoreUI 4.x), catálogo por página (componente, módulo, onde já é usado no produto) e como restaurar uma página.
- Regra **R14** em `CLAUDE.md`/`.cursor/rules/regras-projeto.mdc`; `docs:check` verificação 8 (README da base cita toda pasta de
  `paginas/`; arquitetura cita a base).

## Consequências

- Bundle e testes menores (366 testes, só do produto e infraestrutura). Não é mais possível ver os demos rodando; para isso,
  restaurar a página (seção 4 do README da base).
- Os arquivos da base não compilam no lugar novo (imports relativos antigos): são referência para copiar padrões, não código vivo.
- Ícones `cif*`/`cib*` do subset, usados só pela página de ícones, podem ser podados.

> Atualização (2026-10-28): `widgets-brand` (cards de redes sociais) também saiu do app e foi para
> `base-de-conhecimento/paginas/widgets/widgets-brand/`, onde a página de demo de widgets o importa. O Início passou a usar
> `views/widgets/segment-overview` (visão geral dos segmentos).

## Revisão (2026-11-03, ADR-021)

Com a migração para Angular 20 / CoreUI 5.5, as demos desta base ficam como histórico da versão 4.x (não compilam no app).
Servem para escolher o componente; o código é escrito na API 5.5, e a versão 5.5 de cada demo está no clone da pasta pai
(`../src/app/views/`).
