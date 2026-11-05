import { buildTrafficPeriod, DateRange, toInputDate, TrafficPeriod, trafficPointCount } from '../../dashboard/period/period-range';
import { WaterfallData, WaterfallPart, WaterfallStep } from './waterfall.model';

/** Points of each granularity in one year: the base data covers a full year. */
const POINTS_PER_YEAR: Record<TrafficPeriod, number> = { Day: 365, Month: 12, Year: 1 };
/** Period-wide swing (same for every segment) and per-segment swing, as fractions of the scaled value. */
const ACTIVITY_SWING = 0.10;
const SEGMENT_SWING = 0.08;
/** The result never drops below this share of gross revenue. */
const MIN_RESULT_SHARE = 0.05;
const DECIMALS = 3;

/**
 * Derives the waterfall for any period from the annual base (mock, rule R4), deterministically:
 * values scale with the share of a year the range covers (days/365, months/12, years), with a
 * stable pseudo-random swing seeded by the granularity and dates. The result stays coherent:
 * parts sum to their step, and every total after the first equals the running level
 * (gross revenue minus the decreases so far). The exact base year returns the base values.
 */
export function deriveWaterfall(base: WaterfallData, period: TrafficPeriod, bounds: DateRange): WaterfallData {
  const subtitle = buildTrafficPeriod(period, bounds).subtitle;
  if (coversBaseYear(base, bounds)) {
    return { ...base, period: subtitle, steps: base.steps.map(cloneStep) };
  }

  const seed = `${period}|${toInputDate(bounds.start)}|${toInputDate(bounds.end)}`;
  const scale = (trafficPointCount(period, bounds) / POINTS_PER_YEAR[period]) * (1 + ACTIVITY_SWING * noise(seed, 'activity'));

  const steps = base.steps.map((step, index): WaterfallStep => {
    // Totals after the first are running levels: filled in below, once the decreases are known.
    if (step.kind === 'total' && index > 0) {
      return cloneStep(step);
    }
    const parts = step.parts.map((part) => ({
      label: part.label,
      value: Math.max(round(part.value * scale * (1 + SEGMENT_SWING * noise(seed, `${step.id}/${part.label}`))), 0)
    }));
    return { ...step, parts };
  });

  const gross = sum(steps.find((step) => step.kind === 'total')?.parts ?? []);
  const decreases = steps.filter((step) => step.kind === 'decrease');
  const totalDecrease = decreases.reduce((total, step) => total + sum(step.parts), 0);
  const maxDecrease = gross * (1 - MIN_RESULT_SHARE);
  if (totalDecrease > maxDecrease && totalDecrease > 0) {
    const ratio = maxDecrease / totalDecrease;
    // Floor, so rounding never pushes the decreases back over the limit.
    decreases.forEach((step) => step.parts.forEach((part) => (part.value = round(part.value * ratio, Math.floor))));
  }

  let level = 0;
  steps.forEach((step, index) => {
    if (step.kind === 'decrease') {
      level = round(level - sum(step.parts));
      return;
    }
    if (index > 0) {
      step.parts = distribute(Math.max(level, 0), base.steps[index].parts, step.parts);
    }
    level = round(sum(step.parts));
  });

  return { ...base, period: subtitle, steps };
}

/** True when the range is exactly one calendar year and it is the base year. */
function coversBaseYear(base: WaterfallData, { start, end }: DateRange): boolean {
  const year = base.baseYear;
  return year !== undefined
    && start.getFullYear() === year && start.getMonth() === 0 && start.getDate() === 1
    && end.getFullYear() === year && end.getMonth() === 11 && end.getDate() === 31;
}

/** Splits `total` across the parts in the base proportions; the last part absorbs the rounding so the sum is exact. */
function distribute(total: number, baseParts: WaterfallPart[], parts: WaterfallPart[]): WaterfallPart[] {
  const baseTotal = sum(baseParts) || 1;
  let remaining = total;
  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const value = isLast ? round(remaining) : round((total * baseParts[index].value) / baseTotal);
    remaining = round(remaining - value);
    return { label: part.label, value: Math.max(value, 0) };
  });
}

function cloneStep(step: WaterfallStep): WaterfallStep {
  return { ...step, parts: step.parts.map((part) => ({ ...part })) };
}

function sum(parts: WaterfallPart[]): number {
  return parts.reduce((total, part) => total + part.value, 0);
}

function round(value: number, method: (value: number) => number = Math.round): number {
  const factor = Math.pow(10, DECIMALS);
  return method(value * factor) / factor;
}

/** Stable value in [-1, 1) for a seed/key pair (FNV-1a hash). */
export function noise(seed: string, key: string): number {
  const text = `${seed}#${key}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash / 0x100000000) * 2 - 1;
}
