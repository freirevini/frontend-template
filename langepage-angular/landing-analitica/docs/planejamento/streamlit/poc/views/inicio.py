import streamlit as st

from core.data import segments
from core.ui import segment_overview

st.html('<h1 class="visually-hidden">Início</h1>')
try:
    segment_overview(segments())
except Exception:
    st.html('<p class="brand-muted brand-small" role="alert">Não foi possível carregar os segmentos.</p>')
