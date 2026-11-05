"""Agente da Agenda on the contract v1 (ADR-009): adapters, the 9 MB per send, quarantine (202 + consults), 401/403 and the
support code, and the quarantine states simulated by the mock. The BFF is a fake core.api; time is a fake clock."""
from __future__ import annotations

import pytest

from core import chat
from core.chat import (CHAT_LIMITS, QUARANTINE_TEXTS, TEXTS, BffBackend, ChatFile, ChatMockServer, ChatRequestError, ChatState, MockBackend,
                       await_quarantine, load_mock_flow, validate_chat_files)

MB = 1024 * 1024
UPLOAD_STEP = {"id": "enviar_arquivo", "tipo": "ENVIO_ARQUIVO", "enunciado": "Envie os documentos.", "podeVoltar": True,
               "entrada": {"habilitada": False},
               "envio": {"extensoes": [".pdf", ".png"], "maxBytesPorArquivo": 9 * MB, "maxBytesPorEnvio": 9 * MB, "maxArquivos": 5}}
MENU_STEP = {"id": "inicio", "tipo": "MENU", "enunciado": "Como posso ajudar?", "podeVoltar": False,
             "opcoes": [{"id": "consultar", "rotulo": "Consultar uma norma"}]}


def pdf(name: str, size: int) -> ChatFile:
    return ChatFile(name, size, "application/pdf", b"x")


class FakeApi:
    """core.api double: replies by (method, path); a list is consumed in order; an exception is raised."""

    def __init__(self, replies: dict):
        self.replies, self.calls = replies, []

    def _reply(self, method, path, *args):
        self.calls.append((method, path, *args))
        reply = self.replies.get((method, path))
        if isinstance(reply, list):
            reply = reply.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    def get_json(self, path, params=None):
        return self._reply("GET", path)

    def post_json(self, path, body=None):
        return self._reply("POST", path, body)

    def post_multipart(self, path, fields, files, file_field="files"):
        return self._reply("POST", path, fields, [f[0] for f in files], file_field)

    def delete(self, path):
        return self._reply("DELETE", path)


class ApiError(Exception):
    def __init__(self, code, status, trace_id=None, retry_after=None):
        super().__init__(code)
        self.code, self.status, self.trace_id, self.retry_after = code, status, trace_id, retry_after


class Clock:
    def __init__(self):
        self.now, self.sleeps = 0.0, []

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.now += seconds

    def __call__(self):
        return self.now


# --- Adapters (contratos §11.6) ------------------------------------------------------------------------------------------------
def test_node_adapter_maps_every_step_type_and_config():
    assert chat.node_from_v1(MENU_STEP) == {"id": "inicio", "type": "menu", "prompt": "Como posso ajudar?", "canGoBack": False,
                                            "options": [{"id": "consultar", "label": "Consultar uma norma"}]}
    upload = chat.node_from_v1(UPLOAD_STEP)
    assert upload["type"] == "upload" and upload["canGoBack"] is True
    assert upload["upload"] == {"accept": [".pdf", ".png"], "maxBytes": 9 * MB, "maxFiles": 5, "maxSendBytes": 9 * MB}
    assert upload["input"] == {"enabled": False}
    text = chat.node_from_v1({"id": "t", "tipo": "TEXTO_LIVRE", "enunciado": "?", "podeVoltar": True,
                              "entrada": {"habilitada": True, "dica": "Digite", "maxCaracteres": 1000}})
    assert text["type"] == "free_text" and text["input"] == {"enabled": True, "placeholder": "Digite", "maxChars": 1000}
    assert chat.node_from_v1({"id": "f", "tipo": "FIM", "enunciado": "", "podeVoltar": False})["type"] == "end"


def test_node_adapter_refuses_an_unknown_step_type():
    with pytest.raises(ChatRequestError) as raised:
        chat.node_from_v1({**MENU_STEP, "tipo": "OUTRO"})
    assert raised.value.code == "SERVICE_UNAVAILABLE"


