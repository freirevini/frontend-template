"""core.api: URL built from settings, forwarded headers, timeout, and errors mapped like chat-api.service.ts."""
import pytest
import requests

from core import api, auth, settings

BASE = "https://bff.example.test"  # reserved test domain, never a real host


class FakeResponse:
    def __init__(self, status=200, body=None, text=None):
        self.status_code = status
        self._body = body
        self.content = (text if text is not None else ("" if body is None else "x")).encode()

    def json(self):
        if self._body is None:
            raise ValueError("no json")
        return self._body


@pytest.fixture
def bff(monkeypatch):
    monkeypatch.setenv("BFF_BASE_URL", BASE + "/")
    settings.settings.cache_clear()
    monkeypatch.setattr(auth, "forward_headers", lambda: {"cookie": "s=1"})
    calls = []
    replies = []

    def fake_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        reply = replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(api.requests, "request", fake_request)
    return calls, replies


def test_get_json_builds_the_url_and_sends_headers_and_timeout(bff):
    calls, replies = bff
    replies.append(FakeResponse(200, {"segments": []}))
    assert api.get_json("/segmentos", {"dataReferencia": "2021-01-01"}) == {"segments": []}
    method, url, kwargs = calls[0]
    assert (method, url) == ("GET", BASE + "/v1/segmentos")
    assert kwargs["params"] == {"dataReferencia": "2021-01-01"}
    assert kwargs["timeout"] == 10.0
    assert kwargs["headers"]["cookie"] == "s=1"
    assert kwargs["headers"][api.REQUEST_ID_HEADER]


def test_post_json_returns_none_for_204(bff):
    calls, replies = bff
    replies.append(FakeResponse(204))
    assert api.post_json("/chat/feedback", {"x": 1}) is None
    assert calls[0][2]["json"] == {"x": 1}


def test_post_multipart_sends_repeated_files_parts_in_order(bff):
    calls, replies = bff
    replies.append(FakeResponse(200, {"files": []}))
    files = [("a.pdf", b"1", "application/pdf"), ("b.png", b"2", "image/png")]
    assert api.post_multipart("/chat/arquivo", {"sessionId": "s"}, files) == {"files": []}
    kwargs = calls[0][2]
    assert kwargs["data"] == {"sessionId": "s"}
    assert kwargs["files"] == [("files", ("a.pdf", b"1", "application/pdf")), ("files", ("b.png", b"2", "image/png"))]


def test_delete(bff):
    calls, replies = bff
    replies.append(FakeResponse(204))
    assert api.delete("/agente/sessoes/abc") is None
    assert calls[0][:2] == ("DELETE", BASE + "/v1/agente/sessoes/abc")


@pytest.mark.parametrize(("reply", "code", "status"), [
    (FakeResponse(404, {"code": "SESSION_NOT_FOUND"}), "SESSION_NOT_FOUND", 404),
    (FakeResponse(413, {"code": "SESSION_QUOTA_EXCEEDED", "message": "ignored"}), "SESSION_QUOTA_EXCEEDED", 413),
    (FakeResponse(400, {"code": "SOMETHING_NEW"}), "SERVICE_UNAVAILABLE", 400),
    (FakeResponse(429), "RATE_LIMITED", 429),
    (FakeResponse(429, {"code": "INVALID_ACTION"}), "INVALID_ACTION", 429),
    (FakeResponse(502, text="<html>bad gateway</html>"), "SERVICE_UNAVAILABLE", 502),
    (requests.ConnectionError("down"), "SERVICE_UNAVAILABLE", 0),
    (requests.Timeout("slow"), "SERVICE_UNAVAILABLE", 0),
])
def test_errors_are_mapped(bff, reply, code, status):
    _, replies = bff
    replies.append(reply)
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/triagent/cascata")
    assert (raised.value.code, raised.value.status) == (code, status)


def test_non_json_success_is_service_unavailable(bff):
    _, replies = bff
    replies.append(FakeResponse(200, text="<html></html>"))
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/triagent/trafego")
    assert raised.value.code == "SERVICE_UNAVAILABLE"


def test_without_bff_configured_nothing_is_called(monkeypatch):
    monkeypatch.setattr(api.requests, "request", lambda *a, **k: pytest.fail("no HTTP in mock mode"))
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/triagent/segmentos")
    assert raised.value.code == "SERVICE_UNAVAILABLE"


