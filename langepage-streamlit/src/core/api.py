"""Only door to the BFF (R4): settings bff.base_url + prefix (/v1) + relative resource path. No invented endpoint.

Contract v1 (ADR-009): source of truth is the Angular landing's docs/contratos/openapi-agenda-normativa-v1.yaml;
bff.base_url is the BFF API base path (what the Ingress routes as /api), so a call to "/segmentos" reaches
<base_url>/v1/segmentos. Signatures (the data layer and the chat rely on them):

- class ApiError(Exception): code (UI code, below), status (0 = no HTTP answer), problem_code (VAL-001...), trace_id
- get_json(path: str, params: dict | None = None) -> dict          # list values go as repeated parameters (sort)
- post_json(path: str, body: dict | None = None) -> dict | None     # None for 204
- post_multipart(path: str, fields: dict[str, str], files: list[tuple[str, bytes, str]], file_field="files") -> dict
      files: (filename, content, mime); sent as repeated parts of `file_field` (v1: "arquivos"), in order
- delete(path: str) -> None
All calls: timeout from settings, headers from core.auth.forward_headers(), errors parsed as RFC 7807 Problem Details
(status, code, traceId; the server `message`/`details` are never kept for the screen) and mapped by HTTP status and code
family (docs/contratos-de-dados.md §2.4): 401 -> AUTH_REQUIRED, 403 -> FORBIDDEN (403 AUT-003, XSRF token missing or
stale -> SESSION_RENEW), the chat codes for the rest. POST/DELETE (multipart too) carry X-XSRF-TOKEN copied from the
XSRF-TOKEN cookie the gateway forwarded (contract: security scheme `xsrf`, as Angular's HttpClient does).
"""
from __future__ import annotations

import re
import uuid
from typing import Any, Optional
from urllib.parse import unquote

import requests

from core import auth
from core.settings import bff_base_url, settings

# Internal codes (ChatErrorCode of chat.model.ts). A body carrying one of them is the pre-v1 shape (mocks, older tests):
# it is still honoured; the v1 BFF answers Problem Details instead (docs/contratos-de-dados.md §2.4).
KNOWN_CODES = frozenset({
    "INVALID_ACTION", "SESSION_NOT_FOUND", "FILE_TYPE_NOT_ALLOWED", "FILE_TOO_LARGE", "SESSION_QUOTA_EXCEEDED",
    "RATE_LIMITED", "SERVICE_UNAVAILABLE",
})
AUTH_REQUIRED, FORBIDDEN, SEND_TOO_LARGE = "AUTH_REQUIRED", "FORBIDDEN", "SEND_TOO_LARGE"
SESSION_RENEW = "SESSION_RENEW"  # 403 AUT-003: the XSRF token is missing or stale; a page reload gets a fresh cookie
XSRF_COOKIE, XSRF_HEADER = "XSRF-TOKEN", "X-XSRF-TOKEN"
XSRF_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
REQUEST_ID_HEADER = "x-request-id"
PROBLEM_CODE = re.compile(r"^(VAL|AUT|NEG|SIS)-\d{3}$")
# The trace id goes to the screen as the support code: only a plain token is kept (W3C trace ids are 32 hex digits).
TRACE_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")

# --- pt-BR texts for HTTP failures (constants; never the server message) -----------------------------------------------
HTTP_ERROR_TEXTS = {
    "authRequired": "Sua sessão expirou. Entre novamente.",
    "forbidden": "Você não tem acesso a esta informação.",
    "sessionRenew": "Sua sessão precisa ser renovada. Recarregue a página.",
    "badRequest": "Não foi possível processar o pedido. Confira os filtros e tente novamente.",
    "notFound": "A informação pedida não foi encontrada.",
    "rateLimited": "Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente.",
    "serverError": "Não foi possível carregar os dados agora. Tente novamente em instantes.",
    "timeout": "O servidor demorou a responder. Tente novamente em instantes.",
    "network": "Sem conexão com o servidor. Verifique a rede e tente novamente.",
}
LOGIN_LINK_TEXT = "Entrar novamente"
SUPPORT_CODE_TEXT = "Código de suporte: {traceId}"
EXPORT_LIMIT = 5000
EXPORT_LIMIT_TEXT = "A tabela tem {total} linhas e o Excel aceita até 5.000. Refine os filtros para exportar."


