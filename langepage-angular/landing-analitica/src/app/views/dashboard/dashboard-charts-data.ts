import { Injectable } from '@angular/core';
import type { ScriptableContext } from 'chart.js';
import { getStyle, hexToRgba } from '@coreui/utils';

import type { ValueLabelPlacement } from './traffic-value-labels.plugin';

export interface IChartProps {
  data?: any;
  labels?: any;
  options?: any;
  colors?: any;
  type?: any;
  legend?: any;

  [propName: string]: any;
}

import {
  buildTrafficPeriod,
  DateRange,
  DEFAULT_TRAFFIC_RANGE,
  presetRange,
  TRAFFIC_RANGES,
  TrafficPeriod,
  validateCustomRange
} from './period/period-range';

// Period helpers live in ./period/period-range; re-exported so existing imports keep working.
export type { DateRange, TrafficPeriod } from './period/period-range';
export {
  buildTrafficPeriod,
  DEFAULT_TRAFFIC_RANGE,
  MAX_TRAFFIC_POINTS,
  presetRange,
  TRAFFIC_RANGES,
  trafficPeriod,
  trafficPointCount,
  validateCustomRange
} from './period/period-range';

/** Fallback font when the brand token is unavailable (tests, detached canvas). */
const FALLBACK_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Brand font for chart text (Inter), read at render time because canvas cannot read CSS. */
export function chartFontFamily(): string {
  return (getStyle('--app-chart-font-family') || '').trim() || FALLBACK_FONT_FAMILY;
}

/** Card surface color at the canvas (`--cui-card-bg` is set on `.card`, so it must be read from inside the card). */
export function chartSurfaceColor(canvas?: HTMLCanvasElement | null): string {
  const element = canvas || (typeof document !== 'undefined' ? document.body : null);
  if (!element) {
    return '#ffffff';
  }
  return (getComputedStyle(element).getPropertyValue('--cui-card-bg') || '').trim() || '#ffffff';
}

export interface TrafficSeries {
  /** Stable id; segments match the ids in src/assets/data/dashboard-segments.json. */
  id: string;
  label: string;
  /** CSS custom property with the series color (light/dark values in src/scss/_theme-dark.scss). */
  colorVar: string;
  fallbackColor: string;
  /** Mock value range; distinct bands keep the lines (and their value labels) apart. */
  range: [number, number];
  /** The reference line: normas still to classify, summed over the segments or filtered to one. */
  dashed?: boolean;
}

/** Legend order: business segments alphabetically, then the "to classify" reference line (always last). */
export const TRAFFIC_SERIES: TrafficSeries[] = [
  { id: 'atacado', label: 'Atacado', colorVar: '--app-series-1', fallbackColor: '#223ad2', range: [160, 240] },
  { id: 'corporativo', label: 'Corporativo', colorVar: '--app-series-2', fallbackColor: '#1099bc', range: [100, 160] },
  { id: 'plataforma', label: 'Plataforma', colorVar: '--app-series-3', fallbackColor: '#288f28', range: [55, 105] },
  { id: 'varejo', label: 'Varejo', colorVar: '--app-series-4', fallbackColor: '#ae6ae6', range: [120, 200] },
  { id: 'to-classify', label: 'Normas a Classificar', colorVar: '--app-series-reference', fallbackColor: '#dc1832', range: [3, 12], dashed: true }
];

/** Series index of a business segment id, or null when the id is not a segment. */
export function segmentIndex(id: string | null): number | null {
  const index = TRAFFIC_SERIES.findIndex((series) => series.id === id);
  return index >= 0 && index < TRAFFIC_SERIES.length - 1 ? index : null;
}

/** Index of the "Normas a Classificar" line; every other index is a business segment. */
export const TO_CLASSIFY_INDEX = TRAFFIC_SERIES.length - 1;
const SEGMENT_COUNT = TO_CLASSIFY_INDEX;
/** Top of the y axis for the mock values (bands up to 240, see TRAFFIC_SERIES.range). */
const MOCK_Y_MAX = 250;

export interface TrafficSummaryItem {
  label: string;
  /** Segment the item is filtered to (only for "Normas a Classificar" while a segment is selected). */
  filter?: string;
  color: string;
  dashed: boolean;
  total: number;
  /** Share of all normas in the period (0..1). */
  share: number;
}

@Injectable({
  providedIn: 'any'
})
export class DashboardChartsData {
  constructor() {
    this.initMainChart();
  }

  public mainChart: IChartProps = {};

