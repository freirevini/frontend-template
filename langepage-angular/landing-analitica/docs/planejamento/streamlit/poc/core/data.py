"""Data layer: mock JSON files (same as src/assets/data) and the derivations the Angular front computes.

Ports: segment-cards.service.ts, classification-derive.ts, emails-derive.ts, waterfall.model.ts, waterfall-derive.ts
and the random mock of dashboard-charts-data.ts (Normativos Recebidos).
"""
from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import streamlit as st

from core.period import DateRange, build_traffic_period, point_count
from core.tokens import SEGMENT_IDS, SEGMENT_LABELS

# Mock JSON files: `poc/data/` when present (copy of src/assets/data), else the landing's own folder four levels up
# (docs/planejamento/streamlit/poc -> landing-analitica/src/assets/data).
_POC = Path(__file__).resolve().parent.parent
DATA_DIR = _POC / "data" if (_POC / "data").is_dir() else _POC.parents[3] / "src" / "assets" / "data"

TOP_THEMES = 10
LATEST_EMAILS = 5
TRAFFIC_RANGE_BANDS = {"atacado": (160, 240), "corporativo": (100, 160), "plataforma": (55, 105), "varejo": (120, 200)}
TO_CLASSIFY_BAND = (3, 12)


@st.cache_data(show_spinner=False)
def load_json(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


# --- Segment cards -----------------------------------------------------------------------------------------------------
def segments() -> list[dict]:
    data = load_json("dashboard-segments.json")
    for s in data["segments"]:
        if s["toClassify"] > s["total"] or s["total"] < 0:
            raise ValueError(f'Normas a classificar maiores que o total no segmento "{s["label"]}".')
    return data["segments"]


# --- Normativos Recebidos (mock: random numbers inside each series band, seeded for a stable PoC) --------------------
@dataclass
class TrafficData:
    labels: list[str]
    subtitle: str
    values: dict[str, list[int]]       # classified normas per segment
    to_classify: dict[str, list[int]]  # normas to classify per segment


def traffic(period: str, bounds: DateRange) -> TrafficData:
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
def classification() -> list[dict]:
    return load_json("dashboard-classificacao.json")["normas"]


def filter_classified(normas: list[dict], bounds: DateRange, segment=None, theme=None, applicable=None) -> list[dict]:
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
    ranked = sorted(by_theme.items(), key=lambda kv: (-kv[1], kv[0].casefold()))
    named = ranked if len(ranked) <= top + 1 else ranked[:top]
    rest = ranked[len(named):]
    largest = max([1] + [c for _, c in named])
    themes_total = applicable if themes_of else total - applicable
    share = (lambda c: c / themes_total if themes_total else 0)
    others_count = sum(c for _, c in rest)
    return ClassificationAggregate(
        total, applicable, total - applicable, (applicable / total if total else 0), themes_total,
        [ThemeShare(l, c, share(c), c / largest) for l, c in named],
        ThemeShare("Outros temas", others_count, share(others_count), 0, len(rest)) if rest else None,
    )


# --- E-mails ------------------------------------------------------------------------------------------------------------
def emails() -> list[dict]:
    return load_json("dashboard-emails.json")["emails"]


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
    return date.fromisoformat(email["sentAt"][:10])


def sent_datetime(email: dict) -> datetime:
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
    chosen.sort(key=sent_datetime, reverse=True)
    return EmailsAggregate(subtitle, buckets, len(chosen), total, len(codes), (total / len(chosen) if chosen else 0), segment_normas, chosen)


# --- Waterfall ----------------------------------------------------------------------------------------------------------
MAX_PARTS_PER_STEP = 3


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


def build_waterfall(steps: list[dict]) -> WfModel:
    if not steps:
        raise ValueError("Cascata sem etapas.")
    columns: list[WfColumn] = []
    level = 0.0
    for si, step in enumerate(steps):
        if not step["parts"] or len(step["parts"]) > MAX_PARTS_PER_STEP:
            raise ValueError(f'Etapa "{step["label"]}" precisa ter de 1 a {MAX_PARTS_PER_STEP} componentes.')
        total = sum(p["value"] for p in step["parts"])
        cursor = 0.0 if step["kind"] == "total" else level
        segs = []
        for pi, part in enumerate(step["parts"]):
            if step["kind"] == "total":
                seg = WfSegment(si, pi, step["label"], part["label"], step["kind"], part["value"], cursor, cursor + part["value"])
                cursor = seg.high
            else:
                seg = WfSegment(si, pi, step["label"], part["label"], step["kind"], part["value"], cursor - part["value"], cursor)
                cursor = seg.low
            segs.append(seg)
        end = total if step["kind"] == "total" else level - total
        columns.append(WfColumn(step, total, level, end, segs))
        level = end
    first_total = next((c for c in columns if c.step["kind"] == "total"), None)
    return WfModel(columns, [s for c in columns for s in c.segments], first_total.total if first_total else 0, level)


def _noise(seed: str, key: str) -> float:
    """Stable value in [-1, 1) for a seed/key pair (FNV-1a, same arithmetic as the TypeScript version)."""
    text = f"{seed}#{key}"
    h = 0x811C9DC5
    for ch in text:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return (h / 0x100000000) * 2 - 1


def _round(value: float, decimals: int = 3, floor: bool = False) -> float:
    factor = 10 ** decimals
    import math
    return (math.floor(value * factor) if floor else round(value * factor)) / factor


def derive_waterfall(base: dict, period: str, bounds: DateRange) -> dict:
    """Waterfall of any period from the annual base, deterministic (port of waterfall-derive.ts; temporary mock)."""
    _, subtitle = build_traffic_period(period, bounds)
    year = base.get("baseYear")
    if year and bounds.start == date(year, 1, 1) and bounds.end == date(year, 12, 31):
        return {**base, "period": subtitle, "steps": json.loads(json.dumps(base["steps"]))}
    points_per_year = {"Day": 365, "Month": 12, "Year": 1}[period]
    seed = f"{period}|{bounds.start.isoformat()}|{bounds.end.isoformat()}"
    scale = (point_count(period, bounds) / points_per_year) * (1 + 0.10 * _noise(seed, "activity"))
    steps = []
    for index, step in enumerate(base["steps"]):
        if step["kind"] == "total" and index > 0:
            steps.append(json.loads(json.dumps(step)))
            continue
        parts = [{"label": p["label"], "value": max(_round(p["value"] * scale * (1 + 0.08 * _noise(seed, f'{step["id"]}/{p["label"]}'))), 0)}
                 for p in step["parts"]]
        steps.append({**step, "parts": parts})
    gross = sum(p["value"] for s in steps if s["kind"] == "total" for p in s["parts"]) if any(s["kind"] == "total" for s in steps) else 0
    gross = sum(p["value"] for p in next(s for s in steps if s["kind"] == "total")["parts"])
    decreases = [s for s in steps if s["kind"] == "decrease"]
    total_decrease = sum(p["value"] for s in decreases for p in s["parts"])
    max_decrease = gross * (1 - 0.05)
    if total_decrease > max_decrease and total_decrease > 0:
        ratio = max_decrease / total_decrease
        for s in decreases:
            for p in s["parts"]:
                p["value"] = _round(p["value"] * ratio, floor=True)
    level = 0.0
    for index, step in enumerate(steps):
        if step["kind"] == "decrease":
            level = _round(level - sum(p["value"] for p in step["parts"]))
            continue
        if index > 0:
            base_parts = base["steps"][index]["parts"]
            base_total = sum(p["value"] for p in base_parts) or 1
            total = max(level, 0)
            remaining = total
            new_parts = []
            for pi, part in enumerate(step["parts"]):
                is_last = pi == len(step["parts"]) - 1
                value = _round(remaining) if is_last else _round(total * base_parts[pi]["value"] / base_total)
                remaining = _round(remaining - value)
                new_parts.append({"label": part["label"], "value": max(value, 0)})
            step["parts"] = new_parts
        level = _round(sum(p["value"] for p in step["parts"]))
    return {**base, "period": subtitle, "steps": steps}


def waterfall(period: str, bounds: DateRange) -> dict:
    return derive_waterfall(load_json("dashboard-waterfall.json"), period, bounds)


def format_currency(value: float, unit_scale: float, currency: str = "BRL") -> str:
    """Compact pt-BR currency like Intl: 'R$ 15 mi', 'R$ 1,5 mi', 'R$ 400 mil'; negative with a typographic minus."""
    amount = abs(value) * unit_scale
    for limit, suffix in ((1e9, " bi"), (1e6, " mi"), (1e3, " mil")):
        if amount >= limit:
            number = amount / limit
            text = f"{number:.1f}".rstrip("0").rstrip(".").replace(".", ",")
            return f"{'−' if value < 0 else ''}R$ {text}{suffix}"
    text = f"{amount:,.0f}".replace(",", ".")
    return f"{'−' if value < 0 else ''}R$ {text}"


def format_share(value: float, base: float) -> str:
    if not base:
        return "—"
    text = f"{abs(value) / base * 100:.1f}".rstrip("0").rstrip(".").replace(".", ",")
    return f"{'−' if value < 0 else ''}{text}%"


def segment_label(segment_id: str) -> str:
    return SEGMENT_LABELS.get(segment_id, segment_id)