def test_relative_path_is_required(bff):
    with pytest.raises(ValueError):
        api.url("triagent/segmentos")


# --- Contract v1: RFC 7807 Problem Details (ADR-009, docs/contratos-de-dados.md §2.4) -----------------------------------------
TRACE = "4bf92f3577b34da6a3ce929d0e0e4736"


def problem(status, code, trace=TRACE, message="Texto técnico do servidor"):
    return FakeResponse(status, {"timestamp": "2026-11-04T10:15:30-03:00", "status": status, "code": code, "message": message,
                                 "details": [{"campo": "fim", "message": "interno"}], "traceId": trace})


@pytest.mark.parametrize(("status", "code", "expected"), [
    (401, "AUT-001", "AUTH_REQUIRED"),
    (403, "AUT-002", "FORBIDDEN"),
    (403, "AUT-003", "SESSION_RENEW"),  # XSRF token missing or stale: its own text (E-016)
    (400, "VAL-001", "INVALID_ACTION"),
    (400, "VAL-005", "INVALID_ACTION"),
    (404, "NEG-002", "SESSION_NOT_FOUND"),
    (413, "VAL-003", "FILE_TOO_LARGE"),
    (413, "VAL-004", "SEND_TOO_LARGE"),
    (415, "VAL-002", "FILE_TYPE_NOT_ALLOWED"),
    (422, "NEG-001", "INVALID_ACTION"),
    (422, "NEG-003", "SESSION_QUOTA_EXCEEDED"),
    (429, "SIS-001", "RATE_LIMITED"),
    (500, "SIS-003", "SERVICE_UNAVAILABLE"),
    (503, "SIS-001", "SERVICE_UNAVAILABLE"),
    (504, "SIS-002", "SERVICE_UNAVAILABLE"),
])
def test_problem_details_are_mapped_by_status_and_code_family(bff, status, code, expected):
    _, replies = bff
    replies.append(problem(status, code))
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/normas-classificadas")
    error = raised.value
    assert (error.code, error.status, error.problem_code, error.trace_id) == (expected, status, code, TRACE)
    assert "Texto técnico" not in str(error)  # the server message is never kept for the screen


def test_gateway_answers_without_body_fall_back_to_the_status(bff):
    _, replies = bff
    replies.extend([FakeResponse(413), FakeResponse(401, text="<html>login</html>"), FakeResponse(403)])
    codes = []
    for _ in range(3):
        with pytest.raises(api.ApiError) as raised:
            api.post_json("/agente/sessoes/s/arquivos")
        codes.append((raised.value.code, raised.value.trace_id))
    assert codes == [("SEND_TOO_LARGE", None), ("AUTH_REQUIRED", None), ("FORBIDDEN", None)]


def test_unknown_problem_code_uses_the_status(bff):
    _, replies = bff
    replies.append(problem(404, "XYZ-999"))
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/segmentos")
    assert (raised.value.code, raised.value.problem_code) == ("SESSION_NOT_FOUND", None)


@pytest.mark.parametrize("trace", ["<script>alert(1)</script>", "a" * 65, "x y", 123])
def test_a_trace_id_that_is_not_a_plain_token_is_dropped(bff, trace):
    _, replies = bff
    replies.append(problem(500, "SIS-003", trace=trace))
    with pytest.raises(api.ApiError) as raised:
        api.get_json("/segmentos")
    assert raised.value.trace_id is None
    assert api.support_code(raised.value) is None


def test_list_params_go_as_repeated_query_values(bff):
    calls, replies = bff
    replies.append(FakeResponse(200, {"content": []}))
    api.get_json("/normas-classificadas", {"sort": ["dataClassificacao,desc"], "page": "0"})
    assert calls[0][2]["params"] == {"sort": ["dataClassificacao,desc"], "page": "0"}


