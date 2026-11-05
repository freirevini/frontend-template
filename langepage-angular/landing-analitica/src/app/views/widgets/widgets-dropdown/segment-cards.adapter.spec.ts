import { fromSegmentosV1, SegmentosRespostaV1 } from './segment-cards.adapter';

/** Example of `SegmentosResposta` in docs/contratos-de-dados.md section 3 (order shuffled on purpose). */
const V1: SegmentosRespostaV1 = {
  dataReferencia: '2021-12-31',
  segmentos: [
    { id: 'CORPORATIVO', nome: 'Corporativo', total: 62, aClassificar: 9, tendencia: [1, 18, 9, 17, 34, 22, 11] },
    { id: 'ATACADO', nome: 'Atacado', total: 54, aClassificar: 7, tendencia: [65, 59, 84, 84, 51, 55, 40] }
  ]
};

describe('fromSegmentosV1', () => {
  it('maps every field to SegmentCardsData, icon by id, alphabetical order', () => {
    expect(fromSegmentosV1(V1)).toEqual({
      asOf: '2021-12-31',
      segments: [
        { id: 'atacado', label: 'Atacado', icon: 'cilTruck', total: 54, toClassify: 7, trend: [65, 59, 84, 84, 51, 55, 40] },
        { id: 'corporativo', label: 'Corporativo', icon: 'cilBuilding', total: 62, toClassify: 9, trend: [1, 18, 9, 17, 34, 22, 11] }
      ]
    });
  });

  it('rejects a segment outside the domain and a payload without segmentos', () => {
    const bad = { ...V1, segmentos: [{ ...V1.segmentos[0], id: 'OUTRO' }] } as unknown as SegmentosRespostaV1;
    expect(() => fromSegmentosV1(bad)).toThrowError(/outside the v1 domain/);
    expect(() => fromSegmentosV1({} as SegmentosRespostaV1)).toThrowError(/segmentos/);
  });
});
