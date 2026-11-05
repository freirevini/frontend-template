"""Triagent: segment cards with the 'a classificar' page filter, Normativos Recebidos, classification cards (pie and
themes, cross-filtered), Fluxo de e-mail - Triagem and the Tabela Analítica with Excel and the agent button."""
import html
import re
import unicodedata

import pandas as pd
import streamlit as st

from core import chat
from core.charts import PLOTLY_CONFIG, doughnut, emails_chart, traffic_chart
from core.data import (LATEST_EMAILS, aggregate_classification, aggregate_emails, classification, emails, filter_classified,
                       segments, sent_datetime, traffic, traffic_series)
from core.period import default_selection, fmt_date, fmt_decimal, fmt_int, fmt_percent, iso
from core.tokens import SEGMENT_IDS, SEGMENT_LABELS, TO_CLASSIFY_LABEL, tokens
from core.ui import card, card_title, clicklist, filter_notice, period_filter, scroll_to_section, section_anchor, segment_cards
from core.xlsx import XLSX_MIME, XlsxColumn, XlsxTable, build_xlsx

t = tokens()
S = st.session_state
for key, value in (("tri-segment", None), ("tri-applicability", None), ("tri-theme", None), ("tri-highlight", None), ("emails-highlight", None)):
    S.setdefault(key, value)

APPLICABILITY_LABELS = {"Aplicável": "Sim", "Aplicável parcialmente": "Parcialmente", "Não aplicável": "Não"}
ANALYTIC_COLUMNS = [("classifiedAt", "Data da classificação", 14), ("orgao", "Órgão", 10), ("tipo", "Tipo", 22), ("numero", "Número", 10),
                    ("theme", "Tema", 48), ("segment", "Segmento", 14), ("applicable", "Aplicável ao banco?", 12), ("area", "Área", 30), ("diretoria", "Diretoria", 16)]
PAGE_SIZE = 15


def plural(n: int, one: str, many: str) -> str:
    return f"{fmt_int(n)} {one if n == 1 else many}"


def clear_segment_filter() -> None:
    S["tri-segment"] = None
    if S["tri-highlight"] == 4:
        S["tri-highlight"] = None


# --- 1. Cards de segmento ------------------------------------------------------------------------------------------------------
section_anchor("segmentos")
clicked = segment_cards("triagent", segments(), active=S["tri-segment"])
if clicked:
    if S["tri-segment"] == clicked:
        clear_segment_filter()
    else:
        S["tri-segment"], S["tri-highlight"] = clicked, 4
    st.rerun()

if S["tri-segment"]:
    if filter_notice("segment", f"Filtro: <strong>normas a classificar · {SEGMENT_LABELS[S['tri-segment']]}</strong>. Aplicado aos cards, aos gráficos "
                     "Normativos Recebidos, Normas Aplicáveis e Assunto das Normas Aplicáveis, ao Fluxo de e-mail - Triagem e à Tabela Analítica."):
        clear_segment_filter()
        st.rerun()

# --- 2. Normativos Recebidos --------------------------------------------------------------------------------------------------------
sel = S.get("pf-traffic") or default_selection("Month")
data = traffic(sel.period, sel.bounds)
highlighted = S["tri-highlight"]
dashed_focus = SEGMENT_IDS[highlighted] if highlighted is not None and highlighted < 4 else S["tri-segment"]
series = traffic_series(data, dashed_focus)
series_ids = SEGMENT_IDS + ["to-classify"]
series_labels = [SEGMENT_LABELS[s] for s in SEGMENT_IDS] + [TO_CLASSIFY_LABEL + (f" · {SEGMENT_LABELS[dashed_focus]}" if dashed_focus else "")]
series_colors = t["series"] + [t["series_reference"]]
totals = [sum(series[s]) for s in series_ids]
grand = sum(totals) or 1


