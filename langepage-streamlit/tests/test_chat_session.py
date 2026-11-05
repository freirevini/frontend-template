"""Conversation controller of core.chat (port of the meaningful cases of chat-session.service.spec.ts) and the BFF client
mapping of chat-api.service.spec.ts, without Streamlit running."""
from __future__ import annotations

import re
from types import SimpleNamespace

import pytest

from core import chat
from core.chat import (CLOSED_NODE, ERROR_TEXTS, TEXTS, BffBackend, ChatFile, ChatMockServer, ChatRequestError, ChatState,
                       MockBackend, load_mock_flow)

GREETING = re.compile(r"^(Bom dia|Boa tarde|Boa noite)(, \w+)?! ")


class Spy(MockBackend):
    """The mock backend recording requests; `fail` makes the next calls of a method raise."""

    def __init__(self):
        super().__init__(ChatMockServer(load_mock_flow()))
        self.calls: list[tuple[str, dict]] = []
        self.fail: dict[str, list[Exception]] = {}

    def _maybe_fail(self, name: str) -> None:
        queue = self.fail.get(name)
        if queue:
            raise queue.pop(0)

    def start_session(self):
        self._maybe_fail("start")
        return super().start_session()

    def send_message(self, request):
        self.calls.append(("message", dict(request)))
        self._maybe_fail("message")
        return super().send_message(request)

    def send_files(self, session_id, node_id, files, request_id):
        self.calls.append(("files", {"requestId": request_id, "names": [f.name for f in files]}))
        self._maybe_fail("files")
        return super().send_files(session_id, node_id, files, request_id)

    def send_feedback(self, request):
        self.calls.append(("feedback", dict(request)))
        self._maybe_fail("feedback")
        return super().send_feedback(request)

    def end_session(self, session_id):
        self.calls.append(("end", {"sessionId": session_id}))
        return super().end_session(session_id)


@pytest.fixture
def be() -> Spy:
    return Spy()


@pytest.fixture
def state(be) -> ChatState:
    s = ChatState()
    chat.start(s, be)
    return s


def option(state: ChatState, option_id: str) -> dict:
    return next(o for o in state.node["options"] if o["id"] == option_id)


def test_start_greets_and_shows_menu(state):
    assert state.session_id
    assert state.node["id"] == "inicio"
    assert GREETING.match(state.messages[0]["text"])
    assert "Agente da Agenda" in state.messages[0]["text"]
    assert not state.has_interaction
    assert [s["kind"] for s in chat.suggestions(state)] == ["option"] * 5


def test_start_is_once(state, be):
    session = state.session_id
    chat.start(state, be)
    assert state.session_id == session


