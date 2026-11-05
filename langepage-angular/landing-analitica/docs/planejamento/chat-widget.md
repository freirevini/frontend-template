# Planejamento — Widget de chat flutuante (componente próprio, sem dependência)

> **Status:** planejamento aprovado em 2026-10-28; P0–P8 concluídos em 2026-10-28 (seção 7). Em 2026-11-04 (Fase 6 do plano
> de adequação, `adequacao-padroes-corporativos.md`) o widget passou ao contrato v1 (`/v1/agente/sessoes/...`), ao limite de
> 9 MB por envio e à quarentena com "Verificando o documento..."; estado atual em `arquitetura.md` §11 e
> `contratos-de-dados.md` §9.
> Substitui o plano anterior baseado no pacote `deep-chat` (descartado na mesma data; motivo na seção 2).
> O comportamento do agente (fluxo guiado, Gemini via Vertex AI, gate de arquivos, guarda de tema, loop de
> esclarecimento) está em `agente-normas-gemini.md`; este arquivo trata só do widget no front.
> Pedir a implementação por passos (`P0`…`P8`) e funções de mensagens por código (`M01`…`M37`). Ao concluir
> cada passo, marcar o status na seção 7 e levar o que virou realidade para `arquitetura.md`,
> `contratos-de-dados.md` e `design-system.md` (R13).
> **Nota de 2026-11-03 (migração para Angular 20, ADR-021):** o `ChatModule` deixou de existir; widget, mensagens, entrada e
> pipes são standalone e `ChatWidgetComponent` entra nos `imports` do `DefaultLayoutComponent`. Trechos abaixo que citam
> NgModule, `AppModule` ou `*ngIf` descrevem o plano original, feito antes da migração; o estado atual está em `arquitetura.md` §11.

## 1. Objetivo

Botão flutuante (canto inferior direito, em todas as telas do `default-layout`) que abre um painel de chat
minimalista para conversar com o agente: opções guiadas, texto livre em alguns passos e envio de documento
(PDF ou print). Tudo com o Angular e o CoreUI do projeto (construído em Angular 15 + CoreUI 4.x, antes da migração para Angular 20 + CoreUI 5.5), **sem instalar pacote novo**.

## 2. Decisão: componente próprio em vez do `deep-chat`

O `deep-chat@2.5.1` (MIT) foi avaliado e funcionaria com o TypeScript 4.9.5 de antes da migração, mas foi descartado porque:

| Critério | `deep-chat` | Componente próprio |
|---|---|---|
| Instalação no ambiente corporativo | Depende do Nexus (`deep-chat` + `remarkable`, `speech-to-element`, `@microsoft/fetch-event-source`); copiar o bundle contorna a R2 | Nenhuma: é código do projeto, copiado com o resto (`portabilidade.md`) |
| Fluxo guiado (menus do BFF, input bloqueado por nó, upload só em certos nós) | Remendado com interceptors e HTML injetado | Nativo no template |
| Tema claro/escuro e tokens da marca | Shadow DOM isola o CSS; cores via objetos de configuração | `var(--brand-*)`/`var(--cui-*)` direto, como qualquer componente |
| Segurança de HTML | Renderiza `html` sem sanitizar | `[innerHTML]` do Angular sanitiza; markdown próprio escapa antes de formatar |
| Textos pt-BR e acessibilidade | Padrões em inglês, sobrescrever um a um | Controle total (R12) |
| Peso | ~785 kB (ESM sem minificar) | Alguns kB |
| Escopo | 682 arquivos, integrações que não usaremos (OpenAI, voz, câmera…) | Só o necessário |

A ideia do `deep-chat` foi aproveitada no formato das mensagens (`MessageContent`-like) e no catálogo de funções.
Registro formal: `ADR-010` (etapa E0 do plano do agente).

## 3. Restrições do projeto que se aplicam

