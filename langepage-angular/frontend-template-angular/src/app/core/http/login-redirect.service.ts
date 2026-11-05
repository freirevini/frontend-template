import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';

import { RuntimeConfigService } from '../config/runtime-config.service';

/**
 * Query parameter that carries the page to come back to after sign-in. Assumption until the gateway confirms it
 * (docs/contratos-de-dados.md, session and sign-in).
 */
export const LOGIN_RETURN_PARAM = 'retorno';

/**
 * sessionStorage key with the time (epoch ms) of the last trip to sign-in: a timestamp only, never a token (rule R5).
 * It breaks a redirect loop when the gateway sends the user back still unauthenticated.
 */
export const LOGIN_REDIRECT_AT_KEY = 'frontend-template-angular.login-redirect-at';
/** A 401 within this window after a trip to sign-in shows "Entrar novamente" instead of redirecting again. */
export const LOGIN_LOOP_WINDOW_MS = 60_000;

/** The page's sessionStorage, or undefined where the browser refuses it (private modes, sandboxed frames). */
export function sessionStorageOf(document: Document): Storage | undefined {
  try {
    return document.defaultView?.sessionStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** Records a trip to sign-in; storage failures are ignored (the loop breaker is then simply off). */
export function rememberLoginRedirect(storage: Storage | undefined, now: number): void {
  try {
    storage?.setItem(LOGIN_REDIRECT_AT_KEY, String(now));
  } catch {
    // Quota or privacy mode: nothing to do.
  }
}

/** True when the last trip to sign-in was less than LOGIN_LOOP_WINDOW_MS ago. */
export function redirectedRecently(storage: Storage | undefined, now: number): boolean {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(LOGIN_REDIRECT_AT_KEY) ?? null;
  } catch {
    return false;
  }
  const elapsed = now - Number(raw);
  return raw !== null && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < LOGIN_LOOP_WINDOW_MS;
}

/**
 * Full-page navigation to the sign-in entry point, stamping the time first (loop breaker); replaceable in tests (a real
 * assign would leave the test page).
 */
export const BROWSER_NAVIGATE = new InjectionToken<(url: string) => void>('BROWSER_NAVIGATE', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return (url: string) => {
      rememberLoginRedirect(sessionStorageOf(document), Date.now());
      document.location.assign(url);
    };
  }
});

/**
 * Sends the browser to the runtime `loginUrl` when the BFF answers 401, with the current address as the return
 * parameter. Only once per page: several requests failing together, or a 401 arriving while the page is already
 * leaving, never stack redirects. Across pages: a 401 less than LOGIN_LOOP_WINDOW_MS after the last trip to sign-in
 * does not redirect again (the gateway sent the user back unauthenticated); `manualLoginUrl` then holds the address
 * for the "Entrar novamente" link of SessionExpiredNoticeComponent.
 */
@Injectable({ providedIn: 'root' })
export class LoginRedirectService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly document = inject(DOCUMENT);
  private readonly navigate = inject(BROWSER_NAVIGATE);
  private redirected = false;
  /** Clock; replaceable in tests. */
  now = () => Date.now();
  /** Sign-in address offered by hand when the automatic redirect was held back by the loop breaker; null otherwise. */
  readonly manualLoginUrl = signal<string | null>(null);

  redirect(): void {
    if (this.redirected) {
      return;
    }
    this.redirected = true;
    const { pathname, search, hash } = this.document.location;
    const loginUrl = this.runtimeConfig.config.loginUrl;
    const separator = loginUrl.includes('?') ? '&' : '?';
    const url = `${loginUrl}${separator}${LOGIN_RETURN_PARAM}=${encodeURIComponent(`${pathname}${search}${hash}`)}`;
    if (redirectedRecently(sessionStorageOf(this.document), this.now())) {
      this.manualLoginUrl.set(url);
      return;
    }
    this.navigate(url);
  }

  /** The user follows "Entrar novamente": stamp it like an automatic trip, so a new bounce does not loop either. */
  rememberManualLogin(): void {
    rememberLoginRedirect(sessionStorageOf(this.document), this.now());
  }
}
