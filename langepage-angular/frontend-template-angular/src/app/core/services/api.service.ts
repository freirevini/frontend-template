import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { RuntimeConfigService } from '../config/runtime-config.service';

/** Query string values; an array repeats the key (`sort=a&sort=b`, Spring convention). */
export type QueryParams = Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

/** Version of the BFF contract: every resource lives under `/api/v1` (corporate standard; docs/contratos-de-dados.md). */
export const API_VERSION_PREFIX = '/v1';

/**
 * Every BFF call goes through here: runtime config `apiBase` (assets/env.json) + `/v1` + resource path from the derived
 * project's OpenAPI (rule R4), e.g. `get('/<recurso>')` → `/api/v1/<recurso>`. Never an absolute URL in code; the base is
 * read on each call, so it is the value loaded before bootstrap. No `withCredentials`: front and BFF share the origin,
 * so the session cookie goes on its own. Failures arrive as ApiProblem (core/http/api-error.interceptor.ts).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfigService);

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

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.config.apiBase}${API_VERSION_PREFIX}${path}`;
  }
}
