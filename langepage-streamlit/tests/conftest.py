"""Shared pytest setup: src/ on the import path and the mock data source (no BFF) unless a test says otherwise."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture(autouse=True)
def _mock_data_source(monkeypatch):
    """Tests never reach a real BFF: empty base_url and fresh caches for each test."""
    import streamlit as st

    from core import settings

    monkeypatch.delenv("BFF_BASE_URL", raising=False)
    settings.settings.cache_clear()
    st.cache_data.clear()
    yield
    settings.settings.cache_clear()
    st.cache_data.clear()
