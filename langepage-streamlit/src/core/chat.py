"""Agente da Agenda: the floating assistant chat (port of src/app/chat/ of the Angular landing).

Layers, top to bottom of this file:
- texts and limits (chat-texts.ts, chat.model.ts), pure helpers (safe-markdown.ts, chat-format.ts, chat-greeting.ts,
  chat-farewell.ts, chat-file.ts, chat-file-results.ts, chat-norms-export.ts, chat-suggestions.ts);
- ChatMockServer (chat-mock-server.ts): plays the BFF while it does not exist, with requestId idempotency and cancel;
- backends (chat-api.service.ts): the mock or the BFF contract v1 `/agente/sessoes/...` (ADR-009) through core.api, with
  the v1 <-> internal adapters, documents through quarantine (202 + polling) and errors as ChatRequestError;
- the conversation controller (chat-session.service.ts), synchronous: no typing effect and no "Parar" (plan D5);
- rendering: floating button + st.popover panel (chat-widget, chat-messages, chat-input components).

The conversation lives in st.session_state (browser session, server memory), like the Angular service keeps it in
memory; nothing goes to browser storage. Text from the BFF reaches the page only through safe_markdown() or escape_html().
"""
from __future__ import annotations

import re
import secrets
import time
import unicodedata
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Callable, Iterable, Optional, Protocol
from urllib.parse import quote

import streamlit as st

from core.settings import DATA_DIR, chat_mock, settings
from core.xlsx import XLSX_MIME, XlsxColumn, XlsxTable, build_xlsx

# --- Texts (chat-texts.ts, pt-BR, glossary terms) ---------------------------------------------------------------------------
TEXTS: dict[str, Any] = dict(
    agentName="Agente da Agenda",
    userName="Você",
    open="Abrir Agente da Agenda",
    openConversation="Abrir Agente da Agenda (conversa em andamento)",
    minimize="Minimizar Agente da Agenda",
    expand="Expandir Agente da Agenda",
    collapse="Reduzir Agente da Agenda",
    title="Agente da Agenda",
    inputPlaceholder="Digite sua pergunta",
    inputLabel="Mensagem para o Agente da Agenda",
    send="Enviar",
    stop="Parar",
    attach="Anexar documentos",
    restart="Recomeçar",
    back="Voltar",
    end="Encerrar",
    farewell="Foi um prazer ajudar! Obrigado por usar o Agente da Agenda. Se precisar de algo mais, é só recomeçar a conversa. Até logo!",
    scrollToEnd="Ir para o fim",
    retry="Tentar novamente",
    sources="Fontes",
    contacts="Fale com a equipe responsável",
    typing="O Agente da Agenda está digitando",
    messagesLabel="Conversa com o Agente da Agenda",
    characters="caracteres",
    feedbackQuestion="Esta resposta ajudou?",
    feedbackUseful="Útil",
    feedbackNotUseful="Não útil",
    feedbackThanks="Obrigado pelo feedback.",
    feedbackFailed="Não foi possível enviar o feedback. Tente novamente.",
    clarify="Para continuar, preciso saber:",
    fileRejected="Documento não aceito",
    fileAccepted="Documento aceito",
    newMessages="Novas mensagens",
    optionsLabel="Opções",
    suggestions="Sugestões de resposta",
    uploadHint="PDF, Word (DOC ou DOCX), PNG, JPG ou WEBP; até 5 arquivos e 9 MB por envio, 20 MB por conversa.",
    fileChecking="Verificando o documento...",
    filesChecking="Verificando os documentos...",
    fileRejectedUnsafe="Recusado na verificação de segurança",
    loginLink="Entrar novamente",
    supportCode="Código de suporte: {traceId}",
    pasteHint="Para enviar um print copiado, cole com Ctrl+V.",
    pastedImage="imagem-colada",
    fileEmpty="O arquivo está vazio.",
    fileTooMany="Passou do limite de arquivos por envio; este não foi enviado.",
    fileResultsTitle="Resultado da avaliação dos documentos",
    fileResultsSheet="Documentos",
    fileColumnName="Arquivo",
    fileColumnResult="Resultado",
    fileColumnNorm="Norma identificada",
    fileColumnIssuer="Emissor",
    fileColumnKind="Tipo de documento",
    fileColumnNote="Observação",
    fileKinds={"norma_integral": "Norma completa", "trecho_norma": "Trecho de norma"},
    sessionExpired="A conversa expirou por inatividade. Vamos recomeçar.",
    normsFilter="Filtrar por segmento",
    normsAll="Todos",
    normsShowTable="Ver em formato tabela",
    normsShowList="Ver em formato lista",
    normsExport="Extrair em Excel",
    normsExporting="Gerando arquivo...",
    normsExportFailed="Não foi possível gerar o arquivo Excel.",
    normsSheet="Normas",
    normsDate="Data",
    normsColumnTitle="Norma",
    normsColumnDetail="Observação",
    normsColumnSegment="Segmento",
    askAbout="Perguntar ao Agente da Agenda sobre",
    goodMorning="Bom dia",
    goodAfternoon="Boa tarde",
    goodEvening="Boa noite",
)

ERROR_CODES = ("INVALID_ACTION", "SESSION_NOT_FOUND", "FILE_TYPE_NOT_ALLOWED", "FILE_TOO_LARGE", "SESSION_QUOTA_EXCEEDED",
               "RATE_LIMITED", "SERVICE_UNAVAILABLE", "SEND_TOO_LARGE", "FORBIDDEN", "AUTH_REQUIRED", "FILE_CHECK_TIMEOUT",
               "SESSION_RENEW")

ERROR_TEXTS: dict[str, str] = {
    "INVALID_ACTION": "Não foi possível processar essa opção. Escolha uma das opções disponíveis.",
    "SESSION_NOT_FOUND": TEXTS["sessionExpired"],
    "FILE_TYPE_NOT_ALLOWED": "Arquivo não aceito. Envie PDF, Word (DOC ou DOCX) ou imagem (PNG, JPG ou WEBP).",
    "FILE_TOO_LARGE": "O arquivo é maior que o permitido. O limite é de 20 MB por conversa.",
    "SESSION_QUOTA_EXCEEDED": "O limite de 20 MB por conversa foi atingido. Recomece para enviar outro documento.",
    "RATE_LIMITED": "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.",
    "SERVICE_UNAVAILABLE": "Não consegui responder agora. Tente novamente em instantes.",
}
# Codes the contract v1 added (docs/contratos-de-dados.md §9.3 and §9.7); kept apart from the ChatErrorCode texts above.
V1_ERROR_TEXTS: dict[str, str] = {
    "SEND_TOO_LARGE": "Os documentos somam mais de 9 MB. Envie menos arquivos por vez.",
    "FORBIDDEN": "Você não tem acesso ao agente.",
    "AUTH_REQUIRED": "Sua sessão expirou. Entre novamente.",
    "SESSION_RENEW": "Sua sessão precisa ser renovada. Recarregue a página.",  # 403 AUT-003 (XSRF token missing/stale)
    "FILE_CHECK_TIMEOUT": "A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes.",
}
# Quarantine verdicts (ArquivoAgente.motivoRejeicao): the document never reached the agent.
QUARANTINE_TEXTS: dict[str, str] = {
    "AMEACA_DETECTADA": "O documento não passou na verificação de segurança e foi descartado. Envie outro arquivo.",
    "VERIFICACAO_FALHOU": "Não foi possível verificar o documento. Envie uma versão sem senha ou em outro formato.",
    "CONTEUDO_NAO_SUPORTADO": "Este documento não pode ser avaliado (conteúdo ativo, mais de 200 páginas ou arquivo danificado).",
}
GENERIC_ERROR_TEXT = ERROR_TEXTS["SERVICE_UNAVAILABLE"]


def error_text(code: str) -> str:
    """pt-BR text of a chat error code (never the server message); unknown -> the generic text."""
    return ERROR_TEXTS.get(code) or V1_ERROR_TEXTS.get(code) or GENERIC_ERROR_TEXT
# New sessions opened on their own after SESSION_NOT_FOUND before the backend answers again (one per user action).
MAX_AUTO_RESTARTS = 1


# --- Limits (chat.model.ts CHAT_LIMITS; numbers from settings.yaml chat.*) --------------------------------------------------
def _chat_settings() -> dict:
    try:
        return settings().get("chat") or {}
    except Exception:  # settings.yaml unreadable: the Angular defaults
        return {}


_CFG = _chat_settings()
CHAT_LIMITS: dict[str, Any] = dict(
    maxSessionBytes=int(_CFG.get("max_session_bytes", 20 * 1024 * 1024)),
    maxInputChars=int(_CFG.get("max_input_chars", 1000)),
    maxFilesPerSend=int(_CFG.get("max_files_per_send", 5)),
    maxSendBytes=int(_CFG.get("max_send_bytes", 9 * 1024 * 1024)),  # D4: documents of one send sum up to 9 MB
    allowedExtensions=(".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"),
    allowedMimeTypes=(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/webp",
    ),
)

# Step shown after "Encerrar": only "Recomeçar" is left (the server session is already gone).
CLOSED_NODE: dict = {"id": "closed", "type": "end", "prompt": TEXTS["farewell"], "canGoBack": False}


def _fold(text: str) -> str:
    """Lower case without accents (NFD minus combining marks), as `fold` in the Angular code."""
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).lower()


# --- Safe markdown (markdown/safe-markdown.ts) --------------------------------------------------------------------------------
# Everything is escaped first, so the result only holds the tags written here: p, br, strong, em, code, ul, ol, li and
# a (http/https only). Never render BFF text as HTML any other way.
_PLACEHOLDER = "\u0000"
_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}
_CODE = re.compile(r"`([^`\n]+)`")
_LINK = re.compile(r"\[([^\]\n]+)\]\((https?://[^\s)]+)\)")
_BOLD = re.compile(r"\*\*([^*\s](?:[^*]*[^*\s])?)\*\*")
_ITALIC = re.compile(r"\*([^*\s](?:[^*]*[^*\s])?)\*")
_SLOT = re.compile(_PLACEHOLDER + r"(\d+)" + _PLACEHOLDER)
_BULLET = re.compile(r"^[-*]\s+(.*)$")
_NUMBERED = re.compile(r"^\d+[.)]\s+(.*)$")


def escape_html(text: str) -> str:
    return re.sub(r"[&<>\"']", lambda m: _ESCAPES[m.group(0)], text)


