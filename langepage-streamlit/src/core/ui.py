"""UI helpers on top of Streamlit 1.40: tokens as CSS variables, Inter, cards, chips, period filter, segment cards,
section anchors/scroll and the CoreUI icons inline. Everything version-specific goes through core.compat."""
from __future__ import annotations

import base64
import html
import json
import re
from datetime import date
from pathlib import Path
from typing import Callable, Optional

import streamlit as st

from core import compat
from core.charts import PLOTLY_CONFIG, sparkline
from core.period import (DEFAULT_TRAFFIC_RANGE, MAX_TRAFFIC_POINTS, PERIOD_END, PERIOD_LABELS, TRAFFIC_RANGES, DateRange, PeriodSelection,
                         default_selection, fmt_int, preset_range, validate_custom_range)

from core.tokens import css_variables, segment_color, tokens

STATIC = Path(__file__).resolve().parent.parent / "static"
# Explicit date_input bounds for the custom range: Streamlit 1.40 derives min/max from `value` (±10 years) otherwise,
# which makes the calendar range float with each preset. The minimum covers the widest valid custom range (30 years).
_CUSTOM_RANGE_MIN = date(PERIOD_END.year - MAX_TRAFFIC_POINTS["Year"], 1, 1)
MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
# url_path of every page (the theme key of Streamlit is per address; the selector writes all of them).
PAGE_SLUGS = ["triagent", "scalation", "analitico", "dashboard"]
FONT_WEIGHTS = (400, 500, 600, 700)


# --- Icons and images --------------------------------------------------------------------------------------------------
# 1.40 serves /app/static/*.svg as text/plain (only raster/font types are trusted) and st.html's sanitizer drops inline
# <svg>: SVGs go as base64 data URIs. CoreUI icons are a CSS mask over currentColor, so they keep the text color.
def _icon_file(name: str) -> Path:
    # Accepts both spellings: "cil-truck" (file) and "cilTruck" (icon name in the mock JSON, as in icon-subset.ts); brand
    # icons too ("cib-google" / "cibGoogle").
    if not name.startswith(("cil-", "cib-")):
        name = name[:3] + "-" + re.sub(r"(?<!^)(?=[A-Z])", "-", name[3:]).lower()
    return STATIC / "icons" / f"{name}.svg"


@st.cache_data(show_spinner=False)
def svg_data_uri(relative_path: str) -> str:
    """data:image/svg+xml;base64 for a file under src/static (e.g. "img/brand-mark-white.svg")."""
    return "data:image/svg+xml;base64," + base64.b64encode((STATIC / relative_path).read_bytes()).decode("ascii")


def icon(name: str, size: str = "1rem", extra_class: str = "") -> str:
    uri = svg_data_uri(str(_icon_file(name).relative_to(STATIC)))
    mask = f"url('{uri}') center / contain no-repeat"
    return (f'<span class="brand-icon {extra_class}" style="width:{size};height:{size};-webkit-mask:{mask};mask:{mask}" '
            f'aria-hidden="true"></span>')


# --- Global CSS -----------------------------------------------------------------------------------------------------------
def _font_faces() -> str:
    # 1.40 has no [[theme.fontFaces]]: Inter is served by static serving (src/static → /app/static).
    return "".join(
        f'@font-face{{font-family:"Inter";font-style:normal;font-weight:{w};font-display:swap;'
        f'src:url("./app/static/fonts/inter-latin-{w}-normal.woff2") format("woff2");}}'
        for w in FONT_WEIGHTS
    )


@st.cache_data(show_spinner=False)
def _stylesheets(mtimes: tuple) -> str:
    """app.css first, then every other src/static/*.css (chat.css, …) in name order."""
    files = sorted(STATIC.glob("*.css"), key=lambda p: (p.name != "app.css", p.name))
    css = "\n".join(p.read_text(encoding="utf-8") for p in files)
    # st.html sanitizes with DOMPurify, which drops a whole <style> whose text has "<" + letter (e.g. "<role>" in a
    # comment): comments go away and any other "<" becomes the CSS escape \3c.
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    return css.replace("<", "\\3c ")


