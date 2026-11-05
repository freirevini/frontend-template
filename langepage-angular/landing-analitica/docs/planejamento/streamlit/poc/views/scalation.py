import html

import pandas as pd
import streamlit as st

from core.charts import PLOTLY_CONFIG, waterfall_chart
from core.data import build_waterfall, format_currency, format_share, segments, waterfall
from core.period import default_selection
from core.tokens import tokens
from core.ui import card, card_title, period_filter, scroll_to_section, section_anchor, segment_cards

t = tokens()
st.html('<h1 class="visually-hidden">Scalation</h1>')

# 1. Normas por segmento (tom petróleo, sem filtro)
section_anchor("segmentos")
try:
    segment_cards("scalation", segments(), tone="petrol", filterable=False)
except Exception:
    st.html('<p class="brand-muted brand-small" role="alert">Não foi possível carregar os segmentos.</p>')

# 2. Cascata do resultado
with card("cascata"):
    unit = st.session_state.setdefault("wf-unit", "currency")
    view = st.session_state.setdefault("wf-view", "chart")
    sel = st.session_state.get("pf-waterfall") or default_selection("Month")
    data = waterfall(sel.period, sel.bounds)
    with st.container(horizontal=True, vertical_alignment="top", key="wf-head"):
        card_title("Cascata do resultado", html.escape(data["period"]), anchor="cascata")
        st.pills("Unidade", ["currency", "percent"], format_func=lambda u: {"currency": "R$", "percent": "% da receita"}[u],
                 default=unit, key="wf-unit", label_visibility="collapsed", required=True)
        st.pills("Forma de exibição", ["chart", "table"], format_func=lambda v: {"chart": "Gráfico", "table": "Tabela"}[v],
                 default=view, key="wf-view", label_visibility="collapsed", required=True)
    sel = period_filter("waterfall", label="Período da cascata")
    data = waterfall(sel.period, sel.bounds)
    model = build_waterfall(data["steps"])
    unit = st.session_state["wf-unit"]
    view = st.session_state["wf-view"]
    fmt = (lambda v: format_share(v, model.base)) if unit == "percent" else (lambda v: format_currency(v, data["unitScale"], data["currency"]))
    share_note = f' <span class="brand-muted brand-small">({format_share(model.result, model.base)} da receita bruta)</span>' if unit == "currency" else ""
    st.html(f'''<div class="brand-wf-bar"><div><span class="brand-muted brand-small">Resultado</span> <strong>{fmt(model.result)}</strong>{share_note}</div>
<ul class="brand-legend-inline"><li><span class="brand-swatch" style="background:{t["wf_total"][1]}"></span>Total (receita e resultado)</li>
<li><span class="brand-swatch" style="background:{t["wf_decrease"][1]}"></span>Redução</li><li><span class="brand-connector"></span>Saldo entre etapas</li></ul></div>''')
    if view == "chart":
        st.plotly_chart(waterfall_chart(t, model, unit, data["unitScale"], t["surface_card"]), height=320, config=PLOTLY_CONFIG, theme=None, key="wf-chart")
    else:
        rows = []
        for column in model.columns:
            for i, seg in enumerate(column.segments):
                negative = seg.kind == "decrease"
                rows.append({
                    "Etapa": column.step["label"] if i == 0 else "",
                    "Componente": seg.part_label,
                    "Valor": format_currency(-seg.value if negative else seg.value, data["unitScale"], data["currency"]),
                    "% da receita bruta": format_share(-seg.value if negative else seg.value, model.base),
                    "Saldo após a etapa": format_currency(column.end, data["unitScale"], data["currency"]) if i == 0 else "",
                })
        st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch", key="wf-table")

# 3. Tráfego e vendas (demo do template; não é produto)
with card("trafego-e-vendas"):
    card_title("Tráfego e vendas", "", anchor="trafego-e-vendas")
    c1, c2 = st.columns(2)
    with c1:
        st.html('<div class="brand-kpi-row"><div class="brand-kpi info"><small>Novos clientes</small><strong>9,123</strong></div>'
                '<div class="brand-kpi danger"><small>Clientes recorrentes</small><strong>22,643</strong></div></div>')
        for day, a, b in (("Segunda", 34, 78), ("Terça", 56, 94), ("Quarta", 12, 67), ("Quinta", 43, 91), ("Sexta", 22, 73), ("Sábado", 53, 82), ("Domingo", 9, 69)):
            st.html(f'<div class="brand-progress-group"><span class="brand-muted brand-small">{day}</span><div><span class="brand-bar info" style="width:{a}%"></span><span class="brand-bar danger" style="width:{b}%"></span></div></div>')
    with c2:
        st.html('<div class="brand-kpi-row"><div class="brand-kpi warning"><small>Visualizações de página</small><strong>78,623</strong></div>'
                '<div class="brand-kpi success"><small>Orgânico</small><strong>49,123</strong></div></div>')
        for name, pct in (("Masculino", 43), ("Feminino", 37)):
            st.html(f'<div class="brand-progress-group single"><span>{name}<b>{pct}%</b></span><div><span class="brand-bar warning" style="width:{pct}%"></span></div></div>')
        for name, n, pct in (("Busca orgânica", "191,235", 56), ("Facebook", "51,223", 15), ("Twitter", "37,564", 11), ("LinkedIn", "27,319", 8)):
            st.html(f'<div class="brand-progress-group single"><span>{name}<b>{n} <small class="brand-muted">({pct}%)</small></b></span><div><span class="brand-bar success" style="width:{pct}%"></span></div></div>')

scroll_to_section(st.query_params.get("secao"))
