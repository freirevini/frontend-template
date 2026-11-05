"""Pure helpers of core.chat, ported from the landing specs with the same expected values: safe-markdown.spec.ts,
chat-farewell.spec.ts, chat-greeting.spec.ts, chat-suggestions.spec.ts, chat-norms-export.spec.ts, chat-file-results.spec.ts,
chat-file.spec.ts, chat-format.spec.ts, chat.model.spec.ts, chat-texts.spec.ts."""
from __future__ import annotations

import re
import time
from datetime import datetime

import pytest

from core.chat import (CHAT_LIMITS, ERROR_TEXTS, GENERIC_ERROR_TEXT, TEXTS, ChatFile, build_chat_suggestions, build_greeting,
                       can_rate_message, file_kind_label, file_problem_text, file_result_cells, file_results_xlsx_table,
                       format_file_size, format_norm_date, greeting_name, is_email, is_farewell_message, last_quick_replies,
                       norm_list_title, norm_list_xlsx_table, safe_markdown, segments_of, time_of_day_greeting,
                       validate_chat_file, validate_chat_files, visible_norms, with_file_results, with_greeting)
from core.xlsx import build_xlsx

MB = 1024 * 1024


# --- safeMarkdown ---------------------------------------------------------------------------------------------------------
class TestSafeMarkdown:
    def test_empty_input(self):
        assert safe_markdown("") == ""
        assert safe_markdown(None) == ""

    def test_paragraphs_and_line_breaks(self):
        assert safe_markdown("linha 1\nlinha 2\n\nsegundo") == "<p>linha 1<br>linha 2</p><p>segundo</p>"

    def test_bold_italic_code(self):
        assert safe_markdown("**forte** e *ênfase* e `x`") == "<p><strong>forte</strong> e <em>ênfase</em> e <code>x</code></p>"

    def test_no_markdown_inside_code(self):
        assert safe_markdown("`**não** [a](https://x.com)`") == "<p><code>**não** [a](https://x.com)</code></p>"

    def test_lists(self):
        assert safe_markdown("- a\n- b") == "<ul><li>a</li><li>b</li></ul>"
        assert safe_markdown("1. a\n2) b") == "<ol><li>a</li><li>b</li></ol>"
        assert safe_markdown("texto\n- a") == "<p>texto</p><ul><li>a</li></ul>"

    def test_lone_asterisks(self):
        assert safe_markdown("2 * 3 * 4") == "<p>2 * 3 * 4</p>"

    def test_links_http_only(self):
        assert safe_markdown("[norma](https://exemplo.com.br/a?b=1&c=2)") == (
            '<p><a href="https://exemplo.com.br/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">norma</a></p>')
        assert safe_markdown("[x](javascript:alert(1))") == "<p>[x](javascript:alert(1))</p>"
        assert "<a" not in safe_markdown("[x](data:text/html;base64,AAAA)")
        assert "<a" not in safe_markdown("[x](//evil.com)")

    def test_escapes_raw_html(self):
        out = safe_markdown("<script>alert(1)</script><img src=x onerror=alert(1)>")
        assert "<script" not in out and "<img" not in out
        assert "&lt;script&gt;" in out

    def test_href_breakout(self):
        out = safe_markdown('[x](https://a.com/"onmouseover="alert(1))')
        assert not re.search(r"<a[^>]* onmouseover=", out)
        assert '"onmouseover' not in out

    def test_quotes_and_ampersands(self):
        assert safe_markdown("a & \"b\" 'c'") == "<p>a &amp; &quot;b&quot; &#39;c&#39;</p>"

    def test_tags_inside_marks(self):
        assert safe_markdown("**<b>x</b>**") == "<p><strong>&lt;b&gt;x&lt;/b&gt;</strong></p>"
        assert safe_markdown("- <i>x</i>") == "<ul><li>&lt;i&gt;x&lt;/i&gt;</li></ul>"
        assert "&lt;b&gt;x&lt;/b&gt;</a>" in safe_markdown("[<b>x</b>](https://a.com)")

    def test_nul_characters_cannot_forge_placeholders(self):
        assert safe_markdown("`<b>x</b>` \u00000\u0000 \u00005\u0000") == "<p><code>&lt;b&gt;x&lt;/b&gt;</code> 0 5</p>"

    def test_fast_on_hostile_input(self):
        started = time.perf_counter()
        safe_markdown("*a" * 4000)
        safe_markdown("[" * 4000)
        safe_markdown("**" * 4000)
        assert time.perf_counter() - started < 1.0


