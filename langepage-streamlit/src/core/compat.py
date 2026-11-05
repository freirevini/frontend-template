"""Version seams (plan §4). Streamlit 1.40 (homologated range 1.38–1.40) lacks several APIs the 1.66 prototype used.
Every page calls these functions instead of the missing APIs, so moving to 1.51+/1.53+ changes only this file.

Contract (owned by the F1 agent; signatures are fixed, other agents may rely on them):

- theme_type() -> "light" | "dark"
- run_js(script: str, key: str) -> None                 # JS with access to window.parent (components.v1.html, height 0)
- clicklist(key: str, items: list[ClickItem], markup: str | None = None) -> str | None
      items: value/label pairs; returns the value clicked in this run (or None). Visual by markup when the
      implementation supports HTML (component v1), else st.pills fallback built from the labels.
- row_action(key: str, frame, label_for_row: Callable[[int], str]) -> int | None
      renders the dataframe with single-row selection + an action button; returns the row index acted on.
- pager(key: str, total_rows: int, page_size: int) -> int   # 1-based page with Anterior/Próxima and "Página X de Y"
- hstack(spec, key: str | None = None) -> list[DeltaGenerator]   # horizontal group (st.columns in 1.40)
- section_link(page, label: str, section_id: str, active: bool, key: str) -> None   # sidebar sub-item
- consume_section() -> str | None                        # section id requested by the sidebar (read once per page)
- required_choice(state_key: str, previous_key: str)     # restores a chips/segmented value when the user unselects it

Additions (optional keyword arguments and helpers; the contract above is unchanged):

- mount_theme_probe(slugs) -> str      called once per run by ui.inject_css (app.py); theme_type() reads its result
- theme_mode() -> "light" | "dark" | "auto"   the app theme mode chosen in the header selector (for its icon/active item)
- viewport_narrow() -> bool           app viewport under 576 px (theme probe); charts thin their ticks on phones
- set_theme_mode(mode, slugs) -> None  header selector: writes the choice and reloads the page
- active_section() -> tuple[str, str] | None   (page url_path, section id) of the last sub-item clicked (sidebar highlight)
- clicklist(..., active=None)          value shown as selected in the st.pills fallback (the page's own state)
- row_action(..., **dataframe_kwargs)  forwarded to st.dataframe (column_config, height, column_order)
- hstack(..., gap="small", vertical_alignment="center")
- request_rerun() / flush_rerun()      deferred st.rerun(): pages ask, app.py reruns once after footer and chat
- legacy_pages_session() / dismiss_page_not_found(url_path)   1.40 first-session "Page not found" modal (see below)
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Optional

import streamlit as st
import streamlit.components.v1 as components

COMPONENTS = Path(__file__).resolve().parent.parent / "components"
_THEME_JS = COMPONENTS / "theme_probe" / "theme.js"
_THEME_STATE = "_brand_theme"            # {"base": "light"|"dark", "mode": "light"|"dark"|"auto", "narrow": bool}
_SECTION_PENDING = "_brand_section_pending"
_SECTION_ACTIVE = "_brand_section_active"
_RERUN = "_brand_rerun_requested"
_PAGE_NOT_FOUND = "_brand_page_not_found"


@dataclass(frozen=True)
class ClickItem:
    value: str
    label: str


# --- Theme --------------------------------------------------------------------------------------------------------------
# 1.40 has no st.context.theme: a components-v1 iframe (src/components/theme_probe) receives the applied theme in its
# render message and reports {base, mode} back. First run of a session = "light" until the probe answers (one rerun).
_theme_probe = components.declare_component("brand_theme_probe", path=str(COMPONENTS / "theme_probe"))


def _theme_state() -> dict:
    try:
        return st.session_state.get(_THEME_STATE) or {"base": "light", "mode": "light"}
    except Exception:  # bare mode / tests without a session
        return {"base": "light", "mode": "light"}


def mount_theme_probe(slugs: list[str]) -> str:
    """Renders the (invisible) probe once per run; slugs = url paths of the pages (to write every localStorage key)."""
    known = _theme_state()
    with st.container(key="brandjs-theme-probe"):
        value = _theme_probe(known=known, slugs=list(slugs), key="brand-theme-probe", default=None)
    if isinstance(value, dict) and value.get("base") in ("light", "dark"):
        state = {"base": value["base"], "mode": value.get("mode") if value.get("mode") in ("light", "dark", "auto") else "light",
                 "narrow": bool(value.get("narrow"))}
        if state != known:
            st.session_state[_THEME_STATE] = state
    return theme_type()


def theme_type() -> str:
    """'light' or 'dark' as the viewer sees the app (reported by the probe; 'light' until it does)."""
    return "dark" if _theme_state().get("base") == "dark" else "light"


def theme_mode() -> str:
    return _theme_state().get("mode", "light")


def viewport_narrow() -> bool:
    """True when the app viewport is under 576 px (reported by the theme probe, re-checked on resize; False until it does).
    1.40 has no st.context viewport: charts use it to keep tick labels horizontal on phones."""
    return bool(_theme_state().get("narrow"))


def set_theme_mode(mode: str, slugs: list[str]) -> None:
    """Header selector (Claro / Escuro / Automático): writes Streamlit's theme key and reloads the page."""
    if mode not in ("light", "dark", "auto"):
        raise ValueError(mode)
    run_js(f"brandTheme.setMode({json.dumps(mode)}, {json.dumps(list(slugs))});", key="theme-set", prelude=_THEME_JS.read_text(encoding="utf-8"))