  private period: TrafficPeriod = 'Month';
  /** Preset range (last N) or null when a custom date range is shown. */
  private range: number | null = DEFAULT_TRAFFIC_RANGE.Month;
  private bounds: DateRange = presetRange('Month', DEFAULT_TRAFFIC_RANGE.Month);
  private labels: string[] = [];
  /** Normas per segment, one array per segment (classified). */
  private values: number[][] = [];
  /** Normas still to classify, per segment: the dashed line shows their sum or one segment. */
  private toClassify: number[][] = [];
  private highlight: number | null = null;
  /** Segment the "Normas a Classificar" line is filtered to by the page filter (segment cards), or null. */
  private toClassifyFocus: number | null = null;
  /** Top of the y axis: fixed for the mock bands; from the largest value received for BFF data (setTrafficData). */
  private yMax = MOCK_Y_MAX;

  public random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /** Preset range shown (last N days/months/years), or null for a custom date range. */
  get currentRange(): number | null {
    return this.range;
  }

  /** Dates covered by the chart (preset or custom). */
  get currentBounds(): DateRange {
    return this.bounds;
  }

  /**
   * New mock values for the granularity (Dia/Mês/Ano) and either a preset range (last N) or a custom
   * date range, then renders with nothing highlighted. An invalid or missing choice falls back to the
   * granularity's default preset.
   */
  initMainChart(period: TrafficPeriod | string = 'Month', range?: number, custom?: DateRange) {
    const labels = this.selectPeriod(period, range, custom);
    const segments = TRAFFIC_SERIES.slice(0, SEGMENT_COUNT);
    const toClassify = TRAFFIC_SERIES[TO_CLASSIFY_INDEX];
    this.values = segments.map((series) => labels.map(() => this.random(series.range[0], series.range[1])));
    this.toClassify = segments.map(() => labels.map(() => this.random(toClassify.range[0], toClassify.range[1])));
    this.yMax = MOCK_Y_MAX;
    this.renderMainChart(null);
  }

  /**
   * Applies the granularity and the preset or custom range (same fallbacks as initMainChart) without touching the values:
   * labels and subtitle are ready while the BFF data for the new period is loading. Returns the labels.
   */
  selectPeriod(period: TrafficPeriod | string = 'Month', range?: number, custom?: DateRange): string[] {
    this.period = period in TRAFFIC_RANGES ? (period as TrafficPeriod) : 'Month';
    if (custom && validateCustomRange(this.period, custom) === null) {
      this.range = null;
      this.bounds = custom;
    } else {
      const options = TRAFFIC_RANGES[this.period].map((option) => option.count);
      this.range = range !== undefined && options.includes(range) ? range : DEFAULT_TRAFFIC_RANGE[this.period];
      this.bounds = presetRange(this.period, this.range);
    }
    const { labels, subtitle } = buildTrafficPeriod(this.period, this.bounds);
    this.labels = labels;
    this.mainChart['subtitle'] = subtitle;
    this.mainChart['elements'] = labels.length;
    return labels;
  }

  /**
   * BFF data (TrafficResponse of traffic/traffic-data.service.ts, already adapted) for the period chosen with
   * selectPeriod: one series per segment, one value per label. Keeps the highlight; the caller renders. Throws when the
   * payload does not fit the period (a block error, never a chart with shifted points).
   */
  setTrafficData(response: { segments: { segment: string; classified: number[]; toClassify: number[] }[] }): void {
    const segments = TRAFFIC_SERIES.slice(0, SEGMENT_COUNT).map((series) => {
      const item = response.segments.find((segment) => segment.segment === series.id);
      if (!item || item.classified.length !== this.labels.length || item.toClassify.length !== this.labels.length) {
        throw new Error(`Traffic data without one value per point for ${series.id}.`);
      }
      return item;
    });
    this.values = segments.map((segment) => [...segment.classified]);
    this.toClassify = segments.map((segment) => [...segment.toClassify]);
    const peak = Math.max(0, ...this.values.flat(), ...this.labels.map((_, point) => this.toClassify.reduce((sum, segment) => sum + segment[point], 0)));
    // Headroom for the value labels above the highest point, rounded to a step of 5 ticks.
    this.yMax = Math.max(5, Math.ceil((peak * 1.1) / 5) * 5);
  }

