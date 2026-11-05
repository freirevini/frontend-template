import { buildWaterfall, WaterfallStep } from './waterfall.model';
import { formatCurrency, formatShare } from './waterfall-format';

const STEPS: WaterfallStep[] = [
  { id: 'gross', label: 'Receita bruta', kind: 'total', parts: [{ label: 'A', value: 15 }, { label: 'B', value: 10 }, { label: 'C', value: 25 }] },
  { id: 'deductions', label: 'Deduções', kind: 'decrease', parts: [{ label: 'Impostos', value: 15 }, { label: 'Devoluções', value: 5 }] },
  { id: 'costs', label: 'Custos', kind: 'decrease', parts: [{ label: 'Matéria-prima', value: 5 }, { label: 'Logística', value: 3 }] },
  { id: 'result', label: 'Resultado', kind: 'total', parts: [{ label: 'Operacional', value: 22 }] }
];

describe('buildWaterfall', () => {
  it('stacks totals upward from zero', () => {
    const model = buildWaterfall(STEPS);
    expect(model.columns[0].segments.map((s) => [s.low, s.high])).toEqual([[0, 15], [15, 25], [25, 50]]);
    expect(model.columns[0].end).toBe(50);
    expect(model.base).toBe(50);
  });

  it('hangs decreases downward from the running level', () => {
    const model = buildWaterfall(STEPS);
    expect(model.columns[1].segments.map((s) => [s.low, s.high])).toEqual([[35, 50], [30, 35]]);
    expect(model.columns[1].start).toBe(50);
    expect(model.columns[1].end).toBe(30);
    expect(model.columns[2].end).toBe(22);
  });

  it('ends with the last total as the result', () => {
    const model = buildWaterfall(STEPS);
    expect(model.result).toBe(22);
    expect(model.segments.length).toBe(8);
  });

  it('rejects negative or non-numeric values', () => {
    const invalid: WaterfallStep[] = [{ id: 'x', label: 'X', kind: 'total', parts: [{ label: 'Y', value: -1 }] }];
    expect(() => buildWaterfall(invalid)).toThrowError(/Valor inválido/);
  });

  it('rejects steps with more parts than the color ramp holds', () => {
    const parts = [1, 2, 3, 4].map((value) => ({ label: `P${value}`, value }));
    expect(() => buildWaterfall([{ id: 'x', label: 'X', kind: 'total', parts }])).toThrowError(/de 1 a 3/);
  });

  it('rejects an empty list', () => {
    expect(() => buildWaterfall([])).toThrowError(/sem etapas/);
  });
});

describe('waterfall formatting', () => {
  it('formats compact BRL in pt-BR with a typographic minus', () => {
    expect(formatCurrency(15, 1000000, 'BRL').replace(/\s/g, ' ')).toBe('R$ 15 mi');
    expect(formatCurrency(-15, 1000000, 'BRL').replace(/\s/g, ' ')).toBe('−R$ 15 mi');
  });

  it('formats shares of the base', () => {
    expect(formatShare(15, 50)).toBe('30%');
    expect(formatShare(-5, 50)).toBe('−10%');
    expect(formatShare(5, 0)).toBe('—');
  });
});
