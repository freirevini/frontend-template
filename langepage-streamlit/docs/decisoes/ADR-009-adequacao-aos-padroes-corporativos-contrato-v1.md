# ADR-009 — Adequação aos padrões corporativos (contrato v1)

**Data:** 2026-11-04 · **Situação:** aceita · **Plano:** fase 8 de `../langepage-angular/landing-analitica/docs/planejamento/adequacao-padroes-corporativos.md` (L04–L09, L13); §10 de `docs/planejamento/plano-implementacao.md`
**Regras:** R4, R5, R6, R9, R12, R13 · **Revê em parte:** ADR-006 (rotas do chat), ADR-008 (prefixo `/conforme`)

## Contexto

A arquitetura corporativa respondeu (2026-11-04) como o BFF deste produto expõe dados e o agente: recursos REST
`/api/v1/<plural-kebab-case>`, OpenAPI contract-first, erros RFC 7807 com `traceId`, paginação obrigatória (`page`,
`size` até 100), corpo de requisição até ~10 MB, sessão por cookie com 401 quando expira, documentos do chat por
quarentena com antivírus antes de qualquer processamento. A landing registrou isso no ADR-023 dela e publicou o
contrato `docs/contratos/openapi-agenda-normativa-v1.yaml`. O Streamlit chamava as rotas propostas `/conforme/...`,
que nunca existiram, lia listas inteiras e esperava erros `{ code }`. O usuário aprovou o plano de adequação e as
decisões D4 (9 MB por envio no chat), D5 (Excel percorre as páginas até 5.000 linhas) e D6 (`traceId` como "código de
suporte"); a infraestrutura (F10: Cookiecutter, ConfigMaps/Secrets reais, esteira) fica fora desta decisão.

## Decisão

1. **Contrato v1, fonte única.** O OpenAPI da landing é a fonte dos nomes; `docs/contratos-de-dados.md` diz como cada
   campo chega à tela. `core/api.py` monta `bff.base_url` + `bff.prefix` (`/v1`) + recurso: `bff.base_url` passa a ser
   o caminho base da API do BFF (o que o Ingress roteia como `/api`, o `apiBase` da landing). O formato do
   `settings.yaml` não muda; só o valor do prefixo.
2. **Adaptadores, não telas novas.** `core/data.py` e `core/chat.py` convertem o v1 (campos pt-BR em camelCase,
   enumerações em MAIÚSCULAS) para os formatos internos que as páginas, as validações e o widget já usam. O mock
   (`data/*.json`) continua igual e é a fonte quando `bff.base_url` está vazio.
3. **Agregados e páginas no servidor.** Pizza, temas, indicadores e barras de e-mails vêm dos recursos `/resumo`; a
   Tabela Analítica pede só a página visível (`page`, `size=15`, `sort`, filtros), com `compat.pager` guardando a
   página. O Excel lê páginas de 100 até 5.000 linhas e é montado no servidor por `core/xlsx.py` (R9 sem mudança);
   acima disso não exporta parcial e mostra o texto do contrato.
4. **Erros RFC 7807.** O app lê só `status`, `code` e `traceId`; decide o texto pelo status e pela família do código
   (`VAL`, `AUT`, `NEG`, `SIS`) e nunca mostra a mensagem do servidor. 401 → "Sua sessão expirou. Entre novamente." com
   o link "Entrar novamente" para `auth.login_url` (recarregar pelo gateway refaz a autenticação; padrão `/`); 403 nas
   páginas → "Você não tem acesso a esta informação."; com `traceId`, "Código de suporte: <traceId>".
5. **Chat no v1.** Sessões, mensagens, avaliações, cancelamentos e encerramento em `/v1/agente/sessoes/...`;
   documentos somam até 9 MB por envio (validado antes de enviar) e 20 MB por conversa; o envio responde 202 e o app
   consulta cada documento até `APROVADO` ou `REJEITADO` (2 s entre consultas, teto de 2 minutos, depois cancela), com
   estados e motivos em pt-BR. O mock simula a quarentena sem espera.

## Alternativas descartadas

- Manter `/conforme/...` até o BFF existir: o contrato real já está definido e o código precisaria mudar de novo.
- Endpoint de exportação no BFF: só se o volume real passar de 5.000 linhas (D5).
- Redirecionar sozinho para o login no 401: o Streamlit não tem interceptor no navegador; o link explícito evita laço de
  recarga e funciona com qualquer rota de reautenticação configurada.

## Consequências

- R4 passa a citar `bff.base_url` + `/v1/...`; `AUTH_LOGIN_URL` entra na tabela de ambientes; `chat.max_send_bytes`
  no `settings.yaml`.
- Testes que fixavam as rotas e os nomes antigos foram portados para o v1 com as mesmas asserções
  (`.rules/decisoes.md` D-008); testes novos cobrem adaptadores, paginação, Excel, Problem Details, 401/403 e
  quarentena com o BFF simulado.
- Suposições herdadas do contrato (sem resposta da arquitetura): envelope Spring `Page`, catálogo de códigos por
  família, antivírus assíncrono, `GET /v1/usuarios/me` para o primeiro nome. CSRF (`X-XSRF-TOKEN`) e o cabeçalho
  `Retry-After` não são tratados no cliente do servidor; entram com o BFF real (F10).
- ADR-006 (rotas `/conforme/chat/*`) e ADR-008 (prefixo `/conforme`) ganham nota de revisão apontando para este ADR.