def traffic_xlsx() -> bytes:
    filt = f" · filtro: normas a classificar · {SEGMENT_LABELS[S['tri-segment']]}" if S["tri-segment"] else ""
    keys = [f"s{i}" for i in range(5)]
    return build_xlsx(XlsxTable(
        sheet_name="Normativos Recebidos", title="Normativos recebidos por segmento", subtitle=f"{data.subtitle}{filt}",
        columns=[XlsxColumn("period", "Período", width=16)] + [XlsxColumn(keys[i], series_labels[i], "#,##0", max(14, len(series_labels[i]) + 4)) for i in range(5)],
        rows=[{"period": label, **{keys[i]: series[series_ids[i]][p] for i in range(5)}} for p, label in enumerate(data.labels)],
        totals={"period": "Total", **{keys[i]: totals[i] for i in range(5)}},
        file_name=f"normativos-recebidos-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}{'-a-classificar-' + S['tri-segment'] if S['tri-segment'] else ''}.xlsx",
    ))


with card("normativos-recebidos"):
    with st.container(horizontal=True, vertical_alignment="top", key="traffic-head"):
        card_title("Normativos Recebidos", html.escape(data.subtitle), anchor="normativos-recebidos")
        view = st.pills("Forma de exibição", ["chart", "table"], format_func=lambda v: {"chart": "Gráfico", "table": "Tabela"}[v],
                        default=S.get("traffic-view", "chart"), key="traffic-view", label_visibility="collapsed", required=True)
        if view == "table":
            xlsx = traffic_xlsx()
            st.download_button("Exportar Excel", data=xlsx, file_name=f"normativos-recebidos-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}.xlsx",
                               mime=XLSX_MIME, key="traffic-export", type="primary", icon=":material/table_view:", on_click="ignore")
    sel = period_filter("traffic", label="Período dos normativos recebidos")
    if view == "chart":
        st.plotly_chart(traffic_chart(t, data, highlighted, S["tri-segment"], t["surface_card"]), height=300, config=PLOTLY_CONFIG, theme=None, key="traffic-chart")
    else:
        rows = [{"Período": label, **{series_labels[i]: series[series_ids[i]][p] for i in range(5)}} for p, label in enumerate(data.labels)]
        rows.append({"Período": "Total", **{series_labels[i]: totals[i] for i in range(5)}})
        st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch", key="traffic-table",
                     column_config={label: st.column_config.NumberColumn(label, format="localized") for label in series_labels})
    legend = []
    for i in range(5):
        dimmed = highlighted is not None and highlighted != i and i != 4
        share = totals[i] / grand
        key_class = "brand-legend-key--dashed" if i == 4 else ""
        legend.append(
            f'<button type="button" class="brand-traffic-legend {"is-active" if highlighted == i else ""} {"is-dimmed" if dimmed else ""}" data-value="{i}" '
            f'title="{"Mostrar todas as séries" if highlighted == i else "Destacar " + html.escape(series_labels[i]) + " no gráfico"}">'
            f'<span class="brand-muted"><span class="brand-legend-key {key_class}" style="border-top-color:{series_colors[i]}"></span>{html.escape(series_labels[i])}</span>'
            f'<strong>{fmt_int(totals[i])} normas ({fmt_percent(share)})</strong>'
            f'<span class="brand-progress-thin"><span style="width:{share * 100:.1f}%;background:{series_colors[i]}"></span></span></button>')
    picked = clicklist("traffic-legend", f'<div class="brand-traffic-legend-row">{"".join(legend)}</div>')
    if picked is not None:
        index = int(picked)
        S["tri-highlight"] = None if S["tri-highlight"] == index else index
        st.rerun()

# --- 3 e 4. Classificação das normas ---------------------------------------------------------------------------------------------------
normas = classification()
if S["tri-applicability"] is not None or S["tri-theme"] is not None:
    parts = []
    if S["tri-applicability"] is not None:
        parts.append("Aplicáveis" if S["tri-applicability"] else "Não aplicáveis")
    if S["tri-theme"] is not None:
        parts.append(f"Tema: {html.escape(S['tri-theme'])}")
    if filter_notice("classification", f"Filtro: <strong>{' · '.join(parts)}</strong>. Aplicado aos gráficos Normas Aplicáveis e Assunto das Normas Aplicáveis e à Tabela Analítica."):
        S["tri-applicability"] = S["tri-theme"] = None
        st.rerun()

