"""Agenda Normativa (Streamlit 1.40). Entry point: page config, navigation (hidden; the sidebar is custom), theme CSS,
header band, page body, footer and the floating Agente da Agenda."""
import logging
from datetime import date
from pathlib import Path

import streamlit as st

from core.settings import SettingsError, settings

ROOT = Path(__file__).resolve().parent
CONFIG_ERROR = "Não foi possível iniciar a Agenda Normativa. Contate o suporte."
st.set_page_config(page_title="Agenda Normativa", page_icon=str(ROOT / "static" / "img" / "favicon.svg"), layout="wide",
                   initial_sidebar_state="auto")

# Fail closed (core.settings): a configuration refused for this environment stops before any page, BFF call or chat.
# The viewer gets a constant pt-BR text; the reason (configuration keys, never values) goes only to the server log.
try:
    settings()
except SettingsError as error:
    logging.getLogger("agenda.settings").error("%s", error)
    st.error(CONFIG_ERROR)
    st.stop()

# After the check on purpose: core.data reads settings() when imported (cache TTL).
from core import chat, compat, footer  # noqa: E402
from core.ui import PAGE_SLUGS, header_date, header_date_short, inject_css, scroll_to_section, svg_data_uri  # noqa: E402

PAGES = {
    "inicio": st.Page("views/inicio.py", title="Início", default=True),
    "triagent": st.Page("views/triagent.py", title="Triagent", url_path="triagent"),
    "scalation": st.Page("views/scalation.py", title="Scalation", url_path="scalation"),
    "analitico": st.Page("views/analitico.py", title="Analítico", url_path="analitico"),
    "dashboard": st.Page("views/dashboard.py", title="Painel", url_path="dashboard"),
}
# (slug, label, icon, sub-items); sub-items are the page sections (glossary: docs/glossario-ptbr.md "Navegação").
NAV = [
    ("inicio", "Início", ":material/home:", []),
    ("triagent", "Triagent", ":material/speed:", [("Normas por segmento", "segmentos"), ("Normativos Recebidos", "normativos-recebidos"),
                                                 ("Normas Aplicáveis", "normas-aplicaveis"), ("Assunto das Normas Aplicáveis", "assunto-das-normas"),
                                                 ("Fluxo de e-mail - Triagem", "fluxo-de-email"), ("Tabela Analítica", "tabela-analitica")]),
    ("scalation", "Scalation", ":material/layers:", [("Normas por segmento", "segmentos"), ("Cascata do resultado", "cascata"),
                                                    ("Tráfego e vendas", "trafego-e-vendas")]),
    ("analitico", "Analítico", ":material/show_chart:", []),
]
THEME_OPTIONS = [("light", "Claro", ":material/light_mode:"), ("dark", "Escuro", ":material/dark_mode:"), ("auto", "Automático", ":material/contrast:")]

compat.legacy_pages_session()  # before st.navigation (1.40 first-session "Page not found", see compat)
pg = st.navigation(list(PAGES.values()), position="hidden")
compat.dismiss_page_not_found(pg.url_path)
inject_css(PAGE_SLUGS)
current = next((slug for slug, page in PAGES.items() if page.url_path == pg.url_path), "inicio")

# Sub-item highlight: exact section of the current page (cleared when the viewer is on another page).
active = compat.active_section()
if active and active[0] != pg.url_path:
    compat.clear_active_section()
    active = None

# --- Sidebar: brand band + grouped navigation (sub-items open a section of the page) ------------------------------------
with st.sidebar:
    st.html('<a class="brand-lockup" href="./" target="_self" aria-label="Agenda Normativa, ir para o início">'
            f'<img class="brand-mark" src="{svg_data_uri("img/brand-mark-white.svg")}" width="32" height="28" alt="" aria-hidden="true" />'
            '<span class="brand-name">Agenda <strong>Normativa</strong></span></a>')
    for slug, label, icon_name, subs in NAV:
        if not subs:
            with st.container(key=f"nav-{slug}{'-active' if current == slug else ''}"):
                st.page_link(PAGES[slug], label=label, icon=icon_name)
            if slug == "inicio":
                st.html('<p class="brand-nav-title">Painéis</p>')
            continue
        with st.container(key=f"nav-group-{slug}{'-open' if current == slug else ''}"):
            with st.expander(label, icon=icon_name, expanded=(current == slug)):
                for sub_label, sub_id in subs:
                    is_active = current == slug and active is not None and active[1] == sub_id
                    compat.section_link(PAGES[slug], sub_label, sub_id, is_active, key=f"nav-{slug}-{sub_id}")

# --- Header band (sticky, two rows like the landing's header): date + theme selector; divider; breadcrumb ------------------
# The sidebar toggle stays Streamlit's own (collapse button inside the sidebar; "open" control over the first row when
# it is collapsed: app.css leaves room for it).
title = "Triagent" if current == "dashboard" else pg.title
crumb = ('<span class="is-current" aria-current="page">Início</span>' if current == "inicio" else
         f'<a href="./" target="_self">Início</a><span class="brand-crumb-sep">/</span><span class="is-current" aria-current="page">{title}</span>')
today = date.today()
mode = compat.theme_mode()
picked = None
with st.container(key="app-header"):
    date_col, theme_col = compat.hstack([9, 1], key="app-header-top")
    date_col.html(f'<time class="brand-header-date" datetime="{today.isoformat()}" title="{header_date(today)}">'
                  f'<span class="is-long">{header_date(today)}</span><span class="is-short">{header_date_short(today)}</span></time>')
    with theme_col, st.container(key="theme-menu"):
        with st.popover("Alterar tema", icon=next(i for v, _, i in THEME_OPTIONS if v == mode)):
            st.html('<p class="brand-dropdown-header">Tema</p>')
            for value, label, icon_name in THEME_OPTIONS:
                if st.button(label, key=f"theme-{value}", icon=icon_name, type="primary" if value == mode else "secondary", use_container_width=True):
                    picked = value
    st.html(f'<div class="brand-header-crumbs"><nav class="brand-breadcrumb" aria-label="Trilha de navegação">{crumb}</nav></div>')
if picked:
    compat.set_theme_mode(picked, PAGE_SLUGS)

pg.run()

# Section requested by a sidebar sub-item: scroll after the page drew its anchors (no-op if the page consumed it).
scroll_to_section(compat.consume_section())

# --- Footer (navy band; legal data only from configuration) ------------------------------------------------------------
with st.container(key="app-footer"):
    st.html(footer.footer_html(date.today().year, svg_data_uri("img/brand-logo-white.svg"), footer.entities()))

chat.render_widget()

# Reruns asked by the page (compat.request_rerun) happen only now, after every block, the footer and the chat ran
# (also ends the first-session "Page not found" fix).
compat.flush_rerun()
