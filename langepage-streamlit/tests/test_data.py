"""Ports of the landing specs: segment-cards.service, classification.model/-derive, emails.model/-derive,
waterfall.model, waterfall-derive (bit-for-bit golden values from the TypeScript) and waterfall-format."""
import copy
import itertools
from datetime import date, datetime

import pytest

from core import data
from core.data import (aggregate_classification, aggregate_emails, build_waterfall, derive_waterfall, filter_classified, format_currency,
                       format_share, noise, pt_br_key, sent_datetime, sent_day, validate_classification, validate_emails,
                       validate_segment_cards)
from core.period import DateRange, preset_range

YEAR = DateRange(date(2021, 1, 1), date(2021, 12, 31))
NB = " "


# --- Segment cards (segment-cards.service.spec.ts) ------------------------------------------------------------------------
def _cards(to_classify, total=50):
    return {"asOf": "2021-12-31", "segments": [{"id": "atacado", "label": "Atacado", "icon": "cil-truck", "total": total,
                                                 "toClassify": to_classify, "trend": [1, 2]}]}


def test_segment_cards_accepts_consistent_segments():
    assert len(validate_segment_cards(_cards(7))["segments"]) == 1
    assert validate_segment_cards(_cards(0, 0))["segments"][0]["toClassify"] == 0
    assert validate_segment_cards(_cards(3.0))  # JSON 3.0 is an integer for Number.isInteger


def test_segment_cards_rejects_to_classify_above_total():
    with pytest.raises(ValueError, match="maiores que o total"):
        validate_segment_cards(_cards(60))


@pytest.mark.parametrize("value", [-1, 2.5, None, True, "3"])
def test_segment_cards_rejects_invalid_counts(value):
    with pytest.raises(ValueError, match="Quantidades inválidas"):
        validate_segment_cards(_cards(value))


def test_segment_cards_rejects_empty_list():
    with pytest.raises(ValueError, match="Nenhum segmento"):
        validate_segment_cards({"asOf": "2021-12-31", "segments": []})


# --- Classification model (classification.model.spec.ts) -----------------------------------------------------------------
def _norma(**patch):
    base = {"code": "Resolução CMN 5.123", "classifiedAt": "2021-12-28", "segment": "atacado", "theme": "Requisitos de capital regulatório",
            "applicable": True, "orgao": "CMN", "tipo": "Resolução", "numero": "5.123", "area": "Gestão de Capital", "diretoria": "Riscos"}
    return {**base, **patch}


def test_validate_classification_accepts_a_valid_payload_unchanged():
    payload = {"asOf": "2021-12-31", "normas": [_norma(), _norma(code="Circular BCB 3.700", applicable=False)]}
    assert validate_classification(payload) is payload


@pytest.mark.parametrize(("payload", "message"), [
    ({"asOf": "2021-12-31"}, 'without "normas"'),
    ({"normas": [_norma(), _norma()]}, "unique code"),
    ({"normas": [_norma(classifiedAt="28/12/2021")]}, "invalid classifiedAt"),
    ({"normas": [_norma(classifiedAt="2021-13-01")]}, "invalid classifiedAt"),
    ({"normas": [_norma(segment="to-classify")]}, "unknown segment"),
    ({"normas": [_norma(theme="")]}, "invalid theme"),
    ({"normas": [_norma(applicable="sim")]}, "invalid theme or applicability"),
    ({"normas": [_norma(diretoria="")]}, "without orgao"),
])
def test_validate_classification_rejects(payload, message):
    with pytest.raises(ValueError, match=message):
        validate_classification(payload)


# --- Classification derive (classification-derive.spec.ts) ---------------------------------------------------------------
_counter = itertools.count(1)


def _classified(day, theme, applicable=True, segment="atacado"):
    return _norma(code=f"Resolução CMN {next(_counter)}", classifiedAt=day, theme=theme, applicable=applicable, segment=segment)


def test_filter_classified_keeps_period_segment_theme_and_class_in_order():
    normas = [_classified("2021-01-01", "A"), _classified("2021-06-01", "B", False), _classified("2021-12-31", "A", True, "varejo"),
              _classified("2022-01-01", "A")]
    assert len(filter_classified(normas, YEAR)) == 3
    assert [n["classifiedAt"] for n in filter_classified(normas, YEAR, theme="A")] == ["2021-01-01", "2021-12-31"]
    assert [n["theme"] for n in filter_classified(normas, YEAR, applicable=False)] == ["B"]
    assert len(filter_classified(normas, YEAR, segment="varejo")) == 1


def test_aggregate_splits_applicable_and_not_applicable_in_the_period():
    normas = [_classified("2021-03-01", "A"), _classified("2021-03-02", "A", False), _classified("2021-03-03", "B"),
              _classified("2020-12-31", "A")]
    agg = aggregate_classification(normas, YEAR)
    assert (agg.total, agg.applicable, agg.not_applicable) == (3, 2, 1)
    assert agg.applicable_share == pytest.approx(2 / 3)


