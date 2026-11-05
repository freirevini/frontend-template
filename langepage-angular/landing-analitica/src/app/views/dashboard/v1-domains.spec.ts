import { granularityFromV1, granularityToV1, periodParams, segmentFromV1, segmentToV1 } from './v1-domains';

describe('v1 domains', () => {
  it('converts the segments both ways and rejects values outside the domain', () => {
    expect(['ATACADO', 'CORPORATIVO', 'PLATAFORMA', 'VAREJO'].map(segmentFromV1)).toEqual(['atacado', 'corporativo', 'plataforma', 'varejo']);
    expect(segmentToV1('varejo')).toBe('VAREJO');
    expect(() => segmentFromV1('atacado')).toThrowError(/outside the v1 domain/);
    expect(() => segmentToV1('to-classify')).toThrowError(/Unknown segment/);
  });

  it('converts the granularities both ways', () => {
    expect(['Day', 'Month', 'Year'].map((p) => granularityToV1(p as 'Day'))).toEqual(['DIA', 'MES', 'ANO']);
    expect(granularityFromV1('ANO')).toBe('Year');
    expect(() => granularityFromV1('SEMANA')).toThrowError(/outside the v1 domain/);
  });

  it('sends the period as granularidade, inicio and fim in local yyyy-MM-dd', () => {
    expect(periodParams('Month', { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) })).toEqual({
      granularidade: 'MES',
      inicio: '2021-01-01',
      fim: '2021-12-31'
    });
  });
});