# --- farewell ---------------------------------------------------------------------------------------------------------------
@pytest.mark.parametrize("text", ["tchau", "Tchau!", "obrigado", "Muito obrigada pela ajuda", "valeu, até mais", "Até logo", "ate logo",
                                  "era só isso, obrigado", "pode encerrar", "fim", "ok, só isso", "Obrigado, Agente da Agenda!"])
def test_farewell_recognized(text):
    assert is_farewell_message(text)


@pytest.mark.parametrize("text", ["obrigado, e qual o prazo?", "qual o fim da vigência?", "até quando vale a resolução?", "sim", "ok", "",
                                  "   ", "boa tarde", " ".join(["obrigado"] * 9)])
def test_farewell_rejected(text):
    assert not is_farewell_message(text)


# --- greeting ---------------------------------------------------------------------------------------------------------------
def at(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 10, 28, hour, minute)


def test_time_of_day():
    assert time_of_day_greeting(at(5)) == "Bom dia"
    assert time_of_day_greeting(at(11, 59)) == "Bom dia"
    assert time_of_day_greeting(at(12)) == "Boa tarde"
    assert time_of_day_greeting(at(17, 59)) == "Boa tarde"
    assert time_of_day_greeting(at(18)) == "Boa noite"
    assert time_of_day_greeting(at(0)) == "Boa noite"
    assert time_of_day_greeting(at(4, 59)) == "Boa noite"


def test_greeting_name_keeps_real_first_name():
    assert greeting_name("vinicius") == "Vinicius"
    assert greeting_name("VINICIUS FREIRE SILVA") == "Vinicius"
    assert greeting_name("  joão ") == "João"
    assert greeting_name("ana-luíza") == "Ana-Luíza"
    assert greeting_name("d'ávila") == "D'Ávila"


@pytest.mark.parametrize("raw", ["CORP\\vfreire", "vinicius.freire", "x12345", "vinicius@empresa.example", "", None, "a" * 41])
def test_greeting_name_never_a_login(raw):
    assert greeting_name(raw) == ""


def test_build_and_place_greeting():
    assert build_greeting("vinicius", at(15)) == "Boa tarde, Vinicius!"
    assert build_greeting(None, at(15)) == "Boa tarde!"
    assert build_greeting("CORP\\vfreire", at(8)) == "Bom dia!"
    placed = with_greeting([{"role": "ai", "text": "Busca…", "transient": True}, {"role": "ai", "text": "Sou o agente."}], "Oi!")
    assert [m["text"] for m in placed] == ["Busca…", "Oi! Sou o agente."]
    assert with_greeting([], "Oi!") == [{"role": "ai", "text": "Oi!"}]


# --- suggestions ------------------------------------------------------------------------------------------------------------
MENU = {"id": "m", "type": "menu", "prompt": "?", "canGoBack": False,
        "options": [{"id": "a", "label": "Consultar uma norma"}, {"id": "b", "label": "Avaliar um documento"}]}
TEXT = {"id": "t", "type": "free_text", "prompt": "?", "canGoBack": True}
UPLOAD = {"id": "u", "type": "upload", "prompt": "?", "canGoBack": True}
END = {"id": "e", "type": "end", "prompt": "?", "canGoBack": False}


def kinds(items):
    return [s["kind"] for s in items]


def test_suggestions_menu_options_in_order():
    items = build_chat_suggestions(MENU, False, False)
    assert [(s["kind"], s["label"]) for s in items] == [("option", "Consultar uma norma"), ("option", "Avaliar um documento")]
    assert items[0]["option"] is MENU["options"][0]


def test_suggestions_back_then_end_last():
    items = build_chat_suggestions({**MENU, "canGoBack": True}, False, True)
    assert kinds(items) == ["option", "option", "back", "end"]
    assert items[2]["label"] == TEXTS["back"] and items[3]["label"] == TEXTS["end"]


