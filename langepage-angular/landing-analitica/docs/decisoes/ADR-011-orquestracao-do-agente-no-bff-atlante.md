# ADR-011: Orquestração do agente no BFF Atlante (Java + Spring Boot); o front só consome

Data: 2026-10-28
Situação: substituída por ADR-023

## Contexto

O agente combina caminhos pré-estabelecidos com etapas de linguagem natural respondidas por uma LLM (Gemini via Vertex AI), avaliação de arquivos e guarda de tema. O chat ficará em área **não logada**, e a regra R4/R6 proíbe URLs e credenciais de backend no front. O backend de destino é o chassi Atlante BFF `3.6.2-rc3` (atom `3.6.3`), Java 21+, Spring Boot herdado do parent 3.6.x. Este repositório contém só o front Angular.

## Decisão

1. Toda a lógica do agente (motor de fluxo, sessão, guarda de tema, gate de arquivos, chamadas ao Vertex, seleção de registros, loop de esclarecimento) roda no BFF, em outro repositório.
2. O front chama apenas a base da API (`environment`, R4) + `/conforme/chat/...`: `POST /sessao`, `POST /mensagem`, `POST /arquivo`, `DELETE /sessao/{id}`. Contrato em `docs/planejamento/agente-normas-gemini.md` (seção 4) e, a partir da E1, em `docs/contratos-de-dados.md`.
3. Os caminhos e textos do fluxo ficam em `chat-flow.json` dentro do código do BFF; só mudam com deploy; a área de negócio não os edita.
4. Sessão, histórico e arquivos ficam em memória do BFF com TTL de 30 minutos de inatividade e são apagados no fim da sessão (sem persistência, sem `localStorage` no front). Instância única assumida; Redis se houver mais de uma.
5. Área não logada: proteções obrigatórias (limites por `sessionId` e IP, cota diária no Vertex, validação de arquivo antes de chamar o modelo, nenhum texto de usuário nos logs). Antivírus é automático no chassi.
6. Este repositório guarda a especificação do backend (`docs/planejamento/agente-backend-spec.md`, E1) para implementação no chassi; até o BFF existir, o front usa mock (ADR-002).

## Consequências

- Credenciais do Vertex nunca chegam ao navegador.
- O front pode ser entregue e testado com mock antes do backend.
- O código Java e seus testes ficam fora deste repositório; a spec precisa bastar sozinha (R13).
- Sessão em memória limita a escala horizontal até haver store compartilhado.

## Revisão (2026-11-04, ADR-023)

Substituída. A orquestração do agente sai do BFF Java: o BFF `sboot-<sigla>-base-bff-agenda-normativa` só autentica,
autoriza e encaminha `/api/v1/agente/*` por REST (`Authorization: Bearer <jwt>`) a um orquestrador Python em pods
dedicados no GKE (`genaigke` / `pylib-sgen-base-genai-framework`). Sessão, respostas por `requisicaoId` e estado para
desfazer ficam no Redis corporativo (Cloud Memorystore, TTL 30 min); arquivos passam por bucket de quarentena com
antivírus. O chat exige a sessão do usuário (deixa de ser área não logada). Rotas `/conforme/chat/*` viram
`/api/v1/agente/sessoes/...` (`docs/contratos/openapi-agenda-normativa-v1.yaml`). Especificação nova:
`docs/planejamento/agente-backend-spec.md`.