| Regra | Impacto |
|---|---|
| R1/R2 | Nenhuma dependência nova |
| R3 | Regra da época (antes da migração): NgModule, `@Input`/`@Output`, `*ngIf`/`*ngFor`, RxJS com `takeUntil` + `ngOnDestroy`. Hoje: standalone e `@if`/`@for` (R3 atual) |
| R4 | `ChatApiService` com `HttpClient` e `apiBase + '/conforme/chat/...'`; mock em `src/assets/data/` até o BFF existir |
| R5 | Área não logada (D9): não se aplica. Mesmo assim, nada em `localStorage`/`sessionStorage`; `sessionId` só em memória |
| R6 | Nenhuma URL absoluta |
| R7 | `ng build --configuration production` sem erro; `.spec.ts` para componentes, serviço e formatador |
| R10 | Minimalista, 375–1440 px, temas claro/escuro, cores só por variáveis |
| R12 | Textos, `aria-label`, mensagens de erro em pt-BR; termos novos no glossário antes do uso |
| R13 | Cada passo atualiza os docs e passa `npm run docs:check` |
| ADR-009 | CSS de componente ≤ 4 kB: estilos em `src/scss/_chat-widget.scss` |

## 4. Arquitetura

```
src/app/chat/
  (chat.module.ts                       NgModule do plano original; removido na migração, componentes standalone)
  chat.model.ts                         ChatNode, ChatMessage, ChatOption, ChatCitation, ChatContact, respostas da API
  chat-api.service.ts                   sessão, mensagem, arquivo, encerrar (HttpClient; mock por flag de environment ou arquivo)
  chat-session.service.ts               estado da conversa (BehaviorSubject): mensagens, nó atual, carregando, bytes enviados
  chat-texts.ts                         todos os textos pt-BR do widget (boas-vindas, erros, recusas, avisos)
  markdown/safe-markdown.ts             formatador próprio: escapa HTML e converte parágrafos, **negrito**, *itálico*, listas, links http(s)
  chat-widget/chat-widget.component.*   botão flutuante + painel (abrir/fechar, foco, Esc, cabeçalho com "Recomeçar")
  chat-messages/chat-messages.component.*  lista de mensagens, bolhas por papel, citações, contatos, "digitando…", botão "ir para o fim"
  chat-input/chat-input.component.*     opções do nó (botões), campo de texto, upload, envio
src/assets/data/chat-fluxo-mock.json    nós e respostas mock (contato `contato@compliance.com.br`)
src/scss/_chat-widget.scss              estilos globais do widget
```

Modelo de mensagem (compatível com o contrato do `agente-normas-gemini.md`, seção 4):

```ts
export type ChatRole = 'ai' | 'user' | 'system';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;                 // markdown simples, formatado por safe-markdown
  file?: { name: string; sizeBytes: number; accepted?: boolean };
  status?: 'answer' | 'need_more_info' | 'not_in_data' | 'out_of_scope' | 'error';
  citations?: { sourceId: string; excerpt: string }[];
  questions?: string[];          // perguntas de esclarecimento
  contacts?: { name: string; area: string; channel: string }[];
  createdAt: Date;
}
```