class ApiError(Exception):
    """A BFF call that failed. `code` is what the UI reads (never the server message); `status` 0 = no HTTP answer;
    `problem_code` is the chassis code of the Problem Details (VAL-001...); `trace_id` is shown as the support code;
    `retry_after` is the Retry-After header in seconds (429/503), None when absent or not a number of seconds."""

    def __init__(self, code: str, status: int = 0, message: Optional[str] = None, problem_code: Optional[str] = None,
                 trace_id: Optional[str] = None, retry_after: Optional[float] = None):
        super().__init__(message or f"{code} ({status})")
        self.code = code
        self.status = status
        self.problem_code = problem_code
        self.trace_id = trace_id
        self.retry_after = retry_after


def code_for(status: int, problem_code: Optional[str]) -> str:
    """UI code from the HTTP status and the code family (table of docs/contratos-de-dados.md §2.4/§9.3).

    An unknown or absent code falls back to what the status means; the gateway may answer 413/429 without a body."""
    family = problem_code[:3] if problem_code and PROBLEM_CODE.match(problem_code) else None
    if status == 401:
        return AUTH_REQUIRED
    if status == 403:
        return SESSION_RENEW if problem_code == "AUT-003" else FORBIDDEN
    if status == 400:
        return "INVALID_ACTION" if family == "VAL" else "SERVICE_UNAVAILABLE"
    if status == 404:
        return "SESSION_NOT_FOUND"
    if status == 413:
        return "FILE_TOO_LARGE" if problem_code == "VAL-003" else SEND_TOO_LARGE
    if status == 415:
        return "FILE_TYPE_NOT_ALLOWED"
    if status == 422:
        return "SESSION_QUOTA_EXCEEDED" if problem_code == "NEG-003" else "INVALID_ACTION"
    if status == 429:
        return "RATE_LIMITED"
    return "SERVICE_UNAVAILABLE"


def error_text(error: BaseException, fallback: str) -> str:
    """Text for a block that failed to load: the block's own phrase, except where the status says something specific
    (401 session expired, 403, 429, 504, no connection); any non-HTTP failure (validation) keeps the block phrase."""
    if not isinstance(error, ApiError):
        return fallback
    if error.code == AUTH_REQUIRED:
        return HTTP_ERROR_TEXTS["authRequired"]
    if error.code == SESSION_RENEW:
        return HTTP_ERROR_TEXTS["sessionRenew"]
    by_status = {403: "forbidden", 429: "rateLimited", 504: "timeout"}
    if error.status in by_status:
        return HTTP_ERROR_TEXTS[by_status[error.status]]
    if error.status == 0 and bff_base_url():
        return HTTP_ERROR_TEXTS["network"]
    return fallback


def support_code(error: BaseException) -> Optional[str]:
    """'Código de suporte: <traceId>' when the failed answer carried a trace id, else None."""
    trace = getattr(error, "trace_id", None)
    return SUPPORT_CODE_TEXT.format(traceId=trace) if isinstance(error, ApiError) and trace else None


def needs_login(error: BaseException) -> bool:
    return isinstance(error, ApiError) and error.code == AUTH_REQUIRED


def login_url() -> str:
    """Where "Entrar novamente" goes (auth.login_url, default "/"): reloading through the gateway re-authenticates."""
    return str((settings().get("auth") or {}).get("login_url") or "/").strip() or "/"


def url(path: str) -> str:
    """bff.base_url + prefix + path; raises when no BFF is configured (mock mode must not reach here)."""
    base = bff_base_url()
    if not base:
        raise ApiError("SERVICE_UNAVAILABLE", 0, "BFF não configurado (bff.base_url vazio).")
    if not path.startswith("/"):
        raise ValueError(f"Caminho relativo deve começar por '/': {path}")
    prefix = "/" + str(settings()["bff"].get("prefix") or "").strip("/")
    return f"{base}{prefix.rstrip('/')}{path}"


