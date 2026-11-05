"""Brand design tokens, ported from landing-analitica src/scss/_brand.scss and _theme-dark.scss.

Streamlit's own theme comes from .streamlit/config.toml; these values feed the CSS custom properties
(--brand-*, --app-*) and the Plotly figures (canvas/SVG cannot read CSS variables).
"""
from __future__ import annotations

import streamlit as st

LIGHT: dict = dict(
    primary="#223ad2", primary_high="#192a9a", primary_low="#edeffc", primary_light="#cad0f6", primary_rgb="34, 58, 210",
    highlight="#31c7ed", highlight_dark="#1099bc", highlight_low="#ecfafd", highlight_high="#0a5c71",
    success="#288f28", success_pure="#36bf36", success_low="#effaef",
    warning="#ff6600", warning_dark="#b84900", warning_low="#fff3eb",
    danger="#dc1832", danger_dark="#a51226", danger_low="#fdedef",
    content_high="#20262c", content_pure="#363f4a", content_low="#4b5968", content_disabled="#a7b2be",
    surface_page="#f3f5f7", surface_card="#ffffff", surface_mid="#eaedf0", surface_high="#dbe0e5",
    border="#dbe0e5", input_border="#c5ccd4",
    sidebar="#0e1650", sidebar_deep="#0a1040",
    chat_accent="#223ad2",
    chart_color="#4b5968", chart_grid="rgba(32, 38, 44, .08)", chart_tooltip_bg="#20262c", chart_tooltip_color="#ffffff",
    series=["#223ad2", "#1099bc", "#288f28", "#ae6ae6"], series_reference="#dc1832",
    wf_total=["#17278c", "#223ad2", "#8c9ae8"], wf_decrease=["#a51226", "#dc1832", "#f07a89"], wf_connector="#a7b2be",
    applicable="#0e1650", not_applicable="#a7b2be",
    elevation_1="0 4px 4px -2px rgba(11, 23, 35, .24)", elevation_2="0 4px 12px 0 rgba(11, 23, 35, .12)",
    elevation_3="0 16px 32px 0 rgba(11, 23, 35, .32)", elevation_card="0 2px 8px 0 rgba(11, 23, 35, .06)",
    export_accent="223AD2", export_muted="4B5968",
    white_rgb="255, 255, 255", black_rgb="0, 0, 0",
)

DARK: dict = {
    **LIGHT,
    **dict(
        primary="#6b7cf0", primary_high="#8491f3", primary_low="rgba(107, 124, 240, .16)", primary_light="#8c9ae8",
        primary_rgb="107, 124, 240",
        highlight="#31c7ed", highlight_low="rgba(49, 199, 237, .14)",
        success="#36bf36", success_low="rgba(54, 191, 54, .14)",
        warning="#ff8a3d", warning_dark="#ff6600", warning_low="rgba(255, 138, 61, .14)",
        danger="#f0566b", danger_dark="#dc1832", danger_low="rgba(240, 86, 107, .14)",
        content_high="#eef1f5", content_pure="#eef1f5", content_low="#a9b1bd", content_disabled="rgba(255, 255, 255, .38)",
        surface_page="#0f1319", surface_card="#171e28", surface_mid="#1f2733", surface_high="#2b3542",
        border="#2b3542", input_border="#3a4556",
        sidebar="#0c1238", sidebar_deep="#080d2b",
        chat_accent="#5568e7",
        chart_color="#a9b1bd", chart_grid="rgba(255, 255, 255, .08)", chart_tooltip_bg="#0f1319", chart_tooltip_color="#eef1f5",
        series=["#4d61e0", "#1099bc", "#2fae2f", "#ae6ae6"], series_reference="#e8475c",
        wf_total=["#3448d0", "#5f71ea", "#8c9ae8"], wf_decrease=["#c0162c", "#e8475c", "#f59aa6"], wf_connector="#a9b1bd",
        applicable="#a4b0f2", not_applicable="#a9b1bd",
        elevation_1="0 4px 4px -2px rgba(0, 0, 0, .5)", elevation_2="0 4px 12px 0 rgba(0, 0, 0, .4)",
        elevation_3="0 16px 32px 0 rgba(0, 0, 0, .55)", elevation_card="0 2px 8px 0 rgba(0, 0, 0, .3)",
    ),
}