Pontos de implementação:
- **Inclusão** (plano original, antes da migração: `ChatModule` no `AppModule`): hoje `ChatWidgetComponent` nos `imports` do layout; `<app-chat-widget>` no fim de `default-layout.component.html`.
- **Estado**: `ChatSessionService` (`providedIn: 'root'` ou provido no módulo) com `messages$`, `node$`, `loading$`; componentes usam pipe `async`. `restart()` chama `DELETE` e limpa tudo; fechar o painel mantém a conversa até o TTL (30 min) ou recomeço.
- **Envio**: `action: 'option' | 'text' | 'back' | 'restart'`; opção clicada vira mensagem do usuário com o rótulo. Erro HTTP vira mensagem `status: 'error'` com texto de `chat-texts.ts` e botão "Tentar novamente".
- **Digitação simulada** (D8): resposta completa do BFF revelada por palavras com `interval` (≈ 15 ms/palavra), desligada com `prefers-reduced-motion`.
- **Markdown**: `safeMarkdown(text)` escapa `& < > " '` primeiro e só então aplica as regras; links só `http(s)` com `rel="noopener noreferrer" target="_blank"`; resultado em `[innerHTML]` (sanitização do Angular como segunda barreira). Nada de HTML vindo do BFF.
- **Upload**: `<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp">` escondido, acionado por botão; valida extensão, MIME e soma de 20 MB por sessão antes de enviar; `FormData` para `POST /conforme/chat/arquivo` (plano original; desde a Fase 6 de 2026-11-04: Word também, 9 MB por envio, `POST /v1/agente/sessoes/{sessaoId}/arquivos` → 202 e consulta da quarentena).
- **Acessibilidade**: botão com `aria-expanded`/`aria-controls`; painel `role="dialog"` com `aria-labelledby`; lista `role="log"` + `aria-live="polite"`; `Esc` fecha e devolve foco; foco no campo (ou na 1ª opção) ao abrir; alvos ≥ 44 px.
- **Responsivo**: painel 380 × 600 px ancorado no canto a partir de `sm`; abaixo de 576 px ocupa a tela inteira.
- **Tema**: só `var(--brand-*)`, `var(--cui-*)`, `var(--app-*)`; validar contraste das bolhas nos dois temas.

## 5. Catálogo de funções de mensagens (pedir por código)