def _format_inline(escaped: str) -> str:
    code_spans: list[str] = []

    def keep(match: re.Match) -> str:
        code_spans.append(f"<code>{match.group(1)}</code>")
        return f"{_PLACEHOLDER}{len(code_spans) - 1}{_PLACEHOLDER}"

    text = _CODE.sub(keep, escaped)
    text = _LINK.sub(r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', text)
    text = _BOLD.sub(r"<strong>\1</strong>", text)
    text = _ITALIC.sub(r"<em>\1</em>", text)
    return _SLOT.sub(lambda m: code_spans[int(m.group(1))], text)


def safe_markdown(text: Optional[str]) -> str:
    """Simple markdown (paragraphs, line breaks, **bold**, *italic*, `code`, - / 1. lists, [text](https://…)) to safe HTML."""
    if not text:
        return ""
    lines = re.split(r"\r?\n", escape_html(text.replace(_PLACEHOLDER, "")))
    blocks: list[dict] = []
    for raw in lines:
        line = raw.strip()
        last = blocks[-1] if blocks else None
        if not line:
            blocks.append({"kind": "p", "lines": []})  # blank-line separator, dropped below
            continue
        bullet = _BULLET.match(line)
        numbered = None if bullet else _NUMBERED.match(line)
        kind = "ul" if bullet else ("ol" if numbered else None)
        if kind:
            item = (bullet or numbered).group(1)
            if last and last["kind"] == kind:
                last["items"].append(item)
            else:
                blocks.append({"kind": kind, "items": [item]})
        elif last and last["kind"] == "p" and last["lines"]:
            last["lines"].append(line)
        else:
            blocks.append({"kind": "p", "lines": [line]})
    out = []
    for block in blocks:
        if block["kind"] == "p":
            if block["lines"]:
                out.append("<p>" + "<br>".join(_format_inline(item) for item in block["lines"]) + "</p>")
        else:
            items = "".join(f"<li>{_format_inline(item)}</li>" for item in block["items"])
            out.append(f"<{block['kind']}>{items}</{block['kind']}>")
    return "".join(out)


# --- Formatting (chat-format.ts) --------------------------------------------------------------------------------------------
_SIZE_UNITS = ("B", "KB", "MB", "GB")
_EMAIL = re.compile(r"^[^\s@<>\"']+@[^\s@<>\"']+\.[^\s@<>\"']+$")


def _pt_number(value: float, decimals: int) -> str:
    """Intl.NumberFormat('pt-BR', {maximumFractionDigits}) for non-negative numbers: dot thousands, comma decimals."""
    rounded = Decimal(str(value)).quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP)
    whole, _, frac = f"{rounded:f}".partition(".")
    whole = f"{int(whole):,}".replace(",", ".")
    frac = frac.rstrip("0")
    return f"{whole},{frac}" if frac else whole


def format_file_size(size: int) -> str:
    """File size in pt-BR ("1,5 MB"), for the attachment line."""
    value = float(max(0, size))
    unit = 0
    while value >= 1024 and unit < len(_SIZE_UNITS) - 1:
        value /= 1024
        unit += 1
    return f"{_pt_number(value, 0 if unit == 0 else 1)} {_SIZE_UNITS[unit]}"


def is_email(value: str) -> bool:
    return bool(_EMAIL.match(value or ""))


def can_rate_message(message: dict) -> bool:
    """Answers and "not found" can be rated, but not the hand-over to the team (contacts)."""
    return message.get("role") == "ai" and (
        message.get("status") == "answer" or (message.get("status") == "not_in_data" and not message.get("contacts")))


# --- Greeting (chat-greeting.ts) ----------------------------------------------------------------------------------------------
_MORNING_FROM, _AFTERNOON_FROM, _EVENING_FROM, _MAX_NAME_CHARS = 5, 12, 18, 40
_LETTERS = r"[^\W\d_]+"
_NAME = re.compile(rf"^{_LETTERS}(?:['’-]{_LETTERS})*$")


def time_of_day_greeting(now: datetime) -> str:
    """ "Bom dia" (5h–11h), "Boa tarde" (12h–17h) or "Boa noite" (18h–4h)."""
    hour = now.hour
    if _MORNING_FROM <= hour < _AFTERNOON_FROM:
        return TEXTS["goodMorning"]
    return TEXTS["goodAfternoon"] if _AFTERNOON_FROM <= hour < _EVENING_FROM else TEXTS["goodEvening"]


def greeting_name(raw: Optional[str]) -> str:
    """First word, letters only (accents, hyphen, apostrophe), capitalized; anything that looks like a login gives ''."""
    parts = (raw or "").strip().split()
    first = parts[0] if parts else ""
    if not first or len(first) > _MAX_NAME_CHARS or not _NAME.match(first):
        return ""
    return re.sub(r"(^|['’-])([^\W\d_])", lambda m: m.group(1) + m.group(2).upper(), first.lower())


def build_greeting(first_name: Optional[str], now: datetime) -> str:
    """ "Boa tarde, Vinicius!" or, without a usable name, "Boa tarde!"."""
    name = greeting_name(first_name)
    return f"{time_of_day_greeting(now)}{', ' + name if name else ''}!"


def with_greeting(messages: list[dict], greeting: str) -> list[dict]:
    """Greeting at the start of the first lasting agent message of the welcome, or as a message of its own."""
    index = next((i for i, m in enumerate(messages) if m.get("role") == "ai" and not m.get("transient") and m.get("text")), -1)
    if index < 0:
        return [{"role": "ai", "text": greeting}, *messages]
    return [{**m, "text": f"{greeting} {m['text']}"} if i == index else m for i, m in enumerate(messages)]


# --- Typed goodbye (chat-farewell.ts) ---------------------------------------------------------------------------------------
CLOSING_WORDS = frozenset({
    "tchau", "tchauzinho", "adeus", "bye", "obrigado", "obrigada", "obg", "valeu", "vlw", "encerrar", "encerra", "encerre", "sair", "fim",
})
CLOSING_PAIRS = ("ate logo", "ate mais", "ate breve", "so isso")
FILLER_WORDS = frozenset({
    "ate", "logo", "mais", "breve", "so", "isso", "muito", "muita", "pela", "pelo", "por", "ajuda", "tudo", "ok", "certo", "entao",
    "e", "era", "pode", "quero", "gostaria", "de", "a", "o", "conversa", "atendimento", "chat", "ja", "agora", "bom", "dia", "boa",
    "tarde", "noite", "assistente", "agente", "agenda", "da", "sim", "beleza", "blz",
})
_FAREWELL_MAX_WORDS = 8


def is_farewell_message(text: str) -> bool:
    """True when the whole message is a goodbye ("tchau", "obrigado, era só isso", "pode encerrar")."""
    words = [w for w in re.split(r"\s+", re.sub(r"[^a-z\s]", " ", _fold(text or ""))) if w]
    if not words or len(words) > _FAREWELL_MAX_WORDS:
        return False
    if not all(w in CLOSING_WORDS or w in FILLER_WORDS for w in words):
        return False
    joined = f" {' '.join(words)} "
    return any(w in CLOSING_WORDS for w in words) or any(f" {pair} " in joined for pair in CLOSING_PAIRS)


# --- Documents (chat-file.ts) -----------------------------------------------------------------------------------------------
@dataclass
class ChatFile:
    """A document chosen by the user: name, size, browser type (may be empty) and content."""
    name: str
    size: int
    type: str = ""
    data: bytes = b""


@dataclass
class ChatFileCheck:
    valid: list = field(default_factory=list)
    problems: list[dict] = field(default_factory=list)


def validate_chat_file(file: Any, upload: dict, used_bytes: int) -> Optional[str]:
    """First problem of a document before sending (the BFF repeats every check), or None."""
    name = file.name
    dot = name.rfind(".")
    extension = name[dot:].lower() if dot >= 0 else ""
    if extension not in upload["accept"]:
        return "FILE_TYPE_NOT_ALLOWED"
    if getattr(file, "type", "") and file.type not in CHAT_LIMITS["allowedMimeTypes"]:
        return "FILE_TYPE_NOT_ALLOWED"
    if file.size == 0:
        return "FILE_EMPTY"
    if file.size > upload["maxBytes"]:
        return "FILE_TOO_LARGE"
    if used_bytes + file.size > CHAT_LIMITS["maxSessionBytes"]:
        return "SESSION_QUOTA_EXCEEDED"
    return None


def validate_chat_files(files: Iterable[Any], upload: dict, used_bytes: int) -> ChatFileCheck:
    """Each document as validate_chat_file, quota summed over the batch, at most min(maxFiles, maxFilesPerSend), and the
    documents of one send summing at most maxSendBytes (9 MB, D4; the step may lower it): a document that would pass the
    sum stays out ("SEND_TOO_LARGE") and the others still go, before anything is sent."""
    limit = min(upload["maxFiles"], CHAT_LIMITS["maxFilesPerSend"])
    send_limit = min(int(upload.get("maxSendBytes") or CHAT_LIMITS["maxSendBytes"]), CHAT_LIMITS["maxSendBytes"])
    check = ChatFileCheck()
    total = used_bytes
    send_total = 0
    for file in files:
        problem = "TOO_MANY_FILES" if len(check.valid) >= limit else validate_chat_file(file, upload, total)
        if not problem and send_total + file.size > send_limit:
            problem = "SEND_TOO_LARGE"
        if problem:
            check.problems.append({"name": file.name, "problem": problem})
        else:
            check.valid.append(file)
            total += file.size
            send_total += file.size
    return check


def file_problem_text(problem: str) -> str:
    if problem == "FILE_EMPTY":
        return TEXTS["fileEmpty"]
    return TEXTS["fileTooMany"] if problem == "TOO_MANY_FILES" else error_text(problem)


# --- Norm lists (chat-norms-export.ts) --------------------------------------------------------------------------------------
_ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def format_norm_date(iso: Optional[str]) -> str:
    """ISO yyyy-mm-dd as dd/mm/aaaa (no time zone shift); anything else gives ''."""
    if not iso or not _ISO_DAY.match(iso):
        return ""
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return ""


def norm_list_title(message: dict) -> str:
    """The agent's text without markdown marks and the trailing colon ("Normas a classificar (…)")."""
    text = re.sub(r"[*_`#>]", "", (message.get("text") or "").split("\n")[0]).strip()
    text = re.sub(r":$", "", text)
    return text or TEXTS["normsSheet"]