seg_note = f" · {SEGMENT_LABELS[S['tri-segment']]}" if S["tri-segment"] else ""
col_pie, col_themes = st.columns([5, 7], gap="medium")
with col_pie, card("normas-aplicaveis"):
    agg = aggregate_classification(normas, sel.bounds, segment=S["tri-segment"], theme=S["tri-theme"])
    theme_note = f" · Tema: {html.escape(S['tri-theme'])}" if S["tri-theme"] else ""
    card_title("Normas Aplicáveis", f"{html.escape(data.subtitle)}{seg_note}{theme_note}", anchor="normas-aplicaveis")
    if agg.total == 0:
        st.html('<p class="brand-placeholder brand-muted">Nenhuma norma classificada neste período.</p>')
    else:
        st.plotly_chart(doughnut(t, agg.applicable, agg.not_applicable, S["tri-applicability"], t["surface_card"]), height=220, config=PLOTLY_CONFIG, theme=None, key="pie")
        slices = [(True, "Aplicáveis", agg.applicable, agg.applicable_share, t["applicable"]),
                  (False, "Não aplicáveis", agg.not_applicable, (1 - agg.applicable_share) if agg.total else 0, t["not_applicable"])]
        items = []
        for value, label, count, share, color in slices:
            active = S["tri-applicability"] == value
            dimmed = S["tri-applicability"] is not None and not active
            items.append(f'<li><button type="button" class="brand-pie-legend {"is-active" if active else ""} {"is-dimmed" if dimmed else ""}" data-value="{str(value).lower()}">'
                         f'<span class="brand-pie-legend-label"><span class="brand-classification-key" style="background:{color}"></span>{label}</span>'
                         f'<span class="brand-pie-legend-value">{fmt_int(count)} <span>{fmt_percent(share)}</span></span></button></li>')
        picked = clicklist("pie-legend", f'<ul class="brand-pie-legend-list">{"".join(items)}</ul>')
        if picked is not None:
            value = picked == "true"
            S["tri-applicability"] = None if S["tri-applicability"] == value else value
            st.rerun()

with col_themes, card("assunto-das-normas"):
    lists_not_applicable = S["tri-applicability"] is False
    agg2 = aggregate_classification(normas, sel.bounds, segment=S["tri-segment"], themes_of=not lists_not_applicable)
    card_title(f"Assunto das Normas {'Não Aplicáveis' if lists_not_applicable else 'Aplicáveis'}", f"{html.escape(data.subtitle)}{seg_note}", anchor="assunto-das-normas")
    if agg2.themes_total == 0:
        st.html(f'<p class="brand-placeholder brand-muted">Nenhuma norma {"não aplicável" if lists_not_applicable else "aplicável"} neste período.</p>')
    else:
        rows = []
        for theme in agg2.themes:
            active = S["tri-theme"] == theme.label
            dimmed = S["tri-theme"] is not None and not active
            width = max(1.5, theme.width * 100) if theme.width > 0 else 0
            rows.append(f'<li><button type="button" class="brand-theme-row {"is-active" if active else ""} {"is-dimmed" if dimmed else ""}" data-value="{html.escape(theme.label, quote=True)}" '
                        f'title="{"Remover filtro" if active else html.escape(theme.label) + ": filtrar a pizza por este tema"}">'
                        f'<span class="brand-theme-label">{html.escape(theme.label)}</span><span class="brand-theme-track"><span class="brand-theme-fill {"is-not-applicable" if lists_not_applicable else ""}" style="width:{width:.1f}%"></span></span>'
                        f'<span class="brand-theme-value">{fmt_int(theme.count)} <span>{fmt_percent(theme.share)}</span></span></button></li>')
        if agg2.others:
            o = agg2.others
            rows.append(f'<li class="brand-theme-row is-other"><span class="brand-theme-label">{o.label} ({o.grouped} {"tema" if o.grouped == 1 else "temas"})</span><span class="brand-theme-track"></span>'
                        f'<span class="brand-theme-value">{fmt_int(o.count)} <span>{fmt_percent(o.share)}</span></span></li>')
        picked = clicklist("themes", f'<ol class="brand-theme-bars">{"".join(rows)}</ol>')
        if picked is not None:
            S["tri-theme"] = None if S["tri-theme"] == picked else picked
            st.rerun()