def test_suggestions_text_upload_end_and_none():
    assert kinds(build_chat_suggestions(TEXT, False, True)) == ["back", "end"]
    assert kinds(build_chat_suggestions(UPLOAD, False, True)) == ["back", "end"]
    assert kinds(build_chat_suggestions(MENU, False, True)) == ["option", "option", "end"]
    assert [(s["kind"], s["label"]) for s in build_chat_suggestions(END, False, True)] == [("restart", TEXTS["restart"])]
    assert build_chat_suggestions(None, False, True) == []
    assert build_chat_suggestions(MENU, True, True) == []
    assert build_chat_suggestions({**TEXT, "canGoBack": False}, False, False) == []


def test_quick_replies_only_from_last_agent_message():
    assert last_quick_replies([{"role": "ai", "quickReplies": ["a"]}]) == ["a"]
    assert last_quick_replies([{"role": "ai", "quickReplies": ["a"]}, {"role": "user", "text": "x"}]) == []
    assert kinds(build_chat_suggestions(TEXT, False, True, ["a", "b"])) == ["reply", "reply", "back", "end"]


# --- norm list export -------------------------------------------------------------------------------------------------------
NORM_MESSAGE = {
    "id": "m1", "role": "ai", "text": "**Próximas normas** a entrar em vigor:",
    "normList": {"dateLabel": "Vigência", "items": [
        {"id": "a", "title": "Resolução A", "detail": "Altera prazos", "segment": "Varejo", "date": "2027-03-01"},
        {"id": "b", "title": "Circular B", "segment": "Atacado"},
    ]},
}


def test_format_norm_date():
    assert format_norm_date("2027-03-01") == "01/03/2027"
    assert format_norm_date(None) == ""
    assert format_norm_date("não é data") == ""


def test_norm_list_title():
    assert norm_list_title(NORM_MESSAGE) == "Próximas normas a entrar em vigor"
    assert norm_list_title({"text": ""}) == "Normas"


def test_norm_list_sheet_filtered():
    table = norm_list_xlsx_table(NORM_MESSAGE, [NORM_MESSAGE["normList"]["items"][0]], "Varejo", datetime(2026, 10, 28, 23, 30))
    assert table.sheet_name == "Normas"
    assert table.title == "Próximas normas a entrar em vigor"
    assert [c.header for c in table.columns] == ["Norma", "Observação", "Segmento", "Vigência"]
    assert table.rows == [{"title": "Resolução A", "detail": "Altera prazos", "segment": "Varejo", "date": "01/03/2027"}]
    assert table.subtitle == "Segmento: Varejo · 1 norma · gerado pelo Agente da Agenda em 28/10/2026"
    assert table.file_name == "agente-da-agenda-proximas-normas-a-entrar-em-vigor-varejo-2026-10-28.xlsx"
    assert build_xlsx(table)[:2] == b"PK"


def test_norm_list_sheet_all_segments():
    message = {**NORM_MESSAGE, "normList": {"items": NORM_MESSAGE["normList"]["items"]}}
    table = norm_list_xlsx_table(message, message["normList"]["items"], None, datetime(2026, 1, 5))
    assert table.columns[3].header == "Data"
    assert table.rows[1] == {"title": "Circular B", "detail": "", "segment": "Atacado", "date": ""}
    assert "Todos os segmentos · 2 normas" in table.subtitle
    assert table.file_name == "agente-da-agenda-proximas-normas-a-entrar-em-vigor-2026-01-05.xlsx"


def test_segments_and_filter():
    assert segments_of(NORM_MESSAGE) == ["Atacado", "Varejo"]
    assert [i["id"] for i in visible_norms(NORM_MESSAGE, "Varejo")] == ["a"]
    assert len(visible_norms(NORM_MESSAGE, None)) == 2


# --- file results -----------------------------------------------------------------------------------------------------------
REPLY = {
    "node": {"id": "u", "type": "upload", "prompt": "Envie.", "canGoBack": True},
    "messages": [{"role": "ai", "text": "Analisando…", "transient": True}, {"role": "ai", "text": "Avaliei."}],
    "files": [
        {"id": "a", "accepted": True, "metadata": {"normIdentifier": "Resolução 1", "issuer": "desconhecido", "documentKind": "trecho_norma"}},
        {"id": "b", "accepted": False, "reason": "Não é norma."},
    ],
}
FILES = [ChatFile("a.pdf", 2048), ChatFile("b.docx", 10)]


