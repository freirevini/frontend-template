"""Contract v1 in core.data (ADR-009): adapters from the v1 names to the internal shapes, the requests each block makes
(paging, sorting, filters) and the Excel page loop with the 5.000-row cap. The BFF is always simulated (core.api)."""
from __future__ import annotations

import copy
from datetime import date

import pytest

from core import api, data
from core.period import DateRange, preset_range

Q4 = preset_range("Month", 3)  # 01/10/2021 to 31/12/2021


@pytest.fixture
def bff(monkeypatch):
    """BFF mode; `replies[path]` is a payload or a function(params) -> payload; every call is recorded."""
    calls, replies = [], {}
    monkeypatch.setattr(data, "use_mock_data", lambda: False)

    def fake_get_json(path, params=None):
        calls.append((path, copy.deepcopy(params)))
        reply = replies[path]
        return copy.deepcopy(reply(params) if callable(reply) else reply)

    monkeypatch.setattr(data.api, "get_json", fake_get_json)
    return calls, replies


def v1_norma(i: int = 0, **patch):
    base = {"codigo": f"Resolução CMN {4800 + i}", "orgao": "CMN", "tipo": "Resolução", "numero": f"{4800 + i}",
            "dataClassificacao": "2021-12-02", "segmento": "VAREJO", "tema": "Pix: regras de devolução e limites", "aplicavel": True,
            "area": "Meios de Pagamento", "diretoria": "Operações"}
    return {**base, **patch}