def test_message_adapter_maps_every_field():
    message = chat.message_from_v1({
        "papel": "AGENTE", "texto": "Resposta", "situacao": "RESPOSTA", "citacoes": [{"fonteId": "n1", "trecho": "Art. 1"}],
        "perguntas": ["Qual norma?"], "contatos": [{"nome": "Equipe", "area": "Compliance", "canal": "contato@compliance.com.br"}],
        "respostasRapidas": ["Sim"], "transitoria": True,
        "listaNormas": {"rotuloData": "Vigência", "itens": [{"id": "1", "titulo": "Res. 1", "detalhe": "obs", "segmento": "Varejo", "data": "2026-01-02"}]}})
    assert message == {"role": "ai", "text": "Resposta", "status": "answer", "questions": ["Qual norma?"], "quickReplies": ["Sim"], "transient": True,
                       "citations": [{"sourceId": "n1", "excerpt": "Art. 1"}],
                       "contacts": [{"name": "Equipe", "area": "Compliance", "channel": "contato@compliance.com.br"}],
                       "normList": {"dateLabel": "Vigência", "items": [{"id": "1", "title": "Res. 1", "detail": "obs", "segment": "Varejo", "date": "2026-01-02"}]}}
    assert [chat.message_from_v1({"papel": p})["role"] for p in ("USUARIO", "SISTEMA", "OUTRO")] == ["user", "system", "system"]
    assert [chat.message_from_v1({"papel": "AGENTE", "situacao": s})["status"] for s in ("PRECISA_MAIS_INFORMACAO", "FORA_DOS_DADOS", "FORA_DO_ESCOPO")] \
        == ["need_more_info", "not_in_data", "out_of_scope"]


def test_requests_are_sent_with_the_v1_names():
    api = FakeApi({("POST", "/agente/sessoes/s/mensagens"): {"passo": MENU_STEP, "mensagens": []},
                   ("POST", "/agente/sessoes/s/avaliacoes"): None,
                   ("POST", "/agente/sessoes/s/cancelamentos"): {"passo": MENU_STEP}})
    client = BffBackend(api)
    for action, v1 in (("option", "OPCAO"), ("text", "TEXTO"), ("back", "VOLTAR"), ("restart", "RECOMECAR"), ("ask", "PERGUNTAR")):
        client.send_message({"sessionId": "s", "nodeId": "n", "action": action, "optionId": "o", "text": "t", "requestId": "r"})
        assert api.calls[-1][2] == {"passoId": "n", "acao": v1, "opcaoId": "o", "texto": "t", "requisicaoId": "r"}
    client.send_feedback({"sessionId": "s", "rating": "not_useful", "sourceIds": ["n1"]})
    assert api.calls[-1][2] == {"nota": "NAO_UTIL", "fonteIds": ["n1"]}
    assert client.cancel_request({"sessionId": "s", "requestId": "r"}) == {"node": chat.node_from_v1(MENU_STEP)}
    assert api.calls[-1][2] == {"requisicaoId": "r"}


def test_session_start_maps_the_reply_and_takes_the_first_name_from_usuarios_me():
    api = FakeApi({("POST", "/agente/sessoes"): {"sessaoId": "abc", "passo": MENU_STEP, "mensagens": [{"papel": "AGENTE", "texto": "Olá"}]},
                   ("GET", "/usuarios/me"): {"primeiroNome": "Vinicius"}})
    reply = BffBackend(api).start_session()
    assert reply == {"sessionId": "abc", "node": chat.node_from_v1(MENU_STEP), "messages": [{"role": "ai", "text": "Olá"}],
                     "user": {"firstName": "Vinicius"}}
    api.replies[("GET", "/usuarios/me")] = ApiError("SERVICE_UNAVAILABLE", 500)
    assert "user" not in BffBackend(api).start_session()  # no name is a greeting without a name, never an error


# --- 9 MB per send (D4) ---------------------------------------------------------------------------------------------------------
def test_documents_of_one_send_sum_at_most_9_mb_before_sending():
    upload = {"accept": [".pdf"], "maxBytes": 20 * MB, "maxFiles": 5}
    check = validate_chat_files([pdf("a.pdf", 5 * MB), pdf("b.pdf", 4 * MB), pdf("c.pdf", 1)], upload, 0)
    assert [f.name for f in check.valid] == ["a.pdf", "b.pdf"]
    assert check.problems == [{"name": "c.pdf", "problem": "SEND_TOO_LARGE"}]
    assert chat.file_problem_text("SEND_TOO_LARGE") == "Os documentos somam mais de 9 MB. Envie menos arquivos por vez."
    alone = validate_chat_files([pdf("grande.pdf", 9 * MB + 1), pdf("pequeno.pdf", MB)], upload, 0)
    assert [f.name for f in alone.valid] == ["pequeno.pdf"] and alone.problems[0]["problem"] == "SEND_TOO_LARGE"
    assert CHAT_LIMITS["maxSendBytes"] == 9 * MB and CHAT_LIMITS["maxSessionBytes"] == 20 * MB