def _slug(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", _fold(text))
    text = re.sub(r"^-|-$", "", text)[:40]
    return re.sub(r"-$", "", text)


def _day(today: datetime) -> str:
    return f"{today.year:04d}-{today.month:02d}-{today.day:02d}"


def segments_of(message: dict) -> list[str]:
    """Segments of a norm list, distinct, in pt-BR order."""
    names = {i["segment"] for i in (message.get("normList") or {}).get("items", []) if i.get("segment")}
    return sorted(names, key=lambda s: (_fold(s), s))


def visible_norms(message: dict, segment: Optional[str]) -> list[dict]:
    items = (message.get("normList") or {}).get("items", [])
    return [i for i in items if i.get("segment") == segment] if segment else list(items)


def norm_list_xlsx_table(message: dict, items: list[dict], segment: Optional[str], today: datetime) -> XlsxTable:
    """Spreadsheet of the norms on screen (filter applied): Norma, Observação, Segmento and the list's date."""
    title = norm_list_title(message)
    date_label = (message.get("normList") or {}).get("dateLabel") or TEXTS["normsDate"]
    count = f"{len(items)} {'norma' if len(items) == 1 else 'normas'}"
    day = _day(today)
    return XlsxTable(
        sheet_name=TEXTS["normsSheet"],
        title=title,
        subtitle=f"{f'Segmento: {segment}' if segment else 'Todos os segmentos'} · {count} · gerado pelo Agente da Agenda em {format_norm_date(day)}",
        columns=[
            XlsxColumn("title", TEXTS["normsColumnTitle"], width=36),
            XlsxColumn("detail", TEXTS["normsColumnDetail"], width=36),
            XlsxColumn("segment", TEXTS["normsColumnSegment"], width=14),
            XlsxColumn("date", date_label, width=16),
        ],
        rows=[{"title": i["title"], "detail": i.get("detail") or "", "segment": i.get("segment") or "",
               "date": format_norm_date(i.get("date"))} for i in items],
        file_name=f"agente-da-agenda-{_slug(title)}{'-' + _slug(segment) if segment else ''}-{day}.xlsx",
    )


# --- Several documents (chat-file-results.ts) -------------------------------------------------------------------------------
def with_file_results(reply: dict, files: list[Any]) -> dict:
    """With more than one document, the results table goes on the first lasting agent message (or a new one)."""
    if len(files) < 2:
        return reply
    results = reply.get("files") or []
    rows = [{"name": f.name, "sizeBytes": f.size, "result": results[i] if i < len(results) else {"id": "", "accepted": False}}
            for i, f in enumerate(files)]
    messages = reply.get("messages") or []
    index = next((i for i, m in enumerate(messages) if m.get("role") == "ai" and not m.get("transient")), -1)
    if index < 0:
        messages = [{"role": "ai", "text": TEXTS["fileResultsTitle"], "fileResults": rows}, *messages]
    else:
        messages = [{**m, "fileResults": rows} if i == index else m for i, m in enumerate(messages)]
    return {**reply, "messages": messages}


def file_kind_label(kind: Optional[str]) -> str:
    return TEXTS["fileKinds"].get(kind, kind) if kind else ""


def file_result_cells(row: dict) -> dict:
    """Text of each column, the same on screen and in the spreadsheet."""
    result = row["result"]
    meta = result.get("metadata") or {}
    issuer = meta.get("issuer")
    return {
        "name": row["name"],
        "size": format_file_size(row["sizeBytes"]),
        "result": TEXTS["fileAccepted"] if result.get("accepted") else TEXTS["fileRejectedUnsafe"] if result.get("quarantine") else TEXTS["fileRejected"],
        "norm": meta.get("normIdentifier") or "",
        "issuer": issuer if issuer and issuer != "desconhecido" else "",
        "kind": file_kind_label(meta.get("documentKind")),
        "note": "" if result.get("accepted") else (result.get("reason") or ""),
    }


def file_results_xlsx_table(rows: list[dict], today: datetime) -> XlsxTable:
    accepted = sum(1 for r in rows if r["result"].get("accepted"))
    day = _day(today)
    return XlsxTable(
        sheet_name=TEXTS["fileResultsSheet"],
        title=TEXTS["fileResultsTitle"],
        subtitle=f"{len(rows)} documentos · {accepted} {'aceito' if accepted == 1 else 'aceitos'} · gerado pelo Agente da Agenda em {format_norm_date(day)}",
        columns=[
            XlsxColumn("name", TEXTS["fileColumnName"], width=34),
            XlsxColumn("size", "Tamanho", width=10),
            XlsxColumn("result", TEXTS["fileColumnResult"], width=18),
            XlsxColumn("norm", TEXTS["fileColumnNorm"], width=32),
            XlsxColumn("issuer", TEXTS["fileColumnIssuer"], width=14),
            XlsxColumn("kind", TEXTS["fileColumnKind"], width=18),
            XlsxColumn("note", TEXTS["fileColumnNote"], width=44),
        ],
        rows=[file_result_cells(r) for r in rows],
        file_name=f"agente-da-agenda-avaliacao-documentos-{day}.xlsx",
    )


# --- Suggestions (chat-suggestions.ts) --------------------------------------------------------------------------------------
def build_chat_suggestions(node: Optional[dict], busy: bool, has_interaction: bool, replies: Iterable[str] = ()) -> list[dict]:
    """Options of a menu, ready answers on a text step, "Recomeçar" at the end, "Voltar", then "Encerrar" last."""
    if not node or busy:
        return []
    out: list[dict] = []
    if node["type"] == "menu":
        out += [{"kind": "option", "label": o["label"], "option": o} for o in node.get("options") or []]
    if node["type"] == "free_text":
        out += [{"kind": "reply", "label": r} for r in replies]
    if node["type"] == "end":
        out.append({"kind": "restart", "label": TEXTS["restart"]})
    if node.get("canGoBack"):
        out.append({"kind": "back", "label": TEXTS["back"]})
    if has_interaction and node["type"] != "end":
        out.append({"kind": "end", "label": TEXTS["end"]})
    return out


def last_quick_replies(messages: list[dict]) -> list[str]:
    last = messages[-1] if messages else None
    return list(last.get("quickReplies") or []) if last and last.get("role") == "ai" else []


# --- Mock server (chat-mock-server.ts) --------------------------------------------------------------------------------------
class ChatRequestError(Exception):
    """Failure of a chat request, the same shape whether it came from the BFF or from the mock."""

    def __init__(self, code: str, status: int = 400, trace_id: Optional[str] = None, retry_after: Optional[float] = None):
        super().__init__(code)
        self.code, self.status, self.trace_id, self.retry_after = code, status, trace_id, retry_after


def _invalid() -> ChatRequestError:
    return ChatRequestError("INVALID_ACTION", 400)


_MAX_STORED_REPLIES = 20
# Quarantine (contract v1 §9.7): file status while the antivirus runs and the two outcomes.
CHECKING, APPROVED, REJECTED = "EM_VERIFICACAO", "APROVADO", "REJEITADO"
# The mock plays the quarantine by file name (fictitious demo words) and answers EM_VERIFICACAO on the first consult of
# each document, then the verdict: the states show up at once, without waiting.
MOCK_QUARANTINE_KEYWORDS = (("virus", "AMEACA_DETECTADA"), ("ameaca", "AMEACA_DETECTADA"), ("protegido", "VERIFICACAO_FALHOU"),
                            ("macro", "CONTEUDO_NAO_SUPORTADO"))
MOCK_QUARANTINE_CONSULTS = 1


def _mock_quarantine(name: str) -> Optional[str]:
    folded = _fold(name)
    return next((reason for word, reason in MOCK_QUARANTINE_KEYWORDS if word in folded), None)


@dataclass
class _MockSession:
    node_id: str
    rounds: int = 0
    out_of_scope: int = 0
    used_bytes: int = 0
    replies: dict = field(default_factory=dict)  # requestId -> reply (insertion ordered)
    undo: Optional[dict] = None  # {"requestId", "before"}
    batches: dict = field(default_factory=dict)  # requestId -> documents in quarantine (submit_files / file_status)

    def snapshot(self) -> dict:
        return {"node_id": self.node_id, "rounds": self.rounds, "out_of_scope": self.out_of_scope, "used_bytes": self.used_bytes}

    def restore(self, snap: dict) -> None:
        for key, value in snap.items():
            setattr(self, key, value)


class ChatMockServer:
    """Plays the BFF while it does not exist: same rules as the backend spec, answers by keyword from the mock file."""

    def __init__(self, flow: dict):
        self.flow = flow
        self.sessions: dict[str, _MockSession] = {}
        self.sequence = 0
        self.feedback_log: list[dict] = []  # what the BFF would store: ratings only, never text

    def start_session(self) -> dict:
        self.sequence += 1
        session_id = f"mock-{self.sequence}-{secrets.token_hex(4)}"
        session = _MockSession(self.flow["start"])
        self.sessions[session_id] = session
        reply = {"sessionId": session_id, **self._begin(session)}
        if self.flow.get("user"):
            reply["user"] = deepcopy(self.flow["user"])
        return reply

    def handle_message(self, request: dict) -> dict:
        session = self._session(request.get("sessionId"))
        return self._once(session, request["requestId"], lambda: self._act(session, request))

    def cancel(self, request: dict) -> dict:
        """Undoes the request if it was the last one the session handled; answers the current step."""
        session = self._session(request.get("sessionId"))
        if session.undo and session.undo["requestId"] == request.get("requestId"):
            session.restore(session.undo["before"])
            session.replies.pop(request["requestId"], None)
            session.undo = None
        return {"node": deepcopy(self._node(session.node_id))}

    def handle_files(self, session_id: str, node_id: str, files: list[Any], request_id: str) -> dict:
        session = self._session(session_id)
        return self._once(session, request_id, lambda: self._receive_files(session, node_id, files))

    def submit_files(self, session_id: str, node_id: str, files: list[Any], request_id: str) -> list[str]:
        """Like POST .../arquivos (202): same checks and verdicts as handle_files (same requestId idempotency), then
        every document waits in quarantine; returns the document ids, all EM_VERIFICACAO."""
        reply = self.handle_files(session_id, node_id, files, request_id)
        ids = [result["id"] for result in reply.get("files") or []]
        self._session(session_id).batches[request_id] = {"reply": reply, "left": {i: MOCK_QUARANTINE_CONSULTS for i in ids}}
        return ids

    def file_status(self, session_id: str, file_id: str) -> dict:
        """Like GET .../arquivos/{id}: EM_VERIFICACAO first, then APROVADO/REJEITADO with the result; the consult that
        finds the whole send done also carries the reply (node and messages)."""
        session = self._session(session_id)
        batch = next((b for b in session.batches.values() if file_id in b["left"]), None)
        if batch is None:
            raise ChatRequestError("SESSION_NOT_FOUND", 404)
        if batch["left"][file_id] > 0:
            batch["left"][file_id] -= 1
            return {"id": file_id, "status": CHECKING}
        result = next(r for r in batch["reply"]["files"] if r["id"] == file_id)
        status = {"id": file_id, "status": REJECTED if result.get("quarantine") else APPROVED, "result": deepcopy(result)}
        if not any(batch["left"].values()):
            status["reply"] = {"node": deepcopy(batch["reply"]["node"]), "messages": deepcopy(batch["reply"]["messages"])}
        return status

    def handle_feedback(self, request: dict) -> None:
        self._session(request.get("sessionId"))
        if request.get("rating") not in ("useful", "not_useful") or not isinstance(request.get("sourceIds"), list):
            raise _invalid()
        self.feedback_log.append(deepcopy(request))

    def end_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)

    # -----------------------------------------------------------------------------------------------------------------
    def _act(self, session: _MockSession, request: dict) -> dict:
        node = self._node(session.node_id)
        if request.get("nodeId") != node["id"]:
            raise _invalid()
        action = request.get("action")
        if action == "restart":
            session.rounds = session.out_of_scope = session.used_bytes = 0
            return self._begin(session)
        if action == "back":
            previous = self.flow["back"].get(node["id"])
            if not node.get("canGoBack") or not previous:
                raise _invalid()
            return self._enter(session, previous)
        if action == "option":
            option_id = request.get("optionId") or ""
            nxt = self.flow["transitions"].get(node["id"], {}).get(option_id) if node["type"] == "menu" else None
            if not nxt or not any(o["id"] == request.get("optionId") for o in node.get("options") or []):
                raise _invalid()
            return self._enter(session, nxt)
        if action == "text":
            return self._answer_text(session, node, request.get("text"))
        if action == "ask":
            target = self._node(self.flow["askNode"]) if self.flow.get("askNode") else None
            length = len((request.get("text") or "").strip())
            max_chars = ((target or {}).get("input") or {}).get("maxChars") or CHAT_LIMITS["maxInputChars"]
            if not target or target["type"] != "free_text" or not length or length > max_chars:
                raise _invalid()
            session.node_id, session.rounds = target["id"], 0
            return self._answer_text(session, target, request.get("text"))
        raise _invalid()

    def _receive_files(self, session: _MockSession, node_id: str, files: list[Any]) -> dict:
        node = self._node(session.node_id)
        upload = node.get("upload")
        if node_id != node["id"] or node["type"] != "upload" or not upload:
            raise _invalid()
        if not files or len(files) > min(upload["maxFiles"], CHAT_LIMITS["maxFilesPerSend"]):
            raise _invalid()
        total = session.used_bytes
        for file in files:
            problem = validate_chat_file(file, upload, total)
            if problem == "FILE_TYPE_NOT_ALLOWED":
                raise ChatRequestError(problem, 415)
            if problem in ("FILE_TOO_LARGE", "SESSION_QUOTA_EXCEEDED"):
                raise ChatRequestError(problem, 413)
            if problem:
                raise _invalid()
            total += file.size

        scenarios = self.flow["fileScenarios"]
        accepted, rejected, summary = scenarios["accepted"], scenarios["rejected"], scenarios.get("summary")
        identifiers = accepted.get("normIdentifiers") or []
        accepted_count = quarantined = 0
        results = []
        for file in files:
            self.sequence += 1
            result_id = f"mock-arquivo-{self.sequence}"
            reason = _mock_quarantine(file.name)
            if reason:  # stopped by the antivirus: never evaluated, no bytes counted
                quarantined += 1
                results.append({"id": result_id, "accepted": False, "quarantine": reason, "reason": QUARANTINE_TEXTS[reason]})
                continue
            if any(_fold(keyword) in _fold(file.name) for keyword in rejected["filenameKeywords"]):
                results.append({**deepcopy(rejected["result"]), "id": result_id})
                continue
            session.used_bytes += file.size
            result = {**deepcopy(accepted["result"]), "id": result_id}
            identifier = identifiers[accepted_count % len(identifiers)] if identifiers else None
            accepted_count += 1
            if identifier:
                result["metadata"] = {**(result.get("metadata") or {}), "normIdentifier": identifier}
            results.append(result)

        counted = None
        if len(files) > 1 and summary:
            text = (summary.get("text") or "").replace("{total}", str(len(files)), 1)
            text = text.replace("{accepted}", str(accepted_count), 1).replace("{rejected}", str(len(files) - accepted_count), 1)
            counted = [{**deepcopy(summary), "text": text}]
        if not accepted_count:
            # Only quarantine refusals: the verdict text comes with the result (await_quarantine), not "not a norm".
            fallback = [] if quarantined == len(files) else deepcopy(rejected["messages"])
            return {"node": deepcopy(node), "messages": counted or fallback, "files": results}
        nxt = self.flow["transitions"].get(node["id"], {}).get("accepted")
        entered = self._enter(session, nxt) if nxt else {"node": deepcopy(node), "messages": []}
        return {"node": entered["node"], "messages": [*(counted or deepcopy(accepted["messages"])), *entered["messages"]],
                "files": results}

    def _once(self, session: _MockSession, request_id: str, handle: Callable[[], dict]) -> dict:
        """Runs a request once per requestId: a repeat gets the stored reply; a failure leaves the session as it was."""
        if request_id in session.replies:
            return deepcopy(session.replies[request_id])
        before = session.snapshot()
        try:
            reply = handle()
        except Exception:
            session.restore(before)
            raise
        session.replies[request_id] = deepcopy(reply)
        if len(session.replies) > _MAX_STORED_REPLIES:
            session.replies.pop(next(iter(session.replies)))
        session.undo = {"requestId": request_id, "before": before}
        return reply

    def _answer_text(self, session: _MockSession, node: dict, raw: Optional[str]) -> dict:
        text = (raw or "").strip()
        max_chars = (node.get("input") or {}).get("maxChars") or CHAT_LIMITS["maxInputChars"]
        if node["type"] != "free_text" or not text or len(text) > max_chars:
            raise _invalid()
        fallbacks = self.flow["fallbacks"]
        folded = _fold(text)
        hit = next((s for s in self.flow["textScenarios"] if any(_fold(w) in folded for w in s["keywords"])), None)
        if hit and hit["message"].get("status") == "out_of_scope":
            session.out_of_scope += 1
            limit = session.out_of_scope >= self.flow.get("maxOutOfScope", 3)
            return {"node": deepcopy(node), "messages": [self._resolve(fallbacks["outOfScopeLimit"] if limit else hit["message"])]}
        if hit:
            nxt = self.flow["transitions"].get(node["id"], {}).get("answered")
            entered = self._enter(session, nxt) if nxt else {"node": deepcopy(node), "messages": []}
            return {"node": entered["node"], "messages": [self._resolve(hit["message"]), *entered["messages"]]}
        session.rounds += 1
        if session.rounds >= self.flow["maxClarificationRounds"]:
            session.rounds = 0
            return {"node": deepcopy(node), "messages": [self._resolve(fallbacks["roundsExceeded"])]}
        words = len(re.split(r"\s+", text))
        chosen = fallbacks["needMoreInfo"] if words < fallbacks["minWordsForAnswer"] else fallbacks["notInData"]
        return {"node": deepcopy(node), "messages": [self._resolve(chosen)]}

    def _begin(self, session: _MockSession) -> dict:
        entered = self._enter(session, self.flow["start"])
        return {"node": entered["node"], "messages": [*deepcopy(self.flow["welcome"]), *entered["messages"]]}

    def _enter(self, session: _MockSession, node_id: str) -> dict:
        node = self._node(node_id)
        session.node_id, session.rounds = node_id, 0
        norm_list = (self.flow.get("lists") or {}).get(node_id)
        message = {"role": "ai", "text": node["prompt"], **({"normList": deepcopy(norm_list)} if norm_list else {})}
        return {"node": deepcopy(node), "messages": [message]}

    def _resolve(self, message: dict) -> dict:
        resolved = deepcopy(message)
        ref = resolved.pop("contactsRef", None)
        if ref:
            resolved["contacts"] = deepcopy(self.flow["contacts"].get(ref, []))
        return resolved

    def _session(self, session_id: Optional[str]) -> _MockSession:
        session = self.sessions.get(session_id or "")
        if session is None:
            raise ChatRequestError("SESSION_NOT_FOUND", 404)
        return session

    def _node(self, node_id: str) -> dict:
        node = self.flow["nodes"].get(node_id)
        if node is None:
            raise ChatRequestError("SERVICE_UNAVAILABLE", 500)
        return node


