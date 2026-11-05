---
description: Checklist de pronto do langepage-streamlit (verify, documentação, erros)
---

1. Rode `source .venv/bin/activate` e `bash scripts/verify.sh`. Cole a última linha de cada etapa (ruff, pytest, docs_check, check.sh).
2. Se foi correção: confirme teste novo que falhava antes e entrada nova em `.rules/erros.md`.
3. Confira a tabela R13 em `.rules/projeto.md` e atualize o documento de `docs/` correspondente e `docs/changelog.md`.
4. Mexeu em interface: capturas de `checks/` nos temas claro e escuro, 375 px e 1440 px.
5. `git diff --stat`: só arquivos previstos. Relate o que mudou, o que foi verificado, o que ficou de fora e as suposições.