def page_of(items, total, number=0, size=15):
    return {"content": items, "totalElements": total, "totalPages": -(-total // size), "number": number, "size": size,
            "pageable": {"ignored": True}, "first": number == 0}


# --- Segments --------------------------------------------------------------------------------------------------------------
def test_segments_adapter_maps_names_ids_and_order():
    response = {"dataReferencia": "2021-12-31", "segmentos": [
        {"id": "VAREJO", "nome": "Varejo", "total": 10, "aClassificar": 2, "tendencia": [1, 2]},
        {"id": "ATACADO", "nome": "Atacado", "total": 54, "aClassificar": 7, "tendencia": [65, 59]},
    ]}
    cards = data.segments_from_v1(response)
    assert cards["asOf"] == "2021-12-31"
    assert cards["segments"] == [
        {"id": "atacado", "label": "Atacado", "icon": "cilTruck", "total": 54, "toClassify": 7, "trend": [65, 59]},
        {"id": "varejo", "label": "Varejo", "icon": "cilCart", "total": 10, "toClassify": 2, "trend": [1, 2]},
    ]


def test_segments_adapter_rejects_a_segment_outside_the_contract():
    with pytest.raises(ValueError, match="fora do contrato"):
        data.segments_from_v1({"dataReferencia": "2021-12-31", "segmentos": [{"id": "OUTRO", "nome": "x", "total": 1, "aClassificar": 0}]})


def test_bff_segments_still_go_through_the_card_validation(bff):
    _, replies = bff
    replies["/segmentos"] = {"dataReferencia": "2021-12-31", "segmentos": [{"id": "ATACADO", "nome": "Atacado", "total": 3, "aClassificar": 9}]}
    with pytest.raises(ValueError, match="maiores que o total"):
        data.segments()


# --- Normativos Recebidos ----------------------------------------------------------------------------------------------------
def test_traffic_request_and_adapter(bff):
    calls, replies = bff
    replies["/normativos-recebidos"] = {"granularidade": "MES", "inicio": "2021-10-01", "fim": "2021-12-31", "pontos": ["2021-10", "2021-11", "2021-12"],
                                        "segmentos": [{"segmento": sid.upper(), "nome": sid, "classificadas": [1, 2, 3], "aClassificar": [0, 1, 0]}
                                                      for sid in ("atacado", "corporativo", "plataforma", "varejo")]}
    result = data.traffic("Month", Q4)
    assert calls == [("/normativos-recebidos", {"fim": "2021-12-31", "granularidade": "MES", "inicio": "2021-10-01"})]
    assert result.values["corporativo"] == [1, 2, 3] and result.to_classify["varejo"] == [0, 1, 0]
    adapted = data.traffic_from_v1(replies["/normativos-recebidos"])
    assert adapted["period"] == "Month" and adapted["points"] == ["2021-10", "2021-11", "2021-12"]


# --- Classification: summary (pie and themes) ---------------------------------------------------------------------------------
SUMMARY = {"dataReferencia": "2021-12-31", "total": 40, "aplicaveis": 30, "naoAplicaveis": 10, "totalTemas": 30,
           "temas": [{"tema": "Pix", "quantidade": 12}, {"tema": "Capital", "quantidade": 6}],
           "outrosTemas": {"quantidade": 12, "temasAgrupados": 5}}


def test_classification_summary_adapter_computes_only_shares_and_widths():
    agg = data.classification_aggregate_from_v1(SUMMARY)
    assert (agg.total, agg.applicable, agg.not_applicable, agg.themes_total) == (40, 30, 10, 30)
    assert agg.applicable_share == 0.75
    assert [(t.label, t.count, t.share, t.width, t.grouped) for t in agg.themes] == [("Pix", 12, 0.4, 1.0, 0), ("Capital", 6, 0.2, 0.5, 0)]
    assert (agg.others.label, agg.others.count, agg.others.share, agg.others.width, agg.others.grouped) == ("Outros temas", 12, 0.4, 0, 5)
    empty = data.classification_aggregate_from_v1({**SUMMARY, "total": 0, "aplicaveis": 0, "naoAplicaveis": 0, "totalTemas": 0, "temas": [],
                                                   "outrosTemas": None})
    assert empty.applicable_share == 0 and empty.others is None and empty.themes == []


@pytest.mark.parametrize("patch", [{"total": -1}, {"aplicaveis": "30"}, {"temas": [{"tema": "", "quantidade": 1}]}, {"temas": None}])
def test_classification_summary_adapter_rejects_broken_payloads(patch):
    with pytest.raises(ValueError):
        data.classification_aggregate_from_v1({**SUMMARY, **patch})


def test_classification_summary_requests_the_filters_as_parameters(bff):
    calls, replies = bff
    replies["/normas-classificadas/resumo"] = SUMMARY
    data.classification_summary(Q4, segment="varejo", theme="Pix")
    data.classification_summary(Q4, themes_of=False)
    assert calls == [
        ("/normas-classificadas/resumo", {"fim": "2021-12-31", "inicio": "2021-10-01", "segmento": "VAREJO", "tema": "Pix", "temasDe": "APLICAVEIS"}),
        ("/normas-classificadas/resumo", {"fim": "2021-12-31", "inicio": "2021-10-01", "temasDe": "NAO_APLICAVEIS"}),
    ]


def test_mock_classification_summary_is_the_local_aggregate():
    year = DateRange(date(2021, 1, 1), date(2021, 12, 31))
    assert data.classification_summary(year, segment="varejo") == data.aggregate_classification(data.classification(), year, segment="varejo")


# --- Classification: Tabela Analítica (server paging) ------------------------------------------------------------------------
def test_norma_adapter_maps_every_field():
    assert data.norma_from_v1(v1_norma()) == {
        "code": "Resolução CMN 4800", "orgao": "CMN", "tipo": "Resolução", "numero": "4800", "classifiedAt": "2021-12-02",
        "segment": "varejo", "theme": "Pix: regras de devolução e limites", "applicable": True, "area": "Meios de Pagamento", "diretoria": "Operações"}


def test_classified_page_requests_page_size_sort_and_filters(bff):
    calls, replies = bff
    replies["/normas-classificadas"] = page_of([v1_norma(i) for i in range(15)], 40, number=1)
    result = data.classified_page(Q4, segment="varejo", theme="Pix", applicable=False, sort_key="numero", sort_dir="asc", page=2, size=15)
    assert calls == [("/normas-classificadas", {"aplicavel": "false", "fim": "2021-12-31", "inicio": "2021-10-01", "page": "1",
                                                "segmento": "VAREJO", "size": "15", "sort": ["numero,asc"], "tema": "Pix"})]
    assert (result.total, result.page, len(result.rows)) == (40, 2, 15)
    assert result.rows[0]["segment"] == "varejo"


@pytest.mark.parametrize(("sort_key", "field"), [("classifiedAt", "dataClassificacao"), ("theme", "tema"), ("segment", "segmento"),
                                                 ("applicable", "aplicavel"), ("diretoria", "diretoria")])
def test_every_table_column_sorts_by_its_v1_field(bff, sort_key, field):
    calls, replies = bff
    replies["/normas-classificadas"] = page_of([], 0)
    data.classified_page(Q4, sort_key=sort_key, sort_dir="desc")
    assert calls[0][1]["sort"] == [f"{field},desc"]


def test_a_page_past_the_end_is_asked_again_as_the_last_page(bff):
    calls, replies = bff
    replies["/normas-classificadas"] = lambda params: page_of([v1_norma(int(params["page"]))] if params["page"] == "1" else [], 20)
    result = data.classified_page(Q4, page=5, size=15)
    assert [c[1]["page"] for c in calls] == ["4", "1"]
    assert (result.page, result.total, len(result.rows)) == (2, 20, 1)


def test_classified_page_validates_rows(bff):
    _, replies = bff
    replies["/normas-classificadas"] = page_of([v1_norma(), v1_norma()], 2)  # same codigo twice
    with pytest.raises(ValueError, match="unique code"):
        data.classified_page(Q4)
    replies["/normas-classificadas"] = {"totalElements": 1}
    data.st.cache_data.clear()
    with pytest.raises(ValueError, match="content"):
        data.classified_page(Q4)


# --- Excel: pages of 100 up to 5.000 rows (D5) -----------------------------------------------------------------------------
def paged_table(total):
    def reply(params):
        page, size = int(params["page"]), int(params["size"])
        rows = [v1_norma(i) for i in range(page * size, min(total, (page + 1) * size))]
        return page_of(rows, total, number=page, size=size)
    return reply


def test_export_reads_every_page_of_100_in_order(bff):
    calls, replies = bff
    replies["/normas-classificadas"] = paged_table(250)
    rows = data.classified_export(Q4, segment="varejo", sort_key="tipo", sort_dir="asc")
    assert [c[1]["page"] for c in calls] == ["0", "1", "2"]
    assert {c[1]["size"] for c in calls} == {"100"}
    assert all(c[1]["sort"] == ["tipo,asc"] and c[1]["segmento"] == "VAREJO" for c in calls)
    assert [r["code"] for r in rows] == [f"Resolução CMN {4800 + i}" for i in range(250)]


def test_export_of_exactly_5000_rows_takes_50_requests(bff):
    calls, replies = bff
    replies["/normas-classificadas"] = paged_table(5000)
    assert len(data.classified_export(Q4)) == 5000
    assert len(calls) == 50


def test_export_above_5000_rows_stops_after_the_first_page_with_the_limit_text(bff):
    calls, replies = bff
    replies["/normas-classificadas"] = paged_table(5001)
    with pytest.raises(data.ExportLimitError) as raised:
        data.classified_export(Q4)
    assert len(calls) == 1
    assert raised.value.text == "A tabela tem 5.001 linhas e o Excel aceita até 5.000. Refine os filtros para exportar."
    assert raised.value.text == api.EXPORT_LIMIT_TEXT.format(total="5.001")


def test_export_stops_when_the_table_shrinks_while_paging(bff):
    _, replies = bff
    replies["/normas-classificadas"] = lambda params: page_of([v1_norma(i) for i in range(100)] if params["page"] == "0" else [], 300, size=100)
    assert len(data.classified_export(Q4)) == 100


# --- E-mails ---------------------------------------------------------------------------------------------------------------
def v1_email(i=0, **patch):
    base = {"id": f"em-{i}", "dataEnvio": "2021-12-28T09:14:00-03:00", "assunto": "Sugestões", "segmento": "ATACADO", "destinatarios": 3,
            "normas": [{"codigo": "Resolução CMN 5.123", "orgao": "CMN", "tipo": "Resolução", "numero": "5.123", "tema": "Capital",
                        "classeSugerida": "APLICAVEL_PARCIALMENTE", "area": "Gestão de Capital", "diretoria": "Riscos"}]}
    return {**base, **patch}


def by_segment(*counts):
    return [{"segmento": sid, "quantidade": c} for sid, c in zip(("ATACADO", "CORPORATIVO", "PLATAFORMA", "VAREJO"), counts, strict=True)]


EMAILS_SUMMARY = {"dataReferencia": "2021-12-31", "granularidade": "MES", "inicio": "2021-10-01", "fim": "2021-12-31", "totalEmails": 6,
                  "totalNormas": 15, "normasDistintas": 9, "mediaNormasPorEmail": 2.5, "normasPorSegmento": by_segment(5, 4, 3, 3),
                  "periodos": [{"inicio": "2021-10-01", "fim": "2021-10-31", "emails": 2, "normasPorSegmento": by_segment(2, 1, 1, 1), "totalNormas": 5},
                               {"inicio": "2021-11-01", "fim": "2021-11-30", "emails": 0, "normasPorSegmento": by_segment(0, 0, 0, 0), "totalNormas": 0},
                               {"inicio": "2021-12-01", "fim": "2021-12-31", "emails": 4, "normasPorSegmento": by_segment(3, 3, 2, 2), "totalNormas": 10}]}


def test_email_adapter_maps_every_field():
    email = data.email_from_v1(v1_email())
    assert email == {"id": "em-0", "sentAt": "2021-12-28T09:14:00-03:00", "subject": "Sugestões", "segment": "atacado", "recipients": 3,
                     "normas": [{"code": "Resolução CMN 5.123", "orgao": "CMN", "tipo": "Resolução", "numero": "5.123", "title": "Capital",
                                 "suggestedClass": "Aplicável parcialmente", "area": "Gestão de Capital", "diretoria": "Riscos"}]}


def test_emails_summary_requests_the_summary_and_the_latest_five(bff):
    calls, replies = bff
    replies["/emails-sugestao/resumo"] = EMAILS_SUMMARY
    replies["/emails-sugestao"] = page_of([v1_email(i) for i in range(5)], 6, size=5)
    agg = data.emails_summary("Month", Q4, segment="atacado")
    assert calls == [
        ("/emails-sugestao/resumo", {"fim": "2021-12-31", "granularidade": "MES", "inicio": "2021-10-01", "segmento": "ATACADO"}),
        ("/emails-sugestao", {"fim": "2021-12-31", "inicio": "2021-10-01", "page": "0", "segmento": "ATACADO", "size": "5", "sort": ["dataEnvio,desc"]}),
    ]
    assert agg.subtitle == "Outubro a dezembro de 2021"
    assert [(b.label, b.emails, b.normas, b.total) for b in agg.buckets] == [
        ("Outubro", 2, [2, 1, 1, 1], 5), ("Novembro", 0, [0, 0, 0, 0], 0), ("Dezembro", 4, [3, 3, 2, 2], 10)]
    assert (agg.emails, agg.normas, agg.distinct_normas, agg.average_per_email, agg.segment_normas) == (6, 15, 9, 2.5, [5, 4, 3, 3])
    assert [e["id"] for e in agg.list] == [f"em-{i}" for i in range(5)]


@pytest.mark.parametrize("patch", [{"periodos": EMAILS_SUMMARY["periodos"][:2]}, {"mediaNormasPorEmail": -1}, {"totalEmails": 1.5},
                                   {"normasPorSegmento": [{"segmento": "OUTRO", "quantidade": 1}]}])
def test_emails_summary_rejects_broken_payloads(patch):
    with pytest.raises(ValueError):
        data.emails_aggregate_from_v1("Month", Q4, {**EMAILS_SUMMARY, **patch}, page_of([], 0))


def test_emails_of_the_page_still_go_through_validate_emails():
    broken = v1_email(normas=[{**v1_email()["normas"][0], "classeSugerida": "TALVEZ"}])
    with pytest.raises(ValueError, match="invalid norma"):
        data.emails_aggregate_from_v1("Month", Q4, EMAILS_SUMMARY, page_of([broken], 1))


def test_mock_emails_summary_is_the_local_aggregate():
    assert data.emails_summary("Month", Q4, "varejo") == data.aggregate_emails(data.emails(), "Month", Q4, "varejo")


# --- Cascade -------------------------------------------------------------------------------------------------------------------
def test_waterfall_adapter_maps_header_steps_and_kinds():
    response = {"periodo": "Outubro a dezembro de 2021", "moeda": "BRL", "escalaUnidade": 1000000, "etapas": [
        {"id": "gross-revenue", "rotulo": "Receita bruta", "tipo": "TOTAL", "partes": [{"rotulo": "Vendas", "valor": 50}]},
        {"id": "taxes", "rotulo": "Impostos", "tipo": "REDUCAO", "partes": [{"rotulo": "Impostos", "valor": 15}]}]}
    assert data.waterfall_from_v1(response) == {
        "period": "Outubro a dezembro de 2021", "currency": "BRL", "unitScale": 1000000, "steps": [
            {"id": "gross-revenue", "label": "Receita bruta", "kind": "total", "parts": [{"label": "Vendas", "value": 50}]},
            {"id": "taxes", "label": "Impostos", "kind": "decrease", "parts": [{"label": "Impostos", "value": 15}]}]}
    with pytest.raises(ValueError, match="tipo fora do contrato"):
        data.waterfall_from_v1({**response, "etapas": [{**response["etapas"][0], "tipo": "SUBTOTAL"}]})


# --- Mock mode is unchanged ---------------------------------------------------------------------------------------------------
def test_mock_mode_never_reaches_core_api(monkeypatch):
    monkeypatch.setattr(api, "get_json", lambda *a, **k: pytest.fail("no BFF call in mock mode"))
    assert not data.server_paging()
    data.segments()
    data.traffic("Month", Q4)
    data.classification_summary(Q4)
    data.emails_summary("Month", Q4)
    data.waterfall("Month", Q4)


def test_bff_mode_has_no_whole_lists(bff):
    assert data.server_paging()
    with pytest.raises(RuntimeError):
        data.classification()
    with pytest.raises(RuntimeError):
        data.emails()


# --- Per-user cache (E-014): the BFF answer is cached per caller, never across users ------------------------------------------
SEGMENTS_V1 = {"dataReferencia": "2021-12-31", "segmentos": [
    {"id": s, "nome": s.title(), "total": 10, "aClassificar": 2, "tendencia": [1, 2]} for s in ("ATACADO", "CORPORATIVO", "PLATAFORMA", "VAREJO")]}


@pytest.fixture
def caller(monkeypatch):
    """The forwarded identity seen by core.data (the gateway headers of the current session)."""
    headers = {"cookie": "SESSION=user-a; XSRF-TOKEN=t1", "x-user-id": "a"}
    monkeypatch.setattr(data.auth, "forward_headers", lambda: dict(headers))
    return headers


def test_two_identities_never_share_a_cached_answer(bff, caller):
    calls, replies = bff
    replies["/segmentos"] = SEGMENTS_V1
    data.segments()
    data.segments()
    assert len(calls) == 1  # same user: cached
    caller.update({"cookie": "SESSION=user-b", "x-user-id": "b"})
    data.segments()
    assert len(calls) == 2  # another user: asks the BFF with its own identity
    caller.update({"cookie": "SESSION=user-a; XSRF-TOKEN=t1", "x-user-id": "a"})
    data.segments()
    assert len(calls) == 2  # the first user's entry is still there


def test_a_401_for_another_user_is_never_answered_from_the_first_users_cache(bff, caller):
    calls, replies = bff
    replies["/segmentos"] = SEGMENTS_V1
    assert len(data.segments()) == 4
    caller.clear()
    caller.update({"authorization": "Bearer expired"})
    replies["/segmentos"] = lambda params: (_ for _ in ()).throw(api.ApiError("AUTH_REQUIRED", 401))
    with pytest.raises(api.ApiError) as raised:
        data.segments()
    assert raised.value.code == "AUTH_REQUIRED" and len(calls) == 2


def test_the_identity_key_is_a_hash_never_the_raw_values(caller):
    key = data.identity_key()
    assert len(key) == 64 and all(c in "0123456789abcdef" for c in key)
    assert "user-a" not in key and "SESSION" not in key
    caller["x-user-id"] = "b"
    assert data.identity_key() != key


# --- Series validated element by element (E-020) ------------------------------------------------------------------------------
@pytest.mark.parametrize("trend", [["1"], [1, -2], [1.5], [True], "12", {"a": 1}])
def test_segment_trend_with_an_invalid_element_is_refused(trend):
    response = {"dataReferencia": "2021-12-31", "segmentos": [{"id": "VAREJO", "nome": "Varejo", "total": 1, "aClassificar": 0, "tendencia": trend}]}
    with pytest.raises(ValueError):
        data.segments_from_v1(response)


@pytest.mark.parametrize("field, bad", [("classificadas", [1, "2", 3]), ("aClassificar", [0, None, 0]), ("classificadas", [1, -1, 3]),
                                        ("aClassificar", [0, 1.25, 0]), ("classificadas", "123")])
def test_traffic_with_an_invalid_point_is_refused(bff, field, bad):
    _, replies = bff
    segments = [{"segmento": sid, "nome": sid, "classificadas": [1, 2, 3], "aClassificar": [0, 1, 0]}
                for sid in ("ATACADO", "CORPORATIVO", "PLATAFORMA", "VAREJO")]
    segments[2][field] = bad
    replies["/normativos-recebidos"] = {"granularidade": "MES", "inicio": "2021-10-01", "fim": "2021-12-31", "pontos": ["a", "b", "c"],
                                        "segmentos": segments}
    with pytest.raises(ValueError):
        data.traffic("Month", Q4)
