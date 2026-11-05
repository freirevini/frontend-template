"""ChatMockServer against the shipped data/chat-fluxo-mock.json (port of chat-mock-server.spec.ts, same expectations)."""
from __future__ import annotations

import itertools

import pytest

from core.chat import ChatFile, ChatMockServer, ChatRequestError, load_mock_flow

MB = 1024 * 1024


def pdf(size: int = 1024, name: str = "norma.pdf") -> ChatFile:
    return ChatFile(name, size, "application/pdf")


class Harness:
    def __init__(self):
        self.flow = load_mock_flow()
        self.server = ChatMockServer(self.flow)
        start = self.server.start_session()
        self.session_id, self.node_id = start["sessionId"], start["node"]["id"]
        self._ids = itertools.count(1)

    def rid(self) -> str:
        return f"req-{next(self._ids)}"

    def message(self, **request) -> dict:
        body = {"sessionId": self.session_id, "nodeId": self.node_id, "action": "text", "requestId": self.rid(), **request}
        reply = self.server.handle_message(body)
        self.node_id = reply["node"]["id"]
        return reply

    def upload(self, *files: ChatFile) -> dict:
        reply = self.server.handle_files(self.session_id, self.node_id, list(files), self.rid())
        self.node_id = reply["node"]["id"]
        return reply

    def files(self, *files: ChatFile, request_id: str | None = None) -> dict:
        return self.server.handle_files(self.session_id, self.node_id, list(files), request_id or self.rid())

    def to_consult(self):
        return self.message(action="option", optionId="consultar")

    def to_upload(self):
        return self.message(action="option", optionId="avaliar_arquivo")


def failure(fn) -> ChatRequestError:
    with pytest.raises(ChatRequestError) as info:
        fn()
    return info.value


@pytest.fixture
def h() -> Harness:
    return Harness()


# --- the shipped file -------------------------------------------------------------------------------------------------------
def test_shipped_file_is_consistent(h):
    flow = h.flow
    assert flow["start"] in flow["nodes"]
    for key, node in flow["nodes"].items():
        assert node["id"] == key
        if node["type"] == "menu":
            for option in node["options"]:
                assert flow["transitions"][key][option["id"]] in flow["nodes"]
        if node["type"] == "upload":
            assert node.get("upload")
        if node.get("canGoBack"):
            assert flow["back"][key] in flow["nodes"]
    for targets in flow["transitions"].values():
        assert all(to in flow["nodes"] for to in targets.values())
    assert flow["fallbacks"]["roundsExceeded"]["contactsRef"] in flow["contacts"]
    assert flow["fallbacks"]["outOfScopeLimit"]["contactsRef"] in flow["contacts"]
    assert any(c["channel"] == "contato@compliance.com.br" for c in flow["contacts"]["geral"])
    assert flow["maxClarificationRounds"] == 3


# --- session ----------------------------------------------------------------------------------------------------------------
def test_start(h):
    start = h.server.start_session()
    assert start["sessionId"] != h.session_id
    assert start["node"]["id"] == "inicio"
    assert len(start["messages"]) == 2
    assert "Agente da Agenda" in start["messages"][0]["text"]
    assert not start["messages"][0]["text"].startswith(("Olá", "Bom dia", "Boa tarde", "Boa noite"))
    assert start["user"] == {"firstName": "Vinicius"}
    assert start["messages"][1]["text"] == start["node"]["prompt"]


def test_unknown_or_ended_session(h):
    assert failure(lambda: h.server.handle_message({"sessionId": "x", "nodeId": h.node_id, "action": "text", "text": "a", "requestId": h.rid()})).code == "SESSION_NOT_FOUND"
    h.server.end_session(h.session_id)
    error = failure(lambda: h.message(action="back"))
    assert (error.code, error.status) == ("SESSION_NOT_FOUND", 404)


def test_request_for_another_node(h):
    assert failure(lambda: h.message(nodeId="consultar_tema", action="text", text="oi")).code == "INVALID_ACTION"


def test_never_hands_out_shared_objects(h):
    h.server.start_session()["messages"][0]["text"] = "alterado"
    assert h.server.start_session()["messages"][0]["text"] != "alterado"


# --- menu, back and restart -------------------------------------------------------------------------------------------------
def test_follows_option(h):
    reply = h.to_consult()
    assert reply["node"]["id"] == "consultar_tema"
    assert reply["messages"] == [{"role": "ai", "text": reply["node"]["prompt"]}]