def _dark_only() -> str:
    # The Angular project keys these on [data-theme="dark"]; here Python knows the applied theme (compat probe).
    return """
    [data-testid="stVerticalBlockBorderWrapper"]:has(> div > [class*="st-key-seg-"]) { background: linear-gradient(135deg, rgba(var(--cui-black-rgb), .16), rgba(var(--cui-black-rgb), .3)), linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-high) 100%); }
    [data-testid="stVerticalBlockBorderWrapper"]:has(> div > [class*="st-key-seg-scalation"]) { background: linear-gradient(135deg, rgba(var(--cui-black-rgb), .16), rgba(var(--cui-black-rgb), .3)), linear-gradient(135deg, var(--brand-scalation-start) 0%, var(--brand-sidebar) 100%); }
    [data-testid="stBaseButton-pills"] { background: transparent; }
    [data-testid="stApp"], [data-testid="stHeader"], [data-testid="stBottom"] > div { color-scheme: dark; }
    """


def inject_css(slugs: Optional[list[str]] = None) -> dict:
    """Theme probe + Inter + --brand-* of the applied theme + src/static/*.css + dark-only rules. Call once per run, first
    thing after st.navigation (app.py). Returns the tokens of the applied theme."""
    compat.mount_theme_probe(slugs or PAGE_SLUGS)
    t = tokens()
    mtimes = tuple(p.stat().st_mtime for p in sorted(STATIC.glob("*.css")))
    dark = _dark_only() if compat.theme_type() == "dark" else ""
    with st.container(key="brand-css"):
        st.html(f'<style>{_font_faces()}\n{css_variables(t)}\n{_stylesheets(mtimes)}\n{dark}</style>')
    return t


# --- Cards and headings ---------------------------------------------------------------------------------------------------
def card(key: str):
    """White card (radius, elevation, padding by CSS on .st-key-card-<key>)."""
    return st.container(key=f"card-{key}")


def card_title(title: str, subtitle: str = "", anchor: Optional[str] = None) -> None:
    anchor_html = f'<span id="{anchor}" class="page-section"></span>' if anchor else ""
    st.html(f'{anchor_html}<div class="brand-card-head"><h4 class="brand-card-title">{html.escape(title)}</h4>'
            f'<div class="brand-card-subtitle">{subtitle}</div></div>')


def section_anchor(section_id: str) -> None:
    st.html(f'<div id="{section_id}" class="page-section"></div>')


def chart(fig, key: str) -> None:
    """Plotly figure as the pages show it in 1.40 (height comes from the figure layout)."""
    st.plotly_chart(fig, use_container_width=True, theme=None, key=key, config=PLOTLY_CONFIG)


def scroll_to_section(section_id: Optional[str]) -> None:
    """Align a section below the header while the page settles (same idea as SectionScrollService: re-align on resize
    for 2.5 s, stop at the first user gesture). Called by app.py after the page with compat.consume_section()."""
    if not section_id:
        return
    compat.run_js(f"""
(function() {{
  const doc = window.parent.document;
  const id = {json.dumps(section_id)};
  const main = doc.querySelector('[data-testid="stMain"]') || doc.scrollingElement;
  let stopped = false;
  const align = () => {{
    const el = doc.getElementById(id);
    if (!el || stopped) return;
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 120;  // two-row sticky header (app.css .st-key-app-header)
    main.scrollTo({{ top: Math.max(0, top) }});
  }};
  const observer = new ResizeObserver(() => align());
  const stop = () => {{ stopped = true; observer.disconnect(); }};
  observer.observe(doc.body);
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((n) => window.parent.addEventListener(n, stop, {{ passive: true, once: true }}));
  align();
  setTimeout(align, 300);
  setTimeout(stop, 2500);
}})();""", key="scroll")


# --- Chips and segmented control ---------------------------------------------------------------------------------------------
def _init_choice(key: str, default) -> None:
    if key not in st.session_state:
        st.session_state[key] = default
        st.session_state[f"{key}-prev"] = default
    else:
        # Written again every run so the widget is always sent with its value: a rerun that interrupts the first run (the
        # theme probe answering) leaves the browser without it and the chip shows unselected while the state holds it.
        # A required choice is never empty here (required_choice restores it inside the callback).
        st.session_state[key] = st.session_state[key] if st.session_state[key] is not None else (st.session_state.get(f"{key}-prev") or default)


def segmented(key: str, options: list, labels: dict, default, on_change: Optional[Callable] = None):
    """Single required choice (Dia/Mês/Ano look, wrap the call in a container with key ending in -gwrap)."""
    _init_choice(key, default)

    def changed():
        compat.required_choice(key, f"{key}-prev")
        if on_change:
            on_change()

    return st.segmented_control(key, options, format_func=lambda o: labels.get(o, str(o)), key=key,
                                label_visibility="collapsed", on_change=changed)


