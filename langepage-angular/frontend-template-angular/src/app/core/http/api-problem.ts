import { HttpErrorResponse } from '@angular/common/http';

import { HTTP_ERROR_TEXTS, HttpErrorTextKey } from './http-error-texts';

/** What the UI does with a failure: one pt-BR text per kind; `unauthenticated` has none (the page goes to sign-in). */
export type ApiProblemKind = HttpErrorTextKey | 'unauthenticated';

/** Code families of the corporate error catalog (`VAL-001`, `AUT-002`, ...). Anything else is dropped as unknown. */
const PROBLEM_CODE = /^(VAL|AUT|NEG|SIS)-\d{3}$/;
/** W3C trace id or similar: letters, digits and hyphen only, so no server text can reach the screen through it. */
const TRACE_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Failure of a BFF call after the error interceptor: only the HTTP status, the contract code and the trace id survive
 * from the RFC 7807 body. The server `message` and `details` are deliberately not kept (they never reach the UI).
 */
export class ApiProblem extends Error {
  readonly kind: ApiProblemKind;

  constructor(readonly status: number, readonly code?: string, readonly traceId?: string) {
    super(`HTTP ${status}${code ? ` ${code}` : ''}`);
    this.name = 'ApiProblem';
    this.kind = problemKind(status, code);
  }
}

/** Status first, refined by the code family (AUT-002/003 → forbidden, SIS-002 → timeout; docs/contratos-de-dados.md). */
export function problemKind(status: number, code?: string): ApiProblemKind {
  if (status === 0) {
    return 'network';
  }
  if (status === 401) {
    return 'unauthenticated';
  }
  if (status === 403 || code === 'AUT-002' || code === 'AUT-003') {
    return 'forbidden';
  }
  if (status === 504 || code === 'SIS-002') {
    return 'timeout';
  }
  if (status === 404) {
    return 'notFound';
  }
  if (status === 429) {
    return 'rateLimited';
  }
  return status >= 400 && status < 500 ? 'badRequest' : 'serverError';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Problem Details body as an object: HttpClient gives it parsed, or as text when the JSON parse failed. */
function problemBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(body) ? body : {};
}

/** Any failure (HttpErrorResponse, ApiProblem or anything thrown) as an ApiProblem; unknown errors count as network. */
export function toApiProblem(error: unknown): ApiProblem {
  if (error instanceof ApiProblem) {
    return error;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiProblem(0);
  }
  const body = problemBody(error.error);
  const code = typeof body['code'] === 'string' && PROBLEM_CODE.test(body['code']) ? body['code'] : undefined;
  const traceId = typeof body['traceId'] === 'string' && TRACE_ID.test(body['traceId']) ? body['traceId'] : undefined;
  return new ApiProblem(error.status, code, traceId);
}

/** pt-BR text for the problem, or null for 401 (the interceptor is already sending the user to sign in). */
export function apiProblemText(problem: ApiProblem): string | null {
  return problem.kind === 'unauthenticated' ? null : HTTP_ERROR_TEXTS[problem.kind];
}

/** What a data block shows when its load failed: a pt-BR text (null = nothing) and the support code line, if any. */
export interface LoadErrorMessage {
  text: string | null;
  supportCode: string | null;
}

/**
 * Error of a data block (docs/contratos-de-dados.md, error texts): the block keeps its own sentence for a generic failure
 * (5xx, invalid payload, mock file missing); specific statuses (403, 400, 404, 429, 504, network) use HTTP_ERROR_TEXTS;
 * 401 shows nothing (the interceptor is already sending the user to sign in). The trace id, when present, becomes
 * "Código de suporte: …". Never the server message.
 */
export function loadErrorMessage(error: unknown, fallback: string): LoadErrorMessage {
  if (!(error instanceof ApiProblem)) {
    return { text: fallback, supportCode: null };
  }
  const text = error.kind === 'serverError' ? fallback : apiProblemText(error);
  return { text, supportCode: text !== null && error.traceId ? error.traceId : null };
}