def load_mock_flow() -> dict:
    import json

    return json.loads((DATA_DIR / "chat-fluxo-mock.json").read_text(encoding="utf-8"))


@st.cache_resource(show_spinner=False)
def mock_server() -> ChatMockServer:
    """One server per Streamlit process, like the BFF: sessions in memory."""
    return ChatMockServer(load_mock_flow())


# --- Backends (chat-api.service.ts) -------------------------------------------------------------------------------------------
class ChatBackend(Protocol):
    def start_session(self) -> dict: ...
    def send_message(self, request: dict) -> dict: ...
    def send_files(self, session_id: str, node_id: str, files: list[ChatFile], request_id: str) -> dict: ...
    def send_feedback(self, request: dict) -> None: ...
    def cancel_request(self, request: dict) -> dict: ...
    def end_session(self, session_id: str) -> None: ...


def _as_request_error(error: Exception) -> ChatRequestError:
    """Any failure as a ChatRequestError with a known code (unknown -> SERVICE_UNAVAILABLE); keeps the trace id."""
    if isinstance(error, ChatRequestError):
        return error
    code = getattr(error, "code", None)
    status = getattr(error, "status", 0) or 0
    trace = getattr(error, "trace_id", None)
    retry_after = getattr(error, "retry_after", None)
    if code in ERROR_CODES:
        return ChatRequestError(code, status, trace, retry_after)
    return ChatRequestError("RATE_LIMITED" if status == 429 else "SERVICE_UNAVAILABLE", status, trace, retry_after)


# --- Quarantine (contract v1 §9.7): 202, then consult each document until it leaves EM_VERIFICACAO -------------------------
QUARANTINE_POLL_SECONDS = 2.0     # between consults (one consult per round, rotating over the pending documents)
QUARANTINE_TIMEOUT_SECONDS = 120.0  # then "Parar" on the server (cancelamentos) and FILE_CHECK_TIMEOUT
QUARANTINE_MAX_FAILURES = 3       # consecutive 429/5xx/network on consults: the third one in a row gives up
QUARANTINE_RETRY_AFTER = (1.0, 10.0)  # a 429 Retry-After is honoured inside these bounds (seconds)


