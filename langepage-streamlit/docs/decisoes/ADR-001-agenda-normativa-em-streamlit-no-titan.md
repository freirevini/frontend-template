# ADR-001 — Agenda Normativa reconstruída em Streamlit no GKE/Titan; repositório do Cookiecutter; landing congelada

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** D9, D10

## Contexto

A Agenda Normativa existe em Angular 20.3 / CoreUI 5.5 (`../langepage-angular/landing-analitica/`). A arquitetura corporativa
respondeu (2026-11-04) que produtos com IA generativa (o Agente da Agenda) rodam no GKE corporativo / Plataforma Titan,
padrão N3 "Streamlit e Titan Frontend Sample"; Databricks Apps é vedado para eles (HML-1143). O plano de reconstrução
em Streamlit, com fases F0–F10 e matriz de equiparação, foi aprovado.

## Decisão

- Reconstruir 100 % do que existe na landing em Streamlit, no padrão Titan (`docs/planejamento/plano-implementacao.md`).
- **D9:** o repositório definitivo nasce do Cookiecutter do Titan (`streamlit-sgen-base-ia-sample`, Bitbucket
  corporativo). `langepage-streamlit/` é o espelho de desenvolvimento, com git próprio, até lá; `Dockerfile` e `k8s/`
  daqui são placeholders a substituir pela saída do Cookiecutter (`docs/portabilidade.md` §2).
- **D10:** a landing Angular fica congelada (só correções) e recebe na F10 um ADR próprio registrando a reconstrução.
  Ela é referência de comportamento e visual (R14), nunca dependência.

## Consequências

- Código e docs são escritos para sobreviver à troca de repositório: nada depende de caminho absoluto ou do layout do
  espelho além de `src/`, `data/`, `settings.yaml`, `.streamlit/`.
- Dois produtos vivos durante a transição; o congelamento evita divergência.
