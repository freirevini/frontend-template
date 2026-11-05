import { fromNormativosRecebidosV1, NormativosRecebidosV1 } from './traffic.adapter';

/** Example of `NormativosRecebidos` in docs/contratos-de-dados.md section 4 (segments shuffled on purpose). */
const V1: NormativosRecebidosV1 = {
  granularidade: 'MES',
  inicio: '2021-10-01',
  fim: '2021-12-31',
  pontos: ['2021-10', '2021-11', '2021-12'],
  segmentos: [
    { segmento: 'VAREJO', nome: 'Varejo', classificadas: [150, 162, 171], aClassificar: [4, 6, 10] },
    { segmento: 'ATACADO', nome: 'Atacado', classificadas: [201, 187, 215], aClassificar: [5, 9, 4] }
  ]
};

describe('fromNormativosRecebidosV1', () => {
  it('maps every field to TrafficResponse, segments in TRAFFIC_SERIES order', () => {
    expect(fromNormativosRecebidosV1(V1)).toEqual({
      period: 'Month',
      start: '2021-10-01',
      end: '2021-12-31',
      points: ['2021-10', '2021-11', '2021-12'],
      segments: [
        { segment: 'atacado', label: 'Atacado', classified: [201, 187, 215], toClassify: [5, 9, 4] },
        { segment: 'varejo', label: 'Varejo', classified: [150, 162, 171], toClassify: [4, 6, 10] }
      ]
    });
  });

  it('rejects a series shorter than the points and values outside the domains', () => {
    const short = { ...V1, segmentos: [{ ...V1.segmentos[0], classificadas: [1] }] };
    expect(() => fromNormativosRecebidosV1(short)).toThrowError(/one value per point/);
    expect(() => fromNormativosRecebidosV1({ ...V1, granularidade: 'SEMANA' } as unknown as NormativosRecebidosV1)).toThrowError(/outside/);
  });
});