def _transient(failure: ChatRequestError) -> bool:
    """A consult failure worth repeating: 429 (gateway rate limit) and 5xx/no answer."""
    return failure.status == 429 or (failure.code == "SERVICE_UNAVAILABLE" and (failure.status == 0 or failure.status >= 500))


def checking_text(count: int) -> str:
    return TEXTS["filesChecking"] if count > 1 else TEXTS["fileChecking"]


def await_quarantine(file_ids: list[str], fetch: Callable[[str], dict], cancel: Callable[[], None], *,
                     on_checking: Optional[Callable[[str], None]] = None, interval: float = QUARANTINE_POLL_SECONDS,
                     timeout: float = QUARANTINE_TIMEOUT_SECONDS, sleep: Callable[[float], None] = time.sleep,
                     clock: Callable[[], float] = time.monotonic) -> dict:
    """Consults the documents still EM_VERIFICACAO until all have a verdict and the reply arrived; returns the internal
    reply {node, messages, files} in the order sent. `fetch(id)` -> {id, status, result?, reply?} (internal shapes).
    One consult per round, rotating over the pending documents (all judged, no reply yet: the last one again), so the
    BFF sees one request per `interval` whatever the number of files. 404 on a consult ends at once (SESSION_NOT_FOUND);
    429/5xx/network are transient: a 429 waits its Retry-After (bounded by QUARANTINE_RETRY_AFTER) instead of `interval`,
    and QUARANTINE_MAX_FAILURES of them in a row (a success resets the count) give up with the last error. The deadline
    is checked before every consult; past `timeout` the request is cancelled on the server and FILE_CHECK_TIMEOUT is
    raised."""
    if not file_ids:  # a 202 without documents: nothing to wait for
        raise ChatRequestError("SERVICE_UNAVAILABLE", 0)
    if on_checking:
        on_checking(checking_text(len(file_ids)))
    finals: dict[str, dict] = {}
    reply: Optional[dict] = None
    failures = 0
    deadline = clock() + timeout
    wait: Optional[float] = None  # None = first consult, right away
    turn = 0  # rotation over the pending documents
    while True:
        pending = [i for i in file_ids if i not in finals]
        if not pending and reply is not None:
            break
        if wait is not None:
            sleep(wait)
        wait = interval
        if clock() >= deadline:
            try:
                cancel()
            except Exception:  # noqa: BLE001 - the orchestrator's TTL covers a failed cancel
                pass
            raise ChatRequestError("FILE_CHECK_TIMEOUT", 0)
        candidates = pending or file_ids[-1:]  # all judged but no reply yet: ask the last one again
        file_id = candidates[turn % len(candidates)]
        turn += 1
        try:
            status = fetch(file_id)
        except Exception as error:  # noqa: BLE001 - mapped below
            failure = _as_request_error(error)
            if not _transient(failure):
                raise failure from error
            failures += 1
            if failures >= QUARANTINE_MAX_FAILURES:
                raise failure from error
            if failure.status == 429 and failure.retry_after is not None:
                low, high = QUARANTINE_RETRY_AFTER
                wait = min(max(float(failure.retry_after), low), high)
            continue
        failures = 0
        if status.get("status") in (APPROVED, REJECTED):
            finals[file_id] = status.get("result") or {"id": file_id, "accepted": False}
        if status.get("reply") is not None:
            reply = status["reply"]
    results = [finals[i] for i in file_ids]
    messages = list(reply.get("messages") or [])
    reason = results[0].get("quarantine") if len(results) == 1 else None
    if reason and not any(m.get("text") == QUARANTINE_TEXTS.get(reason) for m in messages):
        messages.insert(0, {"role": "ai", "text": QUARANTINE_TEXTS.get(reason, QUARANTINE_TEXTS["VERIFICACAO_FALHOU"])})
    return {"node": reply.get("node"), "messages": messages, "files": results}


class MockBackend:
    """chatMock on: the simulated agent of data/chat-fluxo-mock.json (documents through the simulated quarantine)."""

    on_checking: Optional[Callable[[str], None]] = None  # "Verificando o documento..." while in quarantine (set per call)

    def __init__(self, server: ChatMockServer):
        self.server = server

    def _call(self, fn: Callable[[], Any]) -> Any:
        try:
            return fn()
        except Exception as error:  # noqa: BLE001 - every failure becomes a ChatRequestError
            raise _as_request_error(error) from error

    def start_session(self) -> dict:
        return self._call(self.server.start_session)

    def send_message(self, request: dict) -> dict:
        return self._call(lambda: self.server.handle_message(request))

    def send_files(self, session_id: str, node_id: str, files: list[ChatFile], request_id: str) -> dict:
        def run() -> dict:
            ids = self.server.submit_files(session_id, node_id, files, request_id)
            return await_quarantine(ids, lambda file_id: self.server.file_status(session_id, file_id),
                                    lambda: self.server.cancel({"sessionId": session_id, "requestId": request_id}),
                                    on_checking=self.on_checking, interval=0, sleep=lambda _: None)
        return self._call(run)

    def send_feedback(self, request: dict) -> None:
        self._call(lambda: self.server.handle_feedback(request))

    def cancel_request(self, request: dict) -> dict:
        return self._call(lambda: self.server.cancel(request))

    def end_session(self, session_id: str) -> None:
        self._call(lambda: self.server.end_session(session_id))


# --- Contract v1 adapters (docs/contratos-de-dados.md §11.6 and §11.7) ------------------------------------------------------
V1_NODE_TYPES = {"MENU": "menu", "TEXTO_LIVRE": "free_text", "ENVIO_ARQUIVO": "upload", "FIM": "end"}
V1_ROLES = {"AGENTE": "ai", "USUARIO": "user", "SISTEMA": "system"}
V1_STATUSES = {"RESPOSTA": "answer", "PRECISA_MAIS_INFORMACAO": "need_more_info", "FORA_DOS_DADOS": "not_in_data",
               "FORA_DO_ESCOPO": "out_of_scope"}
V1_ACTIONS = {"option": "OPCAO", "text": "TEXTO", "back": "VOLTAR", "restart": "RECOMECAR", "ask": "PERGUNTAR"}
V1_RATINGS = {"useful": "UTIL", "not_useful": "NAO_UTIL"}


def _present_keys(**values: Any) -> dict:
    return {k: v for k, v in values.items() if v is not None}


def node_from_v1(step: Any) -> dict:
    """PassoAgente -> ChatNode. An unknown step type is a contract break (SERVICE_UNAVAILABLE), never guessed."""
    if not isinstance(step, dict) or step.get("tipo") not in V1_NODE_TYPES or not step.get("id"):
        raise ChatRequestError("SERVICE_UNAVAILABLE", 200)
    node = {"id": step["id"], "type": V1_NODE_TYPES[step["tipo"]], "prompt": step.get("enunciado") or "",
            "canGoBack": bool(step.get("podeVoltar"))}
    if isinstance(step.get("opcoes"), list):
        node["options"] = [{"id": o.get("id"), "label": o.get("rotulo")} for o in step["opcoes"]]
    entry = step.get("entrada")
    if isinstance(entry, dict):
        node["input"] = _present_keys(enabled=bool(entry.get("habilitada")), placeholder=entry.get("dica"), maxChars=entry.get("maxCaracteres"))
    send = step.get("envio")
    if isinstance(send, dict):
        node["upload"] = _present_keys(accept=list(send.get("extensoes") or []), maxBytes=send.get("maxBytesPorArquivo"),
                                       maxFiles=send.get("maxArquivos"), maxSendBytes=send.get("maxBytesPorEnvio"))
    return node


def message_from_v1(message: Any) -> dict:
    """MensagemAgente -> ChatApiMessage (role outside the domain becomes "system" later, in _to_message)."""
    m = message if isinstance(message, dict) else {}
    out = _present_keys(role=V1_ROLES.get(m.get("papel"), "system"), text=m.get("texto"), status=V1_STATUSES.get(m.get("situacao")),
                        questions=m.get("perguntas"), quickReplies=m.get("respostasRapidas"),
                        transient=m.get("transitoria") or None)
    if isinstance(m.get("citacoes"), list):
        out["citations"] = [{"sourceId": c.get("fonteId"), "excerpt": c.get("trecho")} for c in m["citacoes"]]
    if isinstance(m.get("contatos"), list):
        out["contacts"] = [{"name": c.get("nome"), "area": c.get("area"), "channel": c.get("canal")} for c in m["contatos"]]
    norms = m.get("listaNormas")
    if isinstance(norms, dict):
        out["normList"] = _present_keys(dateLabel=norms.get("rotuloData"), items=[
            _present_keys(id=i.get("id"), title=i.get("titulo"), detail=i.get("detalhe"), segment=i.get("segmento"), date=i.get("data"))
            for i in norms.get("itens") or []])
    return out


def reply_from_v1(reply: Any) -> dict:
    """RespostaAgente -> ChatReply {node, messages}."""
    body = reply if isinstance(reply, dict) else {}
    return {"node": node_from_v1(body.get("passo")), "messages": [message_from_v1(m) for m in body.get("mensagens") or []]}


def file_result_from_v1(item: dict) -> dict:
    """ArquivoAgente (judged) -> ChatFileResult: REJEITADO keeps the quarantine reason and its pt-BR text."""
    file_id = item.get("arquivoId")
    if item.get("status") == REJECTED:
        reason = item.get("motivoRejeicao") if item.get("motivoRejeicao") in QUARANTINE_TEXTS else "VERIFICACAO_FALHOU"
        return {"id": file_id, "accepted": False, "quarantine": reason, "reason": QUARANTINE_TEXTS[reason]}
    review = item.get("avaliacao") if isinstance(item.get("avaliacao"), dict) else {}
    meta = review.get("metadados") if isinstance(review.get("metadados"), dict) else {}
    result = {"id": file_id, "accepted": bool(review.get("aceito"))}
    if review.get("motivo"):
        result["reason"] = review["motivo"]
    metadata = _present_keys(documentKind=meta.get("tipoDocumento"), issuer=meta.get("emissor"), normIdentifier=meta.get("identificacaoNorma"))
    if metadata:
        result["metadata"] = metadata
    return result


def file_status_from_v1(item: Any) -> dict:
    """ArquivoAgente -> {id, status, result?, reply?} for await_quarantine."""
    if not isinstance(item, dict) or item.get("status") not in (CHECKING, APPROVED, REJECTED):
        raise ChatRequestError("SERVICE_UNAVAILABLE", 200)
    status = {"id": item.get("arquivoId"), "status": item["status"]}
    if item["status"] != CHECKING:
        status["result"] = file_result_from_v1(item)
    if isinstance(item.get("resposta"), dict):
        status["reply"] = reply_from_v1(item["resposta"])
    return status