def test_aggregate_includes_both_ends():
    assert aggregate_classification([_classified("2021-01-01", "A"), _classified("2021-12-31", "A")], YEAR).total == 2


def test_aggregate_ranks_applicable_themes_with_shares_and_widths():
    normas = [_classified("2021-05-01", "B"), _classified("2021-05-02", "A"), _classified("2021-05-03", "A"),
              _classified("2021-05-04", "C", False)]
    agg = aggregate_classification(normas, YEAR)
    assert [(t.label, t.count) for t in agg.themes] == [("A", 2), ("B", 1)]
    assert agg.themes[1].share == pytest.approx(1 / 3)
    assert agg.themes[0].width == 1
    assert agg.themes[1].width == 0.5
    assert agg.others is None


def test_aggregate_groups_the_tail_but_never_a_single_theme():
    themes = ["A", "A", "A", "B", "B", "C", "D"]
    normas = [_classified(f"2021-06-{i + 1:02d}", theme) for i, theme in enumerate(themes)]
    grouped = aggregate_classification(normas, YEAR, top=2)
    assert [t.label for t in grouped.themes] == ["A", "B"]
    assert (grouped.others.label, grouped.others.count, grouped.others.grouped, grouped.others.width) == ("Outros temas", 2, 2, 0)
    one_left = aggregate_classification(normas, YEAR, top=3)
    assert len(one_left.themes) == 4
    assert one_left.others is None


def test_aggregate_keeps_only_the_filtered_segment():
    normas = [_classified("2021-07-01", "A", True, "atacado"), _classified("2021-07-02", "A", True, "varejo")]
    assert aggregate_classification(normas, YEAR, segment="varejo").total == 1


def test_aggregate_one_theme_and_not_applicable_ranking():
    normas = [_classified("2021-08-01", "A"), _classified("2021-08-02", "A", False), _classified("2021-08-03", "B", False),
              _classified("2021-08-04", "B", False)]
    theme_a = aggregate_classification(normas, YEAR, theme="A")
    assert [theme_a.total, theme_a.applicable, theme_a.not_applicable] == [2, 1, 1]
    not_applicable = aggregate_classification(normas, YEAR, themes_of=False)
    assert not_applicable.themes_total == 3
    assert [(t.label, t.count) for t in not_applicable.themes] == [("B", 2), ("A", 1)]
    assert not_applicable.themes[0].share == pytest.approx(2 / 3)


def test_aggregate_zeros_for_an_empty_period():
    agg = aggregate_classification([], YEAR)
    assert (agg.total, agg.applicable_share, agg.themes, agg.others) == (0, 0, [], None)


def test_ties_follow_pt_br_collation_like_locale_compare():
    # Order produced by ['…'].sort((a, b) => a.localeCompare(b, 'pt-BR')) in Node (ICU).
    expected = ["acao", "ação", "agua", "Agua", "Água", "B", "Zeta"]
    assert sorted(["Zeta", "Água", "agua", "B", "ação", "Agua", "acao"], key=pt_br_key) == expected
    normas = [_classified("2021-02-01", name) for name in ["Zeta", "Água", "abc", "Ética"]]
    assert [t.label for t in aggregate_classification(normas, YEAR).themes] == ["abc", "Água", "Ética", "Zeta"]


# --- E-mails model (emails.model.spec.ts) ---------------------------------------------------------------------------------
def _email(**patch):
    base = {"id": "em-1", "sentAt": "2021-12-28T09:14:00-03:00", "subject": "Sugestões de classificação — Atacado", "segment": "atacado",
            "recipients": 3, "normas": [{"code": "Resolução CMN 5.123", "orgao": "CMN", "tipo": "Resolução", "numero": "5.123", "title": "Capital",
                                         "suggestedClass": "Aplicável", "area": "Gestão de Capital", "diretoria": "Riscos"}]}
    return {**base, **patch}


def test_validate_emails_accepts_valid_and_empty_payloads():
    payload = {"asOf": "2021-12-31", "emails": [_email(), _email(id="em-2", segment="varejo")]}
    assert validate_emails(payload) is payload
    assert validate_emails({"asOf": "2021-12-31", "emails": []})["emails"] == []


