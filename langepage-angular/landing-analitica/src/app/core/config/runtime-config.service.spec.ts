import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_RUNTIME_CONFIG,
  RUNTIME_CONFIG_DEFAULTS,
  RUNTIME_CONFIG_URL,
  RuntimeConfigService,
  defaultRuntimeConfig,
  parseRuntimeConfig
} from './runtime-config.service';

describe('parseRuntimeConfig', () => {
  it('keeps every valid key of env.json and drops a trailing slash from apiBase', () => {
    const entity = { name: 'Empresa Exemplo S.A.', cnpj: '00.000.000/0001-00', address: 'Rua Fictícia, 100' };
    expect(parseRuntimeConfig({ apiBase: '/outro-bff/api/', loginUrl: '/entrar', chatMock: false, dataMock: false, footerEntities: [entity] }))
      .toEqual({ apiBase: '/outro-bff/api', loginUrl: '/entrar', chatMock: false, dataMock: false, footerEntities: [entity] });
  });

  it('reads dataMock only as a real boolean (default true: local mocks)', () => {
    expect(DEFAULT_RUNTIME_CONFIG.dataMock).toBeTrue();
    expect(parseRuntimeConfig({ dataMock: false }).dataMock).toBeFalse();
    expect(parseRuntimeConfig({ dataMock: 'false' }).dataMock).toBeTrue();
    expect(parseRuntimeConfig({ dataMock: 0 }).dataMock).toBeTrue();
  });

  it('falls back key by key: a missing or mistyped key keeps its safe default', () => {
    const config = parseRuntimeConfig({ apiBase: 42, chatMock: 'false', footerEntities: 'x', extra: true });
    expect(config).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(parseRuntimeConfig({ chatMock: false }).apiBase).toBe('/api');
  });

  it('accepts only complete footer entities', () => {
    const config = parseRuntimeConfig({ footerEntities: [{ name: 'A', cnpj: '1', address: 'B' }, { name: 'Sem CNPJ' }, null] });
    expect(config.footerEntities).toEqual([{ name: 'A', cnpj: '1', address: 'B' }]);
  });

  it('returns the defaults for anything that is not an object', () => {
    for (const raw of [null, undefined, 'texto', [], 7]) expect(parseRuntimeConfig(raw)).toEqual(DEFAULT_RUNTIME_CONFIG);
  });
});

describe('RuntimeConfigService', () => {
  let service: RuntimeConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RuntimeConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serves the safe defaults before load (dev-safe: /api and the simulated chat)', () => {
    expect(service.config).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(service.config).toEqual({ apiBase: '/api', loginUrl: '/api/v1/autenticacao/login', chatMock: true, dataMock: true, footerEntities: [] });
  });

  it('reads assets/env.json relative to the base href and applies it', async () => {
    const loading = service.load();
    const request = http.expectOne(RUNTIME_CONFIG_URL);
    expect(RUNTIME_CONFIG_URL).toBe('assets/env.json');
    expect(request.request.method).toBe('GET');
    request.flush({ apiBase: 'https://bff-exemplo.invalid/api', chatMock: false });
    await loading;
    expect(service.config.apiBase).toBe('https://bff-exemplo.invalid/api');
    expect(service.config.chatMock).toBeFalse();
  });

  it('keeps the defaults and logs one error without details when the file cannot be read', async () => {
    const log = spyOn(console, 'error');
    const loading = service.load();
    http.expectOne(RUNTIME_CONFIG_URL).flush('segredo-do-servidor', { status: 404, statusText: 'Not Found' });
    await expectAsync(loading).toBeResolved();
    expect(service.config).toEqual(DEFAULT_RUNTIME_CONFIG);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.calls.argsFor(0))).not.toContain('segredo-do-servidor');
  });
});

describe('runtime config fallback (production build)', () => {
  const production = defaultRuntimeConfig(true);

  it('turns both mocks off in production builds and keeps them on in development builds', () => {
    expect([production.dataMock, production.chatMock]).toEqual([false, false]);
    expect([defaultRuntimeConfig(false).dataMock, defaultRuntimeConfig(false).chatMock]).toEqual([true, true]);
    expect(production.apiBase).toBe('/api');
    expect(parseRuntimeConfig({ apiBase: '/api' }, production)).toEqual(jasmine.objectContaining({ dataMock: false, chatMock: false }));
    expect(parseRuntimeConfig({ dataMock: true, chatMock: true }, production)).toEqual(jasmine.objectContaining({ dataMock: true, chatMock: true }));
  });

  it('logs one error without details when the body is not an object', () => {
    const log = spyOn(console, 'error');
    expect(parseRuntimeConfig('segredo-do-servidor', production)).toEqual(production);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.calls.argsFor(0))).not.toContain('segredo-do-servidor');
    log.calls.reset();
    parseRuntimeConfig({ dataMock: false });
    expect(log).not.toHaveBeenCalled();
  });

  describe('RuntimeConfigService with the production defaults', () => {
    let service: RuntimeConfigService;
    let http: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: RUNTIME_CONFIG_DEFAULTS, useValue: production }]
      });
      service = TestBed.inject(RuntimeConfigService);
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('never falls back to mocks when env.json is missing', async () => {
      spyOn(console, 'error');
      const loading = service.load();
      http.expectOne(RUNTIME_CONFIG_URL).flush(null, { status: 404, statusText: 'Not Found' });
      await loading;
      expect([service.config.dataMock, service.config.chatMock]).toEqual([false, false]);
    });

    it('never falls back to mocks when env.json is not an object', async () => {
      const log = spyOn(console, 'error');
      const loading = service.load();
      http.expectOne(RUNTIME_CONFIG_URL).flush('[]');
      await loading;
      expect([service.config.dataMock, service.config.chatMock]).toEqual([false, false]);
      expect(log).toHaveBeenCalledTimes(1);
    });
  });
});
