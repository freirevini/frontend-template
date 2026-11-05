import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import type { ChartData, ChartOptions, Plugin, ScriptableContext, TooltipItem } from 'chart.js';
import { BehaviorSubject, EMPTY, Subject, catchError, switchMap, takeUntil } from 'rxjs';

import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { ThemeService } from '../../../core/services/theme.service';
import { DateRange, DEFAULT_TRAFFIC_RANGE, presetRange, TrafficPeriod } from '../../dashboard/period/period-range';
import { PeriodSelection, PeriodFilterComponent } from '../../dashboard/period-filter/period-filter.component';
import { formatCurrency, formatShare } from './waterfall-format';
import { WaterfallDataService } from './waterfall-data.service';
import { buildWaterfall, WaterfallData, WaterfallModel, WaterfallSegment } from './waterfall.model';
import { CardComponent, CardBodyComponent, SpinnerComponent, TableDirective } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

import { ChartjsComponent } from '@coreui/angular-chartjs';

type WaterfallUnit = 'currency' | 'percent';
type WaterfallView = 'chart' | 'table';
type WaterfallState = 'loading' | 'ready' | 'error';

interface WaterfallPalette {
  total: string[];
  decrease: string[];
  connector: string;
  axisText: string;
  grid: string;
  surface: string;
  fontFamily: string;
}

/** Dataset index -> segment, so tooltips and plugins can resolve what a bar is. */
interface WaterfallDataset {
  segment: WaterfallSegment;
}

/** Fallbacks (brand light values) for when the tokens are unavailable, e.g. detached tests. */
const FALLBACK_TOTAL = ['#17278c', '#223ad2', '#8c9ae8'];
const FALLBACK_DECREASE = ['#a51226', '#dc1832', '#f07a89'];
const FALLBACK_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LABEL_PADDING = 8;
const DARK_INK = '#0b0b0b';
const LIGHT_INK = '#ffffff';

@Component({
    selector: 'app-waterfall-chart',
    templateUrl: './waterfall-chart.component.html',
    styleUrls: ['./waterfall-chart.component.scss'],
    imports: [CardComponent, CardBodyComponent, IconDirective, PeriodFilterComponent, SpinnerComponent, ChartjsComponent, TableDirective, ApiErrorTextComponent]
})
export class WaterfallChartComponent implements OnInit, OnDestroy {
  @ViewChild('card', { read: ElementRef, static: true }) private cardRef?: ElementRef<HTMLElement>;

  state: WaterfallState = 'loading';
  /** Error of the last load (pt-BR text and support code by ApiErrorTextComponent). */
  loadProblem: unknown = null;
  unit: WaterfallUnit = 'currency';
  view: WaterfallView = 'chart';

  /** Period shown: granularity, preset (last N) or null for custom, and its dates. */
  period: TrafficPeriod = 'Month';
  range: number | null = DEFAULT_TRAFFIC_RANGE.Month;
  bounds: DateRange = presetRange('Month', DEFAULT_TRAFFIC_RANGE.Month);

  data?: WaterfallData;
  model?: WaterfallModel;

  chartData?: ChartData<'bar', ([number, number] | null)[], string>;
  chartOptions?: ChartOptions<'bar'>;
  readonly chartPlugins: Plugin<'bar'>[] = [this.connectorPlugin(), this.labelPlugin()];
  legend: { label: string; color: string }[] = [];