@pytest.mark.parametrize(("payload", "message"), [
    ({"asOf": "2021-12-31"}, 'without "emails"'),
    ({"emails": [_email(), _email()]}, "unique id"),
    ({"emails": [_email(id="")]}, "unique id"),
    ({"emails": [_email(sentAt="28/12/2021")]}, "invalid sentAt"),
    ({"emails": [_email(sentAt="2021-13-45T09:14:00-03:00")]}, "invalid sentAt"),
    ({"emails": [_email(segment="outro")]}, "unknown segment"),
    ({"emails": [_email(segment="to-classify")]}, "unknown segment"),
    ({"emails": [_email(recipients=-1)]}, "invalid recipients"),
    ({"emails": [_email(normas=[])]}, "no normas"),
    ({"emails": [_email(normas=[{"code": "X", "title": "Y", "suggestedClass": "Talvez"}])]}, "invalid norma"),
    ({"emails": [_email(normas=[{**_email()["normas"][0], "area": ""}])]}, "invalid norma"),
])
def test_validate_emails_rejects(payload, message):
    with pytest.raises(ValueError, match=message):
        validate_emails(payload)


# --- E-mails derive (emails-derive.spec.ts) -------------------------------------------------------------------------------
_email_counter = itertools.count(1)


def _sent(day, segment, codes, time="10:00"):
    norma = {"orgao": "CMN", "tipo": "Resolução", "title": "Título", "suggestedClass": "Aplicável", "area": "Área", "diretoria": "Diretoria"}
    return {"id": f"em-{next(_email_counter)}", "sentAt": f"{day}T{time}:00-03:00", "subject": f"Sugestões — {segment}", "segment": segment,
            "recipients": 2, "normas": [{**norma, "code": c, "numero": c} for c in codes]}


EMAILS = [
    _sent("2021-01-05", "atacado", ["A1", "A2"]),
    _sent("2021-01-20", "varejo", ["V1"]),
    _sent("2021-03-10", "atacado", ["A1", "A3", "A4"]),
    _sent("2021-12-31", "plataforma", ["P1"], "23:59"),
    _sent("2020-12-31", "atacado", ["OLD"]),
]


def test_emails_group_by_month_with_empty_buckets():
    agg = aggregate_emails(EMAILS, "Month", YEAR)
    assert len(agg.buckets) == 12
    assert agg.subtitle == "Janeiro a dezembro de 2021"
    first = agg.buckets[0]
    assert (first.label, first.emails, first.normas, first.total) == ("Janeiro", 2, [2, 0, 0, 1], 3)
    assert agg.buckets[1].total == 0
    assert agg.buckets[2].normas == [3, 0, 0, 0]
    assert agg.buckets[11].normas == [0, 0, 1, 0]


def test_emails_outside_the_range_are_ignored():
    agg = aggregate_emails(EMAILS, "Month", YEAR)
    assert agg.emails == 4
    assert not any(e["sentAt"].startswith("2020") for e in agg.list)


def test_emails_totals():
    agg = aggregate_emails(EMAILS, "Month", YEAR)
    assert agg.normas == 7
    assert agg.distinct_normas == 6  # A1 was sent twice
    assert agg.average_per_email == pytest.approx(7 / 4)
    assert agg.segment_normas == [5, 0, 1, 1]
    assert sum(b.total for b in agg.buckets) == agg.normas
    assert sum(b.emails for b in agg.buckets) == agg.emails


def test_emails_keep_the_last_day_whatever_the_time():
    agg = aggregate_emails(EMAILS, "Day", DateRange(date(2021, 12, 30), date(2021, 12, 31)))
    assert [b.emails for b in agg.buckets] == [0, 1]


def test_emails_group_by_day_and_year():
    days = aggregate_emails(EMAILS, "Day", DateRange(date(2021, 1, 3), date(2021, 1, 9)))
    assert len(days.buckets) == 7
    assert days.buckets[2].emails == 1
    assert days.emails == 1
    years = aggregate_emails(EMAILS, "Year", DateRange(date(2020, 1, 1), date(2021, 12, 31)))
    assert [(b.label, b.emails) for b in years.buckets] == [("2020", 1), ("2021", 4)]


def test_emails_custom_range():
    agg = aggregate_emails(EMAILS, "Month", DateRange(date(2021, 3, 1), date(2021, 6, 30)))
    assert [b.label for b in agg.buckets] == ["Março", "Abril", "Maio", "Junho"]
    assert agg.emails == 1


def test_emails_filter_by_segment():
    agg = aggregate_emails(EMAILS, "Month", YEAR, "atacado")
    assert (agg.emails, agg.normas, agg.segment_normas) == (2, 5, [5, 0, 0, 0])
    assert all(e["segment"] == "atacado" for e in agg.list)


def test_emails_newest_first():
    agg = aggregate_emails(EMAILS, "Month", YEAR)
    assert [e["sentAt"][:10] for e in agg.list] == ["2021-12-31", "2021-03-10", "2021-01-20", "2021-01-05"]