def test_with_file_results_only_for_several():
    several = with_file_results(REPLY, FILES)
    assert "fileResults" not in several["messages"][0]
    assert [(r["name"], r["result"]["id"]) for r in several["messages"][1]["fileResults"]] == [("a.pdf", "a"), ("b.docx", "b")]
    assert with_file_results(REPLY, FILES[:1]) is REPLY


def test_with_file_results_creates_message():
    bare = with_file_results({**REPLY, "messages": []}, FILES)
    assert bare["messages"][0]["text"] == TEXTS["fileResultsTitle"]
    assert len(bare["messages"][0]["fileResults"]) == 2


def test_file_result_cells():
    rows = with_file_results(REPLY, FILES)["messages"][1]["fileResults"]
    assert file_result_cells(rows[0]) == {"name": "a.pdf", "size": "2 KB", "result": TEXTS["fileAccepted"], "norm": "Resolução 1",
                                          "issuer": "", "kind": "Trecho de norma", "note": ""}
    assert file_result_cells(rows[1])["note"] == "Não é norma."
    assert file_kind_label("outro") == "outro"


def test_file_results_sheet():
    rows = with_file_results(REPLY, FILES)["messages"][1]["fileResults"]
    table = file_results_xlsx_table(rows, datetime(2026, 10, 28))
    assert [c.header for c in table.columns] == ["Arquivo", "Tamanho", "Resultado", "Norma identificada", "Emissor", "Tipo de documento", "Observação"]
    assert len(table.rows) == 2
    assert table.subtitle == "2 documentos · 1 aceito · gerado pelo Agente da Agenda em 28/10/2026"
    assert table.file_name == "agente-da-agenda-avaliacao-documentos-2026-10-28.xlsx"


# --- file validation --------------------------------------------------------------------------------------------------------
UPLOAD_CFG = {"accept": [".pdf", ".png", ".jpg", ".jpeg", ".webp"], "maxBytes": CHAT_LIMITS["maxSessionBytes"], "maxFiles": 1}


def f(name, size, type_=""):
    return ChatFile(name, size, type_)


def test_validate_accepts_pdf_and_images():
    assert validate_chat_file(f("norma.pdf", MB, "application/pdf"), UPLOAD_CFG, 0) is None
    assert validate_chat_file(f("print.PNG", MB, "image/png"), UPLOAD_CFG, 0) is None
    assert validate_chat_file(f("foto.jpeg", MB, "image/jpeg"), UPLOAD_CFG, 0) is None
    assert validate_chat_file(f("foto.webp", MB, "image/webp"), UPLOAD_CFG, 0) is None
    assert validate_chat_file(f("norma.pdf", MB), UPLOAD_CFG, 0) is None


def test_validate_rejects_types():
    for name in ("programa.exe", "norma", "norma.pdf.exe", ".pdf."):
        assert validate_chat_file(f(name, MB), UPLOAD_CFG, 0) == "FILE_TYPE_NOT_ALLOWED"
    assert validate_chat_file(f("norma.pdf", MB, "application/x-msdownload"), UPLOAD_CFG, 0) == "FILE_TYPE_NOT_ALLOWED"


def test_validate_sizes():
    assert validate_chat_file(f("norma.pdf", 0), UPLOAD_CFG, 0) == "FILE_EMPTY"
    small = {**UPLOAD_CFG, "maxBytes": 5 * MB}
    assert validate_chat_file(f("norma.pdf", 5 * MB), small, 0) is None
    assert validate_chat_file(f("norma.pdf", 5 * MB + 1), small, 0) == "FILE_TOO_LARGE"
    assert validate_chat_file(f("norma.pdf", 5 * MB), UPLOAD_CFG, 15 * MB) is None
    assert validate_chat_file(f("norma.pdf", 5 * MB + 1), UPLOAD_CFG, 15 * MB) == "SESSION_QUOTA_EXCEEDED"


