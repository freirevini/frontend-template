"""Agente da Agenda: mock engine (port of chat-mock-server.ts, same rules as the BFF spec) and the floating widget.

The widget is a fixed-position container (CSS on the st-key class) holding a popover with the conversation; the state
lives in st.session_state for the browser session, like the Angular ChatSessionService keeps it in memory.
"""
from __future__ import annotations

import html
import json
import re
import unicodedata
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import streamlit as st

from core.period import fmt_date

# Mock JSON files: `poc/data/` when present (copy of src/assets/data), else the landing's own folder four levels up
# (docs/planejamento/streamlit/poc -> landing-analitica/src/assets/data).
_POC = Path(__file__).resolve().parent.parent
DATA_DIR = _POC / "data" if (_POC / "data").is_dir() else _POC.parents[3] / "src" / "assets" / "data"

TEXTS = dict(
    agentName="Agente da Agenda", userName="Você", title="Agente da Agenda", inputPlaceholder="Digite sua pergunta",
    send="Enviar", stop="Parar", attach="Anexar documentos", restart="Recomeçar", back="Voltar", end="Encerrar",
    farewell="Foi um prazer ajudar! Obrigado por usar o Agente da Agenda. Se precisar de algo mais, é só recomeçar a conversa. Até logo!",
    sources="Fontes", contacts="Fale com a equipe responsável", typing="O Agente da Agenda está digitando",
    clarify="Para continuar, preciso saber:", feedbackQuestion="Esta resposta ajudou?", feedbackUseful="Útil",
    feedbackNotUseful="Não útil", feedbackThanks="Obrigado pelo feedback.",
    uploadHint="PDF, Word (DOC ou DOCX), PNG, JPG ou WEBP; até 5 arquivos por vez e 20 MB por conversa.",
    fileAccepted="Documento aceito", fileRejected="Documento não aceito", sessionExpired="A conversa expirou por inatividade. Vamos recomeçar.",
    goodMorning="Bom dia", goodAfternoon="Boa tarde", goodEvening="Boa noite", normsAll="Todos",
)
CHAT_LIMITS = dict(maxSessionBytes=20 * 1024 * 1024, maxInputChars=1000, maxFilesPerSend=5,
                   allowedExtensions=[".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"])


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").lower()


