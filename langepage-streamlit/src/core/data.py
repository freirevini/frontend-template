"""Data layer: mock JSON files (same as src/assets/data) or the BFF, plus the derivations the Angular front computes.

Ports: segment-cards.service.ts (validateSegmentCards), classification.model.ts (validateClassification),
classification-derive.ts, emails.model.ts (validateEmails), emails-derive.ts, waterfall.model.ts, waterfall-derive.ts,
waterfall-format.ts and the random mock of dashboard-charts-data.ts (Normativos Recebidos).

Source switch: core.settings.use_mock_data() -> data/*.json (unchanged); otherwise core.api.get_json on the contract v1
(ADR-009; docs/contratos-de-dados.md): /segmentos, /normativos-recebidos, /normas-classificadas (paged, sorted and
filtered on the server), /normas-classificadas/resumo, /emails-sugestao (paged) + /emails-sugestao/resumo and
/cascatas-resultado, cached for cache.ttl_seconds. The *_from_v1 adapters turn the v1 names (pt-BR camelCase,
UPPER_SNAKE enums) into the internal shapes the views already use, so the views and the validations do not change.
"""
from __future__ import annotations

import copy
import hashlib
import html
import json
import math
import random
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Callable, Optional

import streamlit as st

from core import api, auth
from core.period import DateRange, build_traffic_period, fmt_int, format_number, iso, point_count
from core.settings import DATA_DIR, settings, use_mock_data
from core.tokens import SEGMENT_IDS, SEGMENT_LABELS

TOP_THEMES = 10
LATEST_EMAILS = 5
TRAFFIC_RANGE_BANDS = {"atacado": (160, 240), "corporativo": (100, 160), "plataforma": (55, 105), "varejo": (120, 200)}
TO_CLASSIFY_BAND = (3, 12)
OTHER_THEMES_LABEL = "Outros temas"
MINUS = "−"  # typographic minus, as waterfall-format.ts
NBSP = " "   # Intl puts a no-break space between the currency symbol, the number and the compact suffix

_CACHE_TTL = int(settings().get("cache", {}).get("ttl_seconds") or 300)


# --- Loading --------------------------------------------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def load_json(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


@st.cache_data(show_spinner=False, ttl=_CACHE_TTL)
def _fetch(path: str, params: tuple[tuple[str, object], ...], identity: str) -> dict:
    """GET on the BFF, cached per path + query + caller (`identity`, from identity_key): the request carries the user's
    cookie/token, so one user's answer (or a later 401/403 for another) is never served across users. A tuple value is
    a repeated parameter (sort=a&sort=b). Failures are not cached (st.cache_data keeps only returned values)."""
    return api.get_json(path, {k: list(v) if isinstance(v, tuple) else v for k, v in params})


def identity_key() -> str:
    """SHA-256 of what identifies the caller to the BFF (the forwarded cookie, authorization and x-user-* headers); the
    raw values never become a cache key. No headers (bare mode) is one shared anonymous key."""
    headers = {k.lower(): str(v) for k, v in auth.forward_headers().items()}
    return hashlib.sha256(json.dumps(sorted(headers.items()), ensure_ascii=False).encode("utf-8")).hexdigest()


def _query_value(value: object) -> object:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, tuple)):
        return tuple(str(v) for v in value)
    return str(value)


def _query(params: dict) -> tuple[tuple[str, object], ...]:
    return tuple(sorted((k, _query_value(v)) for k, v in params.items() if v is not None))


def _bff(path: str, **params: object) -> dict:
    return _fetch(path, _query(params), identity_key())


def _bff_uncached(path: str, **params: object) -> dict:
    """Same request as _bff without the cache: one-off reads (the Excel pages) must not fill it per filter combination."""
    return api.get_json(path, {k: list(v) if isinstance(v, tuple) else v for k, v in _query(params)})


# --- Contract v1: domains (docs/contratos-de-dados.md §11.7) ----------------------------------------------------------------
V1_SEGMENTS = {sid: sid.upper() for sid in SEGMENT_IDS}           # atacado -> ATACADO
V1_PERIODS = {"Day": "DIA", "Month": "MES", "Year": "ANO"}
V1_SUGGESTED_CLASSES = {"APLICAVEL": "Aplicável", "APLICAVEL_PARCIALMENTE": "Aplicável parcialmente", "NAO_APLICAVEL": "Não aplicável"}
V1_STEP_KINDS = {"TOTAL": "total", "REDUCAO": "decrease"}
# Card icon by segment id: only on the front (the v1 Segmento has no icon); same names as data/dashboard-segments.json.
SEGMENT_ICONS = {"atacado": "cilTruck", "corporativo": "cilBuilding", "plataforma": "cilDevices", "varejo": "cilCart"}
# Tabela Analítica column -> v1 sort field (OrdenacaoNormas); the server breaks ties by codigo,asc.
V1_SORT_FIELDS = {"classifiedAt": "dataClassificacao", "orgao": "orgao", "tipo": "tipo", "numero": "numero", "theme": "tema",
                  "segment": "segmento", "applicable": "aplicavel", "area": "area", "diretoria": "diretoria"}
MAX_PAGE_SIZE = 100       # v1 size: 1 to 100
EXPORT_PAGE_SIZE = 100    # Excel reads the table in pages of 100 (D5)
EXPORT_LIMIT = api.EXPORT_LIMIT  # 5.000 rows; above it nothing is exported (no partial file)