def test_emails_zeros():
    none = aggregate_emails([], "Month", preset_range("Month", 3))
    assert (none.emails, none.normas, none.average_per_email, len(none.buckets)) == (0, 0, 0, 3)
    assert aggregate_emails(EMAILS, "Month", DateRange(date(2021, 7, 1), date(2021, 8, 31))).emails == 0


def test_sent_helpers_use_the_date_and_time_as_sent():
    item = _sent("2021-06-30", "varejo", ["V1"], "23:30")
    assert sent_day(item) == date(2021, 6, 30)
    assert sent_datetime(item) == datetime(2021, 6, 30, 23, 30)


# --- Waterfall model (waterfall.model.spec.ts) ---------------------------------------------------------------------------
STEPS = [
    {"id": "gross", "label": "Receita bruta", "kind": "total", "parts": [{"label": "A", "value": 15}, {"label": "B", "value": 10}, {"label": "C", "value": 25}]},
    {"id": "deductions", "label": "Deduções", "kind": "decrease", "parts": [{"label": "Impostos", "value": 15}, {"label": "Devoluções", "value": 5}]},
    {"id": "costs", "label": "Custos", "kind": "decrease", "parts": [{"label": "Matéria-prima", "value": 5}, {"label": "Logística", "value": 3}]},
    {"id": "result", "label": "Resultado", "kind": "total", "parts": [{"label": "Operacional", "value": 22}]},
]


def test_waterfall_totals_stack_upward_from_zero():
    model = build_waterfall(STEPS)
    assert [[s.low, s.high] for s in model.columns[0].segments] == [[0, 15], [15, 25], [25, 50]]
    assert model.columns[0].end == 50
    assert model.base == 50


def test_waterfall_decreases_hang_from_the_running_level():
    model = build_waterfall(STEPS)
    assert [[s.low, s.high] for s in model.columns[1].segments] == [[35, 50], [30, 35]]
    assert (model.columns[1].start, model.columns[1].end, model.columns[2].end) == (50, 30, 22)


def test_waterfall_result_is_the_last_total():
    model = build_waterfall(STEPS)
    assert model.result == 22
    assert len(model.segments) == 8


@pytest.mark.parametrize("value", [-1, float("nan"), float("inf"), "1", None])
def test_waterfall_rejects_invalid_values(value):
    with pytest.raises(ValueError, match="Valor inválido"):
        build_waterfall([{"id": "x", "label": "X", "kind": "total", "parts": [{"label": "Y", "value": value}]}])


def test_waterfall_rejects_too_many_parts_and_empty_list():
    parts = [{"label": f"P{v}", "value": v} for v in [1, 2, 3, 4]]
    with pytest.raises(ValueError, match="de 1 a 3"):
        build_waterfall([{"id": "x", "label": "X", "kind": "total", "parts": parts}])
    with pytest.raises(ValueError, match="sem etapas"):
        build_waterfall([])


# --- Waterfall format ----------------------------------------------------------------------------------------------------
def test_format_currency_compact_brl_with_typographic_minus():
    assert format_currency(15, 1_000_000, "BRL").replace(NB, " ") == "R$ 15 mi"
    assert format_currency(-15, 1_000_000, "BRL").replace(NB, " ") == "−R$ 15 mi"
    assert format_currency(15, 1_000_000) == f"R${NB}15{NB}mi"  # same no-break spaces as Intl


@pytest.mark.parametrize(("amount", "expected"), [  # values printed by Node's Intl.NumberFormat('pt-BR', compact BRL)
    (15e6, "R$ 15 mi"), (1.5e6, "R$ 1,5 mi"), (4e5, "R$ 400 mil"), (999, "R$ 999"), (999.95, "R$ 1 mil"),
    (999.94, "R$ 999,9"), (1234, "R$ 1,2 mil"), (0, "R$ 0"), (0.25, "R$ 0,3"), (0.04, "R$ 0"), (1e9, "R$ 1 bi"),
    (2.25e9, "R$ 2,3 bi"), (1.2e12, "R$ 1,2 tri"), (1e15, "R$ 1000 tri"), (12345e12, "R$ 12.345 tri"),
    (999950, "R$ 1 mi"), (15.25e6, "R$ 15,3 mi"), (15.35e6, "R$ 15,4 mi"),
])
def test_format_currency_matches_intl(amount, expected):
    assert format_currency(amount, 1).replace(NB, " ") == expected


def test_format_currency_other_currencies():
    assert format_currency(15, 1e6, "USD").replace(NB, " ") == "US$ 15 mi"
    assert format_currency(15, 1e6, "EUR").replace(NB, " ") == "€ 15 mi"


def test_format_currency_escapes_an_unknown_bff_currency_code():
    # waterfall-derive puts this text straight into st.html (scalation.py); a BFF-controlled "currency" with
    # markup must come back escaped, not run through st.html unescaped.
    text = format_currency(15, 1e6, "<img src=x onerror=alert(1)>")
    assert "<img" not in text
    assert "&lt;img" in text


