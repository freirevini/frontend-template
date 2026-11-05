# Testes — toda correção vira teste, toda regra vira teste

Vinculante. Comandos deste projeto (raiz, com `source .venv/bin/activate`): rápido `pytest -q`; completo
`bash scripts/verify.sh` (ruff, pytest, docs, regras). Configuração em `pyproject.toml` (`testpaths = ["tests"]`,
`pythonpath = ["src"]`: importe `core.period`, `core.data`, nunca `src.core...`).

Três camadas:

| Camada | Onde | Ferramenta | Cobre |
|---|---|---|---|
| Núcleo | `tests/test_<módulo>.py` | pytest puro | `src/core/` sem Streamlit rodando: período, derivações, formatação pt-BR, Excel, settings, auth, mock do chat, cliente do BFF |
| Telas | `tests/test_view_<slug>.py`, `tests/test_app.py` | `streamlit.testing.v1.AppTest` | página carrega sem exceção, textos pt-BR, widgets por `key`, efeito de clique no `session_state` |
| Visual | `checks/` (`shoot.py`, `interact.py`, `probe.py`) | Chrome headless via CDP, servidor rodando | chrome, temas claro/escuro, 375 e 1440 px, interações; manual, fora do `verify.sh` |

Casos portados da landing (F2): os mesmos valores esperados de `period-range.spec.ts`, `classification-derive.spec.ts`,
`emails-derive.spec.ts`, `waterfall-derive.spec.ts`, `waterfall.model.spec.ts`, `xlsx-export.spec.ts` e dos specs do
chat. Valor esperado diferente do da landing é decisão de produto (R11), não ajuste de teste.

## 1. Bug corrigido

1. Escreva um teste que reproduz o bug: mesmas condições, mesmo resultado errado.
2. Rode: o teste **tem que falhar**. Se passa, não captura o bug; reescreva.
3. Corrija o código.
4. Rode: o teste passa e o resto da suíte continua verde.
5. Nomeie pelo comportamento: `test_custom_range_rejects_more_than_92_days`, não `test_bug_42`.
6. Registre em `.rules/erros.md`. Teste e registro vão no mesmo commit da correção; o hook recusa commit `fix` sem os
   dois (`.rules/check.sh --commit-msg`).

Bug só visual (CSS, posição): teste em `AppTest` quando o efeito aparece no DOM do teste; senão `checks/` com a captura
antes/depois citada na entrada de `erros.md` e `[sem-teste: motivo]` na mensagem de commit.

## 2. Regra

Toda regra (negócio, cálculo, validação, permissão, fluxo) tem teste que a prova. Regra nova entra com teste no mesmo
commit. Regra sem teste é sugestão: será quebrada sem aviso.

## 3. Estado pelo caminho curto

Construa o estado direto: JSON real de `data/` (fixtures leem os mesmos arquivos do app), `AppTest.session_state`
preenchido antes de `run()`, `monkeypatch.setenv` para `ENV`/`AUTH_MODE`/`BFF_BASE_URL`/`CHAT_MOCK` (limpe o
`lru_cache` de `core.settings.settings` no fixture). Não refaça o fluxo inteiro para testar um ponto.

## 4. Quando rodar

- Rápido: a cada correção e antes de declarar qualquer coisa pronta. Cole a última linha.
- Completo: antes de commit, PR e deploy. Vermelho não sobe.
- Tocou em código coberto: rode sem ser mandado.

## 5. Proibido

- Apagar, comentar, marcar `skip`/`xfail` ou afrouxar asserção para fazer passar.
- Mudar valor esperado sem confirmar com o usuário que **a regra mudou**.
- Mockar a unidade sob teste. Mock é para fronteira: rede (`requests`, por `monkeypatch`), relógio, cabeçalhos HTTP
  (`st.context.headers`), variáveis de ambiente.
- Rede real em teste: o BFF é sempre simulado.
- Teste sem asserção ou com asserção tautológica.
- Dizer "testado" sem ter rodado. "Deveria passar" não é resultado.

## 6. Teste falhou

1. Leia a mensagem inteira. Não adivinhe.
2. Reproduza isolado: `pytest -q tests/test_<arquivo>.py::test_<nome>`.
3. Corrija a **causa**. Se a correção é "ajustar o teste", volte ao item 5.
4. Rode a suíte inteira de novo. Verde parcial não existe.

## 7. Específico deste projeto

- Saída que não segue o tema da tela (Excel) usa só tokens claros: teste com o tema escuro ativo (precedente E-001 da
  landing).
- Função de `src/core/compat.py` (ponto de troca) tem teste do contrato, não da implementação: trocar a versão do
  Streamlit não pode exigir mudar o teste.
- Texto visível novo: o teste confere o texto em pt-BR do glossário.
- `AUTH_MODE=gateway`: teste com cabeçalhos simulados (`x-user-id`, `x-user-email`) e sem eles.
