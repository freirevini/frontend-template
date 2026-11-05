"""Triagent: segment cards with the 'a classificar' page filter, Normativos Recebidos, classification cards (pie and
themes, cross-filtered), Fluxo de e-mail - Triagem and the Tabela Analítica with Excel and the agent action.

Port of src/app/views/dashboard/** of the landing (frozen). Lists that the landing draws as clickable HTML (legends,
themes) go through compat.clicklist (ADR-004: st.pills in 1.40); the figures beside them stay as HTML. Esc and click
outside do not clear the filters here, only "Remover filtro" (plan D6)."""
import html
import re
import unicodedata
from functools import cmp_to_key

import pandas as pd
import streamlit as st

from core import chat, compat, ui
from core.charts import doughnut, emails_chart, traffic_chart
from core.data import (APPLICABILITY_LABELS, LATEST_EMAILS, ExportLimitError, classification, classification_summary, classified_export,
                       classified_page, emails_summary, filter_classified, pt_br_key, segments, sent_datetime, server_paging, traffic,
                       traffic_series)
from core.period import default_selection, fmt_date, fmt_decimal, fmt_int, fmt_percent, iso
from core.tokens import SEGMENT_IDS, SEGMENT_LABELS, TO_CLASSIFY_LABEL, tokens
from core.xlsx import XLSX_MIME, XlsxColumn, XlsxTable, build_xlsx

t = tokens()
S = st.session_state

# Page state (one key per block, R3).
SEGMENT, APPLICABLE, THEME = "triagent-segment", "triagent-applicable", "triagent-theme"
HIGHLIGHT, EMAILS_HIGHLIGHT = "triagent-highlight", "triagent-emails-highlight"
TRAFFIC_PF, EMAILS_PF = "triagent-traffic", "triagent-emails"     # ui.period_filter keeps them in pf-<key>
SORT_KEY, SORT_DIR, TABLE = "triagent-table-sort", "triagent-table-dir", "triagent-table"
for key, value in ((SEGMENT, None), (APPLICABLE, None), (THEME, None), (HIGHLIGHT, None), (EMAILS_HIGHLIGHT, None)):
    S.setdefault(key, value)

TO_CLASSIFY_INDEX = len(SEGMENT_IDS)
VIEW_LABELS = {"chart": "Gráfico", "table": "Tabela"}
EXPORT_ICON = ":material/table_view:"
ANALYTIC_COLUMNS = [("classifiedAt", "Data da classificação", 14), ("orgao", "Órgão", 10), ("tipo", "Tipo", 22), ("numero", "Número", 10),
                    ("theme", "Tema", 48), ("segment", "Segmento", 14), ("applicable", "Aplicável ao banco?", 12), ("area", "Área", 30),
                    ("diretoria", "Diretoria", 16)]
ANALYTIC_LABELS = {k: label for k, label, _ in ANALYTIC_COLUMNS}
PAGE_SIZE = 15
ROW_HEIGHT = 35  # st.dataframe row height (px), to show a whole page without inner scroll


def plural(n: int, one: str, many: str) -> str:
    return f"{fmt_int(n)} {one if n == 1 else many}"


def segment_label(segment_id) -> str:
    return SEGMENT_LABELS.get(segment_id, "") if segment_id else ""


def numeric_table(frame: pd.DataFrame, dimmed: list[str] = ()):
    """pt-BR thousands in st.dataframe (Styler display values); dimmed columns follow the highlighted legend item."""
    numbers = [c for c in frame.columns if c != "Período"]
    styler = frame.style.format(lambda v: fmt_int(v), subset=numbers)
    if dimmed:
        styler = styler.set_properties(subset=list(dimmed), color=t["content_disabled"])
    return styler


def table_height(rows: int) -> int:
    return (rows + 1) * ROW_HEIGHT + 3


# --- Page filter (segment cards) -----------------------------------------------------------------------------------------
def clear_segment_filter() -> None:
    if S[SEGMENT] is None:
        return
    S[SEGMENT] = None
    S[EMAILS_HIGHLIGHT] = None
    # Keep a highlight the user picked meanwhile; drop only the one the filter set.
    if S[HIGHLIGHT] == TO_CLASSIFY_INDEX:
        S[HIGHLIGHT] = None