def test_rejects_unknown_option_and_text_in_menu(h):
    assert failure(lambda: h.message(action="option", optionId="inexistente")).code == "INVALID_ACTION"
    assert failure(lambda: h.message(action="text", text="oi")).code == "INVALID_ACTION"


def test_back_only_where_allowed(h):
    assert failure(lambda: h.message(action="back")).code == "INVALID_ACTION"
    h.to_consult()
    assert h.message(action="back")["node"]["id"] == "inicio"


def test_restart_resets_bytes(h):
    h.to_upload()
    h.upload(pdf(15 * MB))
    reply = h.message(action="restart")
    assert reply["node"]["id"] == "inicio"
    assert len(reply["messages"]) == 2
    h.to_upload()
    assert h.upload(pdf(15 * MB))["files"][0]["accepted"] is True


# --- free text --------------------------------------------------------------------------------------------------------------
def test_answer_with_sources_moves_on(h):
    h.to_consult()
    reply = h.message(text="Qual o prazo de adequação?")
    assert reply["messages"][0]["status"] == "answer"
    assert len(reply["messages"][0]["citations"]) > 0
    assert reply["node"]["id"] == "fim"
    assert reply["messages"][1]["text"] == reply["node"]["prompt"]


def test_keywords_ignore_case_and_accents(h):
    h.to_consult()
    assert h.message(text="VIGENCIA da RESOLUCAO")["messages"][0]["status"] == "answer"


def test_out_of_scope_stays(h):
    h.to_consult()
    reply = h.message(text="como está o clima hoje")
    assert reply["messages"][0]["status"] == "out_of_scope"
    assert reply["node"]["id"] == "consultar_tema"
    assert "contacts" not in reply["messages"][0]


def test_third_out_of_scope_gives_contacts(h):
    h.to_consult()
    h.message(text="clima")
    h.message(text="futebol")
    third = h.message(text="piada")
    assert third["messages"][0]["status"] == "out_of_scope"
    assert third["messages"][0]["contacts"][0]["channel"] == "contato@compliance.com.br"
    assert "contactsRef" not in third["messages"][0]


def test_clarification_rounds(h):
    h.to_consult()
    first = h.message(text="oi")
    assert first["messages"][0]["status"] == "need_more_info"
    assert len(first["messages"][0]["questions"]) > 0
    second = h.message(text="preciso de ajuda com um assunto qualquer")
    assert second["messages"][0]["status"] == "not_in_data"
    assert "contacts" not in second["messages"][0]
    third = h.message(text="ainda sem resposta aqui")
    assert third["messages"][0]["contacts"][0]["channel"] == "contato@compliance.com.br"
    assert third["node"]["id"] == "consultar_tema"
    assert h.message(text="oi")["messages"][0]["status"] == "need_more_info"


def test_off_topic_not_counted_as_round(h):
    h.to_consult()
    h.message(text="clima")
    h.message(text="oi")
    h.message(text="oi")
    assert "contacts" in h.message(text="oi")["messages"][0]


def test_rejects_empty_blank_long_text(h):
    h.to_consult()
    assert failure(lambda: h.message(text="   ")).code == "INVALID_ACTION"
    assert failure(lambda: h.message(text=None)).code == "INVALID_ACTION"
    assert failure(lambda: h.message(text="x" * 1001)).code == "INVALID_ACTION"


# --- feedback ---------------------------------------------------------------------------------------------------------------
def test_feedback_stores_rating_and_sources_only(h):
    h.server.handle_feedback({"sessionId": h.session_id, "rating": "useful", "sourceIds": ["mock-0001"]})
    h.server.handle_feedback({"sessionId": h.session_id, "rating": "not_useful", "sourceIds": []})
    assert h.server.feedback_log == [
        {"sessionId": h.session_id, "rating": "useful", "sourceIds": ["mock-0001"]},
        {"sessionId": h.session_id, "rating": "not_useful", "sourceIds": []},
    ]


def test_feedback_after_moving_on(h):
    h.to_consult()
    h.message(text="prazo da resolução")
    h.server.handle_feedback({"sessionId": h.session_id, "rating": "useful", "sourceIds": []})


