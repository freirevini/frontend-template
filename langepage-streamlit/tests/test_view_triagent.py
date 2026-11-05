"""Triagent page (AppTest) on the contract v1 (ADR-009): the Tabela Analítica pages, sorts and filters on the server
(compat.pager drives `page`), the Excel cap of 5.000 rows, and the 401/403 texts with the support code."""
from __future__ import annotations

import copy
from datetime import date

import pytest
from streamlit.testing.v1 import AppTest

from core import api, data
from core.period import DateRange, build_traffic_period, default_selection

PAGE = "../src/views/triagent.py"
# Excel on demand (E-017): AppTest 1.40 cannot rerun this page (.rules/decisoes.md, gotcha of 2026-11-04), so a click on
# "Gerar Excel" is set as its on_click sets it: the table signature in EXPORT_REQUEST.
EXPORT_BUILD, EXPORT_REQUEST, EXPORT_STATE = "triagent-table-export-build", "triagent-table-xlsx-request", "triagent-table-xlsx"
SEGMENTS = ("ATACADO", "CORPORATIVO", "PLATAFORMA", "VAREJO")
PERIODS = {"DIA": "Day", "MES": "Month", "ANO": "Year"}


def _points(params) -> int:
    bounds = DateRange(date.fromisoformat(params["inicio"]), date.fromisoformat(params["fim"]))
    return len(build_traffic_period(PERIODS[params["granularidade"]], bounds)[0])


def _norma(i: int) -> dict:
    return {"codigo": f"Resolução CMN {5000 + i}", "orgao": "CMN", "tipo": "Resolução", "numero": str(5000 + i), "dataClassificacao": "2021-12-01",
            "segmento": "VAREJO", "tema": "Pix", "aplicavel": True, "area": "Meios de Pagamento", "diretoria": "Operações"}