def toggle_segment_filter(segment_id: str) -> None:
    if S[SEGMENT] == segment_id or segment_id not in SEGMENT_IDS:
        clear_segment_filter()
        return
    S[SEGMENT], S[HIGHLIGHT], S[EMAILS_HIGHLIGHT] = segment_id, TO_CLASSIFY_INDEX, None


def clear_classification_filters() -> None:
    S[APPLICABLE] = S[THEME] = None


# Selections applied in the previous run (period_filter callbacks already ran, so the state is current).
sel = S.get(f"pf-{TRAFFIC_PF}") or default_selection("Month")
esel = S.get(f"pf-{EMAILS_PF}") or default_selection("Month")

# --- 1. Cards de segmento -------------------------------------------------------------------------------------------------
ui.section_anchor("segmentos")
try:
    segment_items = segments()
except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
    ui.data_error("Não foi possível carregar os segmentos.", error)
    st.stop()
clicked = ui.segment_cards("triagent", segment_items, active=S[SEGMENT])
if clicked:
    toggle_segment_filter(clicked)
    compat.request_rerun()

segment = S[SEGMENT]
if segment:
    if ui.filter_notice("triagent-segment", f"Filtro: <strong>normas a classificar · {html.escape(segment_label(segment))}</strong>. Aplicado aos cards, "
                        "aos gráficos Normativos Recebidos, Normas Aplicáveis e Assunto das Normas Aplicáveis, ao Fluxo de e-mail - Triagem e à Tabela Analítica."):
        clear_segment_filter()
        compat.request_rerun()

# --- 2. Normativos Recebidos ------------------------------------------------------------------------------------------------
try:
    data = traffic(sel.period, sel.bounds)
except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
    ui.data_error("Não foi possível carregar os normativos recebidos.", error)
    st.stop()
highlighted = S[HIGHLIGHT]
# Segment the dashed line is filtered to: the highlighted segment, else the page filter, else none (sum of all).
focus = SEGMENT_IDS[highlighted] if highlighted is not None and highlighted < TO_CLASSIFY_INDEX else segment
series = traffic_series(data, focus)
series_ids = SEGMENT_IDS + ["to-classify"]
series_labels = [SEGMENT_LABELS[s] for s in SEGMENT_IDS] + [TO_CLASSIFY_LABEL + (f" · {SEGMENT_LABELS[focus]}" if focus else "")]
series_colors = t["series"] + [t["series_reference"]]
totals = [sum(series[s]) for s in series_ids]
# Shares are of every norma in the period: all segments plus every "to classify" value (not only the focused one).
grand = (sum(sum(v) for v in data.values.values()) + sum(sum(v) for v in data.to_classify.values())) or 1


def legend_dimmed(index: int) -> bool:
    """A highlighted segment keeps 'Normas a Classificar' on (filtered to it); everything else dims."""
    if highlighted is None or highlighted == index:
        return False
    return not (index == TO_CLASSIFY_INDEX and highlighted != TO_CLASSIFY_INDEX)


def traffic_xlsx() -> bytes:
    keys = [f"s{i}" for i in range(len(series_ids))]
    filt = f" · filtro: normas a classificar · {segment_label(segment)}" if segment else ""
    return build_xlsx(XlsxTable(
        sheet_name="Normativos Recebidos", title="Normativos recebidos por segmento", subtitle=f"{data.subtitle}{filt}",
        columns=[XlsxColumn("period", "Período", width=16)]
        + [XlsxColumn(keys[i], series_labels[i], "#,##0", max(14, len(series_labels[i]) + 4)) for i in range(len(series_ids))],
        rows=[{"period": label, **{keys[i]: series[series_ids[i]][p] for i in range(len(series_ids))}} for p, label in enumerate(data.labels)],
        totals={"period": "Total", **{keys[i]: totals[i] for i in range(len(series_ids))}},
        file_name=f"normativos-recebidos-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}{'-a-classificar-' + segment if segment else ''}.xlsx",
    ))