  private palette?: WaterfallPalette;
  private datasets: WaterfallDataset[] = [];
  private readonly selection$ = new BehaviorSubject<PeriodSelection>({ period: this.period, range: this.range, bounds: this.bounds });
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dataService: WaterfallDataService,
    private readonly themeService: ThemeService,
    private readonly host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    // Every period change reloads; a newer selection cancels the previous request.
    this.selection$
      .pipe(
        switchMap(({ period, bounds }) =>
          this.dataService.getWaterfall(period, bounds).pipe(
            catchError((error) => {
              console.error('[waterfall] failed to load data', error);
              this.loadProblem = error;
              this.state = 'error';
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((data) => {
        try {
          this.model = buildWaterfall(data.steps);
          this.data = data;
          this.state = 'ready';
          this.render();
        } catch (error) {
          console.error('[waterfall] invalid data', error);
          this.loadProblem = error;
          this.state = 'error';
        }
      });

    // Canvas cannot read CSS: rebuild colors whenever the applied theme changes.
    this.themeService.appliedTheme$.pipe(takeUntil(this.destroy$)).subscribe(() => this.render());
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
    this.selection$.next(selection);
  }

  setUnit(unit: WaterfallUnit): void {
    this.unit = unit;
    this.render();
  }

  setView(view: WaterfallView): void {
    this.view = view;
  }

  /** Period under the title: none on error (the data, if any, belongs to another period); never "loading" after a failure. */
  get subtitle(): string {
    if (this.state === 'error') {
      return '';
    }
    return this.data?.period || 'Carregando período...';
  }

  get resultLabel(): string {
    return this.model && this.data ? this.formatValue(this.model.result) : '';
  }

  get resultShare(): string {
    return this.model ? formatShare(this.model.result, this.model.base) : '';
  }

  get ariaSummary(): string {
    if (!this.model || !this.data) {
      return '';
    }
    const steps = this.model.columns
      .map((column) => `${column.step.label} ${this.signedValue(column.total, column.step.kind === 'decrease')}`)
      .join('; ');
    return `Gráfico de cascata, ${this.data.period}. ${steps}. Saldo final ${this.resultLabel}.`;
  }

  /** Text for a value in the active unit; decreases are shown negative. */
  signedValue(value: number, negative: boolean): string {
    return this.formatValue(negative ? -value : value);
  }

  shareOfBase(value: number, negative = false): string {
    return this.model ? formatShare(negative ? -value : value, this.model.base) : '';
  }

  currencyOf(value: number, negative = false): string {
    return this.data ? formatCurrency(negative ? -value : value, this.data.unitScale, this.data.currency) : '';
  }

  private formatValue(value: number): string {
    if (!this.model || !this.data) {
      return '';
    }
    return this.unit === 'percent'
      ? formatShare(value, this.model.base)
      : formatCurrency(value, this.data.unitScale, this.data.currency);
  }

  private render(): void {
    const model = this.model;
    if (!model || !this.data) {
      return;
    }
    const palette = this.readPalette();
    this.palette = palette;
    const labels = model.columns.map((column) => column.step.label);

    this.datasets = model.segments.map((segment) => ({ segment }));
    this.legend = [
      { label: 'Total (receita e resultado)', color: palette.total[1] },
      { label: 'Redução', color: palette.decrease[1] }
    ];

    // New objects on every render: c-chart redraws when its data input changes.
    this.chartData = {
      labels,
      datasets: model.segments.map((segment) => {
        const color = this.segmentColor(segment, palette);
        const data: ([number, number] | null)[] = labels.map((_, index) =>
          index === segment.stepIndex ? [segment.low, segment.high] : null
        );
        return {
          label: segment.partLabel,
          data,
          backgroundColor: color,
          // Hover lightens the segment.
          hoverBackgroundColor: mix(color, '#ffffff', 0.2),
          // Two 1px surface-colored edges make the 2px gap between stacked segments.
          borderColor: palette.surface,
          hoverBorderColor: palette.surface,
          borderWidth: { top: 1, bottom: 1, left: 0, right: 0 },
          borderSkipped: false,
          borderRadius: (context: ScriptableContext<'bar'>) => this.segmentRadius(context.datasetIndex),
          grouped: false,
          skipNull: true,
          barPercentage: 0.6,
          categoryPercentage: 1,
          maxBarThickness: 96
        };
      })
    };

    const base = model.base;
    this.chartOptions = {
      maintainAspectRatio: false,
      animation: { duration: 400 },
      // Per-segment hover: the hovered bar is the hit target (set on tooltip too, it overrides global defaults).
      interaction: { mode: 'nearest', intersect: true },
      hover: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: false },
        // Colors, font, padding and radius come from the Chart.js defaults set by ThemeService.
        tooltip: {
          mode: 'nearest',
          intersect: true,
          usePointStyle: true,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => {
              const segment = items.length ? this.datasets[items[0].datasetIndex]?.segment : undefined;
              return segment ? this.signedValue(segment.value, segment.kind === 'decrease') : '';
            },
            label: (item: TooltipItem<'bar'>) => {
              const segment = this.datasets[item.datasetIndex]?.segment;
              return segment ? `${segment.partLabel} · ${segment.stepLabel}` : '';
            },
            afterLabel: (item: TooltipItem<'bar'>) => {
              const segment = this.datasets[item.datasetIndex]?.segment;
              if (!segment) {
                return '';
              }
              const column = model.columns[segment.stepIndex];
              const share = this.unit === 'percent'
                ? this.currencyOf(segment.value, segment.kind === 'decrease')
                : `${this.shareOfBase(segment.value, segment.kind === 'decrease')} da receita bruta`;
              return [share, `Saldo após ${column.step.label}: ${this.formatValue(column.end)}`];
            },
            labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
            // Line key in the segment color (the default would be the tooltip ink).
            labelColor: (item: TooltipItem<'bar'>) => {
              const segment = this.datasets[item.datasetIndex]?.segment;
              const color = segment ? this.segmentColor(segment, palette) : palette.axisText;
              return { borderColor: color, backgroundColor: color, borderWidth: 2 };
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: { display: false },
          ticks: { color: palette.axisText, font: { family: palette.fontFamily, size: 11 }, maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          // Percent mode: shares of gross revenue, so the axis stops at 100% in 20% steps.
          suggestedMax: this.unit === 'percent' ? undefined : base * 1.08,
          max: this.unit === 'percent' ? base : undefined,
          // Values are written inside the segments: discreet gridlines only, no axis numbers.
          grid: { color: palette.grid, drawTicks: false },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: { display: false },
          ticks: {
            display: false,
            maxTicksLimit: 6,
            stepSize: this.unit === 'percent' ? base / 5 : undefined
          }
        }
      }
    };
  }

  private segmentColor(segment: WaterfallSegment, palette: WaterfallPalette): string {
    const ramp = segment.kind === 'total' ? palette.total : palette.decrease;
    return ramp[Math.min(segment.partIndex, ramp.length - 1)];
  }

  /** 4px rounded data ends: the outer ends of each column; a total stays square at the zero baseline. */
  private segmentRadius(datasetIndex: number): number | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } {
    const segment = this.datasets[datasetIndex]?.segment;
    if (!segment || !this.model) {
      return 0;
    }
    const parts = this.model.columns[segment.stepIndex].segments.length;
    const isTop = segment.kind === 'total' ? segment.partIndex === parts - 1 : segment.partIndex === 0;
    const isBottom = segment.kind === 'decrease' && segment.partIndex === parts - 1;
    const top = isTop ? 4 : 0;
    const bottom = isBottom ? 4 : 0;
    return { topLeft: top, topRight: top, bottomLeft: bottom, bottomRight: bottom };
  }

  /** Brand tokens (src/scss/_brand.scss, _theme-dark.scss), read at render time because canvas cannot read CSS. */
  private readPalette(): WaterfallPalette {
    const hostStyle = getComputedStyle(this.host.nativeElement);
    const read = (name: string, fallback: string) => hostStyle.getPropertyValue(name).trim() || fallback;
    const cardElement = this.cardRef?.nativeElement;
    const surface = cardElement ? getComputedStyle(cardElement).getPropertyValue('--cui-card-bg').trim() : '';
    return {
      total: FALLBACK_TOTAL.map((fallback, index) => read(`--app-wf-total-${index + 1}`, fallback)),
      decrease: FALLBACK_DECREASE.map((fallback, index) => read(`--app-wf-decrease-${index + 1}`, fallback)),
      connector: read('--app-wf-connector', '#a7b2be'),
      axisText: read('--app-chart-color', '#4b5968'),
      grid: read('--app-chart-grid-color', 'rgba(0, 0, 0, .08)'),
      surface: surface || '#ffffff',
      fontFamily: read('--app-chart-font-family', FALLBACK_FONT_FAMILY)
    };
  }

  /** 1px hairlines joining the running level of one column to the next. */
  private connectorPlugin(): Plugin<'bar'> {
    return {
      id: 'waterfallConnectors',
      afterDatasetsDraw: (chart) => {
        const model = this.model;
        const palette = this.palette;
        if (!model || !palette) {
          return;
        }
        const yScale = chart.scales['y'];
        const bounds = model.columns.map((column) => {
          const datasetIndex = model.segments.indexOf(column.segments[0]);
          const bar = chart.getDatasetMeta(datasetIndex).data[column.segments[0].stepIndex] as unknown as { x: number; width: number } | undefined;
          return bar ? { left: bar.x - bar.width / 2, right: bar.x + bar.width / 2 } : undefined;
        });
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = palette.connector;
        ctx.lineWidth = 1;
        for (let index = 0; index < model.columns.length - 1; index++) {
          const from = bounds[index];
          const to = bounds[index + 1];
          if (!from || !to) {
            continue;
          }
          const y = Math.round(yScale.getPixelForValue(model.columns[index].end)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(from.right, y);
          ctx.lineTo(to.left, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    };
  }

  /** Value + name inside a segment, only when the text fits with padding (otherwise tooltip/table carry it). */
  private labelPlugin(): Plugin<'bar'> {
    return {
      id: 'waterfallLabels',
      afterDatasetsDraw: (chart) => {
        const family = this.palette?.fontFamily ?? FALLBACK_FONT_FAMILY;
        const valueFont = `600 12px ${family}`;
        const nameFont = `400 11px ${family}`;
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.datasets.forEach(({ segment }, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          const bar = meta.data[segment.stepIndex] as unknown as { x: number; y: number; base: number; width: number } | undefined;
          if (!bar || meta.hidden) {
            return;
          }
          const height = Math.abs(bar.base - bar.y);
          const centerY = (bar.base + bar.y) / 2;
          const value = this.signedValue(segment.value, segment.kind === 'decrease');
          const fill = String((chart.data.datasets[datasetIndex] as { backgroundColor?: unknown }).backgroundColor ?? '');
          ctx.fillStyle = inkFor(fill);

          ctx.font = valueFont;
          const valueWidth = ctx.measureText(value).width;
          ctx.font = nameFont;
          const nameWidth = ctx.measureText(segment.partLabel).width;
          const room = bar.width - LABEL_PADDING * 2;

          if (height >= 36 && valueWidth <= room && nameWidth <= room) {
            ctx.font = valueFont;
            ctx.fillText(value, bar.x, centerY - 7);
            ctx.font = nameFont;
            ctx.fillText(segment.partLabel, bar.x, centerY + 8);
          } else if (height >= 18 && valueWidth <= room) {
            ctx.font = valueFont;
            ctx.fillText(value, bar.x, centerY);
          }
        });
        ctx.restore();
      }
    };
  }
}

/** Mixes two #rrggbb colors; `amount` is the share of `other`. */
function mix(color: string, other: string, amount: number): string {
  const a = parseHex(color);
  const b = parseHex(other);
  if (!a || !b) {
    return color;
  }
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * amount);
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, '0')).join('')}`;
}

/** White or near-black, whichever has more contrast on the fill. */
function inkFor(fill: string): string {
  const rgb = parseHex(fill);
  if (!rgb) {
    return DARK_INK;
  }
  const luminance = relativeLuminance(rgb);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithDark = (luminance + 0.05) / (relativeLuminance(parseHex(DARK_INK) as number[]) + 0.05);
  return contrastWithWhite >= contrastWithDark ? LIGHT_INK : DARK_INK;
}

function parseHex(color: string): number[] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return null;
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance([r, g, b]: number[]): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
