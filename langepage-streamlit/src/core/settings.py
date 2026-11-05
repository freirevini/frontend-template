"""Application settings from settings.yaml with ${VAR:default} substitution (R6: no host in code)."""
from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
_VAR = re.compile(r"\$\{([A-Z0-9_]+):?([^}]*)\}")


def _expand(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _expand(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand(v) for v in value]
    if isinstance(value, str):
        text = _VAR.sub(lambda m: os.environ.get(m.group(1), m.group(2)), value)
        if text.lower() in ("true", "false"):
            return text.lower() == "true"
        return text
    return value


class SettingsError(ValueError):
    """Configuration the app refuses to run with (fail closed). The message names keys, never a URL or a secret."""


# Keys read as booleans; the value usually comes from a ConfigMap as text (CHAT_MOCK=sim).
BOOLEAN_KEYS = (("chat", "mock"),)
_TRUE = frozenset({"true", "1", "sim", "yes", "on"})
_FALSE = frozenset({"false", "0", "não", "nao", "no", "off"})
ENVIRONMENTS = ("des", "uat", "prd")  # anything else (typo, "dev", empty) refuses to start: never a silent default
PRODUCTION = "prd"
STRICT_ENVIRONMENTS = frozenset({"uat", PRODUCTION})  # real identity and real chat (AGENTS.md, "Ambientes")
PRODUCTION_AUTH_MODES = frozenset({"gateway", "oidc"})  # none/mock show a fake identity: never in uat/prd
ENVIRONMENT_NAMES = {"uat": "homologação", PRODUCTION: "produção"}


def parse_bool(value: Any, key: str) -> bool:
    """true/false/1/0/sim/não/nao/yes/no/on/off, any case; anything else is a startup error, never a silent default."""
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower() if isinstance(value, (str, int)) else None
    if text in _TRUE:
        return True
    if text in _FALSE:
        return False
    raise SettingsError(f"{key}: valor booleano inválido; use true/false, 1/0, sim/não, yes/no ou on/off.")


def _environment(cfg: dict) -> str:
    """environment from the allow-list (any case); anything else is a startup error."""
    env = str(cfg.get("environment") or "").strip().lower()
    if env not in ENVIRONMENTS:
        raise SettingsError(f"environment precisa ser {', '.join(ENVIRONMENTS)}.")
    return env


def _check_environment(cfg: dict, env: str) -> None:
    """uat and prd: identity from the gateway and the real chat; prd also needs the BFF."""
    if env not in STRICT_ENVIRONMENTS:
        return
    problems = []
    if str((cfg.get("auth") or {}).get("mode") or "").strip().lower() not in PRODUCTION_AUTH_MODES:
        problems.append("auth.mode precisa ser gateway ou oidc")
    if (cfg.get("chat") or {}).get("mock"):
        problems.append("chat.mock precisa ser false")
    if env == PRODUCTION and not str((cfg.get("bff") or {}).get("base_url") or "").strip():
        problems.append("bff.base_url não pode ficar vazio")
    if problems:
        raise SettingsError(f"Configuração recusada em {ENVIRONMENT_NAMES[env]} (environment={env}): {'; '.join(problems)}.")


@lru_cache(maxsize=1)
def settings() -> dict:
    """settings.yaml expanded; raises SettingsError (not cached: every call raises) for a configuration that must not run."""
    raw = yaml.safe_load((ROOT / "settings.yaml").read_text(encoding="utf-8"))
    cfg = _expand(raw)
    env = cfg["environment"] = _environment(cfg)
    for section, key in BOOLEAN_KEYS:
        if (cfg.get(section) or {}).get(key) is not None:  # absent or YAML null: the default below decides
            cfg[section][key] = parse_bool(cfg[section][key], f"{section}.{key}")
    # chat.mock left out of a mounted settings.yaml: simulated only in des, never a KeyError in chat_mock().
    chat = cfg["chat"] = cfg.get("chat") if isinstance(cfg.get("chat"), dict) else {}
    if chat.get("mock") is None:
        chat["mock"] = env == "des"
    _check_environment(cfg, env)
    return cfg


def bff_base_url() -> str:
    return (settings()["bff"].get("base_url") or "").rstrip("/")


def use_mock_data() -> bool:
    """No BFF configured: the pages read the JSON mocks in data/ (same files as the Angular src/assets/data)."""
    return not bff_base_url()


def chat_mock() -> bool:
    return bool(settings()["chat"]["mock"]) or use_mock_data()