with ui.card("normativos-recebidos"):
    head, controls = compat.hstack([3, 2], key="traffic-head", vertical_alignment="top")
    with head:
        ui.card_title("Normativos Recebidos", html.escape(data.subtitle), anchor="normativos-recebidos")
    with controls:
        view = ui.chip_filter("triagent-traffic-view", list(VIEW_LABELS), VIEW_LABELS, "chart")
        if view == "table":
            traffic_file = traffic_xlsx()
            st.download_button("Exportar Excel", data=traffic_file, file_name=f"normativos-recebidos-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}"
                               f"{'-a-classificar-' + segment if segment else ''}.xlsx", mime=XLSX_MIME, key="triagent-traffic-export",
                               type="primary", icon=EXPORT_ICON)
    sel = ui.period_filter(TRAFFIC_PF, label="Período dos normativos recebidos")
    if view == "chart":
        ui.chart(traffic_chart(t, data, highlighted, segment, t["surface_card"], narrow=compat.viewport_narrow()), key="triagent-traffic-chart")
    else:
        frame = pd.DataFrame([{"Período": label, **{series_labels[i]: series[series_ids[i]][p] for i in range(len(series_ids))}}
                              for p, label in enumerate(data.labels)]
                             + [{"Período": "Total", **{series_labels[i]: totals[i] for i in range(len(series_ids))}}])
        dimmed = [series_labels[i] for i in range(len(series_ids)) if legend_dimmed(i)]
        st.dataframe(numeric_table(frame, dimmed), hide_index=True, use_container_width=True, key="triagent-traffic-table",
                     height=min(table_height(len(frame)), 600))

    legend = []
    for i in range(len(series_ids)):
        share = totals[i] / grand
        name = TO_CLASSIFY_LABEL if i == TO_CLASSIFY_INDEX else series_labels[i]
        note = f'<span class="brand-small"> · {SEGMENT_LABELS[focus]}</span>' if i == TO_CLASSIFY_INDEX and focus else ""
        state = ("is-active " if highlighted == i else "") + ("is-dimmed" if legend_dimmed(i) else "")
        dashed = "brand-legend-key--dashed" if i == TO_CLASSIFY_INDEX else ""
        legend.append(
            f'<div class="brand-traffic-legend {state}"><span class="brand-muted"><span class="brand-legend-key {dashed}" style="border-top-color:{series_colors[i]}"></span>'
            f'{html.escape(name)}{note}</span><strong>{fmt_int(totals[i])} normas ({fmt_percent(share)})</strong>'
            f'<span class="brand-progress-thin" role="progressbar" aria-valuenow="{round(share * 100)}" aria-valuemin="0" aria-valuemax="100" '
            f'aria-label="Participação de {html.escape(name)}"><span style="width:{share * 100:.1f}%;background:{series_colors[i]}"></span></span></div>')
    st.html(f'<div class="brand-traffic-legend-row" role="group" aria-label="Legenda do gráfico Normativos Recebidos">{"".join(legend)}</div>')
    picked = compat.clicklist("triagent-traffic-legend", [compat.ClickItem(str(i), series_labels[i]) for i in range(len(series_ids))],
                              active=None if highlighted is None else str(highlighted))
    if picked is not None:
        S[HIGHLIGHT] = None if highlighted == int(picked) else int(picked)
        compat.request_rerun()

# --- 3 e 4. Classificação das normas --------------------------------------------------------------------------------------------
applicable_filter, theme_filter = S[APPLICABLE], S[THEME]
lists_not_applicable = applicable_filter is False
try:
    # The pie ignores its own filter (it highlights the slice) and follows the theme picked in the list; the list ignores
    # its own filter (it highlights the row) and lists the class picked in the pie. Mock: aggregated here; BFF: /resumo.
    agg = classification_summary(sel.bounds, segment=segment, theme=theme_filter)
    agg_themes = classification_summary(sel.bounds, segment=segment, themes_of=not lists_not_applicable)
except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
    ui.data_error("Não foi possível carregar a classificação das normas.", error)
    st.stop()
if applicable_filter is not None or theme_filter is not None:
    parts = []
    if applicable_filter is not None:
        parts.append("Aplicáveis" if applicable_filter else "Não aplicáveis")
    if theme_filter is not None:
        parts.append(f"Tema: {html.escape(theme_filter)}")
    if ui.filter_notice("triagent-classification", f"Filtro: <strong>{' · '.join(parts)}</strong>. Aplicado aos gráficos Normas Aplicáveis e "
                        "Assunto das Normas Aplicáveis e à Tabela Analítica."):
        clear_classification_filters()
        compat.request_rerun()