def test_the_step_may_lower_the_send_limit_but_never_raise_it():
    lower = validate_chat_files([pdf("a.pdf", 3 * MB)], {"accept": [".pdf"], "maxBytes": 9 * MB, "maxFiles": 5, "maxSendBytes": 2 * MB}, 0)
    assert lower.problems == [{"name": "a.pdf", "problem": "SEND_TOO_LARGE"}]
    higher = validate_chat_files([pdf("a.pdf", 10 * MB)], {"accept": [".pdf"], "maxBytes": 20 * MB, "maxFiles": 5, "maxSendBytes": 50 * MB}, 0)
    assert higher.problems == [{"name": "a.pdf", "problem": "SEND_TOO_LARGE"}]


def test_conversation_quota_of_20_mb_still_applies():
    upload = {"accept": [".pdf"], "maxBytes": 20 * MB, "maxFiles": 5}
    check = validate_chat_files([pdf("a.pdf", 2 * MB)], upload, 19 * MB)
    assert check.problems == [{"name": "a.pdf", "problem": "SESSION_QUOTA_EXCEEDED"}]


# --- Quarantine: 202 + consults (contratos §9.7) ---------------------------------------------------------------------------------
def accepted(*ids):
    return {"requisicaoId": "r", "arquivos": [{"arquivoId": i, "nome": f"{i}.pdf", "tamanhoBytes": 10, "status": "EM_VERIFICACAO"} for i in ids]}


def judged(file_id, status="APROVADO", reply=None, **extra):
    body = {"arquivoId": file_id, "nome": f"{file_id}.pdf", "tamanhoBytes": 10, "status": status, **extra}
    if reply:
        body["resposta"] = {"passo": MENU_STEP, "mensagens": [{"papel": "AGENTE", "texto": "Avaliei o documento."}]}
    return body


CHECKING = {"arquivoId": "f1", "nome": "f1.pdf", "tamanhoBytes": 10, "status": "EM_VERIFICACAO"}


def test_upload_polls_until_every_document_is_judged_and_maps_the_verdicts():
    api = FakeApi({
        ("POST", "/agente/sessoes/s/arquivos"): accepted("f1", "f2"),
        ("GET", "/agente/sessoes/s/arquivos/f1"): [CHECKING, judged("f1", avaliacao={"aceito": True, "metadados": {
            "tipoDocumento": "norma_integral", "emissor": "CMN", "identificacaoNorma": "Resolução CMN 4.855"}})],
        ("GET", "/agente/sessoes/s/arquivos/f2"): [{**CHECKING, "arquivoId": "f2"},
                                                   judged("f2", "REJEITADO", reply=True, motivoRejeicao="AMEACA_DETECTADA")],
    })
    clock, states = Clock(), []
    client = BffBackend(api, sleep=clock.sleep, clock=clock)
    client.on_checking = states.append
    reply = client.send_files("s", "enviar_arquivo", [pdf("f1.pdf", 10), pdf("f2.pdf", 10)], "r")
    assert states == ["Verificando os documentos..."]
    assert clock.sleeps == [2.0, 2.0, 2.0]  # one consult per round, rotating f1, f2, f1, f2 (E-019)
    assert reply["files"] == [
        {"id": "f1", "accepted": True, "metadata": {"documentKind": "norma_integral", "issuer": "CMN", "normIdentifier": "Resolução CMN 4.855"}},
        {"id": "f2", "accepted": False, "quarantine": "AMEACA_DETECTADA", "reason": QUARANTINE_TEXTS["AMEACA_DETECTADA"]}]
    assert reply["node"]["id"] == "inicio" and reply["messages"] == [{"role": "ai", "text": "Avaliei o documento."}]
    assert api.calls[0] == ("POST", "/agente/sessoes/s/arquivos", {"passoId": "enviar_arquivo", "requisicaoId": "r"}, ["f1.pdf", "f2.pdf"], "arquivos")


