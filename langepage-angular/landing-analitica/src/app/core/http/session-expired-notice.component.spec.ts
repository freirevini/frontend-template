import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { LOGIN_AGAIN_LABEL, SESSION_EXPIRED_TEXT } from './http-error-texts';
import { BROWSER_NAVIGATE, LOGIN_REDIRECT_AT_KEY, LoginRedirectService } from './login-redirect.service';
import { SessionExpiredNoticeComponent } from './session-expired-notice.component';

describe('SessionExpiredNoticeComponent', () => {
  let navigate: jasmine.Spy<(url: string) => void>;

  beforeEach(() => {
    navigate = jasmine.createSpy('navigate');
    TestBed.configureTestingModule({
      imports: [SessionExpiredNoticeComponent],
      providers: [provideHttpClient(), { provide: BROWSER_NAVIGATE, useValue: navigate }]
    });
  });

  afterEach(() => sessionStorage.removeItem(LOGIN_REDIRECT_AT_KEY));

  const render = () => {
    const fixture = TestBed.createComponent(SessionExpiredNoticeComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('shows nothing while the automatic redirect works', () => {
    const fixture = render();
    TestBed.inject(LoginRedirectService).redirect();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the pt-BR text and the "Entrar novamente" link when a 401 comes right after a trip to sign-in', () => {
    const login = TestBed.inject(LoginRedirectService);
    sessionStorage.setItem(LOGIN_REDIRECT_AT_KEY, String(Date.now() - 5_000));
    const fixture = render();
    login.redirect();
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    const link = alert?.querySelector('a') as HTMLAnchorElement;
    expect(navigate).not.toHaveBeenCalled();
    expect(SESSION_EXPIRED_TEXT).toBe('Sua sessão expirou e não foi possível entrar de novo automaticamente.');
    expect(alert?.textContent).toContain(SESSION_EXPIRED_TEXT);
    expect(link.textContent?.trim()).toBe(LOGIN_AGAIN_LABEL);
    expect(link.getAttribute('href')).toBe(login.manualLoginUrl());

    login.now = () => 42;
    link.addEventListener('click', (event) => event.preventDefault()); // stay on the test page
    link.click();
    expect(sessionStorage.getItem(LOGIN_REDIRECT_AT_KEY)).toBe('42');
  });
});