segment_note = f" · {html.escape(segment_label(segment))}" if segment else ""
col_pie, col_themes = st.columns([5, 7], gap="medium")
with col_pie, ui.card("normas-aplicaveis"):
    theme_note = f" · Tema: {html.escape(theme_filter)}" if theme_filter else ""
    ui.card_title("Normas Aplicáveis", f"{html.escape(data.subtitle)}{segment_note}{theme_note}", anchor="normas-aplicaveis")
    if agg.total == 0:
        st.html('<p class="brand-placeholder brand-muted">Nenhuma norma classificada neste período.</p>')
    else:
        ui.chart(doughnut(t, agg.applicable, agg.not_applicable, applicable_filter, t["surface_card"]), key="triagent-pie")
        slices = [(True, "Aplicáveis", agg.applicable, agg.applicable_share, t["applicable"]),
                  (False, "Não aplicáveis", agg.not_applicable, 1 - agg.applicable_share, t["not_applicable"])]
        items = []
        for value, label, count, share, color in slices:
            state = ("is-active " if applicable_filter is value else "") + ("is-dimmed" if applicable_filter is not None and applicable_filter is not value else "")
            items.append(f'<li><div class="brand-pie-legend {state}"><span class="brand-pie-legend-label"><span class="brand-classification-key" style="background:{color}">'
                         f'</span>{label}</span><span class="brand-pie-legend-value">{fmt_int(count)} <span>{fmt_percent(share)}</span></span></div></li>')
        st.html(f'<ul class="brand-pie-legend-list" aria-label="Filtrar os temas por aplicabilidade">{"".join(items)}</ul>')
        picked = compat.clicklist("triagent-pie-legend", [compat.ClickItem("true", "Aplicáveis"), compat.ClickItem("false", "Não aplicáveis")],
                                  active=None if applicable_filter is None else str(applicable_filter).lower())
        if picked is not None:
            value = picked == "true"
            S[APPLICABLE] = None if applicable_filter is value else value
            compat.request_rerun()

with col_themes, ui.card("assunto-das-normas"):
    ui.card_title(f"Assunto das Normas {'Não Aplicáveis' if lists_not_applicable else 'Aplicáveis'}", f"{html.escape(data.subtitle)}{segment_note}",
                  anchor="assunto-das-normas")
    if agg_themes.themes_total == 0:
        st.html(f'<p class="brand-placeholder brand-muted">Nenhuma norma {"não aplicável" if lists_not_applicable else "aplicável"} neste período.</p>')
    else:
        rows = []
        for theme in agg_themes.themes:
            state = ("is-active " if theme_filter == theme.label else "") + ("is-dimmed" if theme_filter is not None and theme_filter != theme.label else "")
            width = max(1.5, theme.width * 100) if theme.width > 0 else 0
            rows.append(f'<li><div class="brand-theme-row {state}"><span class="brand-theme-label" title="{html.escape(theme.label, quote=True)}">{html.escape(theme.label)}</span>'
                        f'<span class="brand-theme-track" aria-hidden="true"><span class="brand-theme-fill {"is-not-applicable" if lists_not_applicable else ""}" '
                        f'style="width:{width:.1f}%"></span></span><span class="brand-theme-value">{fmt_int(theme.count)} <span>{fmt_percent(theme.share)}</span></span></div></li>')
        if agg_themes.others:
            o = agg_themes.others
            rows.append(f'<li class="brand-theme-row is-other"><span class="brand-theme-label">{o.label} ({o.grouped} {"tema" if o.grouped == 1 else "temas"})</span>'
                        f'<span class="brand-theme-track" aria-hidden="true"></span><span class="brand-theme-value">{fmt_int(o.count)} <span>{fmt_percent(o.share)}</span></span></li>')
        kind = "não aplicáveis" if lists_not_applicable else "aplicáveis"
        st.html(f'<ol class="brand-theme-bars" aria-label="Temas por número de normas {kind}; escolha um tema para filtrar a pizza">{"".join(rows)}</ol>')
        picked = compat.clicklist("triagent-themes", [compat.ClickItem(theme.label, theme.label) for theme in agg_themes.themes], active=theme_filter)
        if picked is not None:
            S[THEME] = None if theme_filter == picked else picked
            compat.request_rerun()

# --- 5. Fluxo de e-mail - Triagem -------------------------------------------------------------------------------------------------
try:
    eagg = emails_summary(esel.period, esel.bounds, segment)
except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
    ui.data_error("Não foi possível carregar os e-mails.", error)
    st.stop()
positions = [p for p, sid in enumerate(SEGMENT_IDS) if not segment or sid == segment]
emails_highlighted = S[EMAILS_HIGHLIGHT]