def test_format_share():
    assert format_share(15, 50) == "30%"
    assert format_share(-5, 50) == "−10%"
    assert format_share(5, 0) == "—"
    assert format_share(0.12345, 1) == "12,3%"
    assert format_share(12.345, 1) == "1.234,5%"
    assert format_share(0.0005, 1) == "0,1%"


# --- Waterfall derive (waterfall-derive.spec.ts + golden values from the TypeScript) --------------------------------------
BASE = {
    "period": "Janeiro a dezembro de 2021", "baseYear": 2021, "currency": "BRL", "unitScale": 1000000,
    "steps": [
        {"id": "gross", "label": "Receita bruta", "kind": "total", "parts": [{"label": "A", "value": 15}, {"label": "B", "value": 10}, {"label": "C", "value": 25}]},
        {"id": "deductions", "label": "Deduções", "kind": "decrease", "parts": [{"label": "Impostos", "value": 15}, {"label": "Devoluções", "value": 5}]},
        {"id": "costs", "label": "Custos", "kind": "decrease", "parts": [{"label": "Matéria-prima", "value": 5}, {"label": "Logística", "value": 3}]},
        {"id": "expenses", "label": "Despesas", "kind": "decrease", "parts": [{"label": "Pessoal", "value": 8}, {"label": "Marketing", "value": 4}]},
        {"id": "result", "label": "Resultado", "kind": "total", "parts": [{"label": "Operacional", "value": 6}, {"label": "Financeiro", "value": 4}]},
    ],
}
TIGHT = {**BASE, "steps": [
    {"id": "gross", "label": "Receita bruta", "kind": "total", "parts": [{"label": "A", "value": 50}]},
    {"id": "costs", "label": "Custos", "kind": "decrease", "parts": [{"label": "X", "value": 30}, {"label": "Y", "value": 19.5}]},
    {"id": "result", "label": "Resultado", "kind": "total", "parts": [{"label": "Operacional", "value": 0.5}]},
]}


def _sum(step):
    total = 0
    for part in step["parts"]:
        total += part["value"]
    return total


def test_derive_returns_the_base_for_the_base_year():
    derived = derive_waterfall(BASE, "Month", preset_range("Month", 12))
    assert derived["period"] == "Janeiro a dezembro de 2021"
    assert derived["steps"] == BASE["steps"]
    assert derived["steps"] is not BASE["steps"]
    assert derived["steps"][0]["parts"][0] is not BASE["steps"][0]["parts"][0]
    assert derive_waterfall(BASE, "Year", preset_range("Year", 1))["steps"][0]["parts"][0]["value"] == 15


def test_derive_scales_with_the_share_of_a_year():
    quarter = derive_waterfall(BASE, "Month", preset_range("Month", 3))
    assert quarter["period"] == "Outubro a dezembro de 2021"
    assert 50 * 0.25 * 0.8 < _sum(quarter["steps"][0]) < 50 * 0.25 * 1.2
    week = derive_waterfall(BASE, "Day", preset_range("Day", 7))
    assert round(_sum(week["steps"][0])) == round(50 * 7 / 365)  # toBeCloseTo(x, 0)
    five_years = derive_waterfall(BASE, "Year", preset_range("Year", 5))
    assert _sum(five_years["steps"][0]) > 50 * 5 * 0.8
    assert five_years["period"] == "2017 a 2021"


def test_derive_keeps_the_result_coherent():
    derived = derive_waterfall(BASE, "Month", preset_range("Month", 6))
    gross = _sum(derived["steps"][0])
    decreases = sum(_sum(s) for s in derived["steps"] if s["kind"] == "decrease")
    result = derived["steps"][4]
    assert _sum(result) == pytest.approx(gross - decreases, abs=5e-7)
    assert [p["label"] for p in result["parts"]] == ["Operacional", "Financeiro"]
    assert result["parts"][0]["value"] / _sum(result) == pytest.approx(0.6, abs=0.05)
    model = build_waterfall(derived["steps"])
    assert model.result == pytest.approx(model.columns[3].end, abs=5e-7)


def test_derive_is_deterministic_and_differs_between_ranges():
    bounds = DateRange(date(2021, 5, 10), date(2021, 6, 20))
    first = derive_waterfall(BASE, "Day", bounds)
    assert derive_waterfall(BASE, "Day", bounds) == first
    other = derive_waterfall(BASE, "Day", DateRange(date(2021, 5, 11), date(2021, 6, 21)))
    assert other["steps"][0]["parts"][0]["value"] != first["steps"][0]["parts"][0]["value"]
    assert noise("a", "b") == noise("a", "b")
    assert abs(noise("a", "b")) <= 1


