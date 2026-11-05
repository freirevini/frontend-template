# ADR-012: Gemini via Vertex AI (região `global`), saída estruturada e dados restritos aos registros enviados

Data: 2026-10-28
Situação: revista em ADR-023 (região `global` mantida; modelos Gemini 2.5; cliente Python)

## Contexto

O agente deve responder só sobre o processo, restringir-se aos dados a que tem acesso, validar que arquivos enviados são normas regulatórias do setor financeiro e pedir mais informações quando não houver resposta segura. Modelos disponíveis: `gemini-3.8-flash`, `gemini-3.1-pro` e Gemini 4. Ainda não existe projeto GCP de teste; a base de normas está em homologação no GCP e, neste ambiente, é mock em CSV/JSON.

## Decisão

1. Cliente: SDK Java `com.google.genai:google-genai` em modo Vertex, região `global`, credenciais por Application Default Credentials da conta de serviço do BFF.
2. Dois perfis por propriedade (`agente.llm.vertex.model-fast` = `gemini-3.8-flash` para guarda de tema e gate de arquivo; `model-strong` = `gemini-3.1-pro` para respostas). Gemini 4 é candidato a `model-strong`, a comparar na etapa E7 com o conjunto dourado.
3. Interface `LlmGateway` com `MockLlmGateway` (padrão neste ambiente e nos testes) e `VertexLlmGateway`, escolhidas por `agente.llm.provider`. Ligar produção = `AGENTE_LLM_PROVIDER=vertex` + `VERTEX_PROJECT_ID` (projeto GCP ainda a definir); nada de código muda.
4. Toda chamada usa saída estruturada (`responseMimeType: application/json` + `responseSchema`), temperatura 0–0,2 e instrução de sistema versionada em pt-BR. Resposta tem `status` (`answer` / `need_more_info` / `not_in_data` / `out_of_scope`), `citations`, `confidence`.
5. Dados restritos: registros vêm de `NormasRepository` (implementação local CSV/JSON agora; `GcpNormasRepository` depois), selecionados por pré-filtro determinístico do nó + busca lexical, enviados ao modelo delimitados com `source_id`. Resposta sem citação válida é rebaixada para `not_in_data`. Sem RAG vetorial na v1.
6. Guarda de tema em camadas (fluxo, classificador, instrução de sistema, pós-checagem) e gate de arquivos com classificação multimodal (limiar inicial de confiança 0,8, calibrado na E7). Arquivos entram como bytes inline (até 20 MB por sessão) e não são persistidos.
7. Loop de esclarecimento de até 3 rodadas por nó; depois, mensagem de encerramento com os contatos do tema (mock: `contato@compliance.com.br`).

## Consequências

- Sem projeto GCP, as etapas E4–E7 (guardas, gate, Q&A, avaliação) ficam bloqueadas; E0–E3 seguem com mock.
- Região `global` é a padrão e não será trocada (C4 fechado em 2026-10-28 pelo usuário). `VERTEX_LOCATION` continua como propriedade, mas o valor é `global`; não propor outra região.
- Limiares e escolha do modelo forte dependem da avaliação (E7); a decisão será registrada aqui ou em ADR novo.
- Prompts e esquemas são versionados e testados antes de qualquer troca de modelo.

## Revisão (2026-11-04, ADR-023)

Revista em parte. Região `global` mantida por decisão do usuário (registrada como risco no ADR-023: a arquitetura citou
`us-central1` ou `southamerica-east1`). Modelos trocados pelos homologados: `gemini-2.5-flash` (rápido) e
`gemini-2.5-pro` (forte); Gemini 3.x e 4 saem da comparação. Cliente: SDK Python `google-genai` no orquestrador
(ou a camada do `pylib-sgen-base-genai-framework`), no lugar da SDK Java no BFF. Arquivos só chegam ao modelo depois da
quarentena com antivírus. Saída estruturada, citações e dados restritos aos registros continuam como estão.
