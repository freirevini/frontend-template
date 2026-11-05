import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconSetService } from '@coreui/icons-angular';
import { of } from 'rxjs';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { XlsxTable } from '../../../core/export/xlsx-export';
import { provideAppHttpClient } from '../../../core/http/api-error.interceptor';
import { BROWSER_NAVIGATE } from '../../../core/http/login-redirect.service';
import { iconSubset } from '../../../icons/icon-subset';
import { ClassificationDataService, localClassificationQueries } from '../classification/classification-data.service';
import { NormaClassificadaV1 } from '../classification/classification.adapter';
import { ClassificationData } from '../classification/classification.model';
import { AnalyticTableComponent } from './analytic-table.component';

const URL = '/api/v1/normas-classificadas';
const normaV1 = (index: number): NormaClassificadaV1 => ({
  codigo: `Resolução CMN ${index}`,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: String(index),
  dataClassificacao: '2021-05-10',
  segmento: 'ATACADO',
  tema: 'Pix',
  aplicavel: true,
  area: 'Área',
  diretoria: 'Diretoria'
});
/** Spring page `page` of `size` items out of `total`. */
const springPage = (page: number, size: number, total: number) => ({
  content: Array.from({ length: Math.max(0, Math.min(size, total - page * size)) }, (_, index) => normaV1(page * size + index + 1)),
  totalElements: total,
  totalPages: Math.ceil(total / size),
  number: page,
  size
});

describe('AnalyticTableComponent with the BFF (dataMock false)', () => {
  let fixture: ComponentFixture<AnalyticTableComponent>;
  let component: AnalyticTableComponent;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ');
  const pending = (): TestRequest => http.expectOne((request) => request.url === URL);
  const answer = (request: TestRequest, total: number) => {
    const page = Number(request.request.params.get('page'));
    const size = Number(request.request.params.get('size'));
    request.flush(springPage(page, size, total));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnalyticTableComponent],
      providers: [
        IconSetService,
        provideAppHttpClient(),
        provideHttpClientTesting(),
        { provide: BROWSER_NAVIGATE, useValue: () => undefined },
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock: false } } }
      ]
    });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AnalyticTableComponent);
    component = fixture.componentInstance;
    component.download = jasmine.createSpy('download').and.resolveTo();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('asks the server for one page of 15 with the default sort and pages through it', () => {
    const first = pending();
    const params = first.request.params;
    expect(['page', 'size', 'inicio', 'fim'].map((key) => params.get(key))).toEqual(['0', '15', '2021-01-01', '2021-12-31']);
    expect(params.getAll('sort')).toEqual(['dataClassificacao,desc', 'codigo,asc']);
    expect(params.has('segmento') || params.has('aplicavel') || params.has('tema')).toBeFalse();
    answer(first, 40);
    expect(root().querySelectorAll('tbody tr').length).toBe(15);
    expect(text()).toContain('1–15 de 40');
    expect(text()).toContain('Página 1 de 3');
    expect(text()).toContain('40 normas');

    const next = Array.from(root().querySelectorAll<HTMLButtonElement>('.analytic-pager button')).find((b) => b.textContent?.trim() === 'Próxima');
    next?.click();
    const second = pending();
    expect(second.request.params.get('page')).toBe('1');
    answer(second, 40);
    expect(text()).toContain('16–30 de 40');

    root().querySelectorAll<HTMLButtonElement>('.analytic-sort')[4].click();
    const sorted = pending();
    expect(sorted.request.params.get('page')).toBe('0');
    expect(sorted.request.params.getAll('sort')).toEqual(['tema,asc', 'dataClassificacao,desc', 'codigo,asc']);
    answer(sorted, 40);
    expect(component.page).toBe(1);
  });

  it('sends the page filters and goes back to the first page when they change', () => {
    answer(pending(), 40);
    component.goTo(3);
    answer(pending(), 40);
    component.segmentFilter = 'varejo';
    component.applicabilityFilter = false;
    component.themeFilter = 'Pix';
    component.ngOnChanges({ themeFilter: { currentValue: 'Pix', previousValue: null, firstChange: false, isFirstChange: () => false } });
    const filtered = pending();
    expect(['page', 'segmento', 'aplicavel', 'tema'].map((key) => filtered.request.params.get(key))).toEqual(['0', 'VAREJO', 'false', 'Pix']);
    answer(filtered, 3);
    expect(text()).toContain('1–3 de 3');
  });

  it('exports by fetching pages of 100 one after the other, with progress, then saves every row', async () => {
    answer(pending(), 250);
    const done = component.exportXlsx();
    fixture.detectChanges();
    for (const page of [0, 1, 2]) {
      const request = pending();
      expect([request.request.params.get('page'), request.request.params.get('size')]).toEqual([String(page), '100']);
      answer(request, 250);
      if (page === 0) {
        expect(component.exportLabel).toBe('Buscando linhas... 100 de 250');
        expect(text()).toContain('Buscando linhas... 100 de 250');
      }
    }
    await done;
    const table = (component.download as jasmine.Spy).calls.mostRecent().args[0] as XlsxTable;
    expect(table.rows.length).toBe(250);
    expect(table.subtitle).toContain('250 normas');
    expect(table.fileName).toMatch(/^tabela-analitica-2021-01-01-a-2021-12-31\.xlsx$/);
    expect(component.exporting).toBeFalse();
  });

  it('exports nothing above 5.000 rows and asks to refine the filters (no request when the total is known)', async () => {
    answer(pending(), 5001);
    await component.exportXlsx();
    fixture.detectChanges();
    expect(component.download).not.toHaveBeenCalled();
    expect(root().querySelector('.text-danger[role="alert"]')?.textContent?.trim()).toBe(
      'A tabela tem 5.001 linhas e o Excel aceita até 5.000. Refine os filtros para exportar.'
    );
  });

  it('stops after the first page when the data grew above 5.000 meanwhile', async () => {
    answer(pending(), 4990);
    const done = component.exportXlsx();
    answer(pending(), 5100);
    await done;
    expect(component.download).not.toHaveBeenCalled();
    expect(component.exportError).toBe('A tabela tem 5.100 linhas e o Excel aceita até 5.000. Refine os filtros para exportar.');
  });

  it('cancels the export when a filter changes: the request in flight is dropped and nothing is saved', async () => {
    answer(pending(), 250);
    const done = component.exportXlsx();
    answer(pending(), 250);
    const inFlight = pending();
    component.themeFilter = 'Pix';
    component.ngOnChanges({ themeFilter: { currentValue: 'Pix', previousValue: null, firstChange: false, isFirstChange: () => false } });
    await done;
    expect(inFlight.cancelled).toBeTrue();
    expect(component.exporting).toBeFalse();
    expect(component.download).not.toHaveBeenCalled();
    answer(pending(), 10);
  });

  it('shows the export failure in pt-BR with the support code, never the server message', async () => {
    spyOn(console, 'error');
    answer(pending(), 250);
    const done = component.exportXlsx();
    pending().flush({ status: 503, code: 'SIS-001', message: 'pool esgotado', traceId: 'abc-123' }, { status: 503, statusText: 'x' });
    await done;
    fixture.detectChanges();
    const alert = root().querySelector('.text-danger[role="alert"]')?.textContent ?? '';
    expect(alert).toContain('Não foi possível gerar o arquivo Excel.');
    expect(alert).toContain('Código de suporte: abc-123');
    expect(alert).not.toContain('pool');
  });
});

