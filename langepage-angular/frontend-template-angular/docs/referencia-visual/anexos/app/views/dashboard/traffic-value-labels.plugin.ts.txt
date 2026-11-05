import type { Plugin } from 'chart.js';

/** `point`: the dataset's value is written above each of its points. Datasets without it get no labels. */
export type ValueLabelPlacement = 'point';

const FALLBACK_FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const OFFSET = 6;
/** Vertical room per label: labels at the same x never overlap. */
const LINE_HEIGHT = 13;
/** Minimum horizontal room per label; denser series label every n-th point (tooltip keeps the rest). */
const MIN_LABEL_SPACING = 30;
const numberFormat = new Intl.NumberFormat('pt-BR');

interface PendingLabel {
  x: number;
  y: number;
  text: string;
}

/**
 * Writes each point's value above it, in the brand font (Inter 600 11px) and chart text color,
 * with a halo in the card surface color. Labels sharing an x position are stacked so they never
 * overlap. Font and colors are read at draw time, so the labels follow the light/dark theme without
 * rebuilding the chart.
 */
export const trafficValueLabelsPlugin: Plugin<'line'> = {
  id: 'trafficValueLabels',
  afterDatasetsDraw(chart) {
    const styles = getComputedStyle(chart.canvas);
    const ink = styles.getPropertyValue('--app-chart-color').trim() || '#666';
    const halo = styles.getPropertyValue('--cui-card-bg').trim() || '#fff';
    const family = styles.getPropertyValue('--app-chart-font-family').trim() || FALLBACK_FONT_FAMILY;
    const byIndex = new Map<number, PendingLabel[]>();

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const placement = (dataset as { valueLabel?: ValueLabelPlacement }).valueLabel;
      const points = chart.getDatasetMeta(datasetIndex).data;
      const values = dataset.data as number[];
      if (placement !== 'point' || !points.length || !chart.isDatasetVisible(datasetIndex)) {
        return;
      }
      const spacing = points.length > 1 ? Math.abs(points[1].x - points[0].x) : Infinity;
      const step = Math.max(1, Math.ceil(MIN_LABEL_SPACING / spacing));
      points.forEach((point, index) => {
        if (index % step !== 0 || values[index] == null) {
          return;
        }
        const list = byIndex.get(index) ?? [];
        list.push({ x: point.x, y: point.y - OFFSET, text: numberFormat.format(values[index]) });
        byIndex.set(index, list);
      });
    });

    const ctx = chart.ctx;
    ctx.save();
    ctx.font = `600 11px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = halo;
    ctx.fillStyle = ink;

    byIndex.forEach((labels) => {
      // Top to bottom; push each label down until it clears the one above.
      labels.sort((a, b) => a.y - b.y);
      for (let index = 1; index < labels.length; index++) {
        labels[index].y = Math.max(labels[index].y, labels[index - 1].y + LINE_HEIGHT);
      }
      labels.forEach((label) => {
        ctx.strokeText(label.text, label.x, label.y);
        ctx.fillText(label.text, label.x, label.y);
      });
    });

    ctx.restore();
  }
};
