import { provideHttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG } from '../config/runtime-config.service';
import {
  BROWSER_NAVIGATE,
  LOGIN_LOOP_WINDOW_MS,
  LOGIN_REDIRECT_AT_KEY,
  LOGIN_RETURN_PARAM,
  LoginRedirectService,
  redirectedRecently,
  rememberLoginRedirect
} from './login-redirect.service';

describe('LoginRedirectService (redirect-loop breaker)', () => {
  const NOW = 1_800_000_000_000;
  let navigate: jasmine.Spy<(url: string) => void>;
  let service: LoginRedirectService;
  const expectedUrl = () =>
    `${DEFAULT_RUNTIME_CONFIG.loginUrl}?${LOGIN_RETURN_PARAM}=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`;

  beforeEach(() => {
    navigate = jasmine.createSpy('navigate');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), { provide: BROWSER_NAVIGATE, useValue: navigate }] });
    service = TestBed.inject(LoginRedirectService);
    service.now = () => NOW;
  });

  afterEach(() => sessionStorage.removeItem(LOGIN_REDIRECT_AT_KEY));

  it('does not redirect again when the last trip to sign-in was less than 60 s ago; offers the link instead', () => {
    sessionStorage.setItem(LOGIN_REDIRECT_AT_KEY, String(NOW - 10_000));
    service.redirect();
    expect(navigate).not.toHaveBeenCalled();
    expect(service.manualLoginUrl()).toBe(expectedUrl());
  });

  it('redirects when the last trip is 60 s old or more, or when there is none', () => {
    sessionStorage.setItem(LOGIN_REDIRECT_AT_KEY, String(NOW - LOGIN_LOOP_WINDOW_MS));
    service.redirect();
    expect(navigate).toHaveBeenCalledOnceWith(expectedUrl());
    expect(service.manualLoginUrl()).toBeNull();
  });

  it('stamps the time when the user follows "Entrar novamente"', () => {
    service.rememberManualLogin();
    expect(sessionStorage.getItem(LOGIN_REDIRECT_AT_KEY)).toBe(String(NOW));
  });

  it('keeps only a number in storage and ignores garbage, future stamps and missing storage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } as unknown as Storage;
    rememberLoginRedirect(storage, NOW);
    expect([...store.entries()]).toEqual([[LOGIN_REDIRECT_AT_KEY, String(NOW)]]);
    expect(redirectedRecently(storage, NOW + 59_999)).toBeTrue();
    expect(redirectedRecently(storage, NOW + 60_000)).toBeFalse();
    expect(redirectedRecently(storage, NOW - 1)).toBeFalse();
    store.set(LOGIN_REDIRECT_AT_KEY, 'token-nao');
    expect(redirectedRecently(storage, NOW)).toBeFalse();
    expect(redirectedRecently(undefined, NOW)).toBeFalse();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(() => rememberLoginRedirect(broken, NOW)).not.toThrow();
    expect(redirectedRecently(broken, NOW)).toBeFalse();
  });
});

describe('BROWSER_NAVIGATE (default)', () => {
  it('stamps the trip to sign-in in sessionStorage before leaving the page', () => {
    const store = new Map<string, string>();
    const assign = jasmine.createSpy('assign').and.callFake(() => expect(store.has(LOGIN_REDIRECT_AT_KEY)).toBeTrue());
    const fakeDocument = {
      location: { assign },
      defaultView: { sessionStorage: { setItem: (key: string, value: string) => store.set(key, value) } }
    };
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: fakeDocument }] });
    TestBed.inject(BROWSER_NAVIGATE)('/entrar?retorno=%2Fdashboard');
    expect(assign).toHaveBeenCalledOnceWith('/entrar?retorno=%2Fdashboard');
    expect(Number(store.get(LOGIN_REDIRECT_AT_KEY))).toBeGreaterThan(0);
  });
});
