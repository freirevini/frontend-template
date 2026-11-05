import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_URL, RuntimeConfigService } from '../config/runtime-config.service';
import { ApiService } from './api.service';

describe('ApiService', () => {
  const apiBase = DEFAULT_RUNTIME_CONFIG.apiBase;
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('prefixes every path with the runtime apiBase and /v1 (never an absolute URL)', () => {
    api.get('/segmentos').subscribe();
    const request = http.expectOne(`${apiBase}/v1/segmentos`);
    expect(request.request.url.startsWith('/')).toBeTrue();
    request.flush({});
  });

  it('sends query params', () => {
    api.get('/segmentos', { start: '2021-01-01', n: 2, ok: true }).subscribe();
    const request = http.expectOne(r => r.url === `${apiBase}/v1/segmentos`);
    expect(request.request.params.get('start')).toBe('2021-01-01');
    expect(request.request.params.get('n')).toBe('2');
    expect(request.request.params.get('ok')).toBe('true');
    request.flush({});
  });

  it('posts JSON and FormData without credentials', () => {
    api.post('/agente/sessoes', { a: 1 }).subscribe();
    const json = http.expectOne(`${apiBase}/v1/agente/sessoes`);
    expect(json.request.method).toBe('POST');
    expect(json.request.body).toEqual({ a: 1 });
    expect(json.request.withCredentials).toBeFalse();
    json.flush({});

    const form = new FormData();
    form.append('file', new Blob(['x']), 'a.pdf');
    api.post('/agente/sessoes', form).subscribe();
    expect(http.expectOne(`${apiBase}/v1/agente/sessoes`).request.body).toBe(form);
  });

  it('deletes', () => {
    api.delete('/agente/sessoes/1').subscribe();
    const request = http.expectOne(`${apiBase}/v1/agente/sessoes/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('uses the apiBase loaded from assets/env.json (same image, another BFF)', async () => {
    const loading = TestBed.inject(RuntimeConfigService).load();
    http.expectOne(RUNTIME_CONFIG_URL).flush({ apiBase: '/outro-bff/api' });
    await loading;
    api.get('/segmentos').subscribe();
    const request = http.expectOne('/outro-bff/api/v1/segmentos');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('posts multipart uploads as the same FormData (the browser sets the boundary)', () => {
    const form = new FormData();
    form.append('arquivos', new Blob(['x']), 'a.pdf');
    api.postMultipart('/agente/sessoes/s1/arquivos', form).subscribe();
    const request = http.expectOne(`${apiBase}/v1/agente/sessoes/s1/arquivos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(form);
    request.flush({});
  });

  it('gives the whole response (status and headers) to callers that need them', () => {
    let status = 0;
    let retryAfter: string | null = null;
    api.getResponse('/agente/sessoes/s1/arquivos/f1').subscribe(response => ((status = response.status), (retryAfter = response.headers.get('Retry-After'))));
    const get = http.expectOne(`${apiBase}/v1/agente/sessoes/s1/arquivos/f1`);
    expect(get.request.method).toBe('GET');
    get.flush({}, { headers: { 'Retry-After': '3' } });
    expect(status).toBe(200);
    expect(retryAfter as string | null).toBe('3');

    const form = new FormData();
    api.postMultipartResponse('/agente/sessoes/s1/arquivos', form).subscribe(response => (status = response.status));
    const post = http.expectOne(`${apiBase}/v1/agente/sessoes/s1/arquivos`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toBe(form);
    post.flush({}, { status: 202, statusText: 'Accepted' });
    expect(status).toBe(202);
  });
});

describe('ApiService query arrays', () => {
  it('repeats the key for an array value (sort=a&sort=b)', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const api = TestBed.inject(ApiService);
    const http = TestBed.inject(HttpTestingController);
    api.get('/normas-classificadas', { sort: ['tema,asc', 'codigo,asc'], page: 0 }).subscribe();
    const request = http.expectOne((r) => r.url === `${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/normas-classificadas`);
    expect(request.request.params.getAll('sort')).toEqual(['tema,asc', 'codigo,asc']);
    expect(request.request.urlWithParams).toContain('sort=tema,asc&sort=codigo,asc');
    request.flush({});
    http.verify();
  });
});
