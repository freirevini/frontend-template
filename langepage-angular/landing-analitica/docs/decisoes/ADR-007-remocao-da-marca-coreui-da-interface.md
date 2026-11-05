# ADR-007: Remoção da marca CoreUI da interface

Data: 2026-10-27
Situação: aceita

## Contexto

O projeto parte do CoreUI Free Angular Admin Template v4.3.13 (licença MIT, commit `36966f6`). O template traz logotipo, nome, links, favicon, metadados, `README`, `CHANGELOG`, arquivos `.github/` e nome de pacote do CoreUI. O produto é um painel interno com identidade própria; a regra R8 proíbe marca de terceiros na interface, metadados, favicon e nome do projeto, mas a licença MIT exige manter o aviso de copyright.

## Decisão

1. Nome do projeto: `landing-analitica` em `package.json`, `angular.json` (`projects.landing-analitica`, `outputPath: dist/landing-analitica`), `karma.conf.js` (`coverage/landing-analitica`) e `<title>`/`AppComponent.title` "Painel Analítico".
2. Logos próprios em `src/assets/img/brand/logo.svg` e `logo-narrow.svg` (desenho de barras nas cores da marca, texto "Painel Analítico"), `src/assets/favicon.svg` próprio, `alt` dos logos "Painel Analítico". Ver `docs/design-system.md`, seção 8.
3. Rodapé (`default-footer.component.html`) sem links ou créditos ao CoreUI: "Painel Analítico © {ano}". Header sem links de documentação do template.
4. Removidos: `CHANGELOG.md` do template, a pasta `.github/` (templates de issue, workflows, `FUNDING.yml`, código de conduta), referências a `coreui.io` em metadados. `README.md` reescrito para o projeto.
5. Mantidos: a biblioteca `@coreui/*` (continua em uso, ADR-003), o arquivo `LICENSE` na raiz com o aviso MIT original e a menção genérica "Baseado em um template open source sob licença MIT" no `README.md`.
6. As telas de catálogo do template (Base, Botões, Formulários, Gráficos, Ícones, Notificações, Widgets, Páginas) foram traduzidas (ADR-008) e continuam no menu como referência de componentes, sem a marca. O invólucro `app-docs-example` (`src/components/docs-example/`) ficou só com a aba "Visualizar": a aba "Código" e o link para a documentação em `coreui.io` foram retirados, e `docs-callout` não aponta mais para fora.

## Consequências

- Interface, metadados e artefato sem marca de terceiros; conformidade com a licença preservada pelo `LICENSE`.
- `docs/inventario.md` (gerado por `npm run docs:inventory`) compara o repositório com o commit `36966f6` e lista cada arquivo removido/alterado; serve de prova do que mudou em relação ao template.
- Atualizações futuras do template não podem ser aplicadas por `merge` direto; mudanças relevantes do CoreUI 4.x devem ser portadas manualmente.
- Ícones de marcas de terceiros (`cib*`: Facebook, Twitter, LinkedIn, Google) só aparecem nas telas de exemplo herdadas; não são usados nas páginas de negócio.

> Atualização (2026-10-28): os logos próprios "Painel Analítico" citados acima foram substituídos pela marca "Agenda Normativa" com o símbolo da instituição (ADR-018).