def emails_xlsx() -> bytes:
    keys = [f"s{p}" for p in positions]
    filt = f" · segmento: {segment_label(segment)}" if segment else ""
    return build_xlsx(XlsxTable(
        sheet_name="E-mails", title="Fluxo de e-mail - Triagem", subtitle=f"{eagg.subtitle}{filt}",
        columns=[XlsxColumn("period", "Período", width=16), XlsxColumn("emails", "E-mails", "#,##0", 12)]
        + [XlsxColumn(keys[i], SEGMENT_LABELS[SEGMENT_IDS[p]], "#,##0", 16) for i, p in enumerate(positions)]
        + [XlsxColumn("total", "Total de normas", "#,##0", 18)],
        rows=[{"period": b.label, "emails": b.emails, **{keys[i]: b.normas[p] for i, p in enumerate(positions)}, "total": b.total} for b in eagg.buckets],
        totals={"period": "Total", "emails": eagg.emails, **{keys[i]: eagg.segment_normas[p] for i, p in enumerate(positions)}, "total": eagg.normas},
        file_name=f"fluxo-email-triagem-{iso(esel.bounds.start)}-a-{iso(esel.bounds.end)}{'-' + segment if segment else ''}.xlsx",
    ))


with ui.card("fluxo-de-email"):
    head, controls = compat.hstack([3, 2], key="emails-head", vertical_alignment="top")
    with head:
        ui.card_title("Fluxo de e-mail - Triagem", f"{html.escape(eagg.subtitle)}{segment_note}", anchor="fluxo-de-email")
    with controls:
        eview = ui.chip_filter("triagent-emails-view", list(VIEW_LABELS), VIEW_LABELS, "chart")
        if eview == "table":
            st.download_button("Exportar Excel", data=emails_xlsx(), file_name=f"fluxo-email-triagem-{iso(esel.bounds.start)}-a-{iso(esel.bounds.end)}"
                               f"{'-' + segment if segment else ''}.xlsx", mime=XLSX_MIME, key="triagent-emails-export", icon=EXPORT_ICON)
    esel = ui.period_filter(EMAILS_PF, periods=("Day", "Month"), label="Período dos e-mails")
    st.html(f'<dl class="brand-emails-stats"><div><dt>E-mails enviados</dt><dd>{fmt_int(eagg.emails)}</dd></div>'
            f'<div><dt>Normas sugeridas</dt><dd>{fmt_int(eagg.normas)} <span class="brand-emails-note">{fmt_int(eagg.distinct_normas)} '
            f'{"distinta" if eagg.distinct_normas == 1 else "distintas"}</span></dd></div>'
            f'<div><dt>Média por e-mail</dt><dd>{fmt_decimal(eagg.average_per_email, 1)}</dd></div></dl>')
    if eagg.emails == 0:
        st.html('<p class="brand-placeholder brand-muted">Nenhum e-mail enviado neste período.</p>')
    else:
        if eview == "chart":
            ui.chart(emails_chart(t, eagg.buckets, positions, emails_highlighted, t["surface_card"], narrow=compat.viewport_narrow()), key="triagent-emails-chart")
        else:
            frame = pd.DataFrame([{"Período": b.label, "E-mails": b.emails, **{SEGMENT_LABELS[SEGMENT_IDS[p]]: b.normas[p] for p in positions},
                                   "Total de normas": b.total} for b in eagg.buckets]
                                 + [{"Período": "Total", "E-mails": eagg.emails, **{SEGMENT_LABELS[SEGMENT_IDS[p]]: eagg.segment_normas[p] for p in positions},
                                     "Total de normas": eagg.normas}])
            dimmed = [SEGMENT_LABELS[SEGMENT_IDS[p]] for p in positions if emails_highlighted is not None and emails_highlighted != p]
            st.dataframe(numeric_table(frame, dimmed), hide_index=True, use_container_width=True, key="triagent-emails-table",
                         height=min(table_height(len(frame)), 600))
        items = []
        for p in positions:
            state = ("is-active " if emails_highlighted == p else "") + ("is-dimmed" if emails_highlighted is not None and emails_highlighted != p else "")
            items.append(f'<li><span class="brand-emails-legend {state}"><span class="brand-swatch" style="background:{t["series"][p]}"></span>'
                         f'{SEGMENT_LABELS[SEGMENT_IDS[p]]} · {plural(eagg.segment_normas[p], "norma", "normas")}</span></li>')
        st.html(f'<ul class="brand-emails-legend-list" aria-label="Legenda: normas sugeridas por segmento">{"".join(items)}</ul>')
        picked = compat.clicklist("triagent-emails-legend", [compat.ClickItem(str(p), SEGMENT_LABELS[SEGMENT_IDS[p]]) for p in positions],
                                  active=None if emails_highlighted is None else str(emails_highlighted))
        if picked is not None:
            S[EMAILS_HIGHLIGHT] = None if emails_highlighted == int(picked) else int(picked)
            compat.request_rerun()
        st.html('<h5 class="brand-emails-list-title">Últimos e-mails</h5>')
        with st.container(key="triagent-emails-list"):
            for email in eagg.list[:LATEST_EMAILS]:
                sent = fmt_date(sent_datetime(email).date())
                with ui.email_row("triagent-emails", email["id"], email["segment"], sent, SEGMENT_LABELS[email["segment"]],
                                  plural(len(email["normas"]), "norma", "normas")):
                    st.dataframe(pd.DataFrame([{"Órgão": n["orgao"], "Tipo": n["tipo"], "Número": n["numero"], "Tema": n["title"],
                                                "Aplicável ao segmento?": APPLICABILITY_LABELS.get(n["suggestedClass"], n["suggestedClass"]),
                                                "Área": n["area"], "Diretoria": n["diretoria"]} for n in email["normas"]]),
                                 hide_index=True, use_container_width=True, key=f"triagent-email-{email['id']}",
                                 column_config={"Tema": st.column_config.TextColumn(width="large")})