def test_feedback_rejections(h):
    assert failure(lambda: h.server.handle_feedback({"sessionId": h.session_id, "rating": "otimo", "sourceIds": []})).code == "INVALID_ACTION"
    assert failure(lambda: h.server.handle_feedback({"sessionId": h.session_id, "rating": "useful", "sourceIds": None})).code == "INVALID_ACTION"
    assert failure(lambda: h.server.handle_feedback({"sessionId": "x", "rating": "useful", "sourceIds": []})).status == 404
    h.server.end_session(h.session_id)
    assert failure(lambda: h.server.handle_feedback({"sessionId": h.session_id, "rating": "useful", "sourceIds": []})).code == "SESSION_NOT_FOUND"
    assert h.server.feedback_log == []


# --- final step and lists ---------------------------------------------------------------------------------------------------
def test_final_step(h):
    h.to_consult()
    final = h.message(text="qual o prazo da resolução")
    assert final["node"]["id"] == "fim" and final["node"]["type"] == "menu"
    assert [o["label"] for o in final["node"]["options"]] == ["Nova consulta"]
    again = h.message(action="option", optionId="nova")
    assert again["node"]["id"] == "inicio"
    assert again["messages"][0]["text"] == again["node"]["prompt"]


def test_five_starting_options(h):
    assert [o["label"] for o in h.server.start_session()["node"]["options"]] == [
        "Consultar uma norma", "Avaliar um documento", "Normas a Classificar", "Listar normas não aderentes",
        "Listar próximas normas que irão entrar em vigor"]


def test_lists_as_norm_blocks(h):
    for option_id in ("normas_classificar", "normas_nao_aderentes", "normas_proximas_vigencia"):
        reply = h.message(action="option", optionId=option_id)
        norm_list = reply["messages"][0]["normList"]
        assert reply["node"]["id"] == option_id
        assert norm_list["dateLabel"]
        assert len(norm_list["items"]) > 1
        for item in norm_list["items"]:
            assert item["title"]
            assert len(item["date"]) == 10 and item["date"][4] == "-" and item["date"][7] == "-"
            assert item["segment"] in ("Atacado", "Corporativo", "Plataforma", "Varejo")
        assert reply["node"]["canGoBack"] is True
        assert [o["id"] for o in reply["node"]["options"]] == ["nova"]
        h.message(action="back")


def test_quick_replies_lead_to_answer(h):
    h.to_consult()
    clarify = h.message(text="norma nova")
    assert clarify["messages"][0]["status"] == "need_more_info"
    first = clarify["messages"][0]["quickReplies"][0]
    assert h.message(text=first)["messages"][0]["status"] == "answer"


# --- ask ----------------------------------------------------------------------------------------------------------------------
def test_ask_from_any_step(h):
    reply = h.message(action="ask", text="Qual o prazo da Resolução de exemplo nº 0001?")
    assert reply["messages"][0]["status"] == "answer"
    assert reply["node"]["id"] == "fim"


def test_ask_needs_more_detail(h):
    reply = h.message(action="ask", text="norma nova")
    assert reply["node"]["id"] == "consultar_tema"
    assert reply["node"]["prompt"] not in [m.get("text") for m in reply["messages"]]


def test_ask_empty_leaves_session(h):
    assert failure(lambda: h.message(action="ask", text="  ")).code == "INVALID_ACTION"
    assert h.to_consult()["node"]["id"] == "consultar_tema"


# --- repeated and cancelled requests ------------------------------------------------------------------------------------------
def test_repeated_request_id_returns_stored_reply(h):
    first = h.server.handle_message({"sessionId": h.session_id, "nodeId": h.node_id, "action": "option", "optionId": "consultar", "requestId": "same"})
    again = h.server.handle_message({"sessionId": h.session_id, "nodeId": "inicio", "action": "option", "optionId": "consultar", "requestId": "same"})
    assert again == first
    h.node_id = first["node"]["id"]
    assert h.message(action="back")["node"]["id"] == "inicio"


def test_cancel_undoes_last_request(h):
    h.server.handle_message({"sessionId": h.session_id, "nodeId": h.node_id, "action": "option", "optionId": "consultar", "requestId": "r-x"})
    assert h.server.cancel({"sessionId": h.session_id, "requestId": "r-x"})["node"]["id"] == "inicio"
    again = h.server.handle_message({"sessionId": h.session_id, "nodeId": "inicio", "action": "option", "optionId": "consultar", "requestId": "r-x"})
    assert again["node"]["id"] == "consultar_tema"


