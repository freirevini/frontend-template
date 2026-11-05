"""scripts/docs_check.py: the name check of the local rules file. The forbidden acronym is built from parts here too, so
this file never contains it; the rule heading comes from the script (never written in a versioned file)."""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "docs_check.py"
ACR = "b" + "v"


@pytest.fixture
def docs_check(monkeypatch):
    spec = importlib.util.spec_from_file_location("docs_check_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, "problems", [])
    return module


@pytest.mark.parametrize("token", [ACR + "js-theme-probe", "st-key-" + ACR + "js-", "window." + ACR + "Theme.setMode", ACR.upper() + "Theme",
                                   ACR.capitalize() + "js", '"' + ACR + "js-{key}"],
                         ids=["container-key", "css-selector", "js-global", "upper-theme", "capitalized-js", "f-string-key"])
def test_acronym_glued_as_a_prefix_is_caught(docs_check, token):
    assert docs_check.name_hits(token)  # E-021: these passed before the prefix pattern


@pytest.mark.parametrize("text", ["brandjs-theme-probe", "window.brandTheme", "obvious", "sub" + ACR + "x", "x" + ACR.upper() + "y" + ACR + "z"],
                         ids=["brand-key", "brand-global", "english-word", "inside-word", "inside-camel-case"])
def test_neutral_names_and_the_letters_inside_a_word_pass(docs_check, text):
    assert docs_check.name_hits(text) == []


def test_planted_tokens_fail_the_check_and_lockfiles_are_skipped(docs_check, monkeypatch, tmp_path):
    (tmp_path / ".rules").mkdir()
    (tmp_path / ".rules" / "local.md").write_text(docs_check.NAME_RULE_HEADING + " x\n", encoding="utf-8")
    (tmp_path / "app.css").write_text('[class*="st-key-' + ACR + 'js-"] iframe {}\n', encoding="utf-8")
    (tmp_path / "theme.js").write_text("global." + ACR + "Theme = {};\n", encoding="utf-8")
    (tmp_path / "uv.lock").write_text('name = "' + ACR + 'xpkg"\n', encoding="utf-8")
    (tmp_path / "package-lock.json").write_text('{"' + ACR + 'xpkg": 1}\n', encoding="utf-8")
    monkeypatch.setattr(docs_check, "ROOT", tmp_path)
    docs_check.check_local_name()
    flagged = sorted({p.split(" em ")[1].split(":")[0] for p in docs_check.problems})
    assert flagged == ["app.css", "theme.js"]