| Código | Função | Implementação própria | Situação |
|---|---|---|---|
| M01 | Mensagem de boas-vindas | `chat-texts.ts` + 1º nó do fluxo | v1 |
| M02 | Histórico pré-carregado | Não há (sessão efêmera, D4) | descartada |
| M03 | Persistir conversa no navegador | Proibido: nada em storage (D4) | descartada |
| M04 | Bolha "digitando…" | `loading$` + três pontos animados (respeita `prefers-reduced-motion`) | v1 |
| M05 | Mensagens de erro pt-BR | `chat-texts.ts`; erro com "Tentar novamente" | v1 |
| M06 | Avatares | Ícone CoreUI `cilSpeech` num círculo `--app-chat-accent` ao lado do nome do agente ("Agente da Agenda"), no início de cada sequência; usuário sem avatar | v1 (2026-10-28) |
| M07 | Nomes nas mensagens | "Agente da Agenda" / "Você" visíveis na primeira mensagem de cada sequência do mesmo autor; nas seguintes o nome fica só para leitor de tela; avisos do sistema sem nome | v1 (2026-10-28) |
| M08 | Estilo das bolhas por papel | Classes `.chat-msg--ai/--user/--system` com tokens | v1 |
| M09 | Sugestões de resposta | Opções do passo, "Recomeçar" (passo final) e "Voltar" (último, discreto) como pílulas dentro da conversa, depois da última mensagem (`chat-suggestions.ts`); somem enquanto o agente responde. Respostas prontas do esclarecimento (`quickReplies`) entram como sugestões (M33) | v1 |
| M10 | Feedback útil / não útil | Botões "Útil" e "Não útil" sob respostas e "não encontrei" (sem contatos); uma nota por resposta, enviada a `POST /conforme/chat/feedback` só com nota e fontes; agradecimento imediato, desfeito com aviso se o envio falhar | v1 (concluído em 2026-10-28, P6) |
| M11 | Mensagem temporária | Flag `transient` (do BFF ou do front): removida na próxima ação do usuário; usada no aviso de sessão expirada | v1 (2026-10-28) |
| M12 | Moldura por papel | Coberto pelo template da bolha | descartada |
| M13 | Digitação simulada | Revelação por palavras (D8); SSE fica para depois | v1 |
| M14 | Contexto enviado ao BFF | Não se aplica: o BFF guarda o histórico da sessão | descartada |
| M15 | Enriquecer requisição | `ChatApiService` anexa `sessionId`/`nodeId` (e rota atual, se pedido) | v1 |
| M16 | Citações, esclarecimento e contatos | Blocos dentro da bolha: "Fontes", perguntas, cartão de contato | v1 |
| M17 | Validar entrada | Vazio, só espaços, limite de caracteres do nó | v1 |
| M18 | Perguntas rápidas externas | `ChatLauncherService.ask(text)`/`open()` (sem dependência de HTTP) chamável de qualquer tela; o widget abre e `ChatSessionService.ask` envia `action: 'ask'` quando a sessão está livre (reabre se encerrada). Em uso: botão por linha da Tabela Analítica | v1 (2026-10-28) |
| M31 | Encerrar com despedida | Sugestão "Encerrar" (depois da primeira interação, por último entre as sugestões): `ChatSessionService.end()` apaga a sessão no BFF (`endSession`), mantém a conversa na tela e acrescenta a despedida; o painel **não** fecha nem minimiza, só resta "Recomeçar"; minimizar ou recomeçar é do usuário | v1 |
| M19 | Recomeçar conversa | Botão "Recomeçar" no cabeçalho (`restart`), habilitado só depois da primeira interação do usuário | v1 |
| M20 | Mensagem do sistema | `ChatSessionService.addSystemMessage()` (avisos, limite de rodadas) | v1 |
| M21 | Ouvir mensagens | `ChatSessionService.messages$`: `ChatMessageEvent` (id, papel, status, nó, tem arquivo, nº de fontes), sem texto; sem consumidor por enquanto | v1 (2026-10-28) |
| M22 | Ouvir erros | `ChatSessionService.errors$`: `ChatErrorEvent` (`code`, `retryable`) | v1 (2026-10-28) |
| M23 | Campo de texto | Placeholder do nó, contador de caracteres, Enter envia e Shift+Enter quebra linha, bloqueado em nós `menu` | v1 |
| M24 | Botões de envio/parar | Enviar; "Parar" cancela a assinatura HTTP em andamento e pede ao BFF para desfazer o pedido (M32) | v1 |
| M25 | Rolagem | Rolagem automática para a última mensagem; botão "Ir para o fim" quando o usuário sobe | v1 |
| M26 | Modo demonstração | Mock em `chat-fluxo-mock.json` (ADR-002) | v1 |
| M28 | Minimizar e voltar | Botão "Minimizar" e `Esc` escondem o painel sem destruí-lo (conversa, rascunho e sessão ficam); o botão flutuante ganha uma bolinha e o rótulo "conversa em andamento" | v1 |
| M29 | Expandir | Botão no cabeçalho alarga o painel (flutuante, sem mudar a altura); some abaixo de 576 px | v1 |
| M32 | Parar também no servidor | `requestId` por pedido (repetido em "Tentar novamente", então o BFF não age duas vezes); "Parar" chama `POST /conforme/chat/cancelar` e assume o passo devolvido, salvo se o usuário já agiu de novo | v1 (2026-10-28) |
| M33 | Respostas prontas ao esclarecimento | `quickReplies` de `need_more_info` viram sugestões antes de "Voltar"/"Encerrar"; escolher envia o texto | v1 (2026-10-28) |
| M34 | Despedida digitada | Mensagem que é só despedida ("tchau", "obrigado, era só isso", "pode encerrar") encerra como "Encerrar" sem ir ao BFF (`chat-farewell.ts`) | v1 (2026-10-28) |
| M35 | Listas de normas | `normList` na bolha: título, observação, segmento e data `dd/mm/aaaa`; filtro por segmento com botões alternáveis ("Todos" + segmentos, só com mais de um); com mais de uma norma, "Ver em formato tabela" / "Ver em formato lista" e, na tabela, "Extrair em Excel" das linhas na tela (filtro aplicado; `chat-norms-export.ts` + `downloadXlsx`) | v1 (2026-10-28) |
| M27 | Upload de documento | Botão de anexo só em nós `upload`; PDF, Word (DOC/DOCX), PNG, JPG, WEBP; até 5 por envio (seleção múltipla), 20 MB por sessão; erros por arquivo | v1 (vários arquivos e Word em 2026-10-28) |
| M36 | Colar print | Ctrl+V em qualquer ponto do painel no passo de upload envia a imagem copiada (`imagem-colada-<hora>.png`) ou arquivos copiados no Explorer; colar texto não é afetado | v1 (2026-10-28) |
| M37 | Resultado de vários documentos | Com mais de um arquivo, tabela "Resultado da avaliação dos documentos" na resposta + "Extrair em Excel" (`chat-file-results.ts`) | v1 (2026-10-28) |

