import { CascataResultadoV1, fromCascataV1 } from './waterfall.adapter';

const bounds = { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) };
/** Example of `CascataResultado` in docs/contratos-de-dados.md section 6 (two steps). */
const V1: CascataResultadoV1 = {
  periodo: 'Outubro a dezembro de 2021',
  moeda: 'BRL',
  escalaUnidade: 1000000,
  etapas: [
    { id: 'gross-revenue', rotulo: 'Receita bruta', tipo: 'TOTAL', partes: [{ rotulo: 'Produto A', valor: 3.9 }] },
    { id: 'deductions', rotulo: 'Deduções', tipo: 'REDUCAO', partes: [{ rotulo: 'Impostos', valor: 1.3 }] }
  ]
};

describe('fromCascataV1', () => {
  it('maps every field to WaterfallData, TOTAL/REDUCAO to total/decrease', () => {
    expect(fromCascataV1(V1, 'Month', bounds)).toEqual({
      period: 'Outubro a dezembro de 2021',
      currency: 'BRL',
      unitScale: 1000000,
      steps: [
        { id: 'gross-revenue', label: 'Receita bruta', kind: 'total', parts: [{ label: 'Produto A', value: 3.9 }] },
        { id: 'deductions', label: 'Deduções', kind: 'decrease', parts: [{ label: 'Impostos', value: 1.3 }] }
      ]
    });
  });

  it('builds the subtitle from the period when periodo is absent', () => {
    expect(fromCascataV1({ ...V1, periodo: undefined }, 'Month', bounds).period).toBe('Outubro a dezembro de 2021');
  });

  it('rejects a step type outside the domain', () => {
    const bad = { ...V1, etapas: [{ ...V1.etapas[0], tipo: 'OUTRO' }] } as unknown as CascataResultadoV1;
    expect(() => fromCascataV1(bad, 'Month', bounds)).toThrowError(/outside the v1 domain/);
  });
});
