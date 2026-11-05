# ADR-003 — Documentação viva com verificação automática

**Contexto.** O template será copiado para outros ambientes e adaptado por IA sem acesso ao histórico desta conversa.

**Decisão.** Regra R13: `docs/` atualizada a cada entrega; `npm run docs:inventory` gera o inventário a partir do código;
`npm run docs:check` falha quando pastas de tela, dados, dependências ou tokens não estão documentados. Scripts sem
dependências, só Node 18.

**Consequências.** Toda entrega inclui a atualização da documentação; a verificação pode entrar no CI.
