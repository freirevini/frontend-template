"""Port of the period-range.ts behavior (labels, subtitles, presets and validation messages) plus pt-BR number formats."""
from datetime import date

import pytest

from core.period import (DEFAULT_TRAFFIC_RANGE, MAX_TRAFFIC_POINTS, PERIOD_END, PERIOD_LABELS, TRAFFIC_RANGES, DateRange,
                         build_traffic_period, default_selection, fmt_date, fmt_decimal, fmt_int, fmt_percent, from_input_date,
                         is_traffic_period, point_count, preset_range, to_input_date, traffic_period, validate_custom_range)


def test_constants_match_the_landing():
    assert PERIOD_END == date(2021, 12, 31)
    assert PERIOD_LABELS == {"Day": "Dia", "Month": "Mês", "Year": "Ano"}
    assert DEFAULT_TRAFFIC_RANGE == {"Day": 7, "Month": 12, "Year": 5}
    assert MAX_TRAFFIC_POINTS == {"Day": 92, "Month": 60, "Year": 30}
    assert [label for _, label in TRAFFIC_RANGES["Day"]] == ["7 dias", "15 dias", "30 dias"]
    assert [label for _, label in TRAFFIC_RANGES["Month"]] == ["3 meses", "6 meses", "12 meses"]
    assert [label for _, label in TRAFFIC_RANGES["Year"]] == ["3 anos", "5 anos"]
    assert is_traffic_period("Month") and not is_traffic_period("Week")


def test_presets_end_on_the_last_mock_day():
    assert preset_range("Day", 7) == DateRange(date(2021, 12, 25), date(2021, 12, 31))
    assert preset_range("Month", 3) == DateRange(date(2021, 10, 1), date(2021, 12, 31))
    assert preset_range("Month", 12) == DateRange(date(2021, 1, 1), date(2021, 12, 31))
    assert preset_range("Year", 5) == DateRange(date(2017, 1, 1), date(2021, 12, 31))
    assert default_selection().bounds == preset_range("Month", 12)


def test_point_count_includes_both_ends():
    assert point_count("Day", DateRange(date(2021, 2, 27), date(2021, 3, 2))) == 4
    assert point_count("Month", DateRange(date(2020, 11, 15), date(2021, 2, 1))) == 4
    assert point_count("Year", DateRange(date(2017, 6, 1), date(2021, 1, 1))) == 5


def test_day_labels_use_short_pt_br_weekdays_and_subtitle():
    labels, subtitle = traffic_period("Day", 7)
    assert labels == ["Sáb 25/12", "Dom 26/12", "Seg 27/12", "Ter 28/12", "Qua 29/12", "Qui 30/12", "Sex 31/12"]
    assert subtitle == "25 a 31 de dezembro de 2021"
    assert build_traffic_period("Day", DateRange(date(2021, 5, 10), date(2021, 6, 20)))[1] == "10 de maio a 20 de junho de 2021"
    assert build_traffic_period("Day", DateRange(date(2020, 12, 30), date(2021, 1, 2)))[1] == "30 de dezembro de 2020 a 2 de janeiro de 2021"
    assert build_traffic_period("Day", DateRange(date(2021, 12, 31), date(2021, 12, 31)))[1] == "31 de dezembro de 2021"


def test_month_labels_and_subtitles():
    labels, subtitle = traffic_period("Month", 3)
    assert labels == ["Outubro", "Novembro", "Dezembro"]
    assert subtitle == "Outubro a dezembro de 2021"
    assert traffic_period("Month", 12)[1] == "Janeiro a dezembro de 2021"
    labels, subtitle = build_traffic_period("Month", DateRange(date(2020, 11, 1), date(2021, 2, 28)))
    assert labels == ["Nov/20", "Dez/20", "Jan/21", "Fev/21"]
    assert subtitle == "Novembro de 2020 a fevereiro de 2021"
    assert build_traffic_period("Month", DateRange(date(2021, 3, 1), date(2021, 3, 31)))[1] == "Março de 2021"


def test_year_labels_and_subtitles():
    assert traffic_period("Year", 5) == (["2017", "2018", "2019", "2020", "2021"], "2017 a 2021")
    assert build_traffic_period("Year", DateRange(date(2021, 1, 1), date(2021, 12, 31))) == (["2021"], "2021")


@pytest.mark.parametrize(("period", "start", "end", "message"), [
    ("Day", None, date(2021, 1, 1), "Informe as duas datas."),
    ("Day", date(2021, 1, 2), date(2021, 1, 1), "A data inicial deve ser anterior ou igual à data final."),
    ("Day", date(2021, 1, 1), date(2021, 4, 3), "Para Dia, escolha até 92 dias ou use Mês."),
    ("Month", date(2016, 1, 1), date(2021, 1, 1), "Para Mês, escolha até 60 meses ou use Ano."),
    ("Year", date(1990, 1, 1), date(2021, 1, 1), "Para Ano, escolha até 30 anos."),
])
def test_custom_range_validation_messages(period, start, end, message):
    assert validate_custom_range(period, start, end) == message


def test_custom_range_at_the_limits_is_accepted():
    assert validate_custom_range("Day", date(2021, 1, 1), date(2021, 4, 2)) is None  # 92 days
    assert validate_custom_range("Month", date(2017, 1, 1), date(2021, 12, 31)) is None  # 60 months
    assert validate_custom_range("Year", date(1992, 1, 1), date(2021, 1, 1)) is None  # 30 years


def test_input_dates_round_trip():
    assert to_input_date(date(2021, 3, 5)) == "2021-03-05"
    assert from_input_date("2021-03-05") == date(2021, 3, 5)
    assert from_input_date("") is None
    assert from_input_date("05/03/2021") is None


def test_pt_br_number_formats():
    assert fmt_int(1234) == "1.234"
    assert fmt_int(2.5) == "3"  # Intl rounds half away from zero
    assert fmt_percent(0.28) == "28%"
    assert fmt_percent(0.285) == "29%"  # exact decimal scaling, no 28.499999 binary error
    assert fmt_percent(0.124, 1) == "12,4%"
    assert fmt_decimal(1234.5, 2) == "1.234,50"
    assert fmt_decimal(1.75) == "1,8"
    assert fmt_date(date(2021, 12, 31)) == "31/12/2021"
