"""F9 fidelity fixes: deferred rerun and narrow viewport (core.compat), required chips and brand icons (core.ui), chart
details (core.charts): dashed-series hover name, horizontal ticks, waterfall text and the Início area fill."""
from datetime import date

from streamlit.testing.v1 import AppTest

from core import charts, ui
from core.data import build_waterfall, traffic, waterfall
from core.period import default_selection
from core.tokens import LIGHT


def _rerun_script():
    import streamlit as st

    from core import compat

    st.session_state["runs"] = st.session_state.get("runs", 0) + 1
    if st.session_state["runs"] == 1:
        compat.request_rerun()
    st.text(f"footer {st.session_state['runs']}")
    compat.flush_rerun()


def test_request_rerun_reruns_once_after_the_whole_script_ran():
    at = AppTest.from_function(_rerun_script).run()
    assert not at.exception
    assert at.session_state["runs"] == 2
    assert [t.value for t in at.text] == ["footer 2"]


def _narrow_script():
    import streamlit as st

    from core import compat

    st.text(str(compat.viewport_narrow()))


def test_viewport_narrow_follows_the_probe_state():
    at = AppTest.from_function(_narrow_script)
    at.run()
    assert at.text[0].value == "False"  # until the probe answers
    at.session_state["_brand_theme"] = {"base": "light", "mode": "light", "narrow": True}
    at.run()
    assert at.text[0].value == "True"


def _chip_script():
    import streamlit as st

    from core import ui

    ui._init_choice("view", "chart")  # what chip_filter / segmented run before drawing the widget
    st.text(str(st.session_state["view"]))


def test_required_chip_comes_back_when_the_widget_returns_empty():
    at = AppTest.from_function(_chip_script).run()
    assert at.text[0].value == "chart"
    at.session_state["view"] = at.session_state["view-prev"] = "table"  # a click (required_choice keeps -prev)
    at.run()
    assert at.text[0].value == "table"  # a real choice is kept
    at.session_state["view"] = None  # what an interrupted first run leaves behind
    at.run()
    assert at.text[0].value == "table"  # back to the last choice, never empty


def test_brand_icons_resolve_in_both_spellings():
    assert ui._icon_file("cibGoogle").name == "cib-google.svg"
    assert ui._icon_file("cib-linkedin").exists()
    assert ui._icon_file("cilUserFemale").exists()


def test_dashed_series_hover_names_the_focused_segment():
    sel = default_selection("Month")
    data = traffic(sel.period, sel.bounds)
    names = [tr.hovertemplate for tr in charts.traffic_chart(LIGHT, data, None, "atacado", "#fff").data]
    assert names[-1].startswith("Normas a Classificar · Atacado:")
    plain = [tr.hovertemplate for tr in charts.traffic_chart(LIGHT, data, None, None, "#fff").data]
    assert plain[-1].startswith("Normas a Classificar:")
    highlighted = [tr.hovertemplate for tr in charts.traffic_chart(LIGHT, data, 1, None, "#fff").data]
    assert highlighted[-1].startswith("Normas a Classificar · Corporativo:")


def test_category_ticks_stay_horizontal_and_thin_out_on_phones():
    sel = default_selection("Month")
    data = traffic(sel.period, sel.bounds)
    wide = charts.traffic_chart(LIGHT, data, None, None, "#fff").layout.xaxis
    narrow = charts.traffic_chart(LIGHT, data, None, None, "#fff", narrow=True).layout.xaxis
    assert wide.tickangle == 0 and wide.automargin is True and wide.nticks is None
    assert narrow.tickangle == 0 and narrow.nticks == charts.NARROW_TICKS


def test_waterfall_text_is_horizontal_and_hidden_when_it_does_not_fit():
    sel = default_selection("Month")
    data = waterfall(sel.period, sel.bounds)
    model = build_waterfall(data["steps"])
    fig = charts.waterfall_chart(LIGHT, model, "currency", data["unitScale"], "#fff", narrow=True)
    assert all(tr.textangle == 0 for tr in fig.data)
    assert fig.layout.uniformtext.mode == "hide"
    assert fig.layout.xaxis.tickangle == 0
    assert any("<br>" in text for text in fig.layout.xaxis.ticktext)  # "Receita<br>bruta" on phones


def test_overview_area_fills_to_the_bottom_edge():
    fig = charts.sparkline(LIGHT, [10, 30, 20, 40], ["a", "b", "c", "d"], "Normas", height=64, area=True)
    baseline, line = fig.data
    assert line.fill == "tonexty"
    assert list(baseline.y) == [fig.layout.yaxis.range[0]] * 4
    assert fig.layout.margin.b == 0


# --- F9, second pass: segment card rows, "Últimos e-mails" rows, header and the waterfall on phones -------------------------
def _segment_cards_script():
    import streamlit as st

    from core import ui

    st.session_state["brand-theme"] = {"base": "light", "mode": "light"}
    items = [{"id": "atacado", "label": "Atacado", "icon": "cilTruck", "total": 54, "toClassify": 7, "trend": [1, 2, 3]}]
    ui.segment_cards("t", items)


def _element_kinds(block) -> list[str]:
    """Kinds of the direct children of a block: 'html', 'plotlychart', 'button', ... (st.html has no AppTest class)."""
    kinds = []
    for child in block.children.values():
        if type(child).__name__ in ("Block", "Column"):
            kinds.extend(_element_kinds(child))
        else:
            kinds.append(type(child.proto).__name__.lower())
    return kinds


