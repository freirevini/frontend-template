#!/usr/bin/env bash
# scripts/verify.sh — tudo antes de declarar pronto (R7). Para no primeiro erro.
# Etapas: ruff check → pytest → docs_check.py → .rules/check.sh. Imprime a última linha de cada etapa.
# Capturas visuais (checks/) ficam fora: exigem servidor e Chrome (R7).
set -u
cd "$(cd "$(dirname "$0")/.." && pwd)" || exit 1

BIN=""
[ -x .venv/bin/python ] && BIN=".venv/bin/"
PY="${BIN}python"
[ -x "$PY" ] || PY=python3

etapa() {  # $1 nome; resto = comando
  nome="$1"; shift
  saida=$("$@" 2>&1); codigo=$?
  ultima=$(printf '%s\n' "$saida" | sed '/^[[:space:]]*$/d' | tail -1)
  if [ "$codigo" -ne 0 ]; then
    printf '%s\n' "$saida" >&2
    printf '[%s] FALHOU (código %s): %s\n' "$nome" "$codigo" "$ultima"
    echo "verify: vermelho na etapa $nome"
    exit 1
  fi
  printf '[%s] %s\n' "$nome" "$ultima"
}

etapa ruff "$PY" -m ruff check src tests scripts
etapa pytest "$PY" -m pytest -q
etapa docs_check "$PY" scripts/docs_check.py
etapa check.sh bash .rules/check.sh
echo "verify: verde"