def _table(total: int):
    def reply(params):
        page, size = int(params["page"]), int(params["size"])
        rows = [_norma(i) for i in range(page * size, min(total, (page + 1) * size))]
        return {"content": rows, "totalElements": total, "totalPages": -(-total // size), "number": page, "size": size}
    return reply


def _by_segment(n=0):
    return [{"segmento": s, "quantidade": n} for s in SEGMENTS]


ROUTES = {
    "/segmentos": lambda p: {"dataReferencia": "2021-12-31", "segmentos": [
        {"id": s, "nome": s.title(), "total": 10, "aClassificar": 2, "tendencia": [1, 2, 3]} for s in SEGMENTS]},
    "/normativos-recebidos": lambda p: {"granularidade": p["granularidade"], "inicio": p["inicio"], "fim": p["fim"], "pontos": ["x"] * _points(p),
                                        "segmentos": [{"segmento": s, "nome": s.title(), "classificadas": [3] * _points(p), "aClassificar": [1] * _points(p)}
                                                      for s in SEGMENTS]},
    "/normas-classificadas/resumo": lambda p: {"dataReferencia": "2021-12-31", "total": 40, "aplicaveis": 30, "naoAplicaveis": 10, "totalTemas": 30,
                                               "temas": [{"tema": "Pix", "quantidade": 30}], "outrosTemas": None},
    "/emails-sugestao/resumo": lambda p: {"dataReferencia": "2021-12-31", "granularidade": p["granularidade"], "inicio": p["inicio"], "fim": p["fim"],
                                          "totalEmails": 0, "totalNormas": 0, "normasDistintas": 0, "mediaNormasPorEmail": 0,
                                          "normasPorSegmento": _by_segment(),
                                          "periodos": [{"inicio": p["inicio"], "fim": p["fim"], "emails": 0, "normasPorSegmento": _by_segment(),
                                                        "totalNormas": 0}] * _points(p)},
    "/emails-sugestao": lambda p: {"content": [], "totalElements": 0, "totalPages": 0, "number": 0, "size": 5},
}


@pytest.fixture
def bff(monkeypatch):
    calls, routes = [], dict(ROUTES)
    routes["/normas-classificadas"] = _table(40)
    monkeypatch.setattr(data, "use_mock_data", lambda: False)

    def fake_get_json(path, params=None):
        calls.append((path, copy.deepcopy(params)))
        reply = routes[path]
        if isinstance(reply, Exception):
            raise reply
        return reply(params)

    monkeypatch.setattr(data.api, "get_json", fake_get_json)
    return calls, routes


def _html(at: AppTest) -> str:
    bodies = []

    def walk(block) -> None:
        for child in block.children.values():
            if hasattr(child, "children") and type(child).__name__ in ("Block", "Column", "Tab", "Expander"):
                walk(child)
            elif type(child.proto).__name__ == "Html":
                bodies.append(child.proto.body)

    walk(at.main)
    return "\n".join(bodies)


def _table_pages(calls) -> list[tuple[str, str]]:
    return [(p["page"], p["size"]) for path, p in calls if path == "/normas-classificadas"]


def _at(**state) -> AppTest:
    """The page with session state set before the run: AppTest 1.40 cannot rerun the page's segmented controls
    (.rules/decisoes.md, gotcha of 2026-11-04), so a page change or a sort is set as the pager/selectbox would set it."""
    at = AppTest.from_file(PAGE, default_timeout=60)
    for key, value in state.items():
        at.session_state[key] = value
    return at.run()


def _signature(sort_key="classifiedAt", sort_dir="desc"):
    """What the page stores to know the filters did not change (otherwise it goes back to page 1)."""
    return (default_selection("Month").bounds, None, None, None, sort_key, sort_dir)


def test_table_pages_on_the_server(bff):
    calls, _ = bff
    at = _at()
    assert not at.exception
    first = next(p for path, p in calls if path == "/normas-classificadas" and p["size"] == "15")
    assert (first["page"], first["sort"]) == ("0", ["dataClassificacao,desc"])
    assert "1–15 de 40" in _html(at)
    assert "Página 1 de 3" in _html(at)
    assert ("0", "100") not in _table_pages(calls)  # the Excel is read only on "Gerar Excel" (E-017)


def test_the_pager_page_is_the_page_asked_to_the_server(bff):
    calls, _ = bff
    at = _at(**{"triagent-table-page": 2, "triagent-table-signature": _signature(), "triagent-table-generation": 1})
    assert not at.exception
    assert ("1", "15") in _table_pages(calls)
    assert "16–30 de 40" in _html(at) and "Página 2 de 3" in _html(at)


def test_a_page_past_the_end_shows_the_last_page(bff):
    calls, _ = bff
    at = _at(**{"triagent-table-page": 9, "triagent-table-signature": _signature(), "triagent-table-generation": 1})
    assert not at.exception
    assert [p for p, size in _table_pages(calls) if size == "15"] == ["8", "2"]
    assert "31–40 de 40" in _html(at)


def test_sort_choice_goes_to_the_server(bff):
    calls, _ = bff
    at = _at(**{"triagent-table-sort": "numero", "triagent-table-dir": "asc"})
    assert not at.exception
    sorts = {tuple(p["sort"]) for path, p in calls if path == "/normas-classificadas"}
    assert sorts == {("numero,asc",)}


def test_more_than_5000_rows_shows_the_limit_text_and_no_export(bff):
    calls, routes = bff
    routes["/normas-classificadas"] = _table(5001)
    at = _at(**{EXPORT_REQUEST: _signature()})  # "Gerar Excel" clicked (E-017: the export is read on demand)
    assert not at.exception
    assert "A tabela tem 5.001 linhas e o Excel aceita até 5.000. Refine os filtros para exportar." in _html(at)
    assert ("1", "100") not in _table_pages(calls)  # stopped after the first page of the export
    assert at.button(key=EXPORT_BUILD).proto.disabled and not at.get("download_button")


def test_401_shows_session_expired_with_the_login_link_and_support_code(bff):
    _, routes = bff
    routes["/segmentos"] = api.ApiError("AUTH_REQUIRED", 401, problem_code="AUT-001", trace_id="4bf92f3577b34da6")
    at = AppTest.from_file(PAGE, default_timeout=60).run()
    assert not at.exception
    page = _html(at)
    assert "Sua sessão expirou. Entre novamente." in page
    assert 'href="/"' in page and "Entrar novamente" in page
    assert "Código de suporte: 4bf92f3577b34da6" in page


def test_403_has_its_own_text_and_never_the_server_message(bff):
    _, routes = bff
    routes["/normativos-recebidos"] = api.ApiError("FORBIDDEN", 403, "Texto técnico do servidor", problem_code="AUT-002")
    at = AppTest.from_file(PAGE, default_timeout=60).run()
    assert not at.exception
    page = _html(at)
    assert "Você não tem acesso a esta informação." in page
    assert "Texto técnico" not in page and "Código de suporte" not in page


def test_table_failure_stays_inside_the_card(bff):
    _, routes = bff
    routes["/normas-classificadas"] = api.ApiError("SERVICE_UNAVAILABLE", 500, trace_id="abc")
    at = AppTest.from_file(PAGE, default_timeout=60).run()
    assert not at.exception
    page = _html(at)
    assert "Não foi possível carregar a tabela analítica." in page and "Código de suporte: abc" in page


# --- Excel on demand (E-017) -------------------------------------------------------------------------------------------------
def _export_pages(calls) -> list[str]:
    return [page for page, size in _table_pages(calls) if size == "100"]


def test_a_plain_run_reads_no_export_page_and_offers_gerar_excel(bff):
    calls, _ = bff
    at = _at(**{"triagent-table-signature": _signature(), "triagent-table-generation": 1})  # a rerun of the same table
    assert not at.exception
    assert _export_pages(calls) == []
    button = at.button(key=EXPORT_BUILD)
    assert button.label == "Gerar Excel" and not button.proto.disabled
    assert not at.get("download_button")


def test_gerar_excel_reads_the_pages_and_offers_baixar_excel_with_the_file(bff):
    calls, routes = bff
    routes["/normas-classificadas"] = _table(250)
    at = _at(**{EXPORT_REQUEST: _signature()})
    assert not at.exception
    assert _export_pages(calls) == ["0", "1", "2"]
    download = at.get("download_button")
    assert len(download) == 1 and download[0].proto.label == "Baixar Excel"
    stored = at.session_state[EXPORT_STATE]
    assert stored["signature"] == _signature() and stored["data"][:2] == b"PK"


def test_the_file_kept_for_the_same_table_is_offered_again_without_reading(bff):
    calls, _ = bff
    kept = {"signature": _signature(), "data": b"PK-file", "note": None, "error": None}
    at = _at(**{EXPORT_STATE: kept, "triagent-table-signature": _signature(), "triagent-table-generation": 1})
    assert not at.exception
    assert _export_pages(calls) == [] and at.get("download_button")[0].proto.label == "Baixar Excel"


def test_a_filter_or_order_change_drops_the_generated_file(bff):
    calls, _ = bff
    kept = {"signature": _signature(), "data": b"PK-file", "note": None, "error": None}
    at = _at(**{EXPORT_STATE: kept, "triagent-table-sort": "numero", "triagent-table-dir": "asc"})
    assert not at.exception
    assert not at.get("download_button") and at.button(key=EXPORT_BUILD).label == "Gerar Excel"
    assert EXPORT_STATE not in at.session_state and _export_pages(calls) == []


def test_a_request_drawn_for_other_filters_is_ignored(bff):
    calls, _ = bff
    at = _at(**{EXPORT_REQUEST: _signature(sort_key="numero")})
    assert not at.exception and _export_pages(calls) == [] and not at.get("download_button")


def test_export_failure_shows_the_excel_error_inside_the_card(bff):
    calls, routes = bff
    table = _table(250)

    def flaky(params):
        if params["size"] == "100" and params["page"] == "1":
            raise api.ApiError("SERVICE_UNAVAILABLE", 500, trace_id="exp1")
        return table(params)

    routes["/normas-classificadas"] = flaky
    at = _at(**{EXPORT_REQUEST: _signature()})
    assert not at.exception
    page = _html(at)
    assert "Não foi possível gerar o arquivo Excel." in page and "Código de suporte: exp1" in page
    assert not at.get("download_button") and not at.button(key=EXPORT_BUILD).proto.disabled  # can be tried again


def test_mock_mode_also_builds_the_excel_only_on_demand(monkeypatch):
    from core import xlsx

    built = []
    original = xlsx.build_xlsx

    def spy(table):
        built.append(table.sheet_name)
        return original(table)

    monkeypatch.setattr(xlsx, "build_xlsx", spy)
    plain = _at()
    assert not plain.exception and "Tabela Analítica" not in built
    asked = _at(**{EXPORT_REQUEST: _signature()})
    assert not asked.exception and built.count("Tabela Analítica") == 1
    assert asked.get("download_button")[-1].proto.label == "Baixar Excel"


# --- Series validated before the page sums them (E-020) ------------------------------------------------------------------------
def test_traffic_with_a_text_point_shows_the_block_error_instead_of_a_traceback(bff):
    _, routes = bff
    good = ROUTES["/normativos-recebidos"]

    def bad(params):
        body = good(params)
        body["segmentos"][1]["classificadas"][0] = "12"
        return body

    routes["/normativos-recebidos"] = bad
    at = AppTest.from_file(PAGE, default_timeout=60).run()
    assert not at.exception
    assert "Não foi possível carregar os normativos recebidos." in _html(at)


def test_segment_trend_with_a_text_point_shows_the_segments_error(bff):
    _, routes = bff
    routes["/segmentos"] = lambda p: {"dataReferencia": "2021-12-31", "segmentos": [
        {"id": s, "nome": s.title(), "total": 10, "aClassificar": 2, "tendencia": [1, "x", 3]} for s in SEGMENTS]}
    at = AppTest.from_file(PAGE, default_timeout=60).run()
    assert not at.exception
    assert "Não foi possível carregar os segmentos." in _html(at)