def _v1_range(bounds: Optional[DateRange]) -> dict:
    return {"inicio": iso(bounds.start), "fim": iso(bounds.end)} if bounds else {}


def _v1_segment(segment: Optional[str]) -> Optional[str]:
    return V1_SEGMENTS.get(segment) if segment else None


def _segment_from_v1(value: object) -> str:
    """ATACADO -> atacado; anything outside the v1 domain is a contract break, never a silent default."""
    for sid, v1 in V1_SEGMENTS.items():
        if value == v1:
            return sid
    raise ValueError(f"Segmento fora do contrato v1: {value}")


def _count(value: object, name: str) -> int:
    if not _is_integer(value) or value < 0:
        raise ValueError(f"Quantidade inválida em {name}.")
    return int(value)


def _counts(values: object, name: str) -> list[int]:
    """A list of counts from the BFF (series, trend): every element a non-negative integer, else ValueError."""
    if not isinstance(values, list):
        raise ValueError(f"Série inválida em {name}.")
    return [_count(value, name) for value in values]


def _by_segment(items: object, name: str) -> list[int]:
    """QuantidadePorSegmento[] -> counts in SEGMENT_IDS order (a segment left out counts 0)."""
    counts = [0] * len(SEGMENT_IDS)
    for item in items if isinstance(items, list) else []:
        counts[SEGMENT_IDS.index(_segment_from_v1(item.get("segmento")))] = _count(item.get("quantidade"), name)
    return counts


@dataclass
class Page:
    """One page of a v1 listing (Spring Page envelope): rows already adapted, the total and the 1-based page shown."""
    rows: list[dict]
    total: int
    page: int


def _page_envelope(response: object) -> tuple[list, int]:
    """content + totalElements of the Spring Page envelope (extra Spring fields are ignored)."""
    if not isinstance(response, dict) or not isinstance(response.get("content"), list):
        raise ValueError("Página do BFF sem content.")
    return response["content"], _count(response.get("totalElements"), "totalElements")


class ExportLimitError(Exception):
    """The Tabela Analítica has more rows than the Excel export takes (D5); `text` is the pt-BR message for the screen."""

    def __init__(self, total: int):
        super().__init__(f"export limit: {total}")
        self.total = total
        self.text = api.EXPORT_LIMIT_TEXT.format(total=fmt_int(total))


def server_paging() -> bool:
    """True with the BFF: the Tabela Analítica pages, sorts and filters on the server; the mock keeps doing it locally."""
    return not use_mock_data()


# --- pt-BR collation (String.prototype.localeCompare(b, 'pt-BR'), ICU root order) -----------------------------------------
def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def pt_br_key(text: str) -> tuple:
    """Sort key close to ICU pt-BR: base letters first, then accents, then lowercase before uppercase."""
    base = _strip_accents(text)
    return (base.casefold(), unicodedata.normalize("NFD", text).casefold(), text.swapcase())