def test_error_texts_for_a_block_never_use_the_server_message(bff):
    fallback = "Não foi possível carregar os segmentos."
    assert api.error_text(api.ApiError("AUTH_REQUIRED", 401), fallback) == "Sua sessão expirou. Entre novamente."
    assert api.error_text(api.ApiError("FORBIDDEN", 403), fallback) == "Você não tem acesso a esta informação."
    assert api.error_text(api.ApiError("RATE_LIMITED", 429), fallback) == api.HTTP_ERROR_TEXTS["rateLimited"]
    assert api.error_text(api.ApiError("SERVICE_UNAVAILABLE", 504), fallback) == api.HTTP_ERROR_TEXTS["timeout"]
    assert api.error_text(api.ApiError("SERVICE_UNAVAILABLE", 0, "down"), fallback) == api.HTTP_ERROR_TEXTS["network"]
    assert api.error_text(api.ApiError("SERVICE_UNAVAILABLE", 500, "Texto técnico"), fallback) == fallback
    assert api.error_text(ValueError("Quantidades inválidas"), fallback) == fallback
    assert api.support_code(api.ApiError("SERVICE_UNAVAILABLE", 500, trace_id=TRACE)) == f"Código de suporte: {TRACE}"
    assert api.support_code(ValueError("x")) is None


def test_login_url_comes_from_settings_with_root_as_default(monkeypatch):
    assert api.login_url() == "/"
    monkeypatch.setenv("AUTH_LOGIN_URL", "/entrar")
    settings.settings.cache_clear()
    assert api.login_url() == "/entrar"


def test_settings_prefix_is_v1_relative_to_the_configured_base_path(bff):
    assert api.url("/segmentos") == BASE + "/v1/segmentos"


# --- XSRF (contract: security scheme `xsrf`) and 403 AUT-003 (E-016) ---------------------------------------------------------
COOKIE = "SESSION=abc; XSRF-TOKEN=tok%2Fen-1; other=x"


@pytest.mark.parametrize("call", [
    lambda: api.post_json("/agente/sessoes"),
    lambda: api.delete("/agente/sessoes/s"),
    lambda: api.post_multipart("/agente/sessoes/s/arquivos", {"passoId": "u"}, [("a.pdf", b"x", "application/pdf")], "arquivos"),
])
def test_unsafe_methods_send_the_xsrf_token_from_the_forwarded_cookie(bff, monkeypatch, call):
    calls, replies = bff
    monkeypatch.setattr(auth, "forward_headers", lambda: {"Cookie": COOKIE})
    replies.append(FakeResponse(202, {"arquivos": []}))
    call()
    assert calls[0][2]["headers"][api.XSRF_HEADER] == "tok/en-1"


def test_get_and_a_cookie_without_the_token_send_no_xsrf_header(bff, monkeypatch):
    calls, replies = bff
    replies.extend([FakeResponse(200, {}), FakeResponse(204)])
    monkeypatch.setattr(auth, "forward_headers", lambda: {"cookie": COOKIE})
    api.get_json("/segmentos")
    monkeypatch.setattr(auth, "forward_headers", lambda: {"cookie": "SESSION=abc"})
    api.post_json("/agente/sessoes")
    assert api.XSRF_HEADER not in calls[0][2]["headers"] and api.XSRF_HEADER not in calls[1][2]["headers"]


def test_xsrf_token_reads_only_the_named_cookie():
    assert api.xsrf_token("a=1; XSRF-TOKEN=v") == "v"
    assert api.xsrf_token("X-XSRF-TOKEN=no; XSRF-TOKENX=no") is None
    assert api.xsrf_token(None) is None and api.xsrf_token("XSRF-TOKEN=") is None


def test_403_aut_003_asks_to_reload_the_page_and_other_403_keep_forbidden(bff):
    _, replies = bff
    replies.extend([problem(403, "AUT-003"), problem(403, "AUT-002")])
    errors = []
    for _ in range(2):
        with pytest.raises(api.ApiError) as raised:
            api.post_json("/agente/sessoes")
        errors.append(raised.value)
    fallback = "Não foi possível carregar os segmentos."
    assert api.error_text(errors[0], fallback) == "Sua sessão precisa ser renovada. Recarregue a página."
    assert api.error_text(errors[1], fallback) == "Você não tem acesso a esta informação."


def test_retry_after_seconds_are_kept_on_the_error(bff):
    _, replies = bff
    limited, dated = problem(429, "SIS-001"), problem(429, "SIS-001")
    limited.headers, dated.headers = {"Retry-After": "7"}, {"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}
    replies.extend([limited, dated])
    found = []
    for _ in range(2):
        with pytest.raises(api.ApiError) as raised:
            api.get_json("/agente/sessoes/s/arquivos/f1")
        found.append(raised.value.retry_after)
    assert found == [7.0, None]