class BffBackend:
    """The BFF contract v1 (`/agente/sessoes/...`, relative to bff.base_url + /v1) through core.api (R4); internal shapes
    in and out, so the controller and the widget do not know the v1 names."""

    BASE = "/agente/sessoes"
    on_checking: Optional[Callable[[str], None]] = None  # "Verificando o documento..." while in quarantine (set per call)
    poll_interval = QUARANTINE_POLL_SECONDS
    poll_timeout = QUARANTINE_TIMEOUT_SECONDS

    def __init__(self, api: Any = None, sleep: Callable[[float], None] = time.sleep, clock: Callable[[], float] = time.monotonic):
        if api is None:
            from core import api as api_module  # imported late: the module is the only door to the BFF
            api = api_module
        self.api = api
        self.sleep, self.clock = sleep, clock

    def _call(self, fn: Callable[[], Any]) -> Any:
        try:
            return fn()
        except Exception as error:  # noqa: BLE001 - ApiError, network or decoding: all mapped to a known code
            raise _as_request_error(error) from error

    def _session(self, session_id: str) -> str:
        return f"{self.BASE}/{quote(str(session_id), safe='')}"

    def _first_name(self) -> Optional[str]:
        """GET /usuarios/me (S4): only for the greeting; a failure means a greeting without a name, never an error."""
        try:
            body = self.api.get_json("/usuarios/me")
        except Exception:  # noqa: BLE001
            return None
        name = body.get("primeiroNome") if isinstance(body, dict) else None
        return name if isinstance(name, str) else None

    def start_session(self) -> dict:
        def run() -> dict:
            body = self.api.post_json(self.BASE) or {}
            if not body.get("sessaoId"):
                raise ChatRequestError("SERVICE_UNAVAILABLE", 201)
            reply = {"sessionId": body["sessaoId"], **reply_from_v1(body)}
            name = self._first_name()
            if name:
                reply["user"] = {"firstName": name}
            return reply
        return self._call(run)

    def send_message(self, request: dict) -> dict:
        body = _present_keys(passoId=request.get("nodeId"), acao=V1_ACTIONS.get(request.get("action"), request.get("action")),
                             opcaoId=request.get("optionId"), texto=request.get("text"), requisicaoId=request.get("requestId"))
        return self._call(lambda: reply_from_v1(self.api.post_json(f"{self._session(request.get('sessionId'))}/mensagens", body)))

    def send_files(self, session_id: str, node_id: str, files: list[ChatFile], request_id: str) -> dict:
        base = self._session(session_id)
        parts = [(f.name, f.data, f.type or "application/octet-stream") for f in files]

        def run() -> dict:
            # 4th argument = multipart field of the documents (v1: "arquivos", repeated, in the order chosen)
            accepted = self.api.post_multipart(f"{base}/arquivos", {"passoId": node_id, "requisicaoId": request_id}, parts, "arquivos")
            ids = [item.get("arquivoId") for item in (accepted or {}).get("arquivos") or [] if isinstance(item, dict)]
            return await_quarantine(
                [i for i in ids if i],
                lambda file_id: file_status_from_v1(self.api.get_json(f"{base}/arquivos/{quote(str(file_id), safe='')}")),
                lambda: self.api.post_json(f"{base}/cancelamentos", {"requisicaoId": request_id}),
                on_checking=self.on_checking, interval=self.poll_interval, timeout=self.poll_timeout, sleep=self.sleep, clock=self.clock)
        return self._call(run)

    def send_feedback(self, request: dict) -> None:
        body = {"nota": V1_RATINGS.get(request.get("rating"), request.get("rating")), "fonteIds": list(request.get("sourceIds") or [])}
        self._call(lambda: self.api.post_json(f"{self._session(request.get('sessionId'))}/avaliacoes", body))

    def cancel_request(self, request: dict) -> dict:
        def run() -> dict:
            body = self.api.post_json(f"{self._session(request.get('sessionId'))}/cancelamentos", {"requisicaoId": request.get("requestId")})
            return {"node": node_from_v1((body or {}).get("passo"))}
        return self._call(run)

    def end_session(self, session_id: str) -> None:
        self._call(lambda: self.api.delete(self._session(session_id)))


def get_backend() -> ChatBackend:
    """CHAT_MOCK (or no BFF configured) -> mock; else the BFF."""
    return MockBackend(mock_server()) if chat_mock() else BffBackend()


# --- Conversation (chat-session.service.ts) -----------------------------------------------------------------------------------
@dataclass
class ChatState:
    messages: list[dict] = field(default_factory=list)
    node: Optional[dict] = None  # current step; None until the session starts
    used_bytes: int = 0  # bytes of documents accepted in this conversation
    can_retry: bool = False  # the last request failed and can be repeated
    has_interaction: bool = False  # the user sent something: enables "Recomeçar" and "Encerrar"
    session_id: Optional[str] = None
    closed: bool = False  # "Encerrar" was chosen: no new session until "Recomeçar"
    retry_action: Optional[dict] = None  # the failed request, repeated as is (same requestId) by "Tentar novamente"
    queued_question: Optional[str] = None  # question from another screen, sent as soon as the session is ready
    open_request: bool = False  # ask() wants the panel opened on the next render
    upload_round: int = 0  # changes the uploader key after each send, so it starts empty
    file_errors: list[str] = field(default_factory=list)  # "nome: motivo" for documents that could not go
    table_view: dict = field(default_factory=dict)  # message id -> norm list shown as a table
    sequence: int = 0
    auto_restarts: int = 0  # new sessions opened by SESSION_NOT_FOUND since the last answer (capped: MAX_AUTO_RESTARTS)
    auth_required: bool = False  # the BFF answered 401: only "Entrar novamente" (reload through the gateway) helps


def chat_state() -> ChatState:
    if "chat" not in st.session_state or not isinstance(st.session_state.chat, ChatState):
        st.session_state.chat = ChatState()
    return st.session_state.chat


def _now() -> datetime:
    """Local clock of the users (Brasília); the server may run in UTC."""
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)
    except Exception:  # no tz database in the image
        return datetime.now()


def _first_name(reply: dict) -> Optional[str]:
    """Name for the greeting: the gateway identity (core.auth), else what the BFF knows; never logged or sent back."""
    try:
        from core.auth import current_user

        name = current_user().first_name
    except Exception:
        name = None
    return name or (reply.get("user") or {}).get("firstName")


def _new_request_id(state: ChatState) -> str:
    state.sequence += 1
    return f"r{int(time.time() * 1000):x}-{state.sequence}-{secrets.token_hex(4)}"


_KNOWN_ROLES = {"user", "ai", "system"}


def _to_message(message: dict) -> dict:
    # id/createdAt are generated after the merge, not before: a BFF reply must never override them (used as widget
    # keys) or send an unknown role (interpolated raw into a CSS class and an aria attribute when the bubble renders).
    merged = {**message, "role": message.get("role") if message.get("role") in _KNOWN_ROLES else "system"}
    merged["id"] = f"m{uuid.uuid4().hex[:12]}"
    merged["createdAt"] = datetime.now()
    return merged


def _append(state: ChatState, message: dict) -> dict:
    message = _to_message(message)
    state.messages.append(message)
    return message


def _drop_transient(state: ChatState) -> None:
    state.messages = [m for m in state.messages if not m.get("transient")]


def _add_user_message(state: ChatState, **content: Any) -> dict:
    _drop_transient(state)
    message = _append(state, {"role": "user", **content})
    state.has_interaction = True
    return message


def _request_base(state: ChatState) -> Optional[dict]:
    if not state.session_id or not state.node:
        return None
    return {"sessionId": state.session_id, "nodeId": state.node["id"], "requestId": _new_request_id(state)}


def _present(state: ChatState, messages: list[dict], node: dict) -> None:
    if (state.node or {}).get("id") != node.get("id"):
        state.file_errors = []
    for message in messages:
        _append(state, message)
    state.node = node


def _execute(state: ChatState, backend: ChatBackend, action: dict) -> None:
    """Runs one request (start, message or files); on failure keeps it in retry_action to be repeated unchanged."""
    state.can_retry = False
    try:
        if action["kind"] == "start":
            reply = backend.start_session()
            messages = with_greeting(reply.get("messages") or [], build_greeting(_first_name(reply), _now()))
            state.session_id = reply["sessionId"]
            state.retry_action = None
            _present(state, messages, reply["node"])
        elif action["kind"] == "message":
            reply = backend.send_message(action["request"])
            state.retry_action = None
            _present(state, reply.get("messages") or [], reply["node"])
        else:
            request, files = action["request"], action["files"]
            reply = with_file_results(backend.send_files(request["sessionId"], request["nodeId"], files, request["requestId"]), files)
            results = reply.get("files") or []
            for message in state.messages:
                if message["id"] == action["messageId"]:
                    message["files"] = [{**a, "accepted": results[i].get("accepted") if i < len(results) else None}
                                        for i, a in enumerate(message.get("files") or [])]
            state.used_bytes += sum(f.size for i, f in enumerate(files) if i < len(results) and results[i].get("accepted"))
            state.retry_action = None
            _present(state, reply.get("messages") or [], reply["node"])
    except Exception as error:  # noqa: BLE001 - shown as an error message, never raised to the page
        _fail(state, backend, _as_request_error(error), action)
        return
    state.auto_restarts = 0  # the backend answered: the next SESSION_NOT_FOUND may open a new session again
    _flush_question(state, backend)


def _login_url() -> str:
    try:
        from core import api

        return api.login_url()
    except Exception:  # noqa: BLE001 - settings unreadable: reload the app root
        return "/"


def _fail(state: ChatState, backend: ChatBackend, error: ChatRequestError, action: dict) -> None:
    support = {"supportCode": TEXTS["supportCode"].format(traceId=error.trace_id)} if getattr(error, "trace_id", None) else {}
    if error.code == "AUTH_REQUIRED":
        # The gateway session is over: repeating the request (or opening a session on the next rerun) would fail again;
        # the message carries the link that reloads through the gateway, which signs the user in again.
        state.retry_action, state.can_retry, state.auth_required = None, False, True
        _append(state, {"role": "ai", "status": "error", "text": error_text("AUTH_REQUIRED"), "loginUrl": _login_url(), **support})
        return
    if error.code == "SESSION_NOT_FOUND":
        state.session_id = None
        state.node = None
        if state.auto_restarts < MAX_AUTO_RESTARTS:
            # Expired on the server: say so and open a new session, keeping what is on screen.
            state.auto_restarts += 1
            state.retry_action = None
            _append(state, {"role": "system", "text": TEXTS["sessionExpired"], "transient": True})
            start(state, backend)
            return
        # A backend that keeps answering SESSION_NOT_FOUND would recurse _fail -> start -> _fail without end: stop here;
        # "Tentar novamente" opens a new session (the failed request names a session that no longer exists).
        action, error = {"kind": "start"}, ChatRequestError("SERVICE_UNAVAILABLE", error.status)
    state.retry_action = action
    _append(state, {"role": "ai", "status": "error", "text": error_text(error.code), **support})
    state.can_retry = True


