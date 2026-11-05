import { Component, HostListener, OnDestroy, OnInit, Optional } from '@angular/core';
import { catchError, EMPTY, Subject, switchMap, takeUntil } from 'rxjs';

import { ApiErrorTextComponent } from '../../core/http/api-error-text.component';

import { downloadXlsx, XlsxTable } from '../../core/export/xlsx-export';
import { ThemeService } from '../../core/services/theme.service';
import {
  DashboardChartsData,
  DateRange,
  IChartProps,
  segmentIndex,
  TO_CLASSIFY_INDEX,
  TRAFFIC_SERIES,
  TrafficPeriod,
  TrafficSummaryItem
} from './dashboard-charts-data';
import { PeriodSelection, PeriodFilterComponent } from './period-filter/period-filter.component';
import { trafficValueLabelsPlugin } from './traffic-value-labels.plugin';
import { TrafficDataService } from './traffic/traffic-data.service';
import { WidgetsDropdownComponent } from '../widgets/widgets-dropdown/widgets-dropdown.component';
import { NgStyle, DecimalPipe, PercentPipe } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';
import { CardComponent, CardBodyComponent, ButtonDirective, TableDirective, CardFooterComponent, RowComponent, ColComponent, SpinnerComponent } from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { ApplicabilityChartComponent } from './classification/applicability-chart.component';
import { ThemesListComponent } from './classification/themes-list.component';
import { EmailsChartComponent } from './emails/emails-chart.component';
import { AnalyticTableComponent } from './analytic-table/analytic-table.component';

/** Tráfego table: columns follow the chart series; values follow the period and the filters on screen. */
export interface TrafficTable {
  columns: { label: string; color: string; dashed: boolean }[];
  rows: { period: string; values: number[] }[];
  totals: number[];
}

@Component({
    templateUrl: 'dashboard.component.html',
    styleUrls: ['dashboard.component.scss'],
    imports: [WidgetsDropdownComponent, IconDirective, CardComponent, CardBodyComponent, ButtonDirective, PeriodFilterComponent, ChartjsComponent, NgStyle, TableDirective, CardFooterComponent, RowComponent, ColComponent, ApplicabilityChartComponent, ThemesListComponent, EmailsChartComponent, AnalyticTableComponent, DecimalPipe, PercentPipe, SpinnerComponent, ApiErrorTextComponent]
})
export class DashboardComponent implements OnInit, OnDestroy {
  /**
   * `trafficData` is null when the component is built by hand (specs): the chart then keeps the in-memory mock values,
   * as with runtime config `dataMock` true.
   */
  constructor(
    private chartsData: DashboardChartsData,
    private themeService: ThemeService,
    @Optional() private readonly trafficData: TrafficDataService | null = null
  ) {
  }

  /** Normativos Recebidos with BFF data (`dataMock` false): loading until the period's data arrives. Mock: always ready. */
  public trafficState: 'loading' | 'ready' | 'error' = 'ready';
  /** Error of the last load of Normativos Recebidos (pt-BR text and support code by ApiErrorTextComponent). */
  public trafficProblem: unknown = null;
  private readonly trafficRequest$ = new Subject<void>();

  /**
   * Page filter from the segment cards: id of the segment whose "a classificar" normas are shown, or null.
   * While active, the Tráfego chart shows only that segment's "Normas a Classificar" line.
   */
  public segmentFilter: string | null = null;

  /**
   * Cross filters of the classification cards: the pie slice picked (true = Aplicáveis, false = Não aplicáveis) filters the
   * themes list; the theme picked filters the pie. Cleared like the segment filter (Esc or a click outside a filter control).
   */
  public applicabilityFilter: boolean | null = null;
  public themeFilter: string | null = null;

  /** Tráfego card view: chart or table; the table view offers the Excel export. */
  public trafficView: 'chart' | 'table' = 'chart';
  public exporting = false;
  public exportError: string | null = null;

  public mainChart: IChartProps = {};
  public readonly trafficPlugins = [trafficValueLabelsPlugin];
  /** Legend item highlighted in the Tráfego chart (series index), or null for all series. */
  public highlighted: number | null = null;
  /** Period shown in the Tráfego chart: granularity, preset range (null = custom) and dates; driven by <app-period-filter>. */
  public trafficPeriod: TrafficPeriod = 'Month';
  public trafficRange: number | null = this.chartsData.currentRange;
  public trafficBounds: DateRange = this.chartsData.currentBounds;
  public trafficSummary: TrafficSummaryItem[] = [];
  private readonly destroy$ = new Subject<void>();
  public chart: Array<IChartProps> = [];