@pytest.mark.parametrize("reason", ["AMEACA_DETECTADA", "VERIFICACAO_FALHOU", "CONTEUDO_NAO_SUPORTADO"])
def test_a_single_document_stopped_in_quarantine_gets_its_pt_br_text(reason):
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                   ("GET", "/agente/sessoes/s/arquivos/f1"): judged("f1", "REJEITADO", reply=True, motivoRejeicao=reason)})
    reply = BffBackend(api, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert reply["messages"][0] == {"role": "ai", "text": QUARANTINE_TEXTS[reason]}
    assert chat.file_result_cells({"name": "f1.pdf", "sizeBytes": 10, "result": reply["files"][0]})["result"] == "Recusado na verificação de segurança"


def test_content_refused_after_the_antivirus_is_not_a_quarantine_verdict():
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                   ("GET", "/agente/sessoes/s/arquivos/f1"): judged("f1", reply=True, avaliacao={"aceito": False, "motivo": "Não é norma."})})
    reply = BffBackend(api, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert reply["files"] == [{"id": "f1", "accepted": False, "reason": "Não é norma."}]
    assert reply["messages"] == [{"role": "ai", "text": "Avaliei o documento."}]


def test_all_judged_without_the_reply_asks_the_last_document_again():
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                   ("GET", "/agente/sessoes/s/arquivos/f1"): [judged("f1", avaliacao={"aceito": True}), judged("f1", reply=True, avaliacao={"aceito": True})]})
    reply = BffBackend(api, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert reply["node"]["id"] == "inicio"
    assert sum(1 for c in api.calls if c[0] == "GET") == 2


def test_quarantine_past_two_minutes_cancels_and_says_so():
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                   ("GET", "/agente/sessoes/s/arquivos/f1"): CHECKING,
                   ("POST", "/agente/sessoes/s/cancelamentos"): {"passo": UPLOAD_STEP}})
    clock = Clock()
    with pytest.raises(ChatRequestError) as raised:
        BffBackend(api, sleep=clock.sleep, clock=clock).send_files("s", "u", [pdf("f1.pdf", 10)], "r9")
    assert raised.value.code == "FILE_CHECK_TIMEOUT"
    assert clock.now >= 120
    assert api.calls[-1] == ("POST", "/agente/sessoes/s/cancelamentos", {"requisicaoId": "r9"})
    assert chat.error_text("FILE_CHECK_TIMEOUT").startswith("A verificação do documento está demorando")


