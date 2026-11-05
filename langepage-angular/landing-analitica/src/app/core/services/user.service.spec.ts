import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG } from '../config/runtime-config.service';
import { provideAppHttpClient } from '../http/api-error.interceptor';
import { BROWSER_NAVIGATE } from '../http/login-redirect.service';
import { UserService } from './user.service';

describe('UserService', () => {
  const url = `${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/usuarios/me`;
  let users: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAppHttpClient(), provideHttpClientTesting(), { provide: BROWSER_NAVIGATE, useValue: () => undefined }]
    });
    users = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads primeiroNome from GET /v1/usuarios/me and keeps it in memory', () => {
    const names: string[] = [];
    users.firstName$().subscribe(name => names.push(name));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush({ primeiroNome: ' Vinicius ' });
    users.firstName$().subscribe(name => names.push(name));
    http.expectNone(url);
    expect(names).toEqual(['Vinicius', 'Vinicius']);
  });

  it('gives an empty name when the field is missing', () => {
    let name: string | undefined;
    users.firstName$().subscribe(n => (name = n));
    http.expectOne(url).flush({});
    expect(name).toBe('');
  });

  it('gives an empty name on failure and asks again next time', () => {
    let name: string | undefined;
    let failed = false;
    users.firstName$().subscribe({ next: n => (name = n), error: () => (failed = true) });
    http.expectOne(url).flush({ status: 500, code: 'SIS-003', traceId: 't' }, { status: 500, statusText: 'x' });
    expect([name, failed]).toEqual(['', false]);
    users.firstName$().subscribe();
    http.expectOne(url).flush({ primeiroNome: 'Ana' });
  });
});
