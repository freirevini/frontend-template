import streamlit as st

from core.data import segments
from core.ui import data_error, segment_overview

st.html('<h1 class="visually-hidden">Início</h1>')
try:
    segment_overview(segments())
except Exception as error:  # noqa: BLE001 - pt-BR text (+ login link / support code), never the server message
    data_error("Não foi possível carregar os segmentos.", error)