# --- Safe markdown (port of safe-markdown.ts): escape everything, then write only p/br/strong/em/code/ul/ol/li/a ------
def safe_markdown(text: Optional[str]) -> str:
    if not text:
        return ""
    escaped = html.escape(text, quote=True)
    blocks: list[tuple[str, list[str]]] = []
    for raw in escaped.split("\n"):
        line = raw.strip()
        if not line:
            blocks.append(("p", []))
            continue
        bullet = re.match(r"^[-*]\s+(.*)$", line)
        numbered = None if bullet else re.match(r"^\d+[.)]\s+(.*)$", line)
        kind = "ul" if bullet else ("ol" if numbered else None)
        if kind:
            item = (bullet or numbered).group(1)
            if blocks and blocks[-1][0] == kind:
                blocks[-1][1].append(item)
            else:
                blocks.append((kind, [item]))
        elif blocks and blocks[-1][0] == "p" and blocks[-1][1]:
            blocks[-1][1].append(line)
        else:
            blocks.append(("p", [line]))

    def inline(s: str) -> str:
        s = re.sub(r"`([^`\n]+)`", r"<code>\1</code>", s)
        s = re.sub(r"\[([^\]\n]+)\]\((https?://[^\s)]+)\)", r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', s)
        s = re.sub(r"\*\*([^*\s](?:[^*]*[^*\s])?)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"\*([^*\s](?:[^*]*[^*\s])?)\*", r"<em>\1</em>", s)
        return s

    out = []
    for kind, items in blocks:
        if kind == "p":
            if items:
                out.append("<p>" + "<br>".join(inline(i) for i in items) + "</p>")
        else:
            out.append(f"<{kind}>" + "".join(f"<li>{inline(i)}</li>" for i in items) + f"</{kind}>")
    return "".join(out)


# --- Mock server ---------------------------------------------------------------------------------------------------------
class ChatRequestError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


@dataclass
class MockSession:
    node_id: str
    rounds: int = 0
    out_of_scope: int = 0
    used_bytes: int = 0


class ChatMockServer:
    """Plays the BFF while it does not exist (menu/free_text/upload nodes, keyword answers, file verdicts)."""

    def __init__(self, flow: dict):
        self.flow = flow
        self.sessions: dict[str, MockSession] = {}
        self.sequence = 0

    def start_session(self) -> dict:
        self.sequence += 1
        sid = f"mock-{self.sequence}-{uuid.uuid4().hex[:8]}"
        session = MockSession(self.flow["start"])
        self.sessions[sid] = session
        reply = self._begin(session)
        return {"sessionId": sid, **reply, **({"user": dict(self.flow["user"])} if self.flow.get("user") else {})}

    def handle_message(self, sid: str, node_id: str, action: str, option_id: str | None = None, text: str | None = None) -> dict:
        session = self._session(sid)
        node = self._node(session.node_id)
        if node_id != node["id"]:
            raise ChatRequestError("INVALID_ACTION")
        if action == "restart":
            session.rounds = session.out_of_scope = session.used_bytes = 0
            return self._begin(session)
        if action == "back":
            previous = self.flow["back"].get(node["id"])
            if not node.get("canGoBack") or not previous:
                raise ChatRequestError("INVALID_ACTION")
            return self._enter(session, previous)
        if action == "option":
            nxt = self.flow["transitions"].get(node["id"], {}).get(option_id or "") if node["type"] == "menu" else None
            if not nxt or not any(o["id"] == option_id for o in node.get("options", [])):
                raise ChatRequestError("INVALID_ACTION")
            return self._enter(session, nxt)
        if action == "text":
            return self._answer_text(session, node, text)
        if action == "ask":
            target = self._node(self.flow["askNode"]) if self.flow.get("askNode") else None
            length = len((text or "").strip())
            if not target or target["type"] != "free_text" or not length or length > (target.get("input", {}).get("maxChars") or CHAT_LIMITS["maxInputChars"]):
                raise ChatRequestError("INVALID_ACTION")
            session.node_id, session.rounds = target["id"], 0
            return self._answer_text(session, target, text)
        raise ChatRequestError("INVALID_ACTION")

    def handle_files(self, sid: str, node_id: str, files: list[tuple[str, int]]) -> dict:
        session = self._session(sid)
        node = self._node(session.node_id)
        if node_id != node["id"] or node["type"] != "upload" or not node.get("upload"):
            raise ChatRequestError("INVALID_ACTION")
        upload = node["upload"]
        if not files or len(files) > min(upload["maxFiles"], CHAT_LIMITS["maxFilesPerSend"]):
            raise ChatRequestError("INVALID_ACTION")
        used = session.used_bytes
        for name, size in files:
            ext = name[name.rfind("."):].lower() if "." in name else ""
            if ext not in upload["accept"]:
                raise ChatRequestError("FILE_TYPE_NOT_ALLOWED", 415)
            if size == 0:
                raise ChatRequestError("INVALID_ACTION")
            if size > upload["maxBytes"]:
                raise ChatRequestError("FILE_TOO_LARGE", 413)
            if used + size > CHAT_LIMITS["maxSessionBytes"]:
                raise ChatRequestError("SESSION_QUOTA_EXCEEDED", 413)
            used += size
        scen = self.flow["fileScenarios"]
        identifiers = scen["accepted"].get("normIdentifiers", [])
        accepted_count = 0
        results = []
        for name, size in files:
            self.sequence += 1
            rid = f"mock-arquivo-{self.sequence}"
            if any(_fold(k) in _fold(name) for k in scen["rejected"]["filenameKeywords"]):
                results.append({**json.loads(json.dumps(scen["rejected"]["result"])), "id": rid})
                continue
            session.used_bytes += size
            result = {**json.loads(json.dumps(scen["accepted"]["result"])), "id": rid}
            if identifiers:
                result["metadata"] = {**result.get("metadata", {}), "normIdentifier": identifiers[accepted_count % len(identifiers)]}
            accepted_count += 1
            results.append(result)
        summary = scen.get("summary")
        counted = None
        if len(files) > 1 and summary:
            counted = [{**summary, "text": (summary.get("text") or "").replace("{total}", str(len(files))).replace("{accepted}", str(accepted_count)).replace("{rejected}", str(len(files) - accepted_count))}]
        if not accepted_count:
            return {"node": dict(node), "messages": counted or json.loads(json.dumps(scen["rejected"]["messages"])), "files": results}
        nxt = self.flow["transitions"].get(node["id"], {}).get("accepted")
        entered = self._enter(session, nxt) if nxt else {"node": dict(node), "messages": []}
        return {"node": entered["node"], "messages": [*(counted or json.loads(json.dumps(scen["accepted"]["messages"]))), *entered["messages"]], "files": results}

    def end_session(self, sid: str) -> None:
        self.sessions.pop(sid, None)

    def _answer_text(self, session: MockSession, node: dict, raw: str | None) -> dict:
        text = (raw or "").strip()
        max_chars = node.get("input", {}).get("maxChars") or CHAT_LIMITS["maxInputChars"]
        if node["type"] != "free_text" or not text or len(text) > max_chars:
            raise ChatRequestError("INVALID_ACTION")
        fb = self.flow["fallbacks"]
        folded = _fold(text)
        hit = next((s for s in self.flow["textScenarios"] if any(_fold(w) in folded for w in s["keywords"])), None)
        if hit and hit["message"].get("status") == "out_of_scope":
            session.out_of_scope += 1
            limit = session.out_of_scope >= self.flow.get("maxOutOfScope", 3)
            return {"node": dict(node), "messages": [self._resolve(fb["outOfScopeLimit"] if limit else hit["message"])]}
        if hit:
            nxt = self.flow["transitions"].get(node["id"], {}).get("answered")
            entered = self._enter(session, nxt) if nxt else {"node": dict(node), "messages": []}
            return {"node": entered["node"], "messages": [self._resolve(hit["message"]), *entered["messages"]]}
        session.rounds += 1
        if session.rounds >= self.flow["maxClarificationRounds"]:
            session.rounds = 0
            return {"node": dict(node), "messages": [self._resolve(fb["roundsExceeded"])]}
        words = len(text.split())
        return {"node": dict(node), "messages": [self._resolve(fb["needMoreInfo"] if words < fb["minWordsForAnswer"] else fb["notInData"])]}

    def _begin(self, session: MockSession) -> dict:
        entered = self._enter(session, self.flow["start"])
        return {"node": entered["node"], "messages": [*json.loads(json.dumps(self.flow["welcome"])), *entered["messages"]]}

    def _enter(self, session: MockSession, node_id: str) -> dict:
        node = self._node(node_id)
        session.node_id, session.rounds = node_id, 0
        lst = (self.flow.get("lists") or {}).get(node_id)
        message = {"role": "ai", "text": node["prompt"], **({"normList": json.loads(json.dumps(lst))} if lst else {})}
        return {"node": dict(node), "messages": [message]}

    def _resolve(self, message: dict) -> dict:
        m = json.loads(json.dumps(message))
        ref = m.pop("contactsRef", None)
        if ref:
            m["contacts"] = json.loads(json.dumps(self.flow["contacts"].get(ref, [])))
        return m

    def _session(self, sid: str) -> MockSession:
        if sid not in self.sessions:
            raise ChatRequestError("SESSION_NOT_FOUND", 404)
        return self.sessions[sid]

    def _node(self, node_id: str) -> dict:
        if node_id not in self.flow["nodes"]:
            raise ChatRequestError("SERVICE_UNAVAILABLE", 500)
        return self.flow["nodes"][node_id]


@st.cache_resource(show_spinner=False)
def mock_server() -> ChatMockServer:
    """One server per Streamlit process, like the BFF: sessions in memory."""
    return ChatMockServer(json.loads((DATA_DIR / "chat-fluxo-mock.json").read_text(encoding="utf-8")))


# --- Greeting (chat-greeting.ts) -------------------------------------------------------------------------------------------
def greeting(first_name: Optional[str], now: datetime) -> str:
    hour = now.hour
    base = TEXTS["goodMorning"] if 5 <= hour < 12 else (TEXTS["goodAfternoon"] if 12 <= hour < 18 else TEXTS["goodEvening"])
    name = (first_name or "").strip().split()[0] if (first_name or "").strip() else ""
    if not re.match(r"^[^\W\d_]+(?:['’-][^\W\d_]+)*$", name) or len(name) > 40:
        name = ""
    return f"{base}, {name.capitalize()}!" if name else f"{base}!"


# --- Widget state ------------------------------------------------------------------------------------------------------------
@dataclass
class ChatState:
    session_id: Optional[str] = None
    node: Optional[dict] = None
    messages: list[dict] = field(default_factory=list)
    has_interaction: bool = False
    closed: bool = False
    used_bytes: int = 0
    open: bool = False
    expanded: bool = False
    ask_queue: Optional[str] = None


def chat_state() -> ChatState:
    if "chat" not in st.session_state:
        st.session_state.chat = ChatState()
    return st.session_state.chat


def _push(state: ChatState, message: dict) -> None:
    state.messages.append({"id": uuid.uuid4().hex, "createdAt": datetime.now(), **message})


def start(state: ChatState) -> None:
    if state.session_id or state.closed:
        return
    reply = mock_server().start_session()
    state.session_id = reply["sessionId"]
    msgs = list(reply["messages"])
    hello = greeting((reply.get("user") or {}).get("firstName"), datetime.now())
    first = next((i for i, m in enumerate(msgs) if m.get("role") == "ai" and m.get("text") and not m.get("transient")), -1)
    if first < 0:
        msgs.insert(0, {"role": "ai", "text": hello})
    else:
        msgs[first] = {**msgs[first], "text": f"{hello} {msgs[first]['text']}"}
    for m in msgs:
        _push(state, m)
    state.node = reply["node"]


def _apply(state: ChatState, reply: dict) -> None:
    for m in reply["messages"]:
        _push(state, m)
    state.node = reply["node"]


def _send(state: ChatState, action: str, **extra) -> None:
    if not state.session_id or not state.node:
        return
    state.has_interaction = True
    try:
        reply = mock_server().handle_message(state.session_id, state.node["id"], action, **extra)
        _apply(state, reply)
    except ChatRequestError as error:
        if error.code == "SESSION_NOT_FOUND":
            _push(state, {"role": "system", "text": TEXTS["sessionExpired"], "transient": True})
            state.session_id, state.node = None, None
            start(state)
        else:
            _push(state, {"role": "ai", "status": "error", "text": ERROR_TEXTS.get(error.code, ERROR_TEXTS["SERVICE_UNAVAILABLE"])})


ERROR_TEXTS = {
    "INVALID_ACTION": "Não foi possível processar essa opção. Escolha uma das opções disponíveis.",
    "SESSION_NOT_FOUND": TEXTS["sessionExpired"],
    "FILE_TYPE_NOT_ALLOWED": "Arquivo não aceito. Envie PDF, Word (DOC ou DOCX) ou imagem (PNG, JPG ou WEBP).",
    "FILE_TOO_LARGE": "O arquivo é maior que o permitido. O limite é de 20 MB por conversa.",
    "SESSION_QUOTA_EXCEEDED": "O limite de 20 MB por conversa foi atingido. Recomece para enviar outro documento.",
    "RATE_LIMITED": "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.",
    "SERVICE_UNAVAILABLE": "Não consegui responder agora. Tente novamente em instantes.",
}

FAREWELL_WORDS = {"tchau", "adeus", "obrigado", "obrigada", "valeu", "encerrar", "encerra", "finalizar", "fim", "sair", "ate", "logo", "mais", "breve", "so", "isso", "era", "pode", "ok", "ja", "entao", "muito", "por", "enquanto", "ate", "a", "o", "e", "de"}


def is_farewell(text: str) -> bool:
    words = [w for w in re.split(r"[^\w]+", _fold(text)) if w]
    if not words or len(words) > 8:
        return False
    return all(w in FAREWELL_WORDS for w in words) and any(w in {"tchau", "adeus", "encerrar", "encerra", "finalizar", "sair", "obrigado", "obrigada", "valeu"} for w in words)


def pick_option(state: ChatState, option: dict) -> None:
    _push(state, {"role": "user", "text": option["label"]})
    _send(state, "option", option_id=option["id"])


def send_text(state: ChatState, text: str) -> None:
    text = text.strip()
    if not text:
        return
    _push(state, {"role": "user", "text": text})
    if is_farewell(text):
        end(state)
        return
    _send(state, "text", text=text)


def ask(state: ChatState, question: str) -> None:
    """A question from another screen (Tabela Analítica): opens the panel and answers from the question step."""
    if state.closed:
        restart(state)
    state.open = True
    start(state)
    text = question.strip()[: CHAT_LIMITS["maxInputChars"]]
    _push(state, {"role": "user", "text": text})
    _send(state, "ask", text=text)


def send_files(state: ChatState, files) -> None:
    if not state.session_id or not state.node:
        return
    attachments = [{"name": f.name, "sizeBytes": f.size} for f in files]
    _push(state, {"role": "user", "files": attachments})
    state.has_interaction = True
    try:
        reply = mock_server().handle_files(state.session_id, state.node["id"], [(f.name, f.size) for f in files])
        for i, a in enumerate(state.messages[-1]["files"]):
            a["accepted"] = reply["files"][i]["accepted"] if i < len(reply["files"]) else None
        state.used_bytes += sum(f.size for i, f in enumerate(files) if reply["files"][i]["accepted"])
        if len(files) > 1 and reply["messages"]:
            reply["messages"][0]["fileResults"] = [{"name": f.name, "sizeBytes": f.size, "result": reply["files"][i]} for i, f in enumerate(files)]
        _apply(state, reply)
    except ChatRequestError as error:
        _push(state, {"role": "ai", "status": "error", "text": ERROR_TEXTS.get(error.code, ERROR_TEXTS["SERVICE_UNAVAILABLE"])})


def back(state: ChatState) -> None:
    state.messages = [m for m in state.messages if not m.get("transient")]
    _send(state, "back")


def restart(state: ChatState) -> None:
    if state.session_id:
        mock_server().end_session(state.session_id)
    st.session_state.chat = ChatState(open=state.open, expanded=state.expanded)
    start(st.session_state.chat)


def end(state: ChatState) -> None:
    if state.closed or not state.messages:
        return
    if state.session_id:
        mock_server().end_session(state.session_id)
    state.session_id = None
    state.closed = True
    state.has_interaction = True
    _push(state, {"role": "ai", "text": TEXTS["farewell"]})
    state.node = {"id": "closed", "type": "end", "prompt": TEXTS["farewell"], "canGoBack": False}


def suggestions(state: ChatState) -> list[dict]:
    node = state.node
    if not node:
        return []
    out: list[dict] = []
    if node["type"] == "menu":
        out += [{"kind": "option", "label": o["label"], "option": o} for o in node.get("options", [])]
    if node["type"] == "free_text":
        last = state.messages[-1] if state.messages else None
        if last and last.get("role") == "ai":
            out += [{"kind": "reply", "label": r} for r in last.get("quickReplies", [])]
    if node["type"] == "end":
        out.append({"kind": "restart", "label": TEXTS["restart"]})
    if node.get("canGoBack"):
        out.append({"kind": "back", "label": TEXTS["back"]})
    if state.has_interaction and node["type"] != "end":
        out.append({"kind": "end", "label": TEXTS["end"]})
    return out


# --- Rendering ----------------------------------------------------------------------------------------------------------------
def _author(message: dict) -> str:
    return TEXTS["agentName"] if message["role"] == "ai" else (TEXTS["userName"] if message["role"] == "user" else "")


def _file_size(size: int) -> str:
    return f"{size / 1024:.0f} KB" if size < 1024 * 1024 else f"{size / 1024 / 1024:.1f} MB".replace(".", ",")


def message_html(message: dict, starts_group: bool) -> str:
    role = message["role"]
    status = message.get("status")
    classes = [f"chat-msg chat-msg--{role}"]
    if status == "answer":
        classes.append("chat-msg--answer")
    if status == "need_more_info":
        classes.append("chat-msg--clarify")
    if status in ("out_of_scope", "not_in_data"):
        classes.append("chat-msg--notice")
    if status == "error":
        classes.append("chat-msg--error")
    parts = [f'<article class="{" ".join(classes)}">']
    if starts_group and _author(message):
        avatar = '<span class="chat-msg__avatar" aria-hidden="true">●</span>' if role == "ai" else ""
        parts.append(f'<p class="chat-msg__author">{avatar}{html.escape(_author(message))}</p>')
    parts.append('<div class="chat-msg__bubble">')
    for f in message.get("files") or []:
        verdict = "" if f.get("accepted") is None else f' · {TEXTS["fileAccepted"] if f["accepted"] else TEXTS["fileRejected"]}'
        parts.append(f'<p class="chat-msg__file"><span class="chat-msg__file-name">{html.escape(f["name"])}</span><span class="chat-msg__file-meta">{_file_size(f["sizeBytes"])}{verdict}</span></p>')
    if message.get("text"):
        parts.append(f'<div class="chat-msg__text">{safe_markdown(message["text"])}</div>')
    if message.get("questions"):
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["clarify"]}</p><ul class="chat-msg__list">' + "".join(f"<li>{html.escape(q)}</li>" for q in message["questions"]) + "</ul></div>")
    if message.get("normList", {}).get("items"):
        lst = message["normList"]
        items = "".join(
            f'<li class="chat-norms__item"><strong class="chat-norms__title">{html.escape(i["title"])}</strong>'
            + (f'<span class="chat-norms__detail">{html.escape(i["detail"])}</span>' if i.get("detail") else "")
            + (f'<span class="chat-norms__meta">{html.escape(i.get("segment", ""))}{" · " if i.get("segment") and i.get("date") else ""}{(lst.get("dateLabel", "") + " " + fmt_date(datetime.fromisoformat(i["date"]).date())) if i.get("date") else ""}</span>')
            + "</li>" for i in lst["items"])
        parts.append(f'<div class="chat-msg__block chat-norms"><ul class="chat-msg__list chat-norms__list">{items}</ul></div>')
    if message.get("fileResults"):
        rows = "".join(f'<tr><td class="chat-norms__title">{html.escape(r["name"])}</td><td>{"Aceito" if r["result"]["accepted"] else "Não aceito"}</td><td>{html.escape((r["result"].get("metadata") or {}).get("normIdentifier", ""))}</td><td>{html.escape(r["result"].get("reason", ""))}</td></tr>' for r in message["fileResults"])
        parts.append(f'<div class="chat-msg__block chat-norms"><p class="chat-msg__block-title">Resultado da avaliação dos documentos</p><div class="chat-norms__table-wrap"><table class="chat-norms__table"><thead><tr><th>Arquivo</th><th>Resultado</th><th>Norma identificada</th><th>Observação</th></tr></thead><tbody>{rows}</tbody></table></div></div>')
    if message.get("citations"):
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["sources"]}</p><ul class="chat-msg__list chat-msg__sources">' + "".join(f'<li><q class="chat-msg__excerpt">{html.escape(c["excerpt"])}</q><span class="chat-msg__source-id">{html.escape(c["sourceId"])}</span></li>' for c in message["citations"]) + "</ul></div>")
    if message.get("contacts"):
        parts.append(f'<div class="chat-msg__block"><p class="chat-msg__block-title">{TEXTS["contacts"]}</p><ul class="chat-msg__list chat-msg__contacts">' + "".join(f'<li><strong>{html.escape(c["name"])}</strong> · {html.escape(c["area"])}<br><a href="mailto:{html.escape(c["channel"])}">{html.escape(c["channel"])}</a></li>' for c in message["contacts"]) + "</ul></div>")
    parts.append("</div></article>")
    return "".join(parts)


