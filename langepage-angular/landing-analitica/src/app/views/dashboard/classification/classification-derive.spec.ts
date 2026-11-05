import { aggregateClassification, filterClassified } from './classification-derive';
import { ClassifiedNorma } from './classification.model';

let counter = 0;
const norma = (day: string, theme: string, applicable = true, segment = 'atacado'): ClassifiedNorma => ({
  code: `Resolução CMN ${++counter}`,
  classifiedAt: day,
  segment,
  theme,
  applicable,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: '1',
  area: 'Área',
  diretoria: 'Diretoria'
});
const YEAR = { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) };

describe('filterClassified', () => {
  it('keeps the period (both ends), segment, theme and class asked for, in order', () => {
    const normas = [norma('2021-01-01', 'A'), norma('2021-06-01', 'B', false), norma('2021-12-31', 'A', true, 'varejo'), norma('2022-01-01', 'A')];
    expect(filterClassified(normas, YEAR).length).toBe(3);
    expect(filterClassified(normas, YEAR, { theme: 'A' }).map((item) => item.classifiedAt)).toEqual(['2021-01-01', '2021-12-31']);
    expect(filterClassified(normas, YEAR, { applicable: false }).map((item) => item.theme)).toEqual(['B']);
    expect(filterClassified(normas, YEAR, { segment: 'varejo' }).length).toBe(1);
  });
});

describe('aggregateClassification', () => {
  it('splits applicable and not applicable inside the period', () => {
    const normas = [norma('2021-03-01', 'A'), norma('2021-03-02', 'A', false), norma('2021-03-03', 'B'), norma('2020-12-31', 'A')];
    const data = aggregateClassification(normas, YEAR);
    expect(data.total).toBe(3);
    expect(data.applicable).toBe(2);
    expect(data.notApplicable).toBe(1);
    expect(data.applicableShare).toBeCloseTo(2 / 3);
  });

  it('includes both ends of the period', () => {
    const normas = [norma('2021-01-01', 'A'), norma('2021-12-31', 'A')];
    expect(aggregateClassification(normas, YEAR).total).toBe(2);
  });

  it('ranks the themes of the applicable normas only, with shares of the applicable total and widths of the largest', () => {
    const normas = [norma('2021-05-01', 'B'), norma('2021-05-02', 'A'), norma('2021-05-03', 'A'), norma('2021-05-04', 'C', false)];
    const data = aggregateClassification(normas, YEAR);
    expect(data.themes.map((theme) => [theme.label, theme.count])).toEqual([['A', 2], ['B', 1]]);
    expect(data.themes[1].share).toBeCloseTo(1 / 3);
    expect(data.themes[0].width).toBe(1);
    expect(data.themes[1].width).toBe(0.5);
    expect(data.others).toBeNull();
  });

  it('groups the tail in "Outros temas", but never a single theme', () => {
    const themes = ['A', 'A', 'A', 'B', 'B', 'C', 'D'];
    const normas = themes.map((theme, index) => norma(`2021-06-${String(index + 1).padStart(2, '0')}`, theme));
    const grouped = aggregateClassification(normas, YEAR, {}, 2);
    expect(grouped.themes.map((theme) => theme.label)).toEqual(['A', 'B']);
    expect(grouped.others).toEqual(jasmine.objectContaining({ label: 'Outros temas', count: 2, grouped: 2, width: 0 }));
    const oneLeft = aggregateClassification(normas, YEAR, {}, 3);
    expect(oneLeft.themes.length).toBe(4);
    expect(oneLeft.others).toBeNull();
  });

  it('keeps only the filtered segment', () => {
    const normas = [norma('2021-07-01', 'A', true, 'atacado'), norma('2021-07-02', 'A', true, 'varejo')];
    expect(aggregateClassification(normas, YEAR, { segment: 'varejo' }).total).toBe(1);
  });

  it('keeps only one theme and ranks the themes of the not applicable normas on request', () => {
    const normas = [norma('2021-08-01', 'A'), norma('2021-08-02', 'A', false), norma('2021-08-03', 'B', false), norma('2021-08-04', 'B', false)];
    const themeA = aggregateClassification(normas, YEAR, { theme: 'A' });
    expect([themeA.total, themeA.applicable, themeA.notApplicable]).toEqual([2, 1, 1]);
    const notApplicable = aggregateClassification(normas, YEAR, { themesOf: false });
    expect(notApplicable.themesTotal).toBe(3);
    expect(notApplicable.themes.map((theme) => [theme.label, theme.count])).toEqual([['B', 2], ['A', 1]]);
    expect(notApplicable.themes[0].share).toBeCloseTo(2 / 3);
  });

  it('returns zeros for an empty period', () => {
    const data = aggregateClassification([], YEAR);
    expect(data.total).toBe(0);
    expect(data.applicableShare).toBe(0);
    expect(data.themes).toEqual([]);
    expect(data.others).toBeNull();
  });
});