def test_segment_card_draws_value_badge_title_then_sparkline_like_widget_stat_a():
    at = AppTest.from_function(_segment_cards_script).run()
    assert not at.exception
    kinds = _element_kinds(at.main)
    assert [k for k in kinds if k in ("html", "button", "plotlychart")] == ["html", "button", "html", "plotlychart"]
    assert at.button[0].label == "7 a classificar"


def test_sparkline_of_the_segment_cards_is_inset_1rem_from_the_card_sides():
    line = charts.sparkline(LIGHT, [10, 30, 20], ["a", "b", "c"], "Normas")
    assert line.layout.margin.l == line.layout.margin.r == charts.SPARKLINE_SIDE_MARGIN == 16
    area = charts.sparkline(LIGHT, [10, 30, 20], ["a", "b", "c"], "Normas", area=True)
    assert area.layout.margin.l == area.layout.margin.r == 0


def test_email_row_label_marks_date_and_count_for_the_row_css():
    assert ui.email_row_label("30/12/2021", "Plataforma", "7 normas") == "*30/12/2021* Plataforma **7 normas**"


def _email_rows_script():
    import streamlit as st

    from core import ui

    with st.container(key="t-emails-list"):
        with ui.email_row("t-emails", "em-1", "plataforma", "30/12/2021", "Plataforma", "7 normas"):
            st.text("normas")


def test_email_row_is_an_expander_in_a_container_keyed_by_the_segment():
    at = AppTest.from_function(_email_rows_script).run()
    assert not at.exception
    assert at.expander[0].label == "*30/12/2021* Plataforma **7 normas**"
    assert not at.expander[0].proto.expanded


def test_waterfall_on_phones_shrinks_ticks_and_takes_the_side_margins_back():
    sel = default_selection("Month")
    data = waterfall(sel.period, sel.bounds)
    model = build_waterfall(data["steps"])
    wide = charts.waterfall_chart(LIGHT, model, "currency", data["unitScale"], "#fff")
    narrow = charts.waterfall_chart(LIGHT, model, "currency", data["unitScale"], "#fff", narrow=True)
    assert wide.layout.xaxis.tickfont.size == 11 and wide.layout.margin.l == 16
    assert narrow.layout.xaxis.tickfont.size == charts.NARROW_WF_TICK_SIZE < 11
    assert narrow.layout.margin.l == narrow.layout.margin.r == charts.NARROW_WF_SIDE_MARGIN < 16


def test_traffic_mock_bands_match_the_landing():
    # dashboard-charts-data.ts: TRAFFIC_SERIES ranges and the "Normas a Classificar" line = sum of the segments.
    from core.data import TO_CLASSIFY_BAND, TRAFFIC_RANGE_BANDS, traffic_series

    assert TRAFFIC_RANGE_BANDS == {"atacado": (160, 240), "corporativo": (100, 160), "plataforma": (55, 105), "varejo": (120, 200)}
    assert TO_CLASSIFY_BAND == (3, 12)
    sel = default_selection("Month")
    data = traffic(sel.period, sel.bounds)
    for sid, (lo, hi) in TRAFFIC_RANGE_BANDS.items():
        assert all(lo <= v <= hi for v in data.values[sid])
        assert all(3 <= v <= 12 for v in data.to_classify[sid])
    summed = traffic_series(data, None)["to-classify"]
    assert summed == [sum(data.to_classify[s][i] for s in TRAFFIC_RANGE_BANDS) for i in range(len(data.labels))]
    assert traffic_series(data, "varejo")["to-classify"] == data.to_classify["varejo"]


def test_custom_range_date_inputs_accept_every_preset_and_the_widest_custom_range():
    # Review finding: "De"/"Até" get explicit min/max (ui._CUSTOM_RANGE_MIN, PERIOD_END) instead of Streamlit's
    # floating ±10-year defaults; every preset and the 30-year custom limit must fit (no StreamlitAPIException).
    from streamlit.elements.widgets.time_widgets import _DateInputValues

    from core.period import MAX_TRAFFIC_POINTS, PERIOD_END, TRAFFIC_RANGES, preset_range

    starts = [preset_range(p, c).start for p, opts in TRAFFIC_RANGES.items() for c, _ in opts]
    starts.append(date(PERIOD_END.year - MAX_TRAFFIC_POINTS["Year"] + 1, 1, 1))  # widest valid custom range
    for value in starts + [PERIOD_END]:
        _DateInputValues.from_raw_values(value=value, min_value=ui._CUSTOM_RANGE_MIN, max_value=PERIOD_END)


def _icon_references() -> set[str]:
    """Icon names the app can draw: quoted literals in src/ Python, url(.../icons/x.svg) in CSS, `icon` fields of data/."""
    import json
    import re
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    names: set[str] = set()
    for path in (root / "src").rglob("*.py"):
        names |= set(re.findall(r"""["'](ci[lb](?:-[a-z]+)+|ci[lb][A-Z][A-Za-z]*)["']""", path.read_text(encoding="utf-8")))
    for path in (root / "src").rglob("*.css"):
        names |= set(re.findall(r"icons/(ci[lb](?:-[a-z]+)+)\.svg", path.read_text(encoding="utf-8")))
    for path in (root / "data").glob("*.json"):
        text = path.read_text(encoding="utf-8")
        names |= set(re.findall(r'"icon"\s*:\s*"([^"]+)"', text))
        json.loads(text)  # the regex reads valid files only
    return names


def test_every_icon_file_is_used_and_every_used_icon_exists():
    files = {p.name for p in (ui.STATIC / "icons").glob("*.svg")}
    used = {ui._icon_file(name).name for name in _icon_references()}
    assert used <= files, f"missing icons: {sorted(used - files)}"
    assert files <= used, f"unused icons: {sorted(files - used)}"
