# ADR-001 — Angular 15 e CoreUI 4.3 congelados

**Contexto.** O padrão corporativo usa Angular 15.2.x (repositório de referência `ng15-rreg-base-agente-regulatorio`),
Node 18 e registry Nexus. Versões mais novas do CoreUI (4.5+, 5.x) exigem Angular 16+.

**Decisão.** Branch `v4.3` do CoreUI Free (4.3.13); `@angular/*` 15.2.8, CLI 15.2.7, TypeScript 4.9.5, fixados; proibido
`ng update` sem aprovação (R1).

**Consequências.** Recursos Angular 16+ proibidos (R3); exemplos da documentação atual precisam ser reescritos; dependências
novas só se compatíveis com Angular 15/TS 4.9/Node 18 e presentes no Nexus (R2).

**Situação (2026-11-03):** substituída por ADR-004 (migração para Node 22, Angular 20.3, CoreUI 5.5). Mantida como histórico.