# --- 5. Fluxo de e-mail - Triagem ----------------------------------------------------------------------------------------------------------
esel = S.get("pf-emails") or default_selection("Month")
all_emails = emails()
eagg = aggregate_emails(all_emails, esel.period, esel.bounds, S["tri-segment"])
positions = [i for i in range(4) if not S["tri-segment"] or SEGMENT_IDS[i] == S["tri-segment"]]


def emails_xlsx() -> bytes:
    keys = [f"s{p}" for p in positions]
    filt = f" · segmento: {SEGMENT_LABELS[S['tri-segment']]}" if S["tri-segment"] else ""
    return build_xlsx(XlsxTable(
        sheet_name="E-mails", title="Fluxo de e-mail - Triagem", subtitle=f"{eagg.subtitle}{filt}",
        columns=[XlsxColumn("period", "Período", width=16), XlsxColumn("emails", "E-mails", "#,##0", 12)]
                + [XlsxColumn(keys[i], SEGMENT_LABELS[SEGMENT_IDS[p]], "#,##0", 16) for i, p in enumerate(positions)]
                + [XlsxColumn("total", "Total de normas", "#,##0", 18)],
        rows=[{"period": b.label, "emails": b.emails, **{keys[i]: b.normas[p] for i, p in enumerate(positions)}, "total": b.total} for b in eagg.buckets],
        totals={"period": "Total", "emails": eagg.emails, **{keys[i]: eagg.segment_normas[p] for i, p in enumerate(positions)}, "total": eagg.normas},
        file_name=f"fluxo-email-triagem-{iso(esel.bounds.start)}-a-{iso(esel.bounds.end)}{'-' + S['tri-segment'] if S['tri-segment'] else ''}.xlsx",
    ))


with card("fluxo-de-email"):
    with st.container(horizontal=True, vertical_alignment="top", key="emails-head"):
        card_title("Fluxo de e-mail - Triagem", f"{html.escape(eagg.subtitle)}{seg_note}", anchor="fluxo-de-email")
        eview = st.pills("Forma de exibição e-mails", ["chart", "table"], format_func=lambda v: {"chart": "Gráfico", "table": "Tabela"}[v],
                         default=S.get("emails-view", "chart"), key="emails-view", label_visibility="collapsed", required=True)
        if eview == "table":
            st.download_button("Exportar Excel", data=emails_xlsx(), file_name="fluxo-email-triagem.xlsx", mime=XLSX_MIME, key="emails-export",
                               icon=":material/table_view:", on_click="ignore")
    esel = period_filter("emails", periods=("Day", "Month"), label="Período dos e-mails")
    st.html(f'<dl class="brand-emails-stats"><div><dt>E-mails enviados</dt><dd>{fmt_int(eagg.emails)}</dd></div>'
            f'<div><dt>Normas sugeridas</dt><dd>{fmt_int(eagg.normas)} <span class="brand-emails-note">{fmt_int(eagg.distinct_normas)} {"distinta" if eagg.distinct_normas == 1 else "distintas"}</span></dd></div>'
            f'<div><dt>Média por e-mail</dt><dd>{fmt_decimal(eagg.average_per_email, 1)}</dd></div></dl>')
    if eagg.emails == 0:
        st.html('<p class="brand-placeholder brand-muted">Nenhum e-mail enviado neste período.</p>')
    else:
        ehl = S["emails-highlight"]
        if eview == "chart":
            st.plotly_chart(emails_chart(t, eagg.buckets, positions, ehl, t["surface_card"]), height=300, config=PLOTLY_CONFIG, theme=None, key="emails-chart")
        else:
            rows = [{"Período": b.label, "E-mails": b.emails, **{SEGMENT_LABELS[SEGMENT_IDS[p]]: b.normas[p] for p in positions}, "Total de normas": b.total} for b in eagg.buckets]
            rows.append({"Período": "Total", "E-mails": eagg.emails, **{SEGMENT_LABELS[SEGMENT_IDS[p]]: eagg.segment_normas[p] for p in positions}, "Total de normas": eagg.normas})
            st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch", key="emails-table")
        items = []
        for p in positions:
            color = t["series"][p]
            items.append(f'<li><button type="button" class="brand-emails-legend {"is-active" if ehl == p else ""} {"is-dimmed" if ehl is not None and ehl != p else ""}" data-value="{p}">'
                         f'<span class="brand-swatch" style="background:{color}"></span>{SEGMENT_LABELS[SEGMENT_IDS[p]]} · {plural(eagg.segment_normas[p], "norma", "normas")}</button></li>')
        picked = clicklist("emails-legend", f'<ul class="brand-emails-legend-list">{"".join(items)}</ul>')
        if picked is not None:
            S["emails-highlight"] = None if ehl == int(picked) else int(picked)
            st.rerun()
        st.html('<h5 class="brand-emails-list-title">Últimos e-mails</h5>')
        for email in eagg.list[:LATEST_EMAILS]:
            seg_name = SEGMENT_LABELS[email["segment"]]
            with st.expander(f"{fmt_date(sent_datetime(email).date())} · {seg_name} · {plural(len(email['normas']), 'norma', 'normas')}", icon=":material/chevron_right:"):
                table = pd.DataFrame([{"Órgão": n["orgao"], "Tipo": n["tipo"], "Número": n["numero"], "Tema": n["title"],
                                       "Aplicável ao segmento?": APPLICABILITY_LABELS.get(n["suggestedClass"], n["suggestedClass"]),
                                       "Área": n["area"], "Diretoria": n["diretoria"]} for n in email["normas"]])
                st.dataframe(table, hide_index=True, width="stretch", key=f"email-{email['id']}", column_config={"Órgão": st.column_config.TextColumn(pinned=True)})