def chip_filter(key: str, options: list, labels: dict, default, on_change: Optional[Callable] = None):
    """Single required choice as chips (.filter-chip look)."""
    _init_choice(key, default)

    def changed():
        compat.required_choice(key, f"{key}-prev")
        if on_change:
            on_change()

    return st.pills(key, options, format_func=lambda o: labels.get(o, str(o)), key=key, label_visibility="collapsed",
                    on_change=changed)


# --- Period filter (port of <app-period-filter>) --------------------------------------------------------------------------------
def period_filter(key: str, periods: tuple = ("Day", "Month", "Year"), label: str = "Período") -> PeriodSelection:
    """Granularity (Dia/Mês/Ano) + "Últimos" presets + Personalizado (De/Até, Aplicar/Cancelar, the three validation
    messages) + the notice when a granularity change drops a custom range. Returns the applied PeriodSelection (state in
    st.session_state["pf-<key>"]). Container keys: pf-<key>-bar, pf-<key>-gwrap, pf-<key>-custom."""
    state_key = f"pf-{key}"
    g_key, r_key = f"{state_key}-g", f"{state_key}-r"
    if state_key not in st.session_state:
        initial = default_selection("Month") if "Month" in periods else default_selection(periods[0])
        st.session_state[state_key] = initial
        st.session_state[f"{state_key}-open"] = False
        st.session_state[f"{state_key}-notice"] = None
        st.session_state[f"{state_key}-error"] = None
        st.session_state[g_key] = initial.period
        st.session_state[r_key] = initial.range
    sel: PeriodSelection = st.session_state[state_key]

    def on_period():
        new = st.session_state[g_key]
        cur: PeriodSelection = st.session_state[state_key]
        if new is None:  # unselecting the active granularity keeps it (required choice)
            st.session_state[g_key] = cur.period
            return
        notice = None
        if cur.range is None and validate_custom_range(new, cur.bounds.start, cur.bounds.end) is None:
            st.session_state[state_key] = PeriodSelection(new, None, cur.bounds)
        else:
            if cur.range is None:
                opt = next((lbl for c, lbl in TRAFFIC_RANGES[new] if c == DEFAULT_TRAFFIC_RANGE[new]), "períodos")
                notice = f"O intervalo personalizado não cabe nesta visão; mostrando os últimos {opt}."
            st.session_state[state_key] = default_selection(new)
        st.session_state[f"{state_key}-notice"] = notice
        st.session_state[f"{state_key}-open"] = False
        st.session_state[f"{state_key}-error"] = None
        st.session_state[r_key] = st.session_state[state_key].range or "custom"

    def on_range():
        picked = st.session_state[r_key]
        cur: PeriodSelection = st.session_state[state_key]
        st.session_state[f"{state_key}-notice"] = None
        st.session_state[f"{state_key}-error"] = None
        shown = cur.range if cur.range is not None else "custom"
        if picked is None:  # clicked the selected chip: presets stay; "Personalizado" toggles its panel
            displayed = "custom" if st.session_state[f"{state_key}-open"] else shown
            st.session_state[r_key] = shown
            if displayed == "custom":
                st.session_state[f"{state_key}-open"] = not st.session_state[f"{state_key}-open"]
            return
        if picked == "custom":
            st.session_state[f"{state_key}-open"] = True
            st.session_state[r_key] = shown  # stays on the applied range until "Aplicar"
            return
        st.session_state[f"{state_key}-open"] = False
        st.session_state[state_key] = PeriodSelection(cur.period, picked, preset_range(cur.period, picked))

    def on_apply():
        cur: PeriodSelection = st.session_state[state_key]
        start, end = st.session_state.get(f"{state_key}-start"), st.session_state.get(f"{state_key}-end")
        error = validate_custom_range(cur.period, start, end)
        st.session_state[f"{state_key}-error"] = error
        if not error:
            st.session_state[state_key] = PeriodSelection(cur.period, None, DateRange(start, end))
            st.session_state[f"{state_key}-open"] = False
            st.session_state[f"{state_key}-notice"] = None
            st.session_state[r_key] = "custom"

    def on_cancel():
        cur: PeriodSelection = st.session_state[state_key]
        st.session_state[f"{state_key}-open"] = False
        st.session_state[f"{state_key}-error"] = None
        st.session_state[r_key] = cur.range if cur.range is not None else "custom"

    # Required choices written again every run (see _init_choice: an interrupted first run leaves the chips unselected).
    st.session_state[g_key] = st.session_state.get(g_key) or sel.period
    st.session_state[r_key] = st.session_state.get(r_key) or sel.range or "custom"
    open_ = st.session_state[f"{state_key}-open"]
    if open_:
        st.session_state[r_key] = "custom"  # the chip of the open panel looks pressed, like the landing
    g_col, label_col, r_col = compat.hstack([len(periods) * 2 + 1, 2, 9], key=f"{state_key}-bar")
    with g_col, st.container(key=f"{state_key}-gwrap"):
        st.segmented_control(label, list(periods), format_func=lambda p: PERIOD_LABELS[p], key=g_key,
                             label_visibility="collapsed", on_change=on_period)
    label_col.html('<span class="brand-muted brand-period-last">Últimos</span>')
    ranges = TRAFFIC_RANGES[sel.period]
    range_labels = {c: lbl for c, lbl in ranges} | {"custom": "Personalizado"}
    with r_col, st.container(key=f"{state_key}-ranges"):
        st.pills(label + " faixa", [c for c, _ in ranges] + ["custom"], format_func=lambda o: range_labels[o], key=r_key,
                 label_visibility="collapsed", on_change=on_range)

    notice = st.session_state[f"{state_key}-notice"]
    if notice and not open_:
        st.html(f'<div class="brand-muted brand-small" role="status">{html.escape(notice)}</div>')

    if open_:
        with st.container(key=f"{state_key}-custom"):
            c_start, c_end, c_apply, c_cancel = st.columns([3, 3, 2, 2], vertical_alignment="bottom")
            c_start.date_input("De", value=sel.bounds.start, min_value=_CUSTOM_RANGE_MIN, max_value=PERIOD_END,
                               format="DD/MM/YYYY", key=f"{state_key}-start")
            c_end.date_input("Até", value=sel.bounds.end, min_value=_CUSTOM_RANGE_MIN, max_value=PERIOD_END,
                             format="DD/MM/YYYY", key=f"{state_key}-end")
            c_apply.button("Aplicar", key=f"{state_key}-apply", type="primary", use_container_width=True, on_click=on_apply)
            c_cancel.button("Cancelar", key=f"{state_key}-cancel", use_container_width=True, on_click=on_cancel)
        if st.session_state[f"{state_key}-error"]:
            st.html(f'<div class="brand-error brand-small" role="alert">{html.escape(st.session_state[f"{state_key}-error"])}</div>')
    return st.session_state[state_key]


