"""core.footer: legal data only from settings.yaml footer.entities; empty = copyright only. Fictitious data."""
import pytest

from core import footer, settings

FAKE = [{"name": "Empresa Exemplo S.A.", "cnpj": "00.000.000/0001-00", "address": "Rua Fictícia, 1 - Cidade - UF"},
        {"name": "Outra <Empresa> Ltda.", "cnpj": "", "address": ""}]


def test_default_settings_have_no_entities(monkeypatch):
    monkeypatch.delenv("FOOTER_ENTITIES", raising=False)
    settings.settings.cache_clear()
    try:
        assert footer.entities() == []
    finally:
        settings.settings.cache_clear()


def test_entities_from_environment_json(monkeypatch):
    monkeypatch.setenv("FOOTER_ENTITIES", '[{"name": "Empresa Exemplo S.A.", "cnpj": "00.000.000/0001-00", "address": "Rua Fictícia, 1"}]')
    settings.settings.cache_clear()
    try:
        assert footer.entities() == [{"name": "Empresa Exemplo S.A.", "cnpj": "00.000.000/0001-00", "address": "Rua Fictícia, 1"}]
    finally:
        settings.settings.cache_clear()


@pytest.mark.parametrize("raw", [None, "", "[]", "not json", "{}", 42, [{"cnpj": "1"}], ["x"], [{"name": "  "}]])
def test_invalid_or_empty_entities_become_empty(raw):
    assert footer.entities({"footer": {"entities": raw}}) == []
    assert footer.entities({}) == []


def test_yaml_list_is_accepted():
    assert footer.entities({"footer": {"entities": FAKE}}) == FAKE


def test_footer_without_entities_has_only_copyright():
    out = footer.footer_html(2026, "data:image/svg+xml;base64,AA==", [])
    assert 'alt="Logotipo da instituição"' in out
    assert "Copyright © 2026 todos os direitos reservados" in out
    assert "CNPJ" not in out and "<strong>" not in out


def test_footer_with_entities_renders_escaped_legal_block():
    out = footer.footer_html(2026, "data:x", FAKE)
    assert "<p><strong>Empresa Exemplo S.A. - CNPJ: 00.000.000/0001-00</strong><br />Rua Fictícia, 1 - Cidade - UF</p>" in out
    assert "<p><strong>Outra &lt;Empresa&gt; Ltda.</strong></p>" in out
    assert out.index("brand-footer-copy") < out.index("Empresa Exemplo")