def test_derive_never_lets_the_decreases_swallow_the_result():
    for count in range(1, 31):
        derived = derive_waterfall(TIGHT, "Day", preset_range("Day", count))
        gross, result = _sum(derived["steps"][0]), _sum(derived["steps"][2])
        assert result >= 0
        assert result >= gross * 0.05 - 0.001
        build_waterfall(derived["steps"])


def test_derive_does_not_mutate_the_base():
    before = copy.deepcopy(TIGHT)
    derive_waterfall(TIGHT, "Day", preset_range("Day", 3))
    assert TIGHT == before


@pytest.mark.parametrize(("seed", "key", "expected"), [  # noise() printed by Node from waterfall-derive.ts
    ("a", "b", -0.4791079252026975),
    ("Month|2021-10-01|2021-12-31", "activity", 0.14186296705156565),
    ("x", "Matéria-prima", 0.7628391687758267),
    ("", "", -0.702741495333612),
    ("Day|2021-12-25|2021-12-31", "gross-revenue/Produto A", -0.41259149787947536),
])
def test_noise_is_bit_for_bit_the_typescript(seed, key, expected):
    assert noise(seed, key) == expected


# deriveWaterfall output printed by Node from the TypeScript sources (scalation/waterfall/waterfall-derive.ts) for the
# mock base (data/dashboard-waterfall.json), the spec BASE and the spec TIGHT base. Compared with ==, not approx.
GOLDEN = [
    ("mock", "Month", "2021-10-01", "2021-12-31", "Outubro a dezembro de 2021", [[3.914,2.605,6.516],[3.986,1.314],[1.242,0.772],[1.922,1.046],[1.652,1.101]]),
    ("mock", "Month", "2021-07-01", "2021-12-31", "Julho a dezembro de 2021", [[6.906,4.595,11.494],[7.385,2.382],[2.552,1.597],[3.856,1.882],[2.005,1.336]]),
    ("mock", "Day", "2021-12-25", "2021-12-31", "25 a 31 de dezembro de 2021", [[0.286,0.19,0.476],[0.301,0.094],[0.091,0.062],[0.154,0.073],[0.106,0.071]]),
    ("mock", "Day", "2021-12-02", "2021-12-31", "2 a 31 de dezembro de 2021", [[1.298,0.867,2.165],[1.269,0.435],[0.449,0.279],[0.665,0.353],[0.528,0.352]]),
    ("mock", "Year", "2017-01-01", "2021-12-31", "2017 a 2021", [[69.655,46.348,115.943],[66.023,24.363],[22.253,13.298],[40.684,18.639],[28.012,18.674]]),
    ("mock", "Day", "2021-05-10", "2021-06-20", "10 de maio a 20 de junho de 2021", [[1.606,1.073,2.68],[1.521,0.519],[0.572,0.318],[0.921,0.461],[0.628,0.419]]),
    ("spec", "Month", "2021-07-01", "2021-12-31", "Julho a dezembro de 2021", [[7.363,4.9,12.257],[7.385,2.382],[2.552,1.597],[3.856,1.882],[2.92,1.946]]),
    ("spec", "Day", "2021-05-10", "2021-06-20", "10 de maio a 20 de junho de 2021", [[1.665,1.112,2.778],[1.521,0.519],[0.572,0.318],[0.921,0.461],[0.746,0.497]]),
    ("spec", "Day", "2021-05-11", "2021-06-21", "11 de maio a 21 de junho de 2021", [[1.646,1.097,2.74],[1.694,0.501],[0.524,0.321],[0.779,0.39],[0.764,0.51]]),
    ("tight", "Day", "2021-12-31", "2021-12-31", "31 de dezembro de 2021", [[0.145],[0.083,0.054],[0.008]]),
    ("tight", "Day", "2021-12-30", "2021-12-31", "30 a 31 de dezembro de 2021", [[0.274],[0.157,0.102],[0.015]]),
    ("tight", "Day", "2021-12-29", "2021-12-31", "29 a 31 de dezembro de 2021", [[0.441],[0.252,0.164],[0.025]]),
    ("tight", "Day", "2021-12-28", "2021-12-31", "28 a 31 de dezembro de 2021", [[0.615],[0.316,0.205],[0.094]]),
    ("tight", "Day", "2021-12-27", "2021-12-31", "27 a 31 de dezembro de 2021", [[0.675],[0.388,0.252],[0.035]]),
    ("tight", "Day", "2021-12-26", "2021-12-31", "26 a 31 de dezembro de 2021", [[0.885],[0.51,0.33],[0.045]]),
    ("tight", "Day", "2021-12-25", "2021-12-31", "25 a 31 de dezembro de 2021", [[0.929],[0.534,0.347],[0.048]]),
    ("tight", "Day", "2021-12-24", "2021-12-31", "24 a 31 de dezembro de 2021", [[1.123],[0.646,0.42],[0.057]]),
    ("tight", "Day", "2021-12-23", "2021-12-31", "23 a 31 de dezembro de 2021", [[1.126],[0.648,0.421],[0.057]]),
    ("tight", "Day", "2021-12-22", "2021-12-31", "22 a 31 de dezembro de 2021", [[1.515],[0.872,0.566],[0.077]]),
    ("tight", "Day", "2021-12-21", "2021-12-31", "21 a 31 de dezembro de 2021", [[1.553],[0.949,0.525],[0.079]]),
    ("tight", "Day", "2021-12-20", "2021-12-31", "20 a 31 de dezembro de 2021", [[1.725],[0.993,0.645],[0.087]]),
    ("tight", "Day", "2021-12-19", "2021-12-31", "19 a 31 de dezembro de 2021", [[2.038],[1.093,0.71],[0.235]]),
    ("tight", "Day", "2021-12-18", "2021-12-31", "18 a 31 de dezembro de 2021", [[1.936],[1.06,0.689],[0.187]]),
    ("tight", "Day", "2021-12-17", "2021-12-31", "17 a 31 de dezembro de 2021", [[1.768],[1.018,0.661],[0.089]]),
    ("tight", "Day", "2021-12-16", "2021-12-31", "16 a 31 de dezembro de 2021", [[1.94],[1.116,0.726],[0.098]]),
    ("tight", "Day", "2021-12-15", "2021-12-31", "15 a 31 de dezembro de 2021", [[2.609],[1.448,0.94],[0.221]]),
    ("tight", "Day", "2021-12-14", "2021-12-31", "14 a 31 de dezembro de 2021", [[2.645],[1.497,0.974],[0.174]]),
    ("tight", "Day", "2021-12-13", "2021-12-31", "13 a 31 de dezembro de 2021", [[2.584],[1.346,0.874],[0.364]]),
    ("tight", "Day", "2021-12-12", "2021-12-31", "12 a 31 de dezembro de 2021", [[2.833],[1.488,0.968],[0.377]]),
    ("tight", "Day", "2021-12-11", "2021-12-31", "11 a 31 de dezembro de 2021", [[2.678],[1.499,0.974],[0.205]]),
    ("tight", "Day", "2021-12-10", "2021-12-31", "10 a 31 de dezembro de 2021", [[2.981],[1.621,1.054],[0.306]]),
    ("tight", "Day", "2021-12-09", "2021-12-31", "9 a 31 de dezembro de 2021", [[3.159],[1.707,1.11],[0.342]]),
    ("tight", "Day", "2021-12-08", "2021-12-31", "8 a 31 de dezembro de 2021", [[3.142],[1.809,1.175],[0.158]]),
    ("tight", "Day", "2021-12-07", "2021-12-31", "7 a 31 de dezembro de 2021", [[2.962],[1.704,1.109],[0.149]]),
    ("tight", "Day", "2021-12-06", "2021-12-31", "6 a 31 de dezembro de 2021", [[3.369],[1.94,1.26],[0.169]]),
    ("tight", "Day", "2021-12-05", "2021-12-31", "5 a 31 de dezembro de 2021", [[3.858],[2.191,1.425],[0.242]]),
    ("tight", "Day", "2021-12-04", "2021-12-31", "4 a 31 de dezembro de 2021", [[3.609],[2.078,1.35],[0.181]]),
    ("tight", "Day", "2021-12-03", "2021-12-31", "3 a 31 de dezembro de 2021", [[4.534],[2.478,1.612],[0.444]]),
    ("tight", "Day", "2021-12-02", "2021-12-31", "2 a 31 de dezembro de 2021", [[4.517],[2.459,1.597],[0.461]]),
]


