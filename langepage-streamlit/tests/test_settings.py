"""core.settings (R6): booleans accepted in pt-BR and English, anything else refused at startup; production (ENV=prd)
fails closed on mock identity, mock chat or no BFF; the entry point shows only a generic pt-BR text (E-011)."""
from __future__ import annotations

import pytest
from streamlit.testing.v1 import AppTest

from core import settings

APP = "../src/app.py"
CONFIG_ERROR = "Não foi possível iniciar a Agenda Normativa. Contate o suporte."
PRD = {"ENV": "prd", "AUTH_MODE": "gateway", "BFF_BASE_URL": "https://bff.example.test", "CHAT_MOCK": "false"}


@pytest.fixture
def env(monkeypatch):
    """Sets the environment variables read by settings.yaml (only these; the rest keep the file defaults)."""
    for name in ("ENV", "AUTH_MODE", "BFF_BASE_URL", "CHAT_MOCK"):
        monkeypatch.delenv(name, raising=False)

    def apply(**values: str) -> None:
        for name, value in values.items():
            monkeypatch.setenv(name, value)
        settings.settings.cache_clear()

    yield apply
    settings.settings.cache_clear()


def test_dev_defaults_still_load(env):
    env()
    cfg = settings.settings()
    assert cfg["environment"] == "des" and cfg["auth"]["mode"] == "mock"
    assert cfg["chat"]["mock"] is True
    assert settings.use_mock_data() and settings.chat_mock()


@pytest.mark.parametrize("raw, expected", [
    ("true", True), ("TRUE", True), ("1", True), ("sim", True), ("Sim", True), ("yes", True), ("on", True), (" On ", True),
    ("false", False), ("False", False), ("0", False), ("não", False), ("NÃO", False), ("nao", False), ("no", False), ("off", False),
])
def test_boolean_keys_accept_pt_br_and_english_spellings(env, raw, expected):
    env(CHAT_MOCK=raw)
    assert settings.settings()["chat"]["mock"] is expected


@pytest.mark.parametrize("raw", ["talvez", "2", "verdadeiro", "", "nope"])
def test_unknown_boolean_value_is_refused_at_startup(env, raw):
    env(CHAT_MOCK=raw)
    with pytest.raises(settings.SettingsError, match="chat.mock"):
        settings.settings()


def test_chat_mock_false_with_a_bff_turns_the_mock_off(env):
    env(CHAT_MOCK="0", BFF_BASE_URL="https://bff.example.test")
    assert settings.chat_mock() is False


def test_production_with_gateway_bff_and_real_chat_loads(env):
    env(**PRD)
    assert settings.settings()["environment"] == "prd"
    env(**{**PRD, "ENV": "PRD", "AUTH_MODE": "oidc"})
    assert settings.settings()["auth"]["mode"] == "oidc"


@pytest.mark.parametrize("override, reason", [
    ({"AUTH_MODE": "mock"}, "auth.mode"),
    ({"AUTH_MODE": "none"}, "auth.mode"),
    ({"AUTH_MODE": "MOCK"}, "auth.mode"),
    ({"CHAT_MOCK": "true"}, "chat.mock"),
    ({"CHAT_MOCK": "sim"}, "chat.mock"),
    ({"BFF_BASE_URL": ""}, "bff.base_url"),
    ({"BFF_BASE_URL": "   "}, "bff.base_url"),
    ({"ENV": "Prd", "AUTH_MODE": "mock"}, "auth.mode"),
])
def test_production_fails_closed(env, override, reason):
    env(**{**PRD, **override})
    with pytest.raises(settings.SettingsError, match=reason):
        settings.settings()


def test_production_without_any_variable_but_env_fails_closed(env):
    env(ENV="prd")  # file defaults: mock identity, mock chat, no BFF
    with pytest.raises(settings.SettingsError) as info:
        settings.settings()
    assert all(key in str(info.value) for key in ("auth.mode", "chat.mock", "bff.base_url"))


@pytest.mark.parametrize("variables", [{"ENV": "prd"}, {"CHAT_MOCK": "talvez"}])
def test_app_refuses_to_start_with_a_generic_pt_br_message(env, variables):
    env(**variables)
    at = AppTest.from_file(APP, default_timeout=30).run()
    assert not at.exception
    assert [e.value for e in at.error] == [CONFIG_ERROR]
    shown = " ".join(str(e.value) for e in at.error) + " ".join(str(m.value) for m in at.markdown)
    assert "auth.mode" not in shown and "chat.mock" not in shown and "bff" not in shown.lower()


# --- Environment allow-list, uat as strict as prd for identity and chat, chat.mock default (E-015) ---------------------------
UAT = {"ENV": "uat", "AUTH_MODE": "gateway", "CHAT_MOCK": "false"}


@pytest.mark.parametrize("value", ["dev", "hml", "production", "", "  ", "prd2"])
def test_unknown_environment_is_refused_at_startup(env, value):
    env(ENV=value)
    with pytest.raises(settings.SettingsError, match="environment"):
        settings.settings()


@pytest.mark.parametrize("value, expected", [("des", "des"), ("UAT", "uat"), (" Prd ", "prd")])
def test_known_environments_load_normalized(env, value, expected):
    env(**{**PRD, "ENV": value})
    assert settings.settings()["environment"] == expected


@pytest.mark.parametrize("override, reason", [
    ({"AUTH_MODE": "mock"}, "auth.mode"),
    ({"AUTH_MODE": "none"}, "auth.mode"),
    ({"CHAT_MOCK": "true"}, "chat.mock"),
])
def test_uat_fails_closed_on_fake_identity_or_simulated_chat(env, override, reason):
    env(**{**UAT, **override})
    with pytest.raises(settings.SettingsError, match=reason):
        settings.settings()


def test_uat_with_gateway_and_real_chat_loads(env):
    env(**UAT, BFF_BASE_URL="https://bff.example.test")
    assert settings.settings()["environment"] == "uat" and settings.chat_mock() is False


def _without_chat_mock(tmp_path, monkeypatch):
    text = (settings.ROOT / "settings.yaml").read_text(encoding="utf-8")
    lines = [line for line in text.splitlines() if not line.strip().startswith("mock: ${CHAT_MOCK")]
    assert len(lines) == len(text.splitlines()) - 1
    (tmp_path / "settings.yaml").write_text("\n".join(lines), encoding="utf-8")
    monkeypatch.setattr(settings, "ROOT", tmp_path)


@pytest.mark.parametrize("variables, expected", [
    ({"ENV": "des"}, True),
    ({"ENV": "uat", "AUTH_MODE": "gateway", "BFF_BASE_URL": "https://bff.example.test"}, False),
    (PRD, False),
])
def test_missing_chat_mock_defaults_by_environment(env, tmp_path, monkeypatch, variables, expected):
    _without_chat_mock(tmp_path, monkeypatch)
    env(**variables)
    assert settings.settings()["chat"]["mock"] is expected
    assert settings.chat_mock() is (expected or not variables.get("BFF_BASE_URL"))
