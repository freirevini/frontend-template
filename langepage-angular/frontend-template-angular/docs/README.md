# Documentação do frontend-template-angular

Template base em Angular 20.3 (CoreUI Free v5.5; antes da migração de 2026-11-03, v4.3 e Angular 15, ADR-004) com tema claro, escuro e automático. Serve de ponto de partida para
novos painéis do padrão corporativo. Esta pasta explica o projeto para pessoas e para IAs (Cursor, Claude) que vão
copiá-lo e adaptá-lo em outro ambiente. Regras para qualquer IA: `AGENTS.md` (entrada) e `.rules/` (texto vinculante; R13 = manutenção desta pasta).
`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/` e `.agents/` só apontam para eles.

| Documento | Conteúdo |
|---|---|
| `portabilidade.md` | Como usar o template num projeto novo ou outro ambiente; pontos de adaptação; checklist |
| `arquitetura.md` | Páginas, rotas, layout, tema, pastas e testes |
| `contratos-de-dados.md` | Situação dos dados (todos de demonstração), `env.json`, convenções do contrato v1 (caminhos, paginação, Problem Details, textos de erro), sessão e como ligar um recurso do BFF |
| `design-system.md` | Tokens do tema escuro, cores de gráficos, regras de cor |
| `dependencias-e-ambiente.md` | Pacotes e versões, Node, `.npmrc`, pacote `e2e/`, `angular.json`, environments, proxy, imagem (`Dockerfile`, `nginx/`), comandos, esteira (`Jenkinsfile`) |
| `changelog.md` | Histórico de entregas |
| `inventario.md` | Gerado por `npm run docs:inventory`: rotas, tokens e dependências |
| `referencia-visual/` | Retrato da identidade visual da landing **Agenda Normativa** (marca, cores, fontes, componentes, gráficos, acessibilidade), com capturas, anexos e receita para aplicá-la em outra landing. Só documentação: nada dali é compilado |
| `decisoes/` | Registros de decisão (ADR); padrões corporativos em ADR-005 |

**Ordem de leitura para IA:** este arquivo → `portabilidade.md` → `arquitetura.md` → `contratos-de-dados.md` →
`design-system.md` → `dependencias-e-ambiente.md` → `decisoes/`.

**Manutenção:** toda mudança de código atualiza o documento correspondente (tabela da R13) e passa em:

```bash
npm run docs:inventory   # regenera docs/inventario.md
npm run docs:check       # falha e lista o que falta documentar
npm run verify           # docs:check + rules:check + build de produção + testes: definição de pronto
```
