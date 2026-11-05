import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_URL, RuntimeConfigService } from '../config/runtime-config.service';
import { API_VERSION_PREFIX, ApiService } from './api.service';

// Fictional resources: the template has no endpoints (rule R4); a derived project uses its own OpenAPI.
describe('ApiService', () => {
  const apiBase = DEFAULT_RUNTIME_CONFIG.apiBase;
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('prefixes every path with the runtime apiBase and /v1 (never an absolute URL)', () => {
    expect(API_VERSION_PREFIX).toBe('/v1');
    api.get('/recursos-exemplo').subscribe();
    const request = http.expectOne(`${apiBase}/v1/recursos-exemplo`);
    expect(request.request.url.startsWith('/')).toBeTrue();
    request.flush({});
  });

  it('sends query params and repeats the key for an array value (sort=a&sort=b)', () => {
    api.get('/recursos-exemplo', { inicio: '2026-01-01', page: 0, ativo: true, sort: ['nome,asc', 'id,desc'] }).subscribe();
    const request = http.expectOne((r) => r.url === `${apiBase}/v1/recursos-exemplo`);
    expect(request.request.params.get('inicio')).toBe('2026-01-01');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('ativo')).toBe('true');
    expect(request.request.params.getAll('sort')).toEqual(['nome,asc', 'id,desc']);
    expect(request.request.urlWithParams).toContain('sort=nome,asc&sort=id,desc');
    request.flush({});
  });

  it('posts JSON and FormData without credentials', () => {
    api.post('/recursos-exemplo', { a: 1 }).subscribe();
    const json = http.expectOne(`${apiBase}/v1/recursos-exemplo`);
    expect(json.request.method).toBe('POST');
    expect(json.request.body).toEqual({ a: 1 });
    expect(json.request.withCredentials).toBeFalse();
    json.flush({});

    api.post('/recursos-exemplo').subscribe();
    expect(http.expectOne(`${apiBase}/v1/recursos-exemplo`).request.body).toBeNull();
  });

  it('posts multipart uploads as the same FormData (the browser sets the boundary)', () => {
    const form = new FormData();
    form.append('arquivo', new Blob(['x']), 'a.pdf');
    api.postMultipart('/recursos-exemplo/1/arquivos', form).subscribe();
    const request = http.expectOne(`${apiBase}/v1/recursos-exemplo/1/arquivos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(form);
    request.flush({});
  });

  it('deletes', () => {
    api.delete('/recursos-exemplo/1').subscribe();
    const request = http.expectOne(`${apiBase}/v1/recursos-exemplo/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('uses the apiBase loaded from assets/env.json (same image, another BFF)', async () => {
    const loading = TestBed.inject(RuntimeConfigService).load();
    http.expectOne(RUNTIME_CONFIG_URL).flush({ apiBase: '/outro-bff/api' });
    await loading;
    api.get('/recursos-exemplo').subscribe();
    const request = http.expectOne('/outro-bff/api/v1/recursos-exemplo');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