# --- 6. Tabela Analítica ----------------------------------------------------------------------------------------------------------
def cell(norma: dict, key: str) -> str:
    """Text of a cell as shown on screen and in the spreadsheet."""
    if key == "classifiedAt":
        return "/".join(reversed(norma["classifiedAt"].split("-")))
    if key == "segment":
        return SEGMENT_LABELS.get(norma["segment"], norma["segment"])
    if key == "applicable":
        return "Sim" if norma["applicable"] else "Não"
    return norma[key]


def act_number(numero: str) -> float:
    """'4.855' -> 4855 (pt-BR thousands dots); 0 when it is not a number, like the landing."""
    try:
        return float(numero.replace(".", "").replace(",", ".", 1))
    except ValueError:
        return 0.0


def file_slug(text: str) -> str:
    """'Pix: regras de devolução' -> 'pix-regras-de-devolucao' (file names, same as the landing)."""
    plain = "".join(c for c in unicodedata.normalize("NFD", text) if not 0x300 <= ord(c) <= 0x36F).lower()
    return re.sub(r"-$", "", re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", plain))[:40])


def _cmp(a, b) -> int:
    return (a > b) - (a < b)


def on_sort_column() -> None:
    # A new column starts newest first for the date, A→Z otherwise (landing sortBy).
    S[SORT_DIR] = "desc" if S[SORT_KEY] == "classifiedAt" else "asc"
    S[f"{SORT_DIR}-prev"] = S[SORT_DIR]


def sorted_rows(rows: list[dict], key: str, direction: int) -> list[dict]:
    """Dates by ISO text, numbers by value, text in pt-BR order (accents and case ignored); ties newest first, then code."""
    def compare(a: dict, b: dict) -> int:
        if key == "classifiedAt":
            first = _cmp(a["classifiedAt"], b["classifiedAt"])
        elif key == "numero":
            first = _cmp(act_number(a["numero"]), act_number(b["numero"]))
        else:
            first = _cmp(pt_br_key(cell(a, key))[0], pt_br_key(cell(b, key))[0])
        return direction * first or _cmp(b["classifiedAt"], a["classifiedAt"]) or _cmp(pt_br_key(a["code"]), pt_br_key(b["code"]))
    return sorted(rows, key=cmp_to_key(compare))


def norma_name(norma: dict) -> str:
    return f"{norma['tipo']} {norma['orgao']} nº {norma['numero']}"


S.setdefault(SORT_KEY, "classifiedAt")
active_filters = ([f"Segmento: {segment_label(segment)}"] if segment else []) \
    + (["Aplicáveis" if applicable_filter else "Não aplicáveis"] if applicable_filter is not None else []) \
    + ([f"Tema: {theme_filter}"] if theme_filter else [])
analytic_suffix = [s for s in (segment, None if applicable_filter is None else ("aplicaveis" if applicable_filter else "nao-aplicaveis"),
                               f"tema-{file_slug(theme_filter)}" if theme_filter else None) if s]
analytic_file = f"tabela-analitica-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}{'-' + '-'.join(analytic_suffix) if analytic_suffix else ''}.xlsx"


TABLE_ERROR = "Não foi possível carregar a tabela analítica."  # glossary: Tabela Analítica, Estados
EXPORT_ERROR = "Não foi possível gerar o arquivo Excel."     # glossary: Export to Excel
# Excel on demand: "Gerar Excel" asks (EXPORT_REQUEST = the table signature it was drawn with); the page reads the rows
# once, keeps the file in EXPORT_STATE for that signature and offers "Baixar Excel". Any filter, period or order change
# makes the signature differ and drops the file. A plain rerun never reads the export.
EXPORT_STATE, EXPORT_REQUEST = f"{TABLE}-xlsx", f"{TABLE}-xlsx-request"


def _filtered_sorted(sort_key: str, sort_dir: str) -> list[dict]:
    """Mock: the whole list filtered and sorted here (the BFF does it on the server)."""
    rows = filter_classified(classification(), sel.bounds, segment=segment, theme=theme_filter, applicable=applicable_filter)
    return sorted_rows(rows, sort_key, 1 if sort_dir == "asc" else -1)


def analytic_rows(sort_key: str, sort_dir: str) -> tuple[int, list[dict]]:
    """(total, rows of the page on screen). Mock: filtered, sorted and sliced here. BFF: the page comes from
    GET /normas-classificadas (filters, order and paging on the server; compat.pager drives the page)."""
    page = max(1, int(S.get(f"{TABLE}-page", 1)))
    if not server_paging():
        rows = _filtered_sorted(sort_key, sort_dir)
        page = min(page, max(1, -(-len(rows) // PAGE_SIZE)))
        return len(rows), rows[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    filters = dict(segment=segment, theme=theme_filter, applicable=applicable_filter, sort_key=sort_key, sort_dir=sort_dir)
    result = classified_page(sel.bounds, page=page, size=PAGE_SIZE, **filters)
    S[f"{TABLE}-page"] = result.page
    return result.total, result.rows


def request_export(signature: tuple) -> None:
    S[EXPORT_REQUEST] = signature


def build_export(signature: tuple, sort_key: str, sort_dir: str) -> dict:
    """Runs after "Gerar Excel" only. Mock: the filtered list; BFF: pages of 100 up to 5.000 rows (ExportLimitError
    above that: the limit text and no file). {signature, data (bytes or None), note (limit text), error (exception)}."""
    try:
        if server_paging():
            rows = classified_export(sel.bounds, segment=segment, theme=theme_filter, applicable=applicable_filter,
                                     sort_key=sort_key, sort_dir=sort_dir)
        else:
            rows = _filtered_sorted(sort_key, sort_dir)
        return {"signature": signature, "data": analytic_xlsx(rows) if rows else None, "note": None, "error": None}
    except ExportLimitError as limit:
        return {"signature": signature, "data": None, "note": limit.text, "error": None}
    except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
        return {"signature": signature, "data": None, "note": None, "error": error}


def analytic_xlsx(rows: list[dict]) -> bytes:
    return build_xlsx(XlsxTable(
        sheet_name="Tabela Analítica", title="Tabela Analítica — normas classificadas",
        subtitle=f"{data.subtitle} · {plural(len(rows), 'norma', 'normas')}{' · filtros: ' + ' · '.join(active_filters) if active_filters else ''}",
        columns=[XlsxColumn(k, label, width=w) for k, label, w in ANALYTIC_COLUMNS],
        rows=[{k: cell(n, k) for k, _, _ in ANALYTIC_COLUMNS} for n in rows],
        file_name=analytic_file,
    ))


with ui.card("tabela-analitica"):
    # Sort controls are drawn below the header; their state is read first so the export has the order on screen.
    sort_key, sort_dir = S[SORT_KEY], S.get(SORT_DIR) or "desc"
    # Any filter, period or order change goes back to page 1 (landing onAggregate/sortBy); checked before reading the page.
    signature = (sel.bounds, segment, applicable_filter, theme_filter, sort_key, sort_dir)
    if S.get(f"{TABLE}-signature") != signature:
        S[f"{TABLE}-signature"] = signature
        S[f"{TABLE}-page"] = 1
        S[f"{TABLE}-generation"] = S.get(f"{TABLE}-generation", 0) + 1
    table_error = None
    try:
        total, page_rows = analytic_rows(sort_key, sort_dir)
    except Exception as error:  # noqa: BLE001 - a BFF error never shows its host/message to the page (R6)
        total, page_rows, table_error = 0, [], error
    export = S.get(EXPORT_STATE)
    if export and export.get("signature") != signature:
        S.pop(EXPORT_STATE, None)
        export = None
    if S.pop(EXPORT_REQUEST, None) == signature and table_error is None and total:
        with st.spinner("Gerando arquivo..."):
            export = S[EXPORT_STATE] = build_export(signature, sort_key, sort_dir)
    head, controls = compat.hstack([3, 1], key="analytic-head", vertical_alignment="top")
    with head:
        ui.card_title("Tabela Analítica", f"{html.escape(data.subtitle)} · {plural(total, 'norma', 'normas')}", anchor="tabela-analitica")
    with controls:
        if export and export.get("data"):
            st.download_button("Baixar Excel", data=export["data"], file_name=analytic_file, mime=XLSX_MIME, key="triagent-table-export",
                               icon=EXPORT_ICON, type="primary", use_container_width=True)
        else:
            st.button("Gerar Excel", key="triagent-table-export-build", icon=EXPORT_ICON, use_container_width=True,
                      disabled=table_error is not None or not total or bool(export and export.get("note")),
                      on_click=request_export, args=(signature,))
    if export and export.get("note"):
        st.html(f'<p class="brand-muted brand-small" role="status">{html.escape(export["note"])}</p>')
    if export and export.get("error") is not None:
        ui.data_error(EXPORT_ERROR, export["error"])
    if active_filters:
        st.html('<p class="brand-analytic-filters brand-small" role="status">Filtros aplicados: '
                + "".join(f'<span class="brand-analytic-filter">{html.escape(f)}</span>' for f in active_filters) + "</p>")
    else:
        st.html('<p class="brand-analytic-filters brand-small brand-muted" role="status">Sem filtros: todas as normas classificadas no período do gráfico Normativos Recebidos.</p>')
    if table_error is not None:
        ui.data_error(TABLE_ERROR, table_error)
    elif not total:
        st.html('<p class="brand-placeholder brand-muted">Nenhuma norma para os filtros aplicados.</p>')
    else:
        label_col, column_col, dir_col = compat.hstack([1, 3, 3], key="triagent-table-sortbar")
        label_col.html('<span class="brand-muted brand-small">Ordenar por</span>')
        column_col.selectbox("Ordenar por", list(ANALYTIC_LABELS), format_func=ANALYTIC_LABELS.get, key=SORT_KEY,
                             label_visibility="collapsed", on_change=on_sort_column)
        with dir_col:
            ui.chip_filter(SORT_DIR, ["asc", "desc"], {"asc": "↑ Crescente", "desc": "↓ Decrescente"}, "desc")

        page_count = max(1, -(-total // PAGE_SIZE))
        page = min(max(1, int(S.get(f"{TABLE}-page", 1))), page_count)
        frame = pd.DataFrame([{label: cell(n, k) for k, label, _ in ANALYTIC_COLUMNS} for n in page_rows])
        # A new key per page/order drops the row selected on another page (the button would name a different norma).
        acted = compat.row_action(f"{TABLE}-{S[f'{TABLE}-generation']}-{page}", frame, lambda i: f"{chat.TEXTS['askAbout']} {norma_name(page_rows[i])}",
                                  height=table_height(len(frame)), column_config={"Tema": st.column_config.TextColumn(width="large")})
        if acted is not None:
            chat.ask(chat.chat_state(), f"Quais são os pontos principais da {norma_name(page_rows[acted])}?")
        first, last = (page - 1) * PAGE_SIZE + 1, min(total, page * PAGE_SIZE)
        range_col, pager_col = compat.hstack([1, 2], key="triagent-table-nav")
        range_col.html(f'<span class="brand-muted brand-small">{fmt_int(first)}–{fmt_int(last)} de {fmt_int(total)}</span>')
        with pager_col:
            compat.pager(TABLE, total, PAGE_SIZE)
