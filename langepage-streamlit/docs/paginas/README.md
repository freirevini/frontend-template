# Fichas por página (R15)

Uma ficha por página de `src/views/`, para portar **uma página só** com o de-para de dados alinhado. A ficha diz o que a
página puxa de dados, campo a campo, o que calcula sozinha e o que copiar para ela funcionar fora deste repositório.
Origem: as fichas da landing (`docs/paginas/` de lá), com os caminhos trocados para Python/Streamlit.

**Estado (2026-11-04):** as quatro fichas descrevem o código implementado (F3–F7) e conferido na F9; a seção 7 de cada
uma registra o que foi verificado e as diferenças aceitas; carimbos `page-data-hash` atuais.

| Ficha | Rota | Arquivo | Dados |
|---|---|---|---|
| [`inicio.md`](inicio.md) | `/` | `src/views/inicio.py` | cards de segmento (visão geral) |
| [`triagent.md`](triagent.md) | `/triagent` | `src/views/triagent.py` | segmentos, Normativos Recebidos, classificação, e-mails, Tabela Analítica |
| [`scalation.md`](scalation.md) | `/scalation` | `src/views/scalation.py` | segmentos, cascata do resultado |
| [`analitico.md`](analitico.md) | `/analitico` | `src/views/analitico.py` | nenhum |

`src/views/dashboard.py` só redireciona para `/triagent` (ADR-007) e não tem ficha.

## Como usar

- **Portar uma página:** ler a ficha, copiar a lista da seção 6, ligar os dados conforme `docs/contratos-de-dados.md` e
  rodar a verificação da seção 7.
- **Alterar uma página:** bloco, campo, filtro, exportação ou dependência nova atualiza a ficha no mesmo commit (R13).
- **Página nova:** copiar o modelo para `docs/paginas/<slug>.md` (`slug` = nome do arquivo em `src/views/`) e
  acrescentar a linha na tabela acima.

## O que o `docs_check.py` cobra (verificação 11)

Para cada `src/views/*.py` (menos `__init__.py` e `dashboard.py`): ficha existe e está na tabela; tem as sete seções
`## 1. Identidade` … `## 7. Verificação`; cita `src/views/<slug>.py`; carimbo `<!-- page-data-hash: ... -->` = SHA-1
(12 caracteres) de `src/core/data.py` + `src/views/<slug>.py` (aviso até a F9, D-006; depois, falha).

## Modelo

```markdown
# Página <Nome> (`/<rota>`)

<!-- page-data-hash: 000000000000 -->

Uma frase: o que a página mostra e para quem.

## 1. Identidade
| Item | Valor |
|---|---|
| Rota | `/<rota>` (`st.Page(url_path=...)` em `src/app.py`) |
| Arquivo | `src/views/<slug>.py` |
| Título (breadcrumb) | `title` do `st.Page` |
| Menu | item em `NAV` de `src/app.py`; subitens por seção |
| Seções (`id`) | ... |

## 2. Blocos (ordem da tela)
| # | Bloco | Chave (`st-key-*`) / função de `core/` | Estado | O que o usuário faz |

## 3. Dados consumidos
Por bloco: função de `core/data.py` (ou `api.py`), mock de `data/`, tabela de campos · formato · exemplo · onde aparece.

## 4. Calculado no app
O que não vem da origem; derivações temporárias a remover com dados reais.

## 5. De-para e domínios
Seções de `docs/contratos-de-dados.md` e domínios que valem aqui.

## 6. O que copiar para portar só esta página
Arquivos de `src/views/` e `src/core/`, mocks, estáticos, tokens, pacotes, termos do glossário; o que pode ficar de fora.

## 7. Verificação
Checklist "reflete exatamente" (comparar com a landing nos dois temas, 375 e 1440 px).
```