describe('AnalyticTableComponent load errors (pt-BR text and support code)', () => {
  const render = (status: number, body: object | null) => {
    spyOn(console, 'error');
    TestBed.configureTestingModule({
      imports: [AnalyticTableComponent],
      providers: [
        IconSetService,
        provideAppHttpClient(),
        provideHttpClientTesting(),
        { provide: BROWSER_NAVIGATE, useValue: () => undefined },
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock: false } } }
      ]
    });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    const fixture = TestBed.createComponent(AnalyticTableComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((request) => request.url === URL).flush(body, { status, statusText: 'x' });
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.classification-placeholder[role="alert"]')?.textContent?.replace(/\s+/g, ' ').trim();
  };

  it('keeps the block sentence for a server failure and adds the support code from the trace id', () => {
    expect(render(503, { status: 503, code: 'SIS-001', message: 'segredo', traceId: '4bf92f35' })).toBe(
      'Não foi possível carregar a tabela analítica. Código de suporte: 4bf92f35'
    );
  });

  it('uses the specific text for 403 and never the server message', () => {
    const shown = render(403, { status: 403, code: 'AUT-002', message: 'Forbidden by policy', traceId: 't-9' });
    expect(shown).toBe('Você não tem acesso a esta informação. Código de suporte: t-9');
  });

  it('shows nothing extra on 401 (the interceptor sends the user to sign in)', () => {
    expect(render(401, { status: 401, code: 'AUT-001', message: 'x', traceId: 't-1' })).toBe('');
  });

  it('keeps the block sentence for an invalid payload', () => {
    expect(render(200, { content: 'x' })).toBe('Não foi possível carregar a tabela analítica.');
  });
});

describe('AnalyticTableComponent Excel in mock mode (dataMock true)', () => {
  it('saves every filtered row in the order on screen, from local pages, without any BFF call', async () => {
    const normas = Array.from({ length: 130 }, (_, index) => ({
      code: `N${index}`,
      orgao: 'CMN',
      tipo: 'Resolução',
      numero: String(index),
      classifiedAt: `2021-0${(index % 9) + 1}-10`,
      segment: 'atacado',
      theme: index % 2 ? 'Pix' : 'Capital',
      applicable: true,
      area: 'Área',
      diretoria: 'Diretoria'
    }));
    const data = () => of<ClassificationData>({ asOf: '2021-12-31', normas });
    TestBed.configureTestingModule({
      imports: [AnalyticTableComponent],
      providers: [IconSetService, { provide: ClassificationDataService, useValue: { getClassification: data, ...localClassificationQueries(data) } }]
    });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    const fixture = TestBed.createComponent(AnalyticTableComponent);
    const component = fixture.componentInstance;
    const download = jasmine.createSpy('download').and.resolveTo();
    component.download = download;
    fixture.detectChanges();
    component.sortBy('numero');
    await component.exportXlsx();
    const table = download.calls.mostRecent().args[0] as XlsxTable;
    expect(table.rows.length).toBe(130);
    expect(table.rows.slice(0, 3).map((row) => row['numero'])).toEqual(['0', '1', '2']);
    expect(table.subtitle).toBe('Janeiro a dezembro de 2021 · 130 normas');
  });
});
