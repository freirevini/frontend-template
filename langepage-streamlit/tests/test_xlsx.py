"""Port of xlsx-export.spec.ts: the workbook read back with openpyxl has the landing layout and light colors."""
from io import BytesIO

from openpyxl import load_workbook

from core.xlsx import XLSX_MIME, XlsxColumn, XlsxTable, build_xlsx

TABLE = XlsxTable(
    sheet_name="Tráfego",
    title="Tráfego por segmento",
    subtitle="Janeiro a março de 2021",
    columns=[
        XlsxColumn("period", "Período"),
        XlsxColumn("s0", "Atacado", num_fmt="#,##0"),
        XlsxColumn("s1", "Normas a Classificar", num_fmt="#,##0", width=30),
    ],
    rows=[{"period": "Janeiro", "s0": 1200, "s1": 30}, {"period": "Fevereiro", "s0": 980, "s1": 25}],
    totals={"period": "Total", "s0": 2180, "s1": 55},
    file_name="trafego-2021-01-01-a-2021-03-31.xlsx",
)


def _sheet(table=TABLE):
    data = build_xlsx(table)
    assert data[:2] == b"PK"  # zip container
    return load_workbook(BytesIO(data)).worksheets[0]


def _values(ws, row):
    return [cell.value for cell in ws[row] if cell.value is not None]


def test_title_header_rows_and_totals_in_one_sheet():
    ws = _sheet()
    assert ws.title == "Tráfego"
    assert _values(ws, 1) == ["Tráfego por segmento"]
    assert _values(ws, 2) == ["Janeiro a março de 2021"]
    assert _values(ws, 3) == []
    assert _values(ws, 4) == ["Período", "Atacado", "Normas a Classificar"]
    assert _values(ws, 5) == ["Janeiro", 1200, 30]
    assert _values(ws, 7) == ["Total", 2180, 55]
    assert ws.max_row == 7


def test_styles_use_the_light_export_colors():
    ws = _sheet()
    assert ws["A1"].font.bold and ws["A1"].font.sz == 14
    assert ws["A2"].font.italic and ws["A2"].font.color.rgb == "FF4B5968"
    for cell in ws[4]:
        assert cell.fill.fgColor.rgb == "FF223AD2"
        assert cell.font.bold and cell.font.color.rgb == "FFFFFFFF"
    for cell in ws[7]:
        assert cell.font.bold
        assert cell.border.top.style == "thin" and cell.border.top.color.rgb == "FF4B5968"


def test_freeze_widths_formats_and_autofilter():
    ws = _sheet()
    assert ws.freeze_panes == "A5"
    assert ws.auto_filter.ref == "A4:C4"
    assert ws.column_dimensions["A"].width == 12  # max(12, len("Período") + 4)
    assert ws.column_dimensions["B"].width == 12
    assert ws.column_dimensions["C"].width == 30
    assert ws["B5"].number_format == "#,##0" and ws["B7"].number_format == "#,##0"
    assert ws["B4"].number_format == "General"  # header keeps its text
    # Regression (openpyxl): freezing before appending shifted the data one row down.
    assert ws["A5"].value == "Janeiro"


def test_without_subtitle_and_totals_the_header_is_row_3():
    table = XlsxTable("Planilha com um nome muito longo demais", "Título", [XlsxColumn("a", "Coluna A")], [{"a": 1}], "x.xlsx")
    ws = _sheet(table)
    assert len(ws.title) == 31
    assert _values(ws, 3) == ["Coluna A"]
    assert ws.freeze_panes == "A4"
    assert ws.max_row == 4


def test_formula_prefixed_cell_is_quoted_as_text():
    # E-00X: a norma title or an uploaded file name starting with "=" must never become a live Excel formula
    # (CWE-1236); openpyxl/Excel read a leading apostrophe as "force text".
    table = XlsxTable(
        sheet_name="T", title="=cmd|' /C calc'!A0", subtitle="+SUM(A1:A9)",
        columns=[XlsxColumn("a", "A")],
        rows=[{"a": "=HYPERLINK(\"http://x\",\"clique\")"}, {"a": "-1+1"}, {"a": "@SUM(1)"}, {"a": "normal"}, {"a": 5}],
        totals={"a": "=A1"}, file_name="x.xlsx",
    )
    ws = _sheet(table)
    assert ws["A1"].value == "'=cmd|' /C calc'!A0"
    assert ws["A2"].value == "'+SUM(A1:A9)"
    body = [ws.cell(row=r, column=1).value for r in range(5, 10)]
    assert body == ["'=HYPERLINK(\"http://x\",\"clique\")", "'-1+1", "'@SUM(1)", "normal", 5]
    assert ws.cell(row=10, column=1).value == "'=A1"


def test_formula_prefixed_header_is_quoted_as_text():
    # E-018: headers went to the sheet without _safe_cell; the chat's date column header comes from the BFF (rotuloData).
    table = XlsxTable(sheet_name="T", title="t", columns=[XlsxColumn("a", "=HYPERLINK(\"http://x\")"), XlsxColumn("b", "Data")],
                      rows=[{"a": 1, "b": 2}], file_name="x.xlsx")
    ws = _sheet(table)
    assert [ws.cell(row=3, column=c).value for c in (1, 2)] == ["'=HYPERLINK(\"http://x\")", "Data"]


def test_a_leading_tab_or_carriage_return_is_quoted_whatever_follows():
    table = XlsxTable(sheet_name="T", title="t", columns=[XlsxColumn("a", "\tA")],
                      rows=[{"a": "\tcmd"}, {"a": "\r+1"}, {"a": "\t"}, {"a": "a\tb"}], file_name="x.xlsx")
    ws = _sheet(table)
    assert ws.cell(row=3, column=1).value == "'\tA"
    values = [ws.cell(row=r, column=1).value for r in range(4, 8)]
    assert values[0] == "'\tcmd" and values[2] == "'\t" and values[3] == "a\tb"
    assert values[1].startswith("'") and values[1][2:] == "+1"  # XML reads the stored \r back as \n


def test_mime():
    assert XLSX_MIME == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
