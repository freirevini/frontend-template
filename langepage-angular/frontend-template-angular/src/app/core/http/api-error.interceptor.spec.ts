import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_URL, RuntimeConfigService } from '../config/runtime-config.service';
import { ApiService } from '../services/api.service';
import { ApiProblem, apiProblemText } from './api-problem';
import { XSRF_HEADER_NAME, isApiUrl, provideAppHttpClient } from './api-error.interceptor';
import { HTTP_ERROR_TEXTS, supportCodeText } from './http-error-texts';
import { BROWSER_NAVIGATE, LOGIN_RETURN_PARAM } from './login-redirect.service';

describe('apiErrorInterceptor (app HttpClient)', () => {
  const apiBase = DEFAULT_RUNTIME_CONFIG.apiBase;
  let api: ApiService;
  let http: HttpTestingController;
  let navigate: jasmine.Spy<(url: string) => void>;

  beforeEach(() => {
    navigate = jasmine.createSpy('navigate');
    TestBed.configureTestingModule({
      providers: [provideAppHttpClient(), provideHttpClientTesting(), { provide: BROWSER_NAVIGATE, useValue: navigate }]
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const failGet = (status: number, body: object | null = null): unknown => {
    let error: unknown;
    api.get('/recursos-exemplo').subscribe({ error: e => (error = e) });
    http.expectOne(`${apiBase}/v1/recursos-exemplo`).flush(body, { status, statusText: 'x' });
    return error;
  };

  const currentAddress = (): string => `${location.pathname}${location.search}${location.hash}`;

  it('sends the user to loginUrl with the current address on 401, only once per page', () => {
    api.get('/recursos-exemplo').subscribe({ error: () => undefined });
    api.get('/outro-recurso').subscribe({ error: () => undefined });
    const unauthorized = { status: 401, code: 'AUT-001', message: 'x', traceId: 't1' };
    http.expectOne(`${apiBase}/v1/recursos-exemplo`).flush(unauthorized, { status: 401, statusText: 'x' });
    http.expectOne(`${apiBase}/v1/outro-recurso`).flush(unauthorized, { status: 401, statusText: 'x' });
    const error = failGet(401, unauthorized);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      `${DEFAULT_RUNTIME_CONFIG.loginUrl}?${LOGIN_RETURN_PARAM}=${encodeURIComponent(currentAddress())}`
    );
    expect(error instanceof ApiProblem).toBeTrue();
    expect((error as ApiProblem).kind).toBe('unauthenticated');
    expect(apiProblemText(error as ApiProblem)).toBeNull();
  });

  it('appends the return parameter with & when loginUrl already has a query', async () => {
    const loading = TestBed.inject(RuntimeConfigService).load();
    http.expectOne(RUNTIME_CONFIG_URL).flush({ loginUrl: '/entrar?app=painel' });
    await loading;
    failGet(401);
    expect(navigate).toHaveBeenCalledOnceWith(`/entrar?app=painel&${LOGIN_RETURN_PARAM}=${encodeURIComponent(currentAddress())}`);
  });

  it('turns 403 into the pt-BR "no access" text without redirecting', () => {
    const error = failGet(403, { status: 403, code: 'AUT-002', message: 'Forbidden', traceId: 'abc' }) as ApiProblem;
    expect(error.kind).toBe('forbidden');
    expect(apiProblemText(error)).toBe('Você não tem acesso a esta informação.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('parses Problem Details: status, code and trace id, never the server message or details', () => {
    const error = failGet(400, {
      timestamp: '2026-11-04T10:15:30-03:00',
      status: 400,
      code: 'VAL-001',
      message: 'Parâmetro inválido.',
      details: [{ campo: 'fim', code: 'VAL-001', message: 'deve ser igual ou posterior a inicio' }],
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736'
    }) as ApiProblem;
    expect(error instanceof ApiProblem).toBeTrue();
    expect([error.status, error.code, error.traceId]).toEqual([400, 'VAL-001', '4bf92f3577b34da6a3ce929d0e0e4736']);
    expect(apiProblemText(error)).toBe(HTTP_ERROR_TEXTS.badRequest);
    expect(supportCodeText(error.traceId!)).toBe('Código de suporte: 4bf92f3577b34da6a3ce929d0e0e4736');
    expect(JSON.stringify(error)).not.toContain('Parâmetro inválido');
    expect(error.message).not.toContain('Parâmetro inválido');
    expect(Object.keys(error)).not.toContain('details');
  });

  it('maps a network failure to status 0 and the "no connection" text', () => {
    let error: unknown;
    api.get('/recursos-exemplo').subscribe({ error: e => (error = e) });
    http.expectOne(`${apiBase}/v1/recursos-exemplo`).error(new ProgressEvent('error'));
    expect((error as ApiProblem).status).toBe(0);
    expect(apiProblemText(error as ApiProblem)).toBe(HTTP_ERROR_TEXTS.network);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves requests outside apiBase untouched (local mock files)', () => {
    let error: unknown;
    TestBed.inject(HttpClient).get('assets/data/exemplo.json').subscribe({ error: e => (error = e) });
    http.expectOne('assets/data/exemplo.json').flush(null, { status: 401, statusText: 'x' });
    expect(error instanceof HttpErrorResponse).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('CSRF', () => {
    const clearCookie = () => (document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/');
    beforeEach(() => (document.cookie = 'XSRF-TOKEN=tok-123; path=/'));
    afterEach(clearCookie);

    it('sends the XSRF-TOKEN cookie as X-XSRF-TOKEN on POST and DELETE, not on GET', () => {
      api.post('/recursos-exemplo').subscribe();
      const post = http.expectOne(`${apiBase}/v1/recursos-exemplo`);
      expect(post.request.headers.get(XSRF_HEADER_NAME)).toBe('tok-123');
      post.flush({});

      api.delete('/recursos-exemplo/1').subscribe();
      const del = http.expectOne(`${apiBase}/v1/recursos-exemplo/1`);
      expect(del.request.headers.get('X-XSRF-TOKEN')).toBe('tok-123');
      del.flush(null);

      api.get('/recursos-exemplo').subscribe();
      const get = http.expectOne(`${apiBase}/v1/recursos-exemplo`);
      expect(get.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
      get.flush({});
    });
  });
});

describe('isApiUrl', () => {
  it('matches apiBase and paths below it only', () => {
    expect(isApiUrl('/api/v1/recursos-exemplo', '/api')).toBeTrue();
    expect(isApiUrl('/api', '/api')).toBeTrue();
    expect(isApiUrl('/apiary/x', '/api')).toBeFalse();
    expect(isApiUrl('assets/env.json', '/api')).toBeFalse();
  });
});