def _send_action(state: ChatState, backend: ChatBackend, request: dict, action: str, **extra: Any) -> None:
    state.has_interaction = True
    payload = {**request, **{k: v for k, v in extra.items() if v is not None}, "action": action}
    _execute(state, backend, {"kind": "message", "request": payload})


def _flush_question(state: ChatState, backend: ChatBackend) -> None:
    request = _request_base(state) if state.queued_question else None
    if not request:
        return
    text, state.queued_question = state.queued_question, None
    _add_user_message(state, text=text)
    _send_action(state, backend, request, "ask", text=text)


def start(state: ChatState, backend: Optional[ChatBackend] = None) -> None:
    """Opens the session on first use; later calls do nothing."""
    if state.session_id or state.closed or state.auth_required:
        return
    if state.can_retry and (state.retry_action or {}).get("kind") == "start":
        return  # a failed start waits for "Tentar novamente" (render_panel calls this on every rerun)
    _execute(state, backend or get_backend(), {"kind": "start"})


def pick_option(state: ChatState, option: dict, backend: Optional[ChatBackend] = None) -> None:
    request = _request_base(state)
    if not request:
        return
    _add_user_message(state, text=option["label"])
    _send_action(state, backend or get_backend(), request, "option", optionId=option["id"])


def send_text(state: ChatState, text: str, backend: Optional[ChatBackend] = None) -> None:
    """Sends what the user typed; a plain goodbye closes the conversation instead."""
    request = _request_base(state)
    if not request or not (text or "").strip():
        return
    be = backend or get_backend()
    _add_user_message(state, text=text)
    if is_farewell_message(text):
        end(state, be)
        return
    _send_action(state, be, request, "text", text=text)


def ask(state: ChatState, question: str, backend: Optional[ChatBackend] = None) -> None:
    """A question from another screen (Tabela Analítica): opens the panel and answers it with action 'ask'."""
    text = (question or "").strip()[: CHAT_LIMITS["maxInputChars"]]
    if not text:
        return
    be = backend or get_backend()
    if state.closed:
        restart(state, be)
    state.open_request = True
    state.queued_question = text
    start(state, be)
    _flush_question(state, be)


def send_files(state: ChatState, files: list[ChatFile], backend: Optional[ChatBackend] = None) -> None:
    """Sends documents together; each gets its verdict on the user's message, only accepted bytes count to the quota."""
    request = _request_base(state)
    if not request or not files:
        return
    message = _add_user_message(state, files=[{"name": f.name, "sizeBytes": f.size} for f in files])
    _execute(state, backend or get_backend(), {"kind": "files", "request": request, "files": list(files), "messageId": message["id"]})


def back(state: ChatState, backend: Optional[ChatBackend] = None) -> None:
    request = _request_base(state)
    if not request:
        return
    _drop_transient(state)
    _send_action(state, backend or get_backend(), request, "back")


def retry(state: ChatState, backend: Optional[ChatBackend] = None) -> None:
    """ "Tentar novamente": drops the error message and repeats the same request (same requestId)."""
    action = state.retry_action
    if not action:
        return
    state.messages = state.messages[:-1]
    state.can_retry = False
    _execute(state, backend or get_backend(), action)


def _drop_session(state: ChatState, backend: ChatBackend) -> None:
    state.retry_action = None
    old, state.session_id = state.session_id, None
    if old:
        try:
            backend.end_session(old)
        except Exception:  # noqa: BLE001 - the BFF's TTL covers a failure here
            pass


def restart(state: ChatState, backend: Optional[ChatBackend] = None) -> None:
    """Forgets the conversation, tells the BFF to drop it and opens a new one."""
    be = backend or get_backend()
    _drop_session(state, be)
    keep = {"open_request": state.open_request, "upload_round": state.upload_round + 1, "sequence": state.sequence}
    state.__dict__.update({**ChatState().__dict__, **keep})
    start(state, be)


def end(state: ChatState, backend: Optional[ChatBackend] = None) -> None:
    """ "Encerrar": says goodbye and drops the server session; the conversation stays on screen."""
    if state.closed or not state.messages:
        return
    _drop_session(state, backend or get_backend())
    state.closed = True
    state.has_interaction = True
    state.can_retry = False
    _present(state, [{"role": "ai", "text": TEXTS["farewell"]}], dict(CLOSED_NODE))


def rate_message(state: ChatState, message_id: str, rating: str, backend: Optional[ChatBackend] = None) -> None:
    """Rates an answer once. Optimistic: the thanks shows at once and is taken back (with an error note) if sending fails."""
    message = next((m for m in state.messages if m["id"] == message_id), None)
    if not state.session_id or not message or message.get("feedback") or not can_rate_message(message):
        return
    message["feedback"], message["feedbackError"] = rating, False
    source_ids = [c["sourceId"] for c in message.get("citations") or []]
    try:
        (backend or get_backend()).send_feedback({"sessionId": state.session_id, "rating": rating, "sourceIds": source_ids})
    except Exception:  # noqa: BLE001
        message["feedback"], message["feedbackError"] = None, True


def suggestions(state: ChatState) -> list[dict]:
    return build_chat_suggestions(state.node, False, state.has_interaction, last_quick_replies(state.messages))


def show_retry(state: ChatState) -> bool:
    return state.can_retry and bool(state.messages) and state.messages[-1].get("status") == "error"


# --- Rendering (chat-widget / chat-messages / chat-input) ---------------------------------------------------------------------
LOG_HEIGHT = 400  # px; with header and input the panel is about 600 px tall, like the Angular one


def _variant(message: dict) -> str:
    """Status class of the bubble (border colour), as chat-messages.component.html."""
    status = message.get("status")
    return {"answer": "answer", "need_more_info": "clarify", "out_of_scope": "notice", "not_in_data": "notice",
            "error": "error"}.get(status, "plain")


def _author(message: dict) -> str:
    return TEXTS["userName"] if message["role"] == "user" else (TEXTS["agentName"] if message["role"] == "ai" else "")


def starts_group(messages: list[dict], index: int) -> bool:
    """Name (and icon) only on the first of consecutive messages by the same author; system notes have none."""
    message = messages[index]
    return message["role"] != "system" and (index == 0 or messages[index - 1]["role"] != message["role"])


def author_html(message: dict) -> str:
    # The icon is a CSS mask on /app/static/icons/cil-speech.svg (chat.css): st.html drops inline SVG in 1.40.
    avatar = '<span class="chat-msg__avatar" aria-hidden="true"></span>' if message["role"] == "ai" else ""
    return f'<p class="chat-msg__author chat-msg__author--{message["role"]}">{avatar}{escape_html(_author(message))}</p>'


def bubble_head_html(message: dict, grouped: bool) -> str:
    """Attachments, text and clarification questions (everything before the interactive blocks)."""
    parts = []
    if not grouped and _author(message):
        parts.append(f'<span class="visually-hidden">{escape_html(_author(message))}:</span>')
    for f in message.get("files") or []:
        verdict = "" if f.get("accepted") is None else f' · {TEXTS["fileAccepted"] if f["accepted"] else TEXTS["fileRejected"]}'
        parts.append(f'<p class="chat-msg__file"><span class="chat-msg__file-name">{escape_html(f["name"])}</span>'
                     f'<span class="chat-msg__file-meta">{format_file_size(f["sizeBytes"])}{verdict}</span></p>')
    if message.get("text"):
        parts.append(f'<div class="chat-msg__text">{safe_markdown(message["text"])}</div>')
    if message.get("questions"):
        items = "".join(f"<li>{escape_html(q)}</li>" for q in message["questions"])
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["clarify"]}</p>'
                     f'<ul class="chat-msg__list">{items}</ul></div>')
    return "".join(parts)


def norms_html(message: dict, items: list[dict], as_table: bool) -> str:
    date_label = (message.get("normList") or {}).get("dateLabel") or ""
    if not as_table:
        rows = []
        for i in items:
            meta = ""
            if i.get("segment") or i.get("date"):
                sep = " · " if i.get("segment") and i.get("date") else ""
                when = f"{escape_html(date_label)} {format_norm_date(i.get('date'))}" if i.get("date") else ""
                meta = f'<span class="chat-norms__meta">{escape_html(i.get("segment") or "")}{sep}{when}</span>'
            detail = f'<span class="chat-norms__detail">{escape_html(i["detail"])}</span>' if i.get("detail") else ""
            rows.append(f'<li class="chat-norms__item"><strong class="chat-norms__title">{escape_html(i["title"])}</strong>{detail}{meta}</li>')
        return f'<ul class="chat-msg__list chat-norms__list">{"".join(rows)}</ul>'
    title = escape_html(norm_list_title(message))
    head = "".join(f'<th scope="col">{escape_html(h)}</th>' for h in (TEXTS["normsColumnTitle"], TEXTS["normsColumnDetail"],
                                                                     TEXTS["normsColumnSegment"], date_label or TEXTS["normsDate"]))
    body = "".join(f'<tr><td class="chat-norms__title">{escape_html(i["title"])}</td><td>{escape_html(i.get("detail") or "")}</td>'
                   f'<td class="chat-norms__nowrap">{escape_html(i.get("segment") or "")}</td>'
                   f'<td class="chat-norms__nowrap">{format_norm_date(i.get("date"))}</td></tr>' for i in items)
    return (f'<div class="chat-norms__table-wrap" role="region" tabindex="0" aria-label="{title}"><table class="chat-norms__table">'
            f'<caption class="visually-hidden">{title}</caption><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')


def file_results_html(rows: list[dict]) -> str:
    title = TEXTS["fileResultsTitle"]
    head = "".join(f'<th scope="col">{h}</th>' for h in (TEXTS["fileColumnName"], TEXTS["fileColumnResult"],
                                                         TEXTS["fileColumnNorm"], TEXTS["fileColumnNote"]))
    body = []
    for row in rows:
        cells = file_result_cells(row)
        rejected = "" if row["result"].get("accepted") else " chat-norms__rejected"
        body.append(f'<tr><td class="chat-norms__title">{escape_html(cells["name"])}</td>'
                    f'<td class="chat-norms__nowrap{rejected}">{escape_html(cells["result"])}</td>'
                    f'<td>{escape_html(cells["norm"])}</td><td>{escape_html(cells["note"] or cells["kind"])}</td></tr>')
    return (f'<p class="chat-msg__block-title">{title}</p><div class="chat-norms__table-wrap" role="region" tabindex="0" '
            f'aria-label="{title}"><table class="chat-norms__table"><caption class="visually-hidden">{title}</caption>'
            f'<thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>')