@pytest.mark.parametrize(("base_name", "period", "start", "end", "subtitle", "values"), GOLDEN)
def test_derive_is_bit_for_bit_the_typescript(base_name, period, start, end, subtitle, values):
    base = {"mock": data.load_json("dashboard-waterfall.json"), "spec": BASE, "tight": TIGHT}[base_name]
    derived = derive_waterfall(base, period, DateRange(date.fromisoformat(start), date.fromisoformat(end)))
    assert derived["period"] == subtitle
    assert [[p["value"] for p in step["parts"]] for step in derived["steps"]] == values


# --- Mock vs BFF switch ----------------------------------------------------------------------------------------------------
def test_mock_mode_reads_data_files_and_validates():
    assert [s["id"] for s in data.segments()] == ["atacado", "corporativo", "plataforma", "varejo"]
    assert len(data.classification()) > 0
    assert len(data.emails()) > 0
    wf = data.waterfall("Month", preset_range("Month", 12))
    assert wf["period"] == "Janeiro a dezembro de 2021"


@pytest.fixture
def bff(monkeypatch):
    calls = []
    replies = {}
    monkeypatch.setattr(data, "use_mock_data", lambda: False)

    def fake_get_json(path, params=None):
        calls.append((path, params))
        return copy.deepcopy(replies[path])

    monkeypatch.setattr(data.api, "get_json", fake_get_json)
    return calls, replies


