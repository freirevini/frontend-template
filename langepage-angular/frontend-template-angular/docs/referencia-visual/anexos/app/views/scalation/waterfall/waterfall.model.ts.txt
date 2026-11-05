/** A step either starts from zero (total) or hangs from the previous running level (decrease). */
export type WaterfallStepKind = 'total' | 'decrease';

export interface WaterfallPart {
  label: string;
  /** Always a positive amount; the step kind gives the direction. */
  value: number;
}

export interface WaterfallStep {
  id: string;
  label: string;
  kind: WaterfallStepKind;
  parts: WaterfallPart[];
}

export interface WaterfallData {
  /** Subtitle of the period shown (pt-BR). */
  period: string;
  /** Calendar year the base values cover; a range equal to it shows them unchanged. */
  baseYear?: number;
  currency: string;
  /** Multiplier from `value` to currency units (e.g. 1000000 = values in millions). */
  unitScale: number;
  steps: WaterfallStep[];
}

export interface WaterfallSegment {
  stepIndex: number;
  partIndex: number;
  stepLabel: string;
  partLabel: string;
  kind: WaterfallStepKind;
  value: number;
  /** Bar bounds on the value axis. */
  low: number;
  high: number;
}

export interface WaterfallColumn {
  step: WaterfallStep;
  total: number;
  /** Running level before and after this step. */
  start: number;
  end: number;
  segments: WaterfallSegment[];
}

export interface WaterfallModel {
  columns: WaterfallColumn[];
  segments: WaterfallSegment[];
  /** First total (e.g. gross revenue): the base for percentages. */
  base: number;
  result: number;
}

/** Each step holds at most this many parts: the color ramps have three steps. */
export const MAX_PARTS_PER_STEP = 3;

export function buildWaterfall(steps: WaterfallStep[]): WaterfallModel {
  if (!steps.length) {
    throw new Error('Cascata sem etapas.');
  }

  const columns: WaterfallColumn[] = [];
  let level = 0;

  steps.forEach((step, stepIndex) => {
    if (!step.parts.length || step.parts.length > MAX_PARTS_PER_STEP) {
      throw new Error(`Etapa "${step.label}" precisa ter de 1 a ${MAX_PARTS_PER_STEP} componentes.`);
    }
    step.parts.forEach((part) => {
      if (!Number.isFinite(part.value) || part.value < 0) {
        throw new Error(`Valor inválido em "${step.label} / ${part.label}".`);
      }
    });

    const total = step.parts.reduce((sum, part) => sum + part.value, 0);
    const start = step.kind === 'total' ? 0 : level;
    let cursor = start;

    const segments = step.parts.map((part, partIndex): WaterfallSegment => {
      const segment: WaterfallSegment = {
        stepIndex,
        partIndex,
        stepLabel: step.label,
        partLabel: part.label,
        kind: step.kind,
        value: part.value,
        // Totals stack upward from zero; decreases hang downward from the running level.
        low: step.kind === 'total' ? cursor : cursor - part.value,
        high: step.kind === 'total' ? cursor + part.value : cursor
      };
      cursor = step.kind === 'total' ? segment.high : segment.low;
      return segment;
    });

    const end = step.kind === 'total' ? total : level - total;
    columns.push({ step, total, start: level, end, segments });
    level = end;
  });

  const firstTotal = columns.find((column) => column.step.kind === 'total');
  return {
    columns,
    segments: columns.reduce<WaterfallSegment[]>((all, column) => all.concat(column.segments), []),
    base: firstTotal ? firstTotal.total : 0,
    result: level
  };
}
