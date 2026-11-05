"""Scalation: segment cards (petrol tone, no filter), "Cascata do resultado" and the "Tráfego e vendas" demo card.
Port of views/scalation/scalation.component.html and waterfall/waterfall-chart.component.* of the Angular landing."""
import html

import streamlit as st

from core import compat
from core.charts import waterfall_chart
from core.data import build_waterfall, format_currency, format_share, segments, waterfall
from core.period import default_selection
from core.tokens import theme_type, tokens
from core.ui import card, card_title, chart, data_error, data_error_html, icon, period_filter, section_anchor, segment_cards

SEGMENTS_ERROR = "Não foi possível carregar os segmentos."
WATERFALL_ERROR = "Não foi possível carregar os dados da cascata."
UNIT_LABELS = {"currency": "R$", "percent": "% da receita"}
# Material icons stand in for cilChartLine / cilList: st.pills labels take Markdown icons, not the CoreUI SVGs.
VIEW_LABELS = {"chart": ":material/show_chart: Gráfico", "table": ":material/list: Tabela"}

t = tokens()
st.html('<h1 class="visually-hidden">Scalation</h1>')

# 1. Normas por segmento (petrol tone, read only)
section_anchor("segmentos")
try:
    segment_cards("scalation", segments(), tone="petrol", filterable=False)
except Exception as error:  # noqa: BLE001 - pt-BR text (+ login link / support code), never the server message
    data_error(SEGMENTS_ERROR, error)


# 2. Cascata do resultado ------------------------------------------------------------------------------------------------------
def _required_pills(label: str, key: str, labels: dict, default: str) -> str:
    """Single required choice (the landing's .filter-chip pair): clicking the active chip keeps it."""
    # Written every run so the chip is always sent with its value (ui._init_choice: an interrupted first run leaves it
    # unselected in the browser while the state holds it).
    st.session_state[key] = st.session_state.get(key) or st.session_state.get(f"{key}-prev") or default
    st.session_state[f"{key}-prev"] = st.session_state[key]
    st.pills(label, list(labels), format_func=labels.get, key=key, label_visibility="collapsed",
             on_change=compat.required_choice, args=(key, f"{key}-prev"))
    return st.session_state[key] or default


