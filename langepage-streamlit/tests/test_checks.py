"""checks/ (visual checks, manual): the app address is an argument or CHECK_BASE_URL, never a versioned host (E-023)."""
from __future__ import annotations

import importlib.util
import re
from pathlib import Path

import pytest

CHECKS = Path(__file__).resolve().parents[1] / "checks"
LOOPBACK_LITERALS = re.compile(r"localhost|127\.0\.0\.1|:\d{4}\b")


@pytest.fixture
def shoot():
    spec = importlib.util.spec_from_file_location("shoot_under_test", CHECKS / "shoot.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_no_check_script_has_a_host_or_port_in_the_code():
    for script in sorted(CHECKS.glob("*.py")):
        for n, line in enumerate(script.read_text(encoding="utf-8").splitlines(), 1):
            assert not LOOPBACK_LITERALS.search(line), f"{script.name}:{n}: {line.strip()}"


def test_base_url_comes_from_the_argument_or_the_environment(shoot, monkeypatch):
    monkeypatch.setenv("CHECK_BASE_URL", "https://painel.example.test/")
    assert shoot.base_url(["shoot.py"]) == "https://painel.example.test"
    assert shoot.base_url(["shoot.py", "https://outro.example.test"]) == "https://outro.example.test"


def test_without_argument_or_variable_the_check_stops_with_a_pt_br_hint(shoot, monkeypatch):
    monkeypatch.delenv("CHECK_BASE_URL", raising=False)
    with pytest.raises(SystemExit) as stopped:
        shoot.base_url(["shoot.py"])
    assert "CHECK_BASE_URL" in str(stopped.value)