# Contract v1 payloads (ADR-009): the same data as the internal fixtures above, with the v1 names.
def _v1_segments():
    cards = data.load_json("dashboard-segments.json")
    return {"dataReferencia": cards["asOf"], "segmentos": [
        {"id": c["id"].upper(), "nome": c["label"], "total": c["total"], "aClassificar": c["toClassify"], "tendencia": c["trend"]}
        for c in cards["segments"]]}


def _v1_steps(steps):
    kinds = {"total": "TOTAL", "decrease": "REDUCAO"}
    return [{"id": st["id"], "rotulo": st["label"], "tipo": kinds[st["kind"]], "partes": [{"rotulo": p["label"], "valor": p["value"]} for p in st["parts"]]}
            for st in steps]


def _v1_cascade(header):
    names = {"currency": "moeda", "unitScale": "escalaUnidade", "period": "periodo"}
    return {**{names[k]: v for k, v in header.items()}, "etapas": _v1_steps(STEPS)}


def test_bff_mode_calls_the_v1_endpoints(bff):
    calls, replies = bff
    replies["/segmentos"] = _v1_segments()
    replies["/cascatas-resultado"] = _v1_cascade({"currency": "BRL", "unitScale": 1e6})
    bounds = preset_range("Month", 3)
    assert len(data.segments(bounds)) == 4
    wf = data.waterfall("Month", bounds)
    assert wf["period"] == "Outubro a dezembro de 2021"  # filled in when the BFF does not send it
    assert wf["steps"] == STEPS  # no derivation on real data
    assert calls == [
        ("/segmentos", {}),
        ("/cascatas-resultado", {"fim": "2021-12-31", "granularidade": "MES", "inicio": "2021-10-01"}),
    ]


def test_bff_mode_still_validates(bff):
    _, replies = bff
    replies["/segmentos"] = {"dataReferencia": "2021-12-31", "segmentos": []}
    with pytest.raises(ValueError, match="Nenhum segmento"):
        data.segments()


def test_bff_traffic_is_aligned_by_segment_id(bff):
    _, replies = bff
    segments = [{"segmento": sid.upper(), "nome": sid, "classificadas": [i, i + 1, i + 2], "aClassificar": [1, 2, 3]}
                for i, sid in enumerate(["varejo", "plataforma", "corporativo", "atacado"])]
    replies["/normativos-recebidos"] = {"granularidade": "MES", "inicio": "2021-10-01", "fim": "2021-12-31",
                                        "pontos": ["2021-10", "2021-11", "2021-12"], "segmentos": segments}
    result = data.traffic("Month", preset_range("Month", 3))
    assert result.labels == ["Outubro", "Novembro", "Dezembro"]
    assert result.values["atacado"] == [3, 4, 5]
    assert result.values["varejo"] == [0, 1, 2]
    replies["/normativos-recebidos"]["segmentos"] = segments[:3]
    data.st.cache_data.clear()
    with pytest.raises(ValueError, match="sem o segmento atacado"):
        data.traffic("Month", preset_range("Month", 3))


def test_bff_responses_are_cached(bff):
    calls, replies = bff
    replies["/segmentos"] = _v1_segments()
    data.segments()
    data.segments()
    assert len(calls) == 1


# --- Cascade header from the BFF (E-009) -------------------------------------------------------------------------------------
@pytest.mark.parametrize("header, message", [
    ({"unitScale": 1e6}, "moeda"),
    ({"currency": "BRL"}, "escala"),
    ({"currency": "BRL", "unitScale": "1000000"}, "escala"),
    ({"currency": "BRL", "unitScale": True}, "escala"),
    ({"currency": "BRL", "unitScale": 0}, "escala"),
    ({"currency": "BRL", "unitScale": float("inf")}, "escala"),
    ({"currency": "brl", "unitScale": 1e6}, "moeda"),
    ({"currency": "<img src=x>", "unitScale": 1e6}, "moeda"),
    ({"currency": 986, "unitScale": 1e6}, "moeda"),
])
def test_bff_cascade_without_currency_code_or_numeric_unit_scale_is_rejected(bff, header, message):
    _, replies = bff
    replies["/cascatas-resultado"] = _v1_cascade(header)
    with pytest.raises(ValueError, match=message):
        data.waterfall("Month", preset_range("Month", 3))


def test_validate_waterfall_accepts_the_mock_header():
    assert data.validate_waterfall(data.load_json("dashboard-waterfall.json"))["currency"] == "BRL"