SEGMENTS = [
    dict(id="atacado", label="Atacado", icon="cil-truck"),
    dict(id="corporativo", label="Corporativo", icon="cil-building"),
    dict(id="plataforma", label="Plataforma", icon="cil-devices"),
    dict(id="varejo", label="Varejo", icon="cil-cart"),
]
SEGMENT_IDS = [s["id"] for s in SEGMENTS]
SEGMENT_LABELS = {s["id"]: s["label"] for s in SEGMENTS}
TO_CLASSIFY_LABEL = "Normas a Classificar"


def theme_type() -> str:
    """'light' or 'dark', as the viewer sees the app (st.context.theme follows the browser/menu choice)."""
    try:
        return st.context.theme.type or "light"
    except Exception:  # bare mode / tests
        return "light"


def tokens() -> dict:
    return DARK if theme_type() == "dark" else LIGHT


def css_variables(t: dict) -> str:
    """:root { --brand-* } so plain CSS and Components v2 can use the same names as the Angular project."""
    pairs = {
        "--brand-primary": t["primary"], "--brand-primary-high": t["primary_high"], "--brand-primary-low": t["primary_low"],
        "--brand-primary-rgb": t["primary_rgb"], "--brand-highlight": t["highlight"], "--brand-highlight-dark": t["highlight_dark"],
        "--brand-success": t["success"], "--brand-success-pure": t["success_pure"], "--brand-warning": t["warning"],
        "--brand-danger": t["danger"], "--brand-danger-low": t["danger_low"],
        "--brand-content-high": t["content_high"], "--brand-content-low": t["content_low"], "--brand-content-disabled": t["content_disabled"],
        "--brand-surface-page": t["surface_page"], "--brand-surface-card": t["surface_card"], "--brand-surface-mid": t["surface_mid"],
        "--brand-surface-high": t["surface_high"], "--brand-border": t["border"], "--brand-input-border": t["input_border"],
        "--brand-sidebar": t["sidebar"], "--brand-sidebar-deep": t["sidebar_deep"],
        "--brand-radius-xs": ".25rem", "--brand-radius-sm": ".5rem", "--brand-radius-md": "1rem", "--brand-radius-lg": "1.5rem",
        "--brand-radius-pill": "100px",
        "--brand-elevation-1": t["elevation_1"], "--brand-elevation-2": t["elevation_2"], "--brand-elevation-3": t["elevation_3"],
        "--brand-elevation-card": t["elevation_card"],
        "--app-chat-accent": t["chat_accent"], "--app-applicable": t["applicable"], "--app-not-applicable": t["not_applicable"],
        "--app-series-1": t["series"][0], "--app-series-2": t["series"][1], "--app-series-3": t["series"][2],
        "--app-series-4": t["series"][3], "--app-series-reference": t["series_reference"],
        "--cui-white-rgb": t["white_rgb"], "--cui-black-rgb": t["black_rgb"],
    }
    body = ";".join(f"{k}:{v}" for k, v in pairs.items())
    return f":root{{{body}}}"


def segment_color(t: dict, segment_id: str) -> str:
    return t["series"][SEGMENT_IDS.index(segment_id)] if segment_id in SEGMENT_IDS else t["primary"]


def with_alpha(color: str, alpha: float) -> str:
    """#rrggbb as rgba(); other formats are returned unchanged (port of chart-colors.ts)."""
    c = color.strip()
    if len(c) == 7 and c.startswith("#"):
        v = int(c[1:], 16)
        return f"rgba({(v >> 16) & 255}, {(v >> 8) & 255}, {v & 255}, {alpha})"
    return color