# --- 6. Tabela Analítica ----------------------------------------------------------------------------------------------------------------------
def cell(norma: dict, key: str) -> str:
    if key == "classifiedAt":
        return fmt_date(pd.Timestamp(norma["classifiedAt"]).date())
    if key == "segment":
        return SEGMENT_LABELS.get(norma["segment"], norma["segment"])
    if key == "applicable":
        return "Sim" if norma["applicable"] else "Não"
    return norma[key]


def act_number(numero: str) -> float:
    try:
        return float(numero.replace(".", "").replace(",", "."))
    except ValueError:
        return 0.0


def collate(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn").casefold()


def slug(text: str) -> str:
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", collate(text)))[:40].rstrip("-")


S.setdefault("tbl-sort", "classifiedAt")
S.setdefault("tbl-dir", "desc")
filtered = filter_classified(normas, sel.bounds, segment=S["tri-segment"], theme=S["tri-theme"], applicable=S["tri-applicability"])
sort_key, direction = S["tbl-sort"], 1 if S["tbl-dir"] == "asc" else -1


def sort_value(n: dict):
    if sort_key == "classifiedAt":
        return n["classifiedAt"]
    if sort_key == "numero":
        return act_number(n["numero"])
    return collate(cell(n, sort_key))


rows = sorted(filtered, key=lambda n: (n["classifiedAt"], n["code"]))
rows.sort(key=lambda n: n["classifiedAt"], reverse=True)
rows.sort(key=sort_value, reverse=direction < 0)
active_filters = ([f"Segmento: {SEGMENT_LABELS[S['tri-segment']]}"] if S["tri-segment"] else []) + \
                 ([("Aplicáveis" if S["tri-applicability"] else "Não aplicáveis")] if S["tri-applicability"] is not None else []) + \
                 ([f"Tema: {S['tri-theme']}"] if S["tri-theme"] else [])


def analytic_xlsx() -> bytes:
    suffix = [s for s in (S["tri-segment"], None if S["tri-applicability"] is None else ("aplicaveis" if S["tri-applicability"] else "nao-aplicaveis"),
                          f"tema-{slug(S['tri-theme'])}" if S["tri-theme"] else None) if s]
    return build_xlsx(XlsxTable(
        sheet_name="Tabela Analítica", title="Tabela Analítica — normas classificadas",
        subtitle=f"{data.subtitle} · {plural(len(rows), 'norma', 'normas')}{' · filtros: ' + ' · '.join(active_filters) if active_filters else ''}",
        columns=[XlsxColumn(k, label, width=w) for k, label, w in ANALYTIC_COLUMNS],
        rows=[{k: cell(n, k) for k, _, _ in ANALYTIC_COLUMNS} for n in rows],
        file_name=f"tabela-analitica-{iso(sel.bounds.start)}-a-{iso(sel.bounds.end)}{'-' + '-'.join(suffix) if suffix else ''}.xlsx",
    ))


with card("tabela-analitica"):
    with st.container(horizontal=True, vertical_alignment="top", key="analytic-head"):
        card_title("Tabela Analítica", f"{html.escape(data.subtitle)} · {plural(len(rows), 'norma', 'normas')}", anchor="tabela-analitica")
        st.download_button("Exportar Excel", data=analytic_xlsx() if rows else b"", file_name="tabela-analitica.xlsx", mime=XLSX_MIME,
                           key="analytic-export", icon=":material/table_view:", disabled=not rows, on_click="ignore")
    if active_filters:
        st.html('<p class="brand-analytic-filters brand-small">Filtros aplicados: ' + "".join(f'<span class="brand-analytic-filter">{html.escape(f)}</span>' for f in active_filters) + "</p>")
    else:
        st.html('<p class="brand-analytic-filters brand-small brand-muted">Sem filtros: todas as normas classificadas no período do gráfico Normativos Recebidos.</p>')
    if not rows:
        st.html('<p class="brand-placeholder brand-muted">Nenhuma norma para os filtros aplicados.</p>')
    else:
        with st.container(horizontal=True, vertical_alignment="center", gap="small", key="analytic-sort"):
            st.html('<span class="brand-muted brand-small">Ordenar por</span>')
            st.selectbox("Ordenar por", [k for k, _, _ in ANALYTIC_COLUMNS], format_func=lambda k: dict((a, b) for a, b, _ in ANALYTIC_COLUMNS)[k],
                         key="tbl-sort", label_visibility="collapsed", width=220)
            st.segmented_control("Direção", ["asc", "desc"], format_func=lambda d: {"asc": "↑ Crescente", "desc": "↓ Decrescente"}[d], key="tbl-dir", label_visibility="collapsed")
        page_count = max(1, (len(rows) + PAGE_SIZE - 1) // PAGE_SIZE)
        page = min(S.get("tbl-page", 1) or 1, page_count)
        page_rows = rows[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
        frame = pd.DataFrame([{label: cell(n, k) for k, label, _ in ANALYTIC_COLUMNS} | {"Agente da Agenda": ":material/chat_bubble:"} for n in page_rows])

        def ask_agent():
            click = st.session_state.get("analytic-ask")
            if click is not None:
                norma = page_rows[click["row"]]
                name = f"{norma['tipo']} {norma['orgao']} nº {norma['numero']}"
                st.session_state["chat-open-request"] = f"Quais são os pontos principais da {name}?"

        st.dataframe(frame, hide_index=True, width="stretch", key="analytic-table",
                     column_config={"Tema": st.column_config.TextColumn(width="large"),
                                    "Agente da Agenda": st.column_config.ButtonColumn("", type="tertiary", width="small", on_click=ask_agent, key="analytic-ask",
                                                                                      help="Perguntar ao Agente da Agenda sobre a norma")})
        if st.session_state.get("chat-open-request"):
            chat.ask(chat.chat_state(), st.session_state.pop("chat-open-request"))
        first, last = (page - 1) * PAGE_SIZE + 1, min(len(rows), page * PAGE_SIZE)
        with st.container(horizontal=True, vertical_alignment="center", key="analytic-pager"):
            st.html(f'<span class="brand-muted brand-small">{fmt_int(first)}–{fmt_int(last)} de {fmt_int(len(rows))}</span>')
            st.pagination(page_count, default=page, key="tbl-page")

scroll_to_section(st.query_params.get("secao"))
