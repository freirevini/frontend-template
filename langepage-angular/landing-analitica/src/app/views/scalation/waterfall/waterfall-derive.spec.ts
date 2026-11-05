import { presetRange } from '../../dashboard/period/period-range';
import { deriveWaterfall, noise } from './waterfall-derive';
import { buildWaterfall, WaterfallData, WaterfallStep } from './waterfall.model';

const BASE: WaterfallData = {
  period: 'Janeiro a dezembro de 2021',
  baseYear: 2021,
  currency: 'BRL',
  unitScale: 1000000,
  steps: [
    { id: 'gross', label: 'Receita bruta', kind: 'total', parts: [{ label: 'A', value: 15 }, { label: 'B', value: 10 }, { label: 'C', value: 25 }] },
    { id: 'deductions', label: 'Deduções', kind: 'decrease', parts: [{ label: 'Impostos', value: 15 }, { label: 'Devoluções', value: 5 }] },
    { id: 'costs', label: 'Custos', kind: 'decrease', parts: [{ label: 'Matéria-prima', value: 5 }, { label: 'Logística', value: 3 }] },
    { id: 'expenses', label: 'Despesas', kind: 'decrease', parts: [{ label: 'Pessoal', value: 8 }, { label: 'Marketing', value: 4 }] },
    { id: 'result', label: 'Resultado', kind: 'total', parts: [{ label: 'Operacional', value: 6 }, { label: 'Financeiro', value: 4 }] }
  ]
};

const sum = (step: WaterfallStep) => step.parts.reduce((total, part) => total + part.value, 0);
const range = (start: [number, number, number], end: [number, number, number]) => ({
  start: new Date(start[0], start[1] - 1, start[2]),
  end: new Date(end[0], end[1] - 1, end[2])
});

describe('deriveWaterfall', () => {
  it('returns the base values for the base year, with the period subtitle', () => {
    const derived = deriveWaterfall(BASE, 'Month', presetRange('Month', 12));
    expect(derived.period).toBe('Janeiro a dezembro de 2021');
    expect(derived.steps).toEqual(BASE.steps);
    expect(derived.steps).not.toBe(BASE.steps);
    expect(deriveWaterfall(BASE, 'Year', presetRange('Year', 1)).steps[0].parts[0].value).toBe(15);
  });

  it('scales with the share of a year the range covers', () => {
    const quarter = deriveWaterfall(BASE, 'Month', presetRange('Month', 3));
    expect(quarter.period).toBe('Outubro a dezembro de 2021');
    const gross = sum(quarter.steps[0]);
    expect(gross).toBeGreaterThan(50 * 0.25 * 0.8);
    expect(gross).toBeLessThan(50 * 0.25 * 1.2);

    const week = deriveWaterfall(BASE, 'Day', presetRange('Day', 7));
    expect(sum(week.steps[0])).toBeCloseTo((50 * 7) / 365, 0);

    const fiveYears = deriveWaterfall(BASE, 'Year', presetRange('Year', 5));
    expect(sum(fiveYears.steps[0])).toBeGreaterThan(50 * 5 * 0.8);
    expect(fiveYears.period).toBe('2017 a 2021');
  });

  it('keeps the result equal to gross revenue minus the decreases and splits it across its parts', () => {
    const derived = deriveWaterfall(BASE, 'Month', presetRange('Month', 6));
    const gross = sum(derived.steps[0]);
    const decreases = derived.steps.filter((step) => step.kind === 'decrease').reduce((total, step) => total + sum(step), 0);
    const result = derived.steps[4];
    expect(sum(result)).toBeCloseTo(gross - decreases, 6);
    expect(result.parts.map((part) => part.label)).toEqual(['Operacional', 'Financeiro']);
    // Base shares (6:4) are kept.
    expect(result.parts[0].value / sum(result)).toBeCloseTo(0.6, 1);
    const model = buildWaterfall(derived.steps);
    expect(model.result).toBeCloseTo(model.columns[3].end, 6);
  });

  it('is deterministic for the same dates and differs between ranges', () => {
    const bounds = range([2021, 5, 10], [2021, 6, 20]);
    const first = deriveWaterfall(BASE, 'Day', bounds);
    const second = deriveWaterfall(BASE, 'Day', bounds);
    expect(second).toEqual(first);
    const other = deriveWaterfall(BASE, 'Day', range([2021, 5, 11], [2021, 6, 21]));
    expect(other.steps[0].parts[0].value).not.toBe(first.steps[0].parts[0].value);
    expect(noise('a', 'b')).toBe(noise('a', 'b'));
    expect(Math.abs(noise('a', 'b'))).toBeLessThanOrEqual(1);
  });

  it('never lets the decreases swallow the result', () => {
    const tight: WaterfallData = {
      ...BASE,
      steps: [
        { id: 'gross', label: 'Receita bruta', kind: 'total', parts: [{ label: 'A', value: 50 }] },
        { id: 'costs', label: 'Custos', kind: 'decrease', parts: [{ label: 'X', value: 30 }, { label: 'Y', value: 19.5 }] },
        { id: 'result', label: 'Resultado', kind: 'total', parts: [{ label: 'Operacional', value: 0.5 }] }
      ]
    };
    for (let count = 1; count <= 30; count++) {
      const derived = deriveWaterfall(tight, 'Day', presetRange('Day', count));
      const gross = sum(derived.steps[0]);
      const result = sum(derived.steps[2]);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeGreaterThanOrEqual(gross * 0.05 - 0.001);
      expect(() => buildWaterfall(derived.steps)).not.toThrow();
    }
  });
});
