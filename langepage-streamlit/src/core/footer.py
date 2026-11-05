"""Footer band (navy): logo, copyright and, when configured, the legal block of the institution's companies.

No company name, CNPJ or address is versioned. They come per environment from settings.yaml -> footer.entities,
either as a YAML list (settings.yaml mounted from the ConfigMap) or as JSON in FOOTER_ENTITIES (ConfigMap/Secret).
Default [] = no legal block.
"""
from __future__ import annotations

import html
import json
from typing import Any

LOGO_ALT = "Logotipo da instituição"
COPYRIGHT = "Copyright © {year} todos os direitos reservados"


def entities(cfg: dict | None = None) -> list[dict[str, str]]:
    """footer.entities as [{name, cnpj, address}]; invalid or missing value = [] (the footer never breaks the page)."""
    if cfg is None:
        from core.settings import settings

        cfg = settings()
    raw: Any = (cfg.get("footer") or {}).get("entities") or []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw) if raw.strip() else []
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        if isinstance(item, dict) and str(item.get("name") or "").strip():
            out.append({k: str(item.get(k) or "").strip() for k in ("name", "cnpj", "address")})
    return out


def legal_html(items: list[dict[str, str]]) -> str:
    """One <p> per company: name, CNPJ (when given) and address; all escaped. Empty list = ""."""
    parts = []
    for e in items:
        head = html.escape(e["name"]) + (f" - CNPJ: {html.escape(e['cnpj'])}" if e.get("cnpj") else "")
        address = f"<br />{html.escape(e['address'])}" if e.get("address") else ""
        parts.append(f"<p><strong>{head}</strong>{address}</p>")
    return "".join(parts)


def footer_html(year: int, logo_src: str, items: list[dict[str, str]]) -> str:
    """Whole footer markup; the legal block appears only when items is not empty."""
    return (f'<footer class="brand-footer"><img class="brand-footer-logo" src="{logo_src}" width="54" height="40" '
            f'alt="{LOGO_ALT}" /><div class="brand-footer-legal"><p class="brand-footer-copy">'
            f'{COPYRIGHT.format(year=year)}</p>{legal_html(items)}</div></footer>')
