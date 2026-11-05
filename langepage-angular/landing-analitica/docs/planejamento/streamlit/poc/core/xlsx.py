"""Excel export with openpyxl: same workbook shape as src/app/core/export/xlsx-export.ts (title, subtitle, header with
the export accent fill and white bold text, frozen header, data rows, optional totals row, column widths, autofilter)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
EXPORT_ACCENT = "FF223AD2"  # --app-export-accent (always the light value)
EXPORT_MUTED = "FF4B5968"   # --app-export-muted


@dataclass
class XlsxColumn:
    key: str
    header: str
    num_fmt: Optional[str] = None
    width: Optional[int] = None


@dataclass
class XlsxTable:
    sheet_name: str
    title: str
    columns: list[XlsxColumn]
    rows: list[dict]
    file_name: str
    subtitle: Optional[str] = None
    totals: Optional[dict] = field(default=None)


def build_xlsx(table: XlsxTable) -> bytes:
    wb = Workbook()
    wb.properties.creator = "Agenda Normativa"
    wb.properties.created = datetime.now()
    ws = wb.active
    ws.title = table.sheet_name[:31]

    ws.append([table.title])
    ws.cell(row=1, column=1).font = Font(bold=True, size=14)
    if table.subtitle:
        ws.append([table.subtitle])
        ws.cell(row=2, column=1).font = Font(italic=True, color=EXPORT_MUTED)
    ws.append([])

    ws.append([c.header for c in table.columns])
    header_row = ws.max_row
    for col in range(1, len(table.columns) + 1):
        cell = ws.cell(row=header_row, column=col)
        cell.font = Font(bold=True, color="FFFFFFFF")
        cell.fill = PatternFill(fill_type="solid", fgColor=EXPORT_ACCENT)
        cell.alignment = Alignment(vertical="center")

    for row in table.rows:
        ws.append([row.get(c.key) for c in table.columns])
    if table.totals:
        ws.append([table.totals.get(c.key) for c in table.columns])
        for col in range(1, len(table.columns) + 1):
            cell = ws.cell(row=ws.max_row, column=col)
            cell.font = Font(bold=True)
            cell.border = Border(top=Side(style="thin", color=EXPORT_MUTED))

    for index, column in enumerate(table.columns, start=1):
        letter = get_column_letter(index)
        ws.column_dimensions[letter].width = column.width or max(12, len(column.header) + 4)
        if column.num_fmt:
            for r in range(header_row + 1, ws.max_row + 1):
                cell = ws.cell(row=r, column=index)
                if cell.value is not None:
                    cell.number_format = column.num_fmt
    # Set after the rows: creating the freeze cell earlier would move the next append one row down (openpyxl _current_row).
    ws.freeze_panes = f"A{header_row + 1}"
    ws.auto_filter.ref = f"A{header_row}:{get_column_letter(len(table.columns))}{header_row}"

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
