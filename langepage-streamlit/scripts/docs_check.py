"""Living-documentation check (rule R13). Python port of the applicable checks of the Angular landing's docs-check.js.

Usage: python scripts/docs_check.py        exit 0 = ok; exit 1 = list of problems (one per line).
Warnings ("aviso:") do not fail. Messages are pt-BR (R12); code is English.
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_DOCS = [
    "docs/README.md", "docs/arquitetura.md", "docs/contratos-de-dados.md", "docs/design-system.md",
    "docs/dependencias-e-ambiente.md", "docs/portabilidade.md", "docs/changelog.md", "docs/glossario-ptbr.md",
    "docs/decisoes/README.md", "docs/paginas/README.md", "docs/planejamento/plano-implementacao.md",
]
POINTERS = ["CLAUDE.md", "GEMINI.md", ".cursor/rules/regras-projeto.mdc", ".agents/rules/regras.md"]
RULES_FILE = ".rules/projeto.md"
TOKENS_FILE = "src/core/tokens.py"
DATA_FILE = "src/core/data.py"

# Local rules: .rules/local.md is git-ignored; its rules are not indexed in AGENTS.md and their checks run only when the
# file exists and holds the rule heading. The heading and the institution's name are never written in versioned files,
# not even here, so they are built from parts.
LOCAL_RULES_FILE = ".rules/local.md"
NAME_RULE_HEADING = "## L1."  # local rule (.rules/local.md, gitignored): numbered apart from the versioned R/ADR/D series
_B = "b" + "v"
NAME_WORD = re.compile(rf"(?<![A-Za-z0-9]){_B}(?![A-Za-z0-9])", re.I)
NAME_SUBSTRINGS = [_B + "net", _B + "docker", "banco" + _B, _B + "c-", "voto" + "rantim"]
# Case-sensitive: the acronym glued to a lowercase word inside an identifier (camelCase), e.g. a field named api +
# acronym. Capitalized must not be followed by a lowercase letter, all caps by any letter (same as the Angular check).
_B_CAPITAL, _B_UPPER = _B[0].upper() + _B[1:], _B.upper()
NAME_GLUED = re.compile(rf"[a-z](?:{_B_CAPITAL}(?![a-z])|{_B_UPPER}(?![A-Za-z]))")
# Any case: the acronym as the prefix of a longer token (a container key or JS global named acronym + "js-" or + "Theme").
NAME_PREFIX = re.compile(rf"(?<![A-Za-z0-9]){_B}[A-Za-z]", re.I)
NAME_SKIP_DIRS = {".venv", ".git", "__pycache__", ".pytest_cache", ".ruff_cache", "node_modules"}
NAME_BINARY = {".woff", ".woff2", ".ttf", ".otf", ".eot", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
              ".xlsx", ".xls", ".zip", ".gz", ".pyc"}
NAME_LOCKFILES = {".lock"}, {"package-lock.json", "npm-shrinkwrap.json"}  # generated hashes and package names, not text

# R6: names that must never be versioned outside the files allowed below (D-007).
R6_FORBIDDEN = ["localhost", "127.0.0.1", "appdes", "appuat", _B + "net", "@" + _B + ".com"]
R6_SCAN = ["src", "docs", "k8s", "settings.yaml", "Dockerfile", ".streamlit/config.toml"]
R6_ALLOWED_FILES = {"docs/planejamento/plano-implementacao.md", "scripts/docs_check.py"}
TEXT_SUFFIXES = {".py", ".css", ".html", ".js", ".md", ".yaml", ".yml", ".toml", ".json", ".svg", ".txt", ""}

# R3: APIs/selectors that break on version change or bypass the version seams.
R3_FORBIDDEN = ["st-emotion-cache", "unsafe_allow_javascript", "st.experimental_"]

# R10: hex color literal (#rgb, #rgba, #rrggbb, #rrggbbaa) not preceded by a word char, & or /.
HEX = re.compile(r"(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
R10_ALLOWED = {TOKENS_FILE}

# R15: page sheets.
PAGE_SECTIONS = ["Identidade", "Blocos", "Dados consumidos", "Calculado", "De-para", "O que copiar", "Verificação"]
PAGE_EXCLUDED = {"__init__.py", "dashboard.py"}  # dashboard.py only redirects to /triagent (ADR-007)
PAGE_HASH_STRICT = True  # D-006: warning until phase F9 closes the page sheets

# Claims that became false. Each: (file globs, regex, why, condition). A line naming "histórico" is ignored.
STALE_CLAIMS = [
    (["README.md"], r"Nada implementado|Aguardando aprovação", "o plano foi aprovado em 2026-11-04 e a F0 começou",
     lambda: (ROOT / "AGENTS.md").exists()),
    (["docs/planejamento/plano-implementacao.md"], r"Situação: aguardando aprovação", "plano aprovado em 2026-11-04 (ADR-001)",
     lambda: (ROOT / "docs/decisoes").exists()),
    (["AGENTS.md", ".rules/*.md", "docs/*.md", "docs/paginas/*.md"], r"R1[–-]R1\d",
     "cite regra por número, nunca por faixa (a faixa envelhece)", lambda: True),
    (["AGENTS.md", "docs/*.md", "docs/paginas/*.md"], r"Streamlit 1\.66\b(?! \()|versão 1\.66 (?:é|está) em uso",
     "o projeto usa Streamlit 1.40.2 (ADR-002); 1.66 só como protótipo", lambda: True),
    (["README.md", "AGENTS.md", ".rules/*.md", "docs/*.md", "docs/paginas/*.md"], r"\b\d+ (?:testes|tests)\b|\b\d+ passed\b",
     "contagem de testes envelhece a cada teste novo; cite a linha [pytest] do verify.sh", lambda: True),
]

problems: list[str] = []
warnings: list[str] = []


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.is_file() else ""


def sha12(*paths: str) -> str:
    h = hashlib.sha1()
    for path in paths:
        h.update((ROOT / path).read_bytes())
    return h.hexdigest()[:12]


def text_files(target: str):
    p = ROOT / target
    if p.is_file():
        yield p
    elif p.is_dir():
        for f in sorted(p.rglob("*")):
            if f.is_file() and f.suffix in TEXT_SUFFIXES and "__pycache__" not in f.parts:
                yield f


def check_required_docs() -> None:
    for d in REQUIRED_DOCS:
        if not (ROOT / d).is_file():
            problems.append(f"documento obrigatório ausente: {d}")


def check_architecture() -> None:
    arq = read("docs/arquitetura.md")
    for f in sorted((ROOT / "src/views").glob("*.py")) + sorted((ROOT / "src/core").glob("*.py")):
        if f.name != "__init__.py" and rel(f).replace("src/", "", 1) not in arq and f.name not in arq:
            problems.append(f"docs/arquitetura.md não cita {rel(f)}")


def check_data_contracts() -> None:
    contracts = read("docs/contratos-de-dados.md")
    for f in sorted((ROOT / "data").glob("*.json")):
        if f.name not in contracts:
            problems.append(f"docs/contratos-de-dados.md não cita o mock data/{f.name}")
    for token in ("bff.base_url", "/v1/"):
        if token not in contracts:
            problems.append(f"docs/contratos-de-dados.md não cita {token}")


def check_dependencies() -> None:
    doc = read("docs/dependencias-e-ambiente.md")
    for req in ("requirements.txt", "requirements-dev.txt"):
        for line in read(req).splitlines():
            line = line.split("#", 1)[0].strip()
            if not line or line.startswith("-"):
                continue
            m = re.match(r"^([A-Za-z0-9_.\-\[\]]+)\s*==\s*([^\s;]+)", line)
            if not m:
                problems.append(f"{req}: versão não exata (R1): {line}")
                continue
            if f"{m.group(1)}=={m.group(2)}" not in doc:
                problems.append(f"docs/dependencias-e-ambiente.md não cita {m.group(1)}=={m.group(2)} ({req})")


def check_tokens_stamp() -> None:
    if not (ROOT / TOKENS_FILE).is_file():
        problems.append(f"{TOKENS_FILE} ausente")
        return
    expected = sha12(TOKENS_FILE)
    m = re.search(r"<!-- tokens-hash: ([0-9a-f]{12}) -->", read("docs/design-system.md"))
    if not m:
        problems.append(f"docs/design-system.md sem carimbo <!-- tokens-hash: {expected} -->")
    elif m.group(1) != expected:
        problems.append(f"docs/design-system.md: carimbo tokens-hash {m.group(1)} ≠ {expected}; revise as tabelas de tokens e cole o novo")


def check_agent_rules() -> None:
    # Only versioned rules (RULES_FILE) need an index line; rules in LOCAL_RULES_FILE stay out of AGENTS.md.
    agents, rules = read("AGENTS.md"), read(RULES_FILE)
    if not agents:
        problems.append("AGENTS.md ausente na raiz")
    if not rules:
        problems.append(f"{RULES_FILE} ausente")
    for num in re.findall(r"^## R(\d+)\.", rules, re.M):
        if not re.search(rf"^- R{num} ", agents, re.M):
            problems.append(f"AGENTS.md não tem a linha de índice da regra R{num} de {RULES_FILE}")
    for f in POINTERS:
        text = read(f)
        if not text:
            problems.append(f"ponteiro ausente: {f}")
            continue
        if "AGENTS.md" not in text:
            problems.append(f"{f} não aponta para AGENTS.md")
        if re.search(r"^## R\d+\.", text, re.M):
            problems.append(f"{f} contém texto de regra; deve ser só ponteiro (D-001)")
    if read("CLAUDE.md") and not re.search(r"^@AGENTS\.md", read("CLAUDE.md"), re.M):
        problems.append("CLAUDE.md precisa importar @AGENTS.md")


def check_adrs() -> None:
    folder = ROOT / "docs/decisoes"
    if not folder.is_dir():
        return
    index = read("docs/decisoes/README.md")
    seen: dict[str, list[str]] = {}
    for f in sorted(folder.glob("ADR-*.md")):
        m = re.match(r"^ADR-(\d{3})-.+\.md$", f.name)
        if not m:
            problems.append(f"nome de ADR fora do padrão ADR-nnn-titulo.md: {f.name}")
            continue
        seen.setdefault(m.group(1), []).append(f.name)
        if f"({f.name})" not in index:
            problems.append(f"docs/decisoes/README.md não indexa {f.name}")
    for num, files in seen.items():
        if len(files) > 1:
            problems.append(f"ADR-{num} repetido: {', '.join(files)}")
    for link in re.findall(r"\((ADR-\d{3}-[^)]+\.md)\)", index):
        if not (folder / link).is_file():
            problems.append(f"docs/decisoes/README.md aponta para ADR inexistente: {link}")


def check_r10_colors() -> None:
    files = [f for f in text_files("src") if f.suffix == ".py" and rel(f) not in R10_ALLOWED]
    files += sorted((ROOT / "src/static").glob("*.css"))
    for f in files:
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            for hit in HEX.findall(line):
                problems.append(f"R10: cor literal {hit} em {rel(f)}:{n} (use tokens de {TOKENS_FILE})")


def check_r6_hosts() -> None:
    for target in R6_SCAN:
        for f in text_files(target):
            if rel(f) in R6_ALLOWED_FILES:
                continue
            for n, line in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                low = line.lower()
                for word in R6_FORBIDDEN:
                    if word in low:
                        problems.append(f"R6: '{word}' em {rel(f)}:{n} (host/e-mail fora do código; use settings.yaml + variáveis)")


def local_rule_active(heading: str) -> bool:
    """True when the git-ignored local rules file exists and holds the rule heading at the start of a line."""
    return re.search(rf"^{re.escape(heading)}", read(LOCAL_RULES_FILE), re.M) is not None


def name_hits(text: str) -> list[str]:
    """Forbidden name tokens found in a text (file content or path)."""
    low = text.lower()
    hits = [m.group(0) for m in NAME_WORD.finditer(text)]
    hits += [m.group(0) for m in NAME_GLUED.finditer(text)]
    hits += [m.group(0) for m in NAME_PREFIX.finditer(text)]
    return hits + [word for word in NAME_SUBSTRINGS if word in low]


def check_local_name() -> None:
    """Local rule (only with LOCAL_RULES_FILE): no file name or text file of the project (code, styles, SVG, tests,
    mocks, docs, hooks, k8s) names the institution: alone, glued in camelCase or as the prefix of a longer token.
    Binaries, fonts and lockfiles are skipped; the tool caches and the virtualenv are not part of the project."""
    if not local_rule_active(NAME_RULE_HEADING):
        return
    tag = "regra local (nome da instituição)"
    for f in sorted(ROOT.rglob("*")):
        parts = f.relative_to(ROOT).parts
        if any(p in NAME_SKIP_DIRS for p in parts):
            continue
        name = rel(f)
        for hit in name_hits(f.name):
            problems.append(f"{tag}: nome de arquivo ou pasta com '{hit}': {name} (use nomes convencionais, ex. brand-*)")
        if not f.is_file() or f.suffix.lower() in NAME_BINARY | NAME_LOCKFILES[0] or f.name in NAME_LOCKFILES[1]:
            continue
        data = f.read_bytes()
        if b"\0" in data:
            continue
        for n, line in enumerate(data.decode("utf-8", errors="ignore").splitlines(), 1):
            for hit in name_hits(line):
                problems.append(f"{tag}: '{hit}' em {name}:{n} (use 'a instituição', 'da marca' ou brand-*)")


def check_r3_apis() -> None:
    for f in text_files("src"):
        for n, line in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            for word in R3_FORBIDDEN:
                if word in line:
                    problems.append(f"R3: '{word}' em {rel(f)}:{n} (use seletores st-key-*/data-testid e os pontos de troca de src/core/compat.py)")


def check_r15_pages() -> None:
    index = read("docs/paginas/README.md")
    for page in sorted((ROOT / "src/views").glob("*.py")):
        if page.name in PAGE_EXCLUDED:
            continue
        slug = page.stem
        sheet_path = f"docs/paginas/{slug}.md"
        sheet = read(sheet_path)
        if not sheet:
            problems.append(f"R15: {rel(page)} sem ficha {sheet_path}")
            continue
        if f"{slug}.md" not in index:
            problems.append(f"R15: docs/paginas/README.md não lista {slug}.md")
        for i, name in enumerate(PAGE_SECTIONS, 1):
            if not re.search(rf"^## {i}\. {re.escape(name)}", sheet, re.M):
                problems.append(f"R15: {sheet_path} sem a seção '## {i}. {name}'")
        if f"src/views/{slug}.py" not in sheet:
            problems.append(f"R15: {sheet_path} não cita src/views/{slug}.py")
        expected = sha12(DATA_FILE, rel(page)) if (ROOT / DATA_FILE).is_file() else None
        m = re.search(r"<!-- page-data-hash: ([0-9a-f]{12}) -->", sheet)
        if expected and (not m or m.group(1) != expected):
            msg = f"R15: {sheet_path} carimbo page-data-hash {m.group(1) if m else 'ausente'} ≠ {expected}; revise a ficha e cole o novo"
            (problems if PAGE_HASH_STRICT else warnings).append(msg)


def check_stale_claims() -> None:
    for globs, pattern, why, when in STALE_CLAIMS:
        if not when():
            continue
        rx = re.compile(pattern)
        files = sorted({f for g in globs for f in ROOT.glob(g) if f.is_file()})
        for f in files:
            name = rel(f)
            if name.endswith("changelog.md") or "/decisoes/ADR-" in name:
                continue
            for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
                if rx.search(line) and "histórico" not in line.lower():
                    problems.append(f"afirmação defasada em {name}:{n} ({why})")


CHECKS = [check_required_docs, check_architecture, check_data_contracts, check_dependencies, check_tokens_stamp,
          check_agent_rules, check_adrs, check_r10_colors, check_r6_hosts, check_local_name, check_r3_apis, check_r15_pages,
          check_stale_claims]


def main() -> int:
    for check in CHECKS:
        check()
    for w in warnings:
        print(f"aviso: {w}", file=sys.stderr)
    if problems:
        for p in problems:
            print(f"FALHA: {p}", file=sys.stderr)
        print(f"docs_check: {len(problems)} problema(s) em {len(CHECKS)} verificações")
        return 1
    print(f"docs_check: ok ({len(CHECKS)} verificações, {len(warnings)} aviso(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
