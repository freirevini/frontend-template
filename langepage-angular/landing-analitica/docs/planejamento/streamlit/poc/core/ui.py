"""UI helpers on top of Streamlit: tokens as CSS variables, cards, chips, period filter, segment cards, section anchors,
the Components v2 'clicklist' (HTML rows that send the clicked value back to Python) and the CoreUI icons inline."""
from __future__ import annotations

import html
import re
from datetime import date
from pathlib import Path
from typing import Callable, Optional

import streamlit as st

from core.charts import PLOTLY_CONFIG, sparkline
from core.period import (DEFAULT_TRAFFIC_RANGE, PERIOD_LABELS, TRAFFIC_RANGES, DateRange, PeriodSelection, default_selection,
                         fmt_int, preset_range, validate_custom_range)
from core.tokens import css_variables, segment_color, theme_type, tokens

STATIC = Path(__file__).resolve().parent.parent / "static"
MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]


# --- Icons (CoreUI SVGs, inline so they take currentColor) ---------------------------------------------------------------
@st.cache_data(show_spinner=False)
def _svg(name: str) -> str:
    # Accepts both spellings: "cil-truck" (file) and "cilTruck" (icon name in the mock JSON, as in icon-subset.ts).
    if not name.startswith("cil-"):
        name = "cil-" + re.sub(r"(?<!^)(?=[A-Z])", "-", name[3:]).lower()
    text = (STATIC / "icons" / f"{name}.svg").read_text(encoding="utf-8")
    return text[text.find("<svg"):]


def icon(name: str, size: str = "1rem", extra_class: str = "") -> str:
    return f'<span class="brand-icon {extra_class}" style="width:{size};height:{size}" aria-hidden="true">{_svg(name)}</span>'


# --- Global CSS -----------------------------------------------------------------------------------------------------------
def inject_css() -> dict:
    t = tokens()
    # Dark-only rules (the Angular project keys them on [data-theme="dark"]; here Python knows the viewer's theme).
    dark_only = """
    [class*="st-key-seg-"] { background: linear-gradient(135deg, rgba(0,0,0,.16), rgba(0,0,0,.3)), linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-high) 100%); }
    [class*="st-key-seg-scalation"] { background: linear-gradient(135deg, rgba(0,0,0,.16), rgba(0,0,0,.3)), linear-gradient(135deg, #0a5c71 0%, var(--brand-sidebar) 100%); }
    [data-testid="stButtonGroup"] button { background: transparent; }
    """ if theme_type() == "dark" else ""
    st.html(f"<style>{css_variables(t)}\n{(STATIC / 'app.css').read_text(encoding='utf-8')}\n{dark_only}</style>")
    return t


# --- Cards and headings ---------------------------------------------------------------------------------------------------
def card(key: str):
    return st.container(border=True, key=f"card-{key}")


def card_title(title: str, subtitle: str = "", anchor: Optional[str] = None) -> None:
    anchor_html = f'<span id="{anchor}" class="page-section"></span>' if anchor else ""
    st.html(f'{anchor_html}<div class="brand-card-head"><h4 class="brand-card-title">{html.escape(title)}</h4>'
            f'<div class="brand-card-subtitle">{subtitle}</div></div>')


def section_anchor(section_id: str) -> None:
    st.html(f'<div id="{section_id}" class="page-section"></div>')


def scroll_to_section(section_id: Optional[str]) -> None:
    """Sidebar sub-items arrive with ?secao=<id>: align that section below the sticky header while the page settles
    (same idea as SectionScrollService: re-align on resize for 2.5 s, stop at the first user gesture)."""
    if not section_id:
        return
    st.html(f"""<script>
(function() {{
  const id = {section_id!r};
  const main = document.querySelector('[data-testid="stMain"]') || document.scrollingElement;
  let stopped = false;
  const align = () => {{
    const el = document.getElementById(id);
    if (!el || stopped) return;
    const top = el.getBoundingClientRect().top + main.scrollTop - 88;
    main.scrollTo({{ top: Math.max(0, top) }});
  }};
  const stop = () => {{ stopped = true; observer.disconnect(); }};
  const observer = new ResizeObserver(() => align());
  observer.observe(document.body);
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((n) => window.addEventListener(n, stop, {{ passive: true, once: true }}));
  align();
  setTimeout(stop, 2500);
}})();
</script>""", unsafe_allow_javascript=True)