  ngOnInit(): void {
    if (this.usesBff) {
      this.watchTrafficRequests();
      this.loadTraffic();
    }
    this.initCharts();
    // Series colors come from CSS tokens: re-read them when the theme changes (same data).
    this.themeService.appliedTheme$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.renderTraffic();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initCharts(): void {
    this.mainChart = this.chartsData.mainChart;
    this.trafficSummary = this.chartsData.trafficSummary();
  }

  /** Visible name of the filtered segment, for the notice above the Tráfego chart. */
  get segmentFilterLabel(): string {
    const index = segmentIndex(this.segmentFilter);
    return index !== null ? TRAFFIC_SERIES[index].label : '';
  }

  setTrafficView(view: 'chart' | 'table'): void {
    this.trafficView = view;
    this.exportError = null;
  }

  /** Table of the Tráfego chart as shown (period, highlight and segment filter): one row per period, one column per series. */
  get trafficTable(): TrafficTable {
    const data = this.mainChart.data ?? { labels: [], datasets: [] };
    const datasets = data.datasets as { label: string; data: number[] }[];
    const columns = datasets.map((dataset, index) => ({
      label: dataset.label,
      color: this.trafficSummary[index]?.color ?? '',
      dashed: index === TO_CLASSIFY_INDEX
    }));
    const rows = (data.labels as string[]).map((period, point) => ({
      period,
      values: datasets.map((dataset) => dataset.data[point] ?? 0)
    }));
    const totals = datasets.map((dataset) => dataset.data.reduce((sum, value) => sum + (value ?? 0), 0));
    return { columns, rows, totals };
  }

  /** Builds the .xlsx of the table in the browser (exceljs, R9) and downloads it. */
  async exportTrafficXlsx(): Promise<void> {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    this.exportError = null;
    try {
      await downloadXlsx(this.trafficXlsxTable());
    } catch (error) {
      console.error('[traffic] xlsx export failed', error);
      this.exportError = 'Não foi possível gerar o arquivo Excel.';
    } finally {
      this.exporting = false;
    }
  }

  /** Spreadsheet version of trafficTable, with title, period and file name (pt-BR). */
  trafficXlsxTable(): XlsxTable {
    const table = this.trafficTable;
    const subtitle = this.mainChart['subtitle'] as string;
    const filter = this.segmentFilter ? ` · filtro: normas a classificar · ${this.segmentFilterLabel}` : '';
    const { start, end } = this.trafficBounds;
    const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const keys = table.columns.map((_, index) => `s${index}`);
    return {
      sheetName: 'Normativos Recebidos',
      title: 'Normativos recebidos por segmento',
      subtitle: `${subtitle}${filter}`,
      columns: [
        { key: 'period', header: 'Período', width: 16 },
        ...table.columns.map((column, index) => ({ key: keys[index], header: column.label, numFmt: '#,##0', width: Math.max(14, column.label.length + 4) }))
      ],
      rows: table.rows.map((row) => ({ period: row.period, ...Object.fromEntries(row.values.map((value, index) => [keys[index], value])) })),
      totals: { period: 'Total', ...Object.fromEntries(table.totals.map((value, index) => [keys[index], value])) },
      fileName: `normativos-recebidos-${day(start)}-a-${day(end)}${this.segmentFilter ? '-a-classificar-' + this.segmentFilter : ''}.xlsx`
    };
  }

  /** "a classificar" badge of a segment card: applies that segment's filter, or removes it when clicked again. */
  onToClassifySelect(segmentId: string): void {
    if (this.segmentFilter === segmentId || segmentIndex(segmentId) === null) {
      this.clearSegmentFilter();
      return;
    }
    this.segmentFilter = segmentId;
    this.highlighted = TO_CLASSIFY_INDEX;
    this.renderTraffic();
  }

  clearSegmentFilter(): void {
    if (this.segmentFilter === null) {
      return;
    }
    this.segmentFilter = null;
    // Keep a highlight the user picked meanwhile (e.g. a legend click); drop only the one the filter set.
    if (this.highlighted === TO_CLASSIFY_INDEX) {
      this.highlighted = null;
    }
    this.renderTraffic();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.clearSegmentFilter();
    this.clearClassificationFilters();
  }

  /** Pie slice or legend item: filters the themes list by that class, or removes the filter when clicked again. */
  onApplicabilitySelect(value: boolean): void {
    this.applicabilityFilter = this.applicabilityFilter === value ? null : value;
  }

  /** Theme row: filters the pie by that theme, or removes the filter when clicked again. */
  onThemeSelect(theme: string): void {
    this.themeFilter = this.themeFilter === theme ? null : theme;
  }

  clearClassificationFilters(): void {
    this.applicabilityFilter = null;
    this.themeFilter = null;
  }

  /** Text of the notice above the classification cards, e.g. "Não aplicáveis · Tema: Pix". */
  get classificationFilterLabel(): string {
    const parts: string[] = [];
    if (this.applicabilityFilter !== null) {
      parts.push(this.applicabilityFilter ? 'Aplicáveis' : 'Não aplicáveis');
    }
    if (this.themeFilter !== null) {
      parts.push(`Tema: ${this.themeFilter}`);
    }
    return parts.join(' · ');
  }

  /**
   * Any click outside the filter controls removes the page filters: the "a classificar" badges toggle the segment filter and
   * the classification values ([data-page-filter]) toggle the cross filters themselves; a click on one keeps the others.
   * Bubble phase on purpose: the clicked control handles its click first (a legend item keeps its highlight).
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    // The sidebar too: its sub-items jump between sections of this page and must keep the filters.
    if (target?.closest('[data-segment-filter], [data-page-filter], .sidebar')) {
      return;
    }
    this.clearSegmentFilter();
    this.clearClassificationFilters();
  }

  /** New period from the shared filter: new mock values for it (or the BFF data, `dataMock` false), same highlight. */
  onTrafficPeriod(selection: PeriodSelection): void {
    this.trafficPeriod = selection.period;
    const custom = selection.range === null ? selection.bounds : undefined;
    if (this.usesBff) {
      this.chartsData.selectPeriod(selection.period, selection.range ?? undefined, custom);
      this.trafficRange = this.chartsData.currentRange;
      this.trafficBounds = this.chartsData.currentBounds;
      this.loadTraffic();
      return;
    }
    this.chartsData.initMainChart(selection.period, selection.range ?? undefined, custom);
    this.renderTraffic();
  }

  private get usesBff(): boolean {
    return !!this.trafficData && !this.trafficData.mock;
  }

  private loadTraffic(): void {
    this.trafficState = 'loading';
    this.exportError = null;
    this.trafficRequest$.next();
  }

  /** One request per period choice; a newer choice cancels the previous one. */
  private watchTrafficRequests(): void {
    this.trafficRequest$
      .pipe(
        switchMap(() =>
          (this.trafficData as TrafficDataService).getTraffic(this.trafficPeriod, this.chartsData.currentBounds).pipe(
            catchError((error) => {
              this.failTraffic(error);
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        try {
          this.chartsData.setTrafficData(response);
          this.trafficState = 'ready';
          this.renderTraffic();
        } catch (error) {
          this.failTraffic(error);
        }
      });
  }

  private failTraffic(error: unknown): void {
    console.error('[traffic] failed to load data', error);
    this.trafficProblem = error;
    this.trafficState = 'error';
  }

  /** A selected segment keeps "Normas a Classificar" active (filtered to it); everything else dims. */
  isLegendDimmed(index: number): boolean {
    if (this.highlighted === null || this.highlighted === index) {
      return false;
    }
    return !(index === TO_CLASSIFY_INDEX && this.highlighted !== TO_CLASSIFY_INDEX);
  }

  private renderTraffic(): void {
    this.chartsData.renderMainChart(this.highlighted, segmentIndex(this.segmentFilter));
    this.trafficRange = this.chartsData.currentRange;
    this.trafficBounds = this.chartsData.currentBounds;
    this.initCharts();
  }

  /** Click a legend item to highlight its series; click it again to show all series. */
  toggleHighlight(index: number): void {
    this.highlighted = this.highlighted === index ? null : index;
    this.renderTraffic();
  }
}
