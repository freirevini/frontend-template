import { Component } from '@angular/core';
import { finalize, from, Observable, Subscription, switchMap, takeUntil } from 'rxjs';

import { ChatLauncherService } from '../../../chat/chat-launcher.service';
import { CHAT_TEXTS } from '../../../chat/chat-texts';
import { downloadXlsx, XlsxTable } from '../../../core/export/xlsx-export';
import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { CollectedRows, collectPages, DataPage, MAX_PAGE_SIZE } from '../../../core/http/api-page';
import { EXPORT_MAX_ROWS, exportLimitText } from '../../../core/http/http-error-texts';
import { ClassificationDataService } from '../classification/classification-data.service';
import { ClassificationFilters, NormasQuery, NormasSortKey } from '../classification/classification-derive';
import { ClassificationViewBase } from '../classification/classification-view.base';
import { ClassifiedNorma } from '../classification/classification.model';
import { TRAFFIC_SERIES } from '../dashboard-charts-data';
import { toInputDate } from '../period/period-range';
import { CardComponent, CardBodyComponent, SpinnerComponent, TableDirective } from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';

/** Rows per page of the table on screen (the export has every filtered row, up to EXPORT_MAX_ROWS). */
export const ANALYTIC_PAGE_SIZE = 15;

export type AnalyticColumnKey = NormasSortKey;

/** Failure of the Excel file (build or page requests). */
const EXPORT_FAILED_TEXT = 'Não foi possível gerar o arquivo Excel.';

export interface AnalyticColumn {
  key: AnalyticColumnKey;
  /** Header text, pt-BR. */
  label: string;
  /** Excel column width. */
  width: number;
}

export const ANALYTIC_COLUMNS: readonly AnalyticColumn[] = [
  { key: 'classifiedAt', label: 'Data da classificação', width: 14 },
  { key: 'orgao', label: 'Órgão', width: 10 },
  { key: 'tipo', label: 'Tipo', width: 22 },
  { key: 'numero', label: 'Número', width: 10 },
  { key: 'theme', label: 'Tema', width: 48 },
  { key: 'segment', label: 'Segmento', width: 14 },
  { key: 'applicable', label: 'Aplicável ao banco?', width: 12 },
  { key: 'area', label: 'Área', width: 30 },
  { key: 'diretoria', label: 'Diretoria', width: 16 }
];

/**
 * "Tabela Analítica": one row per classified norma behind the cards above, with every page filter applied
 * (Tráfego period, segment badge, slice of the pie, theme of the list). Sortable columns, pages of 15 rows and an Excel
 * export of all filtered rows in the order on screen. Each row can be sent to the assistant as a question.
 * Only the page on screen is held: filters, sort and page go to ClassificationDataService.getNormasPage, which answers
 * from the BFF (`dataMock` false: paging, sort and filters on the server) or emulates the same paging over the mock.
 * The Excel fetches pages of 100 one after the other, up to EXPORT_MAX_ROWS (decision D5 of ADR-023).
 */
@Component({
    selector: 'app-analytic-table',
    templateUrl: './analytic-table.component.html',
    imports: [CardComponent, CardBodyComponent, IconDirective, SpinnerComponent, TableDirective, ApiErrorTextComponent]
})
export class AnalyticTableComponent extends ClassificationViewBase<DataPage<ClassifiedNorma>> {
  readonly columns = ANALYTIC_COLUMNS;
  readonly pageSize = ANALYTIC_PAGE_SIZE;

  /** Rows of the page on screen. */
  rows: ClassifiedNorma[] = [];
  /** Rows matching the filters, across every page. */
  total = 0;
  sortKey: AnalyticColumnKey = 'classifiedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  page = 1;
  exporting = false;
  exportError: string | null = null;
  /** Error behind exportError, when a page request failed (pt-BR text and support code by ApiErrorTextComponent). */
  exportProblem: unknown = null;
  /** Rows fetched so far for the Excel while the pages arrive; null otherwise. */
  exportProgress: { loaded: number; total: number } | null = null;
  /** Saves the file; replaceable in specs. */
  download: (table: XlsxTable) => Promise<void> = downloadXlsx;