# --- Components v2: HTML rows that report clicks ---------------------------------------------------------------------------
_CLICKLIST_JS = """
export default function(component) {
  const { parentElement, data, setTriggerValue } = component;
  let host = parentElement.querySelector('.brand-clicklist');
  if (!host) {
    host = document.createElement('div');
    host.className = 'brand-clicklist';
    parentElement.appendChild(host);
  }
  host.innerHTML = data;
  host.querySelectorAll('[data-value]').forEach((el) => {
    el.addEventListener('click', () => setTriggerValue('picked', el.getAttribute('data-value')));
  });
  return () => host.remove();
}
"""
_clicklist = st.components.v2.component("brand_clicklist", js=_CLICKLIST_JS, isolate_styles=False)


def clicklist(key: str, markup: str) -> Optional[str]:
    """Renders trusted HTML (buttons with data-value) and returns the value clicked in this run, if any."""
    result = _clicklist(key=key, data=markup, on_picked_change=lambda: None)
    return getattr(result, "picked", None)


# --- Chips and segmented control ---------------------------------------------------------------------------------------------
def segmented(key: str, options: list, labels: dict, default, on_change: Optional[Callable] = None):
    return st.segmented_control(key, options, format_func=lambda o: labels.get(o, str(o)), default=default, key=key,
                                label_visibility="collapsed", on_change=on_change)


def chip_filter(key: str, options: list, labels: dict, default, on_change: Optional[Callable] = None):
    return st.pills(key, options, format_func=lambda o: labels.get(o, str(o)), default=default, key=key,
                    label_visibility="collapsed", on_change=on_change, required=True)


# --- Period filter (port of <app-period-filter>) --------------------------------------------------------------------------------
def period_filter(key: str, periods: tuple = ("Day", "Month", "Year"), label: str = "Período") -> PeriodSelection:
    state_key = f"pf-{key}"
    if state_key not in st.session_state:
        st.session_state[state_key] = default_selection("Month")
        st.session_state[f"{state_key}-open"] = False
        st.session_state[f"{state_key}-notice"] = None
        st.session_state[f"{state_key}-error"] = None
    sel: PeriodSelection = st.session_state[state_key]

    def on_period():
        new = st.session_state[f"{state_key}-g"]
        cur: PeriodSelection = st.session_state[state_key]
        notice = None
        if cur.range is None and validate_custom_range(new, cur.bounds.start, cur.bounds.end) is None:
            st.session_state[state_key] = PeriodSelection(new, None, cur.bounds)
        else:
            if cur.range is None:
                opt = next((l for c, l in TRAFFIC_RANGES[new] if c == DEFAULT_TRAFFIC_RANGE[new]), "períodos")
                notice = f"O intervalo personalizado não cabe nesta visão; mostrando os últimos {opt}."
            st.session_state[state_key] = default_selection(new)
        st.session_state[f"{state_key}-notice"] = notice
        st.session_state[f"{state_key}-open"] = False
        st.session_state[f"{state_key}-error"] = None
        st.session_state[f"{state_key}-r"] = st.session_state[state_key].range or "custom"

    def on_range():
        picked = st.session_state[f"{state_key}-r"]
        cur: PeriodSelection = st.session_state[state_key]
        st.session_state[f"{state_key}-notice"] = None
        st.session_state[f"{state_key}-error"] = None
        if picked == "custom":
            st.session_state[f"{state_key}-open"] = not st.session_state[f"{state_key}-open"]
            return
        st.session_state[f"{state_key}-open"] = False
        st.session_state[state_key] = PeriodSelection(cur.period, picked, preset_range(cur.period, picked))

    with st.container(key=f"{state_key}-bar", horizontal=True, vertical_alignment="center", gap="small"):
        with st.container(key=f"{state_key}-gwrap"):
            st.segmented_control(label, list(periods), format_func=lambda p: PERIOD_LABELS[p], default=sel.period,
                                 key=f"{state_key}-g", label_visibility="collapsed", on_change=on_period)
        st.html('<span class="brand-muted">Últimos</span>')
        ranges = TRAFFIC_RANGES[sel.period]
        range_labels = {c: l for c, l in ranges} | {"custom": "Personalizado"}
        st.pills(label + " faixa", [c for c, _ in ranges] + ["custom"], format_func=lambda o: range_labels[o],
                 default=sel.range if sel.range is not None else "custom", key=f"{state_key}-r",
                 label_visibility="collapsed", on_change=on_range, required=True)

    notice = st.session_state[f"{state_key}-notice"]
    if notice and not st.session_state[f"{state_key}-open"]:
        st.html(f'<div class="brand-muted brand-small">{html.escape(notice)}</div>')

    if st.session_state[f"{state_key}-open"]:
        with st.container(key=f"{state_key}-custom", horizontal=True, vertical_alignment="bottom", gap="small"):
            start = st.date_input("De", value=sel.bounds.start, format="DD/MM/YYYY", key=f"{state_key}-start", width=150)
            end = st.date_input("Até", value=sel.bounds.end, format="DD/MM/YYYY", key=f"{state_key}-end", width=150)
            if st.button("Aplicar", key=f"{state_key}-apply", type="primary"):
                error = validate_custom_range(sel.period, start, end)
                st.session_state[f"{state_key}-error"] = error
                if not error:
                    st.session_state[state_key] = PeriodSelection(sel.period, None, DateRange(start, end))
                    st.session_state[f"{state_key}-open"] = False
                    st.session_state[f"{state_key}-notice"] = None
                    st.rerun()
            if st.button("Cancelar", key=f"{state_key}-cancel"):
                st.session_state[f"{state_key}-open"] = False
                st.session_state[f"{state_key}-r"] = sel.range or "custom"
                st.rerun()
        if st.session_state[f"{state_key}-error"]:
            st.html(f'<div class="brand-error brand-small">{html.escape(st.session_state[f"{state_key}-error"])}</div>')
    return st.session_state[state_key]


