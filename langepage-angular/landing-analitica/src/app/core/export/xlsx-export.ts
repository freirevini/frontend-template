/*
 * Minimal typing of the exceljs API used here. The package's own typings need Node types (stream, events),
 * which the browser app does not load, so the browser build is imported untyped (see src/declarations.d.ts).
 */
interface XlsxFont { bold?: boolean; italic?: boolean; size?: number; color?: { argb: string } }
interface XlsxCell {
  fill: unknown;
  alignment: unknown;
  border: unknown;
  numFmt: string;
}
interface XlsxRow {
  number: number;
  font: XlsxFont;
  eachCell(callback: (cell: XlsxCell) => void): void;
}
interface XlsxSheetColumn {
  width: number;
  eachCell(options: { includeEmpty: boolean }, callback: (cell: XlsxCell, rowNumber: number) => void): void;
}
interface XlsxWorksheet {
  views: unknown[];
  autoFilter: unknown;
  addRow(values: unknown[]): XlsxRow;
  getColumn(index: number): XlsxSheetColumn;
}
export interface XlsxWorkbook {
  creator: string;
  created: Date;
  worksheets: XlsxWorksheet[];
  addWorksheet(name: string): XlsxWorksheet;
  xlsx: { writeBuffer(): Promise<ArrayBuffer>; load(buffer: ArrayBuffer): Promise<unknown> };
}
interface ExcelJsModule {
  Workbook: new () => XlsxWorkbook;
}

/** One column of an exported table. */
export interface XlsxColumn {
  key: string;
  /** Header text, pt-BR. */
  header: string;
  /** Excel number format, e.g. '#,##0' (shown with the user's locale separators). */
  numFmt?: string;
  width?: number;
}

/** A table to export: one sheet with a title block, a header row, data rows and an optional totals row. */
export interface XlsxTable {
  sheetName: string;
  title: string;
  /** Second line under the title (period, filter). */
  subtitle?: string;
  columns: XlsxColumn[];
  rows: Record<string, string | number | null>[];
  totals?: Record<string, string | number | null>;
  /** File name with the .xlsx extension. */
  fileName: string;
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Loads exceljs on demand (browser build via its package.json "browser" field), keeping it out of the initial bundle. */
export async function loadExcelJs(): Promise<ExcelJsModule> {
  const module = (await import('exceljs/dist/exceljs.min.js')) as { default?: ExcelJsModule } & Partial<ExcelJsModule>;
  return (module.default ?? module) as ExcelJsModule;
}

/**
 * CSS color token (#rrggbb) as Excel ARGB, or the fallback when the token is missing or not a hex color.
 * Only --app-export-* tokens: they keep their light values in the dark theme, so the file looks the same in both.
 */
function tokenArgb(token: string, fallback: string): string {
  const value = typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    : '';
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1] ?? fallback;
  return `FF${hex.toUpperCase()}`;
}

/** Builds the workbook for a table: title, subtitle, styled header (export accent), frozen header, totals in bold. */
export async function buildXlsxWorkbook(table: XlsxTable): Promise<XlsxWorkbook> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agenda Normativa';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(table.sheetName.slice(0, 31));
  const lastColumn = table.columns.length;

  sheet.addRow([table.title]).font = { bold: true, size: 14 };
  if (table.subtitle) {
    sheet.addRow([table.subtitle]).font = { italic: true, color: { argb: tokenArgb('--app-export-muted', '4B5968') } };
  }
  sheet.addRow([]);

  const header = sheet.addRow(table.columns.map((column) => column.header));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tokenArgb('--app-export-accent', '223AD2') } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.views = [{ state: 'frozen', ySplit: header.number }];

  for (const row of table.rows) {
    sheet.addRow(table.columns.map((column) => row[column.key] ?? null));
  }
  if (table.totals) {
    const totals = sheet.addRow(table.columns.map((column) => table.totals?.[column.key] ?? null));
    totals.font = { bold: true };
    totals.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: tokenArgb('--app-export-muted', '4B5968') } } };
    });
  }

  table.columns.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.width = column.width ?? Math.max(12, column.header.length + 4);
    if (column.numFmt) {
      sheetColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > header.number) {
          cell.numFmt = column.numFmt as string;
        }
      });
    }
  });
  sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: lastColumn } };
  return workbook;
}

/** Builds the .xlsx file and hands it to the browser as a download (generated in the browser, R9). */
export async function downloadXlsx(table: XlsxTable): Promise<void> {
  const workbook = await buildXlsxWorkbook(table);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = table.fileName;
  link.rel = 'noopener';
  // Detached on purpose: an attached link's click bubbles to `document`, where page handlers (the Triagent outside-click
  // that clears the filters) take it for a user click outside. Edge and Chrome download from a detached link.
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