# --- Segment cards (port of <app-widgets-dropdown> and <app-segment-overview>) ------------------------------------------------
def segment_cards(key: str, items: list[dict], tone: str = "primary", filterable: bool = True, active: Optional[str] = None) -> Optional[str]:
    """Four stat cards; returns the id whose 'a classificar' badge was clicked in this run.
    CSS hooks: .st-key-seg-<key>-<id> (card), .st-key-segbtn-<key>-<id> (badge button)."""
    t = tokens()
    clicked = None
    cols = st.columns(4, gap="medium")
    for col, seg in zip(cols, items, strict=False):
        state = "is-filtered" if active == seg["id"] else ("is-dimmed" if active else "")
        with col, st.container(key=f"seg-{key}-{seg['id']}{'-filtered' if state == 'is-filtered' else ''}{'-dimmed' if state == 'is-dimmed' else ''}"):
            # Same order as widget-stat-a: value row (figure + "a classificar" badge on one line), segment name row with
            # the icon, sparkline at the bottom. The keyed block is a wrapping flex row (app.css): the value and the badge
            # button keep their own width, the title and the chart take the whole row.
            pending = f'{fmt_int(seg["toClassify"])} a classificar'
            value_html = f'<div class="brand-stat-value">{fmt_int(seg["total"])}</div>'
            if filterable:
                st.html(value_html)
                with st.container(key=f"segbtn-{key}-{seg['id']}"):
                    if st.button(pending, key=f"segbtn-{key}-{seg['id']}-b",
                                 help=("Remover filtro de normas a classificar" if active == seg["id"] else f"Filtrar a página pelas normas a classificar de {seg['label']}")):
                        clicked = seg["id"]
            else:
                st.html(f'<div class="brand-stat-row">{value_html}<span class="brand-stat-pending">{pending}</span></div>')
            st.html(f'<div class="brand-stat {tone} {state}"></div>'
                    f'<div class="brand-stat-title">{icon(seg["icon"], "1rem")}<span>{html.escape(seg["label"])}</span></div>')
            labels = MONTHS_PT[: len(seg["trend"])]
            chart(sparkline(t, seg["trend"], labels, f"Normas · {seg['label']}"), key=f"segchart-{key}-{seg['id']}")
    return clicked


