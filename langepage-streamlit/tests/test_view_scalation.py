"""Scalation page (AppTest): a broken "Cascata do resultado" payload from the BFF shows the pt-BR placeholder, never a
traceback (E-009)."""
from __future__ import annotations

import copy

import pytest
from streamlit.testing.v1 import AppTest

from core import data

PAGE = "../src/views/scalation.py"
WATERFALL_ERROR = "Não foi possível carregar os dados da cascata."


def _v1(cascade: dict) -> dict:
    """The internal cascade as the contract v1 sends it (CascataResultado), same values."""
    names = {"period": "periodo", "currency": "moeda", "unitScale": "escalaUnidade"}
    kinds = {"total": "TOTAL", "decrease": "REDUCAO"}
    steps = [{"id": s["id"], "rotulo": s["label"], "tipo": kinds[s["kind"]], "partes": [{"rotulo": p["label"], "valor": p["value"]} for p in s["parts"]]}
             for s in cascade["steps"]]
    return {**{names[k]: v for k, v in cascade.items() if k in names}, "etapas": steps}


def _bff_cascade(monkeypatch, cascade: dict) -> None:
    """BFF mode (contract v1) with the given cascade reply (segments from the mock file)."""
    cards = data.load_json("dashboard-segments.json")
    segments = {"dataReferencia": cards["asOf"], "segmentos": [{"id": c["id"].upper(), "nome": c["label"], "total": c["total"],
                                                                "aClassificar": c["toClassify"], "tendencia": c["trend"]} for c in cards["segments"]]}
    replies = {"/segmentos": segments, "/cascatas-resultado": _v1(cascade)}
    monkeypatch.setattr(data, "use_mock_data", lambda: False)
    monkeypatch.setattr(data.api, "get_json", lambda path, params=None: copy.deepcopy(replies[path]))


def _html_bodies(at: AppTest) -> list[str]:
    bodies = []

    def walk(block) -> None:
        for child in block.children.values():
            if hasattr(child, "children") and type(child).__name__ in ("Block", "Column", "Tab", "Expander"):
                walk(child)
            elif type(child.proto).__name__ == "Html":
                bodies.append(child.proto.body)

    walk(at.main)
    return bodies


def _steps() -> list[dict]:
    return copy.deepcopy(data.load_json("dashboard-waterfall.json")["steps"])


@pytest.mark.parametrize("broken", [
    {"unitScale": 1_000_000},                       # no currency
    {"currency": "BRL"},                            # no unitScale
    {"currency": "BRL", "unitScale": "1000000"},    # unitScale as text
    {"currency": "BRL", "unitScale": None},
    {"currency": "<b>x</b>", "unitScale": 1_000_000},  # not an ISO 4217 code
])
def test_cascade_without_currency_or_numeric_unit_scale_shows_the_placeholder(monkeypatch, broken):
    _bff_cascade(monkeypatch, {"period": "Janeiro a dezembro de 2021", **broken, "steps": _steps()})
    at = AppTest.from_file(PAGE, default_timeout=30).run()
    assert not at.exception
    assert any(WATERFALL_ERROR in body for body in _html_bodies(at))


def test_valid_cascade_from_the_bff_draws_the_chart(monkeypatch):
    _bff_cascade(monkeypatch, {"period": "Janeiro a dezembro de 2021", "currency": "BRL", "unitScale": 1_000_000, "steps": _steps()})
    at = AppTest.from_file(PAGE, default_timeout=30).run()
    assert not at.exception
    assert not any(WATERFALL_ERROR in body for body in _html_bodies(at))


def test_cascade_401_shows_session_expired_with_login_link_and_support_code(monkeypatch):
    from core import api

    _bff_cascade(monkeypatch, {"currency": "BRL", "unitScale": 1, "steps": _steps()})
    replies = {"/cascatas-resultado": api.ApiError("AUTH_REQUIRED", 401, problem_code="AUT-001", trace_id="trace01"),
               "/segmentos": api.ApiError("FORBIDDEN", 403, problem_code="AUT-002")}

    def fake_get_json(path, params=None):
        raise replies[path]

    monkeypatch.setattr(data.api, "get_json", fake_get_json)
    at = AppTest.from_file(PAGE, default_timeout=30).run()
    assert not at.exception
    page = "\n".join(_html_bodies(at))
    assert "Sua sessão expirou. Entre novamente." in page and 'href="/"' in page and "Código de suporte: trace01" in page
    assert "Você não tem acesso a esta informação." in page
    assert WATERFALL_ERROR not in page  # the 401 text replaces the block phrase