def test_option_and_text_answer(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    assert state.node["id"] == "consultar_tema"
    assert state.messages[-2] == {**state.messages[-2], "role": "user", "text": "Consultar uma norma"}
    chat.send_text(state, "Qual o prazo de adequação?", be)
    answer = next(m for m in state.messages if m.get("status") == "answer")
    assert answer["citations"]
    assert state.node["id"] == "fim"
    assert [s["kind"] for s in chat.suggestions(state)] == ["option", "end"]


def test_typed_farewell_closes(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    session = state.session_id
    chat.send_text(state, "obrigado, era só isso", be)
    assert state.closed and state.session_id is None
    assert state.messages[-1]["text"] == TEXTS["farewell"]
    assert state.node == CLOSED_NODE
    assert ("end", {"sessionId": session}) in be.calls
    assert [s["kind"] for s in chat.suggestions(state)] == ["restart"]
    assert not any(c[0] == "message" and c[1].get("text") == "obrigado, era só isso" for c in be.calls)


def test_end_and_restart(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    chat.end(state, be)
    assert state.closed
    chat.start(state, be)  # closed: no new session until "Recomeçar"
    assert state.session_id is None
    chat.restart(state, be)
    assert not state.closed and state.session_id and state.node["id"] == "inicio"
    assert len(state.messages) == 2 and not state.has_interaction


def test_retry_repeats_the_same_request_id(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    be.fail["message"] = [ChatRequestError("SERVICE_UNAVAILABLE", 503)]
    chat.send_text(state, "Qual o prazo de adequação?", be)
    assert state.messages[-1]["status"] == "error"
    assert state.messages[-1]["text"] == ERROR_TEXTS["SERVICE_UNAVAILABLE"]
    assert chat.show_retry(state)
    failed_id = be.calls[-1][1]["requestId"]
    chat.retry(state, be)
    assert be.calls[-1][1]["requestId"] == failed_id
    assert not state.can_retry
    assert not any(m.get("status") == "error" for m in state.messages)
    assert state.node["id"] == "fim"


def test_rate_limited_text(state, be):
    be.fail["message"] = [ChatRequestError("RATE_LIMITED", 429)]
    chat.pick_option(state, option(state, "consultar"), be)
    assert state.messages[-1]["text"] == ERROR_TEXTS["RATE_LIMITED"]


def test_unknown_failure_is_service_unavailable(state, be):
    be.fail["message"] = [RuntimeError("boom")]
    chat.pick_option(state, option(state, "consultar"), be)
    assert state.messages[-1]["text"] == ERROR_TEXTS["SERVICE_UNAVAILABLE"]


def test_start_failure_can_be_retried(be):
    s = ChatState()
    be.fail["start"] = [ChatRequestError("SERVICE_UNAVAILABLE", 503)]
    chat.start(s, be)
    assert s.session_id is None and chat.show_retry(s)
    chat.retry(s, be)
    assert s.session_id and s.node["id"] == "inicio"


def test_session_expired_opens_a_new_one(state, be):
    old = state.session_id
    be.server.end_session(old)
    chat.pick_option(state, option(state, "consultar"), be)
    assert state.session_id and state.session_id != old
    assert any(m["role"] == "system" and m["text"] == TEXTS["sessionExpired"] and m.get("transient") for m in state.messages)
    assert state.node["id"] == "inicio"
    assert not state.can_retry
    chat.pick_option(state, option(state, "consultar"), be)  # the next action drops the progress note
    assert not any(m.get("transient") for m in state.messages)


def test_ask_from_another_screen(be):
    s = ChatState()
    chat.ask(s, "  Qual o prazo da Resolução de exemplo nº 0001?  ", be)
    assert s.open_request
    assert s.messages[-3]["role"] == "user" and s.messages[-3]["text"] == "Qual o prazo da Resolução de exemplo nº 0001?"
    assert s.messages[-2]["status"] == "answer"
    assert be.calls[-1][1]["action"] == "ask"


def test_ask_after_end_restarts(state, be):
    chat.end(state, be)
    chat.ask(state, "qual o prazo da resolução", be)
    assert not state.closed and state.session_id
    assert any(m.get("status") == "answer" for m in state.messages)


def test_ask_is_cut_to_the_input_limit(be):
    s = ChatState()
    chat.ask(s, "prazo " + "x" * 2000, be)
    assert len(next(m for m in s.messages if m["role"] == "user")["text"]) == 1000


def test_files_get_verdicts_quota_and_table(state, be):
    chat.pick_option(state, option(state, "avaliar_arquivo"), be)
    files = [ChatFile("a.pdf", 1000, "application/pdf"), ChatFile("contrato-recusa.pdf", 500, "application/pdf")]
    chat.send_files(state, files, be)
    user = next(m for m in state.messages if m.get("files"))
    assert [f["accepted"] for f in user["files"]] == [True, False]
    assert state.used_bytes == 1000
    table = next(m for m in state.messages if m.get("fileResults"))
    assert [r["name"] for r in table["fileResults"]] == ["a.pdf", "contrato-recusa.pdf"]
    assert state.node["id"] == "pergunta_sobre_arquivo"


def test_files_retry_repeats_request_id(state, be):
    chat.pick_option(state, option(state, "avaliar_arquivo"), be)
    be.fail["files"] = [ChatRequestError("SERVICE_UNAVAILABLE", 503)]
    chat.send_files(state, [ChatFile("a.pdf", 1000, "application/pdf")], be)
    first = be.calls[-1][1]["requestId"]
    chat.retry(state, be)
    assert be.calls[-1][1]["requestId"] == first
    assert state.used_bytes == 1000


def test_feedback_once_and_optimistic_failure(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    chat.send_text(state, "Qual o prazo de adequação?", be)
    answer = next(m for m in state.messages if m.get("status") == "answer")
    chat.rate_message(state, answer["id"], "useful", be)
    chat.rate_message(state, answer["id"], "not_useful", be)
    feedback = [c[1] for c in be.calls if c[0] == "feedback"]
    assert feedback == [{"sessionId": state.session_id, "rating": "useful", "sourceIds": [c["sourceId"] for c in answer["citations"]]}]
    assert answer["feedback"] == "useful"

    chat.pick_option(state, option(state, "nova"), be)
    chat.pick_option(state, option(state, "consultar"), be)
    chat.send_text(state, "vigência da resolução", be)
    second = [m for m in state.messages if m.get("status") == "answer"][-1]
    be.fail["feedback"] = [ChatRequestError("SERVICE_UNAVAILABLE", 503)]
    chat.rate_message(state, second["id"], "not_useful", be)
    assert second["feedback"] is None and second["feedbackError"] is True


def test_handover_cannot_be_rated(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    for text in ("oi", "oi", "oi"):
        chat.send_text(state, text, be)
    handover = state.messages[-1]
    assert handover.get("contacts")
    chat.rate_message(state, handover["id"], "useful", be)
    assert not any(c[0] == "feedback" for c in be.calls)


def test_back_and_quick_replies(state, be):
    chat.pick_option(state, option(state, "consultar"), be)
    chat.send_text(state, "norma nova", be)
    kinds = [s["kind"] for s in chat.suggestions(state)]
    assert kinds[0] == "reply" and kinds[-2:] == ["back", "end"]
    chat.back(state, be)
    assert state.node["id"] == "inicio"


# --- BFF client ---------------------------------------------------------------------------------------------------------------
class FakeApiError(Exception):
    def __init__(self, code, status):
        super().__init__(code)
        self.code, self.status = code, status


def fake_api(**overrides):
    calls = []

    def record(name, result=None):
        def fn(*args):
            calls.append((name, args))
            if isinstance(result, Exception):
                raise result
            return result
        return fn

    api = SimpleNamespace(ApiError=FakeApiError, post_json=record("post_json", {"node": {"id": "x"}, "messages": []}),
                          post_multipart=record("post_multipart", {"node": {"id": "x"}, "messages": [], "files": []}),
                          delete=record("delete"))
    for name, result in overrides.items():
        setattr(api, name, record(name, result))
    return api, calls


V1_STEP = {"id": "x", "tipo": "MENU", "enunciado": "?", "podeVoltar": False, "opcoes": []}


def test_bff_paths_and_bodies():
    api, calls = fake_api(post_json={"sessaoId": "s", "passo": V1_STEP, "mensagens": []},
                          post_multipart={"requisicaoId": "r2", "arquivos": [{"arquivoId": "f1", "nome": "a.pdf", "tamanhoBytes": 3, "status": "EM_VERIFICACAO"},
                                                                             {"arquivoId": "f2", "nome": "b.docx", "tamanhoBytes": 2, "status": "EM_VERIFICACAO"}]},
                          get_json={"arquivoId": "f1", "status": "APROVADO", "avaliacao": {"aceito": True},
                                    "resposta": {"passo": V1_STEP, "mensagens": []}})
    client = BffBackend(api, sleep=lambda _: None)
    client.start_session()
    client.send_message({"sessionId": "s", "nodeId": "n", "action": "text", "text": "a", "requestId": "r"})
    client.send_files("s", "n", [ChatFile("a.pdf", 3, "application/pdf", b"abc"), ChatFile("b.docx", 2, "", b"xy")], "r2")
    client.send_feedback({"sessionId": "s", "rating": "useful", "sourceIds": []})
    client.cancel_request({"sessionId": "s", "requestId": "r"})
    client.end_session("s/1 x")
    assert calls[0] == ("post_json", ("/agente/sessoes",))
    assert calls[1] == ("get_json", ("/usuarios/me",))
    assert calls[2][1][0] == "/agente/sessoes/s/mensagens" and calls[2][1][1]["requisicaoId"] == "r"
    assert calls[3] == ("post_multipart", ("/agente/sessoes/s/arquivos", {"passoId": "n", "requisicaoId": "r2"},
                                           [("a.pdf", b"abc", "application/pdf"), ("b.docx", b"xy", "application/octet-stream")], "arquivos"))
    assert calls[4] == ("get_json", ("/agente/sessoes/s/arquivos/f1",))
    assert calls[5] == ("get_json", ("/agente/sessoes/s/arquivos/f2",))
    assert calls[6][1][0] == "/agente/sessoes/s/avaliacoes"
    assert calls[7][1][0] == "/agente/sessoes/s/cancelamentos"
    assert calls[8] == ("delete", ("/agente/sessoes/s%2F1%20x",))


@pytest.mark.parametrize("error, code", [
    (FakeApiError("SESSION_NOT_FOUND", 404), "SESSION_NOT_FOUND"),
    (FakeApiError("FILE_TOO_LARGE", 413), "FILE_TOO_LARGE"),
    (FakeApiError("WHATEVER", 429), "RATE_LIMITED"),
    (FakeApiError("WHATEVER", 500), "SERVICE_UNAVAILABLE"),
    (ConnectionError("down"), "SERVICE_UNAVAILABLE"),
])
def test_bff_errors_mapped(error, code):
    api, _ = fake_api(post_json=error)
    with pytest.raises(ChatRequestError) as info:
        BffBackend(api).send_message({"requestId": "r"})
    assert info.value.code == code


def test_backend_switch(monkeypatch):
    monkeypatch.setattr(chat, "chat_mock", lambda: True)
    monkeypatch.setattr(chat, "mock_server", lambda: ChatMockServer(load_mock_flow()))
    assert isinstance(chat.get_backend(), MockBackend)
    monkeypatch.setattr(chat, "chat_mock", lambda: False)
    assert isinstance(chat.get_backend(), BffBackend)


# --- Automatic session restarts are capped (E-010) ---------------------------------------------------------------------------
def _not_found(n: int) -> list[Exception]:
    return [ChatRequestError("SESSION_NOT_FOUND", 404) for _ in range(n)]


def test_backend_that_keeps_answering_session_not_found_gets_one_automatic_restart(state, be):
    be.fail["message"] = _not_found(50)
    be.fail["start"] = _not_found(50)
    chat.pick_option(state, option(state, "consultar"), be)
    assert len(be.fail["start"]) == 49  # one new session tried, not one per failure
    assert len(be.fail["message"]) == 49
    assert state.session_id is None
    assert state.messages[-1]["status"] == "error"
    assert state.messages[-1]["text"] == chat.GENERIC_ERROR_TEXT
    assert chat.show_retry(state)


def test_session_not_found_on_start_is_retried_once_then_stops(be):
    s = ChatState()
    be.fail["start"] = _not_found(50)
    chat.start(s, be)
    assert len(be.fail["start"]) == 48  # the start and one automatic restart
    assert s.session_id is None and chat.show_retry(s)
    be.fail["start"] = []
    chat.retry(s, be)  # "Tentar novamente" opens a session once the backend answers
    assert s.session_id and s.node["id"] == "inicio"


def test_each_user_action_gets_its_own_automatic_restart(state, be):
    be.server.end_session(state.session_id)
    chat.pick_option(state, option(state, "consultar"), be)
    first = state.session_id
    assert first and not state.can_retry
    be.server.end_session(first)
    chat.pick_option(state, option(state, "consultar"), be)
    assert state.session_id and state.session_id != first
    assert not state.can_retry


def test_failed_start_waits_for_tentar_novamente_instead_of_trying_on_every_rerun(be):
    s = ChatState()
    be.fail["start"] = _not_found(50)
    chat.start(s, be)
    errors = sum(m.get("status") == "error" for m in s.messages)
    chat.start(s, be)  # render_panel calls start() on every rerun of the open panel
    chat.start(s, be)
    assert len(be.fail["start"]) == 48
    assert sum(m.get("status") == "error" for m in s.messages) == errors == 1
