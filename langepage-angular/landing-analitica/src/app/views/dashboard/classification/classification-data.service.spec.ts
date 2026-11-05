import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { DataPage } from '../../../core/http/api-page';
import { ClassificationDataService, localClassificationQueries } from './classification-data.service';
import { filterClassified, NormasQuery, NormasSortKey, pageClassified } from './classification-derive';
import { ClassificationAggregate } from './classification-derive';
import { ClassificationData, ClassifiedNorma } from './classification.model';

const YEAR = { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) };
const QUERY: NormasQuery = {
  bounds: YEAR,
  segment: null,
  applicable: null,
  theme: null,
  sort: { key: 'classifiedAt', direction: 'desc' },
  page: 0,
  size: 15
};

/** 40 normas with ties on every column (dates, themes, segments, numbers) so the tie-breaks matter. */
const SEGMENTS = ['atacado', 'corporativo', 'plataforma', 'varejo'];
const NORMAS: ClassifiedNorma[] = Array.from({ length: 40 }, (_, index) => ({
  code: `Resolução CMN ${1000 + ((index * 7) % 40)}`,
  orgao: ['CMN', 'BCB', 'CVM'][index % 3],
  tipo: ['Resolução', 'Circular', 'Instrução Normativa'][index % 3],
  numero: ['4.855', '12', '300', '5.001', '10.001'][index % 5],
  classifiedAt: `2021-${String((index % 6) + 1).padStart(2, '0')}-${String((index % 4) + 10).padStart(2, '0')}`,
  segment: SEGMENTS[index % 4],
  theme: ['Pix', 'Capital', 'Câmbio', 'Ética'][index % 4],
  applicable: index % 3 !== 0,
  area: ['Área B', 'área a', 'Área C'][index % 3],
  diretoria: ['Riscos', 'Operações'][index % 2]
}));
const DATA: ClassificationData = { asOf: '2021-12-31', normas: NORMAS };

/** How AnalyticTableComponent sorted its rows before the paging moved to the data service (reference for parity). */
function legacySort(rows: ClassifiedNorma[], key: NormasSortKey, dir: 'asc' | 'desc'): ClassifiedNorma[] {
  const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  const labels: Record<string, string> = { atacado: 'Atacado', corporativo: 'Corporativo', plataforma: 'Plataforma', varejo: 'Varejo' };
  const cell = (n: ClassifiedNorma): string =>
    key === 'segment' ? labels[n.segment] : key === 'applicable' ? (n.applicable ? 'Sim' : 'Não') : String(n[key as keyof ClassifiedNorma]);
  const actNumber = (numero: string) => Number(numero.replace(/\./g, '').replace(',', '.')) || 0;
  const compare = (a: ClassifiedNorma, b: ClassifiedNorma): number =>
    key === 'classifiedAt' ? a.classifiedAt.localeCompare(b.classifiedAt) : key === 'numero' ? actNumber(a.numero) - actNumber(b.numero) : collator.compare(cell(a), cell(b));
  const direction = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => direction * compare(a, b) || b.classifiedAt.localeCompare(a.classifiedAt) || a.code.localeCompare(b.code));
}

describe('mock paging parity (localClassificationQueries)', () => {
  const local = localClassificationQueries(() => of(DATA));
  const keys: NormasSortKey[] = ['classifiedAt', 'orgao', 'tipo', 'numero', 'theme', 'segment', 'applicable', 'area', 'diretoria'];

  it('gives, page by page, exactly the rows and order the table showed before (every column, both directions)', () => {
    for (const key of keys) {
      for (const direction of ['asc', 'desc'] as const) {
        const filters = { segment: null, applicable: true, theme: null };
        const expected = legacySort(filterClassified(NORMAS, YEAR, filters), key, direction);
        const pages: ClassifiedNorma[] = [];
        for (let page = 0; page * 15 < expected.length; page++) {
          local.getNormasPage({ ...QUERY, ...filters, sort: { key, direction }, page }).subscribe((result) => {
            expect(result.total).toBe(expected.length);
            pages.push(...result.items);
          });
        }
        expect(pages.map((n) => n.code)).withContext(`${key} ${direction}`).toEqual(expected.map((n) => n.code));
      }
    }
  });

  it('applies the period, segment, theme and class like the BFF parameters', () => {
    const query = { ...QUERY, bounds: { start: new Date(2021, 1, 1), end: new Date(2021, 2, 31) }, segment: 'atacado', theme: 'Pix', applicable: true };
    const page = pageClassified(NORMAS, query);
    expect(page.items.every((n) => n.segment === 'atacado' && n.theme === 'Pix' && n.applicable && n.classifiedAt >= '2021-02-01' && n.classifiedAt <= '2021-03-31')).toBeTrue();
    expect(page.total).toBe(filterClassified(NORMAS, query.bounds, query).length);
  });
});

