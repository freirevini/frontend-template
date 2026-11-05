"""Period helpers: port of landing-analitica src/app/views/dashboard/period/period-range.ts.

Granularity (Dia/Mês/Ano), preset ranges ("Últimos N"), custom ranges and their pt-BR labels/subtitles.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal, Optional

TrafficPeriod = Literal["Day", "Month", "Year"]

PERIODS: tuple[str, ...] = ("Day", "Month", "Year")
MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
# Intl.DateTimeFormat('pt-BR', { weekday: 'short' }) gives "seg.", "sáb."...; the TS capitalizes and drops the dot.
WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]  # Python weekday(): Monday = 0

# Last day of the mock data: every preset range ends here (trocar por "hoje" ou pela data do BFF).
PERIOD_END = date(2021, 12, 31)

TRAFFIC_RANGES: dict[str, list[tuple[int, str]]] = {
    "Day": [(7, "7 dias"), (15, "15 dias"), (30, "30 dias")],
    "Month": [(3, "3 meses"), (6, "6 meses"), (12, "12 meses")],
    "Year": [(3, "3 anos"), (5, "5 anos")],
}
DEFAULT_TRAFFIC_RANGE = {"Day": 7, "Month": 12, "Year": 5}
MAX_TRAFFIC_POINTS = {"Day": 92, "Month": 60, "Year": 30}
PERIOD_LABELS = {"Day": "Dia", "Month": "Mês", "Year": "Ano"}


@dataclass(frozen=True)
class DateRange:
    start: date
    end: date


@dataclass(frozen=True)
class PeriodSelection:
    period: str
    range: Optional[int]  # preset count, or None for a custom range
    bounds: DateRange


def is_traffic_period(value: object) -> bool:
    return value in PERIODS


def add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def point_count(period: str, bounds: DateRange) -> int:
    """Days, months or years between the two dates, both included."""
    if period == "Day":
        return (bounds.end - bounds.start).days + 1
    if period == "Month":
        return (bounds.end.year - bounds.start.year) * 12 + bounds.end.month - bounds.start.month + 1
    return bounds.end.year - bounds.start.year + 1


def validate_custom_range(period: str, start: Optional[date], end: Optional[date]) -> Optional[str]:
    """pt-BR error for a custom range, or None when it can be plotted (same texts as the Angular project)."""
    if not start or not end:
        return "Informe as duas datas."
    if start > end:
        return "A data inicial deve ser anterior ou igual à data final."
    count = point_count(period, DateRange(start, end))
    if count > MAX_TRAFFIC_POINTS[period]:
        return {
            "Day": f"Para Dia, escolha até {MAX_TRAFFIC_POINTS['Day']} dias ou use Mês.",
            "Month": f"Para Mês, escolha até {MAX_TRAFFIC_POINTS['Month']} meses ou use Ano.",
            "Year": f"Para Ano, escolha até {MAX_TRAFFIC_POINTS['Year']} anos.",
        }[period]
    return None


def preset_range(period: str, count: int) -> DateRange:
    end = PERIOD_END
    if period == "Day":
        return DateRange(end - timedelta(days=count - 1), end)
    if period == "Month":
        return DateRange(add_months(date(end.year, end.month, 1), -(count - 1)), end)
    return DateRange(date(end.year - (count - 1), 1, 1), end)


def traffic_period(period: str, count: int) -> tuple[list[str], str]:
    """Labels and subtitle for the last `count` days, months or years of the mock data."""
    return build_traffic_period(period, preset_range(period, count))


def default_selection(period: str = "Month") -> PeriodSelection:
    count = DEFAULT_TRAFFIC_RANGE[period]
    return PeriodSelection(period, count, preset_range(period, count))


def _day_month_long(d: date) -> str:
    return f"{d.day} de {MONTHS[d.month - 1].lower()}"


def build_traffic_period(period: str, bounds: DateRange) -> tuple[list[str], str]:
    """Labels (one per day, month or year) and subtitle for any date range."""
    start, end = bounds.start, bounds.end
    count = point_count(period, bounds)
    same_year = start.year == end.year

    if period == "Day":
        labels = []
        for i in range(count):
            d = start + timedelta(days=i)
            labels.append(f"{WEEKDAYS_SHORT[d.weekday()]} {d.day:02d}/{d.month:02d}")
        frm = _day_month_long(start)
        if not same_year:
            frm = f"{frm} de {start.year}"
        elif start.month == end.month:
            frm = str(start.day)
        subtitle = f"{_day_month_long(end)} de {end.year}" if count == 1 else f"{frm} a {_day_month_long(end)} de {end.year}"
        return labels, subtitle

    if period == "Month":
        labels = []
        for i in range(count):
            d = add_months(date(start.year, start.month, 1), i)
            name = MONTHS[d.month - 1]
            labels.append(name if same_year else f"{name[:3]}/{str(d.year)[2:]}")
        start_name = MONTHS[start.month - 1]
        end_name = MONTHS[end.month - 1].lower()
        if count == 1:
            subtitle = f"{start_name} de {end.year}"
        elif same_year:
            subtitle = f"{start_name} a {end_name} de {end.year}"
        else:
            subtitle = f"{start_name} de {start.year} a {end_name} de {end.year}"
        return labels, subtitle

    labels = [str(start.year + i) for i in range(count)]
    return labels, (labels[0] if count == 1 else f"{labels[0]} a {labels[-1]}")


def iso(d: date) -> str:
    return d.isoformat()


to_input_date = iso  # yyyy-MM-dd, the query-string format of the BFF (toInputDate in the TS)

_INPUT_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def from_input_date(value: str) -> Optional[date]:
    """Parses yyyy-MM-dd; None when empty or malformed (fromInputDate in the TS)."""
    match = _INPUT_DATE.match(value or "")
    if not match:
        return None
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def fmt_date(d: date) -> str:
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def format_number(value: float, min_fraction: int = 0, max_fraction: int = 0, grouping: bool = True, exponent: int = 0) -> str:
    """Intl.NumberFormat('pt-BR') style: half away from zero on the decimal text, '.' thousands, ',' decimals.

    `exponent` scales by a power of ten exactly (2 for percentages, like ICU), with no binary rounding error.
    """
    amount = Decimal(repr(float(value))).scaleb(exponent).copy_abs().quantize(Decimal(1).scaleb(-max_fraction), rounding=ROUND_HALF_UP)
    whole, _, frac = f"{amount:f}".partition(".")
    frac = frac.rstrip("0")
    frac = frac + "0" * (min_fraction - len(frac))
    if grouping:
        whole = f"{int(whole):,}".replace(",", ".")
    text = f"{whole},{frac}" if frac else whole
    negative = value < 0 and any(ch not in "0.," for ch in text)
    return f"-{text}" if negative else text


def fmt_int(value: float) -> str:
    """1234 -> '1.234' (Angular number:'1.0-0')."""
    return format_number(value)


def fmt_percent(value: float, digits: int = 0) -> str:
    """0.28 -> '28%' (Angular percent:'1.0-0'; digits fixes the decimals)."""
    return f"{format_number(value, digits, digits, exponent=2)}%"


def fmt_decimal(value: float, digits: int = 1) -> str:
    """1234.5 -> '1.234,5' with exactly `digits` decimals."""
    return format_number(value, digits, digits)
