import {
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration
} from '@angular/common/http';
import { EnvironmentProviders, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { RuntimeConfigService } from '../config/runtime-config.service';
import { toApiProblem } from './api-problem';
import { LoginRedirectService } from './login-redirect.service';

/**
 * CSRF names (Angular default, corporate BFF assumption; docs/contratos-de-dados.md): readable cookie set by the BFF,
 * header on POST, PUT, PATCH and DELETE.
 */
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

/** True for calls to the BFF (`apiBase` + path); local files such as `assets/data/*.json` are not BFF calls. */
export function isApiUrl(url: string, apiBase: string): boolean {
  return url === apiBase || url.startsWith(`${apiBase}/`);
}

/**
 * Every failed BFF call leaves here as an ApiProblem (status, contract code, trace id; never the server message).
 * 401 also sends the browser to sign in, once per page. Other requests pass untouched.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiUrl(request.url, inject(RuntimeConfigService).config.apiBase)) {
    return next(request);
  }
  const login = inject(LoginRedirectService);
  return next(request).pipe(
    catchError((error: unknown) => {
      const problem = toApiProblem(error);
      if (problem.status === 401) {
        login.redirect();
      }
      return throwError(() => problem);
    })
  );
};

/** The app's HttpClient: error interceptor and CSRF header. Used by app.config.ts and by the specs that test them. */
export function provideAppHttpClient(): EnvironmentProviders {
  return provideHttpClient(
    withInterceptors([apiErrorInterceptor]),
    withXsrfConfiguration({ cookieName: XSRF_COOKIE_NAME, headerName: XSRF_HEADER_NAME })
  );
}
