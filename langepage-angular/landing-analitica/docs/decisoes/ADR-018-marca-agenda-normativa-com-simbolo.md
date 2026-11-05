# ADR-018 — Marca "Agenda Normativa" com o símbolo da instituição

**Data:** 2026-10-28

## Contexto

O painel acompanha normativos da instituição. A marca provisória era "Painel Analítico" com um desenho próprio, e a R10 vetava o logo
da instituição por cautela com direito de uso. O usuário pediu o nome "Agenda Normativa" e o logo da instituição.

## Decisão

- Nome do produto: "Agenda Normativa"; na sidebar, "Agenda" em peso regular e "Normativa" em negrito (Inter).
- Símbolo: o oficial da instituição, copiado do SVG público do site institucional, sem alterar o desenho. O `viewBox` foi
  recortado ao desenho para o símbolo ficar na altura do nome. Branco na sidebar navy; azul `#002bab` para fundos claros; favicon
  com o símbolo branco sobre tile azul.
- A marca é montada em HTML (`<c-sidebar-brand>` com conteúdo), e não como imagem com texto, para usar a fonte Inter da página e
  manter o texto acessível. A sidebar não tem modo estreito (botão de recolher removido em 2026-10-28), então símbolo e nome aparecem sempre juntos.
- R10 atualizada; a fonte de títulos da marca continua fora por ser proprietária.

## Consequências

- Logos antigos `logo.svg` e `logo-narrow.svg` removidos.
- No ambiente corporativo, confirmar se há arquivo oficial do símbolo a usar; trocar só os SVGs.
