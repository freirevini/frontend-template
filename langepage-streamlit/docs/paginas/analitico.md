# Página Analítico (`/analitico`)

<!-- page-data-hash: d5ef469e7528 -->

Página reservada: só o título oculto, para o menu e a rota já estarem no lugar (como na landing). Conteúdo a definir
pelo produto. Estado: implementada (F7) e conferida na F9 (§7).

## 1. Identidade

| Item | Valor |
|---|---|
| Rota | `/analitico` (`st.Page("views/analitico.py", title="Analítico", url_path="analitico")` em `src/app.py`) |
| Arquivo | `src/views/analitico.py` |
| Título (breadcrumb) | `Início / Analítico` |
| Menu | item "Analítico" em `NAV` de `src/app.py` (ícone `:material/show_chart:`), sem subitens |
| Seções (`id`) | nenhuma |

## 2. Blocos (ordem da tela)

| # | Bloco | Chave / função | Estado | O que o usuário faz |
|---|---|---|---|---|
| 1 | Título oculto `<h1 class="visually-hidden">Analítico</h1>` | `st.html` | nenhum | nada |

O chrome (sidebar, header, rodapé e Agente da Agenda) vem de `src/app.py`, não da página.

## 3. Dados consumidos

Nenhum. Nenhuma função de `core/data.py`, mock ou campo.

## 4. Calculado no app

Nada.

## 5. De-para e domínios

Não se aplica. Ao receber conteúdo, documentar o contrato em `docs/contratos-de-dados.md` e preencher esta ficha (R15).

## 6. O que copiar para portar só esta página

`src/views/analitico.py`, a entrada `analitico` em `PAGES`/`NAV` de `src/app.py` e a classe `.visually-hidden` de
`src/static/app.css`. Nada de dados, token específico ou pacote.

## 7. Verificação

Conferido na F9:

1. ✔ `/analitico` abre com breadcrumb "Início / Analítico" e item "Analítico" ativo na sidebar (`st-key-nav-analitico-active`).
2. ✔ Leitor de tela anuncia "Analítico"; nada visível além do chrome.
3. ✔ `bash scripts/verify.sh` verde.