# --- Segment cards (port of <app-widgets-dropdown> and <app-segment-overview>) ------------------------------------------------
def segment_cards(key: str, items: list[dict], tone: str = "primary", filterable: bool = True, active: Optional[str] = None) -> Optional[str]:
    """Four stat cards; returns the id whose 'a classificar' badge was clicked in this run."""
    t = tokens()
    clicked = None
    cols = st.columns(4, gap="medium")
    for col, seg in zip(cols, items):
        state = "is-filtered" if active == seg["id"] else ("is-dimmed" if active else "")
        with col, st.container(key=f"seg-{key}-{seg['id']}"):
            st.html(f'<div class="brand-stat {tone} {state}"></div>'
                    f'<div class="brand-stat-title">{icon(seg["icon"], "1.125rem")}<span>{html.escape(seg["label"])}</span></div>')
            with st.container(horizontal=True, vertical_alignment="center", gap="small"):
                st.html(f'<div class="brand-stat-value">{fmt_int(seg["total"])}</div>')
                pending = f'{fmt_int(seg["toClassify"])} a classificar'
                if filterable:
                    if st.button(pending, key=f"seg-btn-{key}-{seg['id']}", type="tertiary",
                                 help=("Remover filtro de normas a classificar" if active == seg["id"] else f"Filtrar a página pelas normas a classificar de {seg['label']}")):
                        clicked = seg["id"]
                else:
                    st.html(f'<span class="brand-stat-pending">{pending}</span>')
            labels = MONTHS_PT[: len(seg["trend"])]
            st.plotly_chart(sparkline(t, seg["trend"], labels, f"Normas · {seg['label']}"), height=70, config=PLOTLY_CONFIG, theme=None,
                            key=f"seg-chart-{key}-{seg['id']}")
    return clicked


def segment_overview(items: list[dict]) -> None:
    """Início: one card per segment with a header in the segment color, an area sparkline and two figures."""
    t = tokens()
    cols = st.columns(4, gap="medium")
    for col, seg in zip(cols, items):
        color = segment_color(t, seg["id"])
        with col, st.container(key=f"ovw-{seg['id']}"):
            st.html(f'<div class="brand-overview-head" style="--segment-color:{color}">{icon(seg["icon"], "1.5rem")}'
                    f'<span class="brand-overview-name">{html.escape(seg["label"])}</span></div>')
            st.plotly_chart(sparkline(t, seg["trend"], MONTHS_PT[: len(seg["trend"])], f"Normas · {seg['label']}", height=64, area=True),
                            height=64, config=PLOTLY_CONFIG, theme=None, key=f"ovw-chart-{seg['id']}")
            st.html(f'<div class="brand-overview-values"><div><strong>{fmt_int(seg["total"])}</strong><span>normas</span></div>'
                    f'<div><strong>{fmt_int(seg["toClassify"])}</strong><span>a classificar</span></div></div>')


# --- Filter notice ----------------------------------------------------------------------------------------------------------
def filter_notice(key: str, text_html: str) -> bool:
    """Tinted strip with the active filters; returns True when 'Remover filtro' was clicked."""
    with st.container(key=f"notice-{key}", horizontal=True, vertical_alignment="center", gap="small"):
        st.html(f'<div class="brand-notice">{icon("cil-filter", "1rem")}<span>{text_html}</span></div>')
        return st.button("Remover filtro", key=f"notice-btn-{key}")


def header_date(today: date) -> str:
    weekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    return f"{weekdays[today.weekday()]}, {today.day} de {MONTHS_PT[today.month - 1].lower()} de {today.year}"