def segment_overview(items: list[dict]) -> None:
    """Início: one card per segment with a header in the segment color, an area sparkline and two figures."""
    t = tokens()
    cols = st.columns(4, gap="medium")
    for col, seg in zip(cols, items, strict=False):
        color = segment_color(t, seg["id"])
        with col, st.container(key=f"ovw-{seg['id']}"):
            st.html(f'<div class="brand-overview-head" style="--segment-color:{color}">{icon(seg["icon"], "1.5rem")}'
                    f'<span class="brand-overview-name">{html.escape(seg["label"])}</span></div>')
            chart(sparkline(t, seg["trend"], MONTHS_PT[: len(seg["trend"])], f"Normas · {seg['label']}", height=64, area=True),
                  key=f"ovwchart-{seg['id']}")
            st.html(f'<div class="brand-overview-values"><div><strong>{fmt_int(seg["total"])}</strong><span>normas</span></div>'
                    f'<div><strong>{fmt_int(seg["toClassify"])}</strong><span>a classificar</span></div></div>')


# --- "Últimos e-mails" rows (port of .emails-item of the landing) ---------------------------------------------------------
def email_row_label(date_text: str, segment_label: str, count_text: str) -> str:
    """Markdown label of an e-mail row: the date in *emphasis* (styled as muted text, the segment swatch is its ::after),
    the segment name as plain text and the count in **bold** pushed to the right (triagent.css). st.expander labels take
    Markdown only, no HTML: the swatch color comes from the segment id in the container key (email_row)."""
    return f"*{date_text}* {segment_label} **{count_text}**"


def email_row(key: str, email_id: str, segment_id: str, date_text: str, segment_label: str, count_text: str):
    """Expander styled as a list row (chevron, date, swatch + segment, count at the right); use inside a container with
    key <key>-list (gap 0, hairlines). Container class: st-key-<key>-item-<id>-<segment id>."""
    with st.container(key=f"{key}-item-{email_id}-{segment_id}"):
        return st.expander(email_row_label(date_text, segment_label, count_text))


# --- Filter notice ----------------------------------------------------------------------------------------------------------
def filter_notice(key: str, text_html: str) -> bool:
    """Tinted strip with the active filters; returns True when 'Remover filtro' was clicked."""
    text_col, button_col = compat.hstack([5, 1], key=f"notice-{key}")
    text_col.html(f'<div class="brand-notice">{icon("cil-filter", "1rem")}<span>{text_html}</span></div>')
    return button_col.button("Remover filtro", key=f"notice-btn-{key}", use_container_width=True)


# --- Block that failed to load (Problem Details, ADR-009) ------------------------------------------------------------------
def data_error_html(fallback: str, error: BaseException, extra_class: str = "") -> str:
    """pt-BR text of a block that failed (core.api.error_text: the block's phrase, or 401/403/429/504/network), the
    "Entrar novamente" link on 401 (reload through the gateway, auth.login_url) and the support code when the BFF sent a
    traceId. Never the server message."""
    from core import api  # late: ui is imported by pages that never touch the BFF

    parts = [f'<p class="brand-muted brand-small" role="alert">{html.escape(api.error_text(error, fallback))}</p>']
    if api.needs_login(error):
        parts.append(f'<p class="brand-small"><a class="brand-login-link" href="{html.escape(api.login_url(), quote=True)}" '
                     f'target="_self">{api.LOGIN_LINK_TEXT}</a></p>')
    support = api.support_code(error)
    if support:
        parts.append(f'<p class="brand-muted brand-small brand-support-code">{html.escape(support)}</p>')
    classes = " ".join(c for c in ("brand-data-error", extra_class) if c)
    return f'<div class="{classes}">{"".join(parts)}</div>'


def data_error(fallback: str, error: BaseException, extra_class: str = "") -> None:
    st.html(data_error_html(fallback, error, extra_class))


# --- Header date ------------------------------------------------------------------------------------------------------------
def header_date(today: date) -> str:
    weekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    return f"{weekdays[today.weekday()]}, {today.day} de {MONTHS_PT[today.month - 1].lower()} de {today.year}"


def header_date_short(today: date) -> str:
    return f"{today.day:02d}/{today.month:02d}/{today.year}"