describe('ClassificationDataService', () => {
  let service: ClassificationDataService;
  let http: HttpTestingController;

  const setup = (dataMock: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock } } }
      ]
    });
    service = TestBed.inject(ClassificationDataService);
    http = TestBed.inject(HttpTestingController);
  };

  afterEach(() => http.verify());

  it('dataMock true: reads the mock once and pages it locally (no BFF call)', () => {
    setup(true);
    const pages: DataPage<ClassifiedNorma>[] = [];
    service.getNormasPage(QUERY).subscribe((page) => pages.push(page));
    http.expectOne('assets/data/dashboard-classificacao.json').flush(DATA);
    service.getNormasPage({ ...QUERY, page: 2 }).subscribe((page) => pages.push(page));
    http.expectNone((request) => request.url.startsWith('/api'));
    expect(pages.map((page) => [page.page, page.items.length, page.total])).toEqual([[0, 15, 40], [2, 10, 40]]);
  });

  it('dataMock false: GET /api/v1/normas-classificadas with page, size, sort and filters, adapted and validated', () => {
    setup(false);
    let page: DataPage<ClassifiedNorma> | undefined;
    service.getNormasPage({ ...QUERY, segment: 'varejo', applicable: true, theme: 'Pix', page: 2, sort: { key: 'theme', direction: 'asc' } }).subscribe((value) => (page = value));
    const request = http.expectOne((r) => r.url === '/api/v1/normas-classificadas');
    const params = request.request.params;
    expect(params.get('inicio')).toBe('2021-01-01');
    expect(params.get('fim')).toBe('2021-12-31');
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('15');
    expect(params.getAll('sort')).toEqual(['tema,asc', 'dataClassificacao,desc', 'codigo,asc']);
    expect([params.get('segmento'), params.get('aplicavel'), params.get('tema')]).toEqual(['VAREJO', 'true', 'Pix']);
    request.flush({
      content: [{ codigo: 'X 1', orgao: 'CMN', tipo: 'Resolução', numero: '1', dataClassificacao: '2021-05-01', segmento: 'VAREJO', tema: 'Pix', aplicavel: true, area: 'A', diretoria: 'D' }],
      totalElements: 31,
      totalPages: 3,
      number: 2,
      size: 15
    });
    expect(page?.total).toBe(31);
    expect(page?.items[0].segment).toBe('varejo');
  });

  it('dataMock false: rejects a page whose rows break the contract (block shows its load error)', () => {
    setup(false);
    let failed: unknown;
    service.getNormasPage(QUERY).subscribe({ error: (error) => (failed = error) });
    const bad = { codigo: 'X', orgao: 'CMN', tipo: 'R', numero: '1', dataClassificacao: 'ontem', segmento: 'VAREJO', tema: 'Pix', aplicavel: true, area: 'A', diretoria: 'D' };
    http.expectOne((r) => r.url === '/api/v1/normas-classificadas').flush({ content: [bad], totalElements: 1, totalPages: 1, number: 0, size: 15 });
    expect(String(failed)).toContain('invalid classifiedAt');
  });

  it('dataMock false: the pie and the themes list read /resumo with temasDe', () => {
    setup(false);
    let aggregate: ClassificationAggregate | undefined;
    service.getSummary({ bounds: YEAR, segment: 'atacado', themesOf: false }).subscribe((value) => (aggregate = value));
    const request = http.expectOne((r) => r.url === '/api/v1/normas-classificadas/resumo');
    expect(request.request.params.get('temasDe')).toBe('NAO_APLICAVEIS');
    expect(request.request.params.get('segmento')).toBe('ATACADO');
    request.flush({ dataReferencia: '2021-12-31', total: 5, aplicaveis: 3, naoAplicaveis: 2, totalTemas: 2, temas: [{ tema: 'Pix', quantidade: 2 }], outrosTemas: null });
    expect([aggregate?.total, aggregate?.notApplicable, aggregate?.themes[0].share]).toEqual([5, 2, 1]);
  });
});
