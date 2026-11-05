import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RuntimeConfigService } from '../config/runtime-config.service';

/** Query string values; an array repeats the key (`sort=a&sort=b`, contract v1). */
type QueryParams = Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

/** Version of the BFF contract (docs/contratos/openapi-agenda-normativa-v1.yaml, servers `/api/v1`). */
export const API_VERSION_PREFIX = '/v1';

/**
 * Every BFF call goes through here: runtime config `apiBase` (assets/env.json) + `/v1` + resource path of the contract
 * (rule R4), e.g. `get('/segmentos')` → `/api/v1/segmentos`. Never an absolute URL in code; the base is read on each
 * call, so it is the value loaded before bootstrap. No `withCredentials`: front and BFF share the origin, so the session
 * cookie goes on its own. Failures arrive as ApiProblem (core/http/api-error.interceptor.ts).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient, private readonly runtimeConfig: RuntimeConfigService) {}

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: new HttpParams({ fromObject: params ?? {} }) });
  }

  /** JSON body, or `FormData` for multipart uploads (the browser sets the boundary). */
  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? null);
  }

  /** `multipart/form-data` upload; same as `post` with a FormData, named for readability at the call site. */
  postMultipart<T>(path: string, form: FormData): Observable<T> {
    return this.post<T>(path, form);
  }

  /** `get` with the whole response, for callers that read headers (e.g. `Retry-After` while the chat polls a document). */
  getResponse<T>(path: string): Observable<HttpResponse<T>> {
    return this.http.get<T>(this.url(path), { observe: 'response' });
  }

  /** `postMultipart` with the whole response (the chat upload answers 202 with `Retry-After`). */
  postMultipartResponse<T>(path: string, form: FormData): Observable<HttpResponse<T>> {
    return this.http.post<T>(this.url(path), form, { observe: 'response' });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.config.apiBase}${API_VERSION_PREFIX}${path}`;
  }
}
