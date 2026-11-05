import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import type { ChartData, ChartOptions, Plugin, ScriptableContext, TooltipItem } from 'chart.js';
import { catchError, EMPTY, Subject, switchMap, takeUntil } from 'rxjs';

import { downloadXlsx, XlsxTable } from '../../../core/export/xlsx-export';
import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { ThemeService } from '../../../core/services/theme.service';
import { withAlpha } from '../chart-colors';
import { TRAFFIC_SERIES } from '../dashboard-charts-data';
import { DEFAULT_TRAFFIC_RANGE, DateRange, presetRange, toInputDate, TrafficPeriod } from '../period/period-range';
import { PeriodSelection, PeriodFilterComponent } from '../period-filter/period-filter.component';
import { EmailsAggregate, sentDateTime } from './emails-derive';
import { EmailsDataService, LATEST_EMAILS_PAGE } from './emails-data.service';
import { APPLICABILITY_LABELS, EMAIL_SEGMENT_IDS, SuggestedNorma, SuggestionEmail } from './emails.model';
import { CardComponent, CardBodyComponent, SpinnerComponent, TableDirective } from '@coreui/angular';
import { DatePipe } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';

type EmailsView = 'chart' | 'table';
type EmailsState = 'loading' | 'ready' | 'error';

/** Latest e-mails listed under the chart (the page size asked from the BFF). */
export const LATEST_EMAILS = LATEST_EMAILS_PAGE;

interface EmailsPalette {
  segments: string[];
  axisText: string;
  grid: string;
  surface: string;
  fontFamily: string;
}

export interface EmailsLegendItem {
  /** Position in EMAIL_SEGMENT_IDS. */
  position: number;
  id: string;
  label: string;
  color: string;
  normas: number;
}

/** Fallback (brand light values) for when the tokens are unavailable, e.g. detached tests. */
const FALLBACK_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const DIMMED_ALPHA = 0.28;
const numberFormat = new Intl.NumberFormat('pt-BR');
const averageFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * "E-mails de sugestão de classificação": e-mails sent in a period and the normas they carried, as stacked
 * bars per segment (one color per segment, same as Tráfego), plus a table view, an Excel export and the latest e-mails.
 */