def _timeout() -> float:
    return float(settings()["bff"].get("timeout_seconds") or 10)


def xsrf_token(cookie_header: Optional[str]) -> Optional[str]:
    """Value of the XSRF-TOKEN cookie in a Cookie header (URL-decoded, as Angular's cookie reader), None when absent."""
    for part in (cookie_header or "").split(";"):
        name, sep, value = part.strip().partition("=")
        if sep and name == XSRF_COOKIE and value:
            return unquote(value.strip().strip('"'))
    return None


def _headers(method: str = "GET") -> dict:
    headers = dict(auth.forward_headers())
    headers[REQUEST_ID_HEADER] = uuid.uuid4().hex
    headers.setdefault("accept", "application/json")
    if method.upper() in XSRF_METHODS:
        cookie = next((v for k, v in headers.items() if k.lower() == "cookie"), None)
        token = xsrf_token(cookie)
        if token:
            headers[XSRF_HEADER] = token
    return headers


def _retry_after(response: requests.Response) -> Optional[float]:
    """Retry-After in seconds (the HTTP-date form is not used by the gateway and is ignored)."""
    raw = str((getattr(response, "headers", None) or {}).get("Retry-After") or "").strip()
    return float(raw) if raw.isdigit() else None


def parse_problem(response: requests.Response) -> tuple[Optional[str], Optional[str]]:
    """(code, traceId) of an RFC 7807 body; (None, None) for no body, HTML from a proxy or anything not an object.
    `message` and `details` are deliberately not read: the screen never shows server text."""
    try:
        body = response.json()
    except ValueError:
        return None, None
    if not isinstance(body, dict):
        return None, None
    code, trace = body.get("code"), body.get("traceId")
    return (code if isinstance(code, str) else None), (trace if isinstance(trace, str) and TRACE_ID.match(trace) else None)


def _error_from(response: requests.Response) -> ApiError:
    """Problem Details -> ApiError: 401/403 always by status; a pre-v1 internal code in the body is honoured; otherwise
    the status and the code family decide (code_for)."""
    status = response.status_code
    code, trace = parse_problem(response)
    retry_after = _retry_after(response)
    if status not in (401, 403) and code in KNOWN_CODES:
        return ApiError(code, status, trace_id=trace, retry_after=retry_after)
    problem = code if code and PROBLEM_CODE.match(code) else None
    return ApiError(code_for(status, problem), status, problem_code=problem, trace_id=trace, retry_after=retry_after)


def _request(method: str, path: str, **kwargs: Any) -> requests.Response:
    try:
        response = requests.request(method, url(path), headers=_headers(method), timeout=_timeout(), **kwargs)
    except requests.RequestException as error:  # network down, timeout, DNS: no HTTP status
        raise ApiError("SERVICE_UNAVAILABLE", 0, str(error)) from error
    if not 200 <= response.status_code < 300:
        raise _error_from(response)
    return response


def _json(response: requests.Response) -> Any:
    if response.status_code == 204 or not response.content:
        return None
    try:
        return response.json()
    except ValueError as error:
        raise ApiError("SERVICE_UNAVAILABLE", response.status_code, "Resposta do BFF não é JSON.") from error


def get_json(path: str, params: Optional[dict] = None) -> dict:
    body = _json(_request("GET", path, params=params or {}))
    if not isinstance(body, dict):
        raise ApiError("SERVICE_UNAVAILABLE", 200, "Resposta do BFF sem objeto JSON.")
    return body


def post_json(path: str, body: Optional[dict] = None) -> Optional[dict]:
    return _json(_request("POST", path, json=body))


def post_multipart(path: str, fields: dict[str, str], files: list[tuple[str, bytes, str]], file_field: str = "files") -> dict:
    parts = [(file_field, (name, content, mime)) for name, content, mime in files]
    body = _json(_request("POST", path, data=fields, files=parts))
    if not isinstance(body, dict):
        raise ApiError("SERVICE_UNAVAILABLE", 200, "Resposta do BFF sem objeto JSON.")
    return body


def delete(path: str) -> None:
    _request("DELETE", path)