def test_consult_404_is_session_not_found_at_once():
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                   ("GET", "/agente/sessoes/s/arquivos/f1"): ApiError("SESSION_NOT_FOUND", 404)})
    with pytest.raises(ChatRequestError) as raised:
        BffBackend(api, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert raised.value.code == "SESSION_NOT_FOUND"
    assert sum(1 for c in api.calls if c[0] == "GET") == 1


def test_consult_5xx_is_retried_and_the_third_one_gives_up():
    flaky = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                     ("GET", "/agente/sessoes/s/arquivos/f1"): [ApiError("SERVICE_UNAVAILABLE", 503), ApiError("SERVICE_UNAVAILABLE", 0),
                                                                judged("f1", reply=True, avaliacao={"aceito": True})]})
    assert BffBackend(flaky, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")["files"][0]["accepted"] is True
    down = FakeApi({("POST", "/agente/sessoes/s/arquivos"): accepted("f1"),
                    ("GET", "/agente/sessoes/s/arquivos/f1"): [ApiError("SERVICE_UNAVAILABLE", 500, "t1")] * 3})
    with pytest.raises(ChatRequestError) as raised:
        BffBackend(down, sleep=lambda _: None).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert (raised.value.code, raised.value.trace_id) == ("SERVICE_UNAVAILABLE", "t1")


def test_synchronous_refusal_of_the_send_maps_the_problem_code():
    api = FakeApi({("POST", "/agente/sessoes/s/arquivos"): ApiError("SEND_TOO_LARGE", 413)})
    with pytest.raises(ChatRequestError) as raised:
        BffBackend(api).send_files("s", "u", [pdf("f1.pdf", 10)], "r")
    assert raised.value.code == "SEND_TOO_LARGE"
    assert chat.error_text("SEND_TOO_LARGE") == "Os documentos somam mais de 9 MB. Envie menos arquivos por vez."


class Status:
    """fetch double for await_quarantine: replies per file id in order (an exception is raised); records the calls."""

    def __init__(self, replies: dict):
        self.replies, self.calls = replies, []

    def __call__(self, file_id):
        self.calls.append(file_id)
        reply = self.replies[file_id].pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def checking(file_id):
    return {"id": file_id, "status": "EM_VERIFICACAO"}


def approved(file_id, reply=False):
    return {"id": file_id, "status": "APROVADO", "result": {"id": file_id, "accepted": True},
            **({"reply": {"node": {"id": "inicio"}, "messages": []}} if reply else {})}


def test_quarantine_polls_one_document_per_round_in_rotation():
    fetch = Status({"a": [checking("a"), approved("a")], "b": [checking("b"), approved("b")], "c": [checking("c"), approved("c", reply=True)]})
    clock = Clock()
    reply = await_quarantine(["a", "b", "c"], fetch, lambda: None, sleep=clock.sleep, clock=clock)
    assert fetch.calls == ["a", "b", "c", "a", "b", "c"]
    assert clock.sleeps == [2.0] * 5  # one request per interval, whatever the number of documents
    assert [f["id"] for f in reply["files"]] == ["a", "b", "c"]


def test_quarantine_429_waits_its_retry_after_within_bounds_and_counts_as_a_failure():
    fetch = Status({"a": [ApiError("RATE_LIMITED", 429, retry_after=60), ApiError("RATE_LIMITED", 429, retry_after=0),
                          ApiError("RATE_LIMITED", 429), approved("a", reply=True)]})
    clock = Clock()
    with pytest.raises(ChatRequestError) as raised:
        await_quarantine(["a"], fetch, lambda: None, sleep=clock.sleep, clock=clock)
    assert raised.value.code == "RATE_LIMITED"  # the third 429 in a row gives up
    assert clock.sleeps == [10.0, 1.0]          # 60 s capped at 10, 0 s raised to 1


def test_quarantine_success_resets_the_consecutive_failure_count():
    down = ApiError("SERVICE_UNAVAILABLE", 503)
    fetch = Status({"a": [down, down, checking("a"), down, down, approved("a", reply=True)]})
    reply = await_quarantine(["a"], fetch, lambda: None, sleep=lambda _: None, clock=lambda: 0.0)
    assert reply["files"][0]["accepted"] is True  # 2 failures, a success, 2 failures: never 3 in a row


def test_quarantine_deadline_is_checked_before_every_consult():
    class SlowClock(Clock):
        def __call__(self):
            return self.now

    clock = SlowClock()
    cancelled = []

    def fetch(file_id):
        clock.now += 70  # a slow consult (no sleep involved)
        return checking(file_id)

    with pytest.raises(ChatRequestError) as raised:
        await_quarantine(["a", "b", "c"], fetch, lambda: cancelled.append(True), interval=0, sleep=clock.sleep, clock=clock)
    assert raised.value.code == "FILE_CHECK_TIMEOUT" and cancelled == [True]
    assert clock.now == 140  # two consults (0 -> 70 -> 140); the third file is never asked past the deadline


def test_403_aut_003_in_the_chat_asks_to_reload_the_page():
    state = ChatState()
    chat.start(state, Failing(chat._as_request_error(ApiError("SESSION_RENEW", 403))))
    assert state.messages[-1]["text"] == "Sua sessão precisa ser renovada. Recarregue a página."


def test_await_quarantine_without_documents_is_an_error():
    with pytest.raises(ChatRequestError):
        await_quarantine([], lambda _: {}, lambda: None)


# --- 401 / 403 and the support code in the conversation ---------------------------------------------------------------------------
class Failing(MockBackend):
    def __init__(self, error):
        super().__init__(ChatMockServer(load_mock_flow()))
        self.error, self.starts = error, 0

    def start_session(self):
        self.starts += 1
        raise self.error


def test_401_shows_session_expired_with_the_login_link_and_no_retry():
    state, backend = ChatState(), Failing(ChatRequestError("AUTH_REQUIRED", 401, "abc123"))
    chat.start(state, backend)
    message = state.messages[-1]
    assert message["text"] == "Sua sessão expirou. Entre novamente."
    assert message["loginUrl"] == "/" and message["supportCode"] == "Código de suporte: abc123"
    assert not chat.show_retry(state)
    tail = chat.bubble_tail_html(message)
    assert 'href="/"' in tail and TEXTS["loginLink"] in tail and "Código de suporte: abc123" in tail
    chat.start(state, backend)  # render_panel calls start() on every rerun: no new request after a 401
    assert backend.starts == 1 and len(state.messages) == 1


def test_403_in_the_chat_has_its_own_text_and_can_be_retried():
    state = ChatState()
    chat.start(state, Failing(ChatRequestError("FORBIDDEN", 403)))
    assert state.messages[-1]["text"] == "Você não tem acesso ao agente."
    assert "loginUrl" not in state.messages[-1] and chat.show_retry(state)


def test_support_code_is_shown_only_when_the_bff_sent_a_trace_id():
    with_trace, without = ChatState(), ChatState()
    chat.start(with_trace, Failing(ChatRequestError("SERVICE_UNAVAILABLE", 500, "4bf92f35")))
    chat.start(without, Failing(ChatRequestError("SERVICE_UNAVAILABLE", 500)))
    assert with_trace.messages[-1]["supportCode"] == "Código de suporte: 4bf92f35"
    assert "supportCode" not in without.messages[-1]
    assert "Código de suporte" not in chat.bubble_tail_html(without.messages[-1])


def test_api_errors_keep_their_trace_id_as_chat_errors():
    error = chat._as_request_error(ApiError("AUTH_REQUIRED", 401, "t-1"))
    assert (error.code, error.status, error.trace_id) == ("AUTH_REQUIRED", 401, "t-1")


# --- Mock: quarantine simulated quickly ----------------------------------------------------------------------------------------------
def mock_at_upload():
    backend, state = MockBackend(ChatMockServer(load_mock_flow())), ChatState()
    chat.start(state, backend)
    chat.pick_option(state, next(o for o in state.node["options"] if o["id"] == "avaliar_arquivo"), backend)
    assert state.node["type"] == "upload"
    return backend, state


def test_mock_goes_through_the_quarantine_states_without_waiting():
    backend, state = mock_at_upload()
    original, statuses, toasts = backend.server.file_status, [], []

    def observe(session_id, file_id):
        status = original(session_id, file_id)
        statuses.append(status["status"])
        return status

    backend.server.file_status = observe
    backend.on_checking = toasts.append
    chat.send_files(state, [pdf("norma.pdf", MB)], backend)
    assert statuses == ["EM_VERIFICACAO", "APROVADO"]
    assert toasts == ["Verificando o documento..."]
    user = next(m for m in state.messages if m.get("files"))
    assert user["files"][0]["accepted"] is True and state.used_bytes == MB


@pytest.mark.parametrize(("name", "reason"), [("virus.pdf", "AMEACA_DETECTADA"), ("arquivo-protegido.pdf", "VERIFICACAO_FALHOU"),
                                              ("planilha-macro.pdf", "CONTEUDO_NAO_SUPORTADO")])
def test_mock_stops_documents_in_quarantine_by_name(name, reason):
    backend, state = mock_at_upload()
    chat.send_files(state, [pdf(name, MB)], backend)
    user = next(m for m in state.messages if m.get("files"))
    assert user["files"][0]["accepted"] is False
    assert state.messages[-1]["text"] == QUARANTINE_TEXTS[reason]
    assert state.node["type"] == "upload" and state.used_bytes == 0  # nothing counted, still waiting for a document


def test_mock_quarantine_with_several_documents_lists_the_security_refusal():
    backend, state = mock_at_upload()
    chat.send_files(state, [pdf("norma.pdf", MB), pdf("virus.pdf", MB)], backend)
    rows = next(m for m in state.messages if m.get("fileResults"))["fileResults"]
    cells = [chat.file_result_cells(r) for r in rows]
    assert [c["result"] for c in cells] == [TEXTS["fileAccepted"], "Recusado na verificação de segurança"]
    assert cells[1]["note"] == QUARANTINE_TEXTS["AMEACA_DETECTADA"]
    assert state.used_bytes == MB


def test_mock_server_handle_files_is_unchanged_for_normal_names():
    server = ChatMockServer(load_mock_flow())
    start = server.start_session()
    reply = server.handle_message({"sessionId": start["sessionId"], "nodeId": start["node"]["id"], "action": "option",
                                   "optionId": "avaliar_arquivo", "requestId": "r1"})
    files = server.handle_files(start["sessionId"], reply["node"]["id"], [pdf("norma.pdf", 15 * MB)], "r2")["files"]
    assert files[0]["accepted"] is True and "quarantine" not in files[0]