# --- JavaScript ---------------------------------------------------------------------------------------------------------
def run_js(script: str, key: str, prelude: str = "") -> None:
    """Runs `script` once in this run, in a hidden same-origin iframe (window.parent = the app page). A per-key counter
    makes each call a new iframe, so the same script runs again when called again in a later run."""
    counter = f"_brand_js_{key}"
    st.session_state[counter] = st.session_state.get(counter, 0) + 1
    with st.container(key=f"brandjs-{key}"):
        components.html(f"<script>/* {key} #{st.session_state[counter]} */\n{prelude}\n{script}\n</script>", height=0)


# --- Clickable list (D3a: st.pills) -------------------------------------------------------------------------------------
def clicklist(key: str, items: list[ClickItem], markup: Optional[str] = None, *, active: Optional[str] = None) -> Optional[str]:
    """Returns the value clicked in this run, once per click. 1.40 fallback: st.pills built from the labels (markup is
    ignored); `active` keeps the chip of the page's current choice selected. Clicking the selected chip again returns
    its value too (the page toggles its own state)."""
    widget, clicked_key, shown_key = f"{key}-pills", f"{key}-clicked", f"{key}-shown"
    labels = {item.value: item.label for item in items}

    def on_change() -> None:
        new = st.session_state.get(widget)
        st.session_state[clicked_key] = new if new is not None else st.session_state.get(shown_key)

    if st.session_state.get(shown_key) != active or st.session_state.get(widget) != active:
        st.session_state[widget] = active if active in labels else None
    st.session_state[shown_key] = active
    with st.container(key=f"clicklist-{key}"):
        st.pills(key, list(labels), format_func=lambda v: labels.get(v, str(v)), key=widget, label_visibility="collapsed",
                 on_change=on_change)
    return st.session_state.pop(clicked_key, None)


# --- Row action (no ButtonColumn in 1.40) -------------------------------------------------------------------------------
def row_action(key: str, frame, label_for_row: Callable[[int], str], **dataframe_kwargs: Any) -> Optional[int]:
    """Dataframe with single-row selection + one action button for the selected row; returns the row index (position
    in `frame`) when the button is clicked in this run."""
    dataframe_kwargs.setdefault("hide_index", True)
    dataframe_kwargs.setdefault("use_container_width", True)
    event = st.dataframe(frame, key=f"{key}-df", on_select="rerun", selection_mode="single-row", **dataframe_kwargs)
    rows = list(getattr(getattr(event, "selection", None), "rows", []) or [])
    if not rows or rows[0] >= len(frame):
        st.html('<p class="brand-muted brand-small brand-row-hint">Selecione uma linha para perguntar ao Agente da Agenda.</p>')
        return None
    index = rows[0]
    with st.container(key=f"rowaction-{key}"):
        if st.button(label_for_row(index), key=f"{key}-act", type="primary"):
            return index
    return None


# --- Pager (no st.pagination in 1.40) -----------------------------------------------------------------------------------
def pager(key: str, total_rows: int, page_size: int) -> int:
    """1-based page; Anterior / "Página X de Y" / Próxima. Clamped when the row count shrinks (filters)."""
    pages = max(1, math.ceil(max(0, total_rows) / max(1, page_size)))
    state = f"{key}-page"
    page = min(max(1, int(st.session_state.get(state, 1))), pages)
    st.session_state[state] = page

    def move(step: int) -> None:
        st.session_state[state] = min(max(1, st.session_state[state] + step), pages)

    prev_col, label_col, next_col = hstack([1, 2, 1], key=f"pager-{key}")
    prev_col.button("Anterior", key=f"{key}-prev", on_click=move, args=(-1,), disabled=page <= 1, use_container_width=True)
    label_col.html(f'<p class="brand-pager-label" aria-live="polite">Página {page} de {pages}</p>')
    next_col.button("Próxima", key=f"{key}-next", on_click=move, args=(1,), disabled=page >= pages, use_container_width=True)
    return page


