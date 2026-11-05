"""Agenda Normativa — Streamlit PoC. Entry point: page config, navigation (hidden; the sidebar is custom), theme CSS,
header band, page body, footer and the floating Agente da Agenda."""
from datetime import date
from pathlib import Path

import streamlit as st

from core import chat
from core.ui import header_date, inject_css

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title="Agenda Normativa", page_icon=str(ROOT / "static" / "img" / "favicon.svg"), layout="wide",
                   initial_sidebar_state="auto")

PAGES = {
    "inicio": st.Page("views/inicio.py", title="Início", default=True),
    "triagent": st.Page("views/triagent.py", title="Triagent", url_path="triagent"),
    "scalation": st.Page("views/scalation.py", title="Scalation", url_path="scalation"),
    "analitico": st.Page("views/analitico.py", title="Analítico", url_path="analitico"),
}
NAV = [
    ("inicio", "Início", ":material/home:", []),
    ("triagent", "Triagent", ":material/speed:", [("Normas por segmento", "segmentos"), ("Normativos Recebidos", "normativos-recebidos"),
                                                 ("Normas Aplicáveis", "normas-aplicaveis"), ("Assunto das Normas Aplicáveis", "assunto-das-normas"),
                                                 ("Fluxo de e-mail - Triagem", "fluxo-de-email"), ("Tabela Analítica", "tabela-analitica")]),
    ("scalation", "Scalation", ":material/layers:", [("Normas por segmento", "segmentos"), ("Cascata do resultado", "cascata"), ("Tráfego e vendas", "trafego-e-vendas")]),
    ("analitico", "Analítico", ":material/show_chart:", []),
]

pg = st.navigation(list(PAGES.values()), position="hidden")
t = inject_css()
current = next(k for k, p in PAGES.items() if p.title == pg.title)
section = st.query_params.get("secao")

# --- Sidebar: brand band + grouped navigation (sub-items open a section of the page) ------------------------------------
with st.sidebar:
    st.html('<a class="brand-lockup" href="./"><img class="brand-mark" src="./app/static/img/brand-mark-white.svg" alt="" />'
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
                    active = current == slug and section == sub_id
                    with st.container(key=f"nav-{slug}-{sub_id}{'-active' if active else ''}"):
                        st.page_link(PAGES[slug], label=sub_label, query_params={"secao": sub_id})

# --- Header band: breadcrumb, date and theme menu ----------------------------------------------------------------------------
with st.container(key="app-header", horizontal=True, vertical_alignment="center"):
    crumb = "Início" if current == "inicio" else f'<a href="./">Início</a><span class="brand-crumb-sep">/</span><span class="is-current">{pg.title}</span>'
    st.html(f'<nav class="brand-breadcrumb" aria-label="Trilha de navegação">{crumb}</nav>')
    today = date.today()
    st.html(f'<time class="brand-header-date" datetime="{today.isoformat()}">{header_date(today)}</time>')
    with st.popover("Tema", icon=":material/light_mode:", key="theme-menu"):
        st.html('<p class="brand-dropdown-header">Tema</p>')
        choice = None
        for value, label, icon_name in (("Light", "Claro", ":material/light_mode:"), ("Dark", "Escuro", ":material/dark_mode:"), ("System", "Automático", ":material/contrast:")):
            if st.button(label, key=f"theme-{value}", icon=icon_name, type="tertiary"):
                choice = value
        if choice:
            # Streamlit keeps the viewer's theme choice in localStorage (same store as the ⋮ › Settings menu); this writes
            # it and reloads. Internal format of the frontend: not a public API.
            st.html(f"""<script>
try {{
  // Frontend store (utils.js): key `stActiveTheme-<pathname>-v2`, value JSON string "Light" | "Dark" | "System".
  for (const path of [window.location.pathname, '/']) {{
    localStorage.setItem('stActiveTheme-' + path + '-v2', JSON.stringify({choice!r}));
  }}
  window.location.reload();
}} catch (e) {{ console.error(e); }}
</script>""", unsafe_allow_javascript=True)

pg.run()

# --- Footer (navy band with the logo, the copyright and the legal data when configured) ----------------------------------------
# Legal entities (name, CNPJ, address) never live in versioned files: fed by the deployment configuration; empty = no block.
COMPANIES: list[tuple[str, str, str]] = []
legal = "".join(f"<p><strong>{name} - CNPJ: {cnpj}</strong><br />{address}</p>" for name, cnpj, address in COMPANIES)
st.html(f'<footer class="brand-footer"><img class="brand-footer-logo" src="./app/static/img/brand-logo-white.svg" alt="Logotipo da instituição" />'
        f'<div class="brand-footer-legal"><p class="brand-footer-copy">Copyright © {date.today().year} todos os direitos reservados</p>{legal}</div></footer>')

chat.render_widget()