  /**
   * Rebuilds datasets and options from the current values (no new data): used for the legend
   * highlight and when the theme changes. `highlight` is a series index or null for all series.
   */
  renderMainChart(highlight: number | null = null, toClassifyFocus: number | null = null) {
    this.highlight = highlight;
    this.toClassifyFocus = this.isSegment(toClassifyFocus) ? toClassifyFocus : null;
    const labels = this.labels;

    const datasets = TRAFFIC_SERIES.map((series, index) => {
      const color = this.seriesColor(series);
      const active = highlight === index;
      // A selected segment keeps the "to classify" line on, filtered to that segment.
      const dimmed = highlight !== null && !active && !(index === TO_CLASSIFY_INDEX && this.isSegment(highlight));
      const valueLabel: ValueLabelPlacement | undefined = dimmed ? undefined : 'point';
      const filter = index === TO_CLASSIFY_INDEX ? this.segmentFilter() : undefined;
      return {
        label: filter ? `${series.label} · ${filter}` : series.label,
        data: this.seriesValues(index),
        borderColor: dimmed ? hexToRgba(color, 20) : color,
        backgroundColor: active ? hexToRgba(color, 10) : 'transparent',
        fill: active,
        borderWidth: active ? 3 : 2,
        borderDash: series.dashed ? [8, 5] : [],
        pointRadius: dimmed ? 0 : 3,
        pointHoverRadius: dimmed ? 0 : 5,
        pointBackgroundColor: color,
        // 2px ring in the card surface color separates overlapping points from the lines.
        pointBorderColor: (context: ScriptableContext<'line'>) => chartSurfaceColor(context.chart.canvas),
        pointBorderWidth: 2,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: (context: ScriptableContext<'line'>) => chartSurfaceColor(context.chart.canvas),
        pointHoverBorderWidth: 2,
        valueLabel
      };
    });

    const plugins = {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          labelColor: function(context: any) {
            return {
              backgroundColor: context.dataset.pointBackgroundColor
            };
          }
        }
      }
    };

    const axisText = (getStyle('--app-chart-color') || '').trim() || undefined;
    const gridColor = (getStyle('--app-chart-grid-color') || '').trim() || undefined;
    const fontFamily = chartFontFamily();

    const options = {
      maintainAspectRatio: false,
      // Room for the value labels above the highest points and beside the first/last points.
      layout: { padding: { top: 16, left: 12, right: 16 } },
      plugins,
      scales: {
        x: {
          // Gridlines only on the y axis.
          grid: {
            display: false
          },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: {
            display: false
          },
          ticks: {
            color: axisText,
            font: { family: fontFamily, size: 11 },
            maxRotation: 0,
            autoSkipPadding: 12
          }
        },
        y: {
          beginAtZero: true,
          max: this.yMax,
          // Values are written on the points, so the axis numbers are hidden; gridlines stay.
          grid: {
            color: gridColor,
            drawTicks: false
          },
          // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
          border: {
            display: false
          },
          ticks: {
            display: false,
            maxTicksLimit: 5,
            stepSize: Math.ceil(this.yMax / 5)
          }
        }
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 2
        },
        point: {
          radius: 0,
          hitRadius: 10,
          hoverRadius: 5,
          hoverBorderWidth: 2
        }
      }
    };

    this.mainChart.type = 'line';
    this.mainChart.options = options;
    // New object on every render so c-chart sees the change.
    this.mainChart.data = {
      datasets,
      labels
    };
  }

  /** Totals per series for the legend; shares are of all normas in the period (segments + to classify). */
  trafficSummary(): TrafficSummaryItem[] {
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const grandTotal = sum(this.values.map(sum)) + sum(this.toClassify.map(sum)) || 1;
    return TRAFFIC_SERIES.map((series, index) => {
      const total = sum(this.seriesValues(index));
      return {
        label: series.label,
        filter: index === TO_CLASSIFY_INDEX ? this.segmentFilter() : undefined,
        color: this.seriesColor(series),
        dashed: !!series.dashed,
        total,
        share: total / grandTotal
      };
    });
  }

  /** Segment lines show their own values; the dashed line sums every segment or shows the selected one. */
  private seriesValues(index: number): number[] {
    if (index !== TO_CLASSIFY_INDEX) {
      return this.values[index];
    }
    const segment = this.filteredSegment();
    if (segment !== null) {
      return this.toClassify[segment];
    }
    return this.toClassify[0].map((_, point) => this.toClassify.reduce((total, segment) => total + segment[point], 0));
  }

  private segmentFilter(): string | undefined {
    const segment = this.filteredSegment();
    return segment !== null ? TRAFFIC_SERIES[segment].label : undefined;
  }

  /** Segment the dashed line is filtered to: the highlighted segment, else the page filter, else none (sum). */
  private filteredSegment(): number | null {
    if (this.isSegment(this.highlight)) {
      return this.highlight;
    }
    return this.toClassifyFocus;
  }

  private isSegment(index: number | null): boolean {
    return index !== null && index >= 0 && index < SEGMENT_COUNT;
  }

  private seriesColor(series: TrafficSeries): string {
    return (getStyle(series.colorVar) || '').trim() || series.fallbackColor;
  }
}