# --- Horizontal group ---------------------------------------------------------------------------------------------------
def hstack(spec, key: Optional[str] = None, *, gap: str = "small", vertical_alignment: str = "center") -> list:
    """st.columns inside an optional keyed container (class st-key-<key> for CSS)."""
    parent = st.container(key=key) if key else st
    return list(parent.columns(spec, gap=gap, vertical_alignment=vertical_alignment))


# --- Sidebar section links (no page_link(query_params=) in 1.40) --------------------------------------------------------
def section_link(page, label: str, section_id: str, active: bool, key: str) -> None:
    """Sub-item styled as a link: remembers the section and switches to the page; the page reads it with
    consume_section() and scrolls (ui.scroll_to_section). Container class st-key-navsub-<key>[-active]."""
    with st.container(key=f"navsub-{key}{'-active' if active else ''}"):
        if st.button(label, key=key, use_container_width=True):
            st.session_state[_SECTION_PENDING] = section_id
            st.session_state[_SECTION_ACTIVE] = (getattr(page, "url_path", str(page)), section_id)
            st.switch_page(page)


def consume_section() -> Optional[str]:
    return st.session_state.pop(_SECTION_PENDING, None)


def active_section() -> Optional[tuple[str, str]]:
    return st.session_state.get(_SECTION_ACTIVE)


def clear_active_section() -> None:
    st.session_state.pop(_SECTION_ACTIVE, None)


# --- Required single choice (no required= on pills/segmented_control in 1.40) --------------------------------------------
def required_choice(state_key: str, previous_key: str) -> None:
    """on_change for st.pills / st.segmented_control: unselecting restores the previous value; otherwise remembers it.
    Usage: st.pills(..., key=k, on_change=required_choice, args=(k, k + "-prev"))."""
    value = st.session_state.get(state_key)
    if value is None:
        if st.session_state.get(previous_key) is not None:
            st.session_state[state_key] = st.session_state[previous_key]
    else:
        st.session_state[previous_key] = value


# --- Deferred rerun --------------------------------------------------------------------------------------------------------
# A click handled in the page body changes state that blocks above already drew. st.rerun() right there stops the run:
# the blocks/widgets below are not drawn (1.40 drops the state of widgets missing from a run, e.g. Gráfico/Tabela) and
# app.py's footer and Agente da Agenda are skipped. Pages call request_rerun(); app.py calls flush_rerun() last.
def request_rerun() -> None:
    st.session_state[_RERUN] = True


def flush_rerun() -> None:
    """Reruns once if any block asked for it in this run (call at the very end of app.py)."""
    st.session_state.pop(_PAGE_NOT_FOUND, None)
    if st.session_state.pop(_RERUN, False):
        st.rerun()


# --- First session of the server process: bogus "Page not found" -------------------------------------------------------------
# 1.40 creates each session with PagesManager.DefaultStrategy, which only becomes the st.navigation strategy (V2) after the
# first st.navigation call of the process. The very first session therefore resolves a direct address (/triagent) against
# a pages/ directory, finds nothing and sends page_not_found before app.py runs; st.navigation then runs the right page,
# but the modal stays. Fixed upstream in later versions; here the modal is closed when the address was a real page.
def legacy_pages_session() -> None:
    """Call before st.navigation: remembers the address of a session created before st.navigation was ever called."""
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx

        ctx = get_script_run_ctx()
        if ctx and ctx.pages_manager.mpa_version == 1 and ctx.pages_manager.intended_page_name:
            st.session_state[_PAGE_NOT_FOUND] = ctx.pages_manager.intended_page_name.strip("/")
    except Exception:  # internals moved (other version) or bare mode: nothing to fix
        pass


def dismiss_page_not_found(url_path: str) -> None:
    """Call after st.navigation: closes the bogus modal when the requested address is a real page (`url_path`). The mark is
    cleared by flush_rerun() at the end of the run, so a run cut short (st.switch_page from /dashboard) tries again."""
    requested = st.session_state.get(_PAGE_NOT_FOUND)
    if not requested:
        return
    if requested not in ("ok", (url_path or "").strip("/")):
        st.session_state.pop(_PAGE_NOT_FOUND, None)  # a really unknown address keeps Streamlit's message
        return
    st.session_state[_PAGE_NOT_FOUND] = "ok"
    run_js("""
(function() {
  const doc = window.parent.document;
  const close = () => {
    const dialog = Array.from(doc.querySelectorAll('[role="dialog"]')).find((d) => /Page not found/.test(d.textContent || ''));
    const button = dialog && dialog.querySelector('button[aria-label="Close"]');
    if (button) { button.click(); return true; }
    return false;
  };
  let tries = 0;
  const timer = setInterval(() => { if (close() || ++tries > 40) clearInterval(timer); }, 100);
})();""", key="page-not-found")