def can_rate(message: dict) -> bool:
    return message["role"] == "ai" and (message.get("status") == "answer" or (message.get("status") == "not_in_data" and not message.get("contacts")))


def render_panel(state: ChatState) -> None:
    """Conversation + suggestions + input, inside whatever container the caller opened (popover or page)."""
    start(state)
    log = st.container(height=360, key="chat-log")
    with log:
        pending: list[str] = []

        def flush():
            if pending:
                st.html('<div class="chat-log">' + "".join(pending) + "</div>")
                pending.clear()

        for i, m in enumerate(state.messages):
            starts = i == 0 or state.messages[i - 1]["role"] != m["role"]
            pending.append(message_html(m, starts))
            if can_rate(m):
                flush()
                if m.get("feedback"):
                    st.caption(TEXTS["feedbackThanks"])
                else:
                    rating = st.feedback("thumbs", key=f"rate-{m['id']}")
                    if rating is not None:
                        m["feedback"] = "useful" if rating == 1 else "not_useful"
                        st.rerun()
        flush()
        items = suggestions(state)
        if items:
            with st.container(horizontal=True, gap="small", key="chat-suggestions"):
                for s in items:
                    if st.button(("‹ " if s["kind"] == "back" else "") + s["label"], key=f"sug-{s['kind']}-{s['label']}", type="secondary" if s["kind"] in ("back", "end") else "primary"):
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
                        st.rerun()
    node = state.node or {}
    if node.get("type") == "free_text":
        text = st.chat_input(node.get("input", {}).get("placeholder") or TEXTS["inputPlaceholder"], key="chat-text", max_chars=node.get("input", {}).get("maxChars") or 1000)
        if text:
            send_text(state, text)
            st.rerun()
    elif node.get("type") == "upload":
        st.caption(TEXTS["uploadHint"])
        files = st.file_uploader(TEXTS["attach"], type=[e.strip(".") for e in node["upload"]["accept"]], accept_multiple_files=True, key=f"chat-files-{len(state.messages)}", label_visibility="collapsed")
        if files:
            send_files(state, files[: node["upload"]["maxFiles"]])
            st.rerun()


def render_widget() -> None:
    """Floating button + popover panel (bottom-right), present on every page."""
    state = chat_state()
    with st.container(key="chat-fab"):
        label = f"{TEXTS['agentName'].rsplit(' ', 1)[0]} **{TEXTS['agentName'].rsplit(' ', 1)[1]}**"
        with st.popover(label, icon=":material/chat_bubble:", width="content"):
            with st.container(horizontal=True, vertical_alignment="center", key="chat-head"):
                st.markdown(f"**{TEXTS['title']}**")
                if st.button(TEXTS["restart"], key="chat-restart", disabled=not state.has_interaction, type="tertiary"):
                    restart(state)
                    st.rerun()
            render_panel(state)