def _waterfall_table(model, data: dict) -> str:
    """Etapa (rowgroup) / Componente / Valor / % da receita bruta / Saldo após a etapa, as the landing's table view."""
    scale, currency = data["unitScale"], data["currency"]
    rows = []
    for column in model.columns:
        span = len(column.segments)
        for index, seg in enumerate(column.segments):
            signed = -seg.value if seg.kind == "decrease" else seg.value
            head = (f'<th scope="rowgroup" rowspan="{span}">{html.escape(column.step["label"])}</th>' if index == 0 else "")
            tail = (f'<td class="brand-wf-num is-strong" rowspan="{span}">{format_currency(column.end, scale, currency)}</td>' if index == 0 else "")
            rows.append(f'<tr>{head}<td>{html.escape(seg.part_label)}</td><td class="brand-wf-num">{format_currency(signed, scale, currency)}</td>'
                        f'<td class="brand-wf-num">{format_share(signed, model.base)}</td>{tail}</tr>')
    return ('<div class="brand-wf-table-wrap"><table class="brand-wf-table">'
            f'<caption class="visually-hidden">Cascata do resultado por etapa e componente, {html.escape(data["period"])}</caption>'
            '<thead><tr><th scope="col">Etapa</th><th scope="col">Componente</th><th scope="col" class="brand-wf-num">Valor</th>'
            '<th scope="col" class="brand-wf-num">% da receita bruta</th><th scope="col" class="brand-wf-num">Saldo após a etapa</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


with card("cascata"):
    # The filter writes pf-waterfall in its callbacks, so the subtitle above it already shows the applied period.
    applied = st.session_state.get("pf-waterfall") or default_selection("Month")
    data, model, wf_error = None, None, None
    try:
        with st.spinner("Carregando dados..."):
            data = waterfall(applied.period, applied.bounds)
            model = build_waterfall(data["steps"])
    except Exception as error:  # noqa: BLE001 - shown as the pt-BR placeholder below
        data, model, wf_error = None, None, error

    title_col, toggles_col = compat.hstack([5, 4], key="wf-head", vertical_alignment="top")
    with title_col:
        card_title("Cascata do resultado", html.escape(data["period"]) if data else "Carregando período...", anchor="cascata")
    with toggles_col, st.container(key="wf-toggles"):
        unit = _required_pills("Unidade dos valores", "wf-unit", UNIT_LABELS, "currency")
        view = _required_pills("Forma de exibição", "wf-view", VIEW_LABELS, "chart")

    period_filter("waterfall", label="Período da cascata")

    if model is None:
        st.html(data_error_html(WATERFALL_ERROR, wf_error, "brand-wf-placeholder brand-muted"))
    else:
        scale, currency = data["unitScale"], data["currency"]

        def fmt(value: float) -> str:
            return format_share(value, model.base) if unit == "percent" else format_currency(value, scale, currency)

        share = (f'<span class="brand-muted brand-small brand-wf-share">({format_share(model.result, model.base)} da receita bruta)</span>'
                 if unit == "currency" else "")
        legend = [("Total (receita e resultado)", t["wf_total"][1]), ("Redução", t["wf_decrease"][1])]
        items = "".join(f'<li><span class="brand-wf-swatch" style="background-color:{color}" aria-hidden="true"></span>{label}</li>' for label, color in legend)
        st.html(f'<div class="brand-wf-bar"><div class="brand-wf-result"><span class="brand-muted brand-small">Resultado</span>'
                f'<strong>{fmt(model.result)}</strong>{share}</div>'
                f'<ul class="brand-wf-legend" aria-label="Legenda">{items}'
                f'<li><span class="brand-wf-connector" style="border-top-color:{t["wf_connector"]}" aria-hidden="true"></span>Saldo entre etapas</li></ul></div>')
        if view == "chart":
            steps = "; ".join(f'{c.step["label"]} {fmt(-c.total if c.step["kind"] == "decrease" else c.total)}' for c in model.columns)
            st.html(f'<p class="visually-hidden">Gráfico de cascata, {html.escape(data["period"])}. {html.escape(steps)}. '
                    f'Saldo final {fmt(model.result)}.</p>')
            chart(waterfall_chart(t, model, unit, scale, t["surface_card"], narrow=compat.viewport_narrow()), key="wf-chart")
        else:
            st.html(_waterfall_table(model, data))


# 3. Tráfego e vendas (template demo, static; not product) --------------------------------------------------------------------
def _kpi(tone: str, label: str, value: str) -> str:
    return f'<div class="brand-demo-kpi is-{tone}"><div class="brand-muted brand-small">{label}</div><div class="brand-demo-kpi-value">{value}</div></div>'


def _bar(tone: str, value: int) -> str:
    return (f'<div class="brand-demo-progress" role="progressbar" aria-valuenow="{value}" aria-valuemin="0" aria-valuemax="100">'
            f'<span class="is-{tone}" style="width:{value}%"></span></div>')


DAYS = (("Segunda", 34, 78), ("Terça", 56, 94), ("Quarta", 12, 67), ("Quinta", 43, 91), ("Sexta", 22, 73), ("Sábado", 53, 82), ("Domingo", 9, 69))
GENDER = (("Masculino", 43, "mb-4", "cil-user"), ("Feminino", 37, "mb-5", "cil-user-female"))
SOURCES = (("Busca orgânica", "191,235", 56, "cib-google"), ("Facebook", "51,223", 15, "cib-facebook"), ("Twitter", "37,564", 11, "cib-twitter"),
           ("LinkedIn", "27,319", 8, "cib-linkedin"))

days = "".join(f'<div class="brand-demo-group mb-4"><div class="brand-demo-prepend"><span class="brand-muted brand-small">{day}</span></div>'
               f'<div class="brand-demo-bars">{_bar("info", a)}{_bar("danger", b)}</div></div>' for day, a, b in DAYS)
gender = "".join(f'<div class="brand-demo-group {mb}"><div class="brand-demo-header">{icon(name_icon, "1.25rem", "brand-demo-icon")}<span>{name}</span>'
                 f'<span class="brand-demo-end">{pct}%</span></div><div class="brand-demo-bars">{_bar("warning", pct)}</div></div>' for name, pct, mb, name_icon in GENDER)
sources = "".join(f'<div class="brand-demo-group"><div class="brand-demo-header">{icon(name_icon, "1.25rem", "brand-demo-icon")}<span>{name}</span>'
                  f'<span class="brand-demo-end">{n} <span class="brand-muted brand-small">({pct}%)</span></span></div><div class="brand-demo-bars">{_bar("success", pct)}</div></div>'
                  for name, n, pct, name_icon in SOURCES)
# "Mais opções": the template's plain icon button, without an action (demo card).
more = (f'<div class="brand-demo-divider"><button type="button" class="brand-demo-more" aria-label="Mais opções" title="Mais opções">'
        f'{icon("cil-options", "1rem")}</button></div>')
info = t["highlight"] if theme_type() == "dark" else t["highlight_dark"]  # CoreUI "info": cyan-dark (light) / cyan (dark)

with card("trafego-e-vendas"):
    st.html(f'<span id="trafego-e-vendas" class="page-section"></span><div class="brand-demo" style="--brand-demo-info:{info}">'
            '<div class="brand-demo-cap">Tráfego e vendas</div><div class="brand-demo-body">'
            f'<div class="brand-demo-col"><div class="brand-demo-kpis">{_kpi("info", "Novos clientes", "9,123")}{_kpi("danger", "Clientes recorrentes", "22,643")}</div>'
            f'<hr class="brand-demo-hr" />{days}'
            '<div class="brand-demo-legend"><small><span class="brand-demo-badge is-info"></span> Novos clientes &nbsp;&nbsp; '
            '<span class="brand-demo-badge is-danger"></span> Clientes recorrentes</small></div></div>'
            f'<div class="brand-demo-col"><div class="brand-demo-kpis">{_kpi("warning", "Visualizações de página", "78,623")}{_kpi("success", "Orgânico", "49,123")}</div>'
            f'<hr class="brand-demo-hr" />{gender}{sources}{more}</div></div></div>')
