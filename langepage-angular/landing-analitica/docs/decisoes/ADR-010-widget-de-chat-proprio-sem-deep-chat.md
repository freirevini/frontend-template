# ADR-010: Widget de chat próprio em Angular, sem o pacote `deep-chat`

Data: 2026-10-28
Situação: aceita

## Contexto

O painel terá um botão flutuante que abre um chat com o agente de normas (`docs/planejamento/agente-normas-gemini.md`): opções guiadas vindas do BFF, texto livre em alguns passos e envio de PDF ou print. O web component `deep-chat@2.5.1` (MIT) foi avaliado: compila com TypeScript 4.9.5 e funciona com `CUSTOM_ELEMENTS_SCHEMA`. Porém ele traz `remarkable`, `speech-to-element` e `@microsoft/fetch-event-source`, depende de disponibilidade no Nexus (R2), usa shadow DOM (isola o CSS e dificulta os temas claro/escuro), renderiza `html` sem sanitizar e tem textos padrão em inglês. O ambiente corporativo de destino restringe instalações; copiar o bundle para `assets` contornaria a R2.

## Decisão

1. O widget é um componente Angular 15 próprio em `src/app/chat/` (NgModule, `CommonModule`, `ReactiveFormsModule`, CoreUI 4.x), **sem dependência nova**.
2. Markdown de respostas por um formatador próprio (`safe-markdown.ts`) que escapa HTML antes de converter; nenhum HTML vindo do BFF é renderizado.
3. Estilos em `src/scss/_chat-widget.scss`, só com `var(--brand-*)`, `var(--cui-*)`, `var(--app-*)` (R10, ADR-009).
4. O formato das mensagens e o catálogo de funções `M01`–`M27` seguem `docs/planejamento/chat-widget.md`.
5. Não instalar `deep-chat`, não copiar seu bundle nem seu código-fonte.

## Consequências

- O porte para outro ambiente é copiar `src/app/chat/` com o resto do projeto; nenhuma entrada nova em `package.json`.
- O fluxo guiado (input bloqueado por nó, upload só em certos nós) fica nativo no template.
- Custo: escrever e testar rolagem, acessibilidade, upload e formatador, que o pacote traria pronto.
- Reavaliar apenas se o escopo crescer para voz, streaming complexo ou recursos que o componente próprio não cubra.