def bubble_tail_html(message: dict) -> str:
    """Login link (401), support code, sources and contacts (after the norm list and the documents table)."""
    parts = []
    if message.get("loginUrl"):
        parts.append(f'<p class="chat-msg__login"><a href="{escape_html(message["loginUrl"])}" target="_self">{TEXTS["loginLink"]}</a></p>')
    if message.get("supportCode"):
        parts.append(f'<p class="chat-msg__support">{escape_html(message["supportCode"])}</p>')
    if message.get("citations"):
        items = "".join(f'<li><q class="chat-msg__excerpt">{escape_html(c.get("excerpt") or "")}</q>'
                        f'<span class="chat-msg__source-id">{escape_html(c.get("sourceId") or "")}</span></li>'
                        for c in message["citations"])
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["sources"]}</p>'
                     f'<ul class="chat-msg__list chat-msg__sources">{items}</ul></div>')
    if message.get("contacts"):
        items = []
        for c in message["contacts"]:
            channel = escape_html(c.get("channel") or "")
            link = f'<a href="mailto:{channel}">{channel}</a>' if is_email(c.get("channel") or "") else channel
            items.append(f'<li><strong>{escape_html(c.get("name") or "")}</strong> · {escape_html(c.get("area") or "")}<br />{link}</li>')
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["contacts"]}</p>'
                     f'<ul class="chat-msg__list chat-msg__contacts">{"".join(items)}</ul></div>')
    return "".join(parts)


# Callbacks: run before the rerun, so the popover stays open and no st.rerun() is needed.
def _cb(fn: Callable[..., None], *args: Any) -> None:
    fn(chat_state(), *args)


def _on_text() -> None:
    text = (st.session_state.get("chat-text") or "").strip()
    if text:
        send_text(chat_state(), text)


def _on_files(key: str) -> None:
    state = chat_state()
    uploaded = st.session_state.get(key) or []
    upload = (state.node or {}).get("upload")
    if not uploaded or not upload:
        return
    files = [ChatFile(u.name, u.size, u.type or "", u.getvalue()) for u in uploaded]
    check = validate_chat_files(files, upload, state.used_bytes)
    state.file_errors = [f"{p['name']}: {file_problem_text(p['problem'])}" for p in check.problems]
    errors = state.file_errors
    if check.valid:
        backend = get_backend()
        # Quarantine runs while this callback waits: a toast says so (the panel redraws only when it ends).
        backend.on_checking = lambda text: st.toast(text, icon=":material/hourglass_top:")
        send_files(state, check.valid, backend)
        state.file_errors = errors  # a step change clears them; documents refused here must still be explained
    state.upload_round += 1


def _on_suggestion(index: int) -> None:
    state = chat_state()
    items = suggestions(state)
    if index >= len(items):
        return
    s = items[index]
    if s["kind"] == "option":
        pick_option(state, s["option"])
    elif s["kind"] == "reply":
        send_text(state, s["label"])
    elif s["kind"] == "back":
        back(state)
    elif s["kind"] == "end":
        end(state)
    elif s["kind"] == "restart":
        restart(state)


def _toggle_table(message_id: str) -> None:
    state = chat_state()
    state.table_view[message_id] = not state.table_view.get(message_id)


def _download(label: str, table_fn: Callable[[], XlsxTable], key: str) -> None:
    try:
        table = table_fn()
        data = build_xlsx(table)
    except Exception:  # noqa: BLE001
        st.html(f'<p class="chat-feedback__error" role="alert">{TEXTS["normsExportFailed"]}</p>')
        return
    st.download_button(label, data=data, file_name=table.file_name, mime=XLSX_MIME, key=key, icon=":material/download:")


def _render_norms(state: ChatState, message: dict) -> None:
    mid = message["id"]
    segments = segments_of(message)
    segment = None
    with st.container(key=f"chat-norms-{mid}"):
        if len(segments) > 1:
            choice = st.pills(TEXTS["normsFilter"], [TEXTS["normsAll"], *segments], default=TEXTS["normsAll"],
                              key=f"chat-seg-{mid}", label_visibility="collapsed")
            segment = None if choice in (None, TEXTS["normsAll"]) else choice
        items = visible_norms(message, segment)
        as_table = bool(state.table_view.get(mid))
        st.html(norms_html(message, items, as_table))
        if len(message["normList"]["items"]) > 1:
            with st.container(key=f"chat-row-norms-{mid}"):
                st.button(TEXTS["normsShowList"] if as_table else TEXTS["normsShowTable"], key=f"chat-tbl-{mid}",
                          icon=":material/list:" if as_table else ":material/table_chart:", on_click=_toggle_table, args=(mid,))
                if as_table:
                    _download(TEXTS["normsExport"], lambda: norm_list_xlsx_table(message, items, segment, _now()), f"chat-xls-{mid}")


def _render_feedback(message: dict) -> None:
    mid = message["id"]
    with st.container(key=f"chat-row-feedback-{mid}"):
        if message.get("feedback"):
            st.html(f'<span class="chat-feedback__label" role="status">{TEXTS["feedbackThanks"]}</span>')
        else:
            st.html(f'<span class="chat-feedback__label">{TEXTS["feedbackQuestion"]}</span>')
            st.button(TEXTS["feedbackUseful"], key=f"chat-up-{mid}", icon=":material/thumb_up:",
                      on_click=_cb, args=(rate_message, mid, "useful"))
            st.button(TEXTS["feedbackNotUseful"], key=f"chat-down-{mid}", icon=":material/thumb_down:",
                      on_click=_cb, args=(rate_message, mid, "not_useful"))
        if message.get("feedbackError"):
            st.html(f'<span class="chat-feedback__error" role="alert">{TEXTS["feedbackFailed"]}</span>')


def _render_message(state: ChatState, index: int) -> None:
    message = state.messages[index]
    grouped = starts_group(state.messages, index)
    if grouped:
        st.html(author_html(message))
    with st.container(key=f"chat-b-{message['role']}-{_variant(message)}-{message['id']}"):
        head = bubble_head_html(message, grouped)
        if head:
            st.html(head)
        if (message.get("normList") or {}).get("items"):
            _render_norms(state, message)
        if message.get("fileResults"):
            with st.container(key=f"chat-norms-files-{message['id']}"):
                st.html(file_results_html(message["fileResults"]))
                with st.container(key=f"chat-row-files-{message['id']}"):
                    _download(TEXTS["normsExport"], lambda: file_results_xlsx_table(message["fileResults"], _now()),
                              f"chat-xls-files-{message['id']}")
        tail = bubble_tail_html(message)
        if tail:
            st.html(tail)
        if can_rate_message(message):
            _render_feedback(message)


def _render_input(state: ChatState) -> None:
    node = state.node or {}
    if node.get("type") == "free_text":
        max_chars = (node.get("input") or {}).get("maxChars") or CHAT_LIMITS["maxInputChars"]
        with st.container(key="chat-input"):
            st.chat_input((node.get("input") or {}).get("placeholder") or TEXTS["inputPlaceholder"], key="chat-text",
                          max_chars=max_chars, on_submit=_on_text)
    elif node.get("type") == "upload" and node.get("upload"):
        key = f"chat-files-{state.upload_round}"
        with st.container(key="chat-upload"):
            st.file_uploader(TEXTS["attach"], type=[e.lstrip(".") for e in node["upload"]["accept"]], accept_multiple_files=True,
                             key=key, label_visibility="collapsed", on_change=_on_files, args=(key,))
            st.html(f'<p class="chat-input__hint">{TEXTS["uploadHint"]}</p>')
            if state.file_errors:
                items = "".join(f"<li>{escape_html(e)}</li>" for e in state.file_errors)
                st.html(f'<ul class="chat-input__error" role="alert">{items}</ul>')


def render_panel(state: ChatState) -> None:
    """Conversation, suggestions and input, inside whatever container the caller opened (popover or page)."""
    start(state)
    with st.container(height=LOG_HEIGHT, border=False, key="chat-log"):
        # 1.40 keeps a fixed-height container pinned to the bottom only when it holds a chat message block; this empty
        # one (hidden by chat.css) turns that behaviour on, so new messages scroll into view like in the landing.
        with st.chat_message("assistant"):
            st.empty()  # an empty block is not sent to the browser
        for index in range(len(state.messages)):
            _render_message(state, index)
        if show_retry(state):
            with st.container(key="chat-row-retry"):
                st.button(TEXTS["retry"], key="chat-retry", on_click=_cb, args=(retry,))
        items = suggestions(state)
        if items:
            with st.container(key="chat-suggestions"):
                for i, s in enumerate(items):
                    st.button(s["label"], key=f"chat-sug-{i}", type="secondary" if s["kind"] in ("back", "end") else "primary",
                              icon=":material/chevron_left:" if s["kind"] == "back" else None,
                              on_click=_on_suggestion, args=(i,))
    _render_input(state)


def _open_panel() -> None:
    """ask() from another screen: clicks the floating button when the panel is closed (core.compat.run_js, F1 seam)."""
    try:
        from core import compat

        run_js = getattr(compat, "run_js", None)
    except Exception:
        run_js = None
    if run_js is None:
        return
    script = ("const doc = window.parent.document;"
              "if (!doc.querySelector('[data-testid=\"stPopoverBody\"] .st-key-chat-head')) {"
              "  doc.querySelector('.st-key-chat-fab button')?.click(); }")
    run_js(script, key=f"chat-open-{chat_state().sequence}")


def render_widget() -> None:
    """Floating button + panel (bottom right), present on every page; call once per run, after the page body."""
    state = chat_state()
    lead, _, tail = TEXTS["agentName"].rpartition(" ")
    with st.container(key="chat-fab"):
        with st.popover(f"{lead} **{tail}**", icon=":material/chat:"):
            with st.container(key="chat-head"):
                st.html(f'<h2 class="chat-panel__title">{TEXTS["title"]}</h2>')
                st.button(TEXTS["restart"], key="chat-restart", disabled=not state.has_interaction, on_click=_cb, args=(restart,))
            render_panel(state)
    if state.open_request:
        state.open_request = False
        _open_panel()
