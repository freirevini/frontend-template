import { buildXlsxWorkbook, downloadXlsx, loadExcelJs, XlsxTable } from './xlsx-export';

const TABLE: XlsxTable = {
  sheetName: 'Tráfego',
  title: 'Tráfego por segmento',
  subtitle: 'Janeiro a março de 2021',
  columns: [
    { key: 'period', header: 'Período' },
    { key: 's0', header: 'Atacado', numFmt: '#,##0' },
    { key: 's1', header: 'Normas a Classificar', numFmt: '#,##0' }
  ],
  rows: [
    { period: 'Janeiro', s0: 1200, s1: 30 },
    { period: 'Fevereiro', s0: 980, s1: 25 }
  ],
  totals: { period: 'Total', s0: 2180, s1: 55 },
  fileName: 'trafego-2021-01-01-a-2021-03-31.xlsx'
};

describe('xlsx-export', () => {
  it('writes title, header, rows and totals into one sheet, readable back as .xlsx', async () => {
    const workbook = await buildXlsxWorkbook(TABLE);
    const buffer = await workbook.xlsx.writeBuffer();
    expect(new Uint8Array(buffer).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b])); // "PK" (zip)

    const ExcelJS = await loadExcelJs();
    const reread = new ExcelJS.Workbook() as unknown as {
      xlsx: { load(data: ArrayBuffer): Promise<unknown> };
      worksheets: { name: string; getRow(n: number): { values: unknown[] } }[];
    };
    await reread.xlsx.load(buffer);
    const sheet = reread.worksheets[0];
    const values = (row: number) => sheet.getRow(row).values.slice(1);
    expect(sheet.name).toBe('Tráfego');
    expect(values(1)).toEqual(['Tráfego por segmento']);
    expect(values(2)).toEqual(['Janeiro a março de 2021']);
    expect(values(4)).toEqual(['Período', 'Atacado', 'Normas a Classificar']);
    expect(values(5)).toEqual(['Janeiro', 1200, 30]);
    expect(values(7)).toEqual(['Total', 2180, 55]);
  });

  // Regression: colors used to follow the active theme, so a dark-theme export got a light-blue header (#6b7cf0)
  // and a subtitle in #a9b1bd, barely readable on the white sheet.
  it('uses the light brand colors even when the dark theme is active', async () => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    try {
      const workbook = await buildXlsxWorkbook(TABLE);
      const sheet = workbook.worksheets[0] as unknown as {
        getRow(n: number): { font: { color?: { argb: string } }; getCell(n: number): { fill: { fgColor?: { argb: string } }; border: { top?: { color?: { argb: string } } } } };
      };
      expect(sheet.getRow(2).font.color?.argb).toBe('FF4B5968');
      expect(sheet.getRow(4).getCell(1).fill.fgColor?.argb).toBe('FF223AD2');
      expect(sheet.getRow(7).getCell(1).border.top?.color?.argb).toBe('FF4B5968');
    } finally {
      if (previous === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', previous);
      }
    }
  });

  it('downloads without the click reaching document listeners (page outside-click handlers)', async () => {
    let downloadName = '';
    // The native click of the download link, minus the download itself: same bubbling event, default action blocked.
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloadName = this.download;
      this.addEventListener('click', (event) => event.preventDefault(), { once: true });
      this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    const documentClicks = jasmine.createSpy('documentClick');
    document.addEventListener('click', documentClicks);
    try {
      await downloadXlsx(TABLE);
    } finally {
      document.removeEventListener('click', documentClicks);
    }
    expect(downloadName).toBe('trafego-2021-01-01-a-2021-03-31.xlsx');
    expect(documentClicks).not.toHaveBeenCalled();
  });
});