  private exportRun?: Subscription;

  constructor(
    dataService: ClassificationDataService,
    private readonly chat: ChatLauncherService
  ) {
    super(dataService);
  }

  /** "Perguntar ao assistente sobre Resolução CMN nº 4.855". */
  askLabel(norma: ClassifiedNorma): string {
    return `${CHAT_TEXTS.askAbout} ${this.normaName(norma)}`;
  }

  /** Opens the assistant with a question about the row; the answer comes from the assistant's own data. */
  askAssistant(norma: ClassifiedNorma): void {
    this.chat.ask(`Quais são os pontos principais da ${this.normaName(norma)}?`);
  }

  private normaName(norma: ClassifiedNorma): string {
    return `${norma.tipo} ${norma.orgao} nº ${norma.numero}`;
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get pageRows(): ClassifiedNorma[] {
    return this.rows;
  }

  /** "1–15 de 573". */
  get rangeLabel(): string {
    if (!this.total) {
      return '0 de 0';
    }
    const first = (this.page - 1) * this.pageSize + 1;
    const last = Math.min(this.total, this.page * this.pageSize);
    return `${this.formatNumber(first)}–${this.formatNumber(last)} de ${this.formatNumber(this.total)}`;
  }

  /** Button text while exporting: rows fetched so far, then the file being built. */
  get exportLabel(): string {
    const progress = this.exportProgress;
    return progress ? `Buscando linhas... ${this.formatNumber(progress.loaded)} de ${this.formatNumber(progress.total)}` : 'Gerando arquivo...';
  }

  /** Filters applied, in pt-BR, e.g. ["Segmento: Varejo", "Não aplicáveis", "Tema: Pix"]. */
  get activeFilters(): string[] {
    const filters: string[] = [];
    if (this.segmentFilter) {
      filters.push(`Segmento: ${this.filterLabel}`);
    }
    if (this.applicabilityFilter !== null) {
      filters.push(this.applicabilityFilter ? 'Aplicáveis' : 'Não aplicáveis');
    }
    if (this.themeFilter) {
      filters.push(`Tema: ${this.themeFilter}`);
    }
    return filters;
  }

  /** Header click: sorts by that column, or flips the direction when it is already the sort column. */
  sortBy(key: AnalyticColumnKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = key === 'classifiedAt' ? 'desc' : 'asc';
    }
    this.page = 1;
    this.refresh();
  }