def test_problem_texts():
    assert file_problem_text("FILE_EMPTY") == TEXTS["fileEmpty"]
    assert file_problem_text("FILE_TOO_LARGE") == ERROR_TEXTS["FILE_TOO_LARGE"]
    assert file_problem_text("SESSION_QUOTA_EXCEEDED") == ERROR_TEXTS["SESSION_QUOTA_EXCEEDED"]
    assert file_problem_text("TOO_MANY_FILES") == TEXTS["fileTooMany"]


def test_validate_batch():
    upload = {"accept": [".pdf", ".docx", ".doc", ".png"], "maxBytes": 20 * MB, "maxFiles": 2}
    check = validate_chat_files([f("a.pdf", 10, "application/pdf"), f("b.docx", 10), f("c.doc", 10)], upload, 0)
    assert [x.name for x in check.valid] == ["a.pdf", "b.docx"]
    assert check.problems == [{"name": "c.doc", "problem": "TOO_MANY_FILES"}]
    quota = validate_chat_files([f("a.pdf", 15), f("b.pdf", 10)], upload, CHAT_LIMITS["maxSessionBytes"] - 20)
    assert [x.name for x in quota.valid] == ["a.pdf"]
    assert quota.problems[0]["problem"] == "SESSION_QUOTA_EXCEEDED"
    many = [f(f"n{i}.pdf", 10) for i in range(7)]
    assert len(validate_chat_files(many, {**upload, "maxFiles": 10}, 0).valid) == CHAT_LIMITS["maxFilesPerSend"]


# --- format, rating rule, texts ---------------------------------------------------------------------------------------------
def test_format_file_size():
    assert format_file_size(0) == "0 B"
    assert format_file_size(512) == "512 B"
    assert format_file_size(1536) == "1,5 KB"
    assert format_file_size(20 * MB) == "20 MB"
    assert format_file_size(-5) == "0 B"


def test_is_email():
    assert is_email("contato@compliance.com.br")
    assert not is_email("ramal 1234")
    assert not is_email("a@b")
    assert not is_email('"x"@evil.com')


def test_can_rate_message():
    assert can_rate_message({"role": "ai", "status": "answer"})
    assert can_rate_message({"role": "ai", "status": "not_in_data"})
    assert not can_rate_message({"role": "ai", "status": "not_in_data", "contacts": [{"name": "a", "area": "b", "channel": "c"}]})
    for message in ({"role": "ai", "status": "out_of_scope"}, {"role": "ai", "status": "need_more_info"}, {"role": "ai", "status": "error"},
                    {"role": "ai"}, {"role": "user", "status": "answer"}, {"role": "system", "status": "answer"}):
        assert not can_rate_message(message)


def test_error_texts():
    codes = ["INVALID_ACTION", "SESSION_NOT_FOUND", "FILE_TYPE_NOT_ALLOWED", "FILE_TOO_LARGE", "SESSION_QUOTA_EXCEEDED", "RATE_LIMITED", "SERVICE_UNAVAILABLE"]
    assert sorted(ERROR_TEXTS) == sorted(codes)
    assert all(ERROR_TEXTS[c] for c in codes)
    assert GENERIC_ERROR_TEXT == ERROR_TEXTS["SERVICE_UNAVAILABLE"]
    assert CHAT_LIMITS["maxSessionBytes"] == 20 * MB
    assert "20 MB" in ERROR_TEXTS["SESSION_QUOTA_EXCEEDED"] and "20 MB" in ERROR_TEXTS["FILE_TOO_LARGE"]
    assert TEXTS["agentName"] == "Agente da Agenda" and TEXTS["userName"] == "Você"
    assert CHAT_LIMITS["maxInputChars"] == 1000 and CHAT_LIMITS["maxFilesPerSend"] == 5


def test_to_message_ignores_bff_id_and_unknown_role():
    # Review finding: a BFF message could override the widget id or inject markup through `role` (CSS class).
    from core.chat import _to_message

    message = _to_message({"id": "fixed", "role": 'ai" onmouseover="x', "text": "oi"})
    assert message["id"] != "fixed" and message["id"].startswith("m")
    assert message["role"] == "system"
    assert _to_message({"role": "ai", "text": "oi"})["role"] == "ai"