# --- Validation helpers -------------------------------------------------------------------------------------------------
def _is_integer(value: object) -> bool:
    """Number.isInteger: ints, and floats with no fraction (JSON 3.0); never booleans."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value) and value.is_integer()


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and not math.isnan(value)


_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SENT_AT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


def _valid_day(value: object) -> bool:
    if not isinstance(value, str) or not _DAY.match(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _valid_sent_at(value: object) -> bool:
    if not isinstance(value, str) or not _SENT_AT.match(value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


# --- Segment cards ------------------------------------------------------------------------------------------------------
def validate_segment_cards(data: dict) -> dict:
    """Port of validateSegmentCards: pt-BR message when a segment is inconsistent; returns the data otherwise."""
    items = data.get("segments") if isinstance(data, dict) else None
    if not items:
        raise ValueError("Nenhum segmento informado.")
    for segment in items:
        counts = [segment.get("total"), segment.get("toClassify")]
        if any(not _is_integer(value) or value < 0 for value in counts):
            raise ValueError(f'Quantidades inválidas no segmento "{segment.get("label")}".')
        if segment["toClassify"] > segment["total"]:
            raise ValueError(f'Normas a classificar maiores que o total no segmento "{segment.get("label")}".')
    return data


def segments_from_v1(response: dict) -> dict:
    """SegmentosResposta -> SegmentCardsData (contratos §11.1), in SEGMENT_IDS order whatever the BFF order."""
    if not isinstance(response, dict) or not isinstance(response.get("segmentos"), list):
        raise ValueError("Nenhum segmento informado.")
    items = []
    for item in response["segmentos"]:
        sid = _segment_from_v1(item.get("id"))
        items.append({"id": sid, "label": item.get("nome") or SEGMENT_LABELS[sid], "icon": SEGMENT_ICONS[sid],
                      "total": item.get("total"), "toClassify": item.get("aClassificar"), "trend": _counts(item.get("tendencia") or [], "tendencia")})
    items.sort(key=lambda segment: SEGMENT_IDS.index(segment["id"]))
    return {"asOf": response.get("dataReferencia"), "segments": items}


def segments(bounds: Optional[DateRange] = None) -> list[dict]:
    """Segment cards; the v1 resource is a snapshot (dataReferencia = the latest), so `bounds` does not go to the BFF."""
    data = load_json("dashboard-segments.json") if use_mock_data() else segments_from_v1(_bff("/segmentos"))
    return validate_segment_cards(data)["segments"]


# --- Normativos Recebidos (mock: random numbers inside each series band, seeded for a stable PoC) --------------------
@dataclass
class TrafficData:
    labels: list[str]
    subtitle: str
    values: dict[str, list[int]]       # classified normas per segment
    to_classify: dict[str, list[int]]  # normas to classify per segment


def traffic_from_response(period: str, bounds: DateRange, response: dict) -> TrafficData:
    """TrafficResponse (contratos-de-dados.md §4) aligned to SEGMENT_IDS by id, never by the BFF order."""
    labels, subtitle = build_traffic_period(period, bounds)
    by_id = {item.get("segment"): item for item in response.get("segments") or []}
    values: dict[str, list[int]] = {}
    to_classify: dict[str, list[int]] = {}
    for sid in SEGMENT_IDS:
        item = by_id.get(sid)
        if item is None:
            raise ValueError(f"Tráfego sem o segmento {sid}.")
        classified = _counts(item.get("classified") or [], f"classificadas ({sid})")
        pending = _counts(item.get("toClassify") or [], f"aClassificar ({sid})")
        if len(classified) != len(labels) or len(pending) != len(labels):
            raise ValueError(f"Tráfego do segmento {sid} com {len(classified)} pontos; esperados {len(labels)}.")
        values[sid], to_classify[sid] = classified, pending
    return TrafficData(labels, subtitle, values, to_classify)


def traffic_from_v1(response: dict) -> dict:
    """NormativosRecebidos -> TrafficResponse (contratos §11.2); alignment and lengths are checked by traffic_from_response."""
    if not isinstance(response, dict) or not isinstance(response.get("segmentos"), list):
        raise ValueError("Normativos recebidos sem segmentos.")
    periods = {v1: name for name, v1 in V1_PERIODS.items()}
    return {"period": periods.get(response.get("granularidade")), "start": response.get("inicio"), "end": response.get("fim"),
            "points": list(response.get("pontos") or []),
            "segments": [{"segment": _segment_from_v1(item.get("segmento")), "label": item.get("nome"),
                          "classified": item.get("classificadas"), "toClassify": item.get("aClassificar")}
                         for item in response["segmentos"]]}


def traffic(period: str, bounds: DateRange) -> TrafficData:
    if not use_mock_data():
        response = _bff("/normativos-recebidos", granularidade=V1_PERIODS[period], **_v1_range(bounds))
        return traffic_from_response(period, bounds, traffic_from_v1(response))
    labels, subtitle = build_traffic_period(period, bounds)
    rng = random.Random(f"{period}|{bounds.start}|{bounds.end}")
    values = {sid: [rng.randint(*TRAFFIC_RANGE_BANDS[sid]) for _ in labels] for sid in SEGMENT_IDS}
    to_classify = {sid: [rng.randint(*TO_CLASSIFY_BAND) for _ in labels] for sid in SEGMENT_IDS}
    return TrafficData(labels, subtitle, values, to_classify)


def traffic_series(data: TrafficData, focus: Optional[str]) -> dict[str, list[int]]:
    """Segment lines plus the dashed reference: sum of every segment, or one segment while it is focused."""
    out = dict(data.values)
    if focus in SEGMENT_IDS:
        out["to-classify"] = list(data.to_classify[focus])
    else:
        out["to-classify"] = [sum(data.to_classify[s][i] for s in SEGMENT_IDS) for i in range(len(data.labels))]
    return out


# --- Classification (pie, themes, analytic table) -------------------------------------------------------------------
def validate_classification(data: dict) -> dict:
    """Port of validateClassification (same messages as the TypeScript)."""
    if not isinstance(data, dict) or not isinstance(data.get("normas"), list):
        raise ValueError('Classification payload without "normas".')
    codes: set = set()
    for norma in data["normas"]:
        code = norma.get("code")
        if not code or code in codes:
            raise ValueError(f"Norma without a unique code: {code}")
        codes.add(code)
        if not _valid_day(norma.get("classifiedAt")):
            raise ValueError(f"Norma {code} has an invalid classifiedAt: {norma.get('classifiedAt')}")
        if norma.get("segment") not in SEGMENT_IDS:
            raise ValueError(f"Norma {code} has an unknown segment: {norma.get('segment')}")
        if not norma.get("theme") or not isinstance(norma.get("applicable"), bool):
            raise ValueError(f"Norma {code} has an invalid theme or applicability.")
        if any(not norma.get(key) for key in ("orgao", "tipo", "numero", "area", "diretoria")):
            raise ValueError(f"Norma {code} without orgao, tipo, numero, area or diretoria.")
    return data


def classification(bounds: Optional[DateRange] = None, segment: Optional[str] = None) -> list[dict]:
    """Every classified norma: only the mock has the whole list. With the BFF (v1) the rows come a page at a time
    (classified_page, classified_export) and the pie/themes from classification_summary."""
    if not use_mock_data():
        raise RuntimeError("O contrato v1 não entrega a lista inteira: use classified_page/classification_summary.")
    return validate_classification(load_json("dashboard-classificacao.json"))["normas"]


def norma_from_v1(item: dict) -> dict:
    """NormaClassificada -> ClassifiedNorma (contratos §11.3)."""
    return {"code": item.get("codigo"), "orgao": item.get("orgao"), "tipo": item.get("tipo"), "numero": item.get("numero"),
            "classifiedAt": item.get("dataClassificacao"), "segment": _segment_from_v1(item.get("segmento")),
            "theme": item.get("tema"), "applicable": item.get("aplicavel"), "area": item.get("area"), "diretoria": item.get("diretoria")}


def _classified_params(bounds: DateRange, segment, theme, applicable, sort_key: str, sort_dir: str) -> dict:
    field_name = V1_SORT_FIELDS.get(sort_key, "dataClassificacao")
    return {**_v1_range(bounds), "segmento": _v1_segment(segment), "tema": theme, "aplicavel": applicable,
            "sort": [f"{field_name},{'asc' if sort_dir == 'asc' else 'desc'}"]}


def _classified_rows(response: dict) -> tuple[list[dict], int]:
    content, total = _page_envelope(response)
    rows = [norma_from_v1(item) for item in content]
    validate_classification({"normas": rows})
    return rows, total


def classified_page(bounds: DateRange, segment=None, theme=None, applicable=None, sort_key: str = "classifiedAt",
                    sort_dir: str = "desc", page: int = 1, size: int = 15) -> Page:
    """One page (1-based, as compat.pager) of the Tabela Analítica from GET /normas-classificadas (v1 page = page - 1).
    A page past the end (filters shrank the table) is asked again as the last page."""
    params = _classified_params(bounds, segment, theme, applicable, sort_key, sort_dir)
    size = min(max(1, size), MAX_PAGE_SIZE)
    page = max(1, int(page))
    rows, total = _classified_rows(_bff("/normas-classificadas", page=page - 1, size=size, **params))
    last = max(1, math.ceil(total / size))
    if page > last:
        page = last
        rows, total = _classified_rows(_bff("/normas-classificadas", page=page - 1, size=size, **params))
    return Page(rows, total, page)


def classified_export(bounds: DateRange, segment=None, theme=None, applicable=None, sort_key: str = "classifiedAt",
                      sort_dir: str = "desc") -> list[dict]:
    """Every row of the Tabela Analítica for the Excel (D5): pages of 100, in order, up to EXPORT_LIMIT rows (at most 50
    requests). Above the limit nothing is exported: ExportLimitError carries the pt-BR text. Called only on "Gerar Excel"
    and never cached: one entry per filter combination and page would fill the cache for a one-off read."""
    params = _classified_params(bounds, segment, theme, applicable, sort_key, sort_dir)
    rows, total = _classified_rows(_bff_uncached("/normas-classificadas", page=0, size=EXPORT_PAGE_SIZE, **params))
    if total > EXPORT_LIMIT:
        raise ExportLimitError(total)
    pages = math.ceil(total / EXPORT_PAGE_SIZE)
    for index in range(1, pages):
        more, _ = _classified_rows(_bff_uncached("/normas-classificadas", page=index, size=EXPORT_PAGE_SIZE, **params))
        if not more:  # the table shrank while paging: export what exists
            break
        rows.extend(more)
    return rows[:total]


def filter_classified(normas: list[dict], bounds: DateRange, segment=None, theme=None, applicable=None) -> list[dict]:
    """Normas classified inside `bounds` (both ends included), optionally one segment/theme/class, in the order received."""
    first, last = bounds.start.isoformat(), bounds.end.isoformat()
    return [
        n for n in normas
        if (segment is None or n["segment"] == segment)
        and (theme is None or n["theme"] == theme)
        and (applicable is None or n["applicable"] == applicable)
        and first <= n["classifiedAt"] <= last
    ]


@dataclass
class ThemeShare:
    label: str
    count: int
    share: float
    width: float
    grouped: int = 0


@dataclass
class ClassificationAggregate:
    total: int
    applicable: int
    not_applicable: int
    applicable_share: float
    themes_total: int
    themes: list[ThemeShare]
    others: Optional[ThemeShare]


def aggregate_classification(normas, bounds, segment=None, theme=None, themes_of=True, top=TOP_THEMES) -> ClassificationAggregate:
    by_theme: dict[str, int] = {}
    total = applicable = 0
    for n in filter_classified(normas, bounds, segment=segment, theme=theme):
        total += 1
        if n["applicable"]:
            applicable += 1
        if n["applicable"] == themes_of:
            by_theme[n["theme"]] = by_theme.get(n["theme"], 0) + 1
    # Largest first; ties by name (pt-BR collation) so the order is stable.
    ranked = sorted(by_theme.items(), key=lambda kv: (-kv[1], pt_br_key(kv[0])))
    # Grouping a single theme into "Outros" hides a name for nothing: list it instead.
    named = ranked if len(ranked) <= top + 1 else ranked[:top]
    rest = ranked[len(named):]
    largest = max([1] + [c for _, c in named])
    themes_total = applicable if themes_of else total - applicable

    def share(count: int) -> float:
        return count / themes_total if themes_total else 0

    others_count = sum(c for _, c in rest)
    return ClassificationAggregate(
        total, applicable, total - applicable, (applicable / total if total else 0), themes_total,
        [ThemeShare(label, c, share(c), c / largest, 0) for label, c in named],
        ThemeShare(OTHER_THEMES_LABEL, others_count, share(others_count), 0, len(rest)) if rest else None,
    )


def classification_aggregate_from_v1(response: dict) -> ClassificationAggregate:
    """ResumoNormasClassificadas -> ClassificationAggregate (contratos §11.3): share and width are computed here, the
    ranking (10 themes, 11 without grouping a single one, ties by pt-BR name) comes ready from the BFF."""
    if not isinstance(response, dict) or not isinstance(response.get("temas"), list):
        raise ValueError("Resumo da classificação sem temas.")
    total = _count(response.get("total"), "total")
    applicable = _count(response.get("aplicaveis"), "aplicaveis")
    not_applicable = _count(response.get("naoAplicaveis"), "naoAplicaveis")
    themes_total = _count(response.get("totalTemas"), "totalTemas")
    named = [(str(item.get("tema") or ""), _count(item.get("quantidade"), "temas")) for item in response["temas"]]
    if any(not label for label, _ in named):
        raise ValueError("Tema sem nome no resumo da classificação.")
    largest = max([1] + [c for _, c in named])

    def share(count: int) -> float:
        return count / themes_total if themes_total else 0

    others = response.get("outrosTemas")
    grouped = None
    if isinstance(others, dict):
        count = _count(others.get("quantidade"), "outrosTemas")
        grouped = ThemeShare(OTHER_THEMES_LABEL, count, share(count), 0, _count(others.get("temasAgrupados"), "outrosTemas"))
    return ClassificationAggregate(total, applicable, not_applicable, (applicable / total if total else 0), themes_total,
                                   [ThemeShare(label, c, share(c), c / largest, 0) for label, c in named], grouped)


def classification_summary(bounds: DateRange, segment: Optional[str] = None, theme: Optional[str] = None,
                           themes_of: bool = True) -> ClassificationAggregate:
    """Pie and themes list: the mock aggregates its whole list; the BFF answers GET /normas-classificadas/resumo."""
    if use_mock_data():
        return aggregate_classification(classification(), bounds, segment=segment, theme=theme, themes_of=themes_of)
    response = _bff("/normas-classificadas/resumo", **_v1_range(bounds), segmento=_v1_segment(segment), tema=theme,
                    temasDe="APLICAVEIS" if themes_of else "NAO_APLICAVEIS")
    return classification_aggregate_from_v1(response)


# --- E-mails ------------------------------------------------------------------------------------------------------------
SUGGESTED_CLASSES = ("Aplicável", "Aplicável parcialmente", "Não aplicável")
APPLICABILITY_LABELS = {"Aplicável": "Sim", "Aplicável parcialmente": "Parcialmente", "Não aplicável": "Não"}


def validate_emails(data: dict) -> dict:
    """Port of validateEmails (same messages as the TypeScript)."""
    if not isinstance(data, dict) or not isinstance(data.get("emails"), list):
        raise ValueError('Emails payload without "emails".')
    ids: set = set()
    for email in data["emails"]:
        eid = email.get("id")
        if not eid or eid in ids:
            raise ValueError(f"Email without a unique id: {eid}")
        ids.add(eid)
        if not _valid_sent_at(email.get("sentAt")):
            raise ValueError(f"Email {eid} has an invalid sentAt: {email.get('sentAt')}")
        if email.get("segment") not in SEGMENT_IDS:
            raise ValueError(f"Email {eid} has an unknown segment: {email.get('segment')}")
        if not _is_number(email.get("recipients")) or email["recipients"] < 0:
            raise ValueError(f"Email {eid} has an invalid recipients count.")
        if not isinstance(email.get("normas"), list) or not email["normas"]:
            raise ValueError(f"Email {eid} has no normas.")
        for norma in email["normas"]:
            fields = ("code", "orgao", "tipo", "numero", "area", "diretoria")
            if any(not norma.get(key) for key in fields) or norma.get("suggestedClass") not in SUGGESTED_CLASSES:
                raise ValueError(f"Email {eid} has an invalid norma: {norma.get('code')}")
    return data


def emails(bounds: Optional[DateRange] = None) -> list[dict]:
    """Every suggestion e-mail: only the mock has the whole list (with the BFF use emails_summary)."""
    if not use_mock_data():
        raise RuntimeError("O contrato v1 não entrega a lista inteira: use emails_summary.")
    return validate_emails(load_json("dashboard-emails.json"))["emails"]


def email_from_v1(item: dict) -> dict:
    """EmailSugestao -> SuggestionEmail (contratos §11.4)."""
    normas = [{"code": n.get("codigo"), "orgao": n.get("orgao"), "tipo": n.get("tipo"), "numero": n.get("numero"),
               "title": n.get("tema"), "suggestedClass": V1_SUGGESTED_CLASSES.get(n.get("classeSugerida")),
               "area": n.get("area"), "diretoria": n.get("diretoria")}
              for n in item.get("normas") or []] if isinstance(item.get("normas"), list) else None
    return {"id": item.get("id"), "sentAt": item.get("dataEnvio"), "subject": item.get("assunto"),
            "segment": _segment_from_v1(item.get("segmento")), "recipients": item.get("destinatarios"), "normas": normas}


@dataclass
class EmailBucket:
    label: str
    emails: int = 0
    normas: list[int] = field(default_factory=lambda: [0] * len(SEGMENT_IDS))
    total: int = 0


@dataclass
class EmailsAggregate:
    subtitle: str
    buckets: list[EmailBucket]
    emails: int
    normas: int
    distinct_normas: int
    average_per_email: float
    segment_normas: list[int]
    list: list[dict]


def sent_day(email: dict) -> date:
    """Calendar date as written in sentAt (no timezone shift)."""
    return date.fromisoformat(email["sentAt"][:10])


def sent_datetime(email: dict) -> datetime:
    """Local date and time as sent (offset ignored, like the TS)."""
    return datetime.fromisoformat(email["sentAt"][:16])


def _bucket_index(period: str, start: date, day: date) -> int:
    if period == "Day":
        return (day - start).days
    if period == "Month":
        return (day.year - start.year) * 12 + day.month - start.month
    return day.year - start.year


def aggregate_emails(items: list[dict], period: str, bounds: DateRange, segment: Optional[str] = None) -> EmailsAggregate:
    labels, subtitle = build_traffic_period(period, bounds)
    count = point_count(period, bounds)
    buckets = [EmailBucket(label) for label in labels]
    codes: set[str] = set()
    segment_normas = [0] * len(SEGMENT_IDS)
    chosen: list[dict] = []
    total = 0
    for email in items:
        if segment is not None and email["segment"] != segment:
            continue
        day = sent_day(email)
        if day < bounds.start or day > bounds.end:
            continue
        index = _bucket_index(period, bounds.start, day)
        position = SEGMENT_IDS.index(email["segment"]) if email["segment"] in SEGMENT_IDS else -1
        if index < 0 or index >= count or position < 0:
            continue
        bucket = buckets[index]
        bucket.emails += 1
        bucket.normas[position] += len(email["normas"])
        bucket.total += len(email["normas"])
        segment_normas[position] += len(email["normas"])
        total += len(email["normas"])
        codes.update(n["code"] for n in email["normas"])
        chosen.append(email)
    chosen.sort(key=sent_datetime, reverse=True)  # stable, like Array.prototype.sort
    return EmailsAggregate(subtitle, buckets, len(chosen), total, len(codes), (total / len(chosen) if chosen else 0), segment_normas, chosen)


def emails_aggregate_from_v1(period: str, bounds: DateRange, summary: dict, latest: dict) -> EmailsAggregate:
    """ResumoEmailsSugestao + the first page of e-mails -> EmailsAggregate (contratos §11.4); labels and subtitle are
    built here (build_traffic_period), one bucket per v1 period, in order."""
    labels, subtitle = build_traffic_period(period, bounds)
    if not isinstance(summary, dict) or not isinstance(summary.get("periodos"), list):
        raise ValueError("Resumo de e-mails sem períodos.")
    if len(summary["periodos"]) != len(labels):
        raise ValueError(f"Resumo de e-mails com {len(summary['periodos'])} períodos; esperados {len(labels)}.")
    buckets = [EmailBucket(label, _count(item.get("emails"), "emails"), _by_segment(item.get("normasPorSegmento"), "normasPorSegmento"),
                           _count(item.get("totalNormas"), "totalNormas")) for label, item in zip(labels, summary["periodos"], strict=True)]
    content, _ = _page_envelope(latest)
    items = validate_emails({"emails": [email_from_v1(item) for item in content]})["emails"]
    average = summary.get("mediaNormasPorEmail")
    if not _is_number(average) or average < 0:
        raise ValueError("Média de normas por e-mail inválida.")
    return EmailsAggregate(subtitle, buckets, _count(summary.get("totalEmails"), "totalEmails"), _count(summary.get("totalNormas"), "totalNormas"),
                           _count(summary.get("normasDistintas"), "normasDistintas"), float(average),
                           _by_segment(summary.get("normasPorSegmento"), "normasPorSegmento"), items)


def emails_summary(period: str, bounds: DateRange, segment: Optional[str] = None) -> EmailsAggregate:
    """Fluxo de e-mail - Triagem: the mock aggregates its whole list; the BFF answers the summary (indicators and bars)
    and the latest LATEST_EMAILS e-mails (size 5, dataEnvio desc)."""
    if use_mock_data():
        return aggregate_emails(emails(), period, bounds, segment)
    v1_segment = _v1_segment(segment)
    summary = _bff("/emails-sugestao/resumo", granularidade=V1_PERIODS[period], **_v1_range(bounds), segmento=v1_segment)
    latest = _bff("/emails-sugestao", **_v1_range(bounds), segmento=v1_segment, page=0, size=LATEST_EMAILS, sort=["dataEnvio,desc"])
    return emails_aggregate_from_v1(period, bounds, summary, latest)


# --- Waterfall ----------------------------------------------------------------------------------------------------------
MAX_PARTS_PER_STEP = 3
POINTS_PER_YEAR = {"Day": 365, "Month": 12, "Year": 1}
ACTIVITY_SWING = 0.10
SEGMENT_SWING = 0.08
MIN_RESULT_SHARE = 0.05
DECIMALS = 3


@dataclass
class WfSegment:
    step_index: int
    part_index: int
    step_label: str
    part_label: str
    kind: str
    value: float
    low: float
    high: float


@dataclass
class WfColumn:
    step: dict
    total: float
    start: float
    end: float
    segments: list[WfSegment]


@dataclass
class WfModel:
    columns: list[WfColumn]
    segments: list[WfSegment]
    base: float
    result: float


def _sum(parts: list[dict]) -> float:
    """Left-to-right float sum, as Array.reduce (Python 3.12+ sum() compensates and could differ in the last bit)."""
    total = 0.0
    for part in parts:
        total = total + part["value"]
    return total


def build_waterfall(steps: list[dict]) -> WfModel:
    if not steps:
        raise ValueError("Cascata sem etapas.")
    columns: list[WfColumn] = []
    level = 0
    for si, step in enumerate(steps):
        if not step["parts"] or len(step["parts"]) > MAX_PARTS_PER_STEP:
            raise ValueError(f'Etapa "{step["label"]}" precisa ter de 1 a {MAX_PARTS_PER_STEP} componentes.')
        for part in step["parts"]:
            value = part.get("value")
            if not _is_number(value) or not math.isfinite(value) or value < 0:
                raise ValueError(f'Valor inválido em "{step["label"]} / {part.get("label")}".')
        total = _sum(step["parts"])
        is_total = step["kind"] == "total"
        cursor = 0 if is_total else level
        segs = []
        for pi, part in enumerate(step["parts"]):
            # Totals stack upward from zero; decreases hang downward from the running level.
            low = cursor if is_total else cursor - part["value"]
            high = cursor + part["value"] if is_total else cursor
            segs.append(WfSegment(si, pi, step["label"], part["label"], step["kind"], part["value"], low, high))
            cursor = high if is_total else low
        end = total if is_total else level - total
        columns.append(WfColumn(step, total, level, end, segs))
        level = end
    first_total = next((c for c in columns if c.step["kind"] == "total"), None)
    return WfModel(columns, [s for c in columns for s in c.segments], first_total.total if first_total else 0, level)


def _imul(a: int, b: int) -> int:
    """Math.imul: 32-bit multiplication (low 32 bits), returned as unsigned here (the TS applies >>> 0 next)."""
    return (a * b) & 0xFFFFFFFF


def noise(seed: str, key: str) -> float:
    """Stable value in [-1, 1) for a seed/key pair (FNV-1a over UTF-16 code units, like charCodeAt in the TS)."""
    text = f"{seed}#{key}"
    h = 0x811C9DC5
    raw = text.encode("utf-16-le")
    for index in range(0, len(raw), 2):
        h ^= raw[index] | (raw[index + 1] << 8)
        h = _imul(h, 0x01000193)
    return (h / 0x100000000) * 2 - 1


def _js_round(value: float) -> float:
    """Math.round: half toward +infinity (Python round() is half-to-even)."""
    floor = math.floor(value)
    return floor + 1 if value - floor >= 0.5 else floor


def _round(value: float, method: Callable[[float], float] = _js_round) -> float:
    factor = math.pow(10, DECIMALS)
    return method(value * factor) / factor


def _clone_step(step: dict) -> dict:
    return {**step, "parts": [dict(part) for part in step["parts"]]}


def _covers_base_year(base: dict, bounds: DateRange) -> bool:
    year = base.get("baseYear")
    return year is not None and bounds.start == date(year, 1, 1) and bounds.end == date(year, 12, 31)


def _distribute(total: float, base_parts: list[dict], parts: list[dict]) -> list[dict]:
    """Splits `total` in the base proportions; the last part absorbs the rounding so the sum is exact."""
    base_total = _sum(base_parts) or 1
    remaining = total
    out = []
    for index, part in enumerate(parts):
        is_last = index == len(parts) - 1
        value = _round(remaining) if is_last else _round((total * base_parts[index]["value"]) / base_total)
        remaining = _round(remaining - value)
        out.append({"label": part["label"], "value": max(value, 0)})
    return out


def derive_waterfall(base: dict, period: str, bounds: DateRange) -> dict:
    """Waterfall of any period from the annual base, deterministic (bit-for-bit port of waterfall-derive.ts; mock only)."""
    _, subtitle = build_traffic_period(period, bounds)
    if _covers_base_year(base, bounds):
        return {**base, "period": subtitle, "steps": [_clone_step(s) for s in base["steps"]]}

    seed = f"{period}|{iso(bounds.start)}|{iso(bounds.end)}"
    scale = (point_count(period, bounds) / POINTS_PER_YEAR[period]) * (1 + ACTIVITY_SWING * noise(seed, "activity"))

    steps = []
    for index, step in enumerate(base["steps"]):
        # Totals after the first are running levels: filled in below, once the decreases are known.
        if step["kind"] == "total" and index > 0:
            steps.append(_clone_step(step))
            continue
        parts = [
            {"label": p["label"],
             "value": max(_round(p["value"] * scale * (1 + SEGMENT_SWING * noise(seed, f'{step["id"]}/{p["label"]}'))), 0)}
            for p in step["parts"]
        ]
        steps.append({**step, "parts": parts})

    first_total = next((s for s in steps if s["kind"] == "total"), None)
    gross = _sum(first_total["parts"]) if first_total else 0
    decreases = [s for s in steps if s["kind"] == "decrease"]
    total_decrease = 0
    for step in decreases:
        total_decrease = total_decrease + _sum(step["parts"])
    max_decrease = gross * (1 - MIN_RESULT_SHARE)
    if total_decrease > max_decrease and total_decrease > 0:
        ratio = max_decrease / total_decrease
        # Floor, so rounding never pushes the decreases back over the limit.
        for step in decreases:
            for part in step["parts"]:
                part["value"] = _round(part["value"] * ratio, math.floor)

    level = 0
    for index, step in enumerate(steps):
        if step["kind"] == "decrease":
            level = _round(level - _sum(step["parts"]))
            continue
        if index > 0:
            step["parts"] = _distribute(max(level, 0), base["steps"][index]["parts"], step["parts"])
        level = _round(_sum(step["parts"]))
    return {**base, "period": subtitle, "steps": steps}


_CURRENCY_CODE = re.compile(r"^[A-Z]{3}$")


def validate_waterfall(data: dict) -> dict:
    """Cascade header the page formats with: ISO 4217 `currency` (3 capital letters) and a positive finite `unitScale`.

    The page reads both outside its try block; a missing or malformed one must fail here, where the error placeholder
    catches it, not in format_currency (KeyError/TypeError traceback).
    """
    if not isinstance(data, dict) or not isinstance(data.get("steps"), list):
        raise ValueError("Cascata sem etapas.")
    currency = data.get("currency")
    if not isinstance(currency, str) or not _CURRENCY_CODE.match(currency):
        raise ValueError("Cascata sem código de moeda válido (ISO 4217).")
    scale = data.get("unitScale")
    if not _is_number(scale) or not math.isfinite(scale) or scale <= 0:
        raise ValueError("Cascata sem escala de unidade válida.")
    return data


def waterfall_from_v1(response: dict) -> dict:
    """CascataResultado -> WaterfallData (contratos §11.5); the header is checked next by validate_waterfall."""
    if not isinstance(response, dict) or not isinstance(response.get("etapas"), list):
        raise ValueError("Cascata sem etapas.")
    steps = []
    for item in response["etapas"]:
        kind = V1_STEP_KINDS.get(item.get("tipo"))
        if kind is None:
            raise ValueError(f"Etapa da cascata com tipo fora do contrato v1: {item.get('tipo')}")
        parts = item.get("partes") if isinstance(item.get("partes"), list) else []
        steps.append({"id": item.get("id"), "label": item.get("rotulo"), "kind": kind,
                      "parts": [{"label": part.get("rotulo"), "value": part.get("valor")} for part in parts]})
    return {"period": response.get("periodo"), "currency": response.get("moeda"), "unitScale": response.get("escalaUnidade"), "steps": steps}


def waterfall(period: str, bounds: DateRange) -> dict:
    if use_mock_data():
        return validate_waterfall(derive_waterfall(load_json("dashboard-waterfall.json"), period, bounds))
    data = copy.deepcopy(waterfall_from_v1(_bff("/cascatas-resultado", granularidade=V1_PERIODS[period], **_v1_range(bounds))))
    validate_waterfall(data)
    if not data.get("period"):
        data["period"] = build_traffic_period(period, bounds)[1]
    return data


# --- pt-BR formatting (waterfall-format.ts) -----------------------------------------------------------------------------
CURRENCY_SYMBOLS = {"BRL": "R$", "USD": "US$", "EUR": "€"}
_COMPACT = ((12, "tri"), (9, "bi"), (6, "mi"), (3, "mil"))


def _compact_decimal(amount: Decimal) -> str:
    """Intl pt-BR compact short with maximumFractionDigits 1 (half away from zero, magnitude chosen after rounding)."""
    one = Decimal("0.1")
    rounded = amount.quantize(one, rounding=ROUND_HALF_UP)
    exponent, suffix = 0, ""
    for exp, name in _COMPACT:
        if rounded >= Decimal(10) ** exp:
            exponent, suffix = exp, name
            break
    if exponent:
        scaled = amount.scaleb(-exponent).quantize(one, rounding=ROUND_HALF_UP)
        if scaled >= 1000 and exponent < 12:  # 999.95 mil -> 1 mi
            nxt = {3: (6, "mi"), 6: (9, "bi"), 9: (12, "tri")}[exponent]
            exponent, suffix = nxt
            scaled = amount.scaleb(-exponent).quantize(one, rounding=ROUND_HALF_UP)
    else:
        scaled = rounded
    whole, _, frac = f"{scaled:f}".partition(".")
    frac = frac.rstrip("0")
    # Compact notation groups thousands only from 5 integer digits (ICU minimumGroupingDigits 2).
    whole = f"{int(whole):,}".replace(",", ".") if len(whole) >= 5 else whole
    text = f"{whole},{frac}" if frac else whole
    return f"{text}{NBSP}{suffix}" if suffix else text


def format_currency(value: float, unit_scale: float, currency: str = "BRL") -> str:
    """Compact pt-BR currency like Intl: 'R$ 15 mi', 'R$ 1,5 mi', 'R$ 400 mil'; negative with a typographic minus.

    Separators are no-break spaces (U+00A0), exactly as Intl.NumberFormat writes them.
    """
    amount = Decimal(repr(float(abs(value) * unit_scale)))
    # An unknown ISO code falls back to the raw BFF string: escape it, this text reaches st.html unescaped (waterfall table).
    symbol = CURRENCY_SYMBOLS.get(currency) or html.escape(str(currency))
    text = f"{symbol}{NBSP}{_compact_decimal(amount)}"
    return f"{MINUS}{text}" if value < 0 else text


def format_share(value: float, base: float) -> str:
    """Share of `base`, e.g. '30%' or '−30%'; '—' when base is 0."""
    if not base:
        return "—"
    text = f"{format_number(abs(value) / base, 0, 1, exponent=2)}%"
    return f"{MINUS}{text}" if value < 0 else text


def segment_label(segment_id: str) -> str:
    return SEGMENT_LABELS.get(segment_id, segment_id)