Fora de escopo: voz, câmera, arrastar e soltar, conexão direta com LLM pelo navegador, qualquer storage.

## 6. Textos e termos (entram no glossário em P3)

Abrir Agente da Agenda · Minimizar Agente da Agenda · Agente da Agenda · Você · Digite sua pergunta · Enviar · Parar · Anexar documento ·
Recomeçar · Ir para o fim · Fontes · Tentar novamente

## 7. Passos de implementação

| Passo | Entrega | Docs (R13) | Status |
|---|---|---|---|
| P0 | `ADR-010` (componente próprio; `deep-chat` descartado) — parte da E0 do plano do agente | `decisoes/` | **concluído** (2026-10-28) |
| P1 | `chat.model.ts`, `chat-texts.ts`, `safe-markdown.ts` + spec (escape, listas, links, XSS) | `arquitetura.md` | **concluído** (2026-10-28; 16 testes passam) |
| P2 | `ChatModule` + `ChatWidgetComponent` (botão + painel vazio, abrir/fechar, `Esc`, foco, responsivo, temas) no `default-layout`; `_chat-widget.scss` | `arquitetura.md`, `design-system.md`, `glossario-ptbr.md` | **concluído** (2026-10-28; 7 testes; verificado em 1440 px claro/escuro e 375 px) |
| P3 | `ChatMessagesComponent` (bolhas, markdown, "digitando…", rolagem, citações, contatos) com dados fixos | `design-system.md`, `glossario-ptbr.md` | **concluído** (2026-10-28; 36 testes de chat; dados fixos em `chat-demo-messages.ts`, a remover no P5) |
| P4 | `ChatInputComponent` (opções, texto, validação, enviar/parar, upload com limites) | `arquitetura.md` | **concluído** (2026-10-28; 32 testes novos; passos de demonstração em `chat-demo-nodes.ts`, a remover no P5) |
| P5 | `ChatApiService` + `ChatSessionService` + `chat-fluxo-mock.json` (fluxo completo em mock, incluindo recusa, arquivo rejeitado, 3 rodadas e contato `contato@compliance.com.br`) | `contratos-de-dados.md` | **concluído** (2026-10-28; 245 testes; `chatMock: true`; arquivos de demonstração removidos) |
| P6 | Funções opcionais do catálogo, sob pedido | conforme a função | **concluído** (2026-10-28): M10 feedback útil / não útil; depois M06, M07, M11, M18, M21, M22 e as novas M32–M35 |
| P7 | Testes (`ng test`), `ng build --configuration production`, checagem visual 375/768/1440 px nos dois temas, teclado e leitor de tela | — | **concluído** (2026-10-28; 259 testes; contraste, 375/768/1440 px, teclado) |
| P8 | Fechamento R13: `changelog.md`, `portabilidade.md`, `npm run docs:inventory` e `docs:check` | todos | **concluído** (2026-10-28) |
| Fase 6 (adequação) | Contrato v1 (`chat-v1-adapters.ts`, caminhos `/v1/agente/sessoes/...`), 9 MB por envio (`SEND_TOO_LARGE`), quarentena (202 + consulta, "Verificando o documento...", recusas com texto próprio, prazo de 2 minutos), "Código de suporte" nos erros, quarentena simulada no mock | `contratos-de-dados.md` §9, `arquitetura.md` §11, `glossario-ptbr.md` | **concluído** (2026-11-04) |

Como pedir: "executa P1 e P2" ou "adiciona M10 + M18".