def test_cancel_gives_back_bytes(h):
    h.to_upload()
    h.files(pdf(15 * MB), request_id="big")
    h.server.cancel({"sessionId": h.session_id, "requestId": "big"})
    assert h.server.handle_files(h.session_id, "enviar_arquivo", [pdf(15 * MB)], h.rid())["files"][0]["accepted"] is True


def test_cancel_unknown(h):
    h.to_consult()
    assert h.server.cancel({"sessionId": h.session_id, "requestId": "nunca"})["node"]["id"] == "consultar_tema"
    assert failure(lambda: h.server.cancel({"sessionId": "x", "requestId": "a"})).code == "SESSION_NOT_FOUND"


# --- documents ----------------------------------------------------------------------------------------------------------------
def test_accepts_norm(h):
    h.to_upload()
    reply = h.files(pdf())
    assert reply["files"][0]["accepted"] is True
    assert reply["files"][0]["id"].startswith("mock-arquivo-")
    assert reply["node"]["id"] == "pergunta_sobre_arquivo"
    assert reply["messages"][-1]["text"] == reply["node"]["prompt"]


def test_refuses_non_norm_without_quota(h):
    h.to_upload()
    reply = h.files(pdf(10 * MB, "contrato-recusa.pdf"))
    assert reply["files"][0]["accepted"] is False
    assert reply["files"][0]["reason"]
    assert reply["node"]["id"] == "enviar_arquivo"
    assert reply["messages"][0]["status"] == "out_of_scope"
    assert h.files(pdf(20 * MB))["files"][0]["accepted"] is True


def test_technical_rejections(h):
    h.to_upload()
    wrong = failure(lambda: h.files(ChatFile("a.exe", 5)))
    assert (wrong.code, wrong.status) == ("FILE_TYPE_NOT_ALLOWED", 415)
    large = failure(lambda: h.files(pdf(20 * MB + 1)))
    assert (large.code, large.status) == ("FILE_TOO_LARGE", 413)
    assert failure(lambda: h.files(pdf(0))).code == "INVALID_ACTION"


def test_quota_for_whole_conversation(h):
    h.to_upload()
    h.upload(pdf(15 * MB))
    h.message(action="back")
    error = failure(lambda: h.files(pdf(6 * MB)))
    assert (error.code, error.status) == ("SESSION_QUOTA_EXCEEDED", 413)
    assert h.files(pdf(5 * MB))["files"][0]["accepted"] is True


def test_several_documents(h):
    h.to_upload()
    docx = ChatFile("circular.docx", 1000, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    reply = h.files(pdf(), docx, pdf(10, "contrato-recusa.pdf"))
    assert [x["accepted"] for x in reply["files"]] == [True, True, False]
    assert reply["files"][0]["metadata"]["normIdentifier"] != reply["files"][1]["metadata"]["normIdentifier"]
    assert "3 documentos" in reply["messages"][0]["text"]
    assert "2 parecem normas" in reply["messages"][0]["text"]
    assert reply["node"]["id"] == "pergunta_sobre_arquivo"


def test_none_accepted_and_whole_request_refused(h):
    h.to_upload()
    none = h.files(pdf(10, "a-recusa.pdf"), pdf(10, "b-recusa.pdf"))
    assert none["node"]["id"] == "enviar_arquivo"
    assert not any(x["accepted"] for x in none["files"])
    assert failure(lambda: h.files(pdf(), ChatFile("x.exe", 5))).code == "FILE_TYPE_NOT_ALLOWED"
    assert failure(lambda: h.files(pdf(15 * MB), pdf(6 * MB))).code == "SESSION_QUOTA_EXCEEDED"
    assert h.files(pdf(20 * MB))["files"][0]["accepted"] is True


def test_up_to_five_per_request(h):
    h.to_upload()
    six = [pdf(10, f"n{i}.pdf") for i in range(6)]
    assert failure(lambda: h.files(*six)).code == "INVALID_ACTION"
    assert failure(lambda: h.files()).code == "INVALID_ACTION"


def test_document_outside_upload_node(h):
    h.to_upload()
    h.message(action="back")
    assert failure(lambda: h.files(pdf())).code == "INVALID_ACTION"