@Component({
    selector: 'app-emails-chart',
    templateUrl: './emails-chart.component.html',
    styleUrls: ['./emails-chart.component.scss'],
    imports: [CardComponent, CardBodyComponent, IconDirective, PeriodFilterComponent, SpinnerComponent, ChartjsComponent, TableDirective, DatePipe, ApiErrorTextComponent]
})
export class EmailsChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('card', { read: ElementRef, static: true }) private cardRef?: ElementRef<HTMLElement>;

  /** Page filter from the segment cards: only this segment's e-mails are shown, or null for all. */
  @Input() segmentFilter: string | null = null;

  state: EmailsState = 'loading';
  /** Error of the last load (pt-BR text and support code by ApiErrorTextComponent). */
  loadProblem: unknown = null;
  view: EmailsView = 'chart';
  exporting = false;
  exportError: string | null = null;

  /** Period shown: granularity, preset (last N) or null for custom, and its dates; driven by <app-period-filter>. */
  period: TrafficPeriod = 'Month';
  range: number | null = DEFAULT_TRAFFIC_RANGE.Month;
  bounds: DateRange = presetRange('Month', DEFAULT_TRAFFIC_RANGE.Month);
  /** Granularities of this card: Dia and Mês (no Ano). */
  readonly periodOptions: TrafficPeriod[] = ['Day', 'Month'];

  aggregate?: EmailsAggregate;
  legend: EmailsLegendItem[] = [];
  /** Legend item (segment position) highlighted in the chart, or null for all. */
  highlighted: number | null = null;
  /** Ids of the e-mails whose normas are open in the list. */
  readonly expanded = new Set<string>();

  chartData?: ChartData<'bar', number[], string>;
  chartOptions?: ChartOptions<'bar'>;
  readonly chartPlugins: Plugin<'bar'>[] = [this.totalLabelsPlugin()];

  private palette?: EmailsPalette;
  private readonly destroy$ = new Subject<void>();
  private readonly requests$ = new Subject<void>();

  constructor(
    private readonly dataService: EmailsDataService,
    private readonly themeService: ThemeService,
    private readonly host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    // Every period or segment change asks again (mock: computed locally; dataMock false: the BFF); newer cancels older.
    this.requests$
      .pipe(
        switchMap(() =>
          this.dataService.getAggregate({ period: this.period, bounds: this.bounds, segment: this.segmentFilter }).pipe(
            catchError((error) => {
              console.error('[emails] failed to load data', error);
              this.loadProblem = error;
              this.state = 'error';
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((aggregate) => {
        this.aggregate = aggregate;
        this.loadProblem = null;
        this.state = 'ready';
        this.render();
      });
    this.refresh();

    // Canvas cannot read CSS: rebuild colors whenever the applied theme changes.
    this.themeService.appliedTheme$.pipe(takeUntil(this.destroy$)).subscribe(() => this.render());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['segmentFilter'] && !changes['segmentFilter'].firstChange) {
      this.highlighted = null;
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Validated selection from <app-period-filter>. */
  onPeriodChange(selection: PeriodSelection): void {
    this.period = selection.period;
    this.range = selection.range;
    this.bounds = selection.bounds;
    this.refresh();
  }

  setView(view: EmailsView): void {
    this.view = view;
    this.exportError = null;
  }

  /** Click a legend item to highlight its segment; click it again to show all. */
  toggleHighlight(position: number): void {
    this.highlighted = this.highlighted === position ? null : position;
    this.render();
  }

  isDimmed(position: number): boolean {
    return this.highlighted !== null && this.highlighted !== position;
  }

  toggleEmail(id: string): void {
    if (!this.expanded.delete(id)) {
      this.expanded.add(id);
    }
  }

  /** Segments on screen: all of them, or only the one picked on the segment cards. */
  get shownPositions(): number[] {
    const filtered = this.segmentFilter ? EMAIL_SEGMENT_IDS.indexOf(this.segmentFilter) : -1;
    return EMAIL_SEGMENT_IDS.map((_, position) => position).filter((position) => filtered < 0 || position === filtered);
  }

  /** Period under the title: none on error (never "loading" after a failure, nor the period of an older load). */
  get subtitle(): string {
    if (this.state === 'error') {
      return '';
    }
    return this.aggregate?.subtitle || 'Carregando período...';
  }

  get filterLabel(): string {
    return this.segmentFilter ? this.segmentLabel(EMAIL_SEGMENT_IDS.indexOf(this.segmentFilter)) : '';
  }

  get latest(): SuggestionEmail[] {
    return this.aggregate?.list.slice(0, LATEST_EMAILS) ?? [];
  }

  get ariaSummary(): string {
    const data = this.aggregate;
    if (!data) {
      return '';
    }
    const scope = this.segmentFilter ? ` de ${this.filterLabel}` : '';
    return `Gráfico de barras empilhadas, ${data.subtitle}${scope}: ${this.countLabel(data.emails, 'e-mail', 'e-mails')} e ${this.countLabel(data.normas, 'norma sugerida', 'normas sugeridas')}.`;
  }

  segmentLabel(position: number): string {
    return TRAFFIC_SERIES[position].label;
  }

  sentAt(email: SuggestionEmail): Date {
    return sentDateTime(email);
  }

  segmentName(email: SuggestionEmail): string {
    return this.segmentLabel(EMAIL_SEGMENT_IDS.indexOf(email.segment));
  }

  segmentColor(email: SuggestionEmail): string {
    return this.colorOf(EMAIL_SEGMENT_IDS.indexOf(email.segment));
  }

  /** "Aplicável ao segmento?" answer: Sim / Parcialmente / Não. */
  applicability(norma: SuggestedNorma): string {
    return APPLICABILITY_LABELS[norma.suggestedClass];
  }

  /** "1 norma" / "12 normas" (pt-BR number and plural). */
  countLabel(value: number, singular: string, plural: string): string {
    return `${numberFormat.format(value)} ${value === 1 ? singular : plural}`;
  }

  formatNumber(value: number): string {
    return numberFormat.format(value);
  }

  formatAverage(value: number): string {
    return averageFormat.format(value);
  }

  /** Builds the .xlsx of the table in the browser (exceljs, R9) and downloads it. */
  async exportXlsx(): Promise<void> {
    if (this.exporting || !this.aggregate) {
      return;
    }
    this.exporting = true;
    this.exportError = null;
    try {
      await downloadXlsx(this.xlsxTable());
    } catch (error) {
      console.error('[emails] xlsx export failed', error);
      this.exportError = 'Não foi possível gerar o arquivo Excel.';
    } finally {
      this.exporting = false;
    }
  }

  /** Spreadsheet version of the table as shown (period and segment filter), pt-BR. */
  xlsxTable(): XlsxTable {
    const data = this.aggregate as EmailsAggregate;
    const positions = this.shownPositions;
    const keys = positions.map((position) => `s${position}`);
    const filter = this.segmentFilter ? ` · segmento: ${this.filterLabel}` : '';
    return {
      sheetName: 'E-mails',
      title: 'Fluxo de e-mail - Triagem',
      subtitle: `${data.subtitle}${filter}`,
      columns: [
        { key: 'period', header: 'Período', width: 16 },
        { key: 'emails', header: 'E-mails', numFmt: '#,##0', width: 12 },
        ...positions.map((position, index) => ({ key: keys[index], header: this.segmentLabel(position), numFmt: '#,##0', width: 16 })),
        { key: 'total', header: 'Total de normas', numFmt: '#,##0', width: 18 }
      ],
      rows: data.buckets.map((bucket) => ({
        period: bucket.label,
        emails: bucket.emails,
        ...Object.fromEntries(positions.map((position, index) => [keys[index], bucket.normas[position]])),
        total: bucket.total
      })),
      totals: {
        period: 'Total',
        emails: data.emails,
        ...Object.fromEntries(positions.map((position, index) => [keys[index], data.segmentNormas[position]])),
        total: data.normas
      },
      fileName: `fluxo-email-triagem-${toInputDate(this.bounds.start)}-a-${toInputDate(this.bounds.end)}${this.segmentFilter ? '-' + this.segmentFilter : ''}.xlsx`
    };
  }

  private refresh(): void {
    this.requests$.next();
  }

  private colorOf(position: number): string {
    return this.palette?.segments[position] ?? TRAFFIC_SERIES[position].fallbackColor;
  }

  private render(): void {
    const data = this.aggregate;
    if (!data) {
      return;
    }
    const palette = this.readPalette();
    this.palette = palette;
    const positions = this.shownPositions;
    const labels = data.buckets.map((bucket) => bucket.label);

    this.legend = positions.map((position) => ({
      position,
      id: EMAIL_SEGMENT_IDS[position],
      label: this.segmentLabel(position),
      color: palette.segments[position],
      normas: data.segmentNormas[position]
    }));

    // New objects on every render: c-chart redraws when its data input changes.
    this.chartData = {
      labels,
      datasets: positions.map((position, order) => {
        const color = palette.segments[position];
        const fill = this.isDimmed(position) ? withAlpha(color, DIMMED_ALPHA) : color;
        return {
          label: this.segmentLabel(position),
          data: data.buckets.map((bucket) => bucket.normas[position]),
          backgroundColor: fill,
          hoverBackgroundColor: fill,
          // Two 1px surface-colored edges make the 2px gap between stacked segments.
          borderColor: palette.surface,
          hoverBorderColor: palette.surface,
          borderWidth: { top: 1, bottom: 1, left: 0, right: 0 },
          borderSkipped: false,
          borderRadius: (context: ScriptableContext<'bar'>) => this.segmentRadius(positions, order, context.dataIndex),
          barPercentage: 0.7,
          categoryPercentage: 0.85,
          maxBarThickness: 56
        };
      })
    };

    const peak = Math.max(1, ...data.buckets.map((bucket) => bucket.total));
    this.chartOptions = {
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        // Colors, font, padding and radius come from the Chart.js defaults set by ThemeService.
        tooltip: {
          usePointStyle: true,
          filter: (item: TooltipItem<'bar'>) => (item.parsed.y ?? 0) > 0,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => (items.length ? data.buckets[items[0].dataIndex].label : ''),
            beforeBody: (items: TooltipItem<'bar'>[]) => {
              const bucket = items.length ? data.buckets[items[0].dataIndex] : undefined;
              return bucket ? this.countLabel(bucket.emails, 'e-mail', 'e-mails') : '';
            },
            label: (item: TooltipItem<'bar'>) => `${item.dataset.label}: ${this.countLabel(item.parsed.y ?? 0, 'norma', 'normas')}`,
            footer: (items: TooltipItem<'bar'>[]) => {
              const bucket = items.length ? data.buckets[items[0].dataIndex] : undefined;
              return bucket && positions.length > 1 ? `Total: ${this.countLabel(bucket.total, 'norma', 'normas')}` : '';
            },
            labelPointStyle: () => ({ pointStyle: 'rect', rotation: 0 }),
            labelColor: (item: TooltipItem<'bar'>) => {
              const color = palette.segments[positions[item.datasetIndex]];
              return { borderColor: color, backgroundColor: color, borderWidth: 0, borderRadius: 2 };
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: { display: false },
          ticks: { color: palette.axisText, font: { family: palette.fontFamily, size: 11 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 12 }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          // Room for the total above the tallest bar.
          suggestedMax: Math.ceil(peak * 1.18),
          // Totals are written above the bars: discreet gridlines only, no axis numbers.
          grid: { color: palette.grid, drawTicks: false },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: { display: false },
          ticks: { display: false, maxTicksLimit: 5, precision: 0 }
        }
      }
    };
  }

  /** 4px rounded data end only on the top segment of each stack; the base stays square on the baseline. */
  private segmentRadius(positions: number[], order: number, dataIndex: number): { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } {
    const buckets = this.aggregate?.buckets;
    let top = -1;
    positions.forEach((position, index) => {
      if (buckets && buckets[dataIndex].normas[position] > 0) {
        top = index;
      }
    });
    const radius = top === order ? 4 : 0;
    return { topLeft: radius, topRight: radius, bottomLeft: 0, bottomRight: 0 };
  }

  /** Total of each stack above its bar, only when the text fits the slot (tooltip and table carry the rest). */
  private totalLabelsPlugin(): Plugin<'bar'> {
    return {
      id: 'emailsTotalLabels',
      afterDatasetsDraw: (chart) => {
        const buckets = this.aggregate?.buckets;
        if (!buckets || !chart.data.datasets.length) {
          return;
        }
        const family = this.palette?.fontFamily ?? FALLBACK_FONT_FAMILY;
        const ctx = chart.ctx;
        const slot = chart.scales['x'].width / Math.max(1, buckets.length);
        ctx.save();
        ctx.font = `600 12px ${family}`;
        ctx.fillStyle = getComputedStyle(this.host.nativeElement).getPropertyValue('--brand-content-high').trim() || this.palette?.axisText || '#0b0b0b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        buckets.forEach((bucket, index) => {
          if (bucket.total === 0) {
            return;
          }
          const text = numberFormat.format(bucket.total);
          if (ctx.measureText(text).width + 4 > slot) {
            return;
          }
          // Topmost drawn segment of this stack (the smallest y).
          let y = Infinity;
          let x = 0;
          chart.data.datasets.forEach((_, datasetIndex) => {
            const bar = chart.getDatasetMeta(datasetIndex).data[index] as unknown as { x: number; y: number } | undefined;
            if (bar && bucket.normas[this.shownPositions[datasetIndex]] > 0 && bar.y < y) {
              y = bar.y;
              x = bar.x;
            }
          });
          if (y !== Infinity) {
            ctx.fillText(text, x, y - 5);
          }
        });
        ctx.restore();
      }
    };
  }

  /** Brand tokens (src/scss/_brand.scss, _theme-dark.scss), read at render time because canvas cannot read CSS. */
  private readPalette(): EmailsPalette {
    const hostStyle = getComputedStyle(this.host.nativeElement);
    const read = (name: string, fallback: string) => hostStyle.getPropertyValue(name).trim() || fallback;
    const cardElement = this.cardRef?.nativeElement;
    const surface = cardElement ? getComputedStyle(cardElement).getPropertyValue('--cui-card-bg').trim() : '';
    return {
      segments: EMAIL_SEGMENT_IDS.map((_, position) => read(TRAFFIC_SERIES[position].colorVar, TRAFFIC_SERIES[position].fallbackColor)),
      axisText: read('--app-chart-color', '#4b5968'),
      grid: read('--app-chart-grid-color', 'rgba(0, 0, 0, .08)'),
      surface: surface || '#ffffff',
      fontFamily: read('--app-chart-font-family', FALLBACK_FONT_FAMILY)
    };
  }
}