  ariaSort(key: AnalyticColumnKey): string {
    if (this.sortKey !== key) {
      return 'none';
    }
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  goTo(page: number): void {
    const target = Math.min(this.pageCount, Math.max(1, page));
    if (target !== this.page) {
      this.page = target;
      this.refresh();
    }
  }

  /** Text of a cell as shown on screen and in the spreadsheet. */
  cell(norma: ClassifiedNorma, key: AnalyticColumnKey): string {
    switch (key) {
      case 'classifiedAt':
        return norma.classifiedAt.split('-').reverse().join('/');
      case 'segment':
        return TRAFFIC_SERIES.find((series) => series.id === norma.segment)?.label ?? norma.segment;
      case 'applicable':
        return norma.applicable ? 'Sim' : 'Não';
      default:
        return norma[key];
    }
  }

  /**
   * Builds the .xlsx of every filtered row (exceljs, R9) and downloads it. Rows come in pages of 100, one request after
   * the other; above EXPORT_MAX_ROWS nothing is exported and EXPORT_LIMIT_TEXT asks to refine the filters (D5). A filter
   * change or leaving the page cancels the requests in flight. Resolves when the export ends, fails or is cancelled.
   */
  exportXlsx(): Promise<void> {
    if (this.exporting || !this.total) {
      return Promise.resolve();
    }
    this.exportError = null;
    this.exportProblem = null;
    if (this.total > EXPORT_MAX_ROWS) {
      this.exportError = exportLimitText(this.total);
      return Promise.resolve();
    }
    this.exporting = true;
    const query = this.query(0, MAX_PAGE_SIZE);
    const fetchPage = (page: number, size: number) => this.dataService.getNormasPage({ ...query, page, size });
    return new Promise((resolve) => {
      this.exportRun = collectPages(fetchPage, EXPORT_MAX_ROWS, MAX_PAGE_SIZE, (loaded, total) => (this.exportProgress = { loaded, total }))
        .pipe(
          switchMap((collected) => from(this.saveRows(collected))),
          takeUntil(this.destroy$),
          finalize(() => {
            this.exporting = false;
            this.exportProgress = null;
            resolve();
          })
        )
        .subscribe({
          error: (error) => {
            console.error('[analytic-table] xlsx export failed', error);
            this.exportError = EXPORT_FAILED_TEXT;
            this.exportProblem = error;
          }
        });
    });
  }

  /**
   * Spreadsheet version of the table: the rows given (every filtered row, sorted as on screen, when exporting; the page on
   * screen by default) and the filter total; filters in the subtitle and the file name.
   */
  xlsxTable(rows: ClassifiedNorma[] = this.rows, total = this.total): XlsxTable {
    const filters = this.activeFilters;
    const suffix = [
      this.segmentFilter,
      this.applicabilityFilter === null ? null : this.applicabilityFilter ? 'aplicaveis' : 'nao-aplicaveis',
      this.themeFilter ? `tema-${slug(this.themeFilter)}` : null
    ].filter(Boolean);
    return {
      sheetName: 'Tabela Analítica',
      title: 'Tabela Analítica — normas classificadas',
      subtitle: `${this.subtitle} · ${this.formatNumber(total)} ${total === 1 ? 'norma' : 'normas'}${filters.length ? ' · filtros: ' + filters.join(' · ') : ''}`,
      columns: this.columns.map((column) => ({ key: column.key, header: column.label, width: column.width })),
      rows: rows.map((norma) => Object.fromEntries(this.columns.map((column) => [column.key, this.cell(norma, column.key)]))),
      fileName: `tabela-analitica-${toInputDate(this.bounds.start)}-a-${toInputDate(this.bounds.end)}${suffix.length ? '-' + suffix.join('-') : ''}.xlsx`
    };
  }

  /** The table shows every row of the period that matches all the page filters. */
  protected filters(): ClassificationFilters {
    return {};
  }

  protected request(): Observable<DataPage<ClassifiedNorma>> {
    return this.dataService.getNormasPage(this.query(this.page - 1, this.pageSize));
  }

  protected receive(page: DataPage<ClassifiedNorma>): void {
    this.rows = page.items;
    this.total = page.total;
    // The total shrank under the page on screen (data changed on the server): show the last page instead of an empty one.
    if (!this.rows.length && this.total > 0 && this.page > this.pageCount) {
      this.page = this.pageCount;
      this.refresh();
    }
  }

  /** New filters: first page, no export message, and an export in flight is cancelled. */
  protected override onFiltersChange(): void {
    this.page = 1;
    this.exportError = null;
    this.exportProblem = null;
    this.exportRun?.unsubscribe();
  }

  private query(page: number, size: number): NormasQuery {
    return {
      bounds: this.bounds,
      segment: this.segmentFilter,
      applicable: this.applicabilityFilter,
      theme: this.themeFilter,
      sort: { key: this.sortKey, direction: this.sortDirection },
      page,
      size
    };
  }

  /** Rows of every page → file; above the cap, only the message (no partial file, D5). */
  private async saveRows({ rows, total }: CollectedRows<ClassifiedNorma>): Promise<void> {
    this.exportProgress = null;
    if (total > EXPORT_MAX_ROWS) {
      this.exportError = exportLimitText(total);
      return;
    }
    await this.download(this.xlsxTable(rows, total));
  }
}

/** "Pix: regras de devolução" → "pix-regras-de-devolucao" (file names). */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}
