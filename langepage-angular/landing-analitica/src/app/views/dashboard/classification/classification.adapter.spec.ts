import {
  fromNormaClassificadaV1,
  fromPaginaNormasV1,
  fromResumoNormasV1,
  NormaClassificadaV1,
  normasPageParams,
  ResumoNormasClassificadasV1,
  summaryParams
} from './classification.adapter';
import { aggregateClassification, NormasQuery } from './classification-derive';
import { ClassifiedNorma } from './classification.model';

const YEAR = { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) };

/** `NormaClassificada` example of the OpenAPI. */
const NORMA_V1: NormaClassificadaV1 = {
  codigo: 'Resolução CMN 4.855',
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: '4.855',
  dataClassificacao: '2021-03-02',
  segmento: 'VAREJO',
  tema: 'Pix: regras de devolução e limites',
  aplicavel: true,
  area: 'Meios de Pagamento',
  diretoria: 'Operações'
};

const QUERY: NormasQuery = {
  bounds: YEAR,
  segment: null,
  applicable: null,
  theme: null,
  sort: { key: 'classifiedAt', direction: 'desc' },
  page: 0,
  size: 15
};

describe('classification adapters (contract v1)', () => {
  it('maps every field of NormaClassificada to ClassifiedNorma', () => {
    expect(fromNormaClassificadaV1(NORMA_V1)).toEqual({
      code: 'Resolução CMN 4.855',
      orgao: 'CMN',
      tipo: 'Resolução',
      numero: '4.855',
      classifiedAt: '2021-03-02',
      segment: 'varejo',
      theme: 'Pix: regras de devolução e limites',
      applicable: true,
      area: 'Meios de Pagamento',
      diretoria: 'Operações'
    });
    expect(() => fromNormaClassificadaV1({ ...NORMA_V1, segmento: 'varejo' } as unknown as NormaClassificadaV1)).toThrowError(/outside/);
  });

  it('maps PaginaNormasClassificadas to a page', () => {
    const page = fromPaginaNormasV1({ content: [NORMA_V1], totalElements: 573, totalPages: 39, number: 2, size: 15 });
    expect(page.total).toBe(573);
    expect(page.page).toBe(2);
    expect(page.items[0].code).toBe('Resolução CMN 4.855');
  });

  it('maps ResumoNormasClassificadas to the same aggregate the mock computes', () => {
    const norma = (code: string, theme: string, applicable: boolean): ClassifiedNorma => ({
      ...fromNormaClassificadaV1(NORMA_V1),
      code,
      theme,
      applicable
    });
    const normas = [norma('A', 'Pix', true), norma('B', 'Pix', true), norma('C', 'Capital', true), norma('D', 'Câmbio', false)];
    const resumo: ResumoNormasClassificadasV1 = {
      dataReferencia: '2021-12-31',
      total: 4,
      aplicaveis: 3,
      naoAplicaveis: 1,
      totalTemas: 3,
      temas: [{ tema: 'Pix', quantidade: 2 }, { tema: 'Capital', quantidade: 1 }],
      outrosTemas: null
    };
    expect(fromResumoNormasV1(resumo)).toEqual(aggregateClassification(normas, YEAR));
  });

  it('turns outrosTemas into the "Outros temas" row without a bar', () => {
    const resumo: ResumoNormasClassificadasV1 = {
      dataReferencia: '2021-12-31',
      total: 10,
      aplicaveis: 8,
      naoAplicaveis: 2,
      totalTemas: 8,
      temas: [{ tema: 'Pix', quantidade: 4 }],
      outrosTemas: { quantidade: 4, temasAgrupados: 3 }
    };
    expect(fromResumoNormasV1(resumo).others).toEqual({ label: 'Outros temas', count: 4, share: 0.5, width: 0, grouped: 3 });
    expect(fromResumoNormasV1({ ...resumo, total: 0, aplicaveis: 0, totalTemas: 0 }).applicableShare).toBe(0);
  });

  it('sends page, size, period and the sort on screen with the mock ties (at most 3 sort items)', () => {
    expect(normasPageParams(QUERY)).toEqual({ inicio: '2021-01-01', fim: '2021-12-31', page: 0, size: 15, sort: ['dataClassificacao,desc', 'codigo,asc'] });
    expect(normasPageParams({ ...QUERY, sort: { key: 'numero', direction: 'asc' }, page: 3 })['sort']).toEqual([
      'numero,asc',
      'dataClassificacao,desc',
      'codigo,asc'
    ]);
    const keys = ['classifiedAt', 'orgao', 'tipo', 'numero', 'theme', 'segment', 'applicable', 'area', 'diretoria'] as const;
    const allowed = /^(dataClassificacao|orgao|tipo|numero|tema|segmento|aplicavel|area|diretoria|codigo)(,(asc|desc))?$/;
    for (const key of keys) {
      const sort = normasPageParams({ ...QUERY, sort: { key, direction: 'asc' } })['sort'] as string[];
      expect(sort.length).toBeLessThanOrEqual(3);
      expect(sort.every((item) => allowed.test(item))).withContext(key).toBeTrue();
    }
  });

  it('sends only the filters that are set (segmento, aplicavel, tema)', () => {
    const params = normasPageParams({ ...QUERY, segment: 'atacado', applicable: false, theme: 'Pix' });
    expect([params['segmento'], params['aplicavel'], params['tema']]).toEqual(['ATACADO', false, 'Pix']);
    expect(Object.keys(normasPageParams(QUERY))).not.toContain('aplicavel');
  });

  it('asks the summary of the class whose themes are ranked', () => {
    expect(summaryParams({ bounds: YEAR, segment: 'varejo', theme: 'Pix' })).toEqual({
      inicio: '2021-01-01',
      fim: '2021-12-31',
      temasDe: 'APLICAVEIS',
      segmento: 'VAREJO',
      tema: 'Pix'
    });
    expect(summaryParams({ bounds: YEAR, segment: null, themesOf: false })).toEqual({ inicio: '2021-01-01', fim: '2021-12-31', temasDe: 'NAO_APLICAVEIS' });
  });
});
